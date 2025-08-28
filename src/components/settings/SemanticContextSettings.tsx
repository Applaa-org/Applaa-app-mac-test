import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import { 
  Sparkles, 
  Database, 
  Zap, 
  TrendingUp, 
  FileText, 
  Settings,
  RefreshCw,
  Info
} from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { useSemanticAnalytics, useIsAppIndexed, useSemanticFileCount, useIndexApp } from '../../hooks/useSemanticContext';
import { useAIFeatures } from '../../hooks/useAIFeatures';
import { useAtomValue } from 'jotai';
import { currentAppAtom } from '../../atoms/appAtoms';
import { cn } from '../../lib/utils';

export function SemanticContextSettings() {
  const { data: settings, updateSetting } = useSettings();
  const currentApp = useAtomValue(currentAppAtom);
  const { isInstalled: aiInstalled, isInstalling, installAIFeatures } = useAIFeatures();
  
  const semanticEnabled = settings?.semanticContextEnabled ?? true;
  const crossAppEnabled = settings?.semanticCrossAppEnabled ?? false;
  const autoIndexEnabled = settings?.semanticAutoIndexEnabled ?? true;

  const { data: isIndexed = false } = useIsAppIndexed(currentApp?.id || 0);
  const { data: fileCount = 0 } = useSemanticFileCount(currentApp?.id || 0);
  const { data: analytics } = useSemanticAnalytics(currentApp?.id);
  const indexApp = useIndexApp();

  const handleReindex = () => {
    if (currentApp) {
      indexApp.mutate({
        appId: currentApp.id,
        appPath: currentApp.path
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Semantic Context & Smart Suggestions
          </CardTitle>
          <CardDescription>
            AI-powered context suggestions that learn from your usage patterns to automatically 
            find the most relevant files for your queries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">Enable Smart Suggestions</div>
              <div className="text-sm text-gray-600">
                Get AI-powered file suggestions based on your query content
              </div>
            </div>
            <Switch
              checked={semanticEnabled}
              onCheckedChange={(checked) => updateSetting('semanticContextEnabled', checked)}
            />
          </div>

          <Separator />

          {/* Cross-App Search */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium flex items-center gap-2">
                Cross-App Context
                <Badge variant="secondary" className="text-xs">Beta</Badge>
              </div>
              <div className="text-sm text-gray-600">
                Include relevant files from other apps in suggestions
              </div>
            </div>
            <Switch
              checked={crossAppEnabled}
              onCheckedChange={(checked) => updateSetting('semanticCrossAppEnabled', checked)}
              disabled={!semanticEnabled}
            />
          </div>

          <Separator />

          {/* Auto-Indexing */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">Auto-Index New Files</div>
              <div className="text-sm text-gray-600">
                Automatically index files as you create and modify them
              </div>
            </div>
            <Switch
              checked={autoIndexEnabled}
              onCheckedChange={(checked) => updateSetting('semanticAutoIndexEnabled', checked)}
              disabled={!semanticEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Current App Status */}
      {currentApp && semanticEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-600" />
              Current App: {currentApp.name}
            </CardTitle>
            <CardDescription>
              Indexing status and statistics for the current app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isIndexed ? "bg-green-500" : "bg-gray-400"
                  )} />
                  <span className="text-sm font-medium">
                    {isIndexed ? 'Indexed' : 'Not Indexed'}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {isIndexed ? 'Ready for smart suggestions' : 'Index to enable suggestions'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">{fileCount} Files</span>
                </div>
                <div className="text-xs text-gray-600">
                  Indexed and searchable
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleReindex}
                disabled={indexApp.isPending || !currentApp}
                size="sm"
                variant={isIndexed ? "outline" : "default"}
              >
                <RefreshCw className={cn(
                  "h-4 w-4 mr-2",
                  indexApp.isPending && "animate-spin"
                )} />
                {isIndexed ? 'Re-index' : 'Index App'}
              </Button>

              {indexApp.isPending && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="animate-pulse">Indexing in progress...</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics */}
      {analytics && semanticEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Usage Analytics
            </CardTitle>
            <CardDescription>
              How smart suggestions are performing for you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.totalDocuments}
                </div>
                <div className="text-xs text-gray-600">Total Files</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(analytics.averageAcceptanceRate * 100)}%
                </div>
                <div className="text-xs text-gray-600">Acceptance Rate</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.totalUsage}
                </div>
                <div className="text-xs text-gray-600">Suggestions Used</div>
              </div>
            </div>

            {analytics.topFiles.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Most Helpful Files</div>
                <div className="space-y-1">
                  {analytics.topFiles.slice(0, 3).map((file: any, index: number) => (
                    <div key={file.file_path} className="flex items-center justify-between text-xs">
                      <span className="truncate flex-1">{file.file_path}</span>
                      <Badge variant="outline" className="ml-2">
                        {file.usage_count} uses
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Installation Notice */}
      {!aiInstalled && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-3 flex-1">
                <div className="font-medium text-amber-900">AI Features Available</div>
                <div className="text-sm text-amber-800">
                  Unlock intelligent context suggestions and semantic search by installing AI dependencies.
                </div>
                <Button 
                  onClick={installAIFeatures}
                  disabled={isInstalling}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isInstalling ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Installing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Install AI Features
                    </>
                  )}
                </Button>
                <div className="text-xs text-amber-700">
                  Or install manually: <code className="bg-amber-100 px-1 rounded">npm install @xenova/transformers</code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <div className="font-medium text-blue-900">Privacy & Local Processing</div>
              <div className="text-sm text-blue-800">
                All semantic analysis happens locally on your machine. Your code never leaves 
                your computer, and no data is sent to external services. The AI models run 
                entirely offline for complete privacy.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
