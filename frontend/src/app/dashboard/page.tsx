'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ProtectedRoute from '@/components/protected-route';
import DeviceList from '@/components/device-list';
import { telemetryClient } from '@/lib/api-client';

interface DataPoint {
  timestamp: string;
  avgEnergy: number;
  totalEnergy: number;
  readingsCount: number;
}

interface DeviceSummary {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  totalConsumption: number;
  averageConsumption: number;
  dataPoints: DataPoint[];
}

interface SummaryData {
  userId: string;
  totalDevices: number;
  totalConsumption: number;
  devices: DeviceSummary[];
  meta: {
    startDate: string;
    endDate: string;
  };
}

const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'MMM d');
};

const fetchEnergySummary = async (): Promise<SummaryData> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const params = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };

  const response = await telemetryClient.get('/devices/summary', { params });
  return response.data.data;
};

const EnergySummaryCard = ({ data }: { data: SummaryData }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Energy Usage Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">Total Consumption</p>
            <p className="text-2xl font-bold">
              {data.totalConsumption.toFixed(2)} <span className="text-sm font-normal">kWh</span>
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">Devices</p>
            <p className="text-2xl font-bold">{data.totalDevices}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">Period</p>
            <p className="text-sm">
              {formatDate(data.meta.startDate)} - {formatDate(data.meta.endDate)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const EnergyUsageChart = ({ data }: { data: SummaryData }) => {
  // Transform data for the chart
  const chartData = data.devices.flatMap(device => 
    device.dataPoints.map(point => ({
      date: formatDate(point.timestamp),
      [device.deviceName]: point.avgEnergy,
      timestamp: point.timestamp
    }))
  );

  // Group by date and sum up values
  const groupedData = chartData.reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.date === curr.date);
    if (existing) {
      Object.keys(curr).forEach(key => {
        if (key !== 'date' && key !== 'timestamp') {
          existing[key] = (existing[key] || 0) + curr[key];
        }
      });
    } else {
      acc.push({ ...curr });
    }
    return acc;
  }, []);

  // Sort by date
  const sortedData = [...groupedData].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Get unique device names for legend
  const deviceNames = [...new Set(data.devices.map(device => device.deviceName))];
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe'];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Daily Average Energy Consumption (kWh)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={sortedData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {deviceNames.map((device, index) => (
                <Line
                  key={device}
                  type="monotone"
                  dataKey={device}
                  stroke={colors[index % colors.length]}
                  activeDot={{ r: 8 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DashboardPage() {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchEnergySummary();
        setSummaryData(data);
      } catch (err) {
        console.error('Error loading energy data:', err);
        setError('Failed to load energy data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="max-w-7xl mx-auto p-4 space-y-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid gap-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="max-w-7xl mx-auto p-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Energy Dashboard</h1>
        
        {summaryData && (
          <>
            <EnergySummaryCard data={summaryData} />
            <EnergyUsageChart data={summaryData} />
          </>
        )}
        
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Your Devices</h2>
          <DeviceList />
        </div>
      </div>
    </ProtectedRoute>
  );
}