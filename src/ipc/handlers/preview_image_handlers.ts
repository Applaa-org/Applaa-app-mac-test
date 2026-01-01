/**
 * Preview Image Handlers
 * 
 * Handles preview image generation for deployed apps
 */

import { ipcMain } from 'electron';
import { db } from '@/db';
import { apps } from '@/db/schema';
import { eq } from 'drizzle-orm';
import log from 'electron-log';
import { generateAppPreviewImage } from '@/services/preview-image-service';
import { syncAppByIdToSupabase } from '@/lib/supabase_app_sync';
import { loadVaultSecretsIntoEnv } from '@/lib/vault';

const logger = log.scope('preview_image_handlers');

export function registerPreviewImageHandlers() {
  /**
   * Generate preview image for a deployed app
   */
  ipcMain.handle('preview-image:generate', async (event, { 
    appId 
  }: { 
    appId: number;
  }) => {
    try {
      logger.info(`Generating preview image for app ${appId}`);
      
      // Load secrets from Supabase Vault (including SCREENSHOT_API_KEY)
      try {
        await loadVaultSecretsIntoEnv();
        logger.info('Secrets loaded from Supabase Vault');
      } catch (vaultError) {
        logger.warn('Failed to load secrets from Vault (non-critical):', vaultError);
        // Continue anyway - API key might be in process.env already
      }
      
      // Get app from database
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });
      
      if (!app) {
        throw new Error(`App ${appId} not found`);
      }
      
      // Get deployment URL (prefer Vercel, fallback to EAS)
      const deploymentUrl = app.vercelDeploymentUrl || app.easDeploymentUrl;
      
      if (!deploymentUrl) {
        logger.warn(`No deployment URL found for app ${appId}`);
        return { 
          success: false, 
          error: 'No deployment URL found. Please deploy the app first.' 
        };
      }
      
      // Generate preview image
      logger.info(`Attempting to generate preview for app ${appId} with URL: ${deploymentUrl}`);
      let previewImageUrl: string | null = null;
      let generationError: Error | null = null;
      
      try {
        previewImageUrl = await generateAppPreviewImage(
          appId,
          app.name,
          deploymentUrl
        );
      } catch (error: any) {
        generationError = error;
        logger.error(`Preview image generation threw an error:`, error);
        logger.error(`Error message: ${error.message}`);
        logger.error(`Error stack: ${error.stack}`);
      }
      
      if (!previewImageUrl) {
        logger.warn(`Preview image generation returned null for app ${appId}`);
        const errorMessage = generationError 
          ? `Failed to generate preview image: ${generationError.message}`
          : 'Failed to generate preview image. Please check the deployment URL is accessible and the screenshot service is working.';
        
        return { 
          success: false, 
          error: errorMessage 
        };
      }
      
      // Sync to Supabase with preview image URL
      try {
        // We need to pass previewImageUrl to sync function
        // For now, we'll update Supabase directly
        const { syncAppToSupabase } = await import('../../lib/supabase');
        const { getWordPressUserDisplayName } = await import('../../lib/supabase');
        const userDisplayName = getWordPressUserDisplayName();
        
        if (userDisplayName) {
          await syncAppToSupabase({
            id: app.id,
            name: app.name,
            path: app.path,
            appType: app.appType,
            status: app.status,
            githubOrg: app.githubOrg,
            githubRepo: app.githubRepo,
            githubBranch: app.githubBranch,
            githubRepoUrl: app.githubRepoUrl,
            vercelProjectId: app.vercelProjectId,
            vercelProjectName: app.vercelProjectName,
            vercelTeamId: app.vercelTeamId,
            vercelDeploymentUrl: app.vercelDeploymentUrl,
            supabaseProjectId: app.supabaseProjectId,
            neonProjectId: app.neonProjectId,
            neonDevelopmentBranchId: app.neonDevelopmentBranchId,
            neonPreviewBranchId: app.neonPreviewBranchId,
            easBuildUrl: app.easBuildUrl,
            easDeploymentUrl: app.easDeploymentUrl,
            easProjectId: app.easProjectId,
            easBuildId: app.easBuildId,
            localApkPath: (app && typeof app === 'object' && app.localApkPath) ? app.localApkPath : null,
            localAabPath: (app && typeof app === 'object' && app.localAabPath) ? app.localAabPath : null,
            localIpaPath: (app && typeof app === 'object' && app.localIpaPath) ? app.localIpaPath : null,
            localApkBuiltAt: (app && typeof app === 'object' && app.localApkBuiltAt) ? Number(app.localApkBuiltAt) : null,
            localAabBuiltAt: (app && typeof app === 'object' && app.localAabBuiltAt) ? Number(app.localAabBuiltAt) : null,
            localIpaBuiltAt: (app && typeof app === 'object' && app.localIpaBuiltAt) ? Number(app.localIpaBuiltAt) : null,
            deploymentStatus: app.deploymentStatus,
            lastDeploymentAt: app.lastDeploymentAt ? Number(app.lastDeploymentAt) : null,
            deploymentNotes: app.deploymentNotes,
            showInHub: app.showInHub === true || app.showInHub === 1 || (typeof app.showInHub === 'boolean' && app.showInHub),
            previewImageUrl: previewImageUrl,
          }, userDisplayName);
          logger.info(`✅ Preview image URL synced to Supabase for app ${appId}`);
        } else {
          logger.warn('No WordPress user display name, cannot sync preview image URL to Supabase');
        }
      } catch (syncError) {
        logger.error('Failed to sync preview image URL to Supabase:', syncError);
        // Don't fail the whole operation if sync fails
      }
      
      logger.info(`✅ Preview image generated successfully for app ${appId}: ${previewImageUrl}`);
      
      return { 
        success: true, 
        previewImageUrl 
      };
    } catch (error: any) {
      logger.error(`❌ Failed to generate preview image: ${error.message}`);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });
}

