import { Eko } from '@eko-ai/eko';
import { BrowserAgent } from '@eko-ai/eko-nodejs';
import { createPlaywrightEnv } from '@eko-ai/eko-nodejs';
import { readSettings } from '../../main/settings';
import { chromiumManager } from '../browser/chromium-manager';
import log from 'electron-log';

const logger = log.scope('eko-automation');

export class EkoAutomation {
    private eko: Eko | null = null;
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) {
            logger.info('Eko already initialized');
            return;
        }

        try {
            logger.info('Initializing Eko with Gemini and existing browser page...');

            // Get Gemini API key from settings
            const settings = readSettings();
            const geminiProvider = settings.providerSettings?.google;
            const geminiApiKey = geminiProvider?.apiKey?.value;

            if (!geminiApiKey) {
                throw new Error('Google Gemini API key not found in settings. Please add it in Settings > LLM Providers.');
            }

            // Get the active page from ChromiumManager
            const page = chromiumManager.getActivePage();
            if (!page) {
                throw new Error('No active browser page. Please open a tab first.');
            }

            logger.info('Using existing Chromium page from ChromiumManager');

            // Create Playwright environment with existing page
            const env = await createPlaywrightEnv({
                page: page, // Use existing page
                headless: false // Already visible in Applaa
            });

            // Configure Eko with Gemini and BrowserAgent using our page
            this.eko = new Eko({
                llms: {
                    default: {
                        provider: 'google',
                        model: 'gemini-3-flash',
                        apiKey: geminiApiKey
                    }
                },
                agents: [new BrowserAgent({ env })]
            });

            this.isInitialized = true;
            logger.info('✅ Eko initialized successfully with Gemini and existing browser page');
        } catch (error) {
            logger.error('Failed to initialize Eko:', error);
            throw error;
        }
    }

    async execute(instruction: string): Promise<{
        success: boolean;
        message: string;
        result?: any;
    }> {
        if (!this.eko || !this.isInitialized) {
            throw new Error('Eko not initialized. Please call initialize() first.');
        }

        try {
            logger.info(`Executing command: "${instruction}"`);

            // Run the instruction with Eko
            const result = await this.eko.run(instruction);

            logger.info('✅ Command completed successfully');

            return {
                success: true,
                message: `Successfully completed: "${instruction}"`,
                result
            };
        } catch (error: any) {
            logger.error('Command execution failed:', error);

            return {
                success: false,
                message: error.message || String(error)
            };
        }
    }

    async extract(instruction: string): Promise<{
        success: boolean;
        data?: any;
        message: string;
    }> {
        if (!this.eko || !this.isInitialized) {
            throw new Error('Eko not initialized');
        }

        try {
            logger.info(`Extracting data: "${instruction}"`);

            const result = await this.eko.run(`Extract: ${instruction}`);

            return {
                success: true,
                data: result,
                message: 'Data extracted successfully'
            };
        } catch (error: any) {
            logger.error('Data extraction failed:', error);

            return {
                success: false,
                message: error.message || String(error)
            };
        }
    }
}

export const ekoAutomation = new EkoAutomation();
