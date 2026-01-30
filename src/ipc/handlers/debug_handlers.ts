import { ipcMain } from "electron";
import { platform, arch } from "os";
import { SystemDebugInfo, ChatLogsData } from "../ipc_types";
import { readSettings } from "../../main/settings";

import log from "electron-log";
import path from "path";
import fs from "fs";
import { execAsync } from "../utils/runShellCommand";
import { extractCodebase } from "../../utils/codebase";
import { db } from "../../db";
import { chats, apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getDyadAppPath } from "../../paths/paths";
import { LargeLanguageModel } from "@/lib/schemas";
import { validateChatContext } from "../utils/context_paths_utils";

async function getAppSafe(appId: number): Promise<any> {
  try {
    const app = await db.query.apps.findFirst({
      where: eq(apps.id, appId),
    });
    return app as any;
  } catch (err) {
    console.warn(
      "debug_handlers.getAppSafe: falling back to legacy SELECT due to:",
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

// Shared function to get system debug info
async function getSystemDebugInfo({
  linesOfLogs,
  level,
}: {
  linesOfLogs: number;
  level: "warn" | "info";
}): Promise<SystemDebugInfo> {
  console.log("Getting system debug info");

  // Get Node.js and pnpm versions
  let nodeVersion: string | null = null;
  let pnpmVersion: string | null = null;
  let nodePath: string | null = null;
  try {
    const nodeResult = await execAsync("node --version");
    nodeVersion = nodeResult.stdout.trim();
  } catch (err) {
    console.error("Failed to get Node.js version:", err);
  }

  try {
    const pnpmResult = await execAsync("pnpm --version");
    pnpmVersion = pnpmResult.stdout.trim();
  } catch (err) {
    console.error("Failed to get pnpm version:", err);
  }

  try {
    if (platform() === "win32") {
      const nodePathResult = await execAsync("where.exe node");
      nodePath = nodePathResult.stdout.trim();
    } else {
      const nodePathResult = await execAsync("which node");
      nodePath = nodePathResult.stdout.trim();
    }
  } catch (err) {
    console.error("Failed to get node path:", err);
  }

  // Get Dyad version from package.json
  const packageJsonPath = path.resolve(__dirname, "..", "..", "package.json");
  let dyadVersion = "unknown";
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    dyadVersion = packageJson.version;
  } catch (err) {
    console.error("Failed to read package.json:", err);
  }

  // Get telemetry info from settings
  const settings = readSettings();
  const telemetryId = settings.telemetryUserId || "unknown";

  // Get logs from electron-log
  let logs = "";
  try {
    const logPath = log.transports.file.getFile().path;
    if (fs.existsSync(logPath)) {
      const logContent = fs.readFileSync(logPath, "utf8");

      const logLines = logContent.split("\n").filter((line) => {
        if (level === "info") {
          return true;
        }
        // Example line:
        // [2025-06-09 13:55:05.209] [debug] (runShellCommand) Command "which node" succeeded with code 0: /usr/local/bin/node
        const logLevelRegex = /\[.*?\] \[(\w+)\]/;
        const match = line.match(logLevelRegex);
        if (!match) {
          // Include non-matching lines (like stack traces) when filtering for warnings
          return true;
        }
        const logLevel = match[1];
        if (level === "warn") {
          return logLevel === "warn" || logLevel === "error";
        }
        return true;
      });

      logs = logLines.slice(-linesOfLogs).join("\n");
    }
  } catch (err) {
    console.error("Failed to read log file:", err);
    logs = `Error reading logs: ${err}`;
  }

  return {
    nodeVersion,
    pnpmVersion,
    nodePath,
    telemetryId,
    selectedLanguageModel:
      serializeModelForDebug(settings.selectedModel) || "unknown",
    telemetryConsent: settings.telemetryConsent || "unknown",
    telemetryUrl: "https://us.i.posthog.com", // Hardcoded from renderer.tsx
    dyadVersion,
    platform: process.platform,
    architecture: arch(),
    logs,
  };
}

export function registerDebugHandlers() {
  ipcMain.handle(
    "get-system-debug-info",
    async (): Promise<SystemDebugInfo> => {
      console.log("IPC: get-system-debug-info called");
      return getSystemDebugInfo({
        linesOfLogs: 20,
        level: "warn",
      });
    },
  );

  ipcMain.handle(
    "get-chat-logs",
    async (_, chatId: number): Promise<ChatLogsData> => {
      console.log(`IPC: get-chat-logs called for chat ${chatId}`);

      try {
        // We can retrieve a lot more lines here because we're not limited by the
        // GitHub issue URL length limit.
        const debugInfo = await getSystemDebugInfo({
          linesOfLogs: 1_000,
          level: "info",
        });

        // Get chat data from database
        const chatRecord = await db.query.chats.findFirst({
          where: eq(chats.id, chatId),
          with: {
            messages: {
              orderBy: (messages, { asc }) => [asc(messages.createdAt)],
            },
          },
        });

        if (!chatRecord) {
          throw new Error(`Chat with ID ${chatId} not found`);
        }

        // Format the chat to match the Chat interface
        const chat = {
          id: chatRecord.id,
          title: chatRecord.title || "Untitled Chat",
          messages: chatRecord.messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            approvalState: msg.approvalState,
          })),
        };

        // Get app data from database
        const app = await getAppSafe(chatRecord.appId);

        if (!app) {
          throw new Error(`App with ID ${chatRecord.appId} not found`);
        }

        // Extract codebase
        const appPath = getDyadAppPath(app.path);
        const codebase = (
          await extractCodebase({
            appPath,
            chatContext: validateChatContext(app.chatContext),
          })
        ).formattedOutput;

        return {
          debugInfo,
          chat,
          codebase,
        };
      } catch (error) {
        console.error(`Error in get-chat-logs:`, error);
        throw error;
      }
    },
  );

  ipcMain.handle("console-db-data", async () => {
    try {
      const { db } = await import("@/db");
      const { apps, chats, messages, versions } = await import("@/db/schema");
      const { sql } = await import("drizzle-orm");
      
      // Get all apps with formatted data
      const allApps = await db.select().from(apps);
      const formattedApps = allApps.map((app) => ({
        id: app.id,
        name: app.name,
        path: app.path,
        type: app.appType || 'web',
        status: app.status || 'ready',
        createdAt: app.createdAt ? new Date(app.createdAt).toISOString() : null,
        vercelDeploymentUrl: app.vercelDeploymentUrl || null,
        vercelProjectId: app.vercelProjectId || null,
        vercelProjectName: app.vercelProjectName || null,
        githubRepoUrl: app.githubRepoUrl || null,
        githubOrg: app.githubOrg || null,
        githubRepo: app.githubRepo || null,
        supabaseProjectId: app.supabaseProjectId || null,
        neonProjectId: app.neonProjectId || null,
        easDeploymentUrl: app.easDeploymentUrl || null,
        easBuildUrl: app.easBuildUrl || null,
        deploymentStatus: app.deploymentStatus || 'not_deployed',
        lastDeploymentAt: app.lastDeploymentAt ? new Date(app.lastDeploymentAt).toISOString() : null,
      }));

      // Get all chats
      const allChats = await db.select().from(chats);
      const formattedChats = allChats.map((chat) => ({
        id: chat.id,
        appId: chat.appId,
        title: chat.title || 'Untitled',
        createdAt: chat.createdAt ? new Date(chat.createdAt).toISOString() : null,
      }));

      // Get message count per chat
      const messageCounts = await db.select({
        chatId: messages.chatId,
        count: sql<number>`COUNT(*)`.as('count'),
      }).from(messages).groupBy(messages.chatId);

      // Get all versions
      const allVersions = await db.select().from(versions);
      const formattedVersions = allVersions.map((version) => ({
        id: version.id,
        appId: version.appId,
        commitHash: version.commitHash,
        createdAt: version.createdAt ? new Date(version.createdAt).toISOString() : null,
      }));

      const result = {
        success: true,
        summary: {
          totalApps: allApps.length,
          totalChats: allChats.length,
          totalMessages: (await db.select().from(messages)).length,
          totalVersions: allVersions.length,
        },
        apps: formattedApps,
        chats: formattedChats,
        versions: formattedVersions,
        messageCounts: messageCounts.map(m => ({ chatId: m.chatId, count: m.count })),
      };

      // Also log to main process console for debugging
      console.log("\n🔍 Applaa Database Data");
      console.log("═".repeat(80));
      console.log(`📊 Summary: ${result.summary.totalApps} apps, ${result.summary.totalChats} chats, ${result.summary.totalMessages} messages`);
      console.log("\n📋 Apps:");
      formattedApps.forEach((app) => {
        console.log(`  [${app.id}] ${app.name} (${app.type})`);
        if (app.vercelDeploymentUrl) console.log(`    → Vercel: ${app.vercelDeploymentUrl}`);
        if (app.githubRepoUrl) console.log(`    → GitHub: ${app.githubRepoUrl}`);
        if (app.easDeploymentUrl) console.log(`    → EAS: ${app.easDeploymentUrl}`);
      });
      
      return result;
    } catch (error: any) {
      console.error("❌ Error reading database:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  });

}

function serializeModelForDebug(model: LargeLanguageModel): string {
  return `${model.provider}:${model.name} | customId: ${model.customModelId}`;
}
