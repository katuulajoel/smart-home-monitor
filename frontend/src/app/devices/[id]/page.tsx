'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { telemetryClient } from '@/lib/api-client';
import ProtectedRoute from '@/components/protected-route';

interface TelemetryData {
  id: string;
  timestamp: string;
  powerConsumption: number;
  voltage?: number;
  current?: number;
}

const TELEMETRY_LIMIT = 20;

export default function DeviceDetailPage() {
  const { id } = useParams();
  const [device, setDevice] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);

  const fetchTelemetry = useCallback(async (before?: string) => {
    try {
      const params = new URLSearchParams({
        limit: TELEMETRY_LIMIT.toString(),
        ...(before && { before }),
      });
      
      const response = await telemetryClient.get(`/device/${id}?${params.toString()}`);
      const newTelemetry = response.data.data;
      
      setTelemetry(prev => before ? [...prev, ...newTelemetry] : newTelemetry);
      setHasMore(response.data.meta?.hasMore || false);
      return newTelemetry;
    } catch (err) {
      setError('Failed to load telemetry data');
      console.error(err);
      return [];
    }
  }, [id]);

  const fetchInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [deviceRes] = await Promise.all([
        telemetryClient.get(`/devices/${id}`),
        fetchTelemetry(),
      ]);
      setDevice(deviceRes.data.data);
    } catch (err) {
      setError('Failed to load device data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [id, fetchTelemetry]);

  useEffect(() => {
    if (id) {
      fetchInitialData();
    }
  }, [id, fetchInitialData]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    
    try {
      setIsLoadingMore(true);
      const lastTelemetry = telemetry[telemetry.length - 1];
      if (lastTelemetry) {
        await fetchTelemetry(lastTelemetry.timestamp);
      }
    } catch (err) {
      console.error('Error loading more telemetry:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchTelemetry, isLoadingMore, hasMore, telemetry]);

  // Set up intersection observer for infinite scroll
  const lastTelemetryElementRef = useCallback((node: HTMLElement | null) => {
    if (isLoadingMore) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && hasMore) {
        loadMore();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isLoadingMore, hasMore, loadMore]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (!device) {
    return <div>Device not found</div>;
  }

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{device.name}</h1>
          <p className="text-gray-600">{device.type}</p>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Device Information
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Device ID</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {device.id}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Last Reading
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {telemetry[0] ? (
                    <>
                      {new Date(telemetry[0].timestamp).toLocaleString()} -{' '}
                      {telemetry[0].powerConsumption} W
                    </>
                  ) : (
                    'No data available'
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Telemetry Data
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Timestamp
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Power Consumption (W)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Voltage (V)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Current (A)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {telemetry.map((entry, index) => {
                  const isLastElement = index === telemetry.length - 1;
                  return (
                    <tr 
                      key={index} 
                      ref={isLastElement ? lastTelemetryElementRef : null}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.powerConsumption?.toFixed(2) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.voltage?.toFixed(2) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.current?.toFixed(2) || 'N/A'}
                      </td>
                    </tr>
                  );
                })}
                {isLoadingMore && (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}