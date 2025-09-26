import OpenAI from 'openai';
import { IModelProvider } from './IModelProvider';
import { ChatMessage, ChatResponse, ChatOptions, ModelInfo, ProviderStatus } from './types';
import { logger } from '@smart-home/shared';

export class OpenAIProvider implements IModelProvider {
  private client: OpenAI;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new OpenAI({ apiKey });
  }

  getName(): string {
    return 'openai';
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Try to list models to check if API key is valid
      await this.client.models.list();
      return true;
    } catch (error) {
      logger.error('OpenAI health check failed:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    // Return only the 3 most popular models instead of calling the API
    // This keeps the UI manageable and focuses on the models users actually want
    return this.getDefaultModels();
  }

  async getStatus(): Promise<ProviderStatus> {
    const isHealthy = await this.isHealthy();
    const models = await this.getAvailableModels();

    return {
      name: this.getName(),
      status: isHealthy ? 'healthy' : 'unhealthy',
      models,
      lastChecked: new Date(),
      error: isHealthy ? undefined : 'API key invalid or service unreachable'
    };
  }

  async chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 500,
        stream: false
      });

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No response content received from OpenAI');
      }

      return {
        content: choice.message.content,
        model: options.model,
        provider: this.getName(),
        tokens: {
          input: response.usage?.prompt_tokens || 0,
          output: response.usage?.completion_tokens || 0
        }
      };
    } catch (error) {
      logger.error('OpenAI chat error:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`OpenAI chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async hasModel(modelId: string): Promise<boolean> {
    const models = await this.getAvailableModels();
    return models.some(model => model.id === modelId);
  }

  private getModelDisplayName(modelId: string): string {
    const displayNames: Record<string, string> = {
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'gpt-4': 'GPT-4',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini'
    };
    return displayNames[modelId] || modelId;
  }

  private getModelDescription(modelId: string): string {
    const descriptions: Record<string, string> = {
      'gpt-3.5-turbo': 'Fast and cost-effective for most tasks',
      'gpt-4': 'Most capable model, slower and more expensive',
      'gpt-4-turbo': 'Enhanced GPT-4 with improved speed',
      'gpt-4o': 'Latest multimodal model with improved performance',
      'gpt-4o-mini': 'Smaller, faster version of GPT-4o'
    };
    return descriptions[modelId] || 'OpenAI language model';
  }

  private getModelCapabilities(modelId: string): string[] {
    const capabilities = ['text-generation', 'conversation'];
    if (modelId.includes('4')) {
      capabilities.push('complex-reasoning', 'code-generation');
    }
    if (modelId.includes('4o')) {
      capabilities.push('multimodal');
    }
    return capabilities;
  }

  private getDefaultModels(): ModelInfo[] {
    return [
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective for most tasks',
        capabilities: ['text-generation', 'conversation']
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Most capable model, slower and more expensive',
        capabilities: ['text-generation', 'conversation', 'complex-reasoning', 'code-generation']
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Enhanced GPT-4 with improved speed',
        capabilities: ['text-generation', 'conversation', 'complex-reasoning', 'code-generation']
      }
    ];
  }
}