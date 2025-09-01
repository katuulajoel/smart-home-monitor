import { Request, Response } from 'express';
import { ApiResponse, HttpStatus, logger, NotFoundError } from '@smart-home/shared';
import db from '../db';
import { z } from 'zod';

const AGGREGATION_FUNCTIONS = ['avg', 'sum', 'min', 'max'] as const;

const querySchema = z.object({
  deviceName: z.string().optional(),
  deviceType: z.string().optional(),
  metrics: z.array(z.enum(['power_consumption', 'voltage', 'current'])).min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  aggregation: z.enum(['hourly', 'daily', 'weekly', 'monthly']).optional(),
  functions: z.array(z.enum(AGGREGATION_FUNCTIONS)).optional().default(['avg']),
  limit: z.coerce.number().default(100),
  offset: z.coerce.number().default(0)
});

export const telemetryController = {

    async queryTelemetry(req: Request, res: Response) {
        try {
          const {
            deviceName,
            deviceType,
            metrics,
            startDate,
            endDate,
            aggregation = 'hourly',
            functions = ['avg'],
          } = querySchema.parse(req.query);
      
          const userId = req.user.id;
      
          // choose time bucket
          const unit =
            aggregation === 'daily' ? 'day' :
            aggregation === 'weekly' ? 'week' :
            aggregation === 'monthly' ? 'month' : 'hour';
      
          let query = db('telemetry_data')
            .join('devices', 'telemetry_data.device_id', 'devices.id')
            .where('devices.user_id', userId)
            .whereBetween('telemetry_data.timestamp', [startDate, endDate])
            .select(
              db.raw(`date_trunc('${unit}', telemetry_data.timestamp) as "time_bucket"`),
              'devices.id as deviceId',
              'devices.name as deviceName',
              'devices.type as deviceType'
            );
      
          if (deviceName) query.where('devices.name', 'ilike', `%${deviceName}%`);
          if (deviceType) query.where('devices.type', 'ilike', `%${deviceType}%`);
      
          // add metrics
          if (metrics && metrics.length > 0) {
            metrics.forEach(metric => {
              functions.forEach(fn => {
                query.select(
                  db.raw(`${fn}(${metric}) as "${metric}_${fn}"`)
                );
              });
            });
          }
      
          query
            .groupByRaw(`
              date_trunc('${unit}', telemetry_data.timestamp),
              devices.id, devices.name, devices.type
            `)
            .orderBy('time_bucket', 'asc');
      
          const rows = await query;
      
          // transform cleanly
          const transformed = rows.map(row => {
            const { timeBucket, deviceId, deviceName, deviceType, ...metricsData } = row;
      
            const metricsObj: Record<string, any> = {};
            Object.entries(metricsData).forEach(([key, value]) => {
              if (!value && value !== 0) return;
              
              const metricMatch = key.match(/^(.+?)(Avg|Sum|Min|Max|Count)$/);
              if (!metricMatch) return;
              
              const [, metric, fn] = metricMatch;
              const functionName = fn.toLowerCase();
              
              if (!metricsObj[metric]) metricsObj[metric] = {};
              metricsObj[metric][functionName] = Number(value);
            });
      
            return {
              device: { id: deviceId, name: deviceName, type: deviceType },
              timestamp: timeBucket instanceof Date ? timeBucket.toISOString() : timeBucket,
              metrics: metricsObj,
            };
          });
      
          return res.json({
            data: transformed,
            timeRange: { start: startDate, end: endDate },
            aggregation,
          });
        } catch (error) {
          console.error('❌ Error querying telemetry:', error);
          return res.status(400).json({
            error: 'Invalid query parameters',
            details: error instanceof Error ? error.message : 'Unknown error',
          });
        }
    },
    
    async addTelemetry(req: Request, res: Response): Promise<void> {
        try {
            const { deviceId, timestamp, energyWatts, voltage, current, additional_metrics = {} } = req.body;
            const userId = req.user.id;

            // Verify the device belongs to the user
            const deviceCheck = await db('devices')
                .where({ id: deviceId, user_id: userId })
                .first();

            if (!deviceCheck) {
                throw new NotFoundError('Device not found');
            }

            // Insert telemetry data
            const [result] = await db('telemetry_data')
                .insert({
                    device_id: deviceId,
                    timestamp,
                    power_consumption: energyWatts,
                    voltage,
                    current,
                    additional_metrics
                })
                .returning(['device_id', 'timestamp', 'power_consumption as energy_watts']);

            res.status(201).json({
                success: true,
                data: result,
            });
        } catch (error) {
            logger.error('Error adding telemetry data:', error);
            throw error;
        }
    },

    async getDeviceTelemetry(req: Request, res: Response): Promise<Response> {
        try {
            const { deviceId } = req.params;
            const { startDate, endDate, limit = 100 } = req.query;
            
            const telemetryData = await db('telemetry_data')
                .where({ device_id: deviceId })
                .select('*')
                .limit(Number(limit));
            
            const response: ApiResponse = {
                status: 'success',
                data: telemetryData,
                meta: {
                total: telemetryData.length,
                limit: Number(limit),
                },
            };
            
            return res.status(HttpStatus.OK).json(response);
        } catch (error) {
            logger.error('Error fetching device telemetry:', error);
            throw error; // Let the error handler middleware handle it
        }
    },

    async getDeviceTelemetrySummary(req: Request, res: Response): Promise<Response> {
        try {
            const { deviceId } = req.params;
            
            // Verify the device exists and belongs to the user
            const device = await db('devices')
                .where({
                    id: deviceId,
                    user_id: req.user?.id
                })
                .first();

            if (!device) {
                throw new NotFoundError('Device not found or access denied');
            }

            return telemetryController.getUserDevicesTelemetrySummary(
                { ...req, query: { ...req.query, deviceId } } as Request,
                res
            );
        } catch (error) {
            logger.error('Error generating device telemetry summary:', error);
            throw error;
        }
    },

    async getUserDevicesTelemetrySummary(req: Request, res: Response): Promise<Response> {
        try {
            const userId = req.user?.id;
            const { startDate, endDate, deviceId } = req.query;
        
            if (!userId) {
                return res.status(HttpStatus.UNAUTHORIZED).json({
                    status: 'error',
                    message: 'User not authenticated'
                });
            }

            // Convert dates to ISO string if they're not already
            const start = startDate ? new Date(startDate as string) : new Date();
            const end = endDate ? new Date(endDate as string) : new Date();
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            // Get user's devices
            const devices = await db('devices')
                .where('user_id', userId)
                .select('id', 'name', 'type');

            if (devices.length === 0) {
                return res.status(HttpStatus.OK).json({
                    status: 'success',
                    data: {
                        userId,
                        totalDevices: 0,
                        totalConsumption: 0,
                        devices: []
                    }
                });
            }

            // Filter devices by ID if provided
            const filteredDevices = deviceId ? devices.filter(d => d.id === deviceId) : devices;

            // Get metrics for all devices
            const deviceIds = filteredDevices.map(d => d.id);
            const metrics = await db('daily_device_metrics')
                .whereIn('device_id', deviceIds)
                .whereBetween('day', [start, end])
                .select('*');

            // Group metrics by device
            const metricsByDevice = metrics.reduce((acc, metric) => {
                const deviceId = metric.deviceId;
                if (!acc[deviceId]) {
                    acc[deviceId] = [];
                }
                acc[deviceId].push({
                    ...metric,
                    device_id: metric.deviceId,
                    day: new Date(metric.day),
                    avg_energy: parseFloat(metric.avgEnergy),
                    max_energy: parseFloat(metric.maxEnergy),
                    min_energy: parseFloat(metric.minEnergy),
                    total_energy: parseFloat(metric.totalEnergy),
                    readings_count: parseInt(metric.readingsCount, 10)
                });
                return acc;
            }, {} as Record<string, any[]>);

            // Format the response
            const deviceSummaries = filteredDevices.map(device => {
                const deviceMetrics = metricsByDevice[device.id] || [];
                const totalConsumption = deviceMetrics.reduce(
                    (sum, m) => sum + parseFloat(m.total_energy), 0
                );

                return {
                    deviceId: device.id,
                    deviceName: device.name,
                    deviceType: device.type,
                    totalConsumption,
                    averageConsumption: deviceMetrics.length > 0 
                        ? deviceMetrics.reduce((sum, m) => sum + parseFloat(m.avg_energy), 0) / deviceMetrics.length
                        : 0,
                    dataPoints: deviceMetrics.map(m => ({
                        timestamp: m.day,
                        avgEnergy: m.avg_energy,
                        totalEnergy: m.total_energy,
                        readingsCount: m.readings_count
                    }))
                };
            });

            const totalConsumption = deviceSummaries.reduce(
                (sum, device) => sum + device.totalConsumption, 0
            );

            const response: ApiResponse = {
                status: 'success',
                data: {
                    userId,
                    totalDevices: filteredDevices.length,
                    totalConsumption,
                    devices: deviceSummaries,
                    meta: {
                        startDate: start.toISOString(),
                        endDate: end.toISOString(),
                    }
                }
            };

            return res.status(HttpStatus.OK).json(response);
        } catch (error) {
            logger.error('Error generating user devices telemetry summary:', error);
            throw error;
        }
    },

    async getDevices(req: Request, res: Response) {
        try {
            const userId = req.user.id;
            
            const devices = await db('devices')
                .where('user_id', userId)
                .select('id', 'name', 'type', 'metadata', 'created_at as createdAt');

            return res.status(HttpStatus.OK).json({
                success: true,
                data: devices,
                message: 'Devices retrieved successfully'
            } as ApiResponse);
        } catch (error) {
            logger.error('Error getting devices:', error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to retrieve devices'
            } as ApiResponse);
        }
    },
};
