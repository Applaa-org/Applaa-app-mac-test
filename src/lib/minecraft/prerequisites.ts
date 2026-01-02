/**
 * Simplified Minecraft Prerequisites Checker
 * Checks for MCreator and Java - the only tools needed
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export interface MinecraftPrerequisites {
    mcreator: {
        installed: boolean;
        version?: string;
        path?: string;
    };
    java: {
        installed: boolean;
        version?: string;
    };
}

/**
 * Check if MCreator is installed
 */
async function checkMCreator(): Promise<{ installed: boolean; version?: string; path?: string }> {
    try {
        // Check common installation paths
        const platform = process.platform;
        let mcreatorPaths: string[] = [];

        if (platform === 'win32') {
            mcreatorPaths = [
                path.join(process.env.LOCALAPPDATA || '', 'MCreator'),
                path.join(process.env.PROGRAMFILES || '', 'MCreator'),
                path.join(process.env['PROGRAMFILES(X86)'] || '', 'MCreator'),
            ];
        } else if (platform === 'darwin') {
            mcreatorPaths = [
                '/Applications/MCreator.app',
                path.join(os.homedir(), 'Applications/MCreator.app'),
            ];
        } else {
            mcreatorPaths = [
                path.join(os.homedir(), '.mcreator'),
                '/opt/mcreator',
                '/usr/local/mcreator',
            ];
        }

        // Check each path
        for (const mcPath of mcreatorPaths) {
            if (await fs.pathExists(mcPath)) {
                // Try to get version
                let version = 'Unknown';
                try {
                    const versionFile = path.join(mcPath, 'version.txt');
                    if (await fs.pathExists(versionFile)) {
                        version = (await fs.readFile(versionFile, 'utf-8')).trim();
                    }
                } catch (error) {
                    // Version detection failed, but MCreator is installed
                }

                return {
                    installed: true,
                    version,
                    path: mcPath,
                };
            }
        }

        return { installed: false };
    } catch (error) {
        console.error('Error checking MCreator:', error);
        return { installed: false };
    }
}

/**
 * Check if Java is installed
 */
async function checkJava(): Promise<{ installed: boolean; version?: string }> {
    try {
        const { stdout } = await execAsync('java -version');
        const versionMatch = stdout.match(/version "(.+?)"/);
        const version = versionMatch ? versionMatch[1] : 'Unknown';

        return {
            installed: true,
            version,
        };
    } catch (error) {
        return { installed: false };
    }
}

/**
 * Check all Minecraft mod development prerequisites
 */
export async function checkMinecraftPrerequisites(): Promise<MinecraftPrerequisites> {
    const [mcreator, java] = await Promise.all([
        checkMCreator(),
        checkJava(),
    ]);

    return {
        mcreator,
        java,
    };
}

/**
 * Get MCreator download URL for the current platform
 */
export function getMCreatorDownloadUrl(): string {
    const platform = process.platform;
    const baseUrl = 'https://mcreator.net/download';

    if (platform === 'win32') {
        return `${baseUrl}/windows`;
    } else if (platform === 'darwin') {
        return `${baseUrl}/mac`;
    } else {
        return `${baseUrl}/linux`;
    }
}

/**
 * Get Java download URL
 */
export function getJavaDownloadUrl(): string {
    return 'https://adoptium.net/temurin/releases/?version=17';
}

/**
 * Open MCreator project
 */
export async function openInMCreator(projectPath: string, mcreatorPath: string): Promise<void> {
    const platform = process.platform;
    let command: string;

    if (platform === 'win32') {
        const exe = path.join(mcreatorPath, 'MCreator.exe');
        command = `"${exe}" "${projectPath}"`;
    } else if (platform === 'darwin') {
        command = `open -a "${mcreatorPath}" "${projectPath}"`;
    } else {
        const bin = path.join(mcreatorPath, 'mcreator');
        command = `"${bin}" "${projectPath}"`;
    }

    await execAsync(command);
}
