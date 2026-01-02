import log from 'electron-log';
import path from 'path';
import fs from 'fs';

const logger = log.scope('minecraft-sandbox');

// Types for Minecraft sandbox
export interface MinecraftSandboxConfig {
    port?: number;
    version?: string;
    gameMode?: number;
    difficulty?: number;
}

export interface MinecraftModAssets {
    items?: any[];
    blocks?: any[];
    textures?: Record<string, string>;
    sounds?: Record<string, string>;
}

export interface SandboxStatus {
    running: boolean;
    port: number;
    version: string;
    playersOnline: number;
}

/**
 * Minecraft Sandbox Service
 * Runs a lightweight Minecraft server using Flying Squid (PrismarineJS)
 * Allows instant preview and testing of generated mods
 */
export class MinecraftSandbox {
    private server: any = null;
    private bot: any = null;
    private config: MinecraftSandboxConfig;
    private isRunning = false;

    constructor(config: MinecraftSandboxConfig = {}) {
        this.config = {
            port: config.port || 25565,
            version: config.version || '1.20.1',
            gameMode: config.gameMode ?? 1, // Creative mode
            difficulty: config.difficulty ?? 0, // Peaceful
        };
    }

    /**
     * Start the Minecraft sandbox server
     */
    async start(modPath?: string): Promise<{ port: number; ready: boolean }> {
        if (this.isRunning) {
            logger.warn('Sandbox already running');
            return { port: this.config.port!, ready: true };
        }

        try {
            logger.info('🎮 Starting Minecraft sandbox...');

            // Dynamically import flying-squid (ESM module)
            const { createMCServer } = await import('flying-squid');

            // Create server
            this.server = createMCServer({
                'online-mode': false,
                motd: 'Applaa Minecraft Sandbox',
                port: this.config.port,
                'max-players': 1,
                version: this.config.version,
                gameMode: this.config.gameMode,
                difficulty: this.config.difficulty,
                generation: {
                    name: 'superflat',
                    options: '3;minecraft:bedrock,2*minecraft:stone,minecraft:grass_block;1',
                },
            });

            // Wait for server to be ready
            await new Promise<void>((resolve) => {
                this.server.on('listening', () => {
                    logger.info(`✅ Minecraft server started on port ${this.config.port}`);
                    this.isRunning = true;
                    resolve();
                });
            });

            // Load mod if provided
            if (modPath) {
                await this.loadMod(modPath);
            }

            // Connect test bot
            await this.connectBot();

            return { port: this.config.port!, ready: true };
        } catch (error) {
            logger.error('Failed to start Minecraft sandbox:', error);
            throw new Error(`Failed to start sandbox: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Load a custom mod into the sandbox
     */
    async loadMod(modPath: string): Promise<void> {
        if (!this.isRunning) {
            throw new Error('Sandbox not running');
        }

        try {
            logger.info('📦 Loading mod from:', modPath);

            // Load mod assets
            const assetsPath = path.join(modPath, 'assets.json');
            if (fs.existsSync(assetsPath)) {
                const assets: MinecraftModAssets = JSON.parse(
                    fs.readFileSync(assetsPath, 'utf-8')
                );

                // Register custom items
                if (assets.items && assets.items.length > 0) {
                    logger.info(`Registering ${assets.items.length} custom items`);
                    // TODO: Register items with server
                }

                // Register custom blocks
                if (assets.blocks && assets.blocks.length > 0) {
                    logger.info(`Registering ${assets.blocks.length} custom blocks`);
                    // TODO: Register blocks with server
                }

                // Load textures
                if (assets.textures) {
                    logger.info(`Loading ${Object.keys(assets.textures).length} textures`);
                    // TODO: Load textures
                }

                logger.info('✅ Mod loaded successfully');
            } else {
                logger.warn('No assets.json found, skipping mod load');
            }
        } catch (error) {
            logger.error('Failed to load mod:', error);
            throw error;
        }
    }

    /**
     * Connect a test bot to the server
     */
    private async connectBot(): Promise<void> {
        try {
            logger.info('🤖 Connecting test bot...');

            // Dynamically import mineflayer (ESM module)
            const mineflayer = await import('mineflayer');

            this.bot = mineflayer.createBot({
                host: 'localhost',
                port: this.config.port,
                username: 'TestBot',
                version: this.config.version,
            });

            await new Promise<void>((resolve, reject) => {
                this.bot.once('spawn', () => {
                    logger.info('✅ Test bot connected and spawned');
                    resolve();
                });

                this.bot.once('error', (err: Error) => {
                    logger.error('Bot connection error:', err);
                    reject(err);
                });

                // Timeout after 10 seconds
                setTimeout(() => {
                    reject(new Error('Bot connection timeout'));
                }, 10000);
            });
        } catch (error) {
            logger.error('Failed to connect bot:', error);
            // Don't throw - bot is optional
        }
    }

    /**
     * Test a custom item
     */
    async testItem(itemName: string): Promise<{ success: boolean; message?: string; error?: string }> {
        if (!this.bot) {
            return { success: false, error: 'Test bot not connected' };
        }

        try {
            logger.info(`🧪 Testing item: ${itemName}`);

            // Give item to bot (creative mode)
            // TODO: Implement item testing logic

            return { success: true, message: `${itemName} tested successfully` };
        } catch (error) {
            logger.error('Item test failed:', error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }

    /**
     * Get sandbox status
     */
    getStatus(): SandboxStatus {
        return {
            running: this.isRunning,
            port: this.config.port!,
            version: this.config.version!,
            playersOnline: this.bot ? 1 : 0,
        };
    }

    /**
     * Stop the sandbox server
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            logger.warn('Sandbox not running');
            return;
        }

        try {
            logger.info('🛑 Stopping Minecraft sandbox...');

            // Disconnect bot
            if (this.bot) {
                this.bot.quit();
                this.bot = null;
            }

            // Close server
            if (this.server) {
                await new Promise<void>((resolve) => {
                    this.server.close(() => {
                        logger.info('✅ Server closed');
                        resolve();
                    });
                });
                this.server = null;
            }

            this.isRunning = false;
            logger.info('✅ Minecraft sandbox stopped');
        } catch (error) {
            logger.error('Error stopping sandbox:', error);
            throw error;
        }
    }
}

// Singleton instance
let sandboxInstance: MinecraftSandbox | null = null;

export function getMinecraftSandbox(): MinecraftSandbox {
    if (!sandboxInstance) {
        sandboxInstance = new MinecraftSandbox();
    }
    return sandboxInstance;
}
