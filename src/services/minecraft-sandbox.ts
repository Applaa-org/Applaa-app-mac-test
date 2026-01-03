import log from 'electron-log';
import path from 'path';
import { fork, ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import { JavaModParser } from './minecraft/java-mod-parser';

const logger = log.scope('minecraft-sandbox');

// Types for Minecraft sandbox
export interface MinecraftSandboxConfig {
    port?: number;
    version?: string;
    gameMode?: number;
    difficulty?: number;
}

export interface SandboxStatus {
    running: boolean;
    port: number;
    viewerPort?: number;
    viewerUrl?: string;
    message?: string;
}

/**
 * Minecraft Sandbox Service
 * Runs a Minecraft server in a CHILD PROCESS to isolate heavy dependencies.
 * Provides live 3D preview capabilities.
 */
export class MinecraftSandbox {
    private childProcess: ChildProcess | null = null;
    private config: MinecraftSandboxConfig;
    private isRunning = false;
    private viewerUrl: string | null = null;
    private statusMessage = 'Stopped';

    constructor(config: MinecraftSandboxConfig = {}) {
        this.config = {
            port: config.port || 25565,
            version: config.version || '1.16.1',
            gameMode: config.gameMode ?? 1, // Creative mode
            difficulty: config.difficulty ?? 0, // Peaceful
        };
    }

    /**
     * Start the Minecraft sandbox server (Child Process)
     */
    async start(modPath?: string): Promise<SandboxStatus> {
        if (this.isRunning && this.childProcess) {
            logger.warn('Sandbox already running');
            return this.getStatus();
        }

        try {
            logger.info('🎮 Starting Minecraft sandbox child process...');
            this.statusMessage = 'Starting...';

            // Path to the server script
            // In production, this might need adjustment to point to resources
            // We use getAppPath() or similar in real apps, but for dev:
            const scriptPath = path.join(__dirname, 'minecraft', 'server_process.js');

            logger.info(`Script path: ${scriptPath}`);

            // Spawn child process
            this.childProcess = fork(scriptPath, [], {
                stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
                env: { ...process.env, SILENT: 'true' }
            });

            this.isRunning = true;

            // Handle messages from child
            this.childProcess.on('message', (msg: any) => {
                this.handleChildMessage(msg);
            });

            // Handle errors
            this.childProcess.on('error', (err) => {
                logger.error('Child process error:', err);
                this.statusMessage = `Error: ${err.message}`;
                this.isRunning = false;
                this.broadcastStatus();
            });

            this.childProcess.on('exit', (code) => {
                logger.info(`Child process exited with code ${code}`);
                this.cleanup();
            });

            // Send start command
            this.childProcess.send({ type: 'START', config: this.config });

            // If a mod path is provided, try to parse and load it
            if (modPath) {
                // Wait small delay for process to init
                setTimeout(() => {
                    this.loadMod(modPath);
                }, 2000);
            }

            return this.getStatus();

        } catch (error: any) {
            logger.error('Failed to start sandbox:', error);
            this.statusMessage = `Failed: ${error.message}`;
            this.cleanup();
            return this.getStatus();
        }
    }

    /**
     * stop the sandbox
     */
    async stop(): Promise<void> {
        if (!this.childProcess) {
            // Even if no child process, ensure state is clean
            this.cleanup();
            return;
        }

        logger.info('🛑 Stopping Minecraft sandbox...');
        try {
            // Send STOP command first
            if (this.childProcess.connected) {
                this.childProcess.send({ type: 'STOP' });
            }

            // Give it a moment to shutdown gracefully, then force kill
            setTimeout(() => {
                if (this.childProcess) {
                    this.childProcess.kill();
                    this.cleanup();
                }
            }, 2000);
        } catch (e) {
            logger.error('Error stopping sandbox:', e);
            if (this.childProcess) this.childProcess.kill();
            this.cleanup();
        }
    }

    /**
     * Get current status
     */
    getStatus(): SandboxStatus {
        return {
            running: this.isRunning,
            port: this.config.port!,
            viewerPort: 3003, // Hardcoded for now in server script
            viewerUrl: this.viewerUrl || undefined,
            message: this.statusMessage
        };
    }

    private handleChildMessage(msg: any) {
        if (!msg || !msg.type) return;

        switch (msg.type) {
            case 'status':
                this.statusMessage = msg.payload;
                logger.info(`[Sandbox] ${msg.payload}`);
                this.broadcastStatus();
                break;
            case 'ready':
                this.viewerUrl = msg.payload.viewerUrl;
                this.statusMessage = 'Create & Play!';
                logger.info('[Sandbox] Ready!');
                this.broadcastStatus();
                break;
            case 'error':
                this.statusMessage = `Error: ${msg.payload}`;
                logger.error(`[Sandbox] ${msg.payload}`);
                this.broadcastStatus();
                break;
        }
    }

    /**
     * Parse and load a mod from the given directory
     */
    async loadMod(modPath: string) {
        if (!this.childProcess) return;

        logger.info(`Parsing mod at ${modPath}`);
        try {
            const parsedMod = await JavaModParser.findAndParseMod(modPath);

            if (parsedMod && parsedMod.listeners.length > 0) {
                logger.info(`Generated logic: ${JSON.stringify(parsedMod.listeners)}`);
                this.childProcess.send({ type: 'LOAD_MOD', payload: parsedMod });
                this.statusMessage = `Mod Loaded: ${parsedMod.name}`;
            } else {
                logger.warn('No logic found in mod files');
            }
        } catch (e) {
            logger.error('Failed to parse/load mod:', e);
        }
    }

    private broadcastStatus() {
        // Send to all windows
        const status = this.getStatus();
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            windows.forEach(win => {
                if (!win.isDestroyed()) {
                    win.webContents.send('minecraft-sandbox-status', status);
                }
            });
        }
    }

    private cleanup() {
        this.childProcess = null;
        this.isRunning = false;
        this.viewerUrl = null;
        this.statusMessage = 'Stopped';
        this.broadcastStatus();
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
