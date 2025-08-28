import { db } from "../../db";
import { messages, apps, chats } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getDyadAppPath } from "../../paths/paths";
import { executeAddDependency } from "../processors/executeAddDependency";
import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";

const logger = log.scope("dependency_handlers");
const handle = createLoggedHandler(logger);

export function registerDependencyHandlers() {
  handle(
    "chat:add-dep",
    async (
      _event,
      { chatId, packages }: { chatId: number; packages: string[] },
    ): Promise<void> => {
      // Find the message from the database
      const foundMessages = await db.query.messages.findMany({
        where: eq(messages.chatId, chatId),
      });

      // Find the chat first
      const chat = await db.query.chats.findFirst({
        where: eq(chats.id, chatId),
      });

      if (!chat) {
        throw new Error(`Chat ${chatId} not found`);
      }

      // Get the app using the appId from the chat with legacy fallback
      let app: any;
      try {
        app = await db.query.apps.findFirst({
          where: eq(apps.id, chat.appId),
        });
      } catch (err) {
        logger.warn(
          "dependency_handlers: falling back to legacy SELECT due to:",
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
          .get(chat.appId) as any;
        if (row) {
          if (row.createdAt && typeof row.createdAt === "number") {
            row.createdAt = new Date(row.createdAt * 1000);
          }
          if (row.updatedAt && typeof row.updatedAt === "number") {
            row.updatedAt = new Date(row.updatedAt * 1000);
          }
          row.displayName = undefined;
          row.packageId = undefined;
          row.slug = undefined;
          app = row;
        }
      }

      if (!app) {
        throw new Error(`App for chat ${chatId} not found`);
      }

      const message = [...foundMessages]
        .reverse()
        .find((m) =>
          m.content.includes(
            `<dyad-add-dependency packages="${packages.join(" ")}">`,
          ),
        );

      if (!message) {
        throw new Error(
          `Message with packages ${packages.join(", ")} not found`,
        );
      }

      executeAddDependency({
        packages,
        message,
        appPath: getDyadAppPath(app.path),
      });
    },
  );
}
