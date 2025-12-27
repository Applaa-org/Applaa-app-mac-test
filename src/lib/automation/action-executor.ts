import { Page } from 'playwright';
import log from 'electron-log';

const logger = log.scope('action-executor');

export interface BrowserAction {
    action: 'navigate' | 'click' | 'type' | 'scroll' | 'wait' | 'extract' | 'screenshot';
    selector?: string;
    text?: string;
    url?: string;
    direction?: 'up' | 'down';
    timeout?: number;
}

export class ActionExecutor {
    private page: Page | null = null;

    initialize(page: Page) {
        this.page = page;
        logger.info('ActionExecutor initialized with page');
    }

    async execute(action: BrowserAction): Promise<{ success: boolean; result?: any; error?: string }> {
        if (!this.page) {
            return { success: false, error: 'Page not initialized' };
        }

        try {
            logger.info(`Executing action: ${action.action}`, action);

            switch (action.action) {
                case 'navigate':
                    if (!action.url) throw new Error('URL required for navigate action');
                    await this.page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    return { success: true, result: `Navigated to ${action.url}` };

                case 'click':
                    if (!action.selector) throw new Error('Selector required for click action');
                    await this.page.click(action.selector, { timeout: 10000 });
                    return { success: true, result: `Clicked ${action.selector}` };

                case 'type':
                    if (!action.selector || !action.text) {
                        throw new Error('Selector and text required for type action');
                    }
                    await this.page.fill(action.selector, action.text, { timeout: 10000 });
                    return { success: true, result: `Typed "${action.text}" into ${action.selector}` };

                case 'scroll':
                    const scrollAmount = action.direction === 'down' ? 500 : -500;
                    await this.page.evaluate((amount) => window.scrollBy(0, amount), scrollAmount);
                    return { success: true, result: `Scrolled ${action.direction}` };

                case 'wait':
                    if (!action.selector) throw new Error('Selector required for wait action');
                    await this.page.waitForSelector(action.selector, {
                        timeout: action.timeout || 10000,
                        state: 'visible'
                    });
                    return { success: true, result: `Waited for ${action.selector}` };

                case 'extract':
                    if (!action.selector) throw new Error('Selector required for extract action');
                    const elements = await this.page.$$(action.selector);
                    const texts = await Promise.all(
                        elements.map(el => el.textContent())
                    );
                    return { success: true, result: texts.filter(t => t) };

                case 'screenshot':
                    const screenshot = await this.page.screenshot({
                        type: 'png',
                        fullPage: false
                    });
                    return { success: true, result: screenshot.toString('base64') };

                default:
                    return { success: false, error: `Unknown action: ${action.action}` };
            }
        } catch (error: any) {
            logger.error(`Action failed: ${action.action}`, error);
            return {
                success: false,
                error: error.message || String(error)
            };
        }
    }

    async executeSequence(actions: BrowserAction[]): Promise<{
        success: boolean;
        results: any[];
        error?: string
    }> {
        const results: any[] = [];

        for (const action of actions) {
            const result = await this.execute(action);
            results.push(result);

            if (!result.success) {
                return {
                    success: false,
                    results,
                    error: `Failed at action ${action.action}: ${result.error}`
                };
            }
        }

        return { success: true, results };
    }
}

export const actionExecutor = new ActionExecutor();
