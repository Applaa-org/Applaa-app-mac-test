/**
 * Minecraft Blocks for Blockly
 * 
 * Custom block definitions for Minecraft Bedrock Edition add-ons
 * These blocks generate .mcfunction commands for behavior packs
 */

import * as Blockly from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';

// ============================================
// ENTITY SPAWNING BLOCKS
// ============================================

Blockly.Blocks['minecraft_spawn_entity'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("🐾 Spawn")
            .appendField(new Blockly.FieldDropdown([
                ["Zombie", "zombie"],
                ["Creeper", "creeper"],
                ["Skeleton", "skeleton"],
                ["Spider", "spider"],
                ["Enderman", "enderman"],
                ["Pig", "pig"],
                ["Cow", "cow"],
                ["Sheep", "sheep"],
                ["Chicken", "chicken"],
                ["Wolf", "wolf"],
                ["Cat", "cat"],
                ["Horse", "horse"],
                ["Villager", "villager"]
            ]), "ENTITY");
        this.appendDummyInput()
            .appendField("at player");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
        this.setTooltip("Spawn a mob at the player's location");
    }
};

javascriptGenerator.forBlock['minecraft_spawn_entity'] = function (block: any) {
    const entity = block.getFieldValue('ENTITY');
    return `summon ${entity} ~ ~ ~\n`;
};

// ============================================
// EFFECTS BLOCKS
// ============================================

Blockly.Blocks['minecraft_give_effect'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("✨ Give effect")
            .appendField(new Blockly.FieldDropdown([
                ["Speed", "speed"],
                ["Slowness", "slowness"],
                ["Jump Boost", "jump_boost"],
                ["Regeneration", "regeneration"],
                ["Resistance", "resistance"],
                ["Fire Resistance", "fire_resistance"],
                ["Water Breathing", "water_breathing"],
                ["Invisibility", "invisibility"],
                ["Night Vision", "night_vision"],
                ["Strength", "strength"],
                ["Levitation", "levitation"],
                ["Slow Falling", "slow_falling"]
            ]), "EFFECT");
        this.appendValueInput("DURATION")
            .setCheck("Number")
            .appendField("for");
        this.appendDummyInput()
            .appendField("seconds");
        this.appendValueInput("LEVEL")
            .setCheck("Number")
            .appendField("level");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(290);
        this.setTooltip("Give an effect to the player");
    }
};

javascriptGenerator.forBlock['minecraft_give_effect'] = function (block: any) {
    const effect = block.getFieldValue('EFFECT');
    const duration = javascriptGenerator.valueToCode(block, 'DURATION', Order.ATOMIC) || '30';
    const level = javascriptGenerator.valueToCode(block, 'LEVEL', Order.ATOMIC) || '1';
    return `effect @s ${effect} ${duration} ${level}\n`;
};

// ============================================
// BUILDING BLOCKS
// ============================================

Blockly.Blocks['minecraft_place_block'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("🧱 Place")
            .appendField(new Blockly.FieldDropdown([
                ["Stone", "stone"],
                ["Cobblestone", "cobblestone"],
                ["Oak Planks", "planks"],
                ["Glass", "glass"],
                ["Dirt", "dirt"],
                ["Sand", "sand"],
                ["Gravel", "gravel"],
                ["Gold Block", "gold_block"],
                ["Diamond Block", "diamond_block"],
                ["Iron Block", "iron_block"],
                ["Bricks", "brick_block"],
                ["Obsidian", "obsidian"],
                ["Glowstone", "glowstone"],
                ["Wool", "wool"],
                ["TNT", "tnt"],
                ["Bedrock", "bedrock"]
            ]), "BLOCK");
        this.appendDummyInput()
            .appendField("at player");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(30);
        this.setTooltip("Place a block at the player's location");
    }
};

javascriptGenerator.forBlock['minecraft_place_block'] = function (block: any) {
    const blockType = block.getFieldValue('BLOCK');
    return `setblock ~ ~ ~ ${blockType}\n`;
};

Blockly.Blocks['minecraft_fill_area'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("🏗️ Build")
            .appendField(new Blockly.FieldDropdown([
                ["Floor", "floor"],
                ["Wall", "wall"],
                ["Cube", "cube"],
                ["House", "house"]
            ]), "SHAPE");
        this.appendDummyInput()
            .appendField("with")
            .appendField(new Blockly.FieldDropdown([
                ["Stone", "stone"],
                ["Oak Planks", "planks"],
                ["Glass", "glass"],
                ["Bricks", "brick_block"],
                ["Diamond Block", "diamond_block"]
            ]), "BLOCK");
        this.appendValueInput("SIZE")
            .setCheck("Number")
            .appendField("size");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(30);
        this.setTooltip("Build a structure at the player's location");
    }
};

javascriptGenerator.forBlock['minecraft_fill_area'] = function (block: any) {
    const shape = block.getFieldValue('SHAPE');
    const blockType = block.getFieldValue('BLOCK');
    const size = javascriptGenerator.valueToCode(block, 'SIZE', Order.ATOMIC) || '5';

    switch (shape) {
        case 'floor':
            return `fill ~-${size} ~-1 ~-${size} ~${size} ~-1 ~${size} ${blockType}\n`;
        case 'wall':
            return `fill ~-${size} ~ ~-${size} ~${size} ~4 ~-${size} ${blockType}\n`;
        case 'cube':
            return `fill ~-${size} ~ ~-${size} ~${size} ~${size} ~${size} ${blockType}\n`;
        case 'house':
            return `# Build house\nfill ~-${size} ~ ~-${size} ~${size} ~-1 ~${size} ${blockType}\nfill ~-${size} ~ ~-${size} ~${size} ~4 ~${size} ${blockType} hollow\nfill ~-${size} ~5 ~-${size} ~${size} ~5 ~${size} ${blockType}\n`;
        default:
            return `fill ~-${size} ~ ~-${size} ~${size} ~${size} ~${size} ${blockType}\n`;
    }
};

// ============================================
// CHAT COMMAND BLOCKS
// ============================================

Blockly.Blocks['minecraft_on_chat'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("📢 On chat command")
            .appendField(new Blockly.FieldTextInput("mycommand"), "COMMAND");
        this.appendStatementInput("DO")
            .setCheck(null)
            .appendField("do");
        this.setColour(210);
        this.setTooltip("Run blocks when player types this command");
        this.setHelpUrl("");
    }
};

javascriptGenerator.forBlock['minecraft_on_chat'] = function (block: any) {
    const command = block.getFieldValue('COMMAND');
    const doCode = javascriptGenerator.statementToCode(block, 'DO');
    return `# Command: /${command}\n${doCode}`;
};

// ============================================
// PLAYER ACTIONS
// ============================================

Blockly.Blocks['minecraft_teleport'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("🚀 Teleport player");
        this.appendValueInput("X")
            .setCheck("Number")
            .appendField("X");
        this.appendValueInput("Y")
            .setCheck("Number")
            .appendField("Y");
        this.appendValueInput("Z")
            .setCheck("Number")
            .appendField("Z");
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip("Teleport player to coordinates");
    }
};

javascriptGenerator.forBlock['minecraft_teleport'] = function (block: any) {
    const x = javascriptGenerator.valueToCode(block, 'X', Order.ATOMIC) || '~';
    const y = javascriptGenerator.valueToCode(block, 'Y', Order.ATOMIC) || '~';
    const z = javascriptGenerator.valueToCode(block, 'Z', Order.ATOMIC) || '~';
    return `tp @s ${x} ${y} ${z}\n`;
};

Blockly.Blocks['minecraft_say'] = {
    init: function () {
        this.appendValueInput("MESSAGE")
            .setCheck("String")
            .appendField("💬 Say");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip("Send a message in chat");
    }
};

javascriptGenerator.forBlock['minecraft_say'] = function (block: any) {
    const message = javascriptGenerator.valueToCode(block, 'MESSAGE', Order.ATOMIC) || '"Hello!"';
    return `say ${message.replace(/^'|'$/g, '')}\n`;
};

Blockly.Blocks['minecraft_give_item'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("🎁 Give")
            .appendField(new Blockly.FieldDropdown([
                ["Diamond Sword", "diamond_sword"],
                ["Diamond Pickaxe", "diamond_pickaxe"],
                ["Diamond", "diamond"],
                ["Gold Ingot", "gold_ingot"],
                ["Iron Ingot", "iron_ingot"],
                ["Apple", "apple"],
                ["Golden Apple", "golden_apple"],
                ["Bow", "bow"],
                ["Arrow", "arrow"],
                ["Shield", "shield"],
                ["Ender Pearl", "ender_pearl"],
                ["Totem", "totem_of_undying"]
            ]), "ITEM");
        this.appendValueInput("AMOUNT")
            .setCheck("Number")
            .appendField("x");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(45);
        this.setTooltip("Give an item to the player");
    }
};

javascriptGenerator.forBlock['minecraft_give_item'] = function (block: any) {
    const item = block.getFieldValue('ITEM');
    const amount = javascriptGenerator.valueToCode(block, 'AMOUNT', Order.ATOMIC) || '1';
    return `give @s ${item} ${amount}\n`;
};

// ============================================
// WORLD CONTROLS
// ============================================

Blockly.Blocks['minecraft_set_time'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("🌅 Set time to")
            .appendField(new Blockly.FieldDropdown([
                ["Day", "day"],
                ["Noon", "noon"],
                ["Sunset", "sunset"],
                ["Night", "night"],
                ["Midnight", "midnight"],
                ["Sunrise", "sunrise"]
            ]), "TIME");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(200);
        this.setTooltip("Set the time of day");
    }
};

javascriptGenerator.forBlock['minecraft_set_time'] = function (block: any) {
    const time = block.getFieldValue('TIME');
    return `time set ${time}\n`;
};

Blockly.Blocks['minecraft_set_weather'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("🌦️ Set weather to")
            .appendField(new Blockly.FieldDropdown([
                ["Clear", "clear"],
                ["Rain", "rain"],
                ["Thunder", "thunder"]
            ]), "WEATHER");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(200);
        this.setTooltip("Set the weather");
    }
};

javascriptGenerator.forBlock['minecraft_set_weather'] = function (block: any) {
    const weather = block.getFieldValue('WEATHER');
    return `weather ${weather}\n`;
};

// ============================================
// EXPORT TOOLBOX CATEGORY
// ============================================

export const MINECRAFT_TOOLBOX_CATEGORY = {
    kind: 'category',
    name: '⛏️ Minecraft',
    colour: '#4CAF50',
    contents: [
        // Events
        { kind: 'label', text: '📢 Events' },
        { kind: 'block', type: 'minecraft_on_chat' },

        // Spawn
        { kind: 'label', text: '🐾 Creatures' },
        { kind: 'block', type: 'minecraft_spawn_entity' },

        // Effects
        { kind: 'label', text: '✨ Effects' },
        {
            kind: 'block', type: 'minecraft_give_effect', inputs: {
                DURATION: { shadow: { type: 'math_number', fields: { NUM: 30 } } },
                LEVEL: { shadow: { type: 'math_number', fields: { NUM: 1 } } }
            }
        },

        // Building
        { kind: 'label', text: '🧱 Building' },
        { kind: 'block', type: 'minecraft_place_block' },
        {
            kind: 'block', type: 'minecraft_fill_area', inputs: {
                SIZE: { shadow: { type: 'math_number', fields: { NUM: 5 } } }
            }
        },

        // Player Actions
        { kind: 'label', text: '🎮 Player' },
        {
            kind: 'block', type: 'minecraft_teleport', inputs: {
                X: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
                Y: { shadow: { type: 'math_number', fields: { NUM: 100 } } },
                Z: { shadow: { type: 'math_number', fields: { NUM: 0 } } }
            }
        },
        {
            kind: 'block', type: 'minecraft_say', inputs: {
                MESSAGE: { shadow: { type: 'text', fields: { TEXT: 'Hello!' } } }
            }
        },
        {
            kind: 'block', type: 'minecraft_give_item', inputs: {
                AMOUNT: { shadow: { type: 'math_number', fields: { NUM: 1 } } }
            }
        },

        // World
        { kind: 'label', text: '🌍 World' },
        { kind: 'block', type: 'minecraft_set_time' },
        { kind: 'block', type: 'minecraft_set_weather' }
    ]
};

/**
 * Initialize all Minecraft blocks
 * Call this before creating a Blockly workspace
 */
export function initMinecraftBlocks() {
    console.log('✅ Minecraft blocks initialized');
}

export default MINECRAFT_TOOLBOX_CATEGORY;
