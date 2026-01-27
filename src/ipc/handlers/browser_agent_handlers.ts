import { ipcMain, BrowserView, BrowserWindow } from 'electron';
import log from 'electron-log';

const logger = log.scope('browser-agent');

// Global reference to prevent garbage collection
let browserView: BrowserView | null = null;

function getMainWindow(): BrowserWindow | null {
    // Try global reference first
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
        return global.mainWindow;
    }
    // Fallback to focused window
    const focused = BrowserWindow.getFocusedWindow();
    if (focused) return focused;
    // Last resort - get first window
    const windows = BrowserWindow.getAllWindows();
    return windows.length > 0 ? windows[0] : null;
}

function createBrowserView(win: BrowserWindow): BrowserView {
    logger.info('Creating new BrowserView');
    const view = new BrowserView({
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false, // CRITICAL: Must be false to load external URLs
            webSecurity: true,
            allowRunningInsecureContent: false,
            backgroundThrottling: false,
        }
    });
    view.setBackgroundColor('#ffffff');

    // Enable CDP debugger for automation
    try {
        view.webContents.debugger.attach('1.3');
        logger.info('CDP Debugger attached to BrowserView');
    } catch (err) {
        logger.error('Failed to attach CDP Debugger:', err);
    }

    // Debug listeners
    view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        logger.error(`LOAD FAILED: ${validatedURL} - ${errorCode}: ${errorDescription}`);
    });
    view.webContents.on('did-finish-load', () => {
        logger.info('Page loaded:', view.webContents.getURL());
    });
    view.webContents.on('did-start-loading', () => {
        logger.info('Started loading...');
    });

    // Attach to window
    win.setBrowserView(view);

    // Set initial bounds to ensure view is visible
    const winBounds = win.getContentBounds();
    view.setBounds({
        x: 0,
        y: 0,
        width: Math.max(winBounds.width, 800),
        height: Math.max(winBounds.height, 600)
    });
    logger.info('Initial BrowserView bounds set:', view.getBounds());

    return view;
}

export function registerBrowserAgentHandlers() {
    logger.info('Registering Browser Agent Handlers');

    // Initialize connection to Chromium
    ipcMain.handle('browser-agent:init', async () => {
        try {
            if (!chromiumLauncher.isRunning()) {
                logger.warn('Chromium not running, launching now...');
                await chromiumLauncher.launch();
            }

            const browser = chromiumLauncher.getBrowser();
            if (!browser) {
                throw new Error('Chromium browser instance not available');
            }

            await chromiumController.connect(browser);
            logger.info('✅ Connected to Chromium via browser instance');
            return { success: true };
        } catch (error) {
            logger.error('Failed to initialize Chromium connection:', error);
            return { success: false, error: String(error) };
        }
    });

    // TEST HANDLER - to verify IPC is working
    ipcMain.handle('browser-agent:test-ping', async () => {
        logger.info('🔔 TEST PING RECEIVED!');
        console.log('🔔 TEST PING RECEIVED IN MAIN PROCESS!');
        return { success: true, message: 'IPC is working!' };
    });

    // Navigate to URL
    ipcMain.handle('browser-agent:navigate', async (_event, { url }: { url: string }) => {
        logger.info(`Navigate request: ${url}`);

        try {
            // Ensure we're connected to Chromium
            if (!chromiumController.isReady()) {
                logger.info('Chromium not connected, initializing...');
                if (!chromiumLauncher.isRunning()) {
                    await chromiumLauncher.launch();
                }
                const browser = chromiumLauncher.getBrowser();
                if (!browser) {
                    throw new Error('Chromium browser instance not available');
                }
                await chromiumController.connect(browser);
            }

            // Navigate using Chromium controller
            await chromiumController.navigate(url);

            // Get updated page info from Chromium
            const pageInfo = await chromiumController.getPageInfo();
            logger.info(`✅ Chromium navigated to: ${pageInfo.url}`);

            // Sync BrowserView to display the Chromium page
            const win = getMainWindow();
            if (win) {
                // Create or reuse BrowserView for display
                if (!browserView || browserView.webContents.isDestroyed()) {
                    logger.info('Creating BrowserView for display');
                    browserView = createBrowserView(win);
                } else if (win.getBrowserView() !== browserView) {
                    logger.info('Re-attaching BrowserView');
                    win.setBrowserView(browserView);
                }

                // Load the same URL in BrowserView to display it
                logger.info(`Loading ${pageInfo.url} in BrowserView for display`);
                await browserView.webContents.loadURL(pageInfo.url);
                logger.info('✅ BrowserView synced with Chromium page');
            }

            return {
                success: true,
                url: pageInfo.url,
                title: pageInfo.title
            };
        } catch (error) {
            logger.error('Navigation failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    // Set Bounds
    ipcMain.handle('browser-agent:set-bounds', async (_event, bounds: { x: number; y: number; width: number; height: number }) => {
        try {
            const win = getMainWindow();
            if (!win) {
                return { success: false, error: 'No main window' };
            }

            // Create view if needed
            if (!browserView || browserView.webContents.isDestroyed()) {
                browserView = createBrowserView(win);
            }

            // Apply bounds
            browserView.setBounds({
                x: Math.round(bounds.x),
                y: Math.round(bounds.y),
                width: Math.round(bounds.width),
                height: Math.round(bounds.height)
            });
            logger.debug('Bounds set:', bounds);

            return { success: true };
        } catch (e) {
            logger.error('Set bounds error:', e);
            return { success: false, error: String(e) };
        }
    });

    // Get Page Info
    ipcMain.handle('browser-agent:get-page-info', async () => {
        try {
            if (!chromiumController.isReady()) {
                return { success: true, url: '', title: '', canGoBack: false, canGoForward: false };
            }

            const pageInfo = await chromiumController.getPageInfo();
            return {
                success: true,
                ...pageInfo
            };
        } catch (error) {
            logger.error('Get page info failed:', error);
            return { success: false, error: String(error) };
        }
    });

    // Destroy
    ipcMain.handle('browser-agent:destroy', async () => {
        if (browserView) {
            try {
                const win = getMainWindow();
                if (win) win.removeBrowserView(browserView);
                if (!browserView.webContents.isDestroyed()) {
                    browserView.webContents.close();
                }
            } catch (e) {
                logger.warn('Error during destroy:', e);
            }
            browserView = null;
        }
        return { success: true };
    });

    // Navigation controls
    ipcMain.handle('browser-agent:go-back', async () => {
        try {
            if (!chromiumController.isReady()) {
                return { success: false, error: 'Chromium not ready' };
            }
            await chromiumController.goBack();
            logger.info('✅ Navigated back');
            return { success: true };
        } catch (error) {
            logger.error('Go back failed:', error);
            return { success: false, error: String(error) };
        }
    });

    ipcMain.handle('browser-agent:go-forward', async () => {
        try {
            if (!chromiumController.isReady()) {
                return { success: false, error: 'Chromium not ready' };
            }
            await chromiumController.goForward();
            logger.info('✅ Navigated forward');
            return { success: true };
        } catch (error) {
            logger.error('Go forward failed:', error);
            return { success: false, error: String(error) };
        }
    });

    ipcMain.handle('browser-agent:reload', async () => {
        try {
            if (!chromiumController.isReady()) {
                return { success: false, error: 'Chromium not ready' };
            }
            await chromiumController.reload();
            logger.info('✅ Page reloaded');
            return { success: true };
        } catch (error) {
            logger.error('Reload failed:', error);
            return { success: false, error: String(error) };
        }
    });

    // Hide browser view (for new tab page)
    ipcMain.handle('browser-agent:hide', () => {
        try {
            const win = getMainWindow();
            if (win && browserView) {
                // Remove browser view from window
                win.setBrowserView(null);
                logger.info('Browser view hidden');
            }
            return { success: true };
        } catch (e) {
            logger.error('Error hiding browser:', e);
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        }
    });

    // Show browser view
    ipcMain.handle('browser-agent:show', () => {
        try {
            const win = getMainWindow();
            if (win && browserView) {
                // Re-attach browser view to window
                win.setBrowserView(browserView);
                logger.info('Browser view shown');
            }
            return { success: true };
        } catch (e) {
            logger.error('Error showing browser:', e);
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        }
    });

    // Annotation Mode - Inject script
    ipcMain.handle('browser-agent:inject-annotation', async () => {
        try {
            if (!browserView || browserView.webContents.isDestroyed()) {
                return { success: false, error: 'Browser view not available' };
            }

            const { ANNOTATION_SCRIPT } = await import('../../lib/browser/annotation-script');

            await browserView.webContents.executeJavaScript(ANNOTATION_SCRIPT);
            logger.info('Annotation script injected');

            return { success: true };
        } catch (e) {
            logger.error('Error injecting annotation script:', e);
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        }
    });

    // Annotation Mode - Toggle
    ipcMain.handle('browser-agent:toggle-annotation', async (_event, { enabled }: { enabled: boolean }) => {
        try {
            if (!browserView || browserView.webContents.isDestroyed()) {
                return { success: false, error: 'Browser view not available' };
            }

            await browserView.webContents.executeJavaScript(`
                window.postMessage({ type: 'TOGGLE_ANNOTATION_MODE', data: { enabled: ${enabled} } }, '*');
            `);

            logger.info('Annotation mode toggled:', enabled);
            return { success: true };
        } catch (e) {
            logger.error('Error toggling annotation:', e);
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        }
    });

    // Annotation Mode - Clear selection
    ipcMain.handle('browser-agent:clear-selection', async (_event, { selector }: { selector: string }) => {
        try {
            if (!browserView || browserView.webContents.isDestroyed()) {
                return { success: false, error: 'Browser view not available' };
            }

            await browserView.webContents.executeJavaScript(`
                window.postMessage({ type: 'CLEAR_SELECTION', data: { selector: '${selector}' } }, '*');
            `);

            return { success: true };
        } catch (e) {
            logger.error('Error clearing selection:', e);
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        }
    });

    // Get CDP URL for Playwright connection
    ipcMain.handle('browser-agent:get-cdp-url', async () => {
        try {
            if (!browserView || browserView.webContents.isDestroyed()) {
                return { success: false, error: 'Browser view not available' };
            }

            // In Electron, we often need to use a specific way to get the CDP URL
            // if --remote-debugging-port is NOT set.
            // If it is set, we can use the default localhost:port

            return {
                success: true,
                // We'll try to find the port dynamically or use a default
                port: 9222
            };
        } catch (e) {
            return { success: false, error: String(e) };
        }
    });

    // Automation: Generate Plan
    ipcMain.handle('browser-agent:generate-plan', async (_event, { prompt, context }: { prompt: string; context?: any }) => {
        try {
            const { generateAutomationPlan } = await import('../../lib/automation/planner');

            // Add CDP port to context for DOM extraction
            const enhancedContext = {
                ...context,
                cdpPort: 9222
            };

            const plan = await generateAutomationPlan(prompt, enhancedContext);
            return { success: true, plan };
        } catch (e) {
            logger.error('Error generating automation plan:', e);
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        }
    });

    // Automation: Execute Plan
    ipcMain.handle('browser-agent:execute-plan', async (event, { plan, port }: { plan: any; port?: number }) => {
        try {
            const win = getMainWindow();
            if (win && (!browserView || browserView.webContents.isDestroyed())) {
                logger.info('Creating BrowserView for automation plan execution');
                browserView = createBrowserView(win);

                // Set default bounds if hidden
                const winBounds = win.getContentBounds();
                browserView.setBounds({
                    x: 60,
                    y: 100,
                    width: winBounds.width - 60,
                    height: winBounds.height - 100
                });
            }

            const { AutomationExecutor } = await import('../../lib/automation/executor');
            const executor = new AutomationExecutor(port || 9222);

            const result = await executor.execute(plan, (update) => {
                // Stream progress back to renderer
                event.sender.send('browser-agent:automation-progress', update);
            });

            return { success: true, result };
        } catch (e) {
            logger.error('Error executing automation plan:', e);
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        }
    });

    logger.info('Browser Agent Handlers registered successfully');
}
