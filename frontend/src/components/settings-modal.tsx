'use client';

import { useState, useEffect } from 'react';
import { useSettings, AIModel } from '@/contexts/settings-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { selectedModel, setSelectedModel, availableModels, providers, refreshModels, error, isLoading, hasTriedFetchingModels } = useSettings();
  const [tempSelectedModel, setTempSelectedModel] = useState<AIModel>(selectedModel);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch models when modal opens if they haven't been fetched yet
  useEffect(() => {
    if (isOpen && !hasTriedFetchingModels) {
      refreshModels();
    }
  }, [isOpen, hasTriedFetchingModels, refreshModels]);

  const handleSave = () => {
    setSelectedModel(tempSelectedModel);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedModel(selectedModel);
    onClose();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshModels();
    setIsRefreshing(false);
  };

  // Group models by provider for better organization
  const modelsByProvider = availableModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  const getProviderStatus = (providerName: string) => {
    const provider = providers.find(p => p.name === providerName);
    return provider?.status || 'unknown';
  };

  const getProviderStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getProviderStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '🟢';
      case 'unhealthy': return '🔴';
      default: return '🟡';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>AI Model Settings</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-shrink-0 pb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">AI Model Selection</h4>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing || isLoading}
                    className="text-xs"
                  >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh available models from providers</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              Choose which AI model to use for conversations.
            </p>

            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="flex justify-center py-4">
                <p className="text-sm text-muted-foreground">Loading models...</p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            <RadioGroup
              value={`${tempSelectedModel.provider}:${tempSelectedModel.id}`}
              onValueChange={(value) => {
                const parts = value.split(':');
                const provider = parts[0];
                const modelId = parts.length > 2 ? parts.slice(1).join(':') : parts[1];
                const model = availableModels.find(m => m.id === modelId && m.provider === provider);
                if (model) setTempSelectedModel(model);
              }}
              className="space-y-4"
            >
              {Object.entries(modelsByProvider).map(([providerName, models]) => {
                const status = getProviderStatus(providerName);
                return (
                  <div key={providerName} className="space-y-3 pb-2">
                    <div className="flex items-center gap-2 pb-1 border-b border-gray-200">
                      <span className="text-sm">{getProviderStatusIcon(status)}</span>
                      <h5 className="text-sm font-semibold capitalize">{providerName}</h5>
                      <span className={`text-xs font-medium ${getProviderStatusColor(status)}`}>
                        ({status})
                      </span>
                    </div>
                    <div className="space-y-2 ml-1">
                      {models.map((model) => {
                        const radioValue = `${model.provider}:${model.id}`;
                        return (
                          <Tooltip key={radioValue}>
                            <TooltipTrigger asChild>
                              <div className="flex items-start space-x-3 cursor-help p-2 rounded hover:bg-gray-50">
                                <RadioGroupItem
                                  value={radioValue}
                                  id={radioValue}
                                  className="mt-1 flex-shrink-0"
                                  disabled={status === 'unhealthy'}
                                />
                                <Label htmlFor={radioValue} className="flex-1 cursor-pointer">
                                  <div className="font-medium text-sm">
                                    {model.name || model.id}
                                  </div>
                                  {model.size && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Size: {model.size}
                                    </div>
                                  )}
                                  {model.description && (
                                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                      {model.description}
                                    </div>
                                  )}
                                </Label>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="max-w-xs">
                                <p className="font-medium">{model.name || model.id}</p>
                                {model.description && (
                                  <p className="text-xs mt-1 text-muted-foreground">{model.description}</p>
                                )}
                                {model.capabilities && model.capabilities.length > 0 && (
                                  <p className="text-xs mt-2">
                                    <span className="font-medium">Capabilities:</span> {model.capabilities.join(', ')}
                                  </p>
                                )}
                                {status === 'unhealthy' && (
                                  <p className="text-xs mt-1 text-red-600">⚠️ Provider unavailable</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Discard changes and close settings</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="submit" onClick={handleSave}>
                Save changes
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Apply settings and close</p>
            </TooltipContent>
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}