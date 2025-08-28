import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Minimal structured error log (avoid dumping request body/headers)
  logger.error('Error handler triggered', {
    message: err.message,
    name: err.name,
    path: req.path,
    method: req.method,
    originalUrl: req.originalUrl,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });

  // Handle validation errors
  if (err instanceof AppError) {
    logger.warn('AppError', {
      statusCode: err.statusCode,
      name: err.name,
      message: err.message,
      ...(err.data && { data: err.data })
    });
    
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.data && { data: err.data })
    });
  }

  // Handle other errors
  logger.error('Unhandled error', {
    name: err.name,
    message: err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack })
  });
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error = new AppError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};

export const asyncHandler = <T extends RequestHandler>(
  fn: T
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default {
  error: errorHandler,
  notFound: notFoundHandler,
  async: asyncHandler,
};
