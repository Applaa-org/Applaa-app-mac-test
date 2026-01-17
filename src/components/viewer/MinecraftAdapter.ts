/**
 * Minecraft Adapter for ApplaaViewer3D
 * 
 * Parses mcfunction commands and converts them to block data
 * that can be rendered by ApplaaViewer3D.
 */

export interface MinecraftBlock {
    x: number;
    y: number;
    z: number;
    type: string;
}

export interface ParseResult {
    blocks: MinecraftBlock[];
    messages: string[];
    errors: string[];
}

/**
 * Parse relative coordinates (like ~0 ~0 ~0) to numbers
 */
function parseCoord(coord: string): number {
    if (coord.startsWith('~')) {
        return parseInt(coord.substring(1) || '0', 10);
    }
    return parseInt(coord, 10);
}

/**
 * Generate blocks for a fill command
 * Format: fill x1 y1 z1 x2 y2 z2 blockType
 */
function parseFillCommand(args: string[]): MinecraftBlock[] {
    if (args.length < 7) return [];

    const x1 = parseCoord(args[0]);
    const y1 = parseCoord(args[1]);
    const z1 = parseCoord(args[2]);
    const x2 = parseCoord(args[3]);
    const y2 = parseCoord(args[4]);
    const z2 = parseCoord(args[5]);
    const blockType = args[6].replace('minecraft:', '');

    const blocks: MinecraftBlock[] = [];

    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) {
                blocks.push({ x, y, z, type: blockType });
            }
        }
    }

    return blocks;
}

/**
 * Parse setblock command
 * Format: setblock x y z blockType
 */
function parseSetblockCommand(args: string[]): MinecraftBlock | null {
    if (args.length < 4) return null;

    return {
        x: parseCoord(args[0]),
        y: parseCoord(args[1]),
        z: parseCoord(args[2]),
        type: args[3].replace('minecraft:', '')
    };
}

/**
 * Parse mcfunction code and extract block placements
 */
export function parseMcfunction(code: string): ParseResult {
    const blocks: MinecraftBlock[] = [];
    const messages: string[] = [];
    const errors: string[] = [];

    const lines = code.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip comments and empty lines
        if (trimmed.startsWith('#') || trimmed === '') continue;

        const parts = trimmed.split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (command) {
            case 'fill':
                const fillBlocks = parseFillCommand(args);
                blocks.push(...fillBlocks);
                break;

            case 'setblock':
                const block = parseSetblockCommand(args);
                if (block) blocks.push(block);
                break;

            case 'say':
            case 'tellraw':
                messages.push(args.join(' '));
                break;

            // Other commands we don't render but acknowledge
            case 'give':
            case 'effect':
            case 'tp':
            case 'teleport':
            case 'summon':
            case 'time':
            case 'weather':
                // These don't produce visual blocks
                break;

            default:
                // Unknown command - log but don't error
                console.log(`[MinecraftAdapter] Skipping command: ${command}`);
        }
    }

    return { blocks, messages, errors };
}

/**
 * Generate sample mcfunction code for a simple house
 */
export function generateSampleHouse(): string {
    return `# Simple House Build
# Floor
fill ~0 ~0 ~0 ~6 ~0 ~6 stone

# Walls
fill ~0 ~1 ~0 ~6 ~3 ~0 planks
fill ~0 ~1 ~6 ~6 ~3 ~6 planks
fill ~0 ~1 ~0 ~0 ~3 ~6 planks
fill ~6 ~1 ~0 ~6 ~3 ~6 planks

# Roof
fill ~0 ~4 ~0 ~6 ~4 ~6 oak_planks

# Door
setblock ~3 ~1 ~0 air
setblock ~3 ~2 ~0 air

# Window
setblock ~1 ~2 ~0 glass
setblock ~5 ~2 ~0 glass

say House complete!
`;
}

export default { parseMcfunction, generateSampleHouse };
