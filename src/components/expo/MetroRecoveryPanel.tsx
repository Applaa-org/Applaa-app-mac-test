import React, { useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '../../atoms/appAtoms';
import { IpcClient } from '../../ipc/ipc_client';
import { showError, showSuccess } from '@/lib/toast';

interface MetroRecoveryPanelProps {
  onRecoveryComplete?: () => void;
}

export const MetroRecoveryPanel: React.FC<MetroRecoveryPanelProps> = ({ onRecoveryComplete }) => {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isUpdatingPackages, setIsUpdatingPackages] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<string>('');

  const handleMetroRecovery = useCallback(async () => {
    try {
      setIsRecovering(true);
      setRecoveryStatus('🚨 Starting Metro recovery...');
      
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.simpleExpoMetroRecovery();
      
      if (result.success) {
        setRecoveryStatus(result.message);
        showSuccess(`Metro Recovery: ${result.message}`);
        
        if (result.portFree) {
          setTimeout(() => {
            onRecoveryComplete?.();
          }, 1000);
        }
      } else {
        setRecoveryStatus(`❌ Recovery failed: ${result.message}`);
        showError(`Metro Recovery Failed: ${result.message}`);
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setRecoveryStatus(`❌ Recovery error: ${errorMsg}`);
      showError(`Metro Recovery Error: ${errorMsg}`);
    } finally {
      setIsRecovering(false);
    }
  }, [onRecoveryComplete]);

  const handlePackageUpdate = useCallback(async () => {
    if (!selectedAppId) return;
    
    try {
      setIsUpdatingPackages(true);
      setRecoveryStatus('📦 Updating package versions...');
      
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.simpleExpoUpdatePackages({ appId: selectedAppId });
      
      if (result.success) {
        setRecoveryStatus(`✅ ${result.message}`);
        showSuccess(`Package Update: ${result.message}`);
      } else {
        setRecoveryStatus(`❌ Update failed: ${result.message}`);
        showError(`Package Update Failed: ${result.message}`);
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setRecoveryStatus(`❌ Update error: ${errorMsg}`);
      showError(`Package Update Error: ${errorMsg}`);
    } finally {
      setIsUpdatingPackages(false);
    }
  }, [selectedAppId]);

  return (
    <div className="metro-recovery-panel bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <h3 className="text-sm font-medium text-red-800">Metro Bundler Issues Detected</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleMetroRecovery}
            disabled={isRecovering || isUpdatingPackages}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              isRecovering || isUpdatingPackages
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {isRecovering ? '🔄 Recovering...' : '🚨 Force Recovery'}
          </button>
          
          <button
            onClick={handlePackageUpdate}
            disabled={isRecovering || isUpdatingPackages}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              isRecovering || isUpdatingPackages
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isUpdatingPackages ? '📦 Updating...' : '📦 Fix Versions'}
          </button>
        </div>
      </div>
      
      <div className="text-xs text-red-700 mb-2">
        <p>⚠️ <strong>Common Issues:</strong></p>
        <ul className="list-disc list-inside ml-2 space-y-1">
          <li>Port 8081 is occupied by stuck Metro process</li>
          <li>Bundler cache is corrupted or stuck rebuilding</li>
          <li>Previous Expo session didn't terminate properly</li>
          <li>Package version mismatches causing conflicts</li>
        </ul>
      </div>
      
      {recoveryStatus && (
        <div className="text-xs bg-white border border-red-200 rounded p-2 font-mono">
          {recoveryStatus}
        </div>
      )}
      
      <div className="text-xs text-red-600 mt-2">
        <p><strong>Recovery Actions:</strong></p>
        <ul className="list-disc list-inside ml-2">
          <li>Kill all processes using port 8081</li>
          <li>Terminate stuck Node.js/Expo processes</li>
          <li>Clear Metro bundler cache</li>
          <li>Verify port availability before restart</li>
        </ul>
      </div>
    </div>
  );
};
