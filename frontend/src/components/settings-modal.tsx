'use client';

import { useState } from 'react';
import { useSettings, AVAILABLE_MODELS, AIModel } from '@/contexts/settings-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { selectedModel, setSelectedModel } = useSettings();
  const [tempSelectedModel, setTempSelectedModel] = useState<AIModel>(selectedModel);

  const handleSave = () => {
    setSelectedModel(tempSelectedModel);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedModel(selectedModel);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div>
            <h4 className="text-sm font-medium mb-2">AI Model</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Choose which AI model to use for your Ask AI conversations.
            </p>

            <RadioGroup 
              value={tempSelectedModel.id} 
              onValueChange={(value) => {
                const model = AVAILABLE_MODELS.find(m => m.id === value);
                if (model) setTempSelectedModel(model);
              }}
              className="space-y-3"
            >
              {AVAILABLE_MODELS.map((model) => (
                <Tooltip key={model.id}>
                  <TooltipTrigger asChild>
                    <div className="flex items-start space-x-3 cursor-help">
                      <RadioGroupItem value={model.id} id={model.id} className="mt-1" />
                      <Label htmlFor={model.id} className="flex-1 cursor-pointer">
                        <div className="font-medium">
                          {model.name}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          by {model.provider}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {model.description}
                        </div>
                      </Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Select {model.name} for AI conversations</p>
                    <p className="text-xs mt-1">{model.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
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