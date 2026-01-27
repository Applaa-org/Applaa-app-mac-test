import { ipcMain } from 'electron';
import { db } from '@/db';
import { browserTabs, chats, apps } from '@/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import log from 'electron-log';

/**
 * Tab Management IPC Handlers
 * 
 * Handles:
 * - Creating tabs with associated chats
 * - Listing tabs
 * - Updating tabs
 * - Deleting tabs
 * - Setting active tab
 */

// Special "Applaa Buddy" app ID
let BUDDY_APP_ID: number | null = null;

async function getBuddyAppId(): Promise<number> {
    if (BUDDY_APP_ID) return BUDDY_APP_ID;

    // Find or create Applaa Buddy app
    const existingApp = await db.query.apps.findFirst({
        where: eq(apps.name, 'Applaa Buddy'),
    });

    if (existingApp) {
        BUDDY_APP_ID = existingApp.id;
        return existingApp.id;
    }

    // Create Applaa Buddy app
    const [newApp] = await db.insert(apps).values({
        name: 'Applaa Buddy',
        path: '', // No path for browser agent
        appType: 'web',
    }).returning({ id: apps.id });

    BUDDY_APP_ID = newApp.id;
    log.info('[TabHandlers] Created Applaa Buddy app:', newApp.id);
    return newApp.id;
}

export function registerTabHandlers() {
    // List all tabs
    ipcMain.handle('tabs:list', async () => {
        try {
            const tabs = await db.query.browserTabs.findMany({
                orderBy: [asc(browserTabs.position)],
            });

            return tabs;
        } catch (error) {
            log.error('[TabHandlers] Failed to list tabs:', error);
            return [];
        }
    });

    // Create new tab
    ipcMain.handle('tabs:create', async (_, { url, title }) => {
        try {
            const buddyAppId = await getBuddyAppId();

            // Create chat for this tab
            const [newChat] = await db.insert(chats).values({
                appId: buddyAppId,
                title: title || 'New Tab',
            }).returning({ id: chats.id });

            // Get next position
            const existingTabs = await db.query.browserTabs.findMany();
            const nextPosition = existingTabs.length;

            // Deactivate all other tabs
            await db.update(browserTabs)
                .set({ isActive: false });

            // Create tab
            const [newTab] = await db.insert(browserTabs).values({
                title: title || 'New Tab',
                url: url || '',
                chatId: newChat.id,
                position: nextPosition,
                isActive: true,
            }).returning({ id: browserTabs.id });

            log.info('[TabHandlers] Created tab:', newTab.id);
            return newTab.id;
        } catch (error) {
            log.error('[TabHandlers] Failed to create tab:', error);
            throw error;
        }
    });

    // Update tab
    ipcMain.handle('tabs:update', async (_, { tabId, ...updates }) => {
        try {
            await db.update(browserTabs)
                .set({
                    ...updates,
                    updatedAt: new Date(),
                })
                .where(eq(browserTabs.id, tabId));

            log.info('[TabHandlers] Updated tab:', tabId);
            return { success: true };
        } catch (error) {
            log.error('[TabHandlers] Failed to update tab:', error);
            throw error;
        }
    });

    // Delete tab
    ipcMain.handle('tabs:delete', async (_, { tabId }) => {
        try {
            // Delete tab (cascade will delete associated chat and messages)
            await db.delete(browserTabs)
                .where(eq(browserTabs.id, tabId));

            log.info('[TabHandlers] Deleted tab:', tabId);
            return { success: true };
        } catch (error) {
            log.error('[TabHandlers] Failed to delete tab:', error);
            throw error;
        }
    });

    // Set active tab
    ipcMain.handle('tabs:setActive', async (_, { tabId }) => {
        try {
            // Deactivate all tabs
            await db.update(browserTabs)
                .set({ isActive: false });

            // Activate specified tab
            await db.update(browserTabs)
                .set({ isActive: true })
                .where(eq(browserTabs.id, tabId));

            log.info('[TabHandlers] Set active tab:', tabId);
            return { success: true };
        } catch (error) {
            log.error('[TabHandlers] Failed to set active tab:', error);
            throw error;
        }
    });

    log.info('[TabHandlers] Tab management handlers registered');
}
