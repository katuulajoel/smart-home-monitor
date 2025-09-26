import { ChatMessage, ChatResponse, ChatOptions, ModelInfo, ProviderStatus } from './types';

export interface IModelProvider {
  /**
   * Get the name of this provider (e.g., 'openai', 'ollama')
   */
  getName(): string;

  /**
   * Check if the provider is healthy and accessible
   */
  isHealthy(): Promise<boolean>;

  /**
   * Get all available models from this provider
   */
  getAvailableModels(): Promise<ModelInfo[]>;

  /**
   * Get complete provider status including health and models
   */
  getStatus(): Promise<ProviderStatus>;

  /**
   * Send a chat request to the specified model
   */
  chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse>;

  /**
   * Check if a specific model is available
   */
  hasModel(modelId: string): Promise<boolean>;
}