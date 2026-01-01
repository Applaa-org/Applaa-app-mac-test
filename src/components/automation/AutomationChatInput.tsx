import React, { useState, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutomationChatInputProps {
  onSubmit: (task: string) => void;
  disabled?: boolean;
}

export function AutomationChatInput({ onSubmit, disabled }: AutomationChatInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = () => {
    if (!inputValue.trim() || disabled) return;
    
    onSubmit(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter automation task... (e.g., 'Create a new React app')"
          disabled={disabled}
          rows={2}
          className="resize-none"
        />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={disabled || !inputValue.trim()}
        size="icon"
        className={cn(
          "shrink-0",
          disabled && "opacity-50"
        )}
      >
        {disabled ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

