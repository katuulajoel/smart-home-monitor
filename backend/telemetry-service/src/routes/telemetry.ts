import { Router } from 'express';
import { query, body } from 'express-validator';
import { authenticate, asyncHandler, validate } from '@smart-home/shared';
import { telemetryController } from '../controllers/telemetry';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Telemetry
 *   description: Telemetry data management
 */

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /telemetry:
 *   post:
 *     summary: Add new telemetry data
 *     tags: [Telemetry]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - timestamp
 *               - energyWatts
 *             properties:
 *               deviceId:
 *                 type: string
 *                 description: ID of the device
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Timestamp of the telemetry data
 *               energyWatts:
 *                 type: number
 *                 description: Energy consumption in watts
 *               voltage:
 *                 type: number
 *                 description: Voltage reading (optional)
 *               current:
 *                 type: number
 *                 description: Current reading (optional)
 *               powerFactor:
 *                 type: number
 *                 description: Power factor (optional)
 *     responses:
 *       201:
 *         description: Telemetry data added successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /telemetry/query:
 *   get:
 *     summary: Query telemetry data
 *     tags: [Telemetry]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceName
 *         schema:
 *           type: string
 *         description: Device name (optional)
 *       - in: query
 *         name: deviceType
 *         schema:
 *           type: string
 *         description: Device type (optional)
 *       - in: query
 *         name: metrics
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum:
 *               - power_consumption
 *               - voltage
 *               - current
 *         description: Metrics to include in the response (optional)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date of the query range
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date of the query range
 *       - in: query
 *         name: aggregation
 *         schema:
 *           type: string
 *           enum:
 *             - hourly
 *             - daily
 *             - weekly
 *             - monthly
 *         description: Aggregation level (optional)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *         description: Maximum number of results to return (optional)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Offset for pagination (optional)
 *     responses:
 *       200:
 *         description: Telemetry data query results
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /telemetry/device/{deviceId}:
 *   get:
 *     summary: Get telemetry data for a device
 *     tags: [Telemetry]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the device
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *         description: Maximum number of results to return (optional)
 *     responses:
 *       200:
 *         description: Telemetry data for the device
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/device/:deviceId',
  validate([
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be a number'),
  ]),
  asyncHandler(telemetryController.getDeviceTelemetry)
);

/**
 * @swagger
 * /telemetry/summary/device/{deviceId}:
 *   get:
 *     summary: Get telemetry summary for a device
 *     tags: [Telemetry]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the device
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date of the query range (optional)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date of the query range (optional)
 *     responses:
 *       200:
 *         description: Telemetry summary for the device
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/summary/device/:deviceId',
  validate([
    query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
    query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  ]),
  asyncHandler(telemetryController.getDeviceTelemetrySummary)
);

/**
 * @swagger
 * /telemetry/devices/summary:
 *   get:
 *     summary: Get telemetry summary for all devices
 *     tags: [Telemetry]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date of the query range (optional)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date of the query range (optional)
 *     responses:
 *       200:
 *         description: Telemetry summary for all devices
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/devices/summary',
  validate([
    query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
    query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  ]),
  asyncHandler(telemetryController.getUserDevicesTelemetrySummary)
);

export default router;
