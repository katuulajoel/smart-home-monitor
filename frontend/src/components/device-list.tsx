'use client';

import { useState, useEffect } from 'react';
import { telemetryClient } from '@/lib/api-client';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Device {
  id: string;
  name: string;
  type: string;
  lastReading?: {
    timestamp: string;
    energyWatts: number;
  };
}

export default function DeviceList() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const { data: { data} } = await telemetryClient.get('/devices');
        setDevices(data);
      } catch (err) {
        setError('Failed to load devices');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDevices();
  }, []);

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

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {devices.map((device) => (
          <li key={device.id}>
            <Link
              href={`/devices/${device.id}`}
              className="block hover:bg-gray-50"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-blue-600 truncate">
                    {device.name}
                  </p>
                  <div className="ml-2 flex-shrink-0 flex">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 cursor-help">
                          {device.type}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Device type: {device.type}</p>
                        <p className="text-xs mt-1">Click to view detailed energy data</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                {device.lastReading && (
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="flex items-center text-sm text-gray-500 cursor-help">
                            {device.lastReading.energyWatts} W
                          </p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Current power consumption</p>
                          <p className="text-xs mt-1">Measured in Watts (W)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="cursor-help">
                            Last reading: {new Date(device.lastReading.timestamp).toLocaleString()}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>When this data was last updated</p>
                          <p className="text-xs mt-1">Devices report every few minutes</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}