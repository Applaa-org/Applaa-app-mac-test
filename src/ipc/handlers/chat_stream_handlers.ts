import { v4 as uuidv4 } from "uuid";
import { ipcMain } from "electron";
import {
  CoreMessage,
  TextPart,
  ImagePart,
  streamText,
  ToolSet,
  TextStreamPart,
} from "ai";
import { db } from "../../db";
import { chats, messages, apps } from "../../db/schema";
import { and, eq, isNull } from "drizzle-orm";
import {
  constructSystemPrompt,
  constructCacheableSystemPrompt,
  readAiRules,
} from "../../prompts/system_prompt";
import { detectAppType } from "../utils/preview_integration";
import {
  optimizeForProvider,
  costOptimizationService
} from "../utils/cost_optimization_service";
import {
  createCacheableSystemPrompt,
  getCachingConfig
} from "../utils/prompt_caching";
import {
  SUPABASE_AVAILABLE_SYSTEM_PROMPT,
  SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT,
} from "../../prompts/supabase_prompt";
import {
  getPostgresAvailablePrompt,
  POSTGRES_NOT_AVAILABLE_SYSTEM_PROMPT,
} from "../../prompts/postgres_prompt";
import { getDyadAppPath } from "../../paths/paths";
import { readSettings } from "../../main/settings";
import type { ChatResponseEnd, ChatStreamParams } from "../ipc_types";
import { extractCodebase, readFileWithCache } from "../../utils/codebase";
import { processFullResponseActions } from "../processors/response_processor";
import { streamTestResponse, getTestResponse } from "./testing_chat_handlers";
import { getModelClient, ModelClient } from "../utils/get_model_client";
import log from "electron-log";
import {
  getSupabaseContext,
  getSupabaseClientCode,
} from "../../supabase_admin/supabase_context";
import { SUMMARIZE_CHAT_SYSTEM_PROMPT } from "../../prompts/summarize_chat_system_prompt";
import fs from "node:fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { readFile, writeFile, unlink } from "fs/promises";
import { getMaxTokens, getTemperature } from "../utils/token_utils";
import { MAX_CHAT_TURNS_IN_CONTEXT } from "../../constants/settings_constants";
import { validateChatContext } from "../utils/context_paths_utils";
import { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";

import { getExtraProviderOptions } from "../utils/thinking_utils";
import { checkCredits, deductCredits } from "../../services/credit_service";
import { trackTokenUsage } from "../../services/token_tracking_service";
import { MAX_CREDITS_PER_MESSAGE, creditsFromTokens } from "../../utils/credit_costs";
import { getUserId } from "./credit_handlers";

import { safeSend } from "../utils/safe_sender";
import { cleanFullResponse } from "../utils/cleanFullResponse";
import { generateProblemReport } from "../processors/tsc";
import { createProblemFixPrompt } from "../../shared/problem_prompt";
import { AsyncVirtualFileSystem } from "../../../shared/VirtualFilesystem";
import { onChatStreamStart, onLLMGenerationStart, onLLMGenerationComplete } from "../utils/preview_integration";
import {
  getDyadAddDependencyTags,
  getDyadWriteTags,
  getDyadDeleteTags,
  getDyadRenameTags,
  getSchemaCreationTags,
} from "../utils/dyad_tag_parser";
import { fileExists } from "../utils/file_utils";
import { FileUploadsState } from "../utils/file_uploads_state";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { extractMentionedAppsCodebases } from "../utils/mention_apps";
import { parseAppMentions } from "../../shared/parse_mention_apps";

// 🚀 PERFORMANCE: System prompt and codebase caching per app
interface CacheEntry {
  systemPrompt: string;
  codebaseInfo: string;
  codebaseHash: string;
  timestamp: number;
}

const systemPromptCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache - extended for better performance

// 🚀 PERFORMANCE: Pre-warm cache for active apps
const activeAppsCache = new Set<number>();

/**
 * 🚀 PERFORMANCE: Pre-warm system prompt cache for an app
 * Call this when an app is selected to reduce first-chat latency
 */
export async function preWarmAppCache(appId: number, appPath: string): Promise<void> {
  if (activeAppsCache.has(appId)) {
    logger.log(`🚀 Cache already warmed for app ${appId}`);
    return;
  }

  try {
    logger.log(`🚀 Pre-warming cache for app ${appId}`);

    // Fetch app from database to get appType
    const appFromDb = await db.query.apps.findFirst({
      where: eq(apps.id, appId),
    });

    // Extract codebase and build system prompt in background
    const extracted = await extractCodebase({
      appPath,
      chatContext: { messages: [], files: [] }, // Minimal context for pre-warming
    });

    const baseSystemPrompt = constructSystemPrompt({
      aiRules: await readAiRules(appPath),
      chatMode: 'build', // Default mode
      appPath: appPath,
      appType: appFromDb?.appType, // Pass appType from database
    });

    const cacheKey = `${appId}-${JSON.stringify({ messages: [], files: [] })}`;
    const now = Date.now();

    systemPromptCache.set(cacheKey, {
      systemPrompt: baseSystemPrompt,
      codebaseInfo: extracted.formattedOutput,
      codebaseHash: require('crypto').createHash('md5').update(extracted.formattedOutput).digest('hex'),
      timestamp: now,
    });

    activeAppsCache.add(appId);
    logger.log(`✅ Pre-warmed cache for app ${appId}`);

  } catch (error) {
    logger.warn(`⚠️ Failed to pre-warm cache for app ${appId}:`, error);
  }
}

type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

const logger = log.scope("chat_stream_handlers");

// Track active streams for cancellation
const activeStreams = new Map<number, AbortController>();

// Track partial responses for cancelled streams
const partialResponses = new Map<number, string>();

// Track partial file edits during streaming
interface PartialFileEdit {
  path: string;
  content: string;
  description?: string;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const partialFileEdits = new Map<number, PartialFileEdit[]>();

// Periodic persistence interval (save every 2 seconds during streaming)
const PERSISTENCE_INTERVAL = 2000;

// Performance optimization constants
const MIN_CHARS_FOR_AUTOSAVE = 800; // Minimum chars since last save
const MAX_AUTOSAVE_INTERVAL = 10000; // Max 1 write per 10 seconds
const UI_UPDATE_THROTTLE_MS = 50; // Reduced from 100ms to 50ms
const MIN_CHARS_FOR_UI_UPDATE = 120; // Minimum chars since last UI update

// Directory for storing temporary files
const TEMP_DIR = path.join(os.tmpdir(), "dyad-attachments");

// Common helper functions
const TEXT_FILE_EXTENSIONS = [
  ".md",
  ".txt",
  ".json",
  ".csv",
  ".js",
  ".ts",
  ".html",
  ".css",
];

async function isTextFile(filePath: string): Promise<boolean> {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_FILE_EXTENSIONS.includes(ext);
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Ensure the temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Periodic persistence function to save progress during streaming
async function persistPartialProgress(chatId: number, placeholderMessageId: number) {
  const partialResponse = partialResponses.get(chatId);
  if (!partialResponse) return;

  try {
    // Save partial response to database with recovery marker
    await db
      .update(messages)
      .set({
        content: `${partialResponse}

[⚡ Auto-saved progress - Stream can be resumed]`,
      })
      .where(eq(messages.id, placeholderMessageId));

    logger.log(`💾 Auto-saved progress for chat ${chatId} (${partialResponse.length} chars)`);
  } catch (error) {
    logger.error(`❌ Failed to auto-save progress for chat ${chatId}:`, error);
  }
}

// Setup periodic persistence for active streams
const persistenceTimers = new Map<number, NodeJS.Timeout>();
const lastAutosaveTime = new Map<number, number>();
const lastAutosaveLength = new Map<number, number>();

function startPeriodicPersistence(chatId: number, placeholderMessageId: number) {
  const settings = readSettings();

  // Only start autosave if explicitly enabled
  if (!settings.enableStreamAutosave) {
    logger.log(`⏸️ Auto-save disabled for chat ${chatId} (settings.enableStreamAutosave=false)`);
    return;
  }

  // Clear any existing timer
  const existingTimer = persistenceTimers.get(chatId);
  if (existingTimer) {
    clearInterval(existingTimer);
  }

  // Initialize tracking
  lastAutosaveTime.set(chatId, Date.now());
  lastAutosaveLength.set(chatId, 0);

  // Start new periodic persistence with debouncing
  const timer = setInterval(async () => {
    const now = Date.now();
    const lastSave = lastAutosaveTime.get(chatId) || 0;
    const lastLength = lastAutosaveLength.get(chatId) || 0;
    const partialResponse = partialResponses.get(chatId) || '';
    const currentLength = partialResponse.length;

    // Check if enough time has passed AND enough chars have accumulated
    const timeSinceLastSave = now - lastSave;
    const charsSinceLastSave = currentLength - lastLength;

    if (timeSinceLastSave >= PERSISTENCE_INTERVAL &&
      charsSinceLastSave >= MIN_CHARS_FOR_AUTOSAVE &&
      timeSinceLastSave < MAX_AUTOSAVE_INTERVAL) {
      await persistPartialProgress(chatId, placeholderMessageId);
      lastAutosaveTime.set(chatId, now);
      lastAutosaveLength.set(chatId, currentLength);
      logger.log(`💾 Debounced auto-save for chat ${chatId} (${charsSinceLastSave} chars, ${timeSinceLastSave}ms)`);
    }
  }, PERSISTENCE_INTERVAL);

  persistenceTimers.set(chatId, timer);
  logger.log(`🔄 Started debounced auto-save for chat ${chatId} (every ${PERSISTENCE_INTERVAL}ms, min ${MIN_CHARS_FOR_AUTOSAVE} chars)`);
}

function stopPeriodicPersistence(chatId: number) {
  const timer = persistenceTimers.get(chatId);
  if (timer) {
    clearInterval(timer);
    persistenceTimers.delete(chatId);
    lastAutosaveTime.delete(chatId);
    lastAutosaveLength.delete(chatId);
    logger.log(`⏹️ Stopped auto-save for chat ${chatId}`);
  }
}

// Helper function to process stream chunks with throttling
async function processStreamChunks({
  fullStream,
  fullResponse,
  abortController,
  chatId,
  processResponseChunkUpdate,
}: {
  fullStream: AsyncIterableStream<TextStreamPart<ToolSet>>;
  fullResponse: string;
  abortController: AbortController;
  chatId: number;
  processResponseChunkUpdate: (params: {
    fullResponse: string;
  }) => Promise<string>;
}): Promise<{ fullResponse: string; incrementalResponse: string }> {
  let incrementalResponse = "";
  let inThinkingBlock = false;

  // 🚀 PERFORMANCE FIX: Optimized throttling with char-delta gating
  let lastUpdateTime = 0;
  let lastUpdateLength = 0;
  let pendingUpdate = false;

  // 🚨 CRITICAL FIX: Add abort signal listener to immediately break the loop
  const abortListener = () => {
    logger.log(`🚨 Abort signal received for chat ${chatId} - breaking stream loop`);
  };
  abortController.signal.addEventListener('abort', abortListener);

  // 🚨 ADDITIONAL FIX: Add a periodic abort check for more responsive cancellation
  const abortCheckInterval = setInterval(() => {
    if (abortController.signal.aborted) {
      logger.log(`🚨 Periodic abort check: Stream should be cancelled for chat ${chatId}`);
      clearInterval(abortCheckInterval);
    }
  }, 100); // Check every 100ms for more responsive cancellation

  try {
    for await (const part of fullStream) {
      // 🚨 CRITICAL: Check abort signal on each iteration
      if (abortController.signal.aborted) {
        logger.log(`Stream aborted for chat ${chatId} - exiting loop`);
        break;
      }

      let chunk = "";
      if (part.type === "text-delta") {
        if (inThinkingBlock) {
          chunk = "</think>";
          inThinkingBlock = false;
        }
        chunk += part.textDelta;
      } else if (part.type === "reasoning") {
        if (!inThinkingBlock) {
          chunk = "<think>";
          inThinkingBlock = true;
        }

        chunk += escapeDyadTags(part.textDelta);
      } else if (part.type === "tool-call") {
        // Handle tool calls - these are critical for file creation
        logger.log(`🔧 Tool call received: ${part.toolName} with args:`, part.args);
        // Don't add tool calls to the response text, but log them for debugging
        continue;
      } else if (part.type === "tool-result") {
        // Handle tool results - these complete the tool execution
        logger.log(`✅ Tool result received for ${part.toolCallId}:`, part.result);
        // Don't add tool results to the response text, but log them for debugging
        continue;
      }

      if (!chunk) {
        continue;
      }

      fullResponse += chunk;
      incrementalResponse += chunk;

      // 🚀 PERFORMANCE: Only clean response when we're about to send it, not on every chunk
      // This avoids expensive regex operations on every text delta

      // 🚀 OPTIMIZED THROTTLE: Char-delta gating + reduced throttle time
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTime;
      const charsSinceLastUpdate = fullResponse.length - lastUpdateLength;

      if (timeSinceLastUpdate >= UI_UPDATE_THROTTLE_MS &&
        charsSinceLastUpdate >= MIN_CHARS_FOR_UI_UPDATE &&
        !pendingUpdate) {
        pendingUpdate = true;
        lastUpdateTime = now;
        lastUpdateLength = fullResponse.length;

        // 🚨 CRITICAL: Check abort signal before expensive operations
        if (abortController.signal.aborted) {
          logger.log(`Stream aborted during throttled update for chat ${chatId}`);
          break;
        }

        // 🚀 DIRECT ASYNC AWAIT: Remove setImmediate to avoid microtask queue backlog
        try {
          // Clean response only when sending to UI
          const cleanedResponse = cleanFullResponse(fullResponse);
          await processResponseChunkUpdate({ fullResponse: cleanedResponse });
        } catch (error) {
          logger.error(`Error in throttled chunk update for chat ${chatId}:`, error);
        } finally {
          pendingUpdate = false;
        }
      }

      // If the stream was aborted, exit early
      if (abortController.signal.aborted) {
        logger.log(`Stream for chat ${chatId} was aborted`);
        break;
      }
    }
  } finally {
    // 🚨 CRITICAL: Always clean up the abort listener and interval
    abortController.signal.removeEventListener('abort', abortListener);
    clearInterval(abortCheckInterval);
  }

  // 🚀 FINAL UPDATE: Ensure the last chunk is always sent (only if not aborted)
  if (!abortController.signal.aborted) {
    if (!pendingUpdate) {
      fullResponse = cleanFullResponse(fullResponse);
      fullResponse = await processResponseChunkUpdate({ fullResponse });
    } else {
      // Wait for pending update to complete, then send final update
      while (pendingUpdate && !abortController.signal.aborted) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      if (!abortController.signal.aborted) {
        fullResponse = cleanFullResponse(fullResponse);
        fullResponse = await processResponseChunkUpdate({ fullResponse });
      }
    }
  } else {
    logger.log(`🚨 Stream was aborted for chat ${chatId} - skipping final update`);
  }

  return { fullResponse, incrementalResponse };
}

export function registerChatStreamHandlers() {
  // RESTORED: Original Dyad chat stream handler (proven working)
  ipcMain.handle("chat:stream", async (event, req: ChatStreamParams) => {
    try {
      const fileUploadsState = FileUploadsState.getInstance();
      fileUploadsState.initialize({ chatId: req.chatId });

      // Create an AbortController for this stream
      const abortController = new AbortController();
      activeStreams.set(req.chatId, abortController);

      // Declare userId and tokensUsed at the top level so they're accessible throughout the handler
      let userId: string | null = null;
      let tokensUsed = 0;

      // Get the chat to check for existing messages FIRST
      const chat = await db.query.chats.findFirst({
        where: eq(chats.id, req.chatId),
        with: {
          messages: {
            orderBy: (messages, { asc }) => [asc(messages.createdAt)],
          },
          app: true, // Include app information
        },
      });

      if (!chat) {
        throw new Error(`Chat not found: ${req.chatId}`);
      }

      // Handle redo option: remove the most recent messages if needed
      if (req.redo) {
        // Get the most recent messages
        const chatMessages = [...chat.messages];

        // Find the most recent user message
        let lastUserMessageIndex = chatMessages.length - 1;
        while (
          lastUserMessageIndex >= 0 &&
          chatMessages[lastUserMessageIndex].role !== "user"
        ) {
          lastUserMessageIndex--;
        }

        if (lastUserMessageIndex >= 0) {
          // Delete the user message
          await db
            .delete(messages)
            .where(eq(messages.id, chatMessages[lastUserMessageIndex].id));

          // If there's an assistant message after the user message, delete it too
          if (
            lastUserMessageIndex < chatMessages.length - 1 &&
            chatMessages[lastUserMessageIndex + 1].role === "assistant"
          ) {
            await db
              .delete(messages)
              .where(
                eq(messages.id, chatMessages[lastUserMessageIndex + 1].id),
              );
          }
        }
      }

      // Process attachments if any
      let attachmentInfo = "";
      const attachmentPaths: string[] = [];

      if (req.attachments && req.attachments.length > 0) {
        attachmentInfo = "\n\nAttachments:\n";

        for (const [index, attachment] of req.attachments.entries()) {
          // Generate a unique filename
          const hash = crypto
            .createHash("md5")
            .update(attachment.name + Date.now())
            .digest("hex");
          const fileExtension = path.extname(attachment.name);
          const filename = `${hash}${fileExtension}`;
          const filePath = path.join(TEMP_DIR, filename);

          // Extract the base64 data (remove the data:mime/type;base64, prefix)
          const base64Data = attachment.data.split(";base64,").pop() || "";

          await writeFile(filePath, Buffer.from(base64Data, "base64"));
          attachmentPaths.push(filePath);

          if (attachment.attachmentType === "upload-to-codebase") {
            // For upload-to-codebase, create a unique file ID and store the mapping
            const fileId = `DYAD_ATTACHMENT_${index}`;

            fileUploadsState.addFileUpload(fileId, {
              filePath,
              originalName: attachment.name,
            });

            // APPLAA ENHANCEMENT: Support both dyad-write and applaa-write tags
            attachmentInfo += `\n\nFile to upload to codebase: ${attachment.name} (file id: ${fileId})\n`;
          } else {
            // For chat-context, use the existing logic
            attachmentInfo += `- ${attachment.name} (${attachment.type})\n`;
            // If it's a text-based file, try to include the content
            if (await isTextFile(filePath)) {
              try {
                // APPLAA ENHANCEMENT: Support both dyad and applaa text attachment tags
                attachmentInfo += `<dyad-text-attachment filename="${attachment.name}" type="${attachment.type}" path="${filePath}">
                </dyad-text-attachment>
                \n\n`;
              } catch (err) {
                logger.error(`Error reading file content: ${err}`);
              }
            }
          }
        }
      }

      // Add user message to database with attachment info
      let userPrompt = req.prompt + (attachmentInfo ? attachmentInfo : "");
      if (req.selectedComponent) {
        let componentSnippet = "[component snippet not available]";
        try {
          const componentFileContent = await readFile(
            path.join(
              getDyadAppPath(chat.app.path),
              req.selectedComponent.relativePath,
            ),
            "utf8",
          );
          const lines = componentFileContent.split("\n");
          const selectedIndex = req.selectedComponent.lineNumber - 1;

          // Let's get one line before and three after for context.
          const startIndex = Math.max(0, selectedIndex - 1);
          const endIndex = Math.min(lines.length, selectedIndex + 4);

          const snippetLines = lines.slice(startIndex, endIndex);
          const selectedLineInSnippetIndex = selectedIndex - startIndex;

          if (snippetLines[selectedLineInSnippetIndex]) {
            snippetLines[selectedLineInSnippetIndex] =
              `${snippetLines[selectedLineInSnippetIndex]} // <-- EDIT HERE`;
          }

          componentSnippet = snippetLines.join("\n");
        } catch (err) {
          logger.error(`Error reading selected component file content: ${err}`);
        }

        userPrompt += `\n\nSelected component: ${req.selectedComponent.name} (file: ${req.selectedComponent.relativePath})

Snippet:
\`\`\`
${componentSnippet}
\`\`\`
`;
      }
      await db
        .insert(messages)
        .values({
          chatId: req.chatId,
          role: "user",
          content: userPrompt,
        })
        .returning();

      // Add a placeholder assistant message immediately
      const [placeholderAssistantMessage] = await db
        .insert(messages)
        .values({
          chatId: req.chatId,
          role: "assistant",
          content: "", // Start with empty content
        })
        .returning();

      // 🚀 START PERIODIC PERSISTENCE: Auto-save progress (if enabled)
      startPeriodicPersistence(req.chatId, placeholderAssistantMessage.id);

      // Fetch updated chat data after possible deletions and additions
      const updatedChat = await db.query.chats.findFirst({
        where: eq(chats.id, req.chatId),
        with: {
          messages: {
            orderBy: (messages, { asc }) => [asc(messages.createdAt)],
          },
          app: true, // Include app information
        },
      });

      if (!updatedChat) {
        throw new Error(`Chat not found: ${req.chatId}`);
      }

      // 🚀 PERFORMANCE: Start intelligent preview preparation during LLM generation
      // 🚨 TEMPORARY FIX: Disable preview preparation for Expo apps to test chat streaming
      try {
        const { isExpo } = detectAppType(getDyadAppPath(updatedChat.app.path));
        if (!isExpo) {
          await onChatStreamStart(updatedChat.app.id, getDyadAppPath(updatedChat.app.path), updatedChat.app.name || 'App');
          await onLLMGenerationStart(updatedChat.app.id, getDyadAppPath(updatedChat.app.path), updatedChat.app.name || 'App');
        } else {
          logger.info(`🚨 Skipping preview preparation for Expo app ${updatedChat.app.id} to test chat streaming`);
        }
      } catch (error) {
        logger.warn(`⚠️ Failed to start preview preparation:`, error);
      }

      // Send the messages right away so that the loading state is shown for the message.
      safeSend(event.sender, "chat:response:chunk", {
        chatId: req.chatId,
        messages: updatedChat.messages,
      });

      let fullResponse = "";

      // Check if this is a test prompt
      const testResponse = getTestResponse(req.prompt);

      if (testResponse) {
        // For test prompts, use the dedicated function
        fullResponse = await streamTestResponse(
          event,
          req.chatId,
          testResponse,
          abortController,
          updatedChat,
        );
      } else {
        // Normal AI processing for non-test prompts
        const settings = readSettings();

        const appPath = updatedChat.app?.path
          ? getDyadAppPath(updatedChat.app.path)
          : "";
        const chatContext = req.selectedComponent
          ? {
            contextPaths: [
              {
                globPath: req.selectedComponent.relativePath,
              },
            ],
            smartContextAutoIncludes: [],
          }
          : validateChatContext(updatedChat.app.chatContext);

        // Parse app mentions from the prompt
        const mentionedAppNames = parseAppMentions(req.prompt);

        // 🚀 PERFORMANCE: Cache system prompt and codebase per app
        const appId = updatedChat.app.id;
        const cacheKey = `${appId}-${JSON.stringify(chatContext)}`;
        const now = Date.now();

        let codebaseInfo: string;
        let files: any;
        let systemPrompt: string;

        // Check cache first
        const cached = systemPromptCache.get(cacheKey);
        if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
          logger.log(`🚀 Using cached system prompt and codebase for app ${appId}`);
          codebaseInfo = cached.codebaseInfo;
          files = []; // Files are not cached, but we'll get them fresh
          systemPrompt = cached.systemPrompt;
        } else {
          // Extract codebase for current app
          const extracted = await extractCodebase({
            appPath,
            chatContext,
          });
          codebaseInfo = extracted.formattedOutput;
          files = extracted.files;

          // Build system prompt
          const baseSystemPrompt = constructSystemPrompt({
            aiRules: await readAiRules(appPath),
            chatMode: settings.selectedChatMode,
            appPath: appPath,
            appType: updatedChat.app.appType, // Pass appType from database
          });

          // Apply cost optimization and prompt caching
          const optimized = await costOptimizationService.optimizeSystemPrompt(
            baseSystemPrompt,
            settings.selectedModel.provider,
            settings.selectedModel.name
          );

          systemPrompt = optimized.systemPrompt;

          // Log cost optimization results
          if (optimized.cachingStrategy !== 'none') {
            logger.log(`💰 Cost optimization applied: ${optimized.cachingStrategy} caching for ${settings.selectedModel.provider}/${settings.selectedModel.name}`);
            logger.log(`📊 Estimated savings: ${optimized.costSavingsEstimate}% (${optimized.estimatedTokens} tokens)`);
          }

          // Cache the result
          const codebaseHash = crypto.createHash('md5').update(codebaseInfo).digest('hex');
          systemPromptCache.set(cacheKey, {
            systemPrompt,
            codebaseInfo,
            codebaseHash,
            timestamp: now,
          });

          logger.log(`💾 Cached system prompt and codebase for app ${appId} (${codebaseHash})`);
        }

        // Extract codebases for mentioned apps
        const mentionedAppsCodebases = await extractMentionedAppsCodebases(
          mentionedAppNames,
          updatedChat.app.id, // Exclude current app
        );

        // Combine current app codebase with mentioned apps' codebases
        let otherAppsCodebaseInfo = "";
        if (mentionedAppsCodebases.length > 0) {
          const mentionedAppsSection = mentionedAppsCodebases
            .map(
              ({ appName, codebaseInfo }) =>
                `\n\n=== Referenced App: ${appName} ===\n${codebaseInfo}`,
            )
            .join("");

          otherAppsCodebaseInfo = mentionedAppsSection;

          logger.log(
            `Added ${mentionedAppsCodebases.length} mentioned app codebases`,
          );
        }

        logger.log(`Extracted codebase information from ${appPath}`);
        logger.log(
          "codebaseInfo: length",
          codebaseInfo.length,
          "estimated tokens",
          codebaseInfo.length / 4,
        );

        const { modelClient, isEngineEnabled } = await getModelClient(
          settings.selectedModel,
          settings,
          files,
        );

        // Prepare message history for the AI
        const messageHistory = updatedChat.messages.map((message) => ({
          role: message.role as "user" | "assistant" | "system",
          content: message.content,
        }));

        // Limit chat history based on maxChatTurnsInContext setting
        // We add 1 because the current prompt counts as a turn.
        const maxChatTurns =
          (settings.maxChatTurnsInContext || MAX_CHAT_TURNS_IN_CONTEXT) + 1;

        // If we need to limit the context, we take only the most recent turns
        let limitedMessageHistory = messageHistory;
        if (messageHistory.length > maxChatTurns * 2) {
          // Each turn is a user + assistant pair
          // Calculate how many messages to keep (maxChatTurns * 2)
          let recentMessages = messageHistory
            .filter((msg) => msg.role !== "system")
            .slice(-maxChatTurns * 2);

          // Ensure the first message is a user message
          if (recentMessages.length > 0 && recentMessages[0].role !== "user") {
            // Find the first user message
            const firstUserIndex = recentMessages.findIndex(
              (msg) => msg.role === "user",
            );
            if (firstUserIndex > 0) {
              // Drop assistant messages before the first user message
              recentMessages = recentMessages.slice(firstUserIndex);
            } else if (firstUserIndex === -1) {
              logger.warn(
                "No user messages found in recent history, set recent messages to empty",
              );
              recentMessages = [];
            }
          }

          limitedMessageHistory = [...recentMessages];

          logger.log(
            `Limiting chat history from ${messageHistory.length} to ${limitedMessageHistory.length} messages (max ${maxChatTurns} turns)`,
          );
        }

        // 🚀 PERFORMANCE: Use cached system prompt (already built above)
        let baseSystemPrompt = systemPrompt;

        // Add information about mentioned apps if any
        if (otherAppsCodebaseInfo) {
          const mentionedAppsList = mentionedAppsCodebases
            .map(({ appName }) => appName)
            .join(", ");

          baseSystemPrompt += `\n\n# Referenced Apps\nThe user has mentioned the following apps in their prompt: ${mentionedAppsList}. Their codebases have been included in the context for your reference. When referring to these apps, you can understand their structure and code to provide better assistance, however you should NOT edit the files in these referenced apps. The referenced apps are NOT part of the current app and are READ-ONLY.`;
        }
        // Check for Postgres database availability (DATABASE_URL in .env or .env.local)
        let hasPostgres = false;
        if (appPath) {
          try {
            // Check both .env and .env.local files
            const envPaths = [
              path.join(appPath, ".env"),
              path.join(appPath, ".env.local"),
            ];

            logger.log(`🔍 Checking for Postgres in app: ${updatedChat.app?.name || 'unknown'}, path: ${appPath}`);

            for (const envPath of envPaths) {
              if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, "utf-8");
                logger.log(`📄 Found ${path.basename(envPath)}, checking for DATABASE_URL...`);
                if (envContent.includes("DATABASE_URL=")) {
                  hasPostgres = true;
                  logger.log(`✅ Postgres detected in ${path.basename(envPath)} for app: ${updatedChat.app?.name || 'unknown'}`);
                  break;
                } else {
                  logger.log(`❌ ${path.basename(envPath)} exists but no DATABASE_URL found`);
                }
              } else {
                logger.log(`📭 ${path.basename(envPath)} does not exist`);
              }
            }

            if (!hasPostgres) {
              logger.log(`ℹ️ No DATABASE_URL found in .env files for app: ${updatedChat.app?.name || 'unknown'}. App may need database provisioning.`);
            }
          } catch (error) {
            logger.warn("Failed to check for Postgres:", error);
          }
        } else {
          logger.log(`⚠️ No appPath available for app: ${updatedChat.app?.name || 'unknown'}`);
        }

        // 🚨 POSTGRES ONLY - NO SUPABASE/NEON FALLBACK
        // ALWAYS use Postgres - it's automatically provisioned for every app
        baseSystemPrompt += "\n\n" + getPostgresAvailablePrompt();

        if (hasPostgres) {
          logger.log(`✅ [POSTGRES] Using Postgres database for app: ${updatedChat.app?.name || 'unknown'}`);
        } else {
          logger.warn(`⚠️ [POSTGRES] No DATABASE_URL found for app: ${updatedChat.app?.name || 'unknown'}, but using Postgres prompt anyway`);
        }
        const isSummarizeIntent = req.prompt.startsWith(
          "Summarize from chat-id=",
        );
        if (isSummarizeIntent) {
          baseSystemPrompt = SUMMARIZE_CHAT_SYSTEM_PROMPT;
        }

        // 💰 COST OPTIMIZATION: Simple approach - just use the system prompt as string
        // Anthropic caching is handled by the API headers, not prompt format
        systemPrompt = baseSystemPrompt;

        const estimatedTokens = Math.ceil(systemPrompt.length / 4);
        logger.log(`💰 System prompt: ${estimatedTokens} tokens`);

        if (settings.selectedModel.provider === 'anthropic' ||
          (settings.selectedModel.provider === 'openrouter' && settings.selectedModel.name.startsWith('anthropic/'))) {
          logger.log(`💰 Anthropic caching enabled via headers`);
        }

        // Update the system prompt for images if there are image attachments
        const hasImageAttachments =
          req.attachments &&
          req.attachments.some((attachment) =>
            attachment.type.startsWith("image/"),
          );

        const hasUploadedAttachments =
          req.attachments &&
          req.attachments.some(
            (attachment) => attachment.attachmentType === "upload-to-codebase",
          );
        // If there's mixed attachments (e.g. some upload to codebase attachments and some upload images as chat context attachemnts)
        // we will just include the file upload system prompt, otherwise the AI gets confused and doesn't reliably
        // print out the dyad-write tags.
        // Usually, AI models will want to use the image as reference to generate code (e.g. UI mockups) anyways, so
        // it's not that critical to include the image analysis instructions.
        if (hasUploadedAttachments) {
          // APPLAA ENHANCEMENT: Support both dyad-write and applaa-write tags
          systemPrompt += `
  
When files are attached to this conversation, upload them to the codebase using this exact format:

<dyad-write path="path/to/destination/filename.ext" description="Upload file to codebase">
DYAD_ATTACHMENT_X
</dyad-write>

OR use the Applaa-branded equivalent:

<applaa-write path="path/to/destination/filename.ext" description="Upload file to codebase">
DYAD_ATTACHMENT_X
</applaa-write>

Example for file with id of DYAD_ATTACHMENT_0:
<applaa-write path="src/components/Button.jsx" description="Upload file to codebase">
DYAD_ATTACHMENT_0
</applaa-write>

  `;
        } else if (hasImageAttachments) {
          systemPrompt += `

# Image Analysis Instructions
This conversation includes one or more image attachments. When the user uploads images:
1. If the user explicitly asks for analysis, description, or information about the image, please analyze the image content.
2. Describe what you see in the image if asked.
3. You can use images as references when the user has coding or design-related questions.
4. For diagrams or wireframes, try to understand the content and structure shown.
5. For screenshots of code or errors, try to identify the issue or explain the code.
`;
        }

        const codebasePrefix = isEngineEnabled
          ? // No codebase prefix if engine is set, we will take of it there.
          []
          : ([
            {
              role: "user",
              content: createCodebasePrompt(codebaseInfo),
            },
            {
              role: "assistant",
              content: "OK, got it. I'm ready to help",
            },
          ] as const);

        const otherCodebasePrefix = otherAppsCodebaseInfo
          ? ([
            {
              role: "user",
              content: createOtherAppsCodebasePrompt(otherAppsCodebaseInfo),
            },
            {
              role: "assistant",
              content: "OK.",
            },
          ] as const)
          : [];

        let chatMessages: CoreMessage[] = [
          ...codebasePrefix,
          ...otherCodebasePrefix,
          ...limitedMessageHistory.map((msg) => ({
            role: msg.role as "user" | "assistant" | "system",
            // Why remove thinking tags?
            // Thinking tags are generally not critical for the context
            // and eats up extra tokens.
            content:
              settings.selectedChatMode === "ask"
                ? removeDyadTags(removeNonEssentialTags(msg.content))
                : removeNonEssentialTags(msg.content),
          })),
        ];

        // Check if the last message should include attachments
        if (chatMessages.length >= 2 && attachmentPaths.length > 0) {
          const lastUserIndex = chatMessages.length - 2;
          const lastUserMessage = chatMessages[lastUserIndex];

          if (lastUserMessage.role === "user") {
            // Replace the last message with one that includes attachments
            chatMessages[lastUserIndex] = await prepareMessageWithAttachments(
              lastUserMessage,
              attachmentPaths,
            );
          }
        }

        if (isSummarizeIntent) {
          const previousChat = await db.query.chats.findFirst({
            where: eq(chats.id, parseInt(req.prompt.split("=")[1])),
            with: {
              messages: {
                orderBy: (messages, { asc }) => [asc(messages.createdAt)],
              },
            },
          });
          chatMessages = [
            {
              role: "user",
              content:
                "Summarize the following chat: " +
                formatMessagesForSummary(previousChat?.messages ?? []),
            } satisfies CoreMessage,
          ];
        }

        const simpleStreamText = async ({
          chatMessages,
          modelClient,
        }: {
          chatMessages: CoreMessage[];
          modelClient: ModelClient;
        }) => {
          const dyadRequestId = uuidv4();
          if (isEngineEnabled) {
            logger.log(
              "sending AI request to engine with request id:",
              dyadRequestId,
            );
          } else {
            logger.log("sending AI request");
          }
          // 💰 COST CONTROL: Limit response length to prevent runaway costs
          const defaultMaxTokens = await getMaxTokens(settings.selectedModel);
          const safeMaxTokens = Math.min(defaultMaxTokens || 8192, 8192); // Cap at 8K tokens
          
          // Return full result object (includes usage) instead of just fullStream
          return streamText({
            maxTokens: safeMaxTokens,
            temperature: await getTemperature(settings.selectedModel),
            maxRetries: modelClient.builtinProviderId === 'openrouter' ? 5 : 2,
            model: modelClient.model,
            providerOptions: {
              "dyad-engine": {
                dyadRequestId,
              },
              "dyad-gateway": getExtraProviderOptions(
                modelClient.builtinProviderId,
                settings,
              ),
              google: {
                thinkingConfig: {
                  includeThoughts: true,
                },
              } satisfies GoogleGenerativeAIProviderOptions,
              openai: {
                reasoningSummary: "auto",
              } satisfies OpenAIResponsesProviderOptions,
              // 🚀 FIX: Add Azure OpenAI specific configuration
              "azure-openai": {
                reasoningSummary: "auto",
                reasoning_effort: "medium",
              },
            },
            system: systemPrompt,
            messages: chatMessages.filter((m) => m.content),
            onError: (error: unknown) => {
              logger.error("Error streaming text:", error);
              const errorObj = error as any;
              let errorMessage = errorObj?.error?.message;
              const responseBody = errorObj?.error?.responseBody;

              // Special handling for Azure OpenAI authentication errors (401)
              if (modelClient.builtinProviderId === 'azure-openai' &&
                (errorMessage?.includes('Access denied') ||
                  errorMessage?.includes('invalid subscription key') ||
                  errorMessage?.includes('wrong API endpoint') ||
                  errorObj?.error?.status === 401)) {
                logger.error("🔴 Azure OpenAI Authentication Error - checking configuration");
                logger.error(`🔴 Azure OpenAI Error Details:`);
                logger.error(`  - Selected Model: ${settings.selectedModel?.name || 'unknown'}`);
                logger.error(`  - Provider: ${settings.selectedModel?.provider || 'unknown'}`);
                logger.error(`  - Error Status: ${errorObj?.error?.status || 'unknown'}`);
                logger.error(`  - Error Message: ${errorMessage || 'unknown'}`);
                logger.error(`  - Response Body: ${responseBody || 'none'}`);

                // Log Azure configuration
                const azureSettings = settings.providerSettings?.['azure-openai'];
                logger.error(`  - Azure API Key: ${azureSettings?.apiKey?.value ? 'SET (length: ' + azureSettings.apiKey.value.length + ')' : 'NOT SET'}`);
                logger.error(`  - Note: Base URLs are configured per model in get_model_client.ts`);

                errorMessage = "Azure OpenAI Authentication Error (401). This usually means:\n" +
                  "1. The API key is incorrect or expired\n" +
                  "2. The API key doesn't have access to the Azure OpenAI resource\n" +
                  "3. The endpoint URL is incorrect\n\n" +
                  "Please verify:\n" +
                  "- The API key is correct and active in Azure Portal\n" +
                  "- The API key has the correct permissions\n" +
                  "- The endpoint URL matches your Azure OpenAI resource\n\n" +
                  "Check the terminal logs for detailed configuration information.";
              }

              // Special handling for Azure OpenAI "Resource not found" errors
              if (modelClient.builtinProviderId === 'azure-openai' &&
                (errorMessage?.includes('Resource not found') ||
                  errorMessage?.includes('404') ||
                  errorObj?.error?.status === 404)) {
                logger.error("🔴 Azure OpenAI Resource not found - checking configuration");

                // Log the model configuration for debugging
                logger.error(`🔴 Azure OpenAI Error Details:`);
                logger.error(`  - Selected Model: ${settings.selectedModel?.name || 'unknown'}`);
                logger.error(`  - Provider: ${settings.selectedModel?.provider || 'unknown'}`);
                logger.error(`  - Error Status: ${errorObj?.error?.status || 'unknown'}`);
                logger.error(`  - Error Message: ${errorMessage || 'unknown'}`);
                logger.error(`  - Response Body: ${responseBody || 'none'}`);

                // Try to get Azure config from settings for debugging
                // Log Azure configuration - note that we use hardcoded base URLs per model
                const azureSettings = settings.providerSettings?.['azure-openai'];
                logger.error(`  - Azure API Key: ${azureSettings?.apiKey?.value ? 'SET' : 'NOT SET'}`);
                logger.error(`  - Azure Resource Name: ${azureSettings?.resourceName?.value ? 'SET' : 'NOT SET'}`);
                logger.error(`  - Azure Deployment Name: ${azureSettings?.deploymentName?.value || 'NOT SET (using model name as deployment)'}`);
                logger.error(`  - Azure Endpoint: ${azureSettings?.endpoint?.value ? 'SET' : 'NOT SET (using hardcoded base URL per model)'}`);
                logger.error(`  - Azure API Version: ${azureSettings?.apiVersion?.value || 'using model-specific API version'}`);
                logger.error(`  - Note: Base URLs are configured per model in get_model_client.ts`);

                errorMessage = "Azure OpenAI Resource not found (404). This usually means:\n" +
                  "1. The deployment name doesn't exist in your Azure OpenAI resource\n" +
                  "2. The deployment name doesn't match exactly (case-sensitive)\n" +
                  "3. The resource name or endpoint URL is incorrect\n\n" +
                  "Please verify in Azure Portal that:\n" +
                  "- The deployment exists and is active\n" +
                  "- The deployment name matches exactly (including case)\n" +
                  "- The resource name and endpoint are correct\n\n" +
                  "Check the terminal logs for detailed configuration information.";
              }

              // Special handling for OpenRouter rate limits
              if (modelClient.builtinProviderId === 'openrouter' &&
                (errorMessage?.includes('Too Many Requests') ||
                  errorMessage?.includes('rate limit') ||
                  errorObj?.error?.status === 429)) {
                logger.warn("🔄 OpenRouter rate limit hit - consider switching models or upgrading plan");
                errorMessage = "OpenRouter rate limit exceeded. Try switching to a different model or upgrading your OpenRouter plan. Free tier has strict limits.";
              }

              if (errorMessage && responseBody) {
                errorMessage += "\n\nDetails: " + responseBody;
              }
              const message = errorMessage || JSON.stringify(error);
              const requestIdPrefix = isEngineEnabled
                ? `[Request ID: ${dyadRequestId}] `
                : "";
              event.sender.send(
                "chat:response:error",
                `Sorry, there was an error from the AI: ${requestIdPrefix}${message}`,
              );
              // Clean up the abort controller
              activeStreams.delete(req.chatId);
            },
            abortSignal: abortController.signal,
          });
        };

        const processResponseChunkUpdate = async ({
          fullResponse,
        }: {
          fullResponse: string;
        }) => {
          if (
            fullResponse.includes("$$SUPABASE_CLIENT_CODE$$") &&
            updatedChat.app?.supabaseProjectId
          ) {
            const supabaseClientCode = await getSupabaseClientCode({
              projectId: updatedChat.app?.supabaseProjectId,
            });
            fullResponse = fullResponse.replace(
              "$$SUPABASE_CLIENT_CODE$$",
              supabaseClientCode,
            );
          }
          // Store the current partial response
          partialResponses.set(req.chatId, fullResponse);

          // Update the placeholder assistant message content in the messages array
          const currentMessages = [...updatedChat.messages];
          if (
            currentMessages.length > 0 &&
            currentMessages[currentMessages.length - 1].role === "assistant"
          ) {
            currentMessages[currentMessages.length - 1].content = fullResponse;
          }

          // Update the assistant message in the database
          safeSend(event.sender, "chat:response:chunk", {
            chatId: req.chatId,
            messages: currentMessages,
          });
          return fullResponse;
        };

        // 💎 CREDIT CHECK: Use same getUserId() as profile/credit UI so deduction and usage match displayed balance
        try {
          userId = await getUserId();
          if (userId) {
            // Pre-check: reserve max credits per message (actual cost = creditsFromTokens(tokensUsed) after stream)
            const creditCheck = await checkCredits(userId, 'chat_message', MAX_CREDITS_PER_MESSAGE);
            if (!creditCheck.hasCredits) {
              throw new Error(`Insufficient credits. You need at least ${creditCheck.required} credits for a chat message but only have ${creditCheck.remaining} remaining.`);
            }
          }
        } catch (creditError: any) {
          // If it's an insufficient credits error, throw it
          if (creditError.message?.includes('Insufficient credits')) {
            throw creditError;
          }
          // Otherwise, log and continue (don't block chat if credit check fails)
          logger.warn('Credit check failed, continuing anyway:', creditError);
        }

        // When calling streamText, the messages need to be properly formatted for mixed content
        const streamResult = await simpleStreamText({
          chatMessages,
          modelClient,
        });
        const { fullStream } = streamResult;

        // Reset tokensUsed for this stream
        tokensUsed = 0;

        // Process the stream as before
        try {
          const result = await processStreamChunks({
            fullStream,
            fullResponse,
            abortController,
            chatId: req.chatId,
            processResponseChunkUpdate,
          });
          fullResponse = result.fullResponse;

          // Get usage information from stream result (available after stream completes).
          // Provider-reported usage is authoritative when present; fallback is char-based estimate.
          try {
            // In Vercel AI SDK, usage is available after stream is consumed
            // Wait for usage to be available (it's a Promise that resolves after stream completion)
            const usage = await streamResult.usage;
            if (usage) {
              tokensUsed = usage.totalTokens || ((usage.promptTokens || 0) + (usage.completionTokens || 0));
              logger.info(`Token usage for chat ${req.chatId}: ${tokensUsed} tokens (prompt: ${usage.promptTokens || 0}, completion: ${usage.completionTokens || 0})`);
            } else {
              // Fallback: estimate tokens from response if usage is not available
              tokensUsed = Math.ceil(fullResponse.length / 4); // Rough estimate: 4 chars per token
              logger.warn(`Token usage not available from AI provider, estimated: ${tokensUsed} tokens`);
            }
          } catch (usageError: any) {
            logger.warn('Failed to get token usage from stream result:', usageError);
            // Fallback: estimate tokens from response
            tokensUsed = Math.ceil(fullResponse.length / 4);
          }

          if (
            !abortController.signal.aborted &&
            settings.selectedChatMode !== "ask" &&
            hasUnclosedDyadWrite(fullResponse)
          ) {
            // 🚀 CRITICAL FIX: Invalidate system prompt cache when detecting unclosed tags
            // This ensures the LLM gets fresh instructions about file completion
            logger.warn(`🔄 Invalidating system prompt cache due to unclosed tags`);
            systemPromptCache.delete(cacheKey);

            // Also invalidate application-level prompt cache to ensure fresh system prompt
            try {
              const { applicationCache } = await import("../utils/prompt_caching");
              applicationCache.clear();
              logger.warn(`🔄 Cleared application-level prompt cache`);
            } catch (error) {
              logger.warn(`⚠️ Failed to clear application cache:`, error);
            }

            let continuationAttempts = 0;
            while (
              hasUnclosedDyadWrite(fullResponse) &&
              continuationAttempts < 5 &&
              !abortController.signal.aborted
            ) {
              logger.warn(
                `Received unclosed dyad-write or applaa-write tag, attempting to continue, attempt #${continuationAttempts + 1}`,
              );

              // Extract the unclosed tag information for better continuation
              const unclosedTagMatch = fullResponse.match(/<(?:dyad-write|applaa-write)[^>]*>/g);
              const lastUnclosedTag = unclosedTagMatch?.[unclosedTagMatch.length - 1];
              const tagType = lastUnclosedTag?.includes("applaa-write") ? "applaa-write" : "dyad-write";

              logger.info(`🔧 Continuation attempt ${continuationAttempts}: Found unclosed ${tagType} tag: ${lastUnclosedTag}`);
              logger.info(`📝 Full response length: ${fullResponse.length} characters`);
              logger.info(`📝 Last 200 characters of response: ${fullResponse.slice(-200)}`);
              continuationAttempts++;

              // 🚀 CRITICAL FIX: Rebuild system prompt with fresh file completion instructions
              const freshSystemPrompt = constructSystemPrompt({
                aiRules: await readAiRules(appPath),
                chatMode: settings.selectedChatMode,
                appPath: appPath,
              });

              const { fullStream: contStream } = await simpleStreamText({
                // Build messages: replay history then pre-fill assistant with current partial.
                chatMessages: [
                  ...chatMessages,
                  { role: "assistant", content: fullResponse },
                  {
                    role: "user",
                    content: `Please continue and complete the file. You have an unclosed ${tagType} tag that needs to be finished. Complete the file content and add the closing </${tagType}> tag. Make sure to complete any incomplete code blocks, functions, or components. IMPORTANT: Only continue the current file, do not create new files.`
                  },
                ],
                modelClient,
                systemPrompt: freshSystemPrompt, // Use fresh system prompt
              });
              for await (const part of contStream) {
                // If the stream was aborted, exit early
                if (abortController.signal.aborted) {
                  logger.log(`Stream for chat ${req.chatId} was aborted`);
                  break;
                }
                if (part.type === "tool-call") {
                  // Handle tool calls in continuation
                  logger.log(`🔧 Continuation tool call: ${part.toolName} with args:`, part.args);
                  continue;
                } else if (part.type === "tool-result") {
                  // Handle tool results in continuation
                  logger.log(`✅ Continuation tool result for ${part.toolCallId}:`, part.result);
                  continue;
                } else if (part.type !== "text-delta") {
                  // ignore reasoning for continuation
                  continue;
                }
                fullResponse += part.textDelta;
                fullResponse = cleanFullResponse(fullResponse);
                fullResponse = await processResponseChunkUpdate({
                  fullResponse,
                });
              }

              logger.info(`✅ Continuation attempt ${continuationAttempts} completed. Response length: ${fullResponse.length}`);
            }
          }
          // Process dyad-write tags to actually write files to disk
          if (!abortController.signal.aborted) {
            try {
              logger.info("Processing dyad-write tags to write files to disk");
              const writeTags = getDyadWriteTags(fullResponse);
              const renameTags = getDyadRenameTags(fullResponse);
              const deletePaths = getDyadDeleteTags(fullResponse);

              if (writeTags.length > 0 || renameTags.length > 0 || deletePaths.length > 0) {
                logger.info(`Found ${writeTags.length} write tags, ${renameTags.length} rename tags, ${deletePaths.length} delete tags`);

                const virtualFileSystem = new AsyncVirtualFileSystem(
                  getDyadAppPath(updatedChat.app.path),
                  {
                    fileExists: (fileName: string) => fileExists(fileName),
                    readFile: (fileName: string) => readFileWithCache(fileName),
                  },
                );

                await virtualFileSystem.applyResponseChanges({
                  deletePaths,
                  renameTags,
                  writeTags,
                });

                logger.info("Successfully applied file changes to disk");
              }
            } catch (error) {
              logger.error("Error processing dyad-write tags:", error);
            }
          }

          const addDependencies = getDyadAddDependencyTags(fullResponse);

          // 🚀 PERFORMANCE FIX: Disable auto-fix for Expo apps to prevent excessive problems
          const isExpoApp = updatedChat.app?.path?.includes('expo') ||
            fullResponse.includes('expo-') ||
            fullResponse.includes('react-native');

          if (
            !abortController.signal.aborted &&
            // If there are dependencies, we don't want to auto-fix problems
            // because there's going to be type errors since the packages aren't
            // installed yet.
            addDependencies.length === 0 &&
            settings.enableAutoFixProblems &&
            settings.selectedChatMode !== "ask" &&
            // 🚀 DISABLE for Expo apps to prevent 121+ false positive problems
            !isExpoApp
          ) {
            try {
              // RESTORED: Original Dyad auto-fix logic (simpler, more reliable)
              let problemReport = await generateProblemReport({
                fullResponse,
                appPath: getDyadAppPath(updatedChat.app.path),
              });

              let autoFixAttempts = 0;
              const originalFullResponse = fullResponse;
              const previousAttempts: CoreMessage[] = [];
              while (
                problemReport.problems.length > 0 &&
                autoFixAttempts < 2 &&
                !abortController.signal.aborted
              ) {
                // APPLAA ENHANCEMENT: Support both dyad-problem-report and applaa-problem-report
                fullResponse += `<dyad-problem-report summary="${problemReport.problems.length} problems">
${problemReport.problems
                    .map(
                      (problem) =>
                        `<problem file="${escapeXml(problem.file)}" line="${problem.line}" column="${problem.column}" code="${problem.code}">${escapeXml(problem.message)}</problem>`,
                    )
                    .join("\n")}
</dyad-problem-report>`;

                logger.info(
                  `Attempting to auto-fix problems, attempt #${autoFixAttempts + 1}`,
                );
                autoFixAttempts++;
                const problemFixPrompt = createProblemFixPrompt(problemReport);

                const virtualFileSystem = new AsyncVirtualFileSystem(
                  getDyadAppPath(updatedChat.app.path),
                  {
                    fileExists: (fileName: string) => fileExists(fileName),
                    readFile: (fileName: string) => readFileWithCache(fileName),
                  },
                );
                const writeTags = getDyadWriteTags(fullResponse);
                const renameTags = getDyadRenameTags(fullResponse);
                const deletePaths = getDyadDeleteTags(fullResponse);
                virtualFileSystem.applyResponseChanges({
                  deletePaths,
                  renameTags,
                  writeTags,
                });

                const { formattedOutput: codebaseInfo, files } =
                  await extractCodebase({
                    appPath,
                    chatContext,
                    virtualFileSystem,
                  });
                const { modelClient } = await getModelClient(
                  settings.selectedModel,
                  settings,
                  files,
                );

                const { fullStream } = await simpleStreamText({
                  modelClient,
                  chatMessages: [
                    ...chatMessages.map((msg, index) => {
                      if (
                        index === 0 &&
                        msg.role === "user" &&
                        typeof msg.content === "string" &&
                        msg.content.startsWith(CODEBASE_PROMPT_PREFIX)
                      ) {
                        return {
                          role: "user",
                          content: createCodebasePrompt(codebaseInfo),
                        } as const;
                      }
                      return msg;
                    }),
                    {
                      role: "assistant",
                      content: removeNonEssentialTags(originalFullResponse),
                    },
                    ...previousAttempts,
                    { role: "user", content: problemFixPrompt },
                  ],
                });
                previousAttempts.push({
                  role: "user",
                  content: problemFixPrompt,
                });
                const result = await processStreamChunks({
                  fullStream,
                  fullResponse,
                  abortController,
                  chatId: req.chatId,
                  processResponseChunkUpdate,
                });

                // 🚨 CRITICAL: Check abort signal immediately after stream processing
                if (abortController.signal.aborted) {
                  logger.log(`🚨 Auto-fix loop aborted for chat ${req.chatId}`);
                  break; // Exit the while loop immediately
                }

                fullResponse = result.fullResponse;
                previousAttempts.push({
                  role: "assistant",
                  content: removeNonEssentialTags(result.incrementalResponse),
                });

                problemReport = await generateProblemReport({
                  fullResponse,
                  appPath: getDyadAppPath(updatedChat.app.path),
                });
              }

              // Process any remaining dyad-write tags after auto-fix completes
              if (!abortController.signal.aborted) {
                try {
                  logger.info("Processing dyad-write tags after auto-fix completion");
                  const writeTags = getDyadWriteTags(fullResponse);
                  const renameTags = getDyadRenameTags(fullResponse);
                  const deletePaths = getDyadDeleteTags(fullResponse);

                  if (writeTags.length > 0 || renameTags.length > 0 || deletePaths.length > 0) {
                    logger.info(`Found ${writeTags.length} write tags, ${renameTags.length} rename tags, ${deletePaths.length} delete tags after auto-fix`);

                    const virtualFileSystem = new AsyncVirtualFileSystem(
                      getDyadAppPath(updatedChat.app.path),
                      {
                        fileExists: (fileName: string) => fileExists(fileName),
                        readFile: (fileName: string) => readFileWithCache(fileName),
                      },
                    );

                    await virtualFileSystem.applyResponseChanges({
                      deletePaths,
                      renameTags,
                      writeTags,
                    });

                    logger.info("Successfully applied file changes to disk after auto-fix");
                  }

                  // 🤖 AI-DRIVEN SCHEMA GENERATION: Process schema creation tags
                  const schemaTags = getSchemaCreationTags(fullResponse);
                  if (schemaTags.length > 0 && updatedChat.app?.id) {
                    logger.info(`🗄️ Found ${schemaTags.length} schema creation tag(s) in AI response`);
                    for (const schemaTag of schemaTags) {
                      try {
                        logger.info(`🗄️ Creating tables: ${schemaTag.tables.join(", ")} for app ${updatedChat.app.id}`);

                        // Import executeSchema from lib/schema_parser
                        const { executeSchema } = await import("../../lib/schema_parser");
                        const result = await executeSchema(updatedChat.app.id, schemaTag.sql);

                        if (result.success) {
                          logger.info(`✅ Successfully created tables: ${schemaTag.tables.join(", ")}`);
                        } else {
                          logger.error(`❌ Failed to create tables:`, result.error);
                        }
                      } catch (error) {
                        logger.error(`❌ Error processing schema tag:`, error);
                      }
                    }
                  }
                } catch (error) {
                  logger.error("Error processing dyad-write tags after auto-fix:", error);
                }
              }
            } catch (error) {
              logger.error(
                "Error generating problem report or auto-fixing:",
                settings.enableAutoFixProblems,
                error,
              );
            }
          }
        } catch (streamError) {
          // Check if this was an abort error
          if (abortController.signal.aborted) {
            const chatId = req.chatId;
            const partialResponse = partialResponses.get(req.chatId);
            // If we have a partial response, save it to the database
            if (partialResponse) {
              try {
                // Update the placeholder assistant message with the partial content and cancellation note
                await db
                  .update(messages)
                  .set({
                    content: `${partialResponse}

[Response cancelled by user]`,
                  })
                  .where(eq(messages.id, placeholderAssistantMessage.id));

                logger.log(
                  `Updated cancelled response for placeholder message ${placeholderAssistantMessage.id} in chat ${chatId}`,
                );
                partialResponses.delete(req.chatId);
              } catch (error) {
                logger.error(
                  `Error saving partial response for chat ${chatId}:`,
                  error,
                );
              }
            }
            return req.chatId;
          }
          throw streamError;
        }
      }

      // Only save the response and process it if we weren't aborted
      if (!abortController.signal.aborted && fullResponse) {
        // APPLAA ENHANCEMENT: Support both dyad-chat-summary and applaa-chat-summary
        const chatTitle = fullResponse.match(
          /<(?:dyad-chat-summary|applaa-chat-summary)>(.*?)<\/(?:dyad-chat-summary|applaa-chat-summary)>/,
        );
        if (chatTitle) {
          await db
            .update(chats)
            .set({ title: chatTitle[1] })
            .where(and(eq(chats.id, req.chatId), isNull(chats.title)));
        }
        const chatSummary = chatTitle?.[1];

        // Update the placeholder assistant message with the full response
        await db
          .update(messages)
          .set({ content: fullResponse })
          .where(eq(messages.id, placeholderAssistantMessage.id));

        const settings = readSettings();
        if (
          settings.autoApproveChanges &&
          settings.selectedChatMode !== "ask"
        ) {
          const status = await processFullResponseActions(
            fullResponse,
            req.chatId,
            {
              chatSummary,
              messageId: placeholderAssistantMessage.id,
            },
          );

          const chat = await db.query.chats.findFirst({
            where: eq(chats.id, req.chatId),
            with: {
              messages: {
                orderBy: (messages, { asc }) => [asc(messages.createdAt)],
              },
            },
          });

          safeSend(event.sender, "chat:response:chunk", {
            chatId: req.chatId,
            messages: chat?.messages || [],
          });

          if (status.error) {
            safeSend(
              event.sender,
              "chat:response:error",
              `Sorry, there was an error applying the AI's changes: ${status.error}`,
            );
          }

          // 💎 CREDIT DEDUCTION: Deduct credits from actual token usage (100 credits = 1M tokens)
          const creditCostFromTokens = creditsFromTokens(tokensUsed);
          if (userId && creditCostFromTokens > 0) {
            try {
              await deductCredits(userId, 'chat_message', creditCostFromTokens, {
                chatId: req.chatId,
                appId: updatedChat.app.id,
                appName: updatedChat.app.name ?? undefined,
                model: settings.selectedModel?.name,
                provider: settings.selectedModel?.provider,
                tokensUsed: tokensUsed, // Include token usage in metadata
              });
            } catch (creditError: any) {
              // Log but don't throw - the chat was successful
              logger.error('Failed to deduct credits after chat completion:', creditError);
            }
          }

          // 📊 TOKEN TRACKING: Track token usage after successful completion (provider usage when available)
          if (!userId) {
            logger.warn(`Token tracking skipped: No userId found for chat ${req.chatId}`);
          } else if (tokensUsed <= 0) {
            logger.warn(`Token tracking skipped: tokensUsed is ${tokensUsed} for chat ${req.chatId}`);
          } else {
            try {
              logger.info(`Tracking token usage: ${tokensUsed} tokens for user ${userId}, chat ${req.chatId}`);
              await trackTokenUsage(userId, tokensUsed, 'chat_message', {
                chatId: req.chatId,
                appId: updatedChat.app.id,
                appName: updatedChat.app.name ?? undefined,
                model: settings.selectedModel?.name,
                provider: settings.selectedModel?.provider,
              });
              logger.info(`✅ Successfully tracked ${tokensUsed} tokens for user ${userId}`);
            } catch (tokenError: any) {
              // Log but don't throw - the chat was successful
              logger.error('Failed to track token usage after chat completion:', tokenError);
              logger.error('Token tracking error details:', {
                userId,
                tokensUsed,
                chatId: req.chatId,
                appId: updatedChat.app.id,
                error: tokenError.message,
              });
            }
          }

          // Signal that the stream has completed
          safeSend(event.sender, "chat:response:end", {
            chatId: req.chatId,
            updatedFiles: status.updatedFiles ?? false,
            extraFiles: status.extraFiles,
            extraFilesError: status.extraFilesError,
          } satisfies ChatResponseEnd);

          // 🚀 PERFORMANCE: Notify preview system that LLM generation is complete
          try {
            await onLLMGenerationComplete(updatedChat.app.id);
          } catch (error) {
            logger.warn(`⚠️ Failed to notify preview completion:`, error);
          }
        } else {
          // 💎 CREDIT DEDUCTION: Deduct credits from actual token usage (100 credits = 1M tokens)
          const creditCostFromTokens = creditsFromTokens(tokensUsed);
          if (userId && creditCostFromTokens > 0) {
            try {
              await deductCredits(userId, 'chat_message', creditCostFromTokens, {
                chatId: req.chatId,
                appId: updatedChat.app.id,
                appName: updatedChat.app.name ?? undefined,
                model: settings.selectedModel?.name,
                provider: settings.selectedModel?.provider,
                tokensUsed: tokensUsed,
              });
            } catch (creditError: any) {
              // Log but don't throw - the chat was successful
              logger.error('Failed to deduct credits after chat completion:', creditError);
            }
          }

          // 📊 TOKEN TRACKING: Track token usage for simple completion (ask mode)
          if (!userId) {
            logger.warn(`Token tracking skipped (ask mode): No userId found for chat ${req.chatId}`);
          } else if (tokensUsed <= 0) {
            logger.warn(`Token tracking skipped (ask mode): tokensUsed is ${tokensUsed} for chat ${req.chatId}`);
          } else {
            try {
              logger.info(`Tracking token usage (ask mode): ${tokensUsed} tokens for user ${userId}, chat ${req.chatId}`);
              await trackTokenUsage(userId, tokensUsed, 'chat_message', {
                chatId: req.chatId,
                appId: updatedChat.app.id,
                appName: updatedChat.app.name ?? undefined,
                model: settings.selectedModel?.name,
                provider: settings.selectedModel?.provider,
              });
              logger.info(`✅ Successfully tracked ${tokensUsed} tokens for user ${userId} (ask mode)`);
            } catch (tokenError: any) {
              // Log but don't throw - the chat was successful
              logger.error('Failed to track token usage after chat completion (ask mode):', tokenError);
              logger.error('Token tracking error details:', {
                userId,
                tokensUsed,
                chatId: req.chatId,
                error: tokenError.message,
              });
            }
          }

          safeSend(event.sender, "chat:response:end", {
            chatId: req.chatId,
            updatedFiles: false,
          } satisfies ChatResponseEnd);
        }
      }

      // Clean up any temporary files
      if (attachmentPaths.length > 0) {
        for (const filePath of attachmentPaths) {
          try {
            // We don't immediately delete files because they might be needed for reference
            // Instead, schedule them for deletion after some time
            setTimeout(
              async () => {
                if (fs.existsSync(filePath)) {
                  await unlink(filePath);
                  logger.log(`Deleted temporary file: ${filePath}`);
                }
              },
              30 * 60 * 1000,
            ); // Delete after 30 minutes
          } catch (error) {
            logger.error(`Error scheduling file deletion: ${error}`);
          }
        }
      }

      // 🚀 STOP PERIODIC PERSISTENCE: Stream completed successfully
      stopPeriodicPersistence(req.chatId);

      // Return the chat ID for backwards compatibility
      return req.chatId;
    } catch (error) {
      const isCancellation =
        error instanceof Error &&
        (error.message.includes('terminated') || error.message.includes('aborted') || error.message.includes('cancelled'));
      const isApiError = error instanceof Error && error.message.includes('Responses API error:');
      if (isCancellation) {
        logger.warn("LLM request was cancelled or terminated:", (error as Error).message);
      } else if (isApiError) {
        logger.warn("LLM request failed (Responses API error):", (error as Error).message);
      } else {
        logger.error("Error calling LLM:", error);
      }

      // Provide more user-friendly error messages for common errors
      let errorMessage = `Sorry, there was an error processing your request: ${error}`;
      if (error instanceof Error) {
        if (error.message.includes('terminated') || error.message.includes('aborted') || error.message.includes('cancelled')) {
          errorMessage = "Request was cancelled or terminated. Please try again.";
        } else if (error.message.includes('Responses API error:')) {
          // Server sent error/response.failed in stream (e.g. second request rate limit or model error)
          const detail = error.message.replace(/^Responses API error:\s*/i, '').trim();
          errorMessage = detail ? `The AI service returned an error: ${detail}. Please try again.` : "The AI service returned an error. Please try again.";
        } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
          errorMessage = "Request timed out. The server may be slow or overloaded. Please try again.";
        } else if (error.message.includes('Network error') || error.message.includes('fetch failed')) {
          errorMessage = "Network error: Unable to connect to the AI service. Please check your internet connection and try again.";
        } else {
          errorMessage = `Sorry, there was an error: ${error.message}`;
        }
      }

      safeSend(
        event.sender,
        "chat:response:error",
        errorMessage,
      );
      // Clean up the abort controller
      activeStreams.delete(req.chatId);
      // 🚀 STOP PERIODIC PERSISTENCE: Clean up auto-save timer
      stopPeriodicPersistence(req.chatId);
      // Clean up file uploads state on error
      FileUploadsState.getInstance().clear();
      return "error";
    }
  });

  // Handler to cancel an ongoing stream
  ipcMain.handle("chat:cancel", async (event, chatId: number) => {
    const abortController = activeStreams.get(chatId);

    if (abortController) {
      // 🚨 CRITICAL FIX: Immediately abort the stream
      logger.log(`🚨 Cancelling stream for chat ${chatId}`);
      abortController.abort();
      activeStreams.delete(chatId);
      logger.log(`✅ Stream aborted for chat ${chatId}`);
    } else {
      logger.warn(`No active stream found for chat ${chatId}`);
    }

    // 🚀 STOP PERIODIC PERSISTENCE: Stream was cancelled
    stopPeriodicPersistence(chatId);

    // Send the end event to the renderer immediately
    safeSend(event.sender, "chat:response:end", {
      chatId,
      updatedFiles: false,
    } satisfies ChatResponseEnd);

    return true;
  });

  // 🚀 NEW: Handler to detect and recover interrupted streams
  ipcMain.handle("chat:detect-interrupted", async (event, chatId: number) => {
    try {
      // Check if there's a message with auto-save marker
      const lastMessage = await db.query.messages.findFirst({
        where: and(
          eq(messages.chatId, chatId),
          eq(messages.role, "assistant")
        ),
        orderBy: (messages, { desc }) => [desc(messages.createdAt)],
      });

      if (lastMessage?.content?.includes("[⚡ Auto-saved progress - Stream can be resumed]")) {
        logger.log(`🔄 Detected interrupted stream for chat ${chatId}`);
        return {
          interrupted: true,
          messageId: lastMessage.id,
          partialContent: lastMessage.content.replace("\n\n[⚡ Auto-saved progress - Stream can be resumed]", ""),
          canResume: true,
        };
      }

      return { interrupted: false, canResume: false };
    } catch (error) {
      logger.error(`Error detecting interrupted stream for chat ${chatId}:`, error);
      return { interrupted: false, canResume: false };
    }
  });

  // 🚀 NEW: Handler to resume interrupted streams
  ipcMain.handle("chat:resume-interrupted", async (event, { chatId, messageId, continuePrompt }: {
    chatId: number;
    messageId: number;
    continuePrompt?: string;
  }) => {
    try {
      // Clean up the auto-save marker and add resume marker
      const resumePrompt = continuePrompt || "Please continue where you left off and complete the implementation.";

      await db
        .update(messages)
        .set({
          content: `[🔄 Resuming interrupted stream...]

${resumePrompt}`,
        })
        .where(eq(messages.id, messageId));

      // Trigger a new stream request (will be handled by the frontend)
      logger.log(`🚀 Prepared resume for chat ${chatId} with prompt: "${resumePrompt}"`);
      return { success: true, resumePrompt };
    } catch (error) {
      logger.error(`Error resuming interrupted stream for chat ${chatId}:`, error);
      throw error;
    }
  });
}

export function formatMessagesForSummary(
  messages: { role: string; content: string | undefined }[],
) {
  if (messages.length <= 8) {
    // If we have 8 or fewer messages, include all of them
    return messages
      .map((m) => `<message role="${m.role}">${m.content}</message>`)
      .join("\n");
  }

  // Take first 2 messages and last 6 messages
  const firstMessages = messages.slice(0, 2);
  const lastMessages = messages.slice(-6);

  // Combine them with an indicator of skipped messages
  const combinedMessages = [
    ...firstMessages,
    {
      role: "system",
      content: `[... ${messages.length - 8} messages omitted ...]`,
    },
    ...lastMessages,
  ];

  return combinedMessages
    .map((m) => `<message role="${m.role}">${m.content}</message>`)
    .join("\n");
}

// Helper function to replace text attachment placeholders with full content
async function replaceTextAttachmentWithContent(
  text: string,
  filePath: string,
  fileName: string,
): Promise<string> {
  try {
    if (await isTextFile(filePath)) {
      // Read the full content
      const fullContent = await readFile(filePath, "utf-8");

      // Replace the placeholder tag with the full content
      const escapedPath = filePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const tagPattern = new RegExp(
        `<dyad-text-attachment filename="[^"]*" type="[^"]*" path="${escapedPath}">\\s*<\\/dyad-text-attachment>`,
        "g",
      );

      const replacedText = text.replace(
        tagPattern,
        `Full content of ${fileName}:\n\`\`\`\n${fullContent}\n\`\`\``,
      );

      logger.log(
        `Replaced text attachment content for: ${fileName} - length before: ${text.length} - length after: ${replacedText.length}`,
      );
      return replacedText;
    }
    return text;
  } catch (error) {
    logger.error(`Error processing text file: ${error}`);
    return text;
  }
}

// Helper function to convert traditional message to one with proper image attachments
async function prepareMessageWithAttachments(
  message: CoreMessage,
  attachmentPaths: string[],
): Promise<CoreMessage> {
  let textContent = message.content;
  // Get the original text content
  if (typeof textContent !== "string") {
    logger.warn(
      "Message content is not a string - shouldn't happen but using message as-is",
    );
    return message;
  }

  // Process text file attachments - replace placeholder tags with full content
  for (const filePath of attachmentPaths) {
    const fileName = path.basename(filePath);
    textContent = await replaceTextAttachmentWithContent(
      textContent,
      filePath,
      fileName,
    );
  }

  // For user messages with attachments, create a content array
  const contentParts: (TextPart | ImagePart)[] = [];

  // Add the text part first with possibly modified content
  contentParts.push({
    type: "text",
    text: textContent,
  });

  // Add image parts for any image attachments
  for (const filePath of attachmentPaths) {
    const ext = path.extname(filePath).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
      try {
        // Read the file as a buffer
        const imageBuffer = await readFile(filePath);

        // Add the image to the content parts
        contentParts.push({
          type: "image",
          image: imageBuffer,
        });

        logger.log(`Added image attachment: ${filePath}`);
      } catch (error) {
        logger.error(`Error reading image file: ${error}`);
      }
    }
  }

  // Return the message with the content array
  return {
    role: "user",
    content: contentParts,
  };
}

function removeNonEssentialTags(text: string): string {
  return removeProblemReportTags(removeThinkingTags(text));
}

function removeThinkingTags(text: string): string {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  return text.replace(thinkRegex, "").trim();
}

export function removeProblemReportTags(text: string): string {
  // APPLAA ENHANCEMENT: Support both dyad-problem-report and applaa-problem-report
  const problemReportRegex =
    /<(?:dyad-problem-report|applaa-problem-report)[^>]*>[\s\S]*?<\/(?:dyad-problem-report|applaa-problem-report)>/g;
  return text.replace(problemReportRegex, "").trim();
}

export function removeDyadTags(text: string): string {
  // APPLAA ENHANCEMENT: Remove both dyad-* and applaa-* tags
  const dyadRegex = /<(?:dyad-|applaa-)[^>]*>[\s\S]*?<\/(?:dyad-|applaa-)[^>]*>/g;
  return text.replace(dyadRegex, "").trim();
}

export function hasUnclosedDyadWrite(text: string): boolean {
  // APPLAA ENHANCEMENT: Check for both dyad-write and applaa-write tags
  const openRegex = /<(?:dyad-write|applaa-write)[^>]*>/g;
  let lastOpenIndex = -1;
  let lastTagType = "";
  let match;

  while ((match = openRegex.exec(text)) !== null) {
    lastOpenIndex = match.index;
    // Extract the tag type (dyad-write or applaa-write)
    lastTagType = match[0].includes("applaa-write") ? "applaa-write" : "dyad-write";
  }

  // If no opening tag found, there's nothing unclosed
  if (lastOpenIndex === -1) {
    return false;
  }

  // Look for a closing tag after the last opening tag
  const textAfterLastOpen = text.substring(lastOpenIndex);
  const hasClosingTag = new RegExp(`<\\/${lastTagType}>`).test(textAfterLastOpen);

  return !hasClosingTag;
}

function escapeDyadTags(text: string): string {
  // APPLAA ENHANCEMENT: Escape both dyad and applaa tags in reasoning content
  return text
    .replace(/<dyad/g, "＜dyad")
    .replace(/<\/dyad/g, "＜/dyad")
    .replace(/<applaa/g, "＜applaa")
    .replace(/<\/applaa/g, "＜/applaa");
}

const CODEBASE_PROMPT_PREFIX = "This is my codebase.";
function createCodebasePrompt(codebaseInfo: string): string {
  return `${CODEBASE_PROMPT_PREFIX} ${codebaseInfo}`;
}

function createOtherAppsCodebasePrompt(otherAppsCodebaseInfo: string): string {
  return `
# Referenced Apps

These are the other apps that I've mentioned in my prompt. These other apps' codebases are READ-ONLY.

${otherAppsCodebaseInfo}
`;
}