import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

// Authentication middleware
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.log('Auth middleware - Request received:', {
    method: req.method,
    path: req.path,
    headers: {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length']
    }
  });
  
  // Get token from header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    console.log('No auth header found');
    return next(new UnauthorizedError('No token provided'));
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    console.log('No token found in header');
    return next(new UnauthorizedError('No token provided'));
  }

  try {
    console.log('Verifying JWT token');
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { 
      id: string; 
      email: string; 
      iat: number;
      exp: number;
    };
    
    if (!decoded.id || !decoded.email) {
      console.log('Invalid token payload:', decoded);
      throw new UnauthorizedError('Invalid token');
    }
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };
    
    console.log('User authenticated:', { userId: req.user.id, email: req.user.email });
    next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
};

export default {
  authenticate,
};
