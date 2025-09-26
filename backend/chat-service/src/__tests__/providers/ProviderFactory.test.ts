import { ProviderFactory, ProviderConfig } from '../../providers/ProviderFactory';
import { IModelProvider } from '../../providers/IModelProvider';

// Mock the providers to avoid actual network calls
jest.mock('../../providers/OpenAIProvider');
jest.mock('../../providers/OllamaProvider');

describe('ProviderFactory', () => {
  let factory: ProviderFactory;
  let config: ProviderConfig;

  beforeEach(() => {
    config = {
      openai: {
        apiKey: 'test-api-key',
        enabled: true
      },
      ollama: {
        baseUrl: 'http://localhost:11434',
        enabled: true
      }
    };
    factory = new ProviderFactory(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize providers based on configuration', () => {
      expect(factory.getProviderNames()).toContain('openai');
      expect(factory.getProviderNames()).toContain('ollama');
    });

    it('should not initialize disabled providers', () => {
      const disabledConfig: ProviderConfig = {
        openai: {
          apiKey: 'test-api-key',
          enabled: false
        },
        ollama: {
          baseUrl: 'http://localhost:11434',
          enabled: false
        }
      };
      
      const disabledFactory = new ProviderFactory(disabledConfig);
      expect(disabledFactory.getProviderNames()).toHaveLength(0);
    });

    it('should not initialize OpenAI provider without API key', () => {
      const noKeyConfig: ProviderConfig = {
        openai: {
          apiKey: '',
          enabled: true
        }
      };
      
      const noKeyFactory = new ProviderFactory(noKeyConfig);
      expect(noKeyFactory.getProviderNames()).not.toContain('openai');
    });
  });

  describe('getProvider', () => {
    it('should return provider by name', () => {
      const provider = factory.getProvider('openai');
      expect(provider).toBeDefined();
    });

    it('should return undefined for non-existent provider', () => {
      const provider = factory.getProvider('non-existent');
      expect(provider).toBeUndefined();
    });
  });

  describe('getAllProviders', () => {
    it('should return all initialized providers', () => {
      const providers = factory.getAllProviders();
      expect(providers).toHaveLength(2);
    });
  });

  describe('reloadProviders', () => {
    it('should clear existing providers and reinitialize', () => {
      const newConfig: ProviderConfig = {
        openai: {
          apiKey: 'new-api-key',
          enabled: true
        }
      };

      factory.reloadProviders(newConfig);
      const providers = factory.getProviderNames();
      expect(providers).toContain('openai');
      expect(providers).not.toContain('ollama');
    });
  });

  describe('getAllProviderStatuses', () => {
    it('should return status for all providers in parallel', async () => {
      // Mock provider status calls
      const mockProvider = {
        getName: jest.fn().mockReturnValue('test-provider'),
        getStatus: jest.fn().mockResolvedValue({
          name: 'test-provider',
          status: 'healthy',
          models: [],
          lastChecked: new Date()
        })
      } as unknown as IModelProvider;

      // Replace providers for testing
      (factory as any).providers = new Map([['test', mockProvider]]);

      const statuses = await factory.getAllProviderStatuses();
      expect(statuses).toHaveLength(1);
      expect(statuses[0].status).toBe('healthy');
    });

    it('should handle provider timeout', async () => {
      const slowProvider = {
        getName: jest.fn().mockReturnValue('slow-provider'),
        getStatus: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 15000)) // Longer than timeout
        )
      } as unknown as IModelProvider;

      (factory as any).providers = new Map([['slow', slowProvider]]);

      const statuses = await factory.getAllProviderStatuses();
      expect(statuses).toHaveLength(1);
      expect(statuses[0].status).toBe('unhealthy');
      expect(statuses[0].error).toContain('timeout');
    }, 12000);
  });
});