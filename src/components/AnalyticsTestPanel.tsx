import React, { useState, useEffect } from 'react';
import { IpcClient } from '../ipc/ipc_client';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface AnalyticsStatus {
  hasGA4: boolean;
  hasSentry: boolean;
  isInitialized: boolean;
  ga4MeasurementId?: string;
  sentryDsn?: string;
  environment: string;
}

export function AnalyticsTestPanel() {
  const [status, setStatus] = useState<AnalyticsStatus | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const ipcClient = IpcClient.getInstance();
      
      // Get config status
      const statusResult = await ipcClient.analyticsGetConfigStatus();
      if (statusResult.success && statusResult.status) {
        setStatus(statusResult.status);
      }
      
      // Check initialization
      const initResult = await ipcClient.analyticsIsInitialized();
      if (initResult.success) {
        setIsInitialized(initResult.initialized);
      }
    } catch (error) {
      console.error('Failed to load analytics status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const testTrackEvent = async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.analyticsTrackEvent({
        eventName: 'test_event',
        eventData: {
          test: true,
          timestamp: Date.now(),
          source: 'analytics_test_panel',
        },
      });
      
      if (result.success) {
        setLastEvent(`✅ Event tracked successfully at ${new Date().toLocaleTimeString()}`);
        setTimeout(() => setLastEvent(null), 3000);
      } else {
        setLastEvent(`❌ Failed: ${result.error}`);
        setTimeout(() => setLastEvent(null), 3000);
      }
    } catch (error: any) {
      setLastEvent(`❌ Error: ${error.message}`);
      setTimeout(() => setLastEvent(null), 3000);
    }
  };

  const testAppCreationEvent = async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.analyticsAppCreationStarted({
        appType: 'test',
        template: 'react',
      });
      
      if (result.success) {
        setLastEvent(`✅ App creation event tracked at ${new Date().toLocaleTimeString()}`);
        setTimeout(() => setLastEvent(null), 3000);
      } else {
        setLastEvent(`❌ Failed: ${result.error}`);
        setTimeout(() => setLastEvent(null), 3000);
      }
    } catch (error: any) {
      setLastEvent(`❌ Error: ${error.message}`);
      setTimeout(() => setLastEvent(null), 3000);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Analytics Test Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button onClick={loadStatus} disabled={loading} size="sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh Status'}
          </Button>
        </div>

        {status && (
          <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">Configuration Status</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                {status.hasGA4 ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-400" />
                )}
                <span>GA4 Configured</span>
              </div>
              <div className="flex items-center gap-2">
                {status.hasSentry ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-400" />
                )}
                <span>Sentry Configured</span>
              </div>
              <div className="flex items-center gap-2">
                {isInitialized ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-yellow-500" />
                )}
                <span>Initialized</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Environment: {status.environment}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="font-semibold">Test Events</h3>
          <div className="flex gap-2">
            <Button onClick={testTrackEvent} variant="outline" size="sm">
              Test Generic Event
            </Button>
            <Button onClick={testAppCreationEvent} variant="outline" size="sm">
              Test App Creation Event
            </Button>
          </div>
          {lastEvent && (
            <p className="text-sm text-gray-600 mt-2">{lastEvent}</p>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>💡 Note: Events will only be tracked if:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Analytics handlers are registered (✅ Done)</li>
            <li>User has given consent (check Privacy Settings)</li>
            <li>Environment variables are set (GA4_MEASUREMENT_ID or SENTRY_DSN)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

