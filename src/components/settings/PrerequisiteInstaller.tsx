import React, { useState, useEffect } from 'react';
import { IpcClient } from '@/ipc/ipc_client';
import { CheckCircle, XCircle, Download, AlertTriangle, Clock, Settings } from 'lucide-react';

interface PrerequisiteStatus {
  name: string;
  installed: boolean;
  version?: string;
  path?: string;
  required: boolean;
  category: 'system' | 'development' | 'android' | 'ios';
  installCommand?: string;
  installMessage?: string;
}

interface PrerequisiteInstallResult {
  success: boolean;
  installed: string[];
  failed: string[];
  skipped: string[];
  logs: string[];
  totalTime: number;
}

interface PrerequisitesStatus {
  ready: boolean;
  missing: string[];
  total: number;
  installed: number;
}

export const PrerequisiteInstaller: React.FC = () => {
  const [prerequisites, setPrerequisites] = useState<PrerequisiteStatus[]>([]);
  const [status, setStatus] = useState<PrerequisitesStatus | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<string[]>([]);
  const [installResult, setInstallResult] = useState<PrerequisiteInstallResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ipcClient = IpcClient.getInstance();

  // Load prerequisites on component mount
  useEffect(() => {
    loadPrerequisites();
  }, []);

  const loadPrerequisites = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [prereqs, statusData] = await Promise.all([
        ipcClient.checkPrerequisites(),
        ipcClient.getPrerequisitesStatus()
      ]);
      
      setPrerequisites(prereqs);
      setStatus(statusData);
    } catch (err) {
      console.error('Failed to load prerequisites:', err);
      setError(`Failed to load prerequisites: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const installAllPrerequisites = async () => {
    try {
      setInstalling(true);
      setInstallProgress([]);
      setInstallResult(null);
      setError(null);
      
      console.log('🚀 Starting prerequisite installation...');
      
      const result = await ipcClient.installPrerequisites({
        skipSystem: false,
        skipDevelopment: false,
        skipAndroid: false,
        skipIOS: false,
        skipExpo: false,
        forceReinstall: false
      });
      
      setInstallResult(result);
      setInstallProgress(result.logs);
      
      // Reload prerequisites after installation
      await loadPrerequisites();
      
      console.log('✅ Prerequisite installation completed:', result);
    } catch (err) {
      console.error('❌ Prerequisite installation failed:', err);
      setError(`Installation failed: ${err}`);
    } finally {
      setInstalling(false);
    }
  };

  const installCategory = async (category: string) => {
    try {
      setInstalling(true);
      setInstallProgress([]);
      setInstallResult(null);
      setError(null);
      
      const options = {
        skipSystem: category !== 'system',
        skipDevelopment: category !== 'development',
        skipAndroid: category !== 'android',
        skipIOS: category !== 'ios',
        skipExpo: category !== 'expo',
        forceReinstall: false
      };
      
      console.log(`🚀 Installing ${category} prerequisites...`);
      
      const result = await ipcClient.installPrerequisites(options);
      
      setInstallResult(result);
      setInstallProgress(result.logs);
      
      // Reload prerequisites after installation
      await loadPrerequisites();
      
      console.log(`✅ ${category} prerequisite installation completed:`, result);
    } catch (err) {
      console.error(`❌ ${category} prerequisite installation failed:`, err);
      setError(`Installation failed: ${err}`);
    } finally {
      setInstalling(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system': return <Settings className="w-4 h-4" />;
      case 'development': return <Download className="w-4 h-4" />;
      case 'android': return <Download className="w-4 h-4" />;
      case 'ios': return <Download className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'system': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'development': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'android': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'ios': return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
      default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const getStatusIcon = (installed: boolean, required: boolean) => {
    if (installed) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (required) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (installed: boolean, required: boolean) => {
    if (installed) {
      return 'Installed';
    } else if (required) {
      return 'Required';
    } else {
      return 'Optional';
    }
  };

  const getStatusColor = (installed: boolean, required: boolean) => {
    if (installed) {
      return 'text-green-600 dark:text-green-400';
    } else if (required) {
      return 'text-red-600 dark:text-red-400';
    } else {
      return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  // Group prerequisites by category
  const groupedPrerequisites = prerequisites.reduce((acc, prereq) => {
    if (!acc[prereq.category]) {
      acc[prereq.category] = [];
    }
    acc[prereq.category].push(prereq);
    return acc;
  }, {} as Record<string, PrerequisiteStatus[]>);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading prerequisites...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            🚀 Prerequisite Installer
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Hierarchical dependency installation for non-technical users
          </p>
        </div>
        
        {status && (
          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {status.installed} / {status.total} installed
            </div>
            <div className={`text-sm font-medium ${status.ready ? 'text-green-600' : 'text-red-600'}`}>
              {status.ready ? '✅ Ready' : `❌ ${status.missing.length} missing`}
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* Installation Progress */}
      {installing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-blue-700 dark:text-blue-400 font-medium">
              Installing prerequisites...
            </span>
          </div>
          
          {installProgress.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {installProgress.map((line, index) => (
                <div key={index} className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Installation Result */}
      {installResult && (
        <div className={`border rounded-lg p-4 ${
          installResult.success 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center mb-3">
            {installResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
            )}
            <span className={`font-medium ${
              installResult.success 
                ? 'text-green-700 dark:text-green-400' 
                : 'text-red-700 dark:text-red-400'
            }`}>
              {installResult.success ? 'Installation Completed' : 'Installation Failed'}
            </span>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {installResult.installed.length > 0 && (
              <div>✅ Installed: {installResult.installed.join(', ')}</div>
            )}
            {installResult.skipped.length > 0 && (
              <div>⏭️ Skipped: {installResult.skipped.join(', ')}</div>
            )}
            {installResult.failed.length > 0 && (
              <div>❌ Failed: {installResult.failed.join(', ')}</div>
            )}
            <div>⏱️ Time: {(installResult.totalTime / 1000).toFixed(1)}s</div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={installAllPrerequisites}
          disabled={installing || status?.ready}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            status?.ready
              ? 'bg-green-100 text-green-700 cursor-not-allowed'
              : installing
              ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {installing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
              Installing...
            </>
          ) : status?.ready ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2 inline-block" />
              All Prerequisites Ready
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2 inline-block" />
              Install All Prerequisites
            </>
          )}
        </button>
        
        <button
          onClick={loadPrerequisites}
          disabled={installing}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Settings className="w-4 h-4 mr-2 inline-block" />
          Refresh Status
        </button>
      </div>

      {/* Prerequisites by Category */}
      <div className="space-y-6">
        {Object.entries(groupedPrerequisites).map(([category, prereqs]) => (
          <div key={category} className={`border rounded-lg p-4 ${getCategoryColor(category)}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                {getCategoryIcon(category)}
                <h3 className="text-lg font-semibold ml-2 capitalize">
                  {category} Prerequisites
                </h3>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {prereqs.filter(p => p.installed).length} / {prereqs.length} installed
                </span>
                
                {prereqs.some(p => !p.installed && p.required) && (
                  <button
                    onClick={() => installCategory(category)}
                    disabled={installing}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    Install {category}
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              {prereqs.map((prereq, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(prereq.installed, prereq.required)}
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {prereq.name}
                      </div>
                      {prereq.version && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Version: {prereq.version}
                        </div>
                      )}
                      {prereq.path && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Path: {prereq.path}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${getStatusColor(prereq.installed, prereq.required)}`}>
                      {getStatusText(prereq.installed, prereq.required)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Installation Instructions */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
          📋 Installation Instructions
        </h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            <strong>System Prerequisites:</strong> Node.js and Git are required for all development.
          </p>
          <p>
            <strong>Development Tools:</strong> NPM and PNPM for package management.
          </p>
          <p>
            <strong>Android Development:</strong> Java, Android Studio, Android SDK, and NDK for Android builds.
          </p>
          <p>
            <strong>iOS Development:</strong> Xcode, Command Line Tools, and CocoaPods for iOS builds (macOS only).
          </p>
          <p>
            <strong>Expo Development:</strong> Expo CLI for Expo app development.
          </p>
        </div>
      </div>
    </div>
  );
};
