import knex, { Knex } from 'knex';
import { knexSnakeCaseMappers } from 'objection';
import 'dotenv/config';
import {logger} from '@smart-home/shared';

// Database connection configuration
interface DatabaseConfig extends Knex.Config {
  connection: Knex.PgConnectionConfig;
}

const dbConfig: DatabaseConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'energy_monitor',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  ...knexSnakeCaseMappers(),
  pool: {
    min: 2,
    max: 10,
    afterCreate: (conn: any, done: (err?: Error) => void) => {
      // Run a simple query to test the connection
      conn.query('SELECT 1', (err: Error) => done(err));
    },
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './seeds',
    extension: 'ts',
  },
};

// Create the Knex instance
const db = knex(dbConfig);

// Test the database connection
export const testConnection = async (): Promise<void> => {
  try {
    await db.raw('SELECT 1');
  } catch (error) {
    logger.error('Database connection failed', { error });
    throw error;
  }
};

// Handle database connection errors
db.on('error', (err: Error) => {
  logger.error('Database connection error', { error: err });
  // TODO:In a production environment, you might want to implement reconnection logic here
});

// Graceful shutdown
export const shutdown = async (): Promise<void> => {
  try {
    await db.destroy();
    logger.info('Database connection closed');  
  } catch (error) {
    logger.error('Error closing database connection', { error });
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default db;
