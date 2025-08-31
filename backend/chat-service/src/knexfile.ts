import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env file if it exists
const envPath = path.resolve(process.cwd(), '../../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

interface KnexFileConfig {
  [key: string]: Knex.Config;
}

// Helper function to get database configuration
const getDbConfig = () => ({
  host: process.env.DB_HOST || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'energy_monitor',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

const config: KnexFileConfig = {
  development: {
    client: 'pg',
    connection: getDbConfig(),
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations_chat',
      extension: 'ts',
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
    debug: process.env.KNEX_DEBUG === 'true',
  },
  
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL || getDbConfig(),
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations_chat',
      extension: 'ts',
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
  },
};

export default config;
