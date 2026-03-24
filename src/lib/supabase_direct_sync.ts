/**
 * Direct API call version of Supabase sync for debugging
 * This uses fetch() so errors show up in the browser network tab
 */

import log from 'electron-log';

// Helper to get WordPress display_name from settings
function getWordPressUserDisplayName(): string | null {
  try {
    const { readSettings } = require('../main/settings');
    const settings = readSettings();
    return settings.wordpressAuth?.user?.display_name || null;
  } catch (error) {
    log.warn('Failed to get WordPress user display_name:', error);
    return null;
  }
}

export async function syncAppToSupabaseDirect(
  appData: {
    id: number;
    name: string;
    path: string;
    appType?: string | null;
    status?: string | null;
    githubOrg?: string | null;
    githubRepo?: string | null;
    githubBranch?: string | null;
    githubRepoUrl?: string | null;
    vercelProjectId?: string | null;
    vercelProjectName?: string | null;
    vercelTeamId?: string | null;
    vercelDeploymentUrl?: string | null;
    supabaseProjectId?: string | null;
    neonProjectId?: string | null;
    neonDevelopmentBranchId?: string | null;
    neonPreviewBranchId?: string | null;
    easBuildUrl?: string | null;
    easDeploymentUrl?: string | null;
    easProjectId?: string | null;
    easBuildId?: string | null;
    localApkPath?: string | null;
    localAabPath?: string | null;
    localIpaPath?: string | null;
    localApkBuiltAt?: number | null;
    localAabBuiltAt?: number | null;
    localIpaBuiltAt?: number | null;
    deploymentStatus?: string | null;
    lastDeploymentAt?: number | null;
    deploymentNotes?: string | null;
  },
  userDisplayName: string
) {
  if (!userDisplayName) {
    throw new Error('No WordPress user display_name provided');
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    throw new Error('Supabase not configured');
  }

  const appDataToSync = {
    user_display_name: userDisplayName,
    local_app_id: appData.id,
    app_name: appData.name,
    app_type: (appData.appType as 'web' | 'mobile' | 'godot') || 'web',
    local_path: appData.path,
    status: appData.status || 'ready',
    github_org: appData.githubOrg || null,
    github_repo: appData.githubRepo || null,
    github_branch: appData.githubBranch || null,
    github_repo_url: appData.githubRepoUrl || null,
    vercel_project_id: appData.vercelProjectId || null,
    vercel_project_name: appData.vercelProjectName || null,
    vercel_team_id: appData.vercelTeamId || null,
    vercel_deployment_url: appData.vercelDeploymentUrl || null,
    supabase_project_id: appData.supabaseProjectId || null,
    neon_project_id: appData.neonProjectId || null,
    neon_development_branch_id: appData.neonDevelopmentBranchId || null,
    neon_preview_branch_id: appData.neonPreviewBranchId || null,
    eas_build_url: appData.easBuildUrl || null,
    eas_deployment_url: appData.easDeploymentUrl || null,
    eas_project_id: appData.easProjectId || null,
    eas_build_id: appData.easBuildId || null,
    local_apk_path: appData.localApkPath || null,
    local_aab_path: appData.localAabPath || null,
    local_ipa_path: appData.localIpaPath || null,
    local_apk_built_at: appData.localApkBuiltAt ? new Date(appData.localApkBuiltAt * 1000).toISOString() : null,
    local_aab_built_at: appData.localAabBuiltAt ? new Date(appData.localAabBuiltAt * 1000).toISOString() : null,
    local_ipa_built_at: appData.localIpaBuiltAt ? new Date(appData.localIpaBuiltAt * 1000).toISOString() : null,
    deployment_status: appData.deploymentStatus || 'not_deployed',
    last_deployment_at: appData.lastDeploymentAt ? new Date(appData.lastDeploymentAt * 1000).toISOString() : null,
    deployment_notes: appData.deploymentNotes || null,
  };

  // Use direct fetch API call - this will show up in network tab
  const response = await fetch(`${supabaseUrl}/rest/v1/user_apps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(appDataToSync),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText };
    }
    
    const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    (error as any).code = errorData.code;
    (error as any).details = errorData.details;
    (error as any).hint = errorData.hint;
    (error as any).status = response.status;
    (error as any).response = errorData;
    throw error;
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

