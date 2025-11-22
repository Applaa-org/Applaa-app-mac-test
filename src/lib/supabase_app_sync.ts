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
export async function syncAppByIdToSupabase(appId: number, userDisplayName: string): Promise<void> {
  try {
    if (!userDisplayName) {
      const error = new Error('No WordPress user display_name provided. Please log in with WordPress.');
      log.error(`❌ Cannot sync app ${appId} to Supabase:`, error.message);
      throw error;
    }

    const app = await db.query.apps.findFirst({ 
      where: eq(apps.id, appId) 
    });

    if (!app) {
      log.warn(`App ${appId} not found, cannot sync to Supabase`);
      return;
    }

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
        localApkPath: app.localApkPath,
        localAabPath: app.localAabPath,
        localIpaPath: app.localIpaPath,
        localApkBuiltAt: app.localApkBuiltAt ? Number(app.localApkBuiltAt) : null,
        localAabBuiltAt: app.localAabBuiltAt ? Number(app.localAabBuiltAt) : null,
        localIpaBuiltAt: app.localIpaBuiltAt ? Number(app.localIpaBuiltAt) : null,
        deploymentStatus: app.deploymentStatus,
        lastDeploymentAt: app.lastDeploymentAt ? Number(app.lastDeploymentAt) : null,
        deploymentNotes: app.deploymentNotes,
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

