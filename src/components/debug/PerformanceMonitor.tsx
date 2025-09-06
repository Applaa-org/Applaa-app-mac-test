import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IpcClient } from '@/ipc/ipc_client';
import { Activity, BarChart3, Clock, Trash2, RefreshCw } from 'lucide-react';

interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface PerformanceData {
  completed: PerformanceMetric[];
  active: PerformanceMetric[];
}

export function PerformanceMonitor() {
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    completed: [],
    active: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchPerformanceData = async () => {
    try {
      setIsLoading(true);
      const data = await IpcClient.getInstance().getPerformanceMetrics();
      setPerformanceData(data);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMetrics = async () => {
    try {
      await IpcClient.getInstance().clearPerformanceMetrics();
      await fetchPerformanceData();
    } catch (error) {
      console.error('Failed to clear metrics:', error);
    }
  };

  const logReport = async () => {
    try {
      await IpcClient.getInstance().logPerformanceReport();
    } catch (error) {
      console.error('Failed to log report:', error);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchPerformanceData, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getOperationColor = (operation: string) => {
    if (operation.includes('Template')) return 'bg-blue-500';
    if (operation.includes('Git')) return 'bg-green-500';
    if (operation.includes('Database')) return 'bg-purple-500';
    if (operation.includes('Chat')) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  const completedSorted = performanceData.completed
    .sort((a, b) => (b.duration || 0) - (a.duration || 0))
    .slice(0, 10);

  const totalTime = performanceData.completed.reduce(
    (sum, metric) => sum + (metric.duration || 0),
    0
  );

  const avgTime = performanceData.completed.length > 0 
    ? totalTime / performanceData.completed.length 
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Performance Monitor</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={fetchPerformanceData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={logReport}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Log Report
          </Button>
          <Button variant="destructive" size="sm" onClick={clearMetrics}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Operations</p>
                <p className="text-2xl font-bold">{performanceData.completed.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Active Operations</p>
                <p className="text-2xl font-bold">{performanceData.active.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Average Duration</p>
              <p className="text-2xl font-bold">{formatDuration(avgTime)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Time</p>
              <p className="text-2xl font-bold">{formatDuration(totalTime)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Operations */}
      {performanceData.active.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 animate-pulse text-green-500" />
              Active Operations ({performanceData.active.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {performanceData.active.map((metric, index) => {
                const elapsed = Date.now() - metric.startTime;
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getOperationColor(metric.operation)}`} />
                      <span className="font-medium">{metric.operation}</span>
                      {metric.metadata && (
                        <div className="flex gap-1">
                          {Object.entries(metric.metadata).map(([key, value]) => (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="animate-pulse">
                      {formatDuration(elapsed)} (running)
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Slowest Operations (Top 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {completedSorted.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-6">#{index + 1}</span>
                  <div className={`w-3 h-3 rounded-full ${getOperationColor(metric.operation)}`} />
                  <span className="font-medium">{metric.operation}</span>
                  {metric.metadata && (
                    <div className="flex gap-1">
                      {Object.entries(metric.metadata).map(([key, value]) => (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {key}: {String(value)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Badge variant="outline">
                  {formatDuration(metric.duration || 0)}
                </Badge>
              </div>
            ))}
            {completedSorted.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No completed operations yet. Create an app to see performance metrics!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

