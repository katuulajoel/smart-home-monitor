import axios, { AxiosInstance } from 'axios';

// Get the base URL for API services
const getBaseUrl = (service: 'auth' | 'telemetry' | 'chat' = 'auth') => {
  if (typeof window === 'undefined') return ''; // Server-side should use relative URL
  
  // In production, use the production URLs from environment variables
  if (process.env.NEXT_PUBLIC_IS_PRODUCTION === 'true') {
    const urls = {
      auth: process.env.NEXT_PUBLIC_API_URL || '',
      telemetry: process.env.NEXT_PUBLIC_TELEMETRY_SERVICE_URL || '',
      chat: process.env.NEXT_PUBLIC_CHAT_SERVICE_URL || ''
    };
    return urls[service];
  }

  // In development, use localhost with ports from environment variables
  const baseUrls = {
    auth: `http://localhost:${process.env.AUTH_SERVICE_PORT || 3001}/api`,
    telemetry: `http://localhost:${process.env.TELEMETRY_SERVICE_PORT || 3002}/api/telemetry`,
    chat: `http://localhost:${process.env.CHAT_SERVICE_PORT || 3003}/api/chat`
  };
  return baseUrls[service];
};

// Create separate API clients for different services
export const authClient: AxiosInstance = axios.create({
  baseURL: getBaseUrl('auth'),
  headers: { 'Content-Type': 'application/json' },
});

export const telemetryClient: AxiosInstance = axios.create({
  baseURL: getBaseUrl('telemetry'),
  headers: { 'Content-Type': 'application/json' },
});

export const chatClient: AxiosInstance = axios.create({
  baseURL: getBaseUrl('chat'),
  headers: { 'Content-Type': 'application/json' },
});

// TODO: change backend to have like a proxy server to handle all the requests and direct them to the appropriate service
// Helper function to get the appropriate client
export const getApiClient = (service: 'auth' | 'telemetry' | 'chat' = 'auth') => {
  return {
    auth: authClient,
    telemetry: telemetryClient,
    chat: chatClient
  }[service];
};

// Add interceptors to all clients
[telemetryClient, chatClient].forEach(client => {
  // Request interceptor to add auth token
  client.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  // Response interceptor to handle errors
  client.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
});

// For backward compatibility
export const apiClient = authClient;
export default apiClient;