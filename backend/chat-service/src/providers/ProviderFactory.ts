import { IModelProvider } from './IModelProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { OllamaProvider } from './OllamaProvider';
import { ProviderStatus } from './types';
import { logger } from '@smart-home/shared';

export type ProviderType = 'openai' | 'ollama';

export interface ProviderConfig {
  openai?: {
    apiKey: string;
    enabled: boolean;
  };
  ollama?: {
    baseUrl: string;
    enabled: boolean;
  };
}

export class ProviderFactory {
  private providers: Map<string, IModelProvider> = new Map();
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize OpenAI provider if configured
    if (this.config.openai?.enabled && this.config.openai.apiKey) {
      try {
        const openaiProvider = new OpenAIProvider(this.config.openai.apiKey);
        this.providers.set('openai', openaiProvider);
        logger.info('OpenAI provider initialized');
      } catch (error) {
        logger.error('Failed to initialize OpenAI provider:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Initialize Ollama provider if configured
    if (this.config.ollama?.enabled) {
      try {
        const ollamaProvider = new OllamaProvider(this.config.ollama.baseUrl);
        this.providers.set('ollama', ollamaProvider);
        logger.info('Ollama provider initialized');
      } catch (error) {
        logger.error('Failed to initialize Ollama provider:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    if (this.providers.size === 0) {
      logger.warn('No AI providers initialized. Check your configuration.');
    }
  }

  /**
   * Get a specific provider by name
   */
  getProvider(name: string): IModelProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all available providers
   */
  getAllProviders(): IModelProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get the first healthy provider (for fallback scenarios)
   */
  async getHealthyProvider(): Promise<IModelProvider | undefined> {
    for (const provider of this.providers.values()) {
      const isHealthy = await provider.isHealthy();
      if (isHealthy) {
        return provider;
      }
    }
    return undefined;
  }

  /**
   * Get status of all providers
   */
  async getAllProviderStatuses(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];

    for (const provider of this.providers.values()) {
      try {
        const status = await provider.getStatus();
        statuses.push(status);
      } catch (error) {
        statuses.push({
          name: provider.getName(),
          status: 'unhealthy',
          models: [],
          lastChecked: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return statuses;
  }

  /**
   * Check if a provider supports a specific model
   */
  async hasModel(providerName: string, modelId: string): Promise<boolean> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return false;
    }

    try {
      return await provider.hasModel(modelId);
    } catch (error) {
      logger.error(`Error checking model ${modelId} on provider ${providerName}:`, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Find which provider has a specific model
   */
  async findProviderForModel(modelId: string): Promise<IModelProvider | undefined> {
    for (const provider of this.providers.values()) {
      try {
        const hasModel = await provider.hasModel(modelId);
        if (hasModel) {
          return provider;
        }
      } catch (error) {
        logger.error(`Error checking model ${modelId} on provider ${provider.getName()}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    return undefined;
  }

  /**
   * Get default provider (first healthy provider)
   */
  async getDefaultProvider(): Promise<IModelProvider | undefined> {
    // Prefer OpenAI if available and healthy
    const openaiProvider = this.getProvider('openai');
    if (openaiProvider && await openaiProvider.isHealthy()) {
      return openaiProvider;
    }

    // Fallback to any healthy provider
    return this.getHealthyProvider();
  }

  /**
   * Reload providers with new configuration
   */
  reloadProviders(newConfig: ProviderConfig): void {
    this.providers.clear();
    this.config = newConfig;
    this.initializeProviders();
  }
}