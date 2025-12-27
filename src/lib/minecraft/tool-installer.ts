
import fs from 'fs-extra';
import path from 'path';
import { app } from 'electron';
import { spawn } from 'child_process';
import log from 'electron-log';

const logger = log.scope('tool-installer');

// URLs for tools
const TOOLS = {
    java: {
        win32: 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.10_7.zip',
        darwin: 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_mac_hotspot_17.0.10_7.tar.gz',
        linux: 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_linux_hotspot_17.0.10_7.tar.gz'
    },
    gradle: 'https://services.gradle.org/distributions/gradle-8.5-bin.zip'
};

export function getToolsDir(): string {
    return path.join(app.getPath('userData'), 'tools');
}

export function getJavaHome(): string {
    const toolsDir = getToolsDir();
    // The folder name inside the zip might vary, so we might need to find it dynamically
    // But for Temurin windows zip, it's usually 'jdk-17.0.10+7'
    const javaDir = path.join(toolsDir, 'java');

    // Check for the inner directory if it was extracted with a wrapper folder
    if (fs.existsSync(javaDir)) {
        const subdirs = fs.readdirSync(javaDir).filter(f => fs.statSync(path.join(javaDir, f)).isDirectory());
        if (subdirs.length === 1 && subdirs[0].startsWith('jdk-')) {
            return path.join(javaDir, subdirs[0]);
        }
    }
    return javaDir;
}

export function getGradleHome(): string {
    const toolsDir = getToolsDir();
    const gradleDir = path.join(toolsDir, 'gradle');

    // Gradle zip extracts to gradle-8.5
    if (fs.existsSync(gradleDir)) {
        const subdirs = fs.readdirSync(gradleDir).filter(f => fs.statSync(path.join(gradleDir, f)).isDirectory());
        if (subdirs.length === 1 && subdirs[0].startsWith('gradle-')) {
            return path.join(gradleDir, subdirs[0]);
        }
    }
    return gradleDir;
}

export async function installTools(onProgress?: (log: string) => void): Promise<boolean> {
    const toolsDir = getToolsDir();
    await fs.ensureDir(toolsDir);

    try {
        // Install Java
        if (!isJavaInstalled()) {
            onProgress?.('Downloading Java 17 (approx 180MB)...');
            const javaUrl = TOOLS.java[process.platform as keyof typeof TOOLS.java] || TOOLS.java.linux;
            const javaZip = path.join(toolsDir, 'java.zip');

            await downloadFile(javaUrl, javaZip);

            onProgress?.('Extracting Java...');
            const javaDest = path.join(toolsDir, 'java');
            await fs.ensureDir(javaDest);
            await extractZip(javaZip, javaDest);

            // Cleanup
            await fs.remove(javaZip);
            onProgress?.('Java installed successfully');
        } else {
            onProgress?.('Java is already installed');
        }

        // Install Gradle
        if (!isGradleInstalled()) {
            onProgress?.('Downloading Gradle 8.5 (approx 130MB)...');
            const gradleZip = path.join(toolsDir, 'gradle.zip');

            await downloadFile(TOOLS.gradle, gradleZip);

            onProgress?.('Extracting Gradle...');
            const gradleDest = path.join(toolsDir, 'gradle');
            await fs.ensureDir(gradleDest);
            await extractZip(gradleZip, gradleDest);

            // Cleanup
            await fs.remove(gradleZip);
            onProgress?.('Gradle installed successfully');
        } else {
            onProgress?.('Gradle is already installed');
        }

        return true;
    } catch (error) {
        logger.error('Failed to install tools:', error);
        onProgress?.(`Error: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

function isJavaInstalled(): boolean {
    const javaHome = getJavaHome();
    const javaExe = process.platform === 'win32' ? 'java.exe' : 'java';
    return fs.existsSync(path.join(javaHome, 'bin', javaExe));
}

function isGradleInstalled(): boolean {
    const gradleHome = getGradleHome();
    const gradleExe = process.platform === 'win32' ? 'gradle.bat' : 'gradle';
    return fs.existsSync(path.join(gradleHome, 'bin', gradleExe));
}

async function downloadFile(url: string, dest: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download ${url}: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(dest, buffer);
}

async function extractZip(zipPath: string, destPath: string): Promise<void> {
    if (process.platform === 'win32') {
        // Use PowerShell to unzip on Windows
        // -Force to overwrite
        const command = `powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destPath}' -Force"`;
        await new Promise<void>((resolve, reject) => {
            const proc = spawn(command, { shell: true });
            proc.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Unzip failed with code ${code}`));
            });
            proc.on('error', reject);
        });
    } else {
        // Use tar/unzip on Unix
        const command = zipPath.endsWith('.zip')
            ? `unzip -o "${zipPath}" -d "${destPath}"`
            : `tar -xzf "${zipPath}" -C "${destPath}"`;

        await new Promise<void>((resolve, reject) => {
            const proc = spawn(command, { shell: true });
            proc.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Extraction failed with code ${code}`));
            });
            proc.on('error', reject);
        });
    }
}
