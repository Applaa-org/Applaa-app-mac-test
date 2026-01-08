import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log';
import { getWorkspaceRoot } from '../../paths/workspace';
import { db } from '../../db';
import { apps } from '../../db/schema';
import { eq } from 'drizzle-orm';

const logger = log.scope('blockly-handlers');

async function getApp(appId: number) {
    try {
        const app = await db.query.apps.findFirst({
            where: eq(apps.id, appId),
        });
        if (!app) {
            throw new Error(`App with id ${appId} not found`);
        }
        return app as any;
    } catch (err) {
        logger.warn("blockly_handlers.getApp: falling back to legacy SELECT due to:", err);
        const row = db.$client
            .prepare("SELECT id, name, path, created_at as createdAt FROM apps WHERE id = ?")
            .get(appId) as any;

        if (!row) {
            throw new Error(`App with id ${appId} not found`);
        }

        if (row.createdAt && typeof row.createdAt === "number") {
            row.createdAt = new Date(row.createdAt * 1000);
        }

        return row;
    }
}


/**
 * Save Blockly workspace to file system
 */
ipcMain.handle('blockly:save-workspace', async (event, params: {
    appId: number;
    workspaceJson: any;
    generatedCode: Record<string, string>;
}) => {
    const { appId, workspaceJson, generatedCode } = params;

    try {
        const app = await getApp(appId);
        if (!app) {
            throw new Error(`App ${appId} not found`);
        }

        const root = getWorkspaceRoot();
        const appPath = path.join(root, 'apps', 'blockly', app.name);

        if (!fs.existsSync(appPath)) {
            fs.mkdirSync(appPath, { recursive: true });
        }

        logger.info(`Saving Blockly workspace for app ${appId} at ${appPath}`);

        const workspacePath = path.join(appPath, 'workspace.json');
        fs.writeFileSync(workspacePath, JSON.stringify(workspaceJson, null, 2));

        const codeDir = path.join(appPath, 'generated');
        if (!fs.existsSync(codeDir)) {
            fs.mkdirSync(codeDir, { recursive: true });
        }

        Object.entries(generatedCode).forEach(([lang, code]) => {
            const ext = getExtension(lang);
            const filePath = path.join(codeDir, `code.${ext}`);
            fs.writeFileSync(filePath, code as string);
        });

        const htmlPath = path.join(appPath, 'index.html');
        const htmlContent = generateStandaloneHTML(workspaceJson, generatedCode.javascript || '');
        fs.writeFileSync(htmlPath, htmlContent);

        return { success: true, savedAt: new Date().toISOString() };
    } catch (error: any) {
        logger.error('Failed to save Blockly workspace:', error);
        return { success: false, error: error.message };
    }
});

function getExtension(lang: string): string {
    const extensions: Record<string, string> = {
        javascript: 'js',
        python: 'py',
        php: 'php',
        lua: 'lua',
        dart: 'dart',
        xml: 'xml',
        json: 'json'
    };
    return extensions[lang] || 'txt';
}

function generateStandaloneHTML(workspace: any, jsCode: string): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Blocklaa App</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; margin: 0; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; padding: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        h1 { color: #667eea; margin: 0 0 20px 0; }
        button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; transition: transform 0.2s; }
        button:hover { transform: scale(1.05); }
        #output { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-top: 20px; min-height: 100px; font-family: 'Consolas', monospace; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧩 Blocklaa App</h1>
        <button onclick="runCode()">▶️ Run Code</button>
        <button onclick="clearOutput()" style="background: #f44336;">🗑️ Clear</button>
        <div id="output"></div>
        <div class="footer">Built with Blocklaa ❤️</div>
    </div>
    <script>
        function runCode() {
            const output = document.getElementById('output');
            output.innerHTML = '<div style="color: #667eea; margin-bottom: 10px;">🚀 Running code...</div>';
            const originalLog = console.log;
            console.log = function(...args) {
                output.innerHTML += '<div>' + args.join(' ') + '</div>';
                originalLog.apply(console, args);
            };
            try {
                ${jsCode}
                if (output.innerHTML === '<div style="color: #667eea; margin-bottom: 10px;">🚀 Running code...</div>') {
                    output.innerHTML += '<div style="color: #4caf50;">✓ Code executed successfully!</div>';
                }
            } catch (error) {
                output.innerHTML += '<div style="color: #f44336; font-weight: bold;">❌ Error: ' + error.message + '</div>';
            }
        }
        function clearOutput() {
            document.getElementById('output').innerHTML = '';
        }
    </script>
</body>
</html>`;
}
