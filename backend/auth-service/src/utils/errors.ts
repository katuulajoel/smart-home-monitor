import { type Request, type Response, type NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  data?: Record<string, any>;

  constructor(message: string, statusCode: number = 500, data?: Record<string, any>) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, data?: Record<string, any>) {
    super(message, 400, data);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', data?: Record<string, any>) {
    super(message, 401, data);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', data?: Record<string, any>) {
    super(message, 403, data);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', data?: Record<string, any>) {
    super(message, 404, data);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', data?: Record<string, any>) {
    super(message, 409, data);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error', data?: Record<string, any>) {
    super(message, 500, data);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log the error
  console.error({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle validation errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.data && { data: err.data })
    });
  }

  // Handle other errors
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error = new AppError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};

export const asyncHandler = (fn: Function) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  errorHandler,
  notFoundHandler,
  asyncHandler
};
