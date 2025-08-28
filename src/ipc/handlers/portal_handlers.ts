import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getDyadAppPath } from "../../paths/paths";
import { spawn } from "child_process";
import fs from "node:fs";
import git from "isomorphic-git";
import { gitCommit } from "../utils/git_utils";
import { storeDbTimestampAtCurrentVersion } from "../utils/neon_timestamp_utils";

const logger = log.scope("portal_handlers");
const handle = createLoggedHandler(logger);

async function getApp(appId: number) {
  try {
    const app = await db.query.apps.findFirst({
      where: eq(apps.id, appId),
    });
    if (!app) {
      throw new Error(`App with id ${appId} not found`);
    }
    return app as any;
  } catch (err) {
    logger.warn(
      "portal_handlers.getApp: falling back to legacy SELECT due to:",
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
    if (!row) {
      throw new Error(`App with id ${appId} not found`);
    }
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

export function registerPortalHandlers() {
  handle(
    "portal:migrate-create",
    async (_, { appId }: { appId: number }): Promise<{ output: string }> => {
      const app = await getApp(appId);
      const appPath = getDyadAppPath(app.path);

      // Run the migration command
      const migrationOutput = await new Promise<string>((resolve, reject) => {
        logger.info(`Running migrate:create for app ${appId} at ${appPath}`);

        const process = spawn("npm run migrate:create -- --skip-empty", {
          cwd: appPath,
          shell: true,
          stdio: "pipe",
        });

        let stdout = "";
        let stderr = "";

        process.stdout?.on("data", (data) => {
          const output = data.toString();
          stdout += output;
          logger.info(`migrate:create stdout: ${output}`);
          if (output.includes("created or renamed from another")) {
            try {
              if (process.stdin && !process.stdin.destroyed && !process.killed) {
                process.stdin.write(`\r\n`);
                logger.info(
                  `App ${appId} (PID: ${process.pid}) wrote enter to stdin to automatically respond to drizzle migrate input`,
                );
              }
            } catch (error) {
              logger.warn(`Failed to write to stdin for migrate process ${appId}:`, error);
            }
          }
        });

        process.stderr?.on("data", (data) => {
          const output = data.toString();
          stderr += output;
          logger.warn(`migrate:create stderr: ${output}`);
        });

        process.on("close", (code) => {
          const combinedOutput =
            stdout + (stderr ? `\n\nErrors/Warnings:\n${stderr}` : "");

          if (code === 0) {
            if (stdout.includes("Migration created at")) {
              logger.info(
                `migrate:create completed successfully for app ${appId}`,
              );
              resolve(combinedOutput);
            } else {
              logger.error(
                `migrate:create completed successfully for app ${appId} but no migration was created`,
              );
              reject(
                new Error(
                  "No migration was created because no changes were found.",
                ),
              );
            }
          } else {
            logger.error(
              `migrate:create failed for app ${appId} with exit code ${code}`,
            );
            const errorMessage = `Migration creation failed (exit code ${code})\n\n${combinedOutput}`;
            reject(new Error(errorMessage));
          }
        });

        process.on("error", (err) => {
          logger.error(`Failed to spawn migrate:create for app ${appId}:`, err);
          const errorMessage = `Failed to run migration command: ${err.message}\n\nOutput:\n${stdout}\n\nErrors:\n${stderr}`;
          reject(new Error(errorMessage));
        });
      });

      if (app.neonProjectId && app.neonDevelopmentBranchId) {
        try {
          await storeDbTimestampAtCurrentVersion({
            appId: app.id,
          });
        } catch (error) {
          logger.error(
            "Error storing Neon timestamp at current version:",
            error,
          );
          throw new Error(
            "Could not store Neon timestamp at current version; database versioning functionality is not working: " +
              error,
          );
        }
      }

      // Stage all changes and commit
      try {
        await git.add({
          fs,
          dir: appPath,
          filepath: ".",
        });

        const commitHash = await gitCommit({
          path: appPath,
          message: "[dyad] Generate database migration file",
        });

        logger.info(`Successfully committed migration changes: ${commitHash}`);
        return { output: migrationOutput };
      } catch (gitError) {
        logger.error(`Migration created but failed to commit: ${gitError}`);
        throw new Error(`Migration created but failed to commit: ${gitError}`);
      }
    },
  );
}
