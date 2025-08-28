import { db } from "@/db";
import { apps } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  AppChatContext,
  AppChatContextSchema,
  ContextPathResults,
} from "@/lib/schemas";
import { estimateTokens } from "../utils/token_utils";
import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import { getDyadAppPath } from "@/paths/paths";
import { extractCodebase } from "@/utils/codebase";
import { validateChatContext } from "../utils/context_paths_utils";

const logger = log.scope("context_paths_handlers");
const handle = createLoggedHandler(logger);

async function getAppSafe(appId: number): Promise<any> {
  try {
    const app = await db.query.apps.findFirst({
      where: eq(apps.id, appId),
    });
    return app as any;
  } catch (err) {
    logger.warn(
      "context_paths_handlers.getAppSafe: falling back to legacy SELECT due to:",
      err,
    );
    const row = db.$client
      .prepare(
        "SELECT id, name, path, created_at as createdAt, updated_at as updatedAt, " +
          "github_org as githubOrg, github_repo as githubRepo, github_branch as githubBranch, " +
          "supabase_project_id as supabaseProjectId, neon_project_id as neonProjectId, " +
          "neon_development_branch_id as neonDevelopmentBranchId, neon_preview_branch_id as neonPreviewBranchId, " +
          "vercel_project_id as vercelProjectId, vercel_project_name as vercelProjectName, vercel_team_id as vercelTeamId, " +
          "vercel_deployment_url as vercelDeploymentUrl, chat_context as chatContext FROM apps WHERE id = ?"
      )
      .get(appId) as any;
    if (!row) return undefined;
    if (row.createdAt && typeof row.createdAt === "number") {
      row.createdAt = new Date(row.createdAt * 1000);
    }
    if (row.updatedAt && typeof row.updatedAt === "number") {
      row.updatedAt = new Date(row.updatedAt * 1000);
    }
    row.displayName = undefined;
    row.packageId = undefined;
    row.slug = undefined;
    return row;
  }
}

export function registerContextPathsHandlers() {
  handle(
    "get-context-paths",
    async (_, { appId }: { appId: number }): Promise<ContextPathResults> => {
      z.object({ appId: z.number() }).parse({ appId });

      const app = await getAppSafe(appId);

      if (!app) {
        throw new Error("App not found");
      }

      if (!app.path) {
        throw new Error("App path not set");
      }
      const appPath = getDyadAppPath(app.path);

      const results: ContextPathResults = {
        contextPaths: [],
        smartContextAutoIncludes: [],
        excludePaths: [],
      };
      const { contextPaths, smartContextAutoIncludes, excludePaths } =
        validateChatContext(app.chatContext);
      for (const contextPath of contextPaths) {
        const { formattedOutput, files } = await extractCodebase({
          appPath,
          chatContext: {
            contextPaths: [contextPath],
            smartContextAutoIncludes: [],
          },
        });
        const totalTokens = estimateTokens(formattedOutput);

        results.contextPaths.push({
          ...contextPath,
          files: files.length,
          tokens: totalTokens,
        });
      }

      for (const contextPath of smartContextAutoIncludes) {
        const { formattedOutput, files } = await extractCodebase({
          appPath,
          chatContext: {
            contextPaths: [contextPath],
            smartContextAutoIncludes: [],
          },
        });
        const totalTokens = estimateTokens(formattedOutput);

        results.smartContextAutoIncludes.push({
          ...contextPath,
          files: files.length,
          tokens: totalTokens,
        });
      }

      for (const excludePath of excludePaths || []) {
        const { formattedOutput, files } = await extractCodebase({
          appPath,
          chatContext: {
            contextPaths: [excludePath],
            smartContextAutoIncludes: [],
          },
        });
        const totalTokens = estimateTokens(formattedOutput);

        results.excludePaths.push({
          ...excludePath,
          files: files.length,
          tokens: totalTokens,
        });
      }
      return results;
    },
  );

  handle(
    "set-context-paths",
    async (
      _,
      { appId, chatContext }: { appId: number; chatContext: AppChatContext },
    ) => {
      const schema = z.object({
        appId: z.number(),
        chatContext: AppChatContextSchema,
      });
      schema.parse({ appId, chatContext });

      await db.update(apps).set({ chatContext }).where(eq(apps.id, appId));
    },
  );
}
