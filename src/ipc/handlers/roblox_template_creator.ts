import fs from "node:fs";
import path from "node:path";
import log from "electron-log";

const logger = log.scope("roblox-template-creator");

interface RobloxCreationParams {
    name: string;
    displayName?: string;
    templateId?: string;
}

/**
 * Create a Roblox project template with Lua scripts
 */
export async function createRobloxProjectTemplate(fullAppPath: string, params: RobloxCreationParams) {
    logger.info(`🏗️ Creating Roblox project template at ${fullAppPath}`);

    // Create the app directory
    fs.mkdirSync(fullAppPath, { recursive: true });

    // Create standard Roblox folder structure
    const serverPath = path.join(fullAppPath, 'src', 'ServerScriptService');
    const clientPath = path.join(fullAppPath, 'src', 'StarterPlayer', 'StarterPlayerScripts');
    const sharedPath = path.join(fullAppPath, 'src', 'ReplicatedStorage');

    fs.mkdirSync(serverPath, { recursive: true });
    fs.mkdirSync(clientPath, { recursive: true });
    fs.mkdirSync(sharedPath, { recursive: true });

    // Check if templateId is provided
    const templateId = params.templateId;

    let serverScriptCode = `print("Hello from Applaa Server!")

-- This script runs on the server
-- Use it for game logic, data saving, and secure operations

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local config = require(ReplicatedStorage:WaitForChild("config"))

print("Loaded config for: " .. config.APP_NAME)
`;

    let clientScriptCode = `print("Hello from Applaa Client!")

-- This script runs on the client (player's device)
-- Use it for UI, input handling, and visual effects

local Players = game:GetService("Players")
local localPlayer = Players.LocalPlayer

print("Welcome, " .. localPlayer.Name)
`;

    let sharedModuleCode = 'return {\n  APP_NAME = "' + (params.displayName || params.name) + '"\n}';

    if (templateId) {
        try {
            // Import template loader (dynamic to avoid circular dependencies)
            // Path relative to src/ipc/handlers/roblox_template_creator.ts -> ../../services/roblox/template-loader
            const templateLoaderPath = path.join(__dirname, '../../services/roblox/template-loader');

            // Use require to handle potential missing module gracefully during dev/build issues
            // though in TS we should use import. Using dynamic require as in original code.
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { loadTemplate } = require(templateLoaderPath);

            const template = loadTemplate(templateId);

            if (template) {
                logger.info(`✅ Loaded Roblox template: ${template.metadata.name}`);

                // Use template scripts
                if (template.serverScripts.length > 0) {
                    serverScriptCode = template.serverScripts[0].content;
                }
                if (template.clientScripts.length > 0) {
                    clientScriptCode = template.clientScripts[0].content;
                }
                if (template.sharedModules.length > 0) {
                    sharedModuleCode = template.sharedModules[0].content;
                }

                // Write additional scripts if template has multiple files
                for (let i = 1; i < template.serverScripts.length; i++) {
                    const script = template.serverScripts[i];
                    const scriptPath = path.join(fullAppPath, script.path);
                    fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
                    fs.writeFileSync(scriptPath, script.content);
                }

                for (let i = 1; i < template.clientScripts.length; i++) {
                    const script = template.clientScripts[i];
                    const scriptPath = path.join(fullAppPath, script.path);
                    fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
                    fs.writeFileSync(scriptPath, script.content);
                }

                for (let i = 1; i < template.sharedModules.length; i++) {
                    const script = template.sharedModules[i];
                    const scriptPath = path.join(fullAppPath, script.path);
                    fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
                    fs.writeFileSync(scriptPath, script.content);
                }

                // Write additional files (README, etc.)
                if (template.additionalFiles) {
                    for (const file of template.additionalFiles) {
                        const filePath = path.join(fullAppPath, file.path);
                        fs.mkdirSync(path.dirname(filePath), { recursive: true });
                        fs.writeFileSync(filePath, file.content);
                    }
                }
            } else {
                logger.warn(`⚠️ Template "${templateId}" not found, using default`);
            }
        } catch (error) {
            logger.error(`❌ Error loading Roblox template "${templateId}":`, error);
        }
    }

    // Write the main scripts
    fs.writeFileSync(path.join(serverPath, 'main.server.lua'), serverScriptCode);
    fs.writeFileSync(path.join(clientPath, 'main.client.lua'), clientScriptCode);
    fs.writeFileSync(path.join(sharedPath, 'config.lua'), sharedModuleCode);

    // 3. Generate Preview Contract
    const previewContract = {
        type: "roblox",
        entry: "src/ServerScriptService/main.server.lua",
        // Default camera for preview (if we add 3D preview later)
        camera: { x: 20, y: 20, z: 20 }
    };

    fs.writeFileSync(
        path.join(fullAppPath, 'applaa.preview.json'),
        JSON.stringify(previewContract, null, 2)
    );

    // 4. Create README
    const readmeContent = `# ${params.displayName || params.name}

A Roblox project created with Applaa.

## Structure
- \`src/ServerScriptService/\`: Server-side logic (main.server.lua)
- \`src/StarterPlayer/StarterPlayerScripts/\`: Client-side logic (main.client.lua)
- \`src/ReplicatedStorage/\`: Shared modules and data (config.lua)

## How to use
1. Open **Roblox Studio**
2. Copy the code from the generated files into corresponding script objects in Studio
3. Or use the **Download .rbxmx** button in Applaa to export and drag-drop into Studio!

## AI Features
- 🤖 AI-powered code generation with Luau best practices
- 🎨 3D model generation via Meshy.ai
- 🖼️ Texture generation via DALL-E
- 🔊 Sound effects via ElevenLabs
`;

    fs.writeFileSync(path.join(fullAppPath, 'README.md'), readmeContent);

    logger.info(`✅ Roblox project template created at ${fullAppPath}`);
}
