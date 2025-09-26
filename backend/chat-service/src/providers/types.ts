// Types for the model provider system

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  size?: string;
  description?: string;
  capabilities?: string[];
}

export interface ProviderStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  models: ModelInfo[];
  lastChecked?: Date;
  error?: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  provider: string;
  tokens?: {
    input: number;
    output: number;
  };
}

export interface ChatOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}