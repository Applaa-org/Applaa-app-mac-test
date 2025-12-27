import { Stagehand } from '@browserbasehq/stagehand';
import { Page } from 'playwright';
import { z } from 'zod';
import log from 'electron-log';
import { readSettings } from '../../main/settings';

const logger = log.scope('stagehand-executor');

export class StagehandExecutor {
    private stagehand: Stagehand | null = null;
    private isInitializing = false;

    async initialize(page: Page) {
        if (this.isInitializing) return;
        if (this.stagehand) return;

        this.isInitializing = true;
        try {
            logger.info('Initializing Stagehand with Gemini 2.0 Flash...');

            // Get the Gemini API key from user settings
            const settings = readSettings();
            const geminiProvider = settings.providerSettings?.google;
            const geminiApiKey = geminiProvider?.apiKey?.value;

            if (!geminiApiKey) {
                throw new Error('Google Gemini API key is missing. Please add it in Settings > LLM Providers.');
            }

            logger.info('✅ Found Gemini API key in settings');

            // Set Gemini API key as environment variable (Stagehand expects this)
            process.env.GOOGLE_GENERATIVE_AI_API_KEY = geminiApiKey;

            // Initialize Stagehand with Gemini model configuration
            this.stagehand = new Stagehand({
                env: 'LOCAL',
                verbose: 1,
                model: 'google/gemini-2.0-flash-exp', // V3 API uses 'model' not 'modelName'
            });

            // Initialize Stagehand
            await this.stagehand.init();

            logger.info('✅ Stagehand initialized successfully with Gemini');
        } catch (error) {
            logger.error('❌ Failed to initialize Stagehand:', error);
            throw error;
        } finally {
            this.isInitializing = false;
        }
    }

    async act(instruction: string): Promise<void> {
        if (!this.stagehand) {
            throw new Error('Stagehand not initialized. Call initialize(page) first.');
        }

        logger.info(`Executing AI action: ${instruction}`);
        try {
            // Stagehand V3 API: act() takes a string instruction as first parameter
            await this.stagehand.act(instruction);
            logger.info('✅ AI action executed successfully');
        } catch (error) {
            logger.error(`❌ AI action failed: ${instruction}`, error);
            throw error;
        }
    }

    async extract<T>(instruction: string, schema: z.ZodSchema<T>): Promise<T> {
        if (!this.stagehand) {
            throw new Error('Stagehand not initialized');
        }

        logger.info(`Extracting data: ${instruction}`);
        try {
            // Stagehand V3 API: extract(instruction, schema, options?)
            const result = await this.stagehand.extract(instruction, schema);
            logger.info('✅ AI extraction successful');
            return result as T;
        } catch (error) {
            logger.error(`❌ AI extraction failed: ${instruction}`, error);
            throw error;
        }
    }

    async observe(): Promise<any> {
        if (!this.stagehand) {
            throw new Error('Stagehand not initialized');
        }

        logger.info('Observing page state...');
        try {
            // Stagehand V3 API: observe() takes no parameters
            const observation = await this.stagehand.observe();
            logger.info('✅ AI observation successful');
            return observation;
        } catch (error) {
            logger.error('❌ AI observation failed', error);
            throw error;
        }
    }

    async close() {
        if (this.stagehand) {
            logger.info('Closing Stagehand...');
            try {
                await this.stagehand.close();
                logger.info('✅ Stagehand closed');
            } catch (error) {
                logger.error('Error closing Stagehand:', error);
            } finally {
                this.stagehand = null;
            }
        }
    }
}

export const stagehandExecutor = new StagehandExecutor();
