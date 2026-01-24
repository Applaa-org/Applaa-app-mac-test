import puppeteer, { Browser } from 'puppeteer';
import path from 'path';
import { app } from 'electron';
import log from 'electron-log';
import fs from 'fs-extra';

const logger = log.scope('buddy-browser');

/**
 * Buddy Browser Service
 * Launches standalone Chromium with Applaa Buddy extension
 * Uses Puppeteer's bundled Chromium for full browser experience
 */
export class BuddyBrowser {
    private browser: Browser | null = null;
    private extensionPath: string;

    constructor() {
        // Path to Applaa Buddy extension
        const isDev = !app.isPackaged;
        this.extensionPath = isDev
            ? path.join(process.cwd(), 'extensions', 'buddy')
            : path.join(process.resourcesPath, 'extensions', 'buddy');
    }

    /**
     * Launch standalone Chromium browser with Applaa Buddy extension and full Applaa branding
     */
    async launch(): Promise<{ success: boolean; error?: string }> {
        try {
            logger.info('🚀 [BUDDY] Launching Applaa Browser (Chromium)...');

            // Check if extension exists
            const extensionExists = await fs.pathExists(this.extensionPath);
            if (!extensionExists) {
                throw new Error(
                    `Applaa Buddy extension not found at: ${this.extensionPath}\n` +
                    'Extension should be in extensions/buddy folder'
                );
            }

            // Close existing browser if any
            if (this.browser) {
                await this.close();
            }

            // Create Applaa-branded user data directory
            const isDev = !app.isPackaged;
            const userDataDir = isDev
                ? path.join(process.cwd(), '.applaa-browser-data')
                : path.join(app.getPath('userData'), 'ApplaaBrowser');

            // Path to Applaa theme extension
            const themeExtensionPath = isDev
                ? path.join(process.cwd(), 'extensions', 'applaa-theme')
                : path.join(process.resourcesPath, 'extensions', 'applaa-theme');

            // Launch Chromium with full Applaa branding
            this.browser = await puppeteer.launch({
                headless: false,
                defaultViewport: null,
                userDataDir, // Separate profile for Applaa Browser
                args: [
                    // Load Applaa Buddy extension
                    `--disable-extensions-except=${this.extensionPath}`,
                    `--load-extension=${this.extensionPath}`,

                    // Applaa Browser branding
                    '--app-name=Applaa Browser',
                    '--product-version=Applaa Browser 1.0',

                    // Window customization
                    '--start-maximized',
                    '--no-first-run',
                    '--no-default-browser-check',

                    // Kid-safe defaults
                    '--force-safe-search', // Force safe search
                    '--disable-sync', // Disable Google sync

                    // Performance
                    '--disable-background-timer-throttling',
                    '--disable-renderer-backgrounding',

                    // Extension compatibility
                    '--disable-extensions-file-access-check',
                    '--enable-automation',
                ],
            });

            logger.info('✅ [BUDDY] Applaa Browser launched with Buddy extension');
            logger.info('📍 [BUDDY] User data directory:', userDataDir);

            // Auto-open Applaa Buddy sidebar via keyboard shortcut
            try {
                logger.info('⏳ [BUDDY] Waiting for browser to fully load...');

                // Wait for browser and extensions to fully load
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Get the first page
                const pages = await this.browser.pages();
                if (pages.length > 0) {
                    const page = pages[0];

                    // Navigate to Applaa Kids Hub (Marketplace)
                    // The extension ID is dynamic, so we need to get it first
                    logger.info('🎨 [BUDDY] Opening Applaa Kids Hub...');

                    // Wait a bit for extension to load and get its ID
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Get extension ID by checking loaded extensions
                    const client = await page.target().createCDPSession();

                    try {
                        // Try to get extensions list
                        const extensionsResult = await client.send('Extensions.getExtensions' as any);
                        const buddyExtension = extensionsResult?.extensions?.find((ext: any) =>
                            ext.name === 'Buddy' || ext.name?.includes('Buddy')
                        );

                        const extensionId = buddyExtension?.id;

                        if (buddyExtension && extensionId) {
                            // Set up request interception for new tab pages
                            await page.setRequestInterception(true);
                            const path = require('path');
                            const newtabPath = path.join(__dirname, '../../public/newtab.html');
                            const newtabUrl = `file://${newtabPath.replace(/\\/g, '/')}`;

                            page.on('request', (request) => {
                                const url = request.url();
                                // Intercept chrome://newtab and redirect to custom page
                                if (url === 'chrome://newtab/' || url.startsWith('chrome://newtab')) {
                                    logger.info('🔄 [BUDDY] Redirecting new tab to custom page');
                                    request.continue({ url: newtabUrl });
                                } else {
                                    request.continue();
                                }
                            });

                            // Load custom new tab page FIRST so kids see something nice immediately
                            logger.info('🎨 [BUDDY] Loading custom new tab page first...');
                            await page.goto(newtabUrl, {
                                waitUntil: 'domcontentloaded',
                                timeout: 5000
                            });

                            // Wait a bit so kids can see the nice page
                            await new Promise(resolve => setTimeout(resolve, 2000));

                            const marketplaceUrl = `chrome-extension://${extensionId}/marketplace.html`;
                            logger.info('📍 [BUDDY] Navigating to Kids Hub:', marketplaceUrl);

                            await page.goto(marketplaceUrl, {
                                waitUntil: 'domcontentloaded',
                                timeout: 30000
                            });

                            logger.info('✅ [BUDDY] Marketplace loaded, setting up bridges...');

                            // 1. Expose the execution function to the page (Primary Bridge)
                            logger.info('🔌 [BUDDY] Injecting remote execution binding...');
                            try {
                                await page.exposeFunction('buddyRemoteExecute', async (skillId: string) => {
                                    logger.info(`⚡ [BUDDY] Received remote execution request for: ${skillId}`);
                                    try {
                                        const { skillExecutor } = await import('./skill_executor');
                                        const executionId = await skillExecutor.executeSkill(skillId);
                                        return { success: true, executionId };
                                    } catch (e: any) {
                                        logger.error(`❌ [BUDDY] Remote execution failed:`, e);
                                        return { success: false, error: e.message };
                                    }
                                });
                                logger.info('✅ [BUDDY] Remote bridge installed');
                            } catch (e) {
                                logger.warn('⚠️ [BUDDY] Could not install remote bridge:', e);
                            }

                            // 2. Use CDP to listen for console messages (works for extensions!)
                            logger.info('🔌 [BUDDY] Installing CDP console listener...');
                            try {
                                const client = await page.target().createCDPSession();
                                await client.send('Runtime.enable');

                                client.on('Runtime.consoleAPICalled', async (event: any) => {
                                    // Check if this is a log message
                                    if (event.type === 'log' && event.args && event.args.length > 0) {
                                        const firstArg = event.args[0];
                                        if (firstArg.value && typeof firstArg.value === 'string') {
                                            const text = firstArg.value;

                                            if (text.startsWith('BUDDY_EXECUTE:')) {
                                                const skillId = text.replace('BUDDY_EXECUTE:', '').trim();
                                                logger.info(`⚡⚡⚡ [BUDDY] CDP Console captured: ${skillId}`);

                                                try {
                                                    const { skillExecutor } = await import('./skill_executor');
                                                    await skillExecutor.executeSkill(skillId);
                                                    logger.info(`✅ [BUDDY] Skill ${skillId} started via CDP bridge`);
                                                } catch (e: any) {
                                                    logger.error(`❌ [BUDDY] CDP execution failed:`, e);
                                                }
                                            }
                                        }
                                    }
                                });

                                logger.info('✅ [BUDDY] CDP console listener active');
                            } catch (e) {
                                logger.error('❌ [BUDDY] Failed to setup CDP listener:', e);
                            }

                            logger.info('✅ [BUDDY] Kids Hub opened successfully!');
                        } else {
                            // Extension not found - show new tab page first, then load applaa.com
                            logger.info('🎨 [BUDDY] Showing new tab page, then loading applaa.com');

                            // Wait a bit so kids can see the nice page
                            await new Promise(resolve => setTimeout(resolve, 2000));

                            await page.goto('https://applaa.com', {
                                waitUntil: 'domcontentloaded',
                                timeout: 10000
                            });
                        }
                    } catch (error) {
                        logger.warn('⚠️ [BUDDY] Error getting extension ID:', error);
                        // Show new tab page first, then fallback to applaa.com
                        logger.info('🎨 [BUDDY] Showing new tab page, then loading applaa.com');

                        await new Promise(resolve => setTimeout(resolve, 2000));

                        await page.goto('https://applaa.com', {
                            waitUntil: 'domcontentloaded',
                            timeout: 10000
                        });
                    }

                    // Brief wait for extension to initialize
                    logger.info('⏳ [BUDDY] Waiting for extension to initialize...');
                    await new Promise(resolve => setTimeout(resolve, 300));

                    // Option A: Auto-open extension Side Panel via keyboard shortcut
                    logger.info('🔑 [BUDDY] Triggering sidebar shortcut (Ctrl+Shift+U)...');

                    const triggerShortcut = async () => {
                        try {
                            await page.bringToFront();
                            await page.keyboard.down('Control');
                            await page.keyboard.down('Shift');
                            await page.keyboard.press('U');
                            await page.keyboard.up('Shift');
                            await page.keyboard.up('Control');
                        } catch (err) {
                            logger.warn('⚠️ [BUDDY] Shortcut error:', err);
                        }
                    };

                    // Trigger shortcut
                    await triggerShortcut();

                    // Small delay and retry for robustness
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await triggerShortcut();

                    logger.info('✅ [BUDDY] Sidebar shortcut sequence completed');
                }
            } catch (error) {
                logger.warn('⚠️ [BUDDY] Could not auto-open sidebar:', error);
                logger.info('💡 [BUDDY] Users can click the Applaa Buddy icon in toolbar to open');
            }

            // Handle browser close event
            this.browser.on('disconnected', () => {
                logger.info('🔌 [BUDDY] Applaa Browser disconnected');
                this.browser = null;
            });

            return { success: true };
        } catch (error: any) {
            logger.error('❌ [BUDDY] Failed to launch Applaa Browser:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Close the browser
     */
    async close(): Promise<void> {
        if (this.browser) {
            try {
                logger.info('🛑 [BUDDY] Closing Applaa Browser...');
                await this.browser.close();
                this.browser = null;
                logger.info('✅ [BUDDY] Browser closed');
            } catch (error) {
                logger.error('❌ [BUDDY] Error closing browser:', error);
            }
        }
    }

    /**
     * Check if browser is running
     */
    isRunning(): boolean {
        return this.browser !== null && this.browser.isConnected();
    }

    /**
     * Get browser instance
     */
    getBrowser(): Browser | null {
        return this.browser;
    }
}

// Singleton instance
let buddyBrowserInstance: BuddyBrowser | null = null;

export function getBuddyBrowser(): BuddyBrowser {
    if (!buddyBrowserInstance) {
        buddyBrowserInstance = new BuddyBrowser();
    }
    return buddyBrowserInstance;
}
