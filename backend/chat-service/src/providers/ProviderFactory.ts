import { IModelProvider } from './IModelProvider';
import { ProviderStatus } from './types';
import { ProviderRegistry } from './ProviderRegistry';
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
  private registry: ProviderRegistry;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.registry = new ProviderRegistry();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize providers using registry pattern
    const providerConfigs = [
      { name: 'openai', config: this.config.openai },
      { name: 'ollama', config: this.config.ollama }
    ];

    for (const { name, config } of providerConfigs) {
      if (config?.enabled) {
        const provider = this.registry.createProvider(name, config);
        if (provider) {
          this.providers.set(name, provider);
          logger.info(`${name} provider initialized successfully`);
        }
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
   * Get status of all providers (parallel execution for better performance)
   */
  async getAllProviderStatuses(): Promise<ProviderStatus[]> {
    const statusPromises = Array.from(this.providers.values()).map(async (provider) => {
      try {
        // Add timeout to prevent hanging with proper cleanup
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<ProviderStatus>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Status check timeout')), 10000);
        });
        
        const statusPromise = provider.getStatus();
        
        const result = await Promise.race([statusPromise, timeoutPromise]);
        
        // Clear the timeout if the status check completed first
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        return result;
      } catch (error) {
        return {
          name: provider.getName(),
          status: 'unhealthy' as const,
          models: [],
          lastChecked: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    return Promise.all(statusPromises);
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

  /**
   * Get the provider registry for extensibility
   */
  getRegistry(): ProviderRegistry {
    return this.registry;
  }
}