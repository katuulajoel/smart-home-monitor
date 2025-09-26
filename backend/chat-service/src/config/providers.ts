import { logger } from '@smart-home/shared';

export interface ValidatedProviderConfig {
  openai?: {
    apiKey: string;
    enabled: boolean;
  };
  ollama?: {
    baseUrl: string;
    enabled: boolean;
  };
}

/**
 * Validates and normalizes provider configuration at startup
 */
export function validateProviderConfig(): ValidatedProviderConfig {
  const config: ValidatedProviderConfig = {};

  // Validate OpenAI configuration
  if (process.env.OPENAI_API_KEY) {
    if (process.env.OPENAI_API_KEY.length < 10) {
      logger.warn('OpenAI API key appears to be invalid (too short)');
    }
    
    config.openai = {
      apiKey: process.env.OPENAI_API_KEY,
      enabled: process.env.OPENAI_ENABLED !== 'false'
    };
    
    logger.info('OpenAI provider configured');
  } else {
    logger.info('OpenAI API key not provided - OpenAI provider disabled');
  }

  // Validate Ollama configuration
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const ollamaEnabled = process.env.OLLAMA_ENABLED !== 'false';
  
  if (ollamaEnabled) {
    try {
      new URL(ollamaBaseUrl);
      config.ollama = {
        baseUrl: ollamaBaseUrl,
        enabled: true
      };
      logger.info(`Ollama provider configured with base URL: ${ollamaBaseUrl}`);
    } catch (error) {
      logger.error(`Invalid Ollama base URL: ${ollamaBaseUrl}. Ollama provider disabled.`);
    }
  } else {
    logger.info('Ollama provider disabled');
  }

  // Ensure at least one provider is configured
  const enabledProviders = Object.keys(config).length;
  if (enabledProviders === 0) {
    logger.warn('No AI providers configured. The chat service may not function properly.');
  } else {
    logger.info(`${enabledProviders} AI provider(s) configured successfully`);
  }

  return config;
}

/**
 * Get default provider configuration based on environment
 */
export function getDefaultProviderConfig(): ValidatedProviderConfig {
  return validateProviderConfig();
}