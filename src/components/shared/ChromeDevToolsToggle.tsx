import React from 'react';
import { Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOptionalChromeDevTools } from './ChromeDevToolsProvider';

interface ChromeDevToolsToggleProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'outline' | 'default' | 'ghost';
}

export function ChromeDevToolsToggle({ 
  isOpen, 
  onToggle, 
  className = '',
  size = 'sm',
  variant = 'outline'
}: ChromeDevToolsToggleProps) {
  const devTools = useOptionalChromeDevTools();

  // If DevTools not available, don't render anything
  if (!devTools) {
    return null;
  }

  const { isConnected, hasErrors } = devTools;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => onToggle(!isOpen)}
      className={`${className} ${
        isOpen ? 'bg-blue-100 text-blue-700 border-blue-300' : ''
      } ${hasErrors ? 'border-red-300 text-red-600' : ''}`}
      title={isOpen ? 'Hide DevTools' : 'Show DevTools'}
    >
      <Terminal className="w-4 h-4 mr-1" />
      DevTools
      {hasErrors && (
        <span className="ml-1 w-2 h-2 bg-red-500 rounded-full" />
      )}
      {isConnected && !hasErrors && (
        <span className="ml-1 w-2 h-2 bg-green-500 rounded-full" />
      )}
    </Button>
  );
}
