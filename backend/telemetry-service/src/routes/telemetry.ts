import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, asyncHandler, validate } from '@smart-home/shared';
import { telemetryController } from '../controllers/telemetry';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

router.post(
  '/',
  validate([
    body('deviceId').trim().notEmpty().withMessage('Device ID is required'),
    body('timestamp').isISO8601().withMessage('Valid timestamp is required'),
    body('energyWatts').isNumeric().withMessage('Energy consumption in watts is required'),
    body('voltage').isNumeric().optional(),
    body('current').isNumeric().optional(),
    body('powerFactor').isNumeric().optional(),
  ]),
  asyncHandler(telemetryController.addTelemetry)
);

router.get(
  '/device/:deviceId',
  validate([
    body('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be a number'),
  ]),
  asyncHandler(telemetryController.getDeviceTelemetry)
);

router.get(
  '/summary/device/:deviceId',
  validate([
    body('startDate').optional().isISO8601().withMessage('Valid start date is required'),
    body('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  ]),
  asyncHandler(telemetryController.getDeviceTelemetrySummary)
);

router.get(
  '/devices/summary',
  validate([
    body('startDate').optional().isISO8601().withMessage('Valid start date is required'),
    body('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  ]),
  asyncHandler(telemetryController.getUserDevicesTelemetrySummary)
);

export default router;
