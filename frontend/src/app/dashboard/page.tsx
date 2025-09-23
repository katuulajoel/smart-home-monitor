'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ProtectedRoute from '@/components/protected-route';
import DeviceList from '@/components/device-list';
import { telemetryClient } from '@/lib/api-client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
    const date = new Date(dateString);
    const now = new Date();
    return date.getFullYear() === now.getFullYear()
      ? format(date, 'MMM d')
      : format(date, 'MMM d, yyyy');
};

type DateRange = {
  startDate: Date;
  endDate: Date;
};

type DateRangePreset = 'week' | 'month' | 'year';

const getDateRange = (preset: DateRangePreset): DateRange => {
  const endDate = new Date();
  let startDate = new Date();
  
  switch (preset) {
    case 'week':
      startDate = subDays(endDate, 7);
      break;
    case 'month':
      startDate = subMonths(endDate, 1);
      break;
    case 'year':
      startDate = subYears(endDate, 1);
      break;
  }
  
  return { startDate, endDate };
};

const DateRangeSelector = ({
    activeRange,
    onDateRangeChange,
  }: {
    activeRange: DateRangePreset;
    onDateRangeChange: (preset: DateRangePreset) => void;
  }) => {
    return (
      <Tabs
        value={activeRange}
        className="w-full md:w-auto"
        onValueChange={(value) => {
          onDateRangeChange(value as DateRangePreset);
        }}
      >
        <TabsList>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="week">Past Week</TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>View energy data from the last 7 days</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="month">Past Month</TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>View energy data from the last 30 days</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="year">Past Year</TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>View energy data from the last 365 days</p>
            </TooltipContent>
          </Tooltip>
        </TabsList>
      </Tabs>
    );
};

const EnergySummaryCard = ({ data }: { data: SummaryData }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Energy Usage Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-2 cursor-help">
                <p className="text-sm font-medium text-gray-500">Total Consumption</p>
                <p className="text-2xl font-bold">
                  {data.totalConsumption.toFixed(2)} <span className="text-sm font-normal">kWh</span>
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total energy consumed by all devices during this period</p>
              <p className="text-xs mt-1">Measured in kilowatt-hours (kWh)</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-2 cursor-help">
                <p className="text-sm font-medium text-gray-500">Devices</p>
                <p className="text-2xl font-bold">{data.totalDevices}</p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Number of smart devices connected to your energy monitor</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-2 cursor-help">
                <p className="text-sm font-medium text-gray-500">Period</p>
                <p className="text-sm">
                  {formatDate(data.meta.startDate)} - {formatDate(data.meta.endDate)}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Date range for the displayed energy data</p>
            </TooltipContent>
          </Tooltip>
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
        <Tooltip>
          <TooltipTrigger asChild>
            <CardTitle className="cursor-help">Daily Average Energy Consumption (kWh)</CardTitle>
          </TooltipTrigger>
          <TooltipContent>
            <p>Shows daily average power consumption for each device</p>
            <p className="text-xs mt-1">Hover over lines to see detailed values</p>
          </TooltipContent>
        </Tooltip>
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
              <RechartsTooltip />
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
  
    const [dateRange, setDateRange] = useState<DateRange>(() => getDateRange('week'));
    const [activeRange, setActiveRange] = useState<DateRangePreset>("week");
  
    useEffect(() => {
      const fetchData = async () => {
        try {
          setIsLoading(true);
          const params = {
            startDate: dateRange.startDate.toISOString(),
            endDate: dateRange.endDate.toISOString(),
          };
  
          const response = await telemetryClient.get('/devices/summary', { params });
          setSummaryData(response.data.data);
        } catch (err) {
          console.error('Error loading energy data:', err);
          setError('Failed to load energy data. Please try again later.');
        } finally {
          setIsLoading(false);
        }
      };
  
      fetchData();
    }, [dateRange]);
  
    const handleDateRangeChange = useCallback((preset: DateRangePreset) => {
        setActiveRange(preset);
        setDateRange(getDateRange(preset));
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
            <div
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
              role="alert"
            >
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Energy Dashboard</h1>
            <DateRangeSelector
              activeRange={activeRange}
              onDateRangeChange={handleDateRangeChange}
            />
          </div>
  
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
  