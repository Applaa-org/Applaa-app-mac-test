import React from 'react';
import { Sparkles, Crown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/useSettings';

interface SparkProGateProps {
  feature: 'edits' | 'context';
  children: React.ReactNode;
}

export function SparkProGate({ feature, children }: SparkProGateProps) {
  const { settings } = useSettings();
  
  const hasApplaaPro = settings?.enableApplaaPro === true;
  const hasProKey = !!settings?.providerSettings?.auto?.apiKey?.value;
  
  const featureEnabled = feature === 'edits' 
    ? settings?.enableProLazyEditsMode === true
    : settings?.enableProSmartFilesContextMode === true;
  
  // If Pro is enabled and feature is enabled, show the children
  if (hasApplaaPro && featureEnabled) {
    return <>{children}</>;
  }
  
  // If no Pro key at all, show upgrade message
  if (!hasProKey) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <Crown className="h-4 w-4 text-amber-600" />
        <span className="text-sm text-amber-800 dark:text-amber-200 flex-1">
          <strong>Spark {feature === 'edits' ? 'Edits' : 'Context'}</strong> requires Applaa Pro
        </span>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => window.location.hash = '/settings/providers/auto'}
          className="border-amber-300 text-amber-700 hover:bg-amber-100"
        >
          <Zap className="h-3 w-3 mr-1" />
          Upgrade
        </Button>
      </div>
    );
  }
  
  // If has Pro key but Pro is disabled, show enable message
  if (!hasApplaaPro) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <Sparkles className="h-4 w-4 text-purple-600" />
        <span className="text-sm text-purple-800 dark:text-purple-200 flex-1">
          Enable Applaa Pro to use <strong>Spark {feature === 'edits' ? 'Edits' : 'Context'}</strong>
        </span>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => window.location.hash = '/settings/providers/auto'}
          className="border-purple-300 text-purple-700 hover:bg-purple-100"
        >
          Enable Pro
        </Button>
      </div>
    );
  }
  
  // If Pro is enabled but feature is disabled, show feature enable message
  return (
    <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 rounded-lg border border-gray-200 dark:border-gray-700">
      <Sparkles className="h-4 w-4 text-gray-600" />
      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
        <strong>Spark {feature === 'edits' ? 'Edits' : 'Context'}</strong> is disabled
      </span>
      <Button 
        size="sm" 
        variant="outline" 
        onClick={() => {
          // Open the Pro mode selector (you might need to implement this)
          // For now, just navigate to settings
          window.location.hash = '/settings/providers/auto';
        }}
        className="border-gray-300 text-gray-700 hover:bg-gray-100"
      >
        Enable
      </Button>
    </div>
  );
}
