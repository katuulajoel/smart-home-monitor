import axios, { AxiosInstance } from 'axios';
import { IModelProvider } from './IModelProvider';
import { ChatMessage, ChatResponse, ChatOptions, ModelInfo, ProviderStatus } from './types';
import { logger } from '@smart-home/shared';

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

interface OllamaChatRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  stream: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaProvider implements IModelProvider {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 60000, // 60 seconds timeout for model responses
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  getName(): string {
    return 'ollama';
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/tags');
      return response.status === 200;
    } catch (error) {
      // Log more details to help with debugging
      if (axios.isAxiosError(error)) {
        logger.error('Ollama health check failed:', {
          code: error.code,
          message: error.message,
          baseURL: this.baseUrl,
          status: error.response?.status
        });
      } else {
        logger.error('Ollama health check failed:', error instanceof Error ? error.message : 'Unknown error');
      }
      return false;
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.client.get<OllamaTagsResponse>('/api/tags');

      return response.data.models.map(model => ({
        id: model.name,
        name: this.getModelDisplayName(model.name),
        size: this.formatModelSize(model.size),
        description: this.getModelDescription(model.name),
        capabilities: this.getModelCapabilities(model.name)
      }));
    } catch (error) {
      logger.error('Failed to fetch Ollama models:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  async getStatus(): Promise<ProviderStatus> {
    const isHealthy = await this.isHealthy();
    const models = isHealthy ? await this.getAvailableModels() : [];

    return {
      name: this.getName(),
      status: isHealthy ? 'healthy' : 'unhealthy',
      models,
      lastChecked: new Date(),
      error: isHealthy ? undefined : 'Ollama service unreachable'
    };
  }

  async chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse> {
    try {
      const requestBody: OllamaChatRequest = {
        model: options.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 500
        }
      };

      const response = await this.client.post<OllamaChatResponse>('/api/chat', requestBody);

      if (!response.data.message?.content) {
        throw new Error('No response content received from Ollama');
      }

      return {
        content: response.data.message.content,
        model: options.model,
        provider: this.getName(),
        tokens: {
          input: response.data.prompt_eval_count || 0,
          output: response.data.eval_count || 0
        }
      };
    } catch (error) {
      logger.error('Ollama chat error:', error instanceof Error ? error.message : 'Unknown error');

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Model not available`);
        }
        throw new Error(`Service temporarily unavailable`);
      }

      throw new Error(`Service temporarily unavailable`);
    }
  }

  async hasModel(modelId: string): Promise<boolean> {
    const models = await this.getAvailableModels();
    return models.some(model => model.id === modelId);
  }

  private formatModelSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  private getModelDisplayName(modelName: string): string {
    // Remove tag suffix (e.g., ":latest", ":7b") for display
    const baseName = modelName.split(':')[0];

    const displayNames: Record<string, string> = {
      'llama2': 'Llama 2',
      'llama3': 'Llama 3',
      'codellama': 'Code Llama',
      'mistral': 'Mistral',
      'mixtral': 'Mixtral',
      'neural-chat': 'Neural Chat',
      'starling-lm': 'Starling',
      'vicuna': 'Vicuna',
      'wizard-vicuna-uncensored': 'Wizard Vicuna',
      'orca-mini': 'Orca Mini',
      'phi': 'Phi',
      'qwen': 'Qwen',
      'gemma': 'Gemma'
    };

    return displayNames[baseName] || this.capitalizeWords(baseName);
  }

  private getModelDescription(modelName: string): string {
    const baseName = modelName.split(':')[0];

    const descriptions: Record<string, string> = {
      'llama2': 'Meta\'s Llama 2 language model',
      'llama3': 'Meta\'s latest Llama 3 language model',
      'codellama': 'Code-specialized version of Llama',
      'mistral': 'Mistral AI\'s efficient language model',
      'mixtral': 'Mistral\'s mixture of experts model',
      'neural-chat': 'Intel\'s neural chat model',
      'starling-lm': 'Starling reinforcement learning model',
      'vicuna': 'UC Berkeley\'s Vicuna model',
      'wizard-vicuna-uncensored': 'Uncensored version of Wizard Vicuna',
      'orca-mini': 'Microsoft\'s Orca Mini model',
      'phi': 'Microsoft\'s Phi small language model',
      'qwen': 'Alibaba\'s Qwen language model',
      'gemma': 'Google\'s Gemma language model'
    };

    return descriptions[baseName] || 'Local language model';
  }

  private getModelCapabilities(modelName: string): string[] {
    const baseName = modelName.split(':')[0];
    const capabilities = ['text-generation', 'conversation'];

    // Add specialized capabilities based on model type
    if (baseName.includes('code')) {
      capabilities.push('code-generation', 'programming');
    }

    if (['llama3', 'mixtral', 'qwen'].includes(baseName)) {
      capabilities.push('complex-reasoning');
    }

    if (['neural-chat', 'starling-lm', 'vicuna'].includes(baseName)) {
      capabilities.push('dialogue', 'instruction-following');
    }

    return capabilities;
  }

  private capitalizeWords(str: string): string {
    return str.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}