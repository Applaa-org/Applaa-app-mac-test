/**
 * RBXMX Generator Service
 * 
 * Generates Roblox XML Model (.rbxmx) files from Lua scripts.
 * These files can be dragged into Roblox Studio for import.
 */

/**
 * Escapes special XML characters in a string.
 */
function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Generates a unique referent ID for Roblox items.
 */
function generateReferent(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'RBX';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

interface ScriptItem {
    name: string;
    source: string;
    type: 'Script' | 'LocalScript' | 'ModuleScript';
}

interface FolderItem {
    name: string;
    children: (ScriptItem | FolderItem)[];
}

/**
 * Generates XML for a single script item.
 */
function generateScriptXml(script: ScriptItem, indent: string = ''): string {
    const referent = generateReferent();
    return `${indent}<Item class="${script.type}" referent="${referent}">
${indent}  <Properties>
${indent}    <string name="Name">${escapeXml(script.name)}</string>
${indent}    <ProtectedString name="Source"><![CDATA[${script.source}]]></ProtectedString>
${indent}    <bool name="Disabled">false</bool>
${indent}  </Properties>
${indent}</Item>`;
}

/**
 * Generates XML for a folder with children.
 */
function generateFolderXml(folder: FolderItem, indent: string = ''): string {
    const referent = generateReferent();
    const childrenXml = folder.children
        .map(child => {
            if ('type' in child) {
                return generateScriptXml(child as ScriptItem, indent + '  ');
            } else {
                return generateFolderXml(child as FolderItem, indent + '  ');
            }
        })
        .join('\n');

    return `${indent}<Item class="Folder" referent="${referent}">
${indent}  <Properties>
${indent}    <string name="Name">${escapeXml(folder.name)}</string>
${indent}  </Properties>
${childrenXml}
${indent}</Item>`;
}

export interface RobloxProject {
    appName: string;
    serverScript: string;
    clientScript: string;
    sharedModule: string;
}

/**
 * Generates a complete .rbxmx file content from a Roblox project.
 * 
 * Structure:
 * - {AppName} (Folder)
 *   - ServerScripts (Folder)
 *     - main (Script)
 *   - ClientScripts (Folder)
 *     - main (LocalScript)
 *   - SharedModules (Folder)
 *     - config (ModuleScript)
 */
export function generateRbxmx(project: RobloxProject): string {
    const rootFolder: FolderItem = {
        name: project.appName || 'ApplaaProject',
        children: [
            {
                name: 'ServerScripts',
                children: [
                    {
                        name: 'main',
                        source: project.serverScript || '-- Server script',
                        type: 'Script'
                    }
                ]
            },
            {
                name: 'ClientScripts',
                children: [
                    {
                        name: 'main',
                        source: project.clientScript || '-- Client script',
                        type: 'LocalScript'
                    }
                ]
            },
            {
                name: 'SharedModules',
                children: [
                    {
                        name: 'config',
                        source: project.sharedModule || 'return {}',
                        type: 'ModuleScript'
                    }
                ]
            }
        ]
    };

    const folderXml = generateFolderXml(rootFolder, '  ');

    return `<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">
  <External>null</External>
  <External>nil</External>
${folderXml}
</roblox>`;
}

/**
 * Convenience function to download the RBXMX file in a browser context.
 * (For use in renderer process)
 */
export function downloadRbxmx(project: RobloxProject): void {
    const content = generateRbxmx(project);
    const blob = new Blob([content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.appName || 'project'}.rbxmx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
