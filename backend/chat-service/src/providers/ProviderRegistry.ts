import { IModelProvider } from './IModelProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { OllamaProvider } from './OllamaProvider';
import { logger } from '@smart-home/shared';

export interface ProviderPlugin {
  name: string;
  factory: (config: any) => IModelProvider;
  configSchema: {
    required: string[];
    optional: string[];
  };
  isConfigValid: (config: any) => boolean;
}

/**
 * Registry for AI provider plugins with extensible architecture
 */
export class ProviderRegistry {
  private plugins: Map<string, ProviderPlugin> = new Map();

  constructor() {
    this.registerBuiltinProviders();
  }

  /**
   * Register a provider plugin
   */
  registerProvider(plugin: ProviderPlugin): void {
    if (this.plugins.has(plugin.name)) {
      logger.warn(`Provider plugin ${plugin.name} is already registered. Overwriting.`);
    }
    
    this.plugins.set(plugin.name, plugin);
    logger.info(`Registered provider plugin: ${plugin.name}`);
  }

  /**
   * Get all registered provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get provider plugin by name
   */
  getPlugin(name: string): ProviderPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Create provider instance from plugin
   */
  createProvider(name: string, config: any): IModelProvider | null {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      logger.error(`No plugin registered for provider: ${name}`);
      return null;
    }

    if (!plugin.isConfigValid(config)) {
      logger.error(`Invalid configuration for provider: ${name}`);
      return null;
    }

    try {
      return plugin.factory(config);
    } catch (error) {
      logger.error(`Failed to create provider ${name}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Register built-in providers
   */
  private registerBuiltinProviders(): void {
    // OpenAI Provider Plugin
    this.registerProvider({
      name: 'openai',
      factory: (config) => new OpenAIProvider(config.apiKey),
      configSchema: {
        required: ['apiKey'],
        optional: ['enabled']
      },
      isConfigValid: (config) => {
        return config && typeof config.apiKey === 'string' && config.apiKey.length > 0;
      }
    });

    // Ollama Provider Plugin
    this.registerProvider({
      name: 'ollama',
      factory: (config) => new OllamaProvider(config.baseUrl),
      configSchema: {
        required: ['baseUrl'],
        optional: ['enabled']
      },
      isConfigValid: (config) => {
        if (!config || typeof config.baseUrl !== 'string') return false;
        
        try {
          new URL(config.baseUrl);
          return true;
        } catch {
          return false;
        }
      }
    });

    logger.info('Built-in provider plugins registered');
  }

  /**
   * Get configuration schema for a provider
   */
  getConfigSchema(name: string): ProviderPlugin['configSchema'] | null {
    const plugin = this.plugins.get(name);
    return plugin?.configSchema || null;
  }

  /**
   * Validate configuration for a provider
   */
  validateConfig(name: string, config: any): boolean {
    const plugin = this.plugins.get(name);
    return plugin?.isConfigValid(config) || false;
  }

  /**
   * List all registered providers with their schemas
   */
  listProviders(): Array<{ name: string; schema: ProviderPlugin['configSchema'] }> {
    return Array.from(this.plugins.entries()).map(([name, plugin]) => ({
      name,
      schema: plugin.configSchema
    }));
  }
}