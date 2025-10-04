import React, { useState, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { IpcClient } from '@/ipc/ipc_client';
import { CheckCircle, XCircle, AlertTriangle, Download, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BuildDependencyStatus {
  android: {
    androidSdk: { installed: boolean; version?: string; issues: string[] };
    androidNdk: { installed: boolean; version?: string; issues: string[] };
    java: { installed: boolean; version?: string; issues: string[] };
    gradle: { installed: boolean; version?: string; issues: string[] };
    environment: { androidHome?: string; javaHome?: string; issues: string[] };
    overall: { ready: boolean; missingDependencies: string[]; recommendations: string[] };
  };
  ios: {
    xcode: { installed: boolean; version?: string; issues: string[] };
    commandLineTools: { installed: boolean; version?: string; issues: string[] };
    cocoapods: { installed: boolean; version?: string; issues: string[] };
    environment: { developerDir?: string; issues: string[] };
    overall: { ready: boolean; missingDependencies: string[]; recommendations: string[] };
  };
  overall: {
    ready: boolean;
    missingDependencies: string[];
    recommendations: string[];
  };
}

export function BuildDependencyChecker() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [status, setStatus] = useState<BuildDependencyStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<any>(null);
  const [installing, setInstalling] = useState<{ android: boolean; ios: boolean }>({ android: false, ios: false });
  const [installResults, setInstallResults] = useState<{ android: any; ios: any } | null>(null);

  const checkDependencies = async () => {
    if (!selectedAppId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Checking build dependencies...');
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.checkAllBuildDependencies();
      
      console.log('📊 Build dependency check result:', result);
      
      if (result.success) {
        setStatus(result.status);
        console.log('✅ Dependencies checked successfully');
      } else {
        const errorMsg = result.error || 'Failed to check dependencies';
        console.error('❌ Dependency check failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('❌ IPC call failed:', err);
      setError(err.message || 'Failed to check dependencies');
    } finally {
      setLoading(false);
    }
  };

  const getInstallationInstructions = async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.getAndroidInstallationInstructions();
      
      if (result.success) {
        setInstructions(result.instructions);
      }
    } catch (err: any) {
      console.error('Failed to get installation instructions:', err);
    }
  };

  const autoInstallAndroid = async () => {
    setInstalling(prev => ({ ...prev, android: true }));
    setError(null);
    
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.autoInstallAndroidDependencies();
      
      if (result.success) {
        setInstallResults(prev => ({ ...prev, android: result.result }));
        // Refresh dependency status after installation
        await checkDependencies();
      } else {
        setError(result.error || 'Failed to install Android dependencies');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to install Android dependencies');
    } finally {
      setInstalling(prev => ({ ...prev, android: false }));
    }
  };

  const autoInstallIOS = async () => {
    setInstalling(prev => ({ ...prev, ios: true }));
    setError(null);
    
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.autoInstallIOSDependencies();
      
      if (result.success) {
        setInstallResults(prev => ({ ...prev, ios: result.result }));
        // Refresh dependency status after installation
        await checkDependencies();
      } else {
        setError(result.error || 'Failed to install iOS dependencies');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to install iOS dependencies');
    } finally {
      setInstalling(prev => ({ ...prev, ios: false }));
    }
  };

  useEffect(() => {
    if (selectedAppId) {
      checkDependencies();
      getInstallationInstructions();
    }
  }, [selectedAppId]);

  const getStatusIcon = (installed: boolean, issues: string[]) => {
    if (installed && issues.length === 0) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (issues.length > 0) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (installed: boolean, issues: string[]) => {
    if (installed && issues.length === 0) {
      return <Badge variant="default" className="bg-green-500">Ready</Badge>;
    } else if (issues.length > 0) {
      return <Badge variant="destructive">Issues</Badge>;
    } else {
      return <Badge variant="secondary">Not Installed</Badge>;
    }
  };

  if (!selectedAppId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Build Dependencies</CardTitle>
          <CardDescription>Select an app to check build dependencies</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Build Dependencies
            </CardTitle>
            <CardDescription>
              Check Android and iOS build dependencies for local builds
            </CardDescription>
          </div>
          <Button 
            onClick={checkDependencies} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status && (
          <div className="space-y-6">
            {/* Overall Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                {status.overall.ready ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
                <div>
                  <h3 className="font-semibold">
                    {status.overall.ready ? 'All Dependencies Ready' : 'Missing Dependencies'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {status.overall.ready 
                      ? 'Your system is ready for local builds'
                      : `${status.overall.missingDependencies.length} dependencies missing`
                    }
                  </p>
                </div>
              </div>
              <Badge variant={status.overall.ready ? "default" : "destructive"}>
                {status.overall.ready ? 'Ready' : 'Not Ready'}
              </Badge>
            </div>

            {/* Platform Tabs */}
            <Tabs defaultValue="android" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="android">Android</TabsTrigger>
                <TabsTrigger value="ios">iOS</TabsTrigger>
              </TabsList>
              
              {/* Android Dependencies */}
              <TabsContent value="android" className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    {getStatusIcon(status.android.overall.ready, [])}
                    Android Build Tools
                    {getStatusBadge(status.android.overall.ready, [])}
                  </h4>
                  
                  <div className="grid gap-3">
                    {/* Android SDK */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(status.android.androidSdk.installed, status.android.androidSdk.issues)}
                        <div>
                          <p className="font-medium">Android SDK</p>
                          {status.android.androidSdk.version && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Version: {status.android.androidSdk.version}
                            </p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(status.android.androidSdk.installed, status.android.androidSdk.issues)}
                    </div>

                    {/* Android NDK */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(status.android.androidNdk.installed, status.android.androidNdk.issues)}
                        <div>
                          <p className="font-medium">Android NDK</p>
                          {status.android.androidNdk.version && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Version: {status.android.androidNdk.version}
                            </p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(status.android.androidNdk.installed, status.android.androidNdk.issues)}
                    </div>

                    {/* Java */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(status.android.java.installed, status.android.java.issues)}
                        <div>
                          <p className="font-medium">Java Development Kit</p>
                          {status.android.java.version && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Version: {status.android.java.version}
                            </p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(status.android.java.installed, status.android.java.issues)}
                    </div>

                    {/* Gradle */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(status.android.gradle.installed, status.android.gradle.issues)}
                        <div>
                          <p className="font-medium">Gradle</p>
                          {status.android.gradle.version && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Version: {status.android.gradle.version}
                            </p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(status.android.gradle.installed, status.android.gradle.issues)}
                    </div>
                  </div>

                  {/* Android Recommendations */}
                  {status.android.overall.recommendations.length > 0 && (
                    <Alert>
                      <Info className="w-4 h-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-medium">To fix Android build issues:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {status.android.overall.recommendations.map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                          <div className="mt-3">
                            <Button 
                              onClick={autoInstallAndroid}
                              disabled={installing.android}
                              size="sm"
                              className="w-full"
                            >
                              {installing.android ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                  Installing Android Dependencies...
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4 mr-2" />
                                  Auto-Install Android Dependencies
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>

              {/* iOS Dependencies */}
              <TabsContent value="ios" className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    {getStatusIcon(status.ios.overall.ready, [])}
                    iOS Build Tools
                    {getStatusBadge(status.ios.overall.ready, [])}
                  </h4>
                  
                  <div className="grid gap-3">
                    {/* Xcode */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(status.ios.xcode.installed, status.ios.xcode.issues)}
                        <div>
                          <p className="font-medium">Xcode</p>
                          {status.ios.xcode.version && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Version: {status.ios.xcode.version}
                            </p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(status.ios.xcode.installed, status.ios.xcode.issues)}
                    </div>

                    {/* Command Line Tools */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(status.ios.commandLineTools.installed, status.ios.commandLineTools.issues)}
                        <div>
                          <p className="font-medium">Xcode Command Line Tools</p>
                          {status.ios.commandLineTools.version && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Version: {status.ios.commandLineTools.version}
                            </p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(status.ios.commandLineTools.installed, status.ios.commandLineTools.issues)}
                    </div>

                    {/* CocoaPods */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(status.ios.cocoapods.installed, status.ios.cocoapods.issues)}
                        <div>
                          <p className="font-medium">CocoaPods</p>
                          {status.ios.cocoapods.version && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Version: {status.ios.cocoapods.version}
                            </p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(status.ios.cocoapods.installed, status.ios.cocoapods.issues)}
                    </div>
                  </div>

                  {/* iOS Recommendations */}
                  {status.ios.overall.recommendations.length > 0 && (
                    <Alert>
                      <Info className="w-4 h-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-medium">To fix iOS build issues:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {status.ios.overall.recommendations.map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                          <div className="mt-3">
                            <Button 
                              onClick={autoInstallIOS}
                              disabled={installing.ios}
                              size="sm"
                              className="w-full"
                            >
                              {installing.ios ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                  Installing iOS Dependencies...
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4 mr-2" />
                                  Auto-Install iOS Dependencies
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Installation Instructions */}
            {instructions && (
              <div className="mt-6">
                <Separator className="my-4" />
                <div className="space-y-4">
                  <h4 className="font-semibold">Installation Instructions</h4>
                  
                  <Tabs defaultValue="macos" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="macos">macOS</TabsTrigger>
                      <TabsTrigger value="windows">Windows</TabsTrigger>
                      <TabsTrigger value="linux">Linux</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="macos" className="space-y-2">
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        {instructions.macos.map((step: string, index: number) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </TabsContent>
                    
                    <TabsContent value="windows" className="space-y-2">
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        {instructions.windows.map((step: string, index: number) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </TabsContent>
                    
                    <TabsContent value="linux" className="space-y-2">
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        {instructions.linux.map((step: string, index: number) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
