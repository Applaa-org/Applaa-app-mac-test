import { ipcMain, BrowserWindow, WebContentsView } from 'electron';
import log from 'electron-log';
import { chromiumManager } from '../../lib/browser/chromium-manager';

const logger = log.scope('chromium-handlers');

// Global WebContentsView reference (modern replacement for BrowserView)
let browserView: WebContentsView | null = null;

function getMainWindow(): BrowserWindow | null {
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
        return global.mainWindow;
    }
    const windows = BrowserWindow.getAllWindows();
    return windows.length > 0 ? windows[0] : null;
}

export function registerChromiumHandlers() {
    logger.info('Registering Chromium Browser Handlers');

    // Initialize BrowserView for displaying Chromium content
    ipcMain.handle('chromium:init-view', async () => {
        try {
            const win = getMainWindow();
            if (!win) {
                throw new Error('Main window not found');
            }

            // Create WebContentsView if it doesn't exist
            if (!browserView) {
                browserView = new WebContentsView({
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                        sandbox: true,
                    }
                });
                logger.info('✅ WebContentsView created');

                // Load Applaa Buddy extension into BrowserView session
                try {
                    const path = require('path');
                    const { app } = require('electron');
                    const isDev = !app.isPackaged;
                    const extensionPath = isDev
                        ? path.join(process.cwd(), 'extensions', 'buddy')
                        : path.join(process.resourcesPath, 'extensions', 'buddy');

                    await browserView.webContents.session.loadExtension(extensionPath, {
                        allowFileAccess: true
                    });
                    logger.info('✅ Applaa Buddy extension loaded into BrowserView');
                } catch (extError) {
                    logger.warn('⚠️ Could not load Applaa Buddy extension:', extError);
                }
            }

            // Ensure it's attached to the window
            win.contentView.addChildView(browserView);
            logger.info('✅ WebContentsView attached to window');

            // Load about:blank initially
            await browserView.webContents.loadURL('about:blank');

            return { success: true };
        } catch (error) {
            logger.error('Failed to initialize BrowserView:', error);
            return { success: false, error: String(error) };
        }
    });

    // Set BrowserView bounds
    ipcMain.handle('chromium:set-bounds', async (_event, { x, y, width, height }: { x: number; y: number; width: number; height: number }) => {
        try {
            if (browserView) {
                browserView.setBounds({ x, y, width, height });
                logger.info(`BrowserView bounds set: ${width}x${height} at (${x}, ${y})`);
            }
            return { success: true };
        } catch (error) {
            logger.error('Failed to set bounds:', error);
            return { success: false, error: String(error) };
        }
    });

    // Launch Chromium
    ipcMain.handle('chromium:launch', async () => {
        try {
            await chromiumManager.launch();
            return { success: true };
        } catch (error) {
            logger.error('Failed to launch Chromium:', error);
            return { success: false, error: String(error) };
        }
    });

    // Create new tab
    ipcMain.handle('chromium:create-tab', async (_event, { url }: { url?: string }) => {
        try {
            const tabId = await chromiumManager.createTab(url);
            const tabInfo = await chromiumManager.getTabInfo(tabId);

            // Load the page in BrowserView
            if (browserView && tabInfo.url) {
                await browserView.webContents.loadURL(tabInfo.url);
            }

            return { success: true, tab: tabInfo };
        } catch (error) {
            logger.error('Failed to create tab:', error);
            return { success: false, error: String(error) };
        }
    });

    // Close tab
    ipcMain.handle('chromium:close-tab', async (_event, { tabId }: { tabId: string }) => {
        try {
            await chromiumManager.closeTab(tabId);
            return { success: true };
        } catch (error) {
            logger.error('Failed to close tab:', error);
            return { success: false, error: String(error) };
        }
    });

    // Switch tab
    ipcMain.handle('chromium:switch-tab', async (_event, { tabId }: { tabId: string }) => {
        try {
            await chromiumManager.switchTab(tabId);
            const tabInfo = await chromiumManager.getTabInfo(tabId);

            // Load the tab's URL in BrowserView
            if (browserView && tabInfo.url) {
                await browserView.webContents.loadURL(tabInfo.url);
            }

            return { success: true };
        } catch (error) {
            logger.error('Failed to switch tab:', error);
            return { success: false, error: String(error) };
        }
    });

    // Navigate
    ipcMain.handle('chromium:navigate', async (_event, { tabId, url }: { tabId: string; url: string }) => {
        try {
            await chromiumManager.navigate(tabId, url);
            const tabInfo = await chromiumManager.getTabInfo(tabId);

            // Load in BrowserView
            if (browserView) {
                await browserView.webContents.loadURL(tabInfo.url);
            }

            return { success: true, tab: tabInfo };
        } catch (error) {
            logger.error('Failed to navigate:', error);
            return { success: false, error: String(error) };
        }
    });

    // Go back
    ipcMain.handle('chromium:go-back', async (_event, { tabId }: { tabId: string }) => {
        try {
            await chromiumManager.goBack(tabId);
            const tabInfo = await chromiumManager.getTabInfo(tabId);

            // Load in BrowserView
            if (browserView) {
                await browserView.webContents.loadURL(tabInfo.url);
            }

            return { success: true, tab: tabInfo };
        } catch (error) {
            logger.error('Failed to go back:', error);
            return { success: false, error: String(error) };
        }
    });

    // Go forward
    ipcMain.handle('chromium:go-forward', async (_event, { tabId }: { tabId: string }) => {
        try {
            await chromiumManager.goForward(tabId);
            const tabInfo = await chromiumManager.getTabInfo(tabId);

            // Load in BrowserView
            if (browserView) {
                await browserView.webContents.loadURL(tabInfo.url);
            }

            return { success: true, tab: tabInfo };
        } catch (error) {
            logger.error('Failed to go forward:', error);
            return { success: false, error: String(error) };
        }
    });

    // Reload
    ipcMain.handle('chromium:reload', async (_event, { tabId }: { tabId: string }) => {
        try {
            await chromiumManager.reload(tabId);
            const tabInfo = await chromiumManager.getTabInfo(tabId);

            // Reload in BrowserView
            if (browserView) {
                await browserView.webContents.reload();
            }

            return { success: true, tab: tabInfo };
        } catch (error) {
            logger.error('Failed to reload:', error);
            return { success: false, error: String(error) };
        }
    });

    // Get all tabs
    ipcMain.handle('chromium:get-all-tabs', async () => {
        try {
            const tabs = await chromiumManager.getAllTabs();
            const activeTabId = chromiumManager.getActivePageId();
            return { success: true, tabs, activeTabId };
        } catch (error) {
            logger.error('Failed to get tabs:', error);
            return { success: false, error: String(error) };
        }
    });

    // Get tab info
    ipcMain.handle('chromium:get-tab-info', async (_event, { tabId }: { tabId: string }) => {
        try {
            const tabInfo = await chromiumManager.getTabInfo(tabId);
            return { success: true, tab: tabInfo };
        } catch (error) {
            logger.error('Failed to get tab info:', error);
            return { success: false, error: String(error) };
        }
    });

    // Hide WebContentsView (remove from window)
    ipcMain.handle('chromium:hide-view', async () => {
        try {
            if (browserView) {
                // Aggressively hide by setting bounds to zero first
                browserView.setBounds({ x: 0, y: 0, width: 0, height: 0 });

                const win = getMainWindow();
                if (win) {
                    win.contentView.removeChildView(browserView);
                    logger.info('✅ WebContentsView hidden (removed from window)');
                }
            }
            return { success: true };
        } catch (error) {
            logger.error('Failed to hide view:', error);
            return { success: false, error: String(error) };
        }
    });

    // Close Chromium
    ipcMain.handle('chromium:close', async () => {
        try {
            await chromiumManager.close();

            // Clean up BrowserView
            if (browserView) {
                const win = getMainWindow();
                if (win) {
                    if (win) win.contentView.removeChildView(browserView);
                }
                browserView = null;
            }

            return { success: true };
        } catch (error) {
            logger.error('Failed to close Chromium:', error);
            return { success: false, error: String(error) };
        }
    });

    logger.info('✅ Chromium handlers registered');
}

// Export function to get the active WebContentsView for automation
export function getActiveBrowserView(): WebContentsView | null {
    return browserView;
}

