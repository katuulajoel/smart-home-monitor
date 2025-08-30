import { Request, Response } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { AppError, ConflictError, UnauthorizedError, NotFoundError, ValidationError, logger } from '@smart-home/shared';
import db from '../db';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN: string | number = process.env.JWT_EXPIRES_IN || '1h';

interface TokenPayload {
  id: string;
  email: string;
}

// Extend Express Request type to include user
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

// Token generation helper
const generateToken = (userId: string, email: string): string => {
  const payload: TokenPayload = { id: userId, email };
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, JWT_SECRET, options) as string;
};

// Register a new user
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body;
  logger.info('Starting user registration', { email, name });

  try {
    const existingUser = await db('users').where({ email }).first();
    
    if (existingUser) {
      logger.warn('Registration failed - email already in use', { email });
      throw new ConflictError('Email already in use');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in transaction
    const [user] = await db('users')
      .insert({
        id: uuidv4(),
        name,
        email,
        password: hashedPassword,
      })
      .returning(['id', 'name', 'email']);
    
    logger.info('User created successfully', { userId: user.id });

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // Return user info (without password)
    res.status(201).json({
      status: 'success',
      data: {
        user,
        token
      }
    });
    logger.info('Registration completed successfully', { email, userId: user.id });
  } catch (error) {
    logger.error('Error in registration', { error, email });
    throw error;
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await db('users').where({ email }).first();
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if password is correct
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // Return user info (without password)
    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token
      }
    });
  } catch (error) {
    throw error;
  }
};

// Logout user
export const logout = (_req: Request, res: Response): void => {
  res.clearCookie('token');
  res.status(200).json({
    status: 'success',
    message: 'Successfully logged out'
  });
};

export default {
  register,
  login,
  logout
};
