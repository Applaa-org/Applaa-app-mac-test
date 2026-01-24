/**
 * Roblox Template Metadata Types
 * 
 * Defines the structure for Roblox templates including categories,
 * difficulty levels, and code snippets.
 */

export type TemplateCategory =
    | 'scripts'           // Basic Lua scripts
    | 'games'             // Complete game templates
    | 'npcs'              // NPC & AI systems
    | 'ui'                // UI/UX templates
    | 'environments'      // Environment packs
    | 'monetization'      // Monetization systems
    | 'educational'       // Educational templates
    | 'assets'            // 3D assets and models
    | 'avatar'            // Avatar & marketplace items
    | 'multiplayer';      // Multiplayer systems

export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type GameType =
    | 'obby'
    | 'simulator'
    | 'tycoon'
    | 'racing'
    | 'battle-arena'
    | 'tower-defense'
    | 'survival'
    | 'rpg'
    | 'puzzle'
    | 'educational';

export interface RobloxScriptFile {
    /** File path relative to project root */
    path: string;
    /** Lua code content */
    content: string;
    /** Script type */
    type: 'Script' | 'LocalScript' | 'ModuleScript';
    /** Optional description */
    description?: string;
}

export interface TemplateMetadata {
    /** Unique template identifier */
    id: string;
    /** Display name */
    name: string;
    /** Detailed description */
    description: string;
    /** Template category */
    category: TemplateCategory;
    /** Difficulty level */
    difficulty: TemplateDifficulty;
    /** Tags for searching */
    tags: string[];
    /** Author information */
    author?: string;
    /** Version */
    version?: string;
    /** Game type (for game templates) */
    gameType?: GameType;
    /** Preview image URL or path */
    previewImage?: string;
    /** Estimated completion time in minutes */
    estimatedTime?: number;
    /** Required features/dependencies */
    requirements?: string[];
    /** Learning objectives (for educational templates) */
    learningObjectives?: string[];
}

export interface RobloxTemplate {
    /** Template metadata */
    metadata: TemplateMetadata;
    /** Server-side scripts */
    serverScripts: RobloxScriptFile[];
    /** Client-side scripts */
    clientScripts: RobloxScriptFile[];
    /** Shared module scripts */
    sharedModules: RobloxScriptFile[];
    /** Additional files (README, config, etc.) */
    additionalFiles?: Array<{
        path: string;
        content: string;
    }>;
    /** Preview configuration */
    previewConfig?: {
        camera?: { x: number; y: number; z: number };
        bounds?: { width: number; height: number; depth: number };
    };
}

export interface TemplateSearchOptions {
    /** Filter by category */
    category?: TemplateCategory;
    /** Filter by difficulty */
    difficulty?: TemplateDifficulty;
    /** Filter by game type */
    gameType?: GameType;
    /** Search by tags */
    tags?: string[];
    /** Text search in name/description */
    searchText?: string;
}

export interface TemplateRegistry {
    /** All available templates */
    templates: Map<string, RobloxTemplate>;
    /** Templates by category */
    byCategory: Map<TemplateCategory, string[]>;
    /** Templates by difficulty */
    byDifficulty: Map<TemplateDifficulty, string[]>;
    /** Templates by game type */
    byGameType: Map<GameType, string[]>;
}
