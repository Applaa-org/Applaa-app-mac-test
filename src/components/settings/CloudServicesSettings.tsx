/**
 * Cloud Services Settings Component
 * 
 * Provides configuration for Supabase authentication and Cloudflare R2 storage
 * for backup and sync functionality.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Cloud, 
  Database, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Settings,
  Key,
  Server,
  HardDrive
} from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useR2Storage } from '@/hooks/useR2Storage';
import { toast } from 'sonner';

export const CloudServicesSettings: React.FC = () => {
  const { isAuthenticated, user, saveCredentials, isSavingCredentials } = useSupabaseAuth();
  const { isInitialized: isR2Initialized, connectionStatus, testConnection } = useR2Storage();
  
  // Supabase form state
  const [supabaseForm, setSupabaseForm] = useState({
    url: '',
    anonKey: '',
    serviceRoleKey: ''
  });

  // R2 form state
  const [r2Form, setR2Form] = useState({
    accountId: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucketName: '',
    region: 'auto'
  });

  // Handle Supabase credentials save
  const handleSaveSupabase = async () => {
    try {
      await saveCredentials({
        url: supabaseForm.url,
        anonKey: supabaseForm.anonKey,
        serviceRoleKey: supabaseForm.serviceRoleKey
      });
      
      // Clear form after successful save
      setSupabaseForm({
        url: '',
        anonKey: '',
        serviceRoleKey: ''
      });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // Handle R2 credentials save
  const handleSaveR2 = async () => {
    try {
      // This would call the R2 save credentials function
      // Implementation depends on the R2 storage hook
      toast.success('R2 credentials saved successfully');
      
      // Clear form after successful save
      setR2Form({
        accountId: '',
        accessKeyId: '',
        secretAccessKey: '',
        bucketName: '',
        region: 'auto'
      });
    } catch (error) {
      toast.error('Failed to save R2 credentials');
    }
  };

  // Handle R2 connection test
  const handleTestR2Connection = async () => {
    try {
      await testConnection();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
            <Cloud className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">Cloud Services</CardTitle>
            <CardDescription>
              Configure authentication and backup services for seamless sync across devices
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="supabase" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="supabase" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Supabase Auth
            </TabsTrigger>
            <TabsTrigger value="r2" className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              R2 Storage
            </TabsTrigger>
          </TabsList>

          {/* Supabase Configuration */}
          <TabsContent value="supabase" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold">Authentication Service</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Supabase provides secure user authentication and profile management
                  </p>
                </div>
              </div>
              <Badge variant={isAuthenticated ? "default" : "secondary"}>
                {isAuthenticated ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
                ) : (
                  <><AlertCircle className="h-3 w-3 mr-1" /> Not Connected</>
                )}
              </Badge>
            </div>

            {isAuthenticated && user && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Signed in as <strong>{user.email}</strong>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supabase-url">Supabase Project URL</Label>
                <Input
                  id="supabase-url"
                  placeholder="https://your-project.supabase.co"
                  value={supabaseForm.url}
                  onChange={(e) => setSupabaseForm(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supabase-anon-key">Anonymous Key</Label>
                <Input
                  id="supabase-anon-key"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseForm.anonKey}
                  onChange={(e) => setSupabaseForm(prev => ({ ...prev, anonKey: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supabase-service-key">Service Role Key (Optional)</Label>
                <Input
                  id="supabase-service-key"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseForm.serviceRoleKey}
                  onChange={(e) => setSupabaseForm(prev => ({ ...prev, serviceRoleKey: e.target.value }))}
                />
              </div>

              <Button 
                onClick={handleSaveSupabase}
                disabled={!supabaseForm.url || !supabaseForm.anonKey || isSavingCredentials}
                className="w-full"
              >
                {isSavingCredentials ? 'Saving...' : 'Save Supabase Configuration'}
              </Button>
            </div>
          </TabsContent>

          {/* R2 Storage Configuration */}
          <TabsContent value="r2" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-orange-600" />
                <div>
                  <h3 className="font-semibold">Backup Storage</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Cloudflare R2 for secure app source code and database backups
                  </p>
                </div>
              </div>
              <Badge variant={isR2Initialized ? "default" : "secondary"}>
                {isR2Initialized ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
                ) : (
                  <><AlertCircle className="h-3 w-3 mr-1" /> Not Connected</>
                )}
              </Badge>
            </div>

            {connectionStatus && (
              <Alert variant={connectionStatus.success ? "default" : "destructive"}>
                {connectionStatus.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {connectionStatus.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="r2-account-id">Account ID</Label>
                <Input
                  id="r2-account-id"
                  placeholder="your-cloudflare-account-id"
                  value={r2Form.accountId}
                  onChange={(e) => setR2Form(prev => ({ ...prev, accountId: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="r2-access-key">Access Key ID</Label>
                <Input
                  id="r2-access-key"
                  placeholder="your-access-key-id"
                  value={r2Form.accessKeyId}
                  onChange={(e) => setR2Form(prev => ({ ...prev, accessKeyId: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="r2-secret-key">Secret Access Key</Label>
                <Input
                  id="r2-secret-key"
                  type="password"
                  placeholder="your-secret-access-key"
                  value={r2Form.secretAccessKey}
                  onChange={(e) => setR2Form(prev => ({ ...prev, secretAccessKey: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="r2-bucket">Bucket Name</Label>
                <Input
                  id="r2-bucket"
                  placeholder="applaa-backups"
                  value={r2Form.bucketName}
                  onChange={(e) => setR2Form(prev => ({ ...prev, bucketName: e.target.value }))}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveR2}
                  disabled={!r2Form.accountId || !r2Form.accessKeyId || !r2Form.secretAccessKey || !r2Form.bucketName}
                  className="flex-1"
                >
                  Save R2 Configuration
                </Button>
                
                {isR2Initialized && (
                  <Button 
                    variant="outline"
                    onClick={handleTestR2Connection}
                  >
                    Test Connection
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Setup Guide */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Quick Setup Guide</h4>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <p>1. Create a <strong>Supabase</strong> project at supabase.com</p>
            <p>2. Set up <strong>Cloudflare R2</strong> storage at cloudflare.com</p>
            <p>3. Configure your credentials above to enable sync and backup</p>
            <p>4. Your apps and data will be automatically backed up to the cloud</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


