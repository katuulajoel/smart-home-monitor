import { Router } from 'express';
import { body } from 'express-validator';
import { validate, asyncHandler, authenticate } from '@smart-home/shared';
import * as authController from '../controllers/auth';

const router = Router();

// Register route
router.post(
  '/register',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password')
      .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 })
      .withMessage('Password must be at least 8 chars and include uppercase, lowercase, and a number'),
    body('name').trim().notEmpty(),
  ]),
  asyncHandler(authController.register)
);

// Login route
router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ]),
  asyncHandler(authController.login)
);

// Logout route
router.post('/logout', authenticate, asyncHandler(authController.logout));

export default router;
