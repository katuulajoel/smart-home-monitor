'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    description: 'Fast and efficient model for most tasks'
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    description: 'More capable model with better reasoning'
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    description: 'Latest GPT-4 model with improved performance'
  }
];

interface SettingsContextType {
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModelState] = useState<AIModel>(AVAILABLE_MODELS[0]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedModelId = localStorage.getItem('ai-model-preference');
        if (savedModelId) {
          const model = AVAILABLE_MODELS.find(m => m.id === savedModelId);
          if (model) {
            setSelectedModelState(model);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const setSelectedModel = (model: AIModel) => {
    try {
      localStorage.setItem('ai-model-preference', model.id);
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
        isLoading,
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