import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Circle } from 'lucide-react';

interface RealCliTerminalProps {
  terminalOutput: string;
  isRunning: boolean;
  onToggle?: () => void;
  isCollapsed?: boolean;
}

export function RealCliTerminal({ 
  terminalOutput, 
  isRunning, 
  onToggle, 
  isCollapsed = false 
}: RealCliTerminalProps) {
  const terminalRef = useRef<HTMLPreElement>(null);
  const [localCollapsed, setLocalCollapsed] = useState(isCollapsed);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (terminalRef.current && !localCollapsed) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput, localCollapsed]);

  const handleToggle = () => {
    setLocalCollapsed(!localCollapsed);
    onToggle?.();
  };

  return (
    <div className="border-t border-border bg-background">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Circle 
              className={`w-2 h-2 ${isRunning ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'}`} 
            />
            <span className="text-sm font-medium">Expo CLI</span>
          </div>
          {isRunning && (
            <span className="text-xs text-muted-foreground">Running</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggle}
            className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {localCollapsed ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Show Terminal
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Hide Terminal
              </>
            )}
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      {!localCollapsed && (
        <div className="h-64 bg-black text-green-400 font-mono text-sm overflow-hidden">
          <pre
            ref={terminalRef}
            className="h-full p-4 overflow-auto whitespace-pre-wrap break-words"
            style={{
              fontFamily: 'Consolas, "Courier New", monospace',
              fontSize: '12px',
              lineHeight: '1.4'
            }}
          >
            {terminalOutput || (
              <span className="text-gray-500">
                {isRunning 
                  ? "Starting Expo CLI..." 
                  : "Terminal output will appear here when Expo starts..."
                }
              </span>
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
