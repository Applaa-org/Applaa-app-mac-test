import React, { useState, ReactNode } from 'react';
import { ChromeDevToolsProvider } from './ChromeDevToolsProvider';
import { ChromeDevToolsPanel } from './ChromeDevToolsPanel';
import { ChromeDevToolsToggle } from './ChromeDevToolsToggle';

interface PreviewWithDevToolsProps {
  children: ReactNode;
  previewUrl?: string;
  devToolsEnabled?: boolean;
  className?: string;
  showDevToolsToggle?: boolean;
  defaultDevToolsOpen?: boolean;
}

export function PreviewWithDevTools({
  children,
  previewUrl,
  devToolsEnabled = true,
  className = '',
  showDevToolsToggle = true,
  defaultDevToolsOpen = false
}: PreviewWithDevToolsProps) {
  const [showDevTools, setShowDevTools] = useState(defaultDevToolsOpen);

  return (
    <ChromeDevToolsProvider previewUrl={previewUrl} enabled={devToolsEnabled}>
      <div className={`flex flex-col h-full ${className}`}>
        {/* Preview Content */}
        <div className="flex-1 relative">
          {children}
        </div>

        {/* DevTools Toggle (if enabled) */}
        {showDevToolsToggle && devToolsEnabled && (
          <div className="absolute top-4 right-4 z-10">
            <ChromeDevToolsToggle
              isOpen={showDevTools}
              onToggle={setShowDevTools}
              className="bg-white/90 backdrop-blur-sm shadow-lg"
            />
          </div>
        )}

        {/* DevTools Panel */}
        {showDevTools && devToolsEnabled && (
          <ChromeDevToolsPanel className="border-t border-gray-200 dark:border-gray-700" />
        )}
      </div>
    </ChromeDevToolsProvider>
  );
}
