import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';

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
import { errorHandler, notFoundHandler,logger } from '@smart-home/shared';
import chatRoutes from './routes/chat';

const app: Express = express();
const PORT = Number(process.env.CHAT_SERVICE_PORT || 3003);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', limiter);

// Routes
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Chat service running on port ${PORT}`);
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
