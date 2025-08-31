import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, asyncHandler, validate } from '@smart-home/shared';
import { chatController } from '../controllers/chat';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route POST /chat/message
 * @desc Process a user message, get intent from LLM, fetch telemetry data, and respond
 * @access Private
 */
router.post(
  '/message',
  validate([
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('sessionId').optional().isUUID().withMessage('Invalid session ID format'),
  ]),
  asyncHandler(chatController.processMessage)
);

/**
 * @route GET /chat/history
 * @desc Get chat history for the authenticated user
 * @access Private
 */
router.get(
  '/history',
  validate([
    body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    body('before').optional().isISO8601().withMessage('Invalid date format'),
  ]),
  asyncHandler(chatController.getChatHistory)
);

export default router;
