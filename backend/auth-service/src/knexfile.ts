import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate .env locations (service-level first, then backend root, then repo root)
const envCandidates = [
  path.resolve(__dirname, '../../../.env'),      // repo root .env
];

// Load dotenv only in non-production; prefer runtime envs in prod (Compose/K8s/CI)
if (process.env.NODE_ENV !== 'production') {
  const envPath = envCandidates.find((p) => fs.existsSync(p));
  if (envPath) dotenv.config({ path: envPath });
}

// Debug log only in non-production
if (process.env.NODE_ENV !== 'production') {
  console.log('DB_HOST:', process.env.DB_HOST || 'not set');
  console.log('DB_NAME:', process.env.DB_NAME || 'not set');
}

interface KnexFileConfig {
  [key: string]: Knex.Config;
}

const config: KnexFileConfig = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'auth_service',
      port: parseInt(process.env.DB_PORT || '5432', 10),
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
    debug: process.env.KNEX_DEBUG === 'true',
  },
  
  test: {
    client: 'pg',
    connection: {
      host: process.env.TEST_DB_HOST || 'localhost',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres',
      database: process.env.TEST_DB_NAME || 'test_auth_service',
      port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
  },
  
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
  },
};

export default config;

export {};
