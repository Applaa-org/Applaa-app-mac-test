/**
 * Minecraft Mod Specification System
 * Converts simple prompts into detailed mod specifications for Java compilation
 */

export interface MinecraftModSpecification {
    // Basic Info
    modId: string;              // e.g., "tnt_sword"
    modName: string;            // e.g., "TNT Sword"
    version: string;            // e.g., "1.0.0"
    description: string;
    author: string;

    // Minecraft Version
    minecraftVersion: string;   // e.g., "1.20.1"
    loaderType: 'forge' | 'fabric';

    // Mod Content
    items?: ModItem[];
    blocks?: ModBlock[];
    entities?: ModEntity[];
    commands?: ModCommand[];
    events?: ModEvent[];

    // Generated Code
    mainClass: string;          // Main mod class code
    additionalClasses: Record<string, string>; // Other Java classes

    // Resources
    textures?: Record<string, string>; // texture name -> base64 or URL
    sounds?: Record<string, string>;

    // Build Configuration
    dependencies: string[];
    buildGradleContent?: string;
    modsTomlContent?: string;
}

export interface ModItem {
    id: string;
    name: string;
    type: 'sword' | 'pickaxe' | 'axe' | 'shovel' | 'hoe' | 'bow' | 'custom';
    material?: 'wood' | 'stone' | 'iron' | 'gold' | 'diamond' | 'netherite';
    durability?: number;
    attackDamage?: number;
    attackSpeed?: number;
    enchantability?: number;
    specialAbilities?: ItemAbility[];
}

export interface ItemAbility {
    trigger: 'on_hit' | 'on_right_click' | 'on_block_break' | 'while_holding';
    effect: string; // Description of what happens
    code: string;   // Java code to implement it
}

export interface ModBlock {
    id: string;
    name: string;
    material: 'stone' | 'wood' | 'metal' | 'glass' | 'custom';
    hardness: number;
    resistance: number;
    requiresTool: boolean;
    lightLevel?: number;
    onInteract?: string; // Java code
}

export interface ModEntity {
    id: string;
    name: string;
    type: 'mob' | 'projectile' | 'vehicle';
    health?: number;
    damage?: number;
    speed?: number;
    aiGoals?: string[];
}

export interface ModCommand {
    name: string;
    description: string;
    usage: string;
    code: string; // Java implementation
}

export interface ModEvent {
    eventType: 'player_join' | 'player_death' | 'block_break' | 'entity_spawn' | 'custom';
    handler: string; // Java code
}

/**
 * Generate a detailed mod specification from a simple prompt
 */
export async function generateModSpecification(
    prompt: string,
    options: {
        minecraftVersion?: string;
        loaderType?: 'forge' | 'fabric';
        author?: string;
    } = {}
): Promise<MinecraftModSpecification> {
    // This will be implemented with AI to expand the prompt
    // For now, return a template

    const modId = generateModId(prompt);
    const modName = generateModName(prompt);

    return {
        modId,
        modName,
        version: '1.0.0',
        description: `A custom Minecraft mod: ${prompt}`,
        author: options.author || 'Applaa User',
        minecraftVersion: options.minecraftVersion || '1.20.1',
        loaderType: options.loaderType || 'forge',
        items: [],
        blocks: [],
        entities: [],
        commands: [],
        events: [],
        mainClass: generateMainClass(modId, modName),
        additionalClasses: {},
        dependencies: [],
    };
}

function generateModId(prompt: string): string {
    // Convert prompt to valid mod ID (lowercase, underscores)
    return prompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 32);
}

function generateModName(prompt: string): string {
    // Convert to title case
    return prompt
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .substring(0, 50);
}

function generateMainClass(modId: string, modName: string): string {
    const className = modName.replace(/[^A-Za-z0-9]/g, '') + 'Mod';

    return `package com.applaa.${modId};

import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.event.lifecycle.FMLCommonSetupEvent;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

@Mod("${modId}")
public class ${className} {
    public static final String MOD_ID = "${modId}";
    private static final Logger LOGGER = LogManager.getLogger();

    public ${className}() {
        FMLJavaModLoadingContext.get().getModEventBus().addListener(this::setup);
        LOGGER.info("${modName} initialized!");
    }

    private void setup(final FMLCommonSetupEvent event) {
        LOGGER.info("${modName} setup complete!");
    }
}
`;
}
