import fs from 'fs';
import path from 'path';

export interface ModAction {
    type: 'sendMessage' | 'giveItem' | 'setBlock' | 'spawnEntity' | 'consoleLog';
    params?: any;
}

export interface ModListener {
    type: 'onChat' | 'onJoin' | 'onUse' | 'onBreak';
    trigger?: string; // e.g., the command name "jump"
    actions: ModAction[];
}

export interface ParsedMod {
    name: string;
    listeners: ModListener[];
}

/**
 * Heuristic parser to translate simple Java Minecraft Mods into 
 * executable sandbox instructions.
 */
export class JavaModParser {

    static parse(javaContent: string): ParsedMod {
        const listeners: ModListener[] = [];

        // 1. Parse Chat Commands
        // Pattern: public void onChatCommand... if (command.equalsIgnoreCase("JUMP"))
        const chatCommandRegex = /if\s*\(\s*command\.equalsIgnoreCase\s*\(\s*"([^"]+)"\s*\)\s*\)\s*{([^}]+)}/g;
        let match;
        while ((match = chatCommandRegex.exec(javaContent)) !== null) {
            const commandName = match[1];
            const body = match[2];

            listeners.push({
                type: 'onChat',
                trigger: commandName.toLowerCase(),
                actions: this.parseBodyActions(body)
            });
        }

        // 2. Parse Player Join
        // Pattern: public void onPlayerJoin()
        if (javaContent.includes('public void onPlayerJoin')) {
            const joinBodyRegex = /public\s+void\s+onPlayerJoin\s*\([^)]*\)\s*{([^}]+)}/;
            const joinMatch = joinBodyRegex.exec(javaContent);
            if (joinMatch) {
                listeners.push({
                    type: 'onJoin',
                    actions: this.parseBodyActions(joinMatch[1])
                });
            }
        }

        return {
            name: 'GeneratedMod',
            listeners
        };
    }

    private static parseBodyActions(body: string): ModAction[] {
        const actions: ModAction[] = [];

        // Parse: Logger.info("Message")
        const logRegex = /Logger\.info\s*\(\s*"([^"]+)"\s*\)/g;
        let logMatch;
        while ((logMatch = logRegex.exec(body)) !== null) {
            actions.push({ type: 'consoleLog', params: { message: logMatch[1] } });
            actions.push({ type: 'sendMessage', params: { message: `[Mod] ${logMatch[1]}` } });
        }

        // Parse: player.sendMessage("Message")
        const msgRegex = /player\.sendMessage\s*\(\s*"([^"]+)"\s*\)/g;
        let msgMatch;
        while ((msgMatch = msgRegex.exec(body)) !== null) {
            actions.push({ type: 'sendMessage', params: { message: msgMatch[1] } });
        }

        // Parse: player.getInventory().add(new ItemStack(Items.DIAMOND))
        // Simplified detection of "Items.X"
        const giveRegex = /Items\.([A-Z_]+)/g;
        let giveMatch;
        while ((giveMatch = giveRegex.exec(body)) !== null) {
            actions.push({ type: 'giveItem', params: { item: giveMatch[1].toLowerCase(), count: 1 } });
        }

        return actions;
    }

    static async findAndParseMod(dirPath: string): Promise<ParsedMod | null> {
        try {
            // Find first .java file
            if (!fs.existsSync(dirPath)) return null;

            const files = fs.readdirSync(dirPath);
            const javaFile = files.find(f => f.endsWith('.java'));

            if (!javaFile) return null;

            const content = fs.readFileSync(path.join(dirPath, javaFile), 'utf-8');
            const parsed = this.parse(content);
            parsed.name = javaFile.replace('.java', '');

            return parsed;
        } catch (e) {
            console.error('Error parsing mod:', e);
            return null;
        }
    }
}
