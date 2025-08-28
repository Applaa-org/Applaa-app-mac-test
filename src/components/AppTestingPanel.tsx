import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Play, Square, TestTube, CheckCircle, XCircle, Clock, Zap, RefreshCw } from "lucide-react";
import { usePlaywrightMCP } from "@/hooks/usePlaywrightMCP";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface AppTestingPanelProps {
  appId: number;
  appUrl: string;
  appName: string;
}

export function AppTestingPanel({ appId, appUrl, appName }: AppTestingPanelProps) {
  const [testType, setTestType] = useState<'smoke' | 'full' | 'accessibility'>('smoke');
  const queryClient = useQueryClient();
  
  const {
    serverStatus,
    statusLoading,
    isServerRunning,
    startServer,
    stopServer,
    runTest,
    isStarting,
    isStopping,
    isRunningTest,
    testResult,
    testError,
  } = usePlaywrightMCP();

  const refreshStatus = () => {
    queryClient.invalidateQueries({ queryKey: ["playwright-mcp", "status"] });
  };

  const handleStartServer = async () => {
    try {
      await startServer();
      toast.success("Playwright MCP server started successfully");
    } catch (error: any) {
      toast.error(`Failed to start server: ${error.message}`);
    }
  };

  const handleStopServer = async () => {
    try {
      await stopServer();
      toast.success("Playwright MCP server stopped");
    } catch (error: any) {
      toast.error(`Failed to stop server: ${error.message}`);
    }
  };

  const handleRunTest = async () => {
    try {
      const result = await runTest({ appId, appUrl, testType });
      
      if (result.success) {
        toast.success(`${testType} test completed successfully!`);
      } else {
        toast.error(`Test failed: ${result.errors.join(', ')}`);
      }
    } catch (error: any) {
      toast.error(`Test execution failed: ${error.message}`);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          App Testing - {appName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Server Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isServerRunning ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              MCP Server {isServerRunning ? 'Running' : 'Stopped'}
            </span>
            {serverStatus?.port && (
              <Badge variant="outline">Port {serverStatus.port}</Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={refreshStatus}
              disabled={statusLoading}
            >
              {statusLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            
            {!isServerRunning ? (
              <Button
                size="sm"
                onClick={handleStartServer}
                disabled={isStarting}
              >
                {isStarting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Start Server
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleStopServer}
                disabled={isStopping}
              >
                {isStopping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Stop Server
              </Button>
            )}
          </div>
        </div>

        {/* Test Configuration */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Test Type</label>
            <Select value={testType} onValueChange={(value: any) => setTestType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="smoke">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Smoke Test (Quick)
                  </div>
                </SelectItem>
                <SelectItem value="full">
                  <div className="flex items-center gap-2">
                    <TestTube className="h-4 w-4" />
                    Full Test Suite
                  </div>
                </SelectItem>
                <SelectItem value="accessibility">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Accessibility Check
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Target URL</label>
            <div className="p-2 bg-gray-100 rounded text-sm font-mono">
              {appUrl}
            </div>
          </div>
        </div>

        {/* Run Test Button */}
        <Button
          onClick={handleRunTest}
          disabled={!isServerRunning || isRunningTest}
          className="w-full"
        >
          {isRunningTest ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Running {testType} test...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run {testType} Test
            </>
          )}
        </Button>

        {/* Test Results */}
        {testResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                Test {testResult.success ? 'Passed' : 'Failed'}
              </span>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Load Time</span>
                </div>
                <div className="text-lg font-bold text-blue-900">
                  {testResult.performance.loadTime}ms
                </div>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-medium">Network Requests</span>
                </div>
                <div className="text-lg font-bold text-green-900">
                  {testResult.performance.networkRequests}
                </div>
              </div>
            </div>

            {/* Accessibility Results */}
            {testType === 'accessibility' && (
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-sm font-medium text-purple-700 mb-2">
                  Accessibility Report
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-red-600">
                    {testResult.accessibility.violations} violations
                  </span>
                  <span className="text-yellow-600">
                    {testResult.accessibility.warnings} warnings
                  </span>
                </div>
              </div>
            )}

            {/* Screenshots */}
            {testResult.screenshots.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Screenshots Captured</div>
                <div className="text-sm text-gray-600">
                  {testResult.screenshots.length} screenshot(s) saved to test artifacts
                </div>
              </div>
            )}

            {/* Errors */}
            {testResult.errors.length > 0 && (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">Test Errors:</div>
                  <ul className="list-disc list-inside text-sm">
                    {testResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Test Error */}
        {testError && (
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to run test: {testError.message}
            </AlertDescription>
          </Alert>
        )}

      </CardContent>
    </Card>
  );
}

