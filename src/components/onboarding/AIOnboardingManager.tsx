import React, { useState, useEffect } from 'react';
import { AIFeaturesInstallDialog } from '../dialogs/AIFeaturesInstallDialog';
import { useSettings } from '../../hooks/useSettings';
import { IpcClient } from '../../ipc/ipc_client';

export function AIOnboardingManager() {
  const { data: settings, updateSetting } = useSettings();
  const [showDialog, setShowDialog] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkShouldShowOnboarding = async () => {
      try {
        // Don't show if user has already seen the dialog
        if (settings?.hasShownAIFeaturesDialog) {
          setIsChecking(false);
          return;
        }

        // Don't show if transformers are already installed
        if (settings?.aiTransformersInstalled) {
          setIsChecking(false);
          return;
        }

        // Check if transformers are actually installed (in case setting is out of sync)
        const ipcClient = IpcClient.getInstance();
        const installStatus = await ipcClient.checkAITransformersInstalled();
        
        if (installStatus.installed) {
          // Update settings to reflect that transformers are installed
          await updateSetting('aiTransformersInstalled', true);
          await updateSetting('hasShownAIFeaturesDialog', true);
          setIsChecking(false);
          return;
        }

        // Show the dialog if we haven't shown it before and transformers aren't installed
        setShowDialog(true);
        setIsChecking(false);
      } catch (error) {
        console.error('Error checking AI features onboarding status:', error);
        setIsChecking(false);
      }
    };

    // Only check if settings are loaded
    if (settings !== undefined) {
      checkShouldShowOnboarding();
    }
  }, [settings]); // Remove updateSetting from deps as it's stable

  const handleOnboardingComplete = async (installed: boolean) => {
    try {
      // Mark that we've shown the dialog
      await updateSetting('hasShownAIFeaturesDialog', true);
      
      // Update installation status if successful
      if (installed) {
        await updateSetting('aiTransformersInstalled', true);
      }
      
      setShowDialog(false);
    } catch (error) {
      console.error('Error updating onboarding settings:', error);
    }
  };

  // Don't render anything while checking or if we shouldn't show the dialog
  if (isChecking || !showDialog) {
    return null;
  }

  return (
    <AIFeaturesInstallDialog
      open={showDialog}
      onOpenChange={setShowDialog}
      onComplete={handleOnboardingComplete}
    />
  );
}
