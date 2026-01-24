import { Page } from 'playwright';
import log from 'electron-log';

const logger = log.scope('context-manager');

export interface PageContext {
    url: string;
    title: string;
    simplifiedDOM: string;
    screenshot?: string;
}

export class ContextManager {
    private page: Page | null = null;

    initialize(page: Page) {
        this.page = page;
        logger.info('ContextManager initialized');
    }

    async getContext(includeScreenshot: boolean = false): Promise<PageContext> {
        if (!this.page) {
            throw new Error('Page not initialized');
        }

        try {
            const url = this.page.url();
            const title = await this.page.title();
            const simplifiedDOM = await this.extractSimplifiedDOM();

            let screenshot: string | undefined;
            if (includeScreenshot) {
                const buffer = await this.page.screenshot({
                    type: 'png',
                    fullPage: false
                });
                screenshot = buffer.toString('base64');
            }

            return {
                url,
                title,
                simplifiedDOM,
                screenshot
            };
        } catch (error) {
            logger.error('Failed to get page context:', error);
            throw error;
        }
    }

    private async extractSimplifiedDOM(): Promise<string> {
        if (!this.page) throw new Error('Page not initialized');

        try {
            // Extract interactive elements and their text/attributes
            const elements = await this.page.evaluate(() => {
                const interactiveSelectors = [
                    'a[href]',
                    'button',
                    'input',
                    'textarea',
                    'select',
                    '[role="button"]',
                    '[onclick]'
                ];

                const results: Array<{
                    tag: string;
                    text: string;
                    attributes: Record<string, string>;
                }> = [];

                interactiveSelectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach((el, index) => {
                        if (index < 20) { // Limit to first 20 of each type
                            const attrs: Record<string, string> = {};

                            // Get relevant attributes
                            ['id', 'name', 'class', 'type', 'placeholder', 'aria-label', 'title'].forEach(attr => {
                                const value = el.getAttribute(attr);
                                if (value) attrs[attr] = value;
                            });

                            results.push({
                                tag: el.tagName.toLowerCase(),
                                text: (el.textContent || '').trim().substring(0, 100),
                                attributes: attrs
                            });
                        }
                    });
                });

                return results;
            });

            // Format as readable text for Gemini
            return elements.map(el => {
                const attrs = Object.entries(el.attributes)
                    .map(([k, v]) => `${k}="${v}"`)
                    .join(' ');
                return `<${el.tag} ${attrs}>${el.text}</${el.tag}>`;
            }).join('\n');

        } catch (error) {
            logger.error('Failed to extract simplified DOM:', error);
            return 'Failed to extract page elements';
        }
    }
}

export const contextManager = new ContextManager();
