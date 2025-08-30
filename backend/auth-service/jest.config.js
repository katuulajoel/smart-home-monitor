const { resolve } = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: resolve(__dirname, 'tsconfig.json'),
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleDirectories: [
    'node_modules',
    '../../node_modules',
  ],
};