import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';
import { cn } from '@/lib/utils';

interface AppNamingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPrompt: string;
  onNameSelected: (name: string) => void;
}

export function AppNamingDialog({ 
  open, 
  onOpenChange, 
  userPrompt, 
  onNameSelected 
}: AppNamingDialogProps) {
  const [customName, setCustomName] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [nameExists, setNameExists] = useState(false);
  const [suggestedName, setSuggestedName] = useState('');

  const handleContinue = () => {
    const finalName = customName.trim() || 'My App';
    onNameSelected(finalName);
    onOpenChange(false);
  };

  const handleCustomNameChange = (value: string) => {
    setCustomName(value);
    setNameExists(false); // Reset validation state when typing
    setSuggestedName('');
  };


  // No auto-generated name suggestions

  // Real-time name validation
  useEffect(() => {
    const validateName = async () => {
      if (!customName.trim() || customName.length < 2) {
        setNameExists(false);
        setSuggestedName('');
        return;
      }

      setIsValidating(true);
      try {
        const normalizedName = customName.toLowerCase().replace(/\s+/g, '-');
        const result = await IpcClient.getInstance().checkAppName({ appName: normalizedName });
        
        if (result.exists) {
          setNameExists(true);
          // Generate a suggested alternative
          let counter = 2;
          let suggestion = `${normalizedName}-${counter}`;
          while (counter <= 5) {
            const suggestionResult = await IpcClient.getInstance().checkAppName({ appName: suggestion });
            if (!suggestionResult.exists) {
              setSuggestedName(suggestion);
              break;
            }
            counter++;
            suggestion = `${normalizedName}-${counter}`;
          }
        } else {
          setNameExists(false);
          setSuggestedName('');
        }
      } catch (error) {
        console.error('Error validating app name:', error);
      } finally {
        setIsValidating(false);
      }
    };

    const debounceTimer = setTimeout(validateName, 500);
    return () => clearTimeout(debounceTimer);
  }, [customName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Give your app a name
          </DialogTitle>
          <DialogDescription>
            Enter a name for your new app
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* App Name Input */}
          <div className="space-y-2">
            <Label htmlFor="app-name">App Name</Label>
            <div className="relative">
              <Input
                id="app-name"
                value={customName}
                onChange={(e) => handleCustomNameChange(e.target.value)}
                placeholder="Enter app name..."
                className={cn(
                  "w-full pr-10",
                  nameExists && "border-red-500 focus:border-red-500",
                  customName && !nameExists && !isValidating && "border-green-500 focus:border-green-500"
                )}
                autoFocus
              />
              {/* Validation Icon */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValidating && (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                )}
                {!isValidating && customName && nameExists && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                {!isValidating && customName && !nameExists && customName.length >= 2 && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </div>
            </div>
            
            {/* Validation Messages */}
            {nameExists && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-red-700 font-medium">Name already exists</p>
                  <p className="text-red-600">An app with this name already exists in your workspace.</p>
                  {suggestedName && (
                    <button
                      onClick={() => setCustomName(suggestedName)}
                      className="mt-1 text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      Try "{suggestedName}" instead
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {!nameExists && customName && customName.length >= 2 && !isValidating && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Name is available
              </div>
            )}
          </div>

          {/* Preview */}
          {customName && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Preview:</div>
              <div className="font-medium">{customName}</div>
              <div className="text-xs text-muted-foreground">
                {customName.toLowerCase().replace(/\s+/g, '-')}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={nameExists || isValidating || !customName.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
