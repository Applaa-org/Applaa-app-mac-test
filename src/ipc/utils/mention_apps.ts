import { db } from "../../db";
import { getDyadAppPath } from "../../paths/paths";
import { extractCodebase } from "../../utils/codebase";
import { validateChatContext } from "../utils/context_paths_utils";
import log from "electron-log";

const logger = log.scope("mention_apps");

// Helper function to extract codebases from mentioned apps
export async function extractMentionedAppsCodebases(
  mentionedAppNames: string[],
  excludeCurrentAppId?: number,
): Promise<{ appName: string; codebaseInfo: string }[]> {
  if (mentionedAppNames.length === 0) {
    return [];
  }

  // Get all apps with legacy fallback
  let allApps: any[] = [];
  try {
    allApps = await db.query.apps.findMany();
  } catch (err) {
    logger.warn(
      "mention_apps.extractMentionedAppsCodebases: falling back to legacy SELECT due to:",
      err,
    );
    const rows = db.$client
      .prepare(
        "SELECT id, name, path, created_at as createdAt, " +
          "github_org as githubOrg, github_repo as githubRepo, github_branch as githubBranch, " +
          "supabase_project_id as supabaseProjectId, neon_project_id as neonProjectId, " +
          "neon_development_branch_id as neonDevelopmentBranchId, neon_preview_branch_id as neonPreviewBranchId, " +
          "vercel_project_id as vercelProjectId, vercel_project_name as vercelProjectName, vercel_team_id as vercelTeamId, " +
          "vercel_deployment_url as vercelDeploymentUrl, chat_context as chatContext FROM apps"
      )
      .all() as any[];
    allApps = rows.map((row) => {
      if (row.createdAt && typeof row.createdAt === "number") {
        row.createdAt = new Date(row.createdAt * 1000);
      }
      // Set missing column to undefined for compatibility
      row.updatedAt = undefined;
      row.displayName = undefined;
      row.packageId = undefined;
      row.slug = undefined;
      return row;
    });
  }

  const mentionedApps = allApps.filter(
    (app) =>
      mentionedAppNames.some(
        (mentionName) => app.name.toLowerCase() === mentionName.toLowerCase(),
      ) && app.id !== excludeCurrentAppId,
  );

  const results: { appName: string; codebaseInfo: string }[] = [];

  for (const app of mentionedApps) {
    try {
      const appPath = getDyadAppPath(app.path);
      const chatContext = validateChatContext(app.chatContext);

      const { formattedOutput } = await extractCodebase({
        appPath,
        chatContext,
      });

      results.push({
        appName: app.name,
        codebaseInfo: formattedOutput,
      });

      logger.log(`Extracted codebase for mentioned app: ${app.name}`);
    } catch (error) {
      logger.error(`Error extracting codebase for app ${app.name}:`, error);
      // Continue with other apps even if one fails
    }
  }

  return results;
}
