import { Page } from 'playwright';
import log from 'electron-log';
import { actionExecutor } from './action-executor';
import { contextManager } from './context-manager';
import { actionPlanner } from './action-planner';

const logger = log.scope('gemini-automation');

export class GeminiAutomationExecutor {
    private page: Page | null = null;
    private isInitialized = false;

    async initialize(page: Page) {
        try {
            logger.info('Initializing Gemini Automation...');

            this.page = page;

            // Initialize all components
            actionExecutor.initialize(page);
            contextManager.initialize(page);
            await actionPlanner.initialize();

            this.isInitialized = true;
            logger.info('✅ Gemini Automation initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Gemini Automation:', error);
            throw error;
        }
    }

    async executeCommand(instruction: string): Promise<{
        success: boolean;
        message: string;
        actions?: any[];
    }> {
        if (!this.isInitialized || !this.page) {
            return {
                success: false,
                message: 'Automation not initialized. Please try again.'
            };
        }

        try {
            logger.info(`Executing command: "${instruction}"`);

            // Step 1: Get current page context
            logger.info('Getting page context...');
            const context = await contextManager.getContext(false);

            // Step 2: Use Gemini to plan actions
            logger.info('Planning actions with Gemini...');
            const actions = await actionPlanner.planActions(instruction, context);

            if (!actions || actions.length === 0) {
                return {
                    success: false,
                    message: 'No actions generated. Please try rephrasing your command.'
                };
            }

            logger.info(`Executing ${actions.length} actions...`);

            // Step 3: Execute actions
            const result = await actionExecutor.executeSequence(actions);

            if (result.success) {
                return {
                    success: true,
                    message: `Successfully completed: "${instruction}"`,
                    actions: result.results
                };
            } else {
                return {
                    success: false,
                    message: result.error || 'Failed to execute actions',
                    actions: result.results
                };
            }

        } catch (error: any) {
            logger.error('Command execution failed:', error);
            return {
                success: false,
                message: `Error: ${error.message || String(error)}`
            };
        }
    }

    async extractData(instruction: string): Promise<{
        success: boolean;
        data?: any;
        message: string;
    }> {
        if (!this.isInitialized || !this.page) {
            return {
                success: false,
                message: 'Automation not initialized'
            };
        }

        try {
            logger.info(`Extracting data: "${instruction}"`);

            // Get context
            const context = await contextManager.getContext(false);

            // Plan extraction actions
            const actions = await actionPlanner.planActions(
                `Extract: ${instruction}`,
                context
            );

            // Execute and return last result (should be extract action)
            const result = await actionExecutor.executeSequence(actions);

            if (result.success && result.results.length > 0) {
                const lastResult = result.results[result.results.length - 1];
                return {
                    success: true,
                    data: lastResult.result,
                    message: 'Data extracted successfully'
                };
            } else {
                return {
                    success: false,
                    message: 'Failed to extract data'
                };
            }

        } catch (error: any) {
            logger.error('Data extraction failed:', error);
            return {
                success: false,
                message: error.message || String(error)
            };
        }
    }
}

export const geminiAutomation = new GeminiAutomationExecutor();
