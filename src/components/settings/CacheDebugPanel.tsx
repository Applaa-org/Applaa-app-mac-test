import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, AlertTriangle } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';

/**
 * Debug panel for cache management
 * This component helps users manually refresh their settings if cache issues persist
 */
export function CacheDebugPanel() {
  const { invalidateAllCaches, loading } = useSettings();

  const handleRefreshAllCaches = async () => {
    try {
      await invalidateAllCaches();
      toast.success('All caches refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh caches:', error);
      toast.error('Failed to refresh caches. Check console for details.');
    }
  };

  return (
    <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
          <AlertTriangle className="w-5 h-5" />
          Cache Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          If you're experiencing issues with AI provider settings not updating or appearing correctly, 
          try refreshing the cache below.
        </p>
        
        <div className="flex gap-2">
          <Button
            onClick={handleRefreshAllCaches}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900/30"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh All Caches
          </Button>
        </div>
        
        <div className="text-xs text-yellow-600 dark:text-yellow-400 space-y-1">
          <p><strong>What this does:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Clears main process settings cache</li>
            <li>Invalidates React Query caches</li>
            <li>Reloads settings from disk</li>
            <li>Refreshes provider data</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
