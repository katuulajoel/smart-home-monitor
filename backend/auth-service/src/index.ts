import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger';

// Load env from repo root using process.cwd() to avoid ESM-only APIs
const envCandidates = [
  path.resolve(process.cwd(), '../../.env.development'),
  path.resolve(process.cwd(), '../../.env.local'),
  path.resolve(process.cwd(), '../../.env'),
];
if (process.env.NODE_ENV !== 'production') {
  const envPath = envCandidates.find((p) => fs.existsSync(p));
  if (envPath) dotenv.config({ path: envPath });
}

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { errorHandler, notFoundHandler, logger } from '@smart-home/shared';
import authRoutes from './routes/auth';
import db from './db';

const app: Express = express();
const PORT = Number(process.env.AUTH_SERVICE_PORT || 3001);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Smart Home Energy Monitor - Auth API',
  }));
  
  logger.info(`Swagger UI available at http://localhost:${PORT}/api-docs`);
}

// Test database connection
app.get('/test-db', async (_req: Request, res: Response) => {
  try {
    const result = await db.raw('SELECT NOW() as now');
    res.json({ success: true, time: result.rows[0].now });
  } catch (error: unknown) {
    logger.error('Database connection failed', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      success: false, 
      error: 'Database connection failed',
      ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
    });
  }
});

// API documentation JSON
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Auth service running on port ${PORT}`);
});

// Graceful shutdown to release the port cleanly
const shutdownServer = (signal: string) => {
  logger.info(`${signal} received: closing HTTP server`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  // Fallback: force-exit after 5s if something hangs
  setTimeout(() => process.exit(1), 5000).unref();
};

process.on('SIGINT', () => shutdownServer('SIGINT'));
process.on('SIGTERM', () => shutdownServer('SIGTERM'));

export default app;
