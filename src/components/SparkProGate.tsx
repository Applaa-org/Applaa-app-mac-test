import React from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';

interface SparkProGateProps {
  feature: 'edits' | 'context';
  children: React.ReactNode;
}

export function SparkProGate({ feature, children }: SparkProGateProps) {
  // ✅ DEPRECATED: Spark features were part of Applaa gateway infrastructure
  // Since we removed the gateway routing, Spark features are no longer available
  // This component now shows a deprecated message instead
  
  return (
    <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 rounded-lg border border-gray-200 dark:border-gray-700">
      <AlertCircle className="h-4 w-4 text-gray-600" />
      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
        <strong>Spark {feature === 'edits' ? 'Edits' : 'Context'}</strong> feature has been removed. Pro users now use their own API keys directly with providers.
      </span>
    </div>
  );
}
