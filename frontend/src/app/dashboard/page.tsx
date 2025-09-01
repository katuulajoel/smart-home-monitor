'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/protected-route';
import DeviceList from '@/components/device-list';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">Device Dashboard</h1>
        <div className="mt-8">
          <DeviceList />
        </div>
      </div>
    </ProtectedRoute>
  );
}