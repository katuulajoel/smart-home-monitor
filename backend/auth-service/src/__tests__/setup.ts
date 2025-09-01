import express from 'express';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';

// Increase timeout for tests
jest.setTimeout(10000);

// Mock all dependencies globally
jest.mock('../db', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('jwt-token'),
  verify: jest.fn()
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid')
}));

// Mock shared logger to prevent logging during tests
jest.mock('@smart-home/shared', () => ({
  ...jest.requireActual('@smart-home/shared'),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  },
  ConflictError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ConflictError';
    }
  },
  UnauthorizedError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'UnauthorizedError';
    }
  }
}));

// Global test app factory
const createTestApp = (register: any, login: any, logout: any) => {
  const app = express();
  app.use(express.json());
  
  const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
  
  app.post('/register', asyncHandler(register));
  app.post('/login', asyncHandler(login));
  app.post('/logout', logout);
  
  // Error handling middleware must come AFTER routes
  app.use((error: any, req: any, res: any, next: any) => {
    if (error.name === 'ConflictError' || error.message === 'Email already in use') {
      return res.status(409).json({ status: 'error', message: error.message });
    }
    if (error.name === 'UnauthorizedError' || error.message === 'Invalid credentials') {
      return res.status(401).json({ status: 'error', message: error.message });
    }
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  });
  
  return app;
};

// Make it globally available
(global as any).createTestApp = createTestApp;