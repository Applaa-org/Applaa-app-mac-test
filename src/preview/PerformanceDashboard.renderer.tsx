import React, { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { PerformanceDashboard, PerformanceMetrics, SystemAlert, PerformanceTrend } from './PerformanceDashboard';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

interface PerformanceDashboardRendererProps {
  dashboard: PerformanceDashboard;
  className?: string;
}

interface DashboardState {
  metrics: PerformanceMetrics | null;
  alerts: SystemAlert[];
  trends: Map<string, PerformanceTrend>;
  healthScore: number;
  isRunning: boolean;
}

export const PerformanceDashboardRenderer: React.FC<PerformanceDashboardRendererProps> = ({
  dashboard,
  className = ''
}) => {
  const [state, setState] = useState<DashboardState>({
    metrics: null,
    alerts: [],
    trends: new Map(),
    healthScore: 100,
    isRunning: false
  });
  
  const [selectedTab, setSelectedTab] = useState<'overview' | 'performance' | 'resources' | 'alerts'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update dashboard state
  const updateState = () => {
    const metrics = dashboard.getCurrentMetrics();
    const alerts = dashboard.getActiveAlerts();
    const trends = dashboard.getPerformanceTrends();
    const healthScore = dashboard.getSystemHealthScore();
    const status = dashboard.getStatus();
    
    setState({
      metrics,
      alerts,
      trends,
      healthScore,
      isRunning: status.isRunning
    });
  };

  useEffect(() => {
    // Initial state update
    updateState();

    // Set up event listeners
    const handleMetricsUpdate = () => updateState();
    const handleAlertCreated = () => updateState();
    const handleAlertResolved = () => updateState();

    dashboard.on('metrics:collected', handleMetricsUpdate);
    dashboard.on('alert:created', handleAlertCreated);
    dashboard.on('alert:resolved', handleAlertResolved);

    // Set up auto-refresh
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(updateState, 1000);
    }

    return () => {
      dashboard.off('metrics:collected', handleMetricsUpdate);
      dashboard.off('alert:created', handleAlertCreated);
      dashboard.off('alert:resolved', handleAlertResolved);
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [dashboard, autoRefresh]);

  // Control functions
  const handleStart = () => {
    dashboard.start();
    updateState();
  };

  const handleStop = () => {
    dashboard.stop();
    updateState();
  };

  const handleReset = () => {
    dashboard.reset();
    updateState();
  };

  const handleResolveAlert = (alertId: string) => {
    dashboard.resolveAlert(alertId);
    updateState();
  };

  // Chart data preparation
  const getResourceChartData = () => {
    if (!state.metrics) return null;

    const cpuPercent = (state.metrics.cpu.usage / state.metrics.cpu.total) * 100;
    const memoryPercent = (state.metrics.memory.usage / state.metrics.memory.total) * 100;

    return {
      labels: ['CPU Usage', 'Memory Usage'],
      datasets: [
        {
          data: [cpuPercent, memoryPercent],
          backgroundColor: [
            cpuPercent > 80 ? '#ef4444' : cpuPercent > 60 ? '#f59e0b' : '#10b981',
            memoryPercent > 80 ? '#ef4444' : memoryPercent > 60 ? '#f59e0b' : '#10b981'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    };
  };

  const getPerformanceTrendData = (metricName: string) => {
    const trend = state.trends.get(metricName);
    if (!trend) return null;

    return {
      labels: trend.timestamps.map(ts => new Date(ts).toLocaleTimeString()),
      datasets: [
        {
          label: metricName.replace('_', ' ').toUpperCase(),
          data: trend.values,
          borderColor: trend.trend === 'up' ? '#ef4444' : trend.trend === 'down' ? '#10b981' : '#6b7280',
          backgroundColor: trend.trend === 'up' ? '#fef2f2' : trend.trend === 'down' ? '#f0fdf4' : '#f9fafb',
          tension: 0.4,
          fill: true
        }
      ]
    };
  };

  const getAppStateData = () => {
    if (!state.metrics) return null;

    return {
      labels: ['Active', 'Suspended', 'Loading'],
      datasets: [
        {
          label: 'Apps by State',
          data: [state.metrics.apps.active, state.metrics.apps.suspended, state.metrics.apps.loading],
          backgroundColor: ['#10b981', '#f59e0b', '#3b82f6'],
          borderWidth: 1
        }
      ]
    };
  };

  // Health score color
  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  // Alert type styling
  const getAlertStyle = (type: SystemAlert['type']) => {
    switch (type) {
      case 'error': return 'bg-red-100 border-red-400 text-red-700';
      case 'warning': return 'bg-yellow-100 border-yellow-400 text-yellow-700';
      case 'info': return 'bg-blue-100 border-blue-400 text-blue-700';
      default: return 'bg-gray-100 border-gray-400 text-gray-700';
    }
  };

  return (
    <div className={`performance-dashboard bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
            <p className="text-sm text-gray-600 mt-1">
              Real-time monitoring of the enhanced preview system
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Health Score */}
            <div className="text-center">
              <div className={`text-3xl font-bold ${getHealthScoreColor(state.healthScore)}`}>
                {state.healthScore}%
              </div>
              <div className="text-xs text-gray-500">Health Score</div>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${state.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">
                {state.isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
            
            {/* Controls */}
            <div className="flex space-x-2">
              <button
                onClick={state.isRunning ? handleStop : handleStart}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  state.isRunning
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {state.isRunning ? 'Stop' : 'Start'}
              </button>
              
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Reset
              </button>
              
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  autoRefresh
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                Auto Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {(['overview', 'performance', 'resources', 'alerts'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                selectedTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
              {tab === 'alerts' && state.alerts.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">
                  {state.alerts.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {selectedTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* System Resources */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">System Resources</h3>
              {getResourceChartData() && (
                <div className="h-64">
                  <Doughnut
                    data={getResourceChartData()!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* App States */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">App States</h3>
              {getAppStateData() && (
                <div className="h-64">
                  <Bar
                    data={getAppStateData()!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Key Metrics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
              {state.metrics && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Cache Hit Rate</span>
                    <span className="font-semibold">{state.metrics.cache.hitRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Response Time</span>
                    <span className="font-semibold">{state.metrics.performance.avgResponseTime}ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Throughput</span>
                    <span className="font-semibold">{state.metrics.performance.throughput.toFixed(1)} req/s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Error Rate</span>
                    <span className="font-semibold">{state.metrics.performance.errorRate.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Apps</span>
                    <span className="font-semibold">{state.metrics.apps.total}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'performance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CPU Usage Trend */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">CPU Usage Trend</h3>
              {getPerformanceTrendData('cpu_usage') && (
                <div className="h-64">
                  <Line
                    data={getPerformanceTrendData('cpu_usage')!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Memory Usage Trend */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Memory Usage Trend</h3>
              {getPerformanceTrendData('memory_usage') && (
                <div className="h-64">
                  <Line
                    data={getPerformanceTrendData('memory_usage')!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Response Time Trend */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Response Time Trend</h3>
              {getPerformanceTrendData('response_time') && (
                <div className="h-64">
                  <Line
                    data={getPerformanceTrendData('response_time')!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Cache Hit Rate Trend */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Cache Hit Rate Trend</h3>
              {getPerformanceTrendData('cache_hit_rate') && (
                <div className="h-64">
                  <Line
                    data={getPerformanceTrendData('cache_hit_rate')!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'resources' && (
          <div className="space-y-6">
            {state.metrics && (
              <>
                {/* Resource Usage Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-2">CPU Usage</h4>
                    <div className="text-3xl font-bold text-blue-600">
                      {((state.metrics.cpu.usage / state.metrics.cpu.total) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {state.metrics.cpu.usage.toFixed(1)} / {state.metrics.cpu.total.toFixed(1)} cores
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-2">Memory Usage</h4>
                    <div className="text-3xl font-bold text-green-600">
                      {((state.metrics.memory.usage / state.metrics.memory.total) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {(state.metrics.memory.usage / 1024 / 1024).toFixed(1)} / {(state.metrics.memory.total / 1024 / 1024).toFixed(1)} MB
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-2">Cache Efficiency</h4>
                    <div className="text-3xl font-bold text-purple-600">
                      {state.metrics.cache.hitRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {state.metrics.cache.totalEntries} entries, {state.metrics.cache.evictionCount} evictions
                    </div>
                  </div>
                </div>

                {/* App Resource Allocation */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold mb-4">App Resource Allocation</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{state.metrics.apps.active}</div>
                      <div className="text-sm text-gray-600">Active Apps</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{state.metrics.apps.suspended}</div>
                      <div className="text-sm text-gray-600">Suspended Apps</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{state.metrics.apps.loading}</div>
                      <div className="text-sm text-gray-600">Loading Apps</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">{state.metrics.apps.total}</div>
                      <div className="text-sm text-gray-600">Total Apps</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {selectedTab === 'alerts' && (
          <div className="space-y-4">
            {state.alerts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg">No active alerts</div>
                <div className="text-gray-500 text-sm mt-2">System is running smoothly</div>
              </div>
            ) : (
              state.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border-l-4 p-4 rounded-md ${getAlertStyle(alert.type)}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium capitalize">{alert.type}</div>
                      <div className="text-sm mt-1">{alert.message}</div>
                      <div className="text-xs mt-2 opacity-75">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="ml-4 px-3 py-1 bg-white bg-opacity-20 rounded-md text-sm hover:bg-opacity-30 transition-colors"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceDashboardRenderer;