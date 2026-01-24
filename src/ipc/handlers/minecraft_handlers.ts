import path from "path";
import AdmZip from "adm-zip";
import { ipcMain } from "electron";
import { app } from "electron";
import log from "electron-log";
import fs from "fs-extra";
import { getMinecraftSandbox } from "../../services/minecraft-sandbox";
import { IpcClient } from "../ipc_client";
import { execAsync } from "../utils/runShellCommand";

const logger = log.scope("minecraft-handlers");

export interface MinecraftModSpec {
  modId: string;
  modName: string;
  version: string;
  description: string;
  author: string;
  minecraftVersion: string;
  loaderType: "forge" | "fabric";
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
  logger.info("Registering Minecraft IPC handlers...");

  // Check if Java JDK and Gradle are installed
  ipcMain.handle("check-minecraft-tools", async () => {
    logger.info("Checking Minecraft build tools...");

    const result = {
      java: false,
      gradle: false,
      javaVersion: undefined as string | undefined,
      gradleVersion: undefined as string | undefined,
    };

    try {
      // Check Java
      const javaOutput = await execAsync("java -version", { timeout: 5000 });
      const javaStderr = javaOutput.stderr || javaOutput.stdout;

      if (javaStderr) {
        result.java = true;
        result.javaVersion = javaStderr.split("\n")[0];
        logger.info(`Java detected: ${result.javaVersion}`);
      }
    } catch (error) {
      logger.warn("Java not found:", error);
    }

    try {
      // Check Gradle
      const gradleOutput = await execAsync("gradle -version", {
        timeout: 5000,
      });
      const gradleStdout = gradleOutput.stdout;

      if (gradleStdout) {
        result.gradle = true;
        // Extract version from output
        const versionMatch = gradleStdout.match(/Gradle ([\d.]+)/);
        result.gradleVersion = versionMatch
          ? versionMatch[0]
          : gradleStdout.split("\n")[0];
        logger.info(`Gradle detected: ${result.gradleVersion}`);
      }
    } catch (error) {
      logger.warn("Gradle not found:", error);
    }

    return result;
  });

  // Auto-install Java JDK and Gradle
  ipcMain.handle("install-minecraft-tools", async (event) => {
    logger.info("Starting auto-installation of Minecraft build tools...");

    const sendProgress = (message: string) => {
      event.sender.send("minecraft-install-progress", message);
    };

    try {
      sendProgress("📦 Preparing to install Java JDK and Gradle...");

      // For now, we'll guide the user to manual installation
      // Automatic installation of JDK/Gradle is complex and platform-specific
      sendProgress("⚠️ Automatic installation not yet implemented.");
      sendProgress("Please install manually:");
      sendProgress(
        "1. Java JDK 17+: https://adoptium.net/temurin/releases/?version=17",
      );
      sendProgress("2. Gradle 8+: https://gradle.org/install/");

      return {
        success: false,
        error:
          "Manual installation required. Please follow the links provided.",
      };
    } catch (error: any) {
      logger.error("Installation failed:", error);
      sendProgress(`❌ Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // Build Minecraft mod to JAR file
  ipcMain.handle("build-minecraft-mod", async (_, spec: MinecraftModSpec) => {
    logger.info(`Building Minecraft mod: ${spec.modName}`);

    const logs: string[] = [];
    const addLog = (msg: string) => {
      logger.info(msg);
      logs.push(msg);
    };

    try {
      // Create temporary build directory
      const tempDir = path.join(
        app.getPath("temp"),
        "minecraft-build",
        spec.modId,
      );
      await fs.ensureDir(tempDir);
      addLog(`📁 Created build directory: ${tempDir}`);

      // Generate Gradle project structure
      await generateGradleProject(tempDir, spec, addLog);

      // Run Gradle build
      addLog("🔨 Running Gradle build...");
      await execAsync("gradle build", {
        cwd: tempDir,
        timeout: 120000, // 2 minutes
      });

      addLog("✅ Build completed successfully!");

      // Find the generated JAR file
      const buildLibsDir = path.join(tempDir, "build", "libs");
      const jarFiles = await fs.readdir(buildLibsDir);
      const jarFile = jarFiles.find(
        (f) => f.endsWith(".jar") && !f.includes("sources"),
      );

      if (!jarFile) {
        throw new Error("JAR file not found in build output");
      }

      const jarPath = path.join(buildLibsDir, jarFile);
      addLog(`📦 JAR file created: ${jarPath}`);

      return {
        success: true,
        jarPath,
        logs,
      };
    } catch (error: any) {
      logger.error("Build failed:", error);
      addLog(`❌ Build failed: ${error.message}`);

      return {
        success: false,
        error: error.message,
        logs,
      };
    }
  });

  // Build and test mod in sandbox
  ipcMain.handle("build-and-test-mod", async (_, spec: MinecraftModSpec) => {
    logger.info(`Building and testing mod: ${spec.modName}`);

    const logs: string[] = [];
    const addLog = (msg: string) => {
      logger.info(msg);
      logs.push(msg);
    };

    try {
      // First, build the mod
      addLog("🔨 Building mod...");
      // Call the build handler directly
      const buildResult: any = await new Promise((resolve) => {
        ipcMain.emit("build-minecraft-mod", null, spec);
        // This is a workaround - in real implementation, we'd refactor to share logic
        resolve({ success: false, error: "Not implemented yet" });
      });

      if (!buildResult.success) {
        throw new Error("Build failed");
      }

      const jarPath = buildResult.jarPath;
      logs.push(...buildResult.logs);

      // Start Minecraft sandbox
      addLog("🎮 Starting Minecraft sandbox...");
      const sandbox = getMinecraftSandbox();
      await sandbox.start(jarPath);

      addLog("✅ Sandbox started! Open the viewer to see your mod in action.");

      return {
        success: true,
        jarPath,
        logs,
      };
    } catch (error: any) {
      logger.error("Build and test failed:", error);
      addLog(`❌ Failed: ${error.message}`);

      return {
        success: false,
        error: error.message,
        logs,
      };
    }
  });

  // Extract assets from JAR file
  ipcMain.handle("extract-assets", async (_, jarPath: string) => {
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
      const extractDir = path.join(
        app.getPath("temp"),
        "minecraft-assets",
        path.basename(jarPath, ".jar"),
      );
      await fs.ensureDir(extractDir);

      for (const entry of zipEntries) {
        const entryName = entry.entryName;

        // Look for .nbt (structures) and .json (models) files
        if (entryName.endsWith(".nbt") || entryName.endsWith(".json")) {
          const extractPath = path.join(extractDir, entryName);
          await fs.ensureDir(path.dirname(extractPath));

          zip.extractEntryTo(entry, path.dirname(extractPath), false, true);

          assets.push({
            name: path.basename(entryName),
            path: extractPath,
            type: entryName.endsWith(".nbt") ? "structure" : "model",
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
      logger.error("Asset extraction failed:", error);
      return {
        success: false,
        error: error.message,
        assets: [],
      };
    }
  });

  // Get sandbox status
  ipcMain.handle("get-minecraft-sandbox-status", async () => {
    const sandbox = getMinecraftSandbox();
    return sandbox.getStatus();
  });

  // Start sandbox
  ipcMain.handle("start-minecraft-sandbox", async (_, modPath?: string) => {
    const sandbox = getMinecraftSandbox();
    return await sandbox.start(modPath);
  });

  // Stop sandbox
  ipcMain.handle("stop-minecraft-sandbox", async () => {
    const sandbox = getMinecraftSandbox();
    await sandbox.stop();
    return { success: true };
  });

  // Build Bedrock pack from module spec
  ipcMain.handle("build-bedrock-pack", async (_, moduleSpecJson: string) => {
    logger.info("Building Bedrock pack from module spec...");

    try {
      const moduleSpec = JSON.parse(moduleSpecJson);
      const builder = new BedrockPackBuilderWrapper(moduleSpec);
      const result = builder.build();

      return {
        success: result.success,
        files: result.files,
        errors: result.errors,
        previewContract: result.previewContract,
      };
    } catch (error: any) {
      logger.error("Failed to build Bedrock pack:", error);
      return {
        success: false,
        files: [],
        errors: [`Build error: ${error.message}`],
        previewContract: null,
      };
    }
  });

  // Generate module spec from prompt (static helper)
  ipcMain.handle(
    "generate-module-spec",
    async (_, params: { prompt: string; description: string }) => {
      logger.info("Generating module spec from prompt:", params.prompt);

      try {
        const name = params.description
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .split(/\s+/)
          .slice(0, 3)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join("_");

        const entryFunction = name.toLowerCase().replace(/\s+/g, "_");

        const spec = {
          moduleType: "structure",
          name,
          description: `User request: ${params.prompt}`,
          version: [1, 0, 0],
          entryFunction,
          files: [
            {
              name: entryFunction,
              content: `# ${name}\n# ${params.description}\n\n# TODO: Generate build commands based on user prompt\n`,
              isEntry: true,
            },
          ],
          preview: {
            type: "structure",
            entry: entryFunction,
            bounds: { width: 16, height: 16, depth: 16 },
            anchor: { x: 0, y: 0, z: 0 },
            camera: { x: 8, y: 12, z: 16 },
          },
          constraints: {
            maxWidth: 16,
            maxHeight: 16,
            maxDepth: 16,
            allowedBlocks: [
              "stone",
              "cobblestone",
              "dirt",
              "grass_block",
              "planks",
              "oak_planks",
              "spruce_planks",
              "birch_planks",
              "glass",
              "sand",
              "gravel",
              "wood",
              "log",
              "leaves",
              "wool",
              "air",
              "water",
              "lava",
              "brick",
              "stone_bricks",
            ],
          },
        };

        return {
          success: true,
          spec: JSON.stringify(spec, null, 2),
        };
      } catch (error: any) {
        logger.error("Failed to generate module spec:", error);
        return {
          success: false,
          spec: null,
          error: error.message,
        };
      }
    },
  );

  // Generate preview from pack files
  ipcMain.handle(
    "generate-preview",
    async (_, params: { contractJson: string; mcfunctionContent: string }) => {
      logger.info("Generating preview from pack files...");

      try {
        const engine = new PreviewEngineWrapper();
        engine.loadContract(params.contractJson);
        engine.loadMcfunction(params.mcfunctionContent);
        const result = engine.generate();

        if ("code" in result) {
          return {
            success: false,
            error: result.message,
            errorCode: result.code,
          };
        }

        return {
          success: true,
          type: result.type,
          blocks: result.blocks,
          messages: result.messages,
          errors: result.errors,
          bounds: result.bounds,
          camera: engine.getCameraPosition(),
          target: engine.getCameraTarget(),
        };
      } catch (error: any) {
        logger.error("Failed to generate preview:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
  );

  // Save pack files to app directory
  ipcMain.handle(
    "save-pack-files",
    async (
      _,
      params: {
        appId: number;
        files: Array<{ path: string; content: string }>;
      },
    ) => {
      logger.info(
        `Saving ${params.files.length} pack files to app ${params.appId}...`,
      );

      const ipcClient = IpcClient.getInstance();
      const results: Array<{ path: string; success: boolean; error?: string }> =
        [];

      for (const file of params.files) {
        try {
          await ipcClient.editAppFile(
            params.appId,
            `behavior_pack/${file.path}`,
            file.content,
          );
          results.push({ path: file.path, success: true });
        } catch (error: any) {
          results.push({
            path: file.path,
            success: false,
            error: error.message,
          });
        }
      }

      const allSuccess = results.every((r) => r.success);
      return {
        success: allSuccess,
        results,
      };
    },
  );

  logger.info("✅ Minecraft IPC handlers registered");
}

/**
 * Wrapper for BedrockPackBuilder to use in IPC handlers
 */
class BedrockPackBuilderWrapper {
  private moduleSpec: any;
  private packUuid: string;
  private moduleUuid: string;

  constructor(moduleSpec: any) {
    this.moduleSpec = moduleSpec;
    this.packUuid = this.generateUuid();
    this.moduleUuid = this.generateUuid();
  }

  private generateUuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  build(): any {
    const spec = this.moduleSpec;
    const errors: string[] = [];

    try {
      const manifest = {
        format_version: 2,
        header: {
          name: spec.name,
          description: spec.description,
          uuid: this.packUuid,
          version: spec.version,
          min_engine_version: [1, 20, 0],
        },
        modules: [
          {
            type: "data",
            uuid: this.moduleUuid,
            version: spec.version,
          },
        ],
      };

      const files: Array<{ path: string; content: string }> = [
        { path: "manifest.json", content: JSON.stringify(manifest, null, 2) },
      ];

      for (const file of spec.files || []) {
        files.push({
          path: `functions/${file.name}.mcfunction`,
          content: file.content,
        });
      }

      files.push({
        path: "functions/tick.json",
        content: JSON.stringify({ values: [spec.entryFunction] }, null, 2),
      });

      const preview = spec.preview || {
        type: "structure",
        entry: spec.entryFunction,
        bounds: { width: 16, height: 16, depth: 16 },
        anchor: { x: 0, y: 0, z: 0 },
        camera: { x: 8, y: 12, z: 16 },
      };

      files.push({
        path: "applaa.preview.json",
        content: JSON.stringify(preview, null, 2),
      });

      return {
        success: errors.length === 0,
        files,
        errors,
        previewContract: preview,
      };
    } catch (error: any) {
      return {
        success: false,
        files: [],
        errors: [`Build error: ${error.message}`],
        previewContract: null,
      };
    }
  }
}

/**
 * Wrapper for MinecraftPreviewEngine to use in IPC handlers
 */
class PreviewEngineWrapper {
  private contract: any = null;
  private mcfunctionContent = "";
  private errors: string[] = [];

  loadContract(contractJson: string): boolean {
    try {
      this.contract = JSON.parse(contractJson);
      return true;
    } catch (error) {
      this.errors.push(`Failed to parse applaa.preview.json: ${error}`);
      return false;
    }
  }

  loadMcfunction(content: string): void {
    this.mcfunctionContent = content;
  }

  generate(): any {
    if (!this.contract) {
      return { code: "NO_CONTRACT", message: "No applaa.preview.json found" };
    }

    if (this.contract.type === "structure") {
      return this.generateStructurePreview();
    }

    return {
      type: this.contract.type,
      blocks: [],
      messages: [],
      errors: [],
      bounds: this.contract.bounds || { width: 16, height: 16, depth: 16 },
    };
  }

  private generateStructurePreview(): any {
    const blocks: Array<{ x: number; y: number; z: number; type: string }> = [];
    const messages: string[] = [];
    const errors: string[] = [];

    if (this.mcfunctionContent) {
      const lines = this.mcfunctionContent.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#") || trimmed === "") continue;

        const parts = trimmed.split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (command === "fill" && args.length >= 7) {
          const coords = this.parseCoords(args.slice(0, 6));
          const x1 = coords[0],
            y1 = coords[1],
            z1 = coords[2];
          const x2 = coords[3],
            y2 = coords[4],
            z2 = coords[5];
          const blockType = args[6] || "stone";
          const block = blockType.replace("minecraft:", "");

          for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
              for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) {
                blocks.push({ x, y, z, type: block });
              }
            }
          }
        } else if (command === "setblock" && args.length >= 4) {
          const coords = this.parseCoords(args.slice(0, 3));
          const x = coords[0],
            y = coords[1],
            z = coords[2];
          const blockType = args[3].replace("minecraft:", "");
          blocks.push({ x, y, z, type: blockType });
        } else if (command === "say" || command === "tellraw") {
          messages.push(args.join(" "));
        }
      }
    } else {
      errors.push("No mcfunction content provided");
    }

    return {
      type: "structure",
      blocks,
      messages,
      errors,
      bounds: this.contract.bounds || { width: 16, height: 16, depth: 16 },
    };
  }

  private parseCoords(args: string[]): number[] {
    return args.slice(0, 6).map((arg) => {
      if (arg.startsWith("~")) {
        return Number.parseInt(arg.substring(1) || "0", 10);
      }
      return Number.parseInt(arg, 10);
    });
  }

  getCameraPosition(): { x: number; y: number; z: number } {
    if (this.contract?.camera) {
      return this.contract.camera;
    }
    const bounds = this.contract?.bounds || {
      width: 16,
      height: 16,
      depth: 16,
    };
    return {
      x: bounds.width / 2,
      y: bounds.height * 0.75,
      z: bounds.depth + Math.max(bounds.width, bounds.depth),
    };
  }

  getCameraTarget(): { x: number; y: number; z: number } {
    if (this.contract?.anchor) {
      return this.contract.anchor;
    }
    const bounds = this.contract?.bounds || {
      width: 16,
      height: 16,
      depth: 16,
    };
    return {
      x: bounds.width / 2,
      y: bounds.height / 2,
      z: bounds.depth / 2,
    };
  }
}

/**
 * Generate Gradle project structure for Minecraft mod
 */
async function generateGradleProject(
  projectDir: string,
  spec: MinecraftModSpec,
  addLog: (msg: string) => void,
) {
  addLog("📝 Generating Gradle project structure...");

  // Create directory structure
  const srcDir = path.join(
    projectDir,
    "src",
    "main",
    "java",
    "com",
    "applaa",
    spec.modId,
  );
  const resourcesDir = path.join(projectDir, "src", "main", "resources");
  await fs.ensureDir(srcDir);
  await fs.ensureDir(resourcesDir);

  // Write main mod class
  const mainClassPath = path.join(srcDir, "MyMod.java");
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
  await fs.writeFile(path.join(projectDir, "build.gradle"), buildGradle);
  addLog("✅ Created build.gradle");

  // Generate mods.toml (Forge mod manifest)
  if (spec.loaderType === "forge") {
    const modsToml = generateModsToml(spec);
    const metaInfDir = path.join(resourcesDir, "META-INF");
    await fs.ensureDir(metaInfDir);
    await fs.writeFile(path.join(metaInfDir, "mods.toml"), modsToml);
    addLog("✅ Created mods.toml");
  }

  // Generate gradle.properties
  const gradleProperties = `org.gradle.jvmargs=-Xmx3G
org.gradle.daemon=false`;
  await fs.writeFile(
    path.join(projectDir, "gradle.properties"),
    gradleProperties,
  );

  addLog("✅ Project structure generated");
}

/**
 * Generate build.gradle content
 */
function generateBuildGradle(spec: MinecraftModSpec): string {
  const forgeVersion = "1.20.1-47.2.0"; // Latest stable Forge for MC 1.20.1

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
