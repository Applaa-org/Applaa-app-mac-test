import { chromium, Browser, Page, BrowserContext } from 'playwright';
import log from 'electron-log';

const logger = log.scope('chromium-manager');

export interface TabInfo {
    id: string;
    title: string;
    url: string;
    favicon?: string;
}

export class ChromiumManager {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private pages: Map<string, Page> = new Map();
    private activePageId: string | null = null;
    private isLaunched = false;

    async launch(): Promise<void> {
        if (this.isLaunched && this.browser) {
            logger.info('Chromium already launched');
            return;
        }

        logger.info('Launching Chromium browser...');

        try {
            this.browser = await chromium.launch({
                headless: true, // Run invisibly (no separate window)
                args: [
                    `--remote-debugging-port=9222`, // Enable CDP for BrowserView connection
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                ]
            });

            // Create persistent context
            this.context = await this.browser.newContext({
                viewport: { width: 1280, height: 720 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });

            this.isLaunched = true;
            logger.info('✅ Chromium launched successfully');

            // Handle browser disconnect
            this.browser.on('disconnected', () => {
                logger.warn('Chromium browser disconnected');
                this.isLaunched = false;
                this.browser = null;
                this.context = null;
                this.pages.clear();
            });

        } catch (error) {
            logger.error('Failed to launch Chromium:', error);
            this.isLaunched = false;
            throw error;
        }
    }

    async createTab(url?: string): Promise<string> {
        if (!this.context) {
            throw new Error('Chromium not launched. Call launch() first.');
        }

        logger.info(`Creating new tab${url ? ` for ${url}` : ''}`);

        const page = await this.context.newPage();
        const pageId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        this.pages.set(pageId, page);
        this.activePageId = pageId;

        // Navigate if URL provided
        if (url) {
            await this.navigate(pageId, url);
        }

        logger.info(`✅ Tab created: ${pageId}`);
        return pageId;
    }

    async closeTab(pageId: string): Promise<void> {
        const page = this.pages.get(pageId);
        if (!page) {
            logger.warn(`Tab not found: ${pageId}`);
            return;
        }

        logger.info(`Closing tab: ${pageId}`);
        await page.close();
        this.pages.delete(pageId);

        // If we closed the active tab, switch to another one
        if (this.activePageId === pageId) {
            const remainingPages = Array.from(this.pages.keys());
            this.activePageId = remainingPages.length > 0 ? remainingPages[0] : null;
        }

        logger.info(`✅ Tab closed: ${pageId}`);
    }

    async switchTab(pageId: string): Promise<void> {
        const page = this.pages.get(pageId);
        if (!page) {
            throw new Error(`Tab not found: ${pageId}`);
        }

        logger.info(`Switching to tab: ${pageId}`);
        this.activePageId = pageId;
        await page.bringToFront();
    }

    async navigate(pageId: string, url: string): Promise<void> {
        const page = this.pages.get(pageId);
        if (!page) {
            throw new Error(`Tab not found: ${pageId}`);
        }

        // Ensure URL has protocol
        let fullUrl = url;
        if (!url.startsWith('http') && !url.startsWith('about:') && !url.startsWith('data:')) {
            fullUrl = 'https://' + url;
        }

        logger.info(`Navigating tab ${pageId} to: ${fullUrl}`);
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
        logger.info(`✅ Navigation complete: ${fullUrl}`);
    }

    async goBack(pageId: string): Promise<void> {
        const page = this.pages.get(pageId);
        if (!page) {
            throw new Error(`Tab not found: ${pageId}`);
        }

        await page.goBack();
        logger.info(`✅ Navigated back in tab: ${pageId}`);
    }

    async goForward(pageId: string): Promise<void> {
        const page = this.pages.get(pageId);
        if (!page) {
            throw new Error(`Tab not found: ${pageId}`);
        }

        await page.goForward();
        logger.info(`✅ Navigated forward in tab: ${pageId}`);
    }

    async reload(pageId: string): Promise<void> {
        const page = this.pages.get(pageId);
        if (!page) {
            throw new Error(`Tab not found: ${pageId}`);
        }

        await page.reload();
        logger.info(`✅ Page reloaded in tab: ${pageId}`);
    }

    async getTabInfo(pageId: string): Promise<TabInfo> {
        const page = this.pages.get(pageId);
        if (!page) {
            throw new Error(`Tab not found: ${pageId}`);
        }

        return {
            id: pageId,
            title: await page.title(),
            url: page.url(),
            favicon: await this.getFavicon(page)
        };
    }

    async getAllTabs(): Promise<TabInfo[]> {
        const tabs: TabInfo[] = [];

        for (const [pageId, page] of this.pages) {
            tabs.push({
                id: pageId,
                title: await page.title(),
                url: page.url(),
                favicon: await this.getFavicon(page)
            });
        }

        return tabs;
    }

    getActivePage(): Page | null {
        if (!this.activePageId) return null;
        return this.pages.get(this.activePageId) || null;
    }

    getActivePageId(): string | null {
        return this.activePageId;
    }

    getPage(pageId: string): Page | null {
        return this.pages.get(pageId) || null;
    }

    isRunning(): boolean {
        return this.isLaunched && this.browser !== null;
    }

    async close(): Promise<void> {
        if (this.browser) {
            logger.info('Closing Chromium browser...');
            try {
                await this.browser.close();
                logger.info('✅ Chromium closed successfully');
            } catch (error) {
                logger.error('Error closing Chromium:', error);
            } finally {
                this.browser = null;
                this.context = null;
                this.pages.clear();
                this.activePageId = null;
                this.isLaunched = false;
            }
        }
    }

    private async getFavicon(page: Page): Promise<string | undefined> {
        try {
            const favicon = await page.evaluate(() => {
                const link = document.querySelector('link[rel*="icon"]') as HTMLLinkElement;
                return link?.href;
            });
            return favicon;
        } catch {
            return undefined;
        }
    }
}

// Singleton instance
export const chromiumManager = new ChromiumManager();
