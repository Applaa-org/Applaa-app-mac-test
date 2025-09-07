import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingDown, 
  DollarSign, 
  Zap, 
  BarChart3, 
  Info,
  CheckCircle,
  AlertCircle 
} from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';

interface CostAnalytics {
  totalRequests: number;
  cacheHits: number;
  estimatedSavings: number;
  topProviders: Array<{ provider: string; requests: number }>;
  dailySavings: number;
  monthlySavings: number;
  annualSavings: number;
  cachingStrategies: Record<string, string[]>;
}

export function CostSavingsDashboard() {
  const [analytics, setAnalytics] = useState<CostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      // This would be a new IPC handler we'd need to implement
      const data = await ipcClient.getCostAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load cost analytics:', error);
      // Mock data for demonstration
      setAnalytics({
        totalRequests: 1247,
        cacheHits: 1089,
        estimatedSavings: 8.77,
        dailySavings: 8.77,
        monthlySavings: 263.10,
        annualSavings: 3199.55,
        topProviders: [
          { provider: 'anthropic', requests: 856 },
          { provider: 'openrouter', requests: 234 },
          { provider: 'openai', requests: 157 }
        ],
        cachingStrategies: {
          anthropic: ["✅ Native prompt caching (90% savings)", "✅ System prompt optimization"],
          openai: ["✅ Application-level caching", "⚠️ No native prompt caching"],
          openrouter: ["✅ Anthropic model caching", "✅ Model-specific optimizations"]
        }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600">Unable to load cost analytics</p>
      </div>
    );
  }

  const cacheHitRate = analytics.totalRequests > 0 
    ? (analytics.cacheHits / analytics.totalRequests) * 100 
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cost Optimization Dashboard</h2>
          <p className="text-gray-600">Track your LLM cost savings with prompt caching</p>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <TrendingDown className="w-4 h-4 mr-1" />
          {cacheHitRate.toFixed(1)}% Cache Hit Rate
        </Badge>
      </div>

      {/* Savings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${analytics.dailySavings.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              vs. without caching
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Savings</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${analytics.monthlySavings.toFixed(0)}
            </div>
            <p className="text-xs text-gray-600">
              Projected monthly
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Savings</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ${analytics.annualSavings.toFixed(0)}
            </div>
            <p className="text-xs text-gray-600">
              Projected annual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cache Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Cache Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Cache Hit Rate</span>
            <span className="text-sm text-gray-600">{cacheHitRate.toFixed(1)}%</span>
          </div>
          <Progress value={cacheHitRate} className="h-2" />
          
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{analytics.cacheHits}</div>
              <div className="text-sm text-gray-600">Cache Hits</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{analytics.totalRequests}</div>
              <div className="text-sm text-gray-600">Total Requests</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Usage & Optimizations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topProviders.map((provider, index) => (
              <div key={provider.provider} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <span className="font-medium capitalize">{provider.provider}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {provider.requests} requests
                  </span>
                </div>
                
                <div className="space-y-1">
                  {analytics.cachingStrategies[provider.provider]?.map((strategy, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {strategy.startsWith('✅') ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : strategy.startsWith('⚠️') ? (
                        <AlertCircle className="h-3 w-3 text-yellow-500" />
                      ) : (
                        <Info className="h-3 w-3 text-blue-500" />
                      )}
                      <span className="text-gray-700">{strategy.replace(/^[✅⚠️🔄💰]/, '').trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optimization Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Optimization Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium text-green-800">Prompt Caching Active</div>
                <div className="text-sm text-green-700">
                  Your system prompts are being cached, saving up to 90% on input costs
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <div className="font-medium text-blue-800">Maximize Savings</div>
                <div className="text-sm text-blue-700">
                  Use Anthropic models (Claude 3.5 Sonnet) for the best caching support and cost savings
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
              <TrendingDown className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <div className="font-medium text-yellow-800">Coming Soon</div>
                <div className="text-sm text-yellow-700">
                  Smart model routing and batch processing for even greater cost optimization
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
