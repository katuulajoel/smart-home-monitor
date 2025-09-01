import request from 'supertest';
import { register, login, logout } from '../../controllers/auth';
import db from '../../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Mock the database and dependencies
jest.mock('../../db');

// Cast the mocked db to jest.Mock for TypeScript
type MockedDB = jest.Mock & {
  (table: string): {
    where: jest.Mock;
    first: jest.Mock;
    insert: jest.Mock;
    returning: jest.Mock;
  };
};

const mockDb = db as unknown as MockedDB;

// Get the global test app factory from setup
declare const createTestApp: any;

describe('Auth Controller', () => {
  let app: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementation for each test
    mockDb.mockReset();
    // Set up default mock implementation for db
    mockDb.mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 'test-user-id' }])
    }));
    
    app = createTestApp(register, login, logout);
  });

  describe('Registration', () => {
    it('should register a new user successfully', async () => {
      // Mock the database chain for checking existing user
      const mockFirst = jest.fn().mockResolvedValueOnce(null);
      const mockWhere = jest.fn().mockReturnValue({ first: mockFirst });
      
      // Mock the insert operation
      const mockReturning = jest.fn().mockResolvedValueOnce([{
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com'
      }]);
      
      const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
      
      // Set up the mock implementation
      mockDb.mockImplementation((table) => {
        if (table === 'users') {
          return {
            where: mockWhere,
            insert: mockInsert
          };
        }
        return {};
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
      mockDb.mockImplementationOnce(() => ({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ 
          id: 'existing-user', 
          email: 'test@example.com' 
        })
      }));

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
      mockDb.mockImplementationOnce(() => ({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashedPassword'
        })
      }));

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
      mockDb.mockImplementationOnce(() => ({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      }));

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