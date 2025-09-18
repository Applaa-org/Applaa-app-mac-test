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
    urlType: 'vercel' | 'github' | 'eas-build' | 'eas-deployment'; 
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
      }
      
      updateData.lastDeploymentAt = new Date();
      updateData.deploymentStatus = 'deployed';
      
      await db.update(apps)
        .set(updateData)
        .where(eq(apps.id, appId));
      
      logger.log(`✅ ${urlType} URL saved successfully for app ${appId}`);
      
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
      
      const [app] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      
      if (!app) {
        throw new Error("App not found");
      }
      
      const deployments = [];
      
      if (app.vercelDeploymentUrl) {
        deployments.push({
          type: 'vercel',
          name: 'Vercel Deployment',
          url: app.vercelDeploymentUrl,
          projectId: app.vercelProjectId,
          lastDeploymentAt: app.lastDeploymentAt
        });
      }
      
      if (app.githubRepoUrl) {
        deployments.push({
          type: 'github',
          name: 'GitHub Repository',
          url: app.githubRepoUrl,
          projectId: app.githubRepo,
          lastDeploymentAt: app.lastDeploymentAt
        });
      }
      
      if (app.easBuildUrl) {
        deployments.push({
          type: 'eas-build',
          name: 'EAS Build',
          url: app.easBuildUrl,
          projectId: app.easProjectId,
          buildId: app.easBuildId,
          lastDeploymentAt: app.lastDeploymentAt
        });
      }
      
      if (app.easDeploymentUrl) {
        deployments.push({
          type: 'eas-deployment',
          name: 'EAS Deployment',
          url: app.easDeploymentUrl,
          projectId: app.easProjectId,
          lastDeploymentAt: app.lastDeploymentAt
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
    urlType: 'vercel' | 'github' | 'eas-build' | 'eas-deployment'; 
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
