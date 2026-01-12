import { Page } from 'puppeteer';
import log from 'electron-log';
import { BrowserLifecycle } from './browser-lifecycle';
import type { BrowserPlan, BrowserTask } from './browser-planner';

const logger = log.scope('browser-executor');

export interface ExecutionProgress {
    step: number;
    total: number;
    task: BrowserTask;
    message: string;
}

export type ProgressCallback = (progress: ExecutionProgress) => void;

/**
 * Browser Task Executor
 * Executes browser automation plans sequentially with validation
 */
export class BrowserExecutor {
    private page: Page | null = null;

    /**
     * Execute a browser automation plan
     */
    async executePlan(
        plan: BrowserPlan,
        onProgress?: ProgressCallback
    ): Promise<{ success: boolean; results: any[]; error?: string }> {
        logger.info(`🚀 Executing plan: ${plan.goal}`);
        plan.status = 'running';

        const results: any[] = [];

        try {
            // Ensure browser is running
            const browser = await BrowserLifecycle.ensureBrowser();

            // Create or reuse page
            if (!this.page || this.page.isClosed()) {
                this.page = await browser.newPage();

                // Set viewport
                await this.page.setViewport({ width: 1280, height: 720 });

                // Set user agent
                await this.page.setUserAgent(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                );
            }

            // Execute tasks sequentially
            for (let i = 0; i < plan.tasks.length; i++) {
                const task = plan.tasks[i];
                plan.currentStep = i;

                // Report progress
                if (onProgress) {
                    onProgress({
                        step: i + 1,
                        total: plan.tasks.length,
                        task,
                        message: `Executing: ${task.description}`
                    });
                }

                // Execute task
                logger.info(`📍 Step ${i + 1}/${plan.tasks.length}: ${task.description}`);
                await this.executeTask(task, this.page);

                // Validate task
                const isValid = await this.validateTask(task, this.page);
                if (!isValid) {
                    task.status = 'failed';
                    task.error = 'Validation failed';
                    throw new Error(`Task ${i + 1} failed validation: ${task.description}`);
                }

                // Mark as success
                task.status = 'success';
                if (task.result) {
                    results.push(task.result);
                }

                // Small delay between tasks
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            plan.status = 'completed';
            logger.info(`✅ Plan completed successfully with ${results.length} results`);

            return { success: true, results };

        } catch (error: any) {
            plan.status = 'failed';
            logger.error(`❌ Plan execution failed:`, error);
            return {
                success: false,
                results,
                error: error.message
            };
        }
    }

    /**
     * Execute a single browser task
     */
    private async executeTask(task: BrowserTask, page: Page): Promise<void> {
        task.status = 'running';

        try {
            switch (task.action) {
                case 'navigate':
                    await page.goto(task.params.url, {
                        waitUntil: 'networkidle2',
                        timeout: 30000
                    });
                    logger.info(`✅ Navigated to ${task.params.url}`);
                    break;

                case 'fill':
                    await page.waitForSelector(task.params.selector, { timeout: 10000 });
                    await page.click(task.params.selector); // Focus the input
                    await page.type(task.params.selector, task.params.text, { delay: 50 });
                    logger.info(`✅ Filled ${task.params.selector} with "${task.params.text}"`);
                    break;

                case 'click':
                    await page.waitForSelector(task.params.selector, { timeout: 10000 });
                    await page.click(task.params.selector);
                    logger.info(`✅ Clicked ${task.params.selector}`);
                    break;

                case 'wait':
                    await page.waitForSelector(task.params.selector, {
                        timeout: task.params.timeout || 10000
                    });
                    logger.info(`✅ Element appeared: ${task.params.selector}`);
                    break;

                case 'extract':
                    await page.waitForSelector(task.params.selector, { timeout: 10000 });
                    const data = await page.evaluate((selector) => {
                        const element = document.querySelector(selector);
                        if (!element) return null;

                        // Try to extract structured data
                        const items = element.querySelectorAll('[role="listitem"], .result, .product');
                        if (items.length > 0) {
                            return Array.from(items).slice(0, 5).map(item => ({
                                text: item.textContent?.trim(),
                                html: item.innerHTML
                            }));
                        }

                        return {
                            text: element.textContent?.trim(),
                            html: element.innerHTML
                        };
                    }, task.params.selector);

                    task.result = data;
                    logger.info(`✅ Extracted data from ${task.params.selector}`);
                    break;

                case 'scroll':
                    await page.evaluate(() => {
                        window.scrollBy(0, window.innerHeight);
                    });
                    logger.info(`✅ Scrolled page`);
                    break;

                case 'select':
                    await page.waitForSelector(task.params.selector, { timeout: 10000 });
                    await page.select(task.params.selector, task.params.value);
                    logger.info(`✅ Selected ${task.params.value} in ${task.params.selector}`);
                    break;

                default:
                    throw new Error(`Unknown action: ${task.action}`);
            }

        } catch (error: any) {
            task.status = 'failed';
            task.error = error.message;
            logger.error(`❌ Task failed: ${task.description}`, error);
            throw error;
        }
    }

    /**
     * Validate a task execution
     */
    private async validateTask(task: BrowserTask, page: Page): Promise<boolean> {
        if (task.validation.type === 'none') {
            return true;
        }

        try {
            switch (task.validation.type) {
                case 'url':
                    const currentUrl = page.url();
                    const isValid = currentUrl.includes(task.validation.expected!);
                    if (!isValid) {
                        logger.warn(`⚠️ URL validation failed: expected "${task.validation.expected}", got "${currentUrl}"`);
                    }
                    return isValid;

                case 'element':
                    try {
                        await page.waitForSelector(task.validation.expected!, { timeout: 5000 });
                        return true;
                    } catch {
                        logger.warn(`⚠️ Element validation failed: ${task.validation.expected} not found`);
                        return false;
                    }

                case 'text':
                    const content = await page.content();
                    const hasText = content.includes(task.validation.expected!);
                    if (!hasText) {
                        logger.warn(`⚠️ Text validation failed: "${task.validation.expected}" not found in page`);
                    }
                    return hasText;

                default:
                    return true;
            }
        } catch (error) {
            logger.error(`❌ Validation error:`, error);
            return false;
        }
    }

    /**
     * Get current page
     */
    getPage(): Page | null {
        return this.page;
    }

    /**
     * Close current page
     */
    async closePage(): Promise<void> {
        if (this.page && !this.page.isClosed()) {
            await this.page.close();
            this.page = null;
        }
    }
}

// Singleton instance
export const browserExecutor = new BrowserExecutor();
