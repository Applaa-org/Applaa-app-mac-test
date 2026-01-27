import { ipcMain } from "electron";
import { db } from "../../db";
import { apps, chats, messages } from "../../db/schema";
import { desc, eq } from "drizzle-orm";
import type { ChatSummary } from "../../lib/schemas";
import * as git from "isomorphic-git";
import * as fs from "fs";
import { createLoggedHandler } from "./safe_handle";

import log from "electron-log";
import { getDyadAppPath } from "../../paths/paths";
import { UpdateChatParams } from "../ipc_types";

const logger = log.scope("chat_handlers");
const handle = createLoggedHandler(logger);

export function registerChatHandlers() {
  handle("create-chat", async (_, appId: number): Promise<number> => {
    // Get the app's path first with legacy fallback
    let app: any;
    try {
      app = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
        columns: {
          path: true,
        },
      });
    } catch (err) {
      logger.warn(
        "chat_handlers.create-chat: falling back to legacy SELECT due to:",
        err,
      );
      const row = db.$client
        .prepare("SELECT id, name, path FROM apps WHERE id = ?")
        .get(appId) as any;
      app = row;
    }

    if (!app) {
      throw new Error("App not found");
    }

    let initialCommitHash = null;
    try {
      // Get the current git revision of main branch
      initialCommitHash = await git.resolveRef({
        fs,
        dir: getDyadAppPath(app.path),
        ref: "main",
      });
    } catch (error) {
      logger.error("Error getting git revision:", error);
      // Continue without the git revision
    }

    // Create a new chat
    const [chat] = await db
      .insert(chats)
      .values({
        appId,
        initialCommitHash,
      })
      .returning();
    logger.info(
      "Created chat:",
      chat.id,
      "for app:",
      appId,
      "with initial commit hash:",
      initialCommitHash,
    );
    return chat.id;
  });

  ipcMain.handle("get-chat", async (_, chatId: number) => {
    logger.info(`get-chat called with chatId: ${chatId} (type: ${typeof chatId})`);

    try {
      let chat = await db.query.chats.findFirst({
        where: eq(chats.id, chatId),
        with: {
          messages: {
            orderBy: (messages, { asc }) => [asc(messages.createdAt)],
          },
        },
      });

      if (!chat) {
        logger.warn(`get-chat: Chat ${chatId} not found via Drizzle query. Attempting raw SQL fallback...`);
        // Fallback to raw SQL to verification
        const rawChat = db.$client.prepare("SELECT * FROM chats WHERE id = ?").get(chatId) as any;

        if (rawChat) {
          logger.info(`get-chat: Chat ${chatId} found via raw SQL! Drizzle query failed.`);
          // Fetch messages separately if needed, or just return basic chat (messages will be fetched by UI later if empty?)
          // The UI expects nested messages. Let's try to simulate it or just return what we have
          // Note: The UI likely needs messages.
          const rawMessages = db.$client.prepare("SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC").all(chatId) as any[];

          // Normalize dates
          if (rawChat.created_at && typeof rawChat.created_at === 'number') rawChat.createdAt = new Date(rawChat.created_at * 1000);
          rawChat.appId = rawChat.app_id; // Map kebab to camel if needed

          chat = {
            ...rawChat,
            messages: rawMessages.map((m: any) => ({
              ...m,
              chatId: m.chat_id,
              createdAt: typeof m.created_at === 'number' ? new Date(m.created_at * 1000) : m.created_at,
            }))
          };
        }
      }

      if (!chat) {
        logger.error(`get-chat: Chat ${chatId} truly not found in database.`);
        throw new Error(`Chat ${chatId} not found`);
      }

      return chat;
    } catch (error) {
      logger.error(`get-chat failed for chatId ${chatId}:`, error);
      throw error;
    }
  });

  handle("get-chats", async (_, appId?: number): Promise<ChatSummary[]> => {
    // If appId is provided, filter chats for that app
    const query = appId
      ? db.query.chats.findMany({
        where: eq(chats.appId, appId),
        columns: {
          id: true,
          title: true,
          createdAt: true,
          appId: true,
        },
        orderBy: [desc(chats.createdAt)],
      })
      : db.query.chats.findMany({
        columns: {
          id: true,
          title: true,
          createdAt: true,
          appId: true,
        },
        orderBy: [desc(chats.createdAt)],
      });

    const allChats = await query;
    return allChats;
  });

  handle("delete-chat", async (_, chatId: number): Promise<void> => {
    await db.delete(chats).where(eq(chats.id, chatId));
  });

  handle("update-chat", async (_, { chatId, title }: UpdateChatParams) => {
    await db.update(chats).set({ title }).where(eq(chats.id, chatId));
  });

  handle("delete-messages", async (_, chatId: number): Promise<void> => {
    await db.delete(messages).where(eq(messages.chatId, chatId));
  });
}
