import { db } from "../../db";
import { chats } from "../../db/schema";
import { eq } from "drizzle-orm";
import {
  constructSystemPrompt,
  readAiRules,
} from "../../prompts/system_prompt";
import {
  SUPABASE_AVAILABLE_SYSTEM_PROMPT,
  SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT,
} from "../../prompts/supabase_prompt";
import { getDyadAppPath } from "../../paths/paths";
import log from "electron-log";
import { extractCodebase } from "../../utils/codebase";
import { getSupabaseContext } from "../../supabase_admin/supabase_context";

import { TokenCountParams } from "../ipc_types";
import { TokenCountResult } from "../ipc_types";
import { estimateTokens, getContextWindow } from "../utils/token_utils";
import { createLoggedHandler } from "./safe_handle";
import { validateChatContext } from "../utils/context_paths_utils";
import { readSettings } from "@/main/settings";
import { extractMentionedAppsCodebases } from "../utils/mention_apps";
import { parseAppMentions } from "@/shared/parse_mention_apps";

const logger = log.scope("token_count_handlers");

const handle = createLoggedHandler(logger);

export function registerTokenCountHandlers() {
  handle(
    "chat:count-tokens",
    async (event, req: TokenCountParams): Promise<TokenCountResult> => {
      let chat: any;
      try {
        chat = await db.query.chats.findFirst({
          where: eq(chats.id, req.chatId),
          with: {
            messages: {
              orderBy: (messages, { asc }) => [asc(messages.createdAt)],
            },
            app: true,
          },
        });
      } catch (err) {
        logger.warn("chat:count-tokens: falling back to legacy SELECT due to:", err);
        // Get chat with messages first
        const chatRow = db.$client
          .prepare("SELECT * FROM chats WHERE id = ?")
          .get(req.chatId) as any;
        
        if (!chatRow) {
          throw new Error(`Chat not found: ${req.chatId}`);
        }

        // Get messages separately
        const messagesRows = db.$client
          .prepare("SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC")
          .all(req.chatId) as any[];

        // Get app separately with legacy columns
        let appRow = null;
        if (chatRow.app_id) {
          appRow = db.$client
            .prepare(
              "SELECT id, name, path, created_at as createdAt, updated_at as updatedAt, " +
                "github_org as githubOrg, github_repo as githubRepo, github_branch as githubBranch, " +
                "supabase_project_id as supabaseProjectId, neon_project_id as neonProjectId, " +
                "neon_development_branch_id as neonDevelopmentBranchId, neon_preview_branch_id as neonPreviewBranchId, " +
                "vercel_project_id as vercelProjectId, vercel_project_name as vercelProjectName, vercel_team_id as vercelTeamId, " +
                "vercel_deployment_url as vercelDeploymentUrl, chat_context as chatContext FROM apps WHERE id = ?"
            )
            .get(chatRow.app_id) as any;
          
          if (appRow) {
            if (appRow.createdAt && typeof appRow.createdAt === "number") {
              appRow.createdAt = new Date(appRow.createdAt * 1000);
            }
            if (appRow.updatedAt && typeof appRow.updatedAt === "number") {
              appRow.updatedAt = new Date(appRow.updatedAt * 1000);
            }
            appRow.displayName = undefined;
            appRow.packageId = undefined;
            appRow.slug = undefined;
          }
        }

        // Reconstruct chat object
        chat = {
          ...chatRow,
          messages: messagesRows.map(msg => ({
            ...msg,
            createdAt: msg.created_at ? new Date(msg.created_at * 1000) : undefined,
          })),
          app: appRow,
        };
      }

      if (!chat) {
        throw new Error(`Chat not found: ${req.chatId}`);
      }

      // Prepare message history for token counting
      const messageHistory = chat.messages
        .map((message) => message.content)
        .join("");
      const messageHistoryTokens = estimateTokens(messageHistory);

      // Count input tokens
      const inputTokens = estimateTokens(req.input);

      const settings = readSettings();

      // Parse app mentions from the input
      const mentionedAppNames = parseAppMentions(req.input);

      // Count system prompt tokens
      const appPath = getDyadAppPath(chat.app.path);
      let systemPrompt = constructSystemPrompt({
        aiRules: await readAiRules(appPath),
        chatMode: settings.selectedChatMode,
        appPath: appPath,
      });
      let supabaseContext = "";

      if (chat.app?.supabaseProjectId) {
        systemPrompt += "\n\n" + SUPABASE_AVAILABLE_SYSTEM_PROMPT;
        supabaseContext = await getSupabaseContext({
          supabaseProjectId: chat.app.supabaseProjectId,
        });
      } else if (
        // Neon projects don't need Supabase.
        !chat.app?.neonProjectId
      ) {
        systemPrompt += "\n\n" + SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT;
      }

      const systemPromptTokens = estimateTokens(systemPrompt + supabaseContext);

      // Extract codebase information if app is associated with the chat
      let codebaseInfo = "";
      let codebaseTokens = 0;

      if (chat.app) {
        const appPath = getDyadAppPath(chat.app.path);
        codebaseInfo = (
          await extractCodebase({
            appPath,
            chatContext: validateChatContext(chat.app.chatContext),
          })
        ).formattedOutput;
        codebaseTokens = estimateTokens(codebaseInfo);
        logger.log(
          `Extracted codebase information from ${appPath}, tokens: ${codebaseTokens}`,
        );
      }

      // Extract codebases for mentioned apps
      const mentionedAppsCodebases = await extractMentionedAppsCodebases(
        mentionedAppNames,
        chat.app?.id, // Exclude current app
      );

      // Calculate tokens for mentioned apps
      let mentionedAppsTokens = 0;
      if (mentionedAppsCodebases.length > 0) {
        const mentionedAppsContent = mentionedAppsCodebases
          .map(
            ({ appName, codebaseInfo }) =>
              `\n\n=== Referenced App: ${appName} ===\n${codebaseInfo}`,
          )
          .join("");

        mentionedAppsTokens = estimateTokens(mentionedAppsContent);

        logger.log(
          `Extracted ${mentionedAppsCodebases.length} mentioned app codebases, tokens: ${mentionedAppsTokens}`,
        );
      }

      // Calculate total tokens
      const totalTokens =
        messageHistoryTokens +
        inputTokens +
        systemPromptTokens +
        codebaseTokens +
        mentionedAppsTokens;

      return {
        totalTokens,
        messageHistoryTokens,
        codebaseTokens,
        mentionedAppsTokens,
        inputTokens,
        systemPromptTokens,
        contextWindow: await getContextWindow(),
      };
    },
  );
}
