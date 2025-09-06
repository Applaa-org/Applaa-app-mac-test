import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { IpcClient } from '@/ipc/ipc_client';
import { useQuery } from '@tanstack/react-query';

/**
 * 🚀 BACKGROUND DEPENDENCY INSTALLER HOOK
 * 
 * Automatically checks and installs dependencies when:
 * 1. An existing app is opened (selectedAppId changes)
 * 2. Dependencies are missing
 * 
 * This runs in the background while the user interacts with chat/preview tabs,
 * significantly reducing wait time when they actually want to start the preview.
 */
export function useBackgroundDependencyInstaller() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const installationTriggeredRef = useRef(new Set<number>());
  
  // Check if dependencies are needed for the selected app
  const { data: dependencyCheck, isLoading: isChecking } = useQuery({
    queryKey: ['dependencies-needed', selectedAppId],
    queryFn: async () => {
      if (!selectedAppId) return null;
      const ipcClient = IpcClient.getInstance();
      return await ipcClient.checkDependenciesNeeded({ appId: selectedAppId });
    },
    enabled: !!selectedAppId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Get installation status
  const { data: installStatus } = useQuery({
    queryKey: ['dependency-installation-status', selectedAppId],
    queryFn: async () => {
      if (!selectedAppId) return null;
      const ipcClient = IpcClient.getInstance();
      return await ipcClient.getDependencyInstallationStatus({ appId: selectedAppId });
    },
    enabled: !!selectedAppId,
    refetchInterval: 5000, // Check status every 5 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Trigger background installation when needed
  useEffect(() => {
    const triggerInstallation = async () => {
      if (!selectedAppId || !dependencyCheck) return;
      
      // Skip if already triggered for this app
      if (installationTriggeredRef.current.has(selectedAppId)) return;
      
      // Skip if dependencies are not needed
      if (!dependencyCheck.needed) {
        console.log(`📦 Dependencies already installed for app ${selectedAppId}: ${dependencyCheck.reason}`);
        return;
      }

      // Skip if already installing or completed recently
      if (installStatus?.status === 'installing') {
        console.log(`📦 Dependencies already installing for app ${selectedAppId}`);
        return;
      }

      if (installStatus?.status === 'completed' && installStatus.ageMinutes && installStatus.ageMinutes < 5) {
        console.log(`📦 Dependencies installed recently for app ${selectedAppId} (${installStatus.ageMinutes.toFixed(1)}m ago)`);
        return;
      }

      try {
        console.log(`🚀 Starting background dependency installation for app ${selectedAppId}: ${dependencyCheck.reason}`);
        installationTriggeredRef.current.add(selectedAppId);
        
        const ipcClient = IpcClient.getInstance();
        
        // Start installation in background (don't await - it's intentionally non-blocking)
        ipcClient.installDependenciesBackground({ appId: selectedAppId })
          .then(() => {
            console.log(`✅ Background dependency installation completed for app ${selectedAppId}`);
          })
          .catch((error) => {
            console.warn(`⚠️ Background dependency installation failed for app ${selectedAppId}:`, error);
            // Remove from triggered set so it can be retried later
            installationTriggeredRef.current.delete(selectedAppId);
          });
        
      } catch (error) {
        console.error(`❌ Failed to start background dependency installation for app ${selectedAppId}:`, error);
        installationTriggeredRef.current.delete(selectedAppId);
      }
    };

    triggerInstallation();
  }, [selectedAppId, dependencyCheck, installStatus]);

  // Clean up triggered set when app changes
  useEffect(() => {
    return () => {
      // Keep the set for efficiency, but limit its size
      if (installationTriggeredRef.current.size > 10) {
        installationTriggeredRef.current.clear();
      }
    };
  }, [selectedAppId]);

  return {
    isChecking,
    dependencyCheck,
    installStatus,
    isInstalling: installStatus?.status === 'installing',
    isCompleted: installStatus?.status === 'completed',
    isFailed: installStatus?.status === 'failed',
  };
}


