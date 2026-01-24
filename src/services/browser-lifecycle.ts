import { Browser } from 'puppeteer';
import log from 'electron-log';

const logger = log.scope('browser-lifecycle');

/**
 * Browser Lifecycle Manager
 * Ensures browser is only launched when needed and reuses existing instance
 */
export class BrowserLifecycle {
    private static browser: Browser | null = null;
    private static isLaunching = false;

    /**
     * Ensure browser is running, launch if needed
     */
    static async ensureBrowser(): Promise<Browser> {
        // If browser is already running, return it
        if (this.browser && this.browser.isConnected()) {
            logger.info('✅ Browser already running, reusing instance');
            return this.browser;
        }

        // If browser is currently launching, wait for it
        if (this.isLaunching) {
            logger.info('⏳ Browser is launching, waiting...');
            await this.waitForLaunch();
            return this.browser!;
        }

        // Launch browser
        this.isLaunching = true;
        try {
            logger.info('🚀 Launching Buddy Browser on-demand...');
            const { getBuddyBrowser } = await import('./buddy-browser');
            const result = await getBuddyBrowser().launch();

            if (!result.success) {
                throw new Error(result.error || 'Failed to launch browser');
            }

            this.browser = getBuddyBrowser().getBrowser();
            logger.info('✅ Browser launched successfully');
            return this.browser!;
        } finally {
            this.isLaunching = false;
        }
    }

    /**
     * Wait for browser to finish launching
     */
    private static async waitForLaunch(): Promise<void> {
        let attempts = 0;
        while (this.isLaunching && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        if (this.isLaunching) {
            throw new Error('Browser launch timeout');
        }
    }

    /**
     * Close browser if running
     */
    static async closeBrowser(): Promise<void> {
        if (this.browser) {
            logger.info('🛑 Closing browser...');
            try {
                const { getBuddyBrowser } = await import('./buddy-browser');
                await getBuddyBrowser().close();
                this.browser = null;
                logger.info('✅ Browser closed');
            } catch (error) {
                logger.error('❌ Error closing browser:', error);
            }
        }
    }

    /**
     * Check if browser is running
     */
    static isRunning(): boolean {
        return this.browser !== null && this.browser.isConnected();
    }
}
