import { Eko, type LLMs } from '@jarvis-agent/core';
import { BrowserAgent } from '@jarvis-agent/electron';
import { readSettings } from '../../main/settings';
import { getActiveBrowserView } from '../../ipc/handlers/chromium_handlers';
import log from 'electron-log';
const { GoogleGenerativeAI } = require("@google/generative-ai");

const logger = log.scope('jarvis-automation');

export class JarvisAutomation {
    private eko: Eko | null = null;
    private browserAgent: BrowserAgent | null = null;
    private isInitialized = false;
    private modelName: string = 'gemini-3-flash'; // Default model
    private apiKey: string | undefined = undefined;

    async initializeAI() {
        if (this.apiKey) return;

        const settings = readSettings();
        const geminiApiKey = settings.providerSettings?.google?.apiKey?.value;
        this.apiKey = geminiApiKey;

        if (!geminiApiKey) {
            throw new Error('Google Gemini API key not found in settings. Please add it in Settings > LLM Providers.');
        }

        // Determine model to use
        if (settings.selectedModel &&
            (settings.selectedModel.provider === 'google' || settings.selectedModel.provider === 'gemini')) {
            this.modelName = settings.selectedModel.name;
        }
    }

    async initialize() {
        if (this.isInitialized) {
            await this.initializeAI();
            return;
        }

        try {
            logger.info('Initializing Eko (Jarvis) with Gemini and existing BrowserView...');

            await this.initializeAI();

            // Get the active BrowserView
            const browserView = getActiveBrowserView();
            if (!browserView) {
                // Don't throw error - just log warning and defer initialization
                logger.warn('No active browser view available yet. Jarvis will initialize when browser is opened.');
                return; // Exit gracefully without initializing
            }

            logger.info('Using existing BrowserView for automation');

            // Create Browser Agent with the existing WebContentsView
            this.browserAgent = new BrowserAgent(browserView);

            logger.info(`Using Gemini model: ${this.modelName}`);

            // Configure LLMs
            const llms: LLMs = {
                default: {
                    provider: 'google',
                    model: this.modelName,
                    apiKey: this.apiKey!
                }
            };

            // Create callback to stream progress to user
            const callback = {
                onMessage: async (message: any): Promise<void> => {
                    if (message.type === 'text') {
                        logger.info(`[Eko] ${message.text}`);
                    } else if (message.type === 'tool_use') {
                        logger.info(`[Eko] Using tool: ${message.toolName}`);
                    }
                }
            };

            // Configure Eko with settings
            this.eko = new Eko({
                llms,
                agents: [this.browserAgent],
                callback
            });

            this.isInitialized = true;
            logger.info('✅ Jarvis Automation initialized');
        } catch (error) {
            logger.error('Failed to initialize Jarvis Automation:', error);
            // Don't re-throw - just log the error and continue
            logger.warn('Jarvis automation will retry initialization when needed');
        }
    }

    async generatePlan(instruction: string, modelOverride?: string): Promise<{
        success: boolean;
        plan: string;
        message?: string;
    }> {
        // Ensure AI is initialized (doesn't need browser)
        await this.initializeAI();

        try {
            logger.info(`Generating plan for: "${instruction}"`);

            const settings = readSettings();
            const modelToUse = modelOverride || settings.planningModel?.name || 'gemini-3-flash';
            logger.info(`Using model for planning: ${modelToUse}`);

            const genAI = new GoogleGenerativeAI(this.apiKey);
            const model = genAI.getGenerativeModel({ model: modelToUse });

            const prompt = `You are an expert browser automation planner. 
User Request: "${instruction}"

Create a clear, numbered step-by-step plan to achieve this using a web browser.
Focus on high-level actions (Go to URL, Search, Click, Extract).
Keep it concise.
Return ONLY the plan as a numbered list.`;

            const result = await model.generateContent(prompt);
            const plan = result.response.text();

            return {
                success: true,
                plan: plan
            };

        } catch (error: any) {
            logger.error('Planning failed:', error);
            return {
                success: false,
                plan: '',
                message: error.message || String(error)
            };
        }
    }

    async transcribeAudio(audioBase64: string, mimeType: string = 'audio/webm'): Promise<{ success: boolean; text: string; message?: string }> {
        await this.initializeAI();

        const tryTranscribe = async (modelName: string) => {
            logger.info(`Transcribing audio with model: ${modelName}...`);
            const genAI = new GoogleGenerativeAI(this.apiKey);
            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await model.generateContent([
                "Transcribe the following audio to text perfectly. Return ONLY the text, no usage notes.",
                {
                    inlineData: {
                        data: audioBase64,
                        mimeType: mimeType
                    }
                }
            ]);
            return result.response.text();
        };

        try {
            // Try the user's configured model first (likely gemini-3-flash)
            // Ensure we don't pass an empty string
            const primaryModel = this.modelName || "gemini-3-flash";
            const text = await tryTranscribe(primaryModel);
            logger.info(`Transcription result: "${text}"`);

            return {
                success: true,
                text: text.trim()
            };
        } catch (error: any) {
            logger.warn(`Initial transcription with ${this.modelName} failed, trying fallback gemini-3-flash...`, error.message);
            try {
                // Fallback to the known robust experimental model which supports audio
                const text = await tryTranscribe("gemini-3-flash");
                return {
                    success: true,
                    text: text.trim()
                };
            } catch (fallbackError: any) {
                logger.error('All transcription attempts failed:', fallbackError);
                return {
                    success: false,
                    text: '',
                    message: `Transcription Error: ${fallbackError.message || String(fallbackError)}. Please check your API key and Model selection.`
                };
            }
        }
    }

    async execute(instruction: string): Promise<{
        success: boolean;
        message: string;
        result?: any;
    }> {
        // Auto-initialize if not already initialized
        if (!this.eko || !this.isInitialized) {
            logger.info('Jarvis not initialized, initializing now...');
            await this.initialize();

            // Check again after initialization attempt
            if (!this.eko || !this.isInitialized) {
                return {
                    success: false,
                    message: '❌ Failed to initialize Jarvis automation. Please ensure a browser view is open and try again.'
                };
            }
        }

        try {
            logger.info(`Executing command: "${instruction}"`);

            // Send progress update: Starting
            const { BrowserWindow } = require('electron');
            const mainWindow = BrowserWindow.getAllWindows()[0];
            if (mainWindow) {
                mainWindow.webContents.send('automation:progress', {
                    type: 'status',
                    message: '🏗️ Initializing browser environment...'
                });

                mainWindow.webContents.send('automation:create-tab');
                logger.info('Requested new tab creation for automation');

                // Wait for tab to be created and ready
                await new Promise(resolve => setTimeout(resolve, 1500));

                mainWindow.webContents.send('automation:progress', {
                    type: 'status',
                    message: '🌐 Navigating and analyzing page content...'
                });
            }

            // Run the instruction with Eko
            const result = await this.eko.run(instruction);

            logger.info('✅ Command completed successfully');

            // Send progress update: Completed
            if (mainWindow) {
                mainWindow.webContents.send('automation:progress', {
                    type: 'complete',
                    message: '✅ Task completed successfully!'
                });
            }

            // Construct conversational result message
            let detailedMessage = "";
            const resultObj = result as any;

            if (resultObj && resultObj.summary) {
                detailedMessage = resultObj.summary;
            } else {
                detailedMessage = `Perfect! I've successfully completed the task: **"${instruction}"**. \n\nI've navigated through the pages and performed the requested actions. You can see the result in the browser view above!`;
            }

            return {
                success: true,
                message: detailedMessage,
                result: result
            };
        } catch (error: any) {
            logger.error('Command execution failed:', error);

            return {
                success: false,
                message: `❌ Automation failed: ${error.message || String(error)}`
            };
        }
    }

    async extract(instruction: string): Promise<{
        success: boolean;
        data?: any;
        message: string;
    }> {
        // Auto-initialize if not already initialized
        if (!this.eko || !this.isInitialized) {
            logger.info('Jarvis not initialized, initializing now...');
            await this.initialize();

            // Check again after initialization attempt
            if (!this.eko || !this.isInitialized) {
                return {
                    success: false,
                    message: 'Failed to initialize Jarvis automation. Please ensure a browser view is open and try again.'
                };
            }
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

export const jarvisAutomation = new JarvisAutomation();
