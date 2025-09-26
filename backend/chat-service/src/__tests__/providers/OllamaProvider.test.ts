import axios from 'axios';
import { OllamaProvider } from '../../providers/OllamaProvider';
import { ChatMessage } from '../../providers/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    provider = new OllamaProvider('http://localhost:11434');
    jest.clearAllMocks();
  });

  describe('getName', () => {
    it('should return "ollama"', () => {
      expect(provider.getName()).toBe('ollama');
    });
  });

  describe('isHealthy', () => {
    it('should return true when service is available', async () => {
      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({ status: 200 })
      } as any);

      const isHealthy = await provider.isHealthy();
      expect(isHealthy).toBe(true);
    });

    it('should return false when service is unavailable', async () => {
      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Connection failed'))
      } as any);

      const isHealthy = await provider.isHealthy();
      expect(isHealthy).toBe(false);
    });
  });

  describe('getAvailableModels', () => {
    it('should return formatted models list', async () => {
      const mockResponse = {
        data: {
          models: [
            {
              name: 'llama2:7b',
              size: 3825819519,
              modified_at: '2023-10-01T00:00:00Z',
              digest: 'sha256:123',
              details: {
                format: 'gguf',
                family: 'llama',
                parameter_size: '7B',
                quantization_level: 'Q4_0'
              }
            }
          ]
        }
      };

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const models = await provider.getAvailableModels();
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('llama2:7b');
      expect(models[0].name).toBe('Llama 2');
      expect(models[0].size).toBe('3.56 GB');
    });

    it('should return empty array on error', async () => {
      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('API Error'))
      } as any);

      const models = await provider.getAvailableModels();
      expect(models).toEqual([]);
    });
  });

  describe('chat', () => {
    it('should return formatted chat response', async () => {
      const mockResponse = {
        data: {
          message: { content: 'Hello, world!' },
          model: 'llama2:7b',
          prompt_eval_count: 10,
          eval_count: 5
        }
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      const response = await provider.chat(messages, {
        model: 'llama2:7b',
        temperature: 0.7
      });

      expect(response.content).toBe('Hello, world!');
      expect(response.provider).toBe('ollama');
      expect(response.tokens?.input).toBe(10);
      expect(response.tokens?.output).toBe(5);
    });

    it('should sanitize error messages for security', async () => {
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue({
          isAxiosError: true,
          response: { status: 404 }
        })
      } as any);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      await expect(provider.chat(messages, { model: 'unknown-model' }))
        .rejects
        .toThrow('Model not available');
    });

    it('should handle generic errors with sanitized messages', async () => {
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue({
          isAxiosError: true,
          response: { status: 500 }
        })
      } as any);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      await expect(provider.chat(messages, { model: 'llama2:7b' }))
        .rejects
        .toThrow('Service temporarily unavailable');
    });
  });

  describe('hasModel', () => {
    it('should return true if model exists', async () => {
      const mockResponse = {
        data: {
          models: [
            { name: 'llama2:7b', size: 100, modified_at: '', digest: '' }
          ]
        }
      };

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const hasModel = await provider.hasModel('llama2:7b');
      expect(hasModel).toBe(true);
    });

    it('should return false if model does not exist', async () => {
      const mockResponse = { data: { models: [] } };

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const hasModel = await provider.hasModel('unknown-model');
      expect(hasModel).toBe(false);
    });
  });
});