/**
 * Minecraft Mod Builder
 * Compiles Java code into .jar files for Minecraft mods
 */

import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import log from 'electron-log';
import type { MinecraftModSpecification } from './mod-specification';
import { getJavaHome, getGradleHome } from './tool-installer';

const logger = log.scope('minecraft-builder');

export interface BuildResult {
    success: boolean;
    jarPath?: string;
    error?: string;
    logs: string[];
}

/**
 * Build a Minecraft mod from specification
 */
export async function buildMinecraftMod(
    spec: MinecraftModSpecification,
    outputDir: string
): Promise<BuildResult> {
    const logs: string[] = [];

    try {
        logger.info(`Building Minecraft mod: ${spec.modName}`);
        logs.push(`Starting build for ${spec.modName}...`);

        // Create project structure
        const projectDir = path.join(outputDir, spec.modId);
        await createProjectStructure(projectDir, spec);
        logs.push('Project structure created');

        // Generate build files
        await generateBuildFiles(projectDir, spec);
        logs.push('Build configuration generated');

        // Write Java source files
        await writeSourceFiles(projectDir, spec);
        logs.push('Source files written');

        // Write resource files
        await writeResourceFiles(projectDir, spec);
        logs.push('Resource files written');

        // Run Gradle build
        const jarPath = await runGradleBuild(projectDir, spec);
        logs.push('Gradle build completed successfully!');

        return {
            success: true,
            jarPath,
            logs
        };

    } catch (error) {
        logger.error('Failed to build mod:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            logs
        };
    }
}

async function createProjectStructure(projectDir: string, spec: MinecraftModSpecification) {
    const dirs = [
        'src/main/java/com/applaa/' + spec.modId,
        'src/main/resources',
        'src/main/resources/META-INF',
        'build/libs'
    ];

    for (const dir of dirs) {
        await fs.ensureDir(path.join(projectDir, dir));
    }
}

async function generateBuildFiles(projectDir: string, spec: MinecraftModSpecification) {
    // Generate build.gradle
    const buildGradle = spec.buildGradleContent || generateDefaultBuildGradle(spec);
    await fs.writeFile(path.join(projectDir, 'build.gradle'), buildGradle);

    // Generate gradle.properties
    const gradleProperties = `
org.gradle.jvmargs=-Xmx3G
org.gradle.daemon=false
minecraft_version=${spec.minecraftVersion}
forge_version=47.1.0
mod_version=${spec.version}
mod_id=${spec.modId}
`.trim();
    await fs.writeFile(path.join(projectDir, 'gradle.properties'), gradleProperties);

    // Copy Gradle wrapper (if available)
    // For now, we'll assume Gradle is installed globally
}

function generateDefaultBuildGradle(spec: MinecraftModSpecification): string {
    return `
plugins {
    id 'net.minecraftforge.gradle' version '6.0.+'
    id 'java'
}

version = '${spec.version}'
group = 'com.applaa.${spec.modId}'

java {
    toolchain.languageVersion = JavaLanguageVersion.of(17)
}

minecraft {
    mappings channel: 'official', version: '${spec.minecraftVersion}'
    
    runs {
        client {
            workingDirectory project.file('run')
            property 'forge.logging.console.level', 'debug'
            mods {
                ${spec.modId} {
                    source sourceSets.main
                }
            }
        }
    }
}

dependencies {
    minecraft "net.minecraftforge:forge:${spec.minecraftVersion}-47.1.0"
}

jar {
    manifest {
        attributes([
            "Specification-Title": "${spec.modName}",
            "Specification-Vendor": "${spec.author}",
            "Specification-Version": "1",
            "Implementation-Title": project.name,
            "Implementation-Version": project.version,
            "Implementation-Vendor": "${spec.author}"
        ])
    }
}
`.trim();
}

async function writeSourceFiles(projectDir: string, spec: MinecraftModSpecification) {
    const javaDir = path.join(projectDir, 'src/main/java/com/applaa', spec.modId);

    // Write main class
    // Write main class
    const mainClassFile = path.join(javaDir, spec.modName.replace(/[^A-Za-z0-9]/g, '') + 'Mod.java');

    // Inject package declaration if missing
    let content = spec.mainClass;
    if (!content.includes('package ')) {
        content = `package com.applaa.${spec.modId};\n\n${content}`;
    }

    await fs.writeFile(mainClassFile, content);

    // Write additional classes
    for (const [className, code] of Object.entries(spec.additionalClasses)) {
        const classFile = path.join(javaDir, className + '.java');
        await fs.writeFile(classFile, code);
    }
}

async function writeResourceFiles(projectDir: string, spec: MinecraftModSpecification) {
    const resourcesDir = path.join(projectDir, 'src/main/resources');

    // Write mods.toml
    const modsToml = spec.modsTomlContent || generateDefaultModsToml(spec);
    await fs.writeFile(path.join(resourcesDir, 'META-INF/mods.toml'), modsToml);

    // Write pack.mcmeta
    const packMcmeta = {
        pack: {
            description: spec.description,
            pack_format: 15
        }
    };
    await fs.writeFile(
        path.join(resourcesDir, 'pack.mcmeta'),
        JSON.stringify(packMcmeta, null, 2)
    );
}

function generateDefaultModsToml(spec: MinecraftModSpecification): string {
    return `
modLoader="javafml"
loaderVersion="[47,)"
license="All Rights Reserved"

[[mods]]
modId="${spec.modId}"
version="${spec.version}"
displayName="${spec.modName}"
description='''
${spec.description}
'''
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
`.trim();
}

async function runGradleBuild(projectDir: string, spec: MinecraftModSpecification): Promise<string> {
    return new Promise((resolve, reject) => {
        // Determine Gradle command based on OS
        const isWindows = process.platform === 'win32';

        // Setup environment with portable java/gradle
        const env = { ...process.env };
        const portableJavaHome = getJavaHome();
        const portableGradleHome = getGradleHome();

        // If portable Java exists, add to PATH and set JAVA_HOME
        // Java home usually has a 'bin' folder inside
        if (fs.existsSync(path.join(portableJavaHome, 'bin'))) {
            logger.info(`Using portable Java: ${portableJavaHome}`);
            env.JAVA_HOME = portableJavaHome;
            env.PATH = `${path.join(portableJavaHome, 'bin')}${path.delimiter}${env.PATH}`;
        }

        // Check for project wrapper first (gradlew)
        const wrapperName = isWindows ? 'gradlew.bat' : 'gradlew';
        const wrapperPath = path.join(projectDir, wrapperName);
        const hasWrapper = fs.existsSync(wrapperPath);

        let command = hasWrapper ? (isWindows ? wrapperName : `./${wrapperName}`) : 'gradle';

        // If no wrapper, check portable gradle
        if (!hasWrapper) {
            const gradleExe = isWindows ? 'gradle.bat' : 'gradle';
            const portableGradlePath = path.join(portableGradleHome, 'bin', gradleExe);
            if (fs.existsSync(portableGradlePath)) {
                logger.info(`Using portable Gradle: ${portableGradlePath}`);
                command = portableGradlePath;
            }
        }

        logger.info(`Running Gradle build in ${projectDir} using ${command}`);

        const gradleProcess = spawn(command, ['build', '--no-daemon'], {
            cwd: projectDir,
            env,
            shell: true
        });

        let output = '';

        gradleProcess.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            logger.info('[Gradle]', text);
        });

        gradleProcess.stderr.on('data', (data) => {
            const text = data.toString();
            output += text;
            // Gradle writes progress to stderr, so this isn't always an error
            logger.debug('[Gradle]', text);
        });

        gradleProcess.on('close', (code) => {
            if (code === 0) {
                // Find the generated JAR file
                const jarPath = path.join(projectDir, 'build/libs', `${spec.modId}-${spec.version}.jar`);
                resolve(jarPath);
            } else {
                reject(new Error(`Gradle build failed with code ${code}\n${output}\n\nTroubleshooting:\n1. Make sure Java 17+ is installed (run 'java -version')\n2. Make sure Gradle is installed (run 'gradle -version') or the project includes a gradle wrapper.`));
            }
        });

        gradleProcess.on('error', (error) => {
            reject(new Error(`Failed to start Gradle: ${error.message}`));
        });
    });
}

/**
 * Check if Java and Gradle are installed
 */
/**
 * Check if Java and Gradle are installed
 */
export async function checkBuildTools(): Promise<{
    java: boolean;
    gradle: boolean;
    javaVersion?: string;
    gradleVersion?: string;
}> {
    const result = {
        java: false,
        gradle: false,
        javaVersion: undefined as string | undefined,
        gradleVersion: undefined as string | undefined
    };

    // Check Java
    try {
        const javaOutput = await runCommand('java', ['-version']);
        // Java writes version info to stderr usually
        if (javaOutput.includes('version') || javaOutput.includes('Runtime Environment')) {
            result.java = true;
            result.javaVersion = javaOutput;
        }
    } catch (error) {
        logger.warn('Java not found or error checking version');
    }

    // Check Gradle
    try {
        const gradleOutput = await runCommand('gradle', ['--version']);
        if (gradleOutput.includes('Gradle')) {
            result.gradle = true;
            result.gradleVersion = gradleOutput;
        }
    } catch (error) {
        logger.warn('Gradle not found or error checking version');
    }

    return result;
}

function runCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, { shell: true });
        let output = '';

        proc.stdout.on('data', (data) => {
            output += data.toString();
        });

        proc.stderr.on('data', (data) => {
            output += data.toString();
        });

        proc.on('close', (code) => {
            // Only consider success if exit code is 0 AND we got some output
            // 'not recognized' errors on Windows often have exit code 1, but sometimes 0 with shell:true depending on config
            const isError = output.includes('not recognized') || output.includes('command not found');

            if (code === 0 && !isError) {
                resolve(output);
            } else {
                reject(new Error(`Command failed: ${command}\nOutput: ${output}`));
            }
        });

        proc.on('error', reject);
    });
}
