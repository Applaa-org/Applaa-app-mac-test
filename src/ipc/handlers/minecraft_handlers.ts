import { ipcMain } from 'electron';
import { execAsync } from '../utils/runShellCommand';
import log from 'electron-log';
import path from 'path';
import fs from 'fs-extra';
import { app } from 'electron';
import AdmZip from 'adm-zip';
import { getMinecraftSandbox } from '../../services/minecraft-sandbox';

const logger = log.scope('minecraft-handlers');

export interface MinecraftModSpec {
    modId: string;
    modName: string;
    version: string;
    description: string;
    author: string;
    minecraftVersion: string;
    loaderType: 'forge' | 'fabric';
    mainClass: string;
    additionalClasses: Record<string, string>;
    dependencies: string[];
    items?: any[];
    blocks?: any[];
    entities?: any[];
    commands?: any[];
    events?: any[];
}

/**
 * Register all Minecraft-related IPC handlers
 */
export function registerMinecraftHandlers() {
    logger.info('Registering Minecraft IPC handlers...');

    // Check if Java JDK and Gradle are installed
    ipcMain.handle('check-minecraft-tools', async () => {
        logger.info('Checking Minecraft build tools...');

        const result = {
            java: false,
            gradle: false,
            javaVersion: undefined as string | undefined,
            gradleVersion: undefined as string | undefined,
        };

        try {
            // Check Java
            const javaOutput = await execAsync('java -version', { timeout: 5000 });
            const javaStderr = javaOutput.stderr || javaOutput.stdout;

            if (javaStderr) {
                result.java = true;
                result.javaVersion = javaStderr.split('\n')[0];
                logger.info(`Java detected: ${result.javaVersion}`);
            }
        } catch (error) {
            logger.warn('Java not found:', error);
        }

        try {
            // Check Gradle
            const gradleOutput = await execAsync('gradle -version', { timeout: 5000 });
            const gradleStdout = gradleOutput.stdout;

            if (gradleStdout) {
                result.gradle = true;
                // Extract version from output
                const versionMatch = gradleStdout.match(/Gradle ([\d.]+)/);
                result.gradleVersion = versionMatch ? versionMatch[0] : gradleStdout.split('\n')[0];
                logger.info(`Gradle detected: ${result.gradleVersion}`);
            }
        } catch (error) {
            logger.warn('Gradle not found:', error);
        }

        return result;
    });

    // Auto-install Java JDK and Gradle
    ipcMain.handle('install-minecraft-tools', async (event) => {
        logger.info('Starting auto-installation of Minecraft build tools...');

        const sendProgress = (message: string) => {
            event.sender.send('minecraft-install-progress', message);
        };

        try {
            sendProgress('📦 Preparing to install Java JDK and Gradle...');

            // For now, we'll guide the user to manual installation
            // Automatic installation of JDK/Gradle is complex and platform-specific
            sendProgress('⚠️ Automatic installation not yet implemented.');
            sendProgress('Please install manually:');
            sendProgress('1. Java JDK 17+: https://adoptium.net/temurin/releases/?version=17');
            sendProgress('2. Gradle 8+: https://gradle.org/install/');

            return {
                success: false,
                error: 'Manual installation required. Please follow the links provided.',
            };
        } catch (error: any) {
            logger.error('Installation failed:', error);
            sendProgress(`❌ Error: ${error.message}`);
            return {
                success: false,
                error: error.message,
            };
        }
    });

    // Build Minecraft mod to JAR file
    ipcMain.handle('build-minecraft-mod', async (_, spec: MinecraftModSpec) => {
        logger.info(`Building Minecraft mod: ${spec.modName}`);

        const logs: string[] = [];
        const addLog = (msg: string) => {
            logger.info(msg);
            logs.push(msg);
        };

        try {
            // Create temporary build directory
            const tempDir = path.join(app.getPath('temp'), 'minecraft-build', spec.modId);
            await fs.ensureDir(tempDir);
            addLog(`📁 Created build directory: ${tempDir}`);

            // Generate Gradle project structure
            await generateGradleProject(tempDir, spec, addLog);

            // Run Gradle build
            addLog('🔨 Running Gradle build...');
            const buildOutput = await execAsync('gradle build', {
                cwd: tempDir,
                timeout: 120000, // 2 minutes
            });

            addLog('✅ Build completed successfully!');

            // Find the generated JAR file
            const buildLibsDir = path.join(tempDir, 'build', 'libs');
            const jarFiles = await fs.readdir(buildLibsDir);
            const jarFile = jarFiles.find(f => f.endsWith('.jar') && !f.includes('sources'));

            if (!jarFile) {
                throw new Error('JAR file not found in build output');
            }

            const jarPath = path.join(buildLibsDir, jarFile);
            addLog(`📦 JAR file created: ${jarPath}`);

            return {
                success: true,
                jarPath,
                logs,
            };
        } catch (error: any) {
            logger.error('Build failed:', error);
            addLog(`❌ Build failed: ${error.message}`);

            return {
                success: false,
                error: error.message,
                logs,
            };
        }
    });

    // Build and test mod in sandbox
    ipcMain.handle('build-and-test-mod', async (_, spec: MinecraftModSpec) => {
        logger.info(`Building and testing mod: ${spec.modName}`);

        const logs: string[] = [];
        const addLog = (msg: string) => {
            logger.info(msg);
            logs.push(msg);
        };

        try {
            // First, build the mod
            addLog('🔨 Building mod...');
            // Call the build handler directly
            const buildResult: any = await new Promise((resolve) => {
                ipcMain.emit('build-minecraft-mod', null, spec);
                // This is a workaround - in real implementation, we'd refactor to share logic
                resolve({ success: false, error: 'Not implemented yet' });
            });

            if (!buildResult.success) {
                throw new Error('Build failed');
            }

            const jarPath = buildResult.jarPath;
            logs.push(...buildResult.logs);

            // Start Minecraft sandbox
            addLog('🎮 Starting Minecraft sandbox...');
            const sandbox = getMinecraftSandbox();
            await sandbox.start(jarPath);

            addLog('✅ Sandbox started! Open the viewer to see your mod in action.');

            return {
                success: true,
                jarPath,
                logs,
            };
        } catch (error: any) {
            logger.error('Build and test failed:', error);
            addLog(`❌ Failed: ${error.message}`);

            return {
                success: false,
                error: error.message,
                logs,
            };
        }
    });

    // Extract assets from JAR file
    ipcMain.handle('extract-assets', async (_, jarPath: string) => {
        logger.info(`Extracting assets from: ${jarPath}`);

        try {
            const zip = new AdmZip(jarPath);
            const zipEntries = zip.getEntries();

            const assets: Array<{
                name: string;
                path: string;
                type: string;
                relativePath: string;
            }> = [];

            // Extract to temp directory
            const extractDir = path.join(app.getPath('temp'), 'minecraft-assets', path.basename(jarPath, '.jar'));
            await fs.ensureDir(extractDir);

            for (const entry of zipEntries) {
                const entryName = entry.entryName;

                // Look for .nbt (structures) and .json (models) files
                if (entryName.endsWith('.nbt') || entryName.endsWith('.json')) {
                    const extractPath = path.join(extractDir, entryName);
                    await fs.ensureDir(path.dirname(extractPath));

                    zip.extractEntryTo(entry, path.dirname(extractPath), false, true);

                    assets.push({
                        name: path.basename(entryName),
                        path: extractPath,
                        type: entryName.endsWith('.nbt') ? 'structure' : 'model',
                        relativePath: entryName,
                    });
                }
            }

            logger.info(`Extracted ${assets.length} assets`);

            return {
                success: true,
                assets,
            };
        } catch (error: any) {
            logger.error('Asset extraction failed:', error);
            return {
                success: false,
                error: error.message,
                assets: [],
            };
        }
    });

    // Get sandbox status
    ipcMain.handle('get-minecraft-sandbox-status', async () => {
        const sandbox = getMinecraftSandbox();
        return sandbox.getStatus();
    });

    // Start sandbox
    ipcMain.handle('start-minecraft-sandbox', async (_, modPath?: string) => {
        const sandbox = getMinecraftSandbox();
        return await sandbox.start(modPath);
    });

    // Stop sandbox
    ipcMain.handle('stop-minecraft-sandbox', async () => {
        const sandbox = getMinecraftSandbox();
        await sandbox.stop();
        return { success: true };
    });

    logger.info('✅ Minecraft IPC handlers registered');
}

/**
 * Generate Gradle project structure for Minecraft mod
 */
async function generateGradleProject(
    projectDir: string,
    spec: MinecraftModSpec,
    addLog: (msg: string) => void
) {
    addLog('📝 Generating Gradle project structure...');

    // Create directory structure
    const srcDir = path.join(projectDir, 'src', 'main', 'java', 'com', 'applaa', spec.modId);
    const resourcesDir = path.join(projectDir, 'src', 'main', 'resources');
    await fs.ensureDir(srcDir);
    await fs.ensureDir(resourcesDir);

    // Write main mod class
    const mainClassPath = path.join(srcDir, 'MyMod.java');
    await fs.writeFile(mainClassPath, spec.mainClass);
    addLog(`✅ Created main class: MyMod.java`);

    // Write additional classes
    for (const [className, code] of Object.entries(spec.additionalClasses)) {
        const classPath = path.join(srcDir, `${className}.java`);
        await fs.writeFile(classPath, code);
        addLog(`✅ Created class: ${className}.java`);
    }

    // Generate build.gradle
    const buildGradle = generateBuildGradle(spec);
    await fs.writeFile(path.join(projectDir, 'build.gradle'), buildGradle);
    addLog('✅ Created build.gradle');

    // Generate mods.toml (Forge mod manifest)
    if (spec.loaderType === 'forge') {
        const modsToml = generateModsToml(spec);
        const metaInfDir = path.join(resourcesDir, 'META-INF');
        await fs.ensureDir(metaInfDir);
        await fs.writeFile(path.join(metaInfDir, 'mods.toml'), modsToml);
        addLog('✅ Created mods.toml');
    }

    // Generate gradle.properties
    const gradleProperties = `org.gradle.jvmargs=-Xmx3G
org.gradle.daemon=false`;
    await fs.writeFile(path.join(projectDir, 'gradle.properties'), gradleProperties);

    addLog('✅ Project structure generated');
}

/**
 * Generate build.gradle content
 */
function generateBuildGradle(spec: MinecraftModSpec): string {
    const forgeVersion = '1.20.1-47.2.0'; // Latest stable Forge for MC 1.20.1

    return `plugins {
    id 'net.minecraftforge.gradle' version '5.1.+'
    id 'java'
}

group = 'com.applaa'
version = '${spec.version}'

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

minecraft {
    mappings channel: 'official', version: '${spec.minecraftVersion}'
    
    runs {
        client {
            workingDirectory project.file('run')
            property 'forge.logging.console.level', 'info'
            mods {
                ${spec.modId} {
                    source sourceSets.main
                }
            }
        }
    }
}

dependencies {
    minecraft 'net.minecraftforge:forge:${forgeVersion}'
}

jar {
    manifest {
        attributes([
            "Specification-Title": "${spec.modName}",
            "Specification-Vendor": "${spec.author}",
            "Specification-Version": "${spec.version}",
            "Implementation-Title": project.name,
            "Implementation-Version": "${spec.version}",
            "Implementation-Vendor": "${spec.author}"
        ])
    }
}
`;
}

/**
 * Generate mods.toml content (Forge mod manifest)
 */
function generateModsToml(spec: MinecraftModSpec): string {
    return `modLoader="javafml"
loaderVersion="[47,)"
license="MIT"
issueTrackerURL="https://applaa.com"

[[mods]]
modId="${spec.modId}"
version="${spec.version}"
displayName="${spec.modName}"
description="${spec.description}"
authors="${spec.author}"

[[dependencies.${spec.modId}]]
modId="forge"
mandatory=true
versionRange="[47,)"
ordering="NONE"
side="BOTH"

[[dependencies.${spec.modId}]]
modId="minecraft"
mandatory=true
versionRange="[${spec.minecraftVersion}]"
ordering="NONE"
side="BOTH"
`;
}
