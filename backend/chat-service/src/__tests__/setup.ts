// Jest setup file
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock logger to avoid console spam during tests
jest.mock('@smart-home/shared', () => ({
  ...jest.requireActual('@smart-home/shared'),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Set longer timeout for async operations
jest.setTimeout(30000);