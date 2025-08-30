import request from 'supertest';
import { register, login, logout } from '../../controllers/auth';

// Import mocked modules (mocking is done in setup.ts)
import db from '../../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Get the global test app factory from setup
declare const createTestApp: any;

describe('Auth Controller', () => {
  let app: any;
  
  beforeEach(() => {
    app = createTestApp(register, login, logout);
    jest.clearAllMocks();
  });

  describe('Registration', () => {
    it('should register a new user successfully', async () => {
      // Mock no existing user
      (db as any).mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      });

      // Mock user creation
      (db as any).mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com'
        }])
      });

      // Mock dependencies
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (uuidv4 as jest.Mock).mockReturnValue('user-123');
      (jwt.sign as jest.Mock).mockReturnValue('jwt-token');

      const response = await request(app)
        .post('/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.token).toBe('jwt-token');
    });

    it('should fail when user already exists', async () => {
      // Mock existing user
      (db as any).mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ 
          id: 'existing-user', 
          email: 'test@example.com' 
        })
      });

      const response = await request(app)
        .post('/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        })
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Email already in use');
    });
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', async () => {
      // Mock user exists
      (db as any).mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashedPassword'
        })
      });

      // Mock password comparison and JWT
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('jwt-token');

      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.token).toBe('jwt-token');
    });

    it('should fail with invalid credentials', async () => {
      // Mock no user found
      (db as any).mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      });

      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('Logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/logout')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Successfully logged out');
      
      // Check cookie was cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/token=;/);
    });
  });
});