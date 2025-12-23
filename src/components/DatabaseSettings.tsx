import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Download, Eye, EyeOff, Database, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DatabaseCredentials {
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
  connectionString: string;
  canConnectExternally: boolean;
  recommendedClients?: string[];
}

interface DatabaseSettingsProps {
  appId: number;
}

export function DatabaseSettings({ appId }: DatabaseSettingsProps) {
  const [credentials, setCredentials] = useState<DatabaseCredentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCredentials();
  }, [appId]);

  const loadCredentials = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electron.ipcRenderer.invoke('database:get-credentials', { appId });

      if (result && result.success && result.credentials) {
        setCredentials(result.credentials);
      } else {
        setError(
          (result && (result.error || result.message)) ||
            'Failed to load database credentials',
        );
      }
    } catch (err: any) {
      console.error('Error loading credentials:', err);
      setError(err?.message || 'Failed to load database credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);
      
      const result = await window.electron.ipcRenderer.invoke('database:export', { appId });

      if (result && result.success && result.data) {
        // Convert Buffer to Blob
        const blob = new Blob([result.data], { type: result.mimeType || 'application/sql' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename || `app_${appId}_backup.sql`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success('Database exported successfully!');
      } else {
        throw new Error((result && result.error) || 'Export failed');
      }
    } catch (err: any) {
      console.error('Error exporting database:', err);
      setError(err?.message || 'Failed to export database');
      toast.error('Failed to export database');
    } finally {
      setExporting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading database information...</div>
        </CardContent>
      </Card>
    );
  }

  if (error && !credentials) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-semibold">Error loading database information</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!credentials) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            No database found for this app
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!credentials.canConnectExternally) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Settings
          </CardTitle>
          <CardDescription>
            This app uses a shared database (schema-based isolation)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              This app uses schema-based database isolation. To enable external access and export functionality, 
              recreate the app with a dedicated database.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Settings
        </CardTitle>
        <CardDescription>
          View credentials and export your database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">Host</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-gray-100 px-3 py-2 rounded flex-1 text-sm">
                  {credentials.host}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.host, 'Host')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Port</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-gray-100 px-3 py-2 rounded flex-1 text-sm">
                  {credentials.port}
                </code>
              </div>
            </div>

            <div className="col-span-2">
              <label className="text-sm font-semibold text-gray-700">Database Name</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-gray-100 px-3 py-2 rounded flex-1 text-sm">
                  {credentials.databaseName}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.databaseName, 'Database name')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Username</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-gray-100 px-3 py-2 rounded flex-1 text-sm">
                  {credentials.username}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.username, 'Username')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Password</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-gray-100 px-3 py-2 rounded flex-1 text-sm">
                  {showPassword ? credentials.password : '••••••••••••••••'}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.password, 'Password')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="col-span-2">
              <label className="text-sm font-semibold text-gray-700">Connection String</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-gray-100 px-3 py-2 rounded flex-1 text-sm break-all">
                  {credentials.connectionString}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.connectionString, 'Connection string')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t">
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export Database'}
          </Button>
          <Button
            variant="outline"
            onClick={loadCredentials}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {credentials.recommendedClients && credentials.recommendedClients.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 text-sm">Recommended Database Clients:</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              {credentials.recommendedClients.map((client, idx) => (
                <li key={idx}>• {client}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

