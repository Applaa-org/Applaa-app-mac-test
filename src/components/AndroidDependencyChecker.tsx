import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';

interface AndroidDependencyStatus {
  androidSdk: {
    installed: boolean;
    path?: string;
    version?: string;
    issues: string[];
  };
  androidNdk: {
    installed: boolean;
    path?: string;
    version?: string;
    issues: string[];
  };
  java: {
    installed: boolean;
    version?: string;
    path?: string;
    issues: string[];
  };
  gradle: {
    installed: boolean;
    version?: string;
    issues: string[];
  };
  environment: {
    androidHome?: string;
    javaHome?: string;
    pathIncludesAndroid: boolean;
    pathIncludesJava: boolean;
    issues: string[];
  };
  overall: {
    ready: boolean;
    missingDependencies: string[];
    recommendations: string[];
  };
}

interface InstallationInstructions {
  windows: string[];
  macos: string[];
  linux: string[];
}

export function AndroidDependencyChecker() {
  const [status, setStatus] = useState<AndroidDependencyStatus | null>(null);
  const [instructions, setInstructions] = useState<InstallationInstructions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkDependencies = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await IpcClient.getInstance().checkAndroidDependencies();
      if (result.success) {
        setStatus(result.status);
      } else {
        setError(result.error || 'Failed to check dependencies');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check dependencies');
    } finally {
      setLoading(false);
    }
  };

  const loadInstructions = async () => {
    try {
      const result = await IpcClient.getInstance().getAndroidInstallationInstructions();
      if (result.success) {
        setInstructions(result.instructions);
      }
    } catch (err) {
      console.error('Failed to load installation instructions:', err);
    }
  };

  useEffect(() => {
    checkDependencies();
    loadInstructions();
  }, []);

  const getStatusIcon = (installed: boolean, issues: string[]) => {
    if (installed && issues.length === 0) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (issues.length > 0) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    } else {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (installed: boolean, issues: string[]) => {
    if (installed && issues.length === 0) {
      return <Badge variant="default" className="bg-green-500">Ready</Badge>;
    } else if (issues.length > 0) {
      return <Badge variant="destructive">Issues</Badge>;
    } else {
      return <Badge variant="secondary">Not Found</Badge>;
    }
  };

  const getCurrentPlatformInstructions = () => {
    if (!instructions) return [];
    
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('win')) return instructions.windows;
    if (platform.includes('mac')) return instructions.macos;
    return instructions.linux;
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Android Build Dependencies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to check Android dependencies: {error}
            </AlertDescription>
          </Alert>
          <Button onClick={checkDependencies} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Android Build Dependencies</CardTitle>
          <CardDescription>Checking system requirements for local Android builds...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status.overall.ready ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            Android Build Environment
          </CardTitle>
          <CardDescription>
            {status.overall.ready 
              ? "All dependencies are ready for Android builds" 
              : "Some dependencies are missing or misconfigured"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {status.overall.ready ? (
                <Badge variant="default" className="bg-green-500">Ready to Build</Badge>
              ) : (
                <Badge variant="destructive">
                  {status.overall.missingDependencies.length} Missing
                </Badge>
              )}
            </div>
            <Button onClick={checkDependencies} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Dependencies */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Android SDK */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Android SDK</span>
              {getStatusIcon(status.androidSdk.installed, status.androidSdk.issues)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {getStatusBadge(status.androidSdk.installed, status.androidSdk.issues)}
              {status.androidSdk.path && (
                <p className="text-xs text-muted-foreground">
                  Path: {status.androidSdk.path}
                </p>
              )}
              {status.androidSdk.version && (
                <p className="text-xs text-muted-foreground">
                  Version: {status.androidSdk.version}
                </p>
              )}
              {status.androidSdk.issues.length > 0 && (
                <div className="text-xs text-red-600">
                  {status.androidSdk.issues.map((issue, i) => (
                    <div key={i}>• {issue}</div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Android NDK */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Android NDK</span>
              {getStatusIcon(status.androidNdk.installed, status.androidNdk.issues)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {getStatusBadge(status.androidNdk.installed, status.androidNdk.issues)}
              {status.androidNdk.path && (
                <p className="text-xs text-muted-foreground">
                  Path: {status.androidNdk.path}
                </p>
              )}
              {status.androidNdk.version && (
                <p className="text-xs text-muted-foreground">
                  Version: {status.androidNdk.version}
                </p>
              )}
              {status.androidNdk.issues.length > 0 && (
                <div className="text-xs text-red-600">
                  {status.androidNdk.issues.map((issue, i) => (
                    <div key={i}>• {issue}</div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Java */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Java Development Kit</span>
              {getStatusIcon(status.java.installed, status.java.issues)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {getStatusBadge(status.java.installed, status.java.issues)}
              {status.java.version && (
                <p className="text-xs text-muted-foreground">
                  Version: {status.java.version}
                </p>
              )}
              {status.java.path && (
                <p className="text-xs text-muted-foreground">
                  Path: {status.java.path}
                </p>
              )}
              {status.java.issues.length > 0 && (
                <div className="text-xs text-red-600">
                  {status.java.issues.map((issue, i) => (
                    <div key={i}>• {issue}</div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gradle */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Gradle</span>
              {getStatusIcon(status.gradle.installed, status.gradle.issues)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {getStatusBadge(status.gradle.installed, status.gradle.issues)}
              {status.gradle.version && (
                <p className="text-xs text-muted-foreground">
                  Version: {status.gradle.version}
                </p>
              )}
              {status.gradle.issues.length > 0 && (
                <div className="text-xs text-red-600">
                  {status.gradle.issues.map((issue, i) => (
                    <div key={i}>• {issue}</div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Environment Variables */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Environment Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>ANDROID_HOME:</span>
              <span className={status.environment.androidHome ? 'text-green-600' : 'text-red-600'}>
                {status.environment.androidHome || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>JAVA_HOME:</span>
              <span className={status.environment.javaHome ? 'text-green-600' : 'text-red-600'}>
                {status.environment.javaHome || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>PATH includes Android:</span>
              <span className={status.environment.pathIncludesAndroid ? 'text-green-600' : 'text-yellow-600'}>
                {status.environment.pathIncludesAndroid ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>PATH includes Java:</span>
              <span className={status.environment.pathIncludesJava ? 'text-green-600' : 'text-yellow-600'}>
                {status.environment.pathIncludesJava ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Installation Instructions */}
      {!status.overall.ready && instructions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Installation Instructions
            </CardTitle>
            <CardDescription>
              Follow these steps to install the missing dependencies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getCurrentPlatformInstructions().map((instruction, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">{index + 1}.</span>
                  <span>{instruction}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a 
                  href="https://developer.android.com/studio" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Download Android Studio
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a 
                  href="https://adoptium.net/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Download OpenJDK
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {status.overall.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {status.overall.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>{recommendation}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
