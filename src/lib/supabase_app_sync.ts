/**
 * Helper module for syncing app data to Supabase
 * This can be imported and used in any handler that updates app data
 */

import { db } from '../db';
import { apps } from '../db/schema';
import { eq } from 'drizzle-orm';
import { syncAppToSupabase } from './supabase';
import log from 'electron-log';

/**
 * Sync an app to Supabase by app ID
 * This function fetches the app from the database and syncs it to Supabase
 * @param appId - The ID of the app to sync
 * @param userDisplayName - The WordPress user display_name (required for syncing)
 */
export async function syncAppByIdToSupabase(appId: number, userDisplayName?: string): Promise<void> {
  try {
    if (!userDisplayName) {
      log.warn(`Skipping Supabase sync for app ${appId}: No WordPress user display_name provided`);
      return; // Don't throw, just skip silently
    }

    const app = await db.query.apps.findFirst({ 
      where: eq(apps.id, appId) 
    });

    if (!app || typeof app !== 'object') {
      log.warn(`App ${appId} not found or invalid, cannot sync to Supabase`);
      return;
    }

    // Debug: Log showInHub value
    log.info(`📋 App ${appId} showInHub value from DB:`, {
      raw: app.showInHub,
      type: typeof app.showInHub,
      converted: app.showInHub === true || app.showInHub === 1 || (typeof app.showInHub === 'boolean' && app.showInHub),
    });

    try {
      const result = await syncAppToSupabase({
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
      }, userDisplayName);

      if (!result) {
        log.error(`❌ App ${appId} (${app.name}) sync returned null`);
        throw new Error(`Sync returned null for app ${appId}`);
      }
      log.info(`✅ App ${appId} (${app.name}) synced successfully, Supabase ID: ${result.id}`);
    } catch (error: any) {
      log.error(`❌ Failed to sync app ${appId} (${app.name}) to Supabase:`, error);
      log.error(`   Error message: ${error.message}`);
      log.error(`   Error code: ${error.code || 'N/A'}`);
      log.error(`   Error details: ${error.details || 'N/A'}`);
      log.error(`   Error hint: ${error.hint || 'N/A'}`);
      // Re-throw so the sync-all handler can count it as failed and show the error
      throw error;
    }
  } catch (error: any) {
    log.error(`❌ Exception syncing app ${appId}:`, error);
    // Re-throw so the sync-all handler can count it as failed
    throw error;
  }
}

