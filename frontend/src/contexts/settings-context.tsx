'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { chatClient } from '@/lib/api-client';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
  size?: string;
  capabilities?: string[];
}

export interface AIProvider {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  models: AIModel[];
}

export interface ModelsResponse {
  providers: AIProvider[];
}

// Fallback models in case API is unavailable
const FALLBACK_MODELS: AIModel[] = [
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    description: 'Fast and efficient model for most tasks'
  },
  {
    id: 'llama2',
    name: 'Llama 2',
    provider: 'ollama',
    description: 'Meta\'s open source language model'
  },
  {
    id: 'mistral',
    name: 'Mistral',
    provider: 'ollama',
    description: 'Efficient open source model'
  }
];

// Fallback providers in case API is unavailable
const FALLBACK_PROVIDERS: AIProvider[] = [
  {
    name: 'openai',
    status: 'unknown',
    models: [
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        description: 'Fast and efficient model for most tasks'
      }
    ]
  },
  {
    name: 'ollama',
    status: 'unknown',
    models: [
      {
        id: 'llama2',
        name: 'Llama 2',
        provider: 'ollama',
        description: 'Meta\'s open source language model'
      },
      {
        id: 'mistral',
        name: 'Mistral',
        provider: 'ollama',
        description: 'Efficient open source model'
      }
    ]
  }
];

interface SettingsContextType {
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  availableModels: AIModel[];
  providers: AIProvider[];
  isLoading: boolean;
  refreshModels: () => Promise<void>;
  error: string | null;
  hasTriedFetchingModels: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModelState] = useState<AIModel>(FALLBACK_MODELS[0]);
  const [availableModels, setAvailableModels] = useState<AIModel[]>(FALLBACK_MODELS);
  const [providers, setProviders] = useState<AIProvider[]>(FALLBACK_PROVIDERS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasTriedFetchingModels, setHasTriedFetchingModels] = useState(false);

  const fetchModels = async () => {
    setHasTriedFetchingModels(true);
    try {
      const response = await chatClient.get('/models');
      const data: ModelsResponse = response.data;

      // Flatten all models from all providers
      const allModels: AIModel[] = data.providers.flatMap(provider =>
        provider.models.map(model => ({
          ...model,
          provider: provider.name,
        }))
      );

      setProviders(data.providers);
      setAvailableModels(allModels.length > 0 ? allModels : FALLBACK_MODELS);
      setError(null);
    } catch (err) {
      console.error('Error fetching models:', err);
      setError('Failed to fetch available models');
      setAvailableModels(FALLBACK_MODELS);
      setProviders(FALLBACK_PROVIDERS);
    }
  };

  const refreshModels = async () => {
    setIsLoading(true);
    await fetchModels();
    setIsLoading(false);
  };

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);

      // Only fetch models if user has a token (is authenticated)
      const token = localStorage.getItem('token');
      if (token) {
        await fetchModels();
      }

      // Load saved model preference
      try {
        const savedModelId = localStorage.getItem('ai-model-preference');
        const savedProvider = localStorage.getItem('ai-provider-preference');

        if (savedModelId && savedProvider) {
          // Wait a bit for models to be set
          setTimeout(() => {
            setAvailableModels(current => {
              const model = current.find(m =>
                m.id === savedModelId && m.provider === savedProvider
              );
              if (model) {
                setSelectedModelState(model);
              }
              return current;
            });
          }, 100);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }

      setIsLoading(false);
    };

    loadSettings();
  }, []);

  const setSelectedModel = (model: AIModel) => {
    try {
      localStorage.setItem('ai-model-preference', model.id);
      localStorage.setItem('ai-provider-preference', model.provider);
      setSelectedModelState(model);
    } catch (error) {
      console.error('Error saving model preference:', error);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        selectedModel,
        setSelectedModel,
        availableModels,
        providers,
        isLoading,
        refreshModels,
        error,
        hasTriedFetchingModels,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}