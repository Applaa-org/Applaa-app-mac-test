/**
 * Minecraft Hot Reload System
 * Automatically detects, builds, and hot-swaps Minecraft mods
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import log from 'electron-log';

const execAsync = promisify(exec);
const logger = log.scope('minecraft-hotreload');

export interface MinecraftProcess {
    pid: number;
    path: string;
    modsFolder: string;
}

export interface HotReloadResult {
    success: boolean;
    restarted: boolean;
    message: string;
    logs: string[];
}

/**
 * Detect if Minecraft is currently running
 */
export async function detectMinecraft(): Promise<MinecraftProcess | null> {
    try {
        logger.info('Detecting Minecraft process...');

        // Windows: Use tasklist to find java.exe processes
        if (process.platform === 'win32') {
            const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq javaw.exe" /FO CSV /NH');
            const lines = stdout.split('\n').filter(line => line.includes('javaw.exe'));

            for (const line of lines) {
                // Get the PID from the CSV output
                const match = line.match(/"javaw\.exe","(\d+)"/);
                if (match) {
                    const pid = parseInt(match[1]);

                    // Check if this is actually Minecraft by looking at command line
                    try {
                        const { stdout: cmdLine } = await execAsync(`wmic process where processid=${pid} get commandline /format:list`);
                        if (cmdLine.includes('minecraft') || cmdLine.includes('net.minecraft')) {
                            logger.info(`Found Minecraft process: PID ${pid}`);

                            // Get Minecraft directory
                            const modsFolder = path.join(process.env.APPDATA || '', '.minecraft', 'mods');

                            return {
                                pid,
                                path: 'minecraft',
                                modsFolder
                            };
                        }
                    } catch (error) {
                        // Process might have closed, continue
                        continue;
                    }
                }
            }
        }

        // macOS/Linux: Use ps to find java processes
        else {
            const { stdout } = await execAsync('ps aux | grep java');
            const lines = stdout.split('\n');

            for (const line of lines) {
                if (line.includes('minecraft') || line.includes('net.minecraft')) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parseInt(parts[1]);

                    logger.info(`Found Minecraft process: PID ${pid}`);

                    const modsFolder = path.join(
                        process.env.HOME || '',
                        process.platform === 'darwin'
                            ? 'Library/Application Support/minecraft/mods'
                            : '.minecraft/mods'
                    );

                    return {
                        pid,
                        path: 'minecraft',
                        modsFolder
                    };
                }
            }
        }

        logger.info('Minecraft not detected');
        return null;
    } catch (error) {
        logger.error('Error detecting Minecraft:', error);
        return null;
    }
}

/**
 * Close Minecraft gracefully
 */
export async function closeMinecraft(minecraftProcess: MinecraftProcess): Promise<boolean> {
    try {
        logger.info(`Closing Minecraft (PID: ${minecraftProcess.pid})...`);

        if (process.platform === 'win32') {
            // Windows: Use taskkill
            await execAsync(`taskkill /PID ${minecraftProcess.pid} /T`);
        } else {
            // macOS/Linux: Use kill
            await execAsync(`kill ${minecraftProcess.pid}`);
        }

        // Wait for process to close
        await new Promise(resolve => setTimeout(resolve, 2000));

        logger.info('Minecraft closed successfully');
        return true;
    } catch (error) {
        logger.error('Error closing Minecraft:', error);
        return false;
    }
}

/**
 * Install/update mod in Minecraft mods folder
 */
export async function installMod(jarPath: string, modId: string): Promise<boolean> {
    try {
        const modsFolder = path.join(process.env.APPDATA || process.env.HOME || '', '.minecraft', 'mods');

        // Ensure mods folder exists
        await fs.ensureDir(modsFolder);

        // Remove old versions of this mod
        const files = await fs.readdir(modsFolder);
        for (const file of files) {
            if (file.includes(modId) && file.endsWith('.jar')) {
                const oldModPath = path.join(modsFolder, file);
                logger.info(`Removing old mod: ${file}`);
                await fs.remove(oldModPath);
            }
        }

        // Copy new mod
        const fileName = path.basename(jarPath);
        const destPath = path.join(modsFolder, fileName);

        logger.info(`Installing mod: ${fileName}`);
        await fs.copy(jarPath, destPath, { overwrite: true });

        logger.info('Mod installed successfully');
        return true;
    } catch (error) {
        logger.error('Error installing mod:', error);
        return false;
    }
}

/**
 * Launch Minecraft
 */
export async function launchMinecraft(): Promise<boolean> {
    try {
        logger.info('Launching Minecraft...');

        // Try to find Minecraft launcher
        if (process.platform === 'win32') {
            // Windows: Try common Minecraft launcher locations
            const launcherPaths = [
                path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Minecraft Launcher.lnk'),
                path.join(process.env.ProgramFiles || '', 'Minecraft Launcher', 'MinecraftLauncher.exe'),
                'C:\\Program Files (x86)\\Minecraft Launcher\\MinecraftLauncher.exe'
            ];

            for (const launcherPath of launcherPaths) {
                if (await fs.pathExists(launcherPath)) {
                    logger.info(`Found launcher: ${launcherPath}`);
                    spawn(launcherPath, [], { detached: true, stdio: 'ignore' });
                    return true;
                }
            }

            // Fallback: Try to open via Windows start menu
            exec('start minecraft:');
            return true;
        } else if (process.platform === 'darwin') {
            // macOS: Use open command
            exec('open -a "Minecraft"');
            return true;
        } else {
            // Linux: Try common launcher commands
            exec('minecraft-launcher');
            return true;
        }
    } catch (error) {
        logger.error('Error launching Minecraft:', error);
        return false;
    }
}

/**
 * Perform hot reload: build, close Minecraft, install mod, restart
 */
export async function performHotReload(
    jarPath: string,
    modId: string,
    autoRestart: boolean = true
): Promise<HotReloadResult> {
    const logs: string[] = [];

    try {
        logs.push('🔍 Checking if Minecraft is running...');
        const minecraft = await detectMinecraft();

        if (minecraft) {
            logs.push(`✅ Found Minecraft (PID: ${minecraft.pid})`);
            logs.push('🛑 Closing Minecraft...');

            const closed = await closeMinecraft(minecraft);
            if (!closed) {
                logs.push('⚠️ Could not close Minecraft automatically');
                logs.push('Please close Minecraft manually and try again');
                return {
                    success: false,
                    restarted: false,
                    message: 'Could not close Minecraft',
                    logs
                };
            }

            logs.push('✅ Minecraft closed');
        } else {
            logs.push('ℹ️ Minecraft is not running');
        }

        logs.push('📦 Installing mod...');
        const installed = await installMod(jarPath, modId);

        if (!installed) {
            logs.push('❌ Failed to install mod');
            return {
                success: false,
                restarted: false,
                message: 'Failed to install mod',
                logs
            };
        }

        logs.push('✅ Mod installed successfully!');

        if (autoRestart && minecraft) {
            logs.push('🚀 Restarting Minecraft...');
            const launched = await launchMinecraft();

            if (launched) {
                logs.push('✅ Minecraft launched! Your mod is ready to test!');
                return {
                    success: true,
                    restarted: true,
                    message: 'Mod installed and Minecraft restarted!',
                    logs
                };
            } else {
                logs.push('⚠️ Could not auto-launch Minecraft');
                logs.push('Please launch Minecraft manually');
                return {
                    success: true,
                    restarted: false,
                    message: 'Mod installed, please launch Minecraft manually',
                    logs
                };
            }
        }

        logs.push('✅ Mod ready! Launch Minecraft to test it.');
        return {
            success: true,
            restarted: false,
            message: 'Mod installed successfully',
            logs
        };

    } catch (error) {
        logger.error('Hot reload failed:', error);
        logs.push(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);

        return {
            success: false,
            restarted: false,
            message: 'Hot reload failed',
            logs
        };
    }
}
