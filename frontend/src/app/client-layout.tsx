'use client';

import { Inter } from 'next/font/google';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { useState } from 'react';
import './globals.css';
import AIChatPanel from '@/components/ai-chat-panel';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-gray-900">Smart Home Energy Monitor</h1>
            <div className="hidden md:flex items-center space-x-6">
              <Link 
                href="/" 
                className="text-gray-700 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>

          {isAuthenticated && (
            <div className="flex items-center space-x-6">
              <button
                onClick={() => setIsChatOpen(true)}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                Ask AI
              </button>
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center space-x-2 focus:outline-none"
                >
                  <span className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </button>
                {isMenuOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b">
                        {user?.name || 'User'}
                      </div>
                      <button
                        onClick={logout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {isChatOpen && <AIChatPanel onClose={() => setIsChatOpen(false)} />}
    </nav>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();

  return (
    <div className={inter.className}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className={`${isAuthenticated ? 'container mx-auto px-4 py-8' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}