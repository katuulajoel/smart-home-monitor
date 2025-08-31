import { Router } from 'express';
import { query, body } from 'express-validator';
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
    '/query',
    validate([
      query('deviceName').optional().isString().trim(),
      query('deviceType').optional().isString().trim(),
      query('metrics').isArray(),
      query('metrics.*').isIn(['power_consumption', 'voltage', 'current']),
      query('startDate').isISO8601(),
      query('endDate').isISO8601(),
      query('aggregation').optional().isIn(['hourly', 'daily', 'weekly', 'monthly']),
      query('limit').optional().isInt({ min: 1, max: 1000 }),
      query('offset').optional().isInt({ min: 0 })
    ]),
    asyncHandler(telemetryController.queryTelemetry)
  );

router.get(
  '/device/:deviceId',
  validate([
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be a number'),
  ]),
  asyncHandler(telemetryController.getDeviceTelemetry)
);

router.get(
  '/summary/device/:deviceId',
  validate([
    query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
    query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  ]),
  asyncHandler(telemetryController.getDeviceTelemetrySummary)
);

router.get(
  '/devices/summary',
  validate([
    query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
    query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  ]),
  asyncHandler(telemetryController.getUserDevicesTelemetrySummary)
);

export default router;
