import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate, asyncHandler, validate } from '@smart-home/shared';
import { chatController } from '../controllers/chat';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chat and conversation management
 */

/**
 * @swagger
 * /chat/message:
 *   post:
 *     summary: Send a message to the chat and get a response
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: The user's message
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional session ID for multi-turn conversations
 *     responses:
 *       200:
 *         description: Chat response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                   description: The AI's response message
 *                 sessionId:
 *                   type: string
 *                   format: uuid
 *                   description: Session ID for continuing the conversation
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
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
 * @swagger
 * /chat/history:
 *   get:
 *     summary: Get chat history for the authenticated user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of history items to return
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get history before this timestamp
 *     responses:
 *       200:
 *         description: Chat history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                   message:
 *                     type: string
 *                   isUser:
 *                     type: boolean
 *                     description: Whether the message is from the user or AI
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/history',
  validate([
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('before').optional().isISO8601().withMessage('Invalid date format'),
  ]),
  asyncHandler(chatController.getChatHistory)
);

export default router;
