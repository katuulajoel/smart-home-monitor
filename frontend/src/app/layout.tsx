// src/app/layout.tsx
import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/auth-context';
import ClientLayout from './client-layout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Home Energy Monitor',
  description: 'Monitor and analyze your home energy consumption',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>
        </AuthProvider>
      </body>
    </html>
  );
}