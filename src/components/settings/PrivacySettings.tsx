import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { IpcClient } from '../../ipc/ipc_client';
import { toast } from 'sonner';
import { 
  Shield, 
  BarChart3, 
  Zap, 
  Bug, 
  TrendingUp, 
  Info, 
  CheckCircle,
  AlertCircle,
  Settings
} from 'lucide-react';

interface AnalyticsConsent {
  essential: boolean;
  analytics: boolean;
  performance: boolean;
  crash_reporting: boolean;
  improvement_data: boolean;
}

interface AnalyticsStatus {
  hasGA4: boolean;
  hasSentry: boolean;
  isInitialized: boolean;
  environment: string;
}

export const PrivacySettings: React.FC = () => {
  const [consent, setConsent] = useState<AnalyticsConsent>({
    essential: true,
    analytics: false,
    performance: false,
    crash_reporting: false,
    improvement_data: false,
  });

  const [status, setStatus] = useState<AnalyticsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load current consent and status
  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Get current consent
      const consentResult = await IpcClient.getInstance().analyticsGetConsent();
      if (consentResult.success && consentResult.consent) {
        setConsent(consentResult.consent);
      }

      // Get analytics status
      const statusResult = await IpcClient.getInstance().analyticsGetConfigStatus();
      if (statusResult.success && statusResult.status) {
        setStatus(statusResult.status);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      toast.error('Failed to load privacy settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Update consent
  const updateConsent = async (newConsent: Partial<AnalyticsConsent>) => {
    try {
      setIsSaving(true);
      
      const updatedConsent = { ...consent, ...newConsent };
      const result = await IpcClient.getInstance().analyticsUpdateConsent(newConsent);
      
      if (result.success) {
        setConsent(updatedConsent);
        toast.success('Privacy preferences updated');
        
        // Re-initialize analytics if needed
        if (Object.values(newConsent).some(Boolean)) {
          await IpcClient.getInstance().analyticsInitializeFromSettings();
        }
      } else {
        toast.error(result.error || 'Failed to update preferences');
      }
    } catch (error) {
      console.error('Failed to update consent:', error);
      toast.error('Failed to update privacy preferences');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle individual consent changes
  const handleConsentChange = (key: keyof AnalyticsConsent, value: boolean) => {
    updateConsent({ [key]: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <Settings className="w-4 h-4 animate-spin" />
            <span>Loading privacy settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy & Analytics
          </CardTitle>
          <CardDescription>
            Control how Applaa collects and uses data to improve your experience
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Analytics Status */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analytics Configuration</CardTitle>
            <CardDescription>
              Current status of analytics services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium">Google Analytics</p>
                  <Badge variant={status.hasGA4 ? 'default' : 'secondary'}>
                    {status.hasGA4 ? 'Configured' : 'Not Configured'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Bug className="w-5 h-5 text-red-500" />
                <div>
                  <p className="font-medium">Error Tracking</p>
                  <Badge variant={status.hasSentry ? 'default' : 'secondary'}>
                    {status.hasSentry ? 'Configured' : 'Not Configured'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {status.isInitialized ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-500" />
              )}
              <span className="font-medium">
                Analytics {status.isInitialized ? 'Active' : 'Inactive'}
              </span>
              <Badge variant="outline">{status.environment}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Collection Preferences</CardTitle>
          <CardDescription>
            Choose what data you're comfortable sharing to help improve Applaa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Essential */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <Shield className="w-5 h-5 text-green-500 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="font-medium">Essential Functionality</Label>
                  <Badge variant="outline">Required</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Basic app functionality, error handling, and core features. 
                  This cannot be disabled as it's required for the app to work properly.
                </p>
              </div>
            </div>
            <Switch
              checked={consent.essential}
              disabled={true}
              className="mt-1"
            />
          </div>

          <Separator />

          {/* Analytics */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <BarChart3 className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="space-y-1">
                <Label className="font-medium">Usage Analytics</Label>
                <p className="text-sm text-muted-foreground">
                  Help us understand how you use Applaa to improve the user experience. 
                  Includes feature usage, navigation patterns, and general app interactions.
                </p>
              </div>
            </div>
            <Switch
              checked={consent.analytics}
              onCheckedChange={(checked) => handleConsentChange('analytics', checked)}
              disabled={isSaving}
              className="mt-1"
            />
          </div>

          <Separator />

          {/* Performance */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <Zap className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div className="space-y-1">
                <Label className="font-medium">Performance Data</Label>
                <p className="text-sm text-muted-foreground">
                  Collect performance metrics like app startup time, preview loading speed, 
                  and response times to help us make Applaa faster.
                </p>
              </div>
            </div>
            <Switch
              checked={consent.performance}
              onCheckedChange={(checked) => handleConsentChange('performance', checked)}
              disabled={isSaving}
              className="mt-1"
            />
          </div>

          <Separator />

          {/* Crash Reporting */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <Bug className="w-5 h-5 text-red-500 mt-0.5" />
              <div className="space-y-1">
                <Label className="font-medium">Crash Reporting</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send crash reports and error logs to help us fix bugs faster. 
                  No personal code or sensitive data is included.
                </p>
              </div>
            </div>
            <Switch
              checked={consent.crash_reporting}
              onCheckedChange={(checked) => handleConsentChange('crash_reporting', checked)}
              disabled={isSaving}
              className="mt-1"
            />
          </div>

          <Separator />

          {/* Improvement Data */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <TrendingUp className="w-5 h-5 text-purple-500 mt-0.5" />
              <div className="space-y-1">
                <Label className="font-medium">Product Improvement</Label>
                <p className="text-sm text-muted-foreground">
                  Share anonymized data about feature adoption, user flows, and preferences 
                  to help us prioritize new features and improvements.
                </p>
              </div>
            </div>
            <Switch
              checked={consent.improvement_data}
              onCheckedChange={(checked) => handleConsentChange('improvement_data', checked)}
              disabled={isSaving}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            What We Never Collect
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Your source code content</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">API keys or sensitive credentials</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Personal files or documents</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Private chat conversations with AI</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Identifiable personal information without explicit consent</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Rights */}
      <Card>
        <CardHeader>
          <CardTitle>Your Data Rights</CardTitle>
          <CardDescription>
            You have full control over your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              You can change these settings at any time. All data collection respects your current preferences, 
              and you can request deletion of previously collected data by contacting support.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Export My Data
            </Button>
            <Button variant="outline" size="sm">
              Delete My Data
            </Button>
            <Button variant="outline" size="sm">
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

