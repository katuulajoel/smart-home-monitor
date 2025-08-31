import { Request, Response } from 'express';
import { ApiResponse, HttpStatus, logger, NotFoundError } from '@smart-home/shared';
import db from '../db';

export const telemetryController = {

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
};
