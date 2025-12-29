import { ipcMain } from "electron";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { eq } from "drizzle-orm";
import log from "electron-log";

const logger = log.scope("url-handlers");

export function registerURLHandlers() {
  // Save deployment URL for an app
  ipcMain.handle("url:save-deployment", async (event, { 
    appId, 
    urlType, 
    url, 
    projectId, 
    buildId 
  }: { 
    appId: number; 
    urlType: 'vercel' | 'github' | 'eas-build' | 'eas-deployment' | 'local-apk' | 'local-aab' | 'local-ipa'; 
    url: string; 
    projectId?: string; 
    buildId?: string; 
  }) => {
    try {
      logger.log(`💾 Saving ${urlType} URL for app ${appId}: ${url}`);
      
      const updateData: any = {};
      
      switch (urlType) {
        case 'vercel':
          updateData.vercelDeploymentUrl = url;
          break;
        case 'github':
          updateData.githubRepoUrl = url;
          break;
        case 'eas-build':
          updateData.easBuildUrl = url;
          if (buildId) updateData.easBuildId = buildId;
          break;
        case 'eas-deployment':
          updateData.easDeploymentUrl = url;
          if (projectId) updateData.easProjectId = projectId;
          break;
        case 'local-apk':
          updateData.localApkPath = url;
          updateData.localApkBuiltAt = new Date();
          break;
        case 'local-aab':
          updateData.localAabPath = url;
          updateData.localAabBuiltAt = new Date();
          break;
        case 'local-ipa':
          updateData.localIpaPath = url;
          updateData.localIpaBuiltAt = new Date();
          break;
      }
      
      updateData.lastDeploymentAt = new Date();
      updateData.deploymentStatus = 'deployed';
      
      await db.update(apps)
        .set(updateData)
        .where(eq(apps.id, appId));
      
      logger.log(`✅ ${urlType} URL saved successfully for app ${appId}`);
      
      // Sync app to Supabase (non-blocking)
      try {
        const { syncAppByIdToSupabase } = await import('../../lib/supabase_app_sync');
        await syncAppByIdToSupabase(appId); // userDisplayName is now optional
      } catch (error) {
        logger.warn('Failed to sync app to Supabase (non-critical):', error);
      }
      
      // Generate preview image for deployed apps (non-blocking, background task)
      if ((urlType === 'vercel' || urlType === 'eas-deployment') && url) {
        try {
          // Load Vault secrets first (including SCREENSHOT_API_KEY)
          const { loadVaultSecretsIntoEnv } = await import('../../lib/vault');
          try {
            await loadVaultSecretsIntoEnv();
            logger.info('Vault secrets loaded for preview image generation');
          } catch (vaultError) {
            logger.warn('Failed to load Vault secrets (non-critical):', vaultError);
          }
          
          // Trigger preview generation in background (don't wait for it)
          const { generateAppPreviewImage } = await import('../../services/preview-image-service');
          const { syncAppToSupabase } = await import('../../lib/supabase');
          const { getWordPressUserDisplayName } = await import('../../lib/supabase');
          
          const app = await db.query.apps.findFirst({
            where: eq(apps.id, appId),
          });
          
          if (app) {
            // Run in background without blocking
            generateAppPreviewImage(appId, app.name, url)
              .then(async (previewImageUrl) => {
                if (previewImageUrl) {
                  logger.info(`✅ Preview image generated for app ${appId}: ${previewImageUrl}`);
                  
                  // Sync preview image URL to Supabase
                  const userDisplayName = getWordPressUserDisplayName();
                  if (userDisplayName) {
                    try {
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
                        previewImageUrl: previewImageUrl, // Include preview image URL
                      }, userDisplayName);
                      logger.info(`✅ Preview image URL synced to Supabase for app ${appId}`);
                    } catch (syncError) {
                      logger.error(`Failed to sync preview image URL to Supabase:`, syncError);
                    }
                  } else {
                    logger.warn('No WordPress user display name, skipping Supabase sync for preview image');
                  }
                } else {
                  logger.warn(`Preview image generation returned null for app ${appId}`);
                }
              })
              .catch((error) => {
                logger.warn(`Background preview image generation failed for app ${appId}:`, error);
              });
          }
        } catch (error) {
          logger.warn('Failed to trigger preview image generation (non-critical):', error);
        }
      }
      
      return { success: true };
    } catch (error: any) {
      logger.error(`❌ Failed to save ${urlType} URL: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // Get all deployment URLs for an app
  ipcMain.handle("url:get-deployments", async (event, { appId }: { appId: number }) => {
    try {
      logger.log(`📋 Getting deployment URLs for app ${appId}`);
      
      const appResult = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      const app = appResult?.[0];
      
      if (!app || typeof app !== 'object') {
        logger.warn(`App ${appId} not found or invalid`);
        return { success: true, deployments: [] };
      }
      
      const deployments = [];
      
      // Safely access all properties with optional chaining
      if (app.vercelDeploymentUrl) {
        deployments.push({
          type: 'vercel',
          name: 'Vercel Deployment',
          url: app.vercelDeploymentUrl,
          projectId: app.vercelProjectId || null,
          lastDeploymentAt: app.lastDeploymentAt || null
        });
      }
      
      if (app.githubRepoUrl) {
        deployments.push({
          type: 'github',
          name: 'GitHub Repository',
          url: app.githubRepoUrl,
          projectId: app.githubRepo || null,
          lastDeploymentAt: app.lastDeploymentAt || null
        });
      }
      
      if (app.easBuildUrl) {
        deployments.push({
          type: 'eas-build',
          name: 'EAS Build',
          url: app.easBuildUrl,
          projectId: app.easProjectId || null,
          buildId: app.easBuildId || null,
          lastDeploymentAt: app.lastDeploymentAt || null
        });
      }
      
      if (app.easDeploymentUrl) {
        deployments.push({
          type: 'eas-deployment',
          name: 'EAS Deployment',
          url: app.easDeploymentUrl,
          projectId: app.easProjectId || null,
          lastDeploymentAt: app.lastDeploymentAt || null
        });
      }
      
      // Local build files - safely check if properties exist
      if (app && typeof app === 'object' && app.localApkPath && typeof app.localApkPath === 'string') {
        deployments.push({
          type: 'local-apk',
          name: 'Local APK Build',
          url: app.localApkPath,
          lastDeploymentAt: (app.localApkBuiltAt ? new Date(app.localApkBuiltAt) : null) || null
        });
      }
      
      if (app && typeof app === 'object' && app.localAabPath && typeof app.localAabPath === 'string') {
        deployments.push({
          type: 'local-aab',
          name: 'Local AAB Build',
          url: app.localAabPath,
          lastDeploymentAt: (app.localAabBuiltAt ? new Date(app.localAabBuiltAt) : null) || null
        });
      }
      
      if (app && typeof app === 'object' && app.localIpaPath && typeof app.localIpaPath === 'string') {
        deployments.push({
          type: 'local-ipa',
          name: 'Local IPA Build',
          url: app.localIpaPath,
          lastDeploymentAt: (app.localIpaBuiltAt ? new Date(app.localIpaBuiltAt) : null) || null
        });
      }
      
      logger.log(`✅ Found ${deployments.length} deployment URLs for app ${appId}`);
      
      return { success: true, deployments };
    } catch (error: any) {
      logger.error(`❌ Failed to get deployment URLs: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // Delete a deployment URL
  ipcMain.handle("url:delete-deployment", async (event, { 
    appId, 
    urlType 
  }: { 
    appId: number; 
    urlType: 'vercel' | 'github' | 'eas-build' | 'eas-deployment' | 'local-apk' | 'local-aab' | 'local-ipa'; 
  }) => {
    try {
      logger.log(`🗑️ Deleting ${urlType} URL for app ${appId}`);
      
      const updateData: any = {};
      
      switch (urlType) {
        case 'vercel':
          updateData.vercelDeploymentUrl = null;
          updateData.vercelProjectId = null;
          break;
        case 'github':
          updateData.githubRepoUrl = null;
          updateData.githubRepo = null;
          break;
        case 'eas-build':
          updateData.easBuildUrl = null;
          updateData.easBuildId = null;
          break;
        case 'eas-deployment':
          updateData.easDeploymentUrl = null;
          updateData.easProjectId = null;
          break;
        case 'local-apk':
          updateData.localApkPath = null;
          updateData.localApkBuiltAt = null;
          break;
        case 'local-aab':
          updateData.localAabPath = null;
          updateData.localAabBuiltAt = null;
          break;
        case 'local-ipa':
          updateData.localIpaPath = null;
          updateData.localIpaBuiltAt = null;
          break;
      }
      
      await db.update(apps)
        .set(updateData)
        .where(eq(apps.id, appId));
      
      logger.log(`✅ ${urlType} URL deleted successfully for app ${appId}`);
      
      return { success: true };
    } catch (error: any) {
      logger.error(`❌ Failed to delete ${urlType} URL: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  logger.info("✅ URL handlers registered successfully");
}
