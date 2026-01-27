import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import log from 'electron-log';
import { getJavaHome } from './tool-installer';

const logger = log.scope('minecraft-asset-extractor');

export interface Asset {
    name: string;
    path: string; // Absolute path to extracted file
    type: 'structure' | 'model' | 'texture' | 'unknown';
    relativePath: string;
}

export async function extractAssets(jarPath: string): Promise<Asset[]> {
    const extractDir = path.join(path.dirname(jarPath), 'extracted_assets_' + Date.now());
    await fs.ensureDir(extractDir);

    try {
        logger.info(`Extracting assets from ${jarPath} to ${extractDir}`);

        // Use 'jar' command to extract
        await runJarExtract(jarPath, extractDir);

        // Find assets
        const assets: Asset[] = [];
        await findAssetsRecursively(extractDir, extractDir, assets);

        return assets;
    } catch (error) {
        logger.error('Failed to extract assets:', error);
        throw error;
    }
}

async function runJarExtract(jarPath: string, extractDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const javaHome = getJavaHome();
        let jarCmd = 'jar';

        if (fs.existsSync(path.join(javaHome, 'bin'))) {
            const ext = process.platform === 'win32' ? '.exe' : '';
            jarCmd = path.join(javaHome, 'bin', `jar${ext}`);
        }

        logger.info(`Using jar command: ${jarCmd}`);

        const proc = spawn(jarCmd, ['-xf', jarPath], {
            cwd: extractDir,
            shell: true
        });

        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`jar extract failed with code ${code}`));
        });

        proc.on('error', (err) => reject(err));
    });
}

async function findAssetsRecursively(baseDir: string, currentDir: string, assets: Asset[]) {
    const files = await fs.readdir(currentDir);

    for (const file of files) {
        const fullPath = path.join(currentDir, file);
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
            await findAssetsRecursively(baseDir, fullPath, assets);
        } else {
            const ext = path.extname(file).toLowerCase();
            const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

            let type: Asset['type'] = 'unknown';

            if (ext === '.nbt' || ext === '.schem' || ext === '.litematic') {
                type = 'structure';
            } else if (ext === '.json' && relativePath.includes('models/')) {
                type = 'model';
            } else if (ext === '.png' && relativePath.includes('textures/')) {
                type = 'texture';
            }

            if (type !== 'unknown') {
                assets.push({
                    name: file,
                    path: fullPath,
                    type,
                    relativePath
                });
            }
        }
    }
}
