import * as Blockly from 'blockly';
import { javascriptGenerator, Order as JSOrder } from 'blockly/javascript';
import { pythonGenerator, Order as PyOrder } from 'blockly/python';
import { phpGenerator, Order as PHPOrder } from 'blockly/php';
import { luaGenerator, Order as LuaOrder } from 'blockly/lua';
import { dartGenerator, Order as DartOrder } from 'blockly/dart';

// Initialize Custom Blocks
export function initCustomBlocks() {

    // --- Block Definitions ---

    // 1. Applaa Log Block
    if (!Blockly.Blocks['applaa_log']) {
        Blockly.Blocks['applaa_log'] = {
            init: function () {
                this.appendValueInput("MESSAGE")
                    .setCheck(null)
                    .appendField("📢 Say");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(160);
                this.setTooltip("Logs a message");
            }
        };
    }

    // 2. Game Start Event
    if (!Blockly.Blocks['game_start']) {
        Blockly.Blocks['game_start'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🎮 When Game Starts");
                this.setNextStatement(true, null);
                this.setColour(290);
            }
        };
    }

    // 3. Move Sprite (Placeholder for Arcade)
    if (!Blockly.Blocks['game_move_sprite']) {
        Blockly.Blocks['game_move_sprite'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("➡️ Move Player")
                    .appendField(new Blockly.FieldDropdown([["Up", "UP"], ["Down", "DOWN"], ["Left", "LEFT"], ["Right", "RIGHT"]]), "DIRECTION")
                    .appendField("by")
                    .appendField(new Blockly.FieldNumber(10), "STEPS")
                    .appendField("steps");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(290);
            }
        };
    }

    // 4. Text-to-Speech Block
    if (!Blockly.Blocks['applaa_speak']) {
        Blockly.Blocks['applaa_speak'] = {
            init: function () {
                this.appendValueInput("MESSAGE")
                    .setCheck(null)
                    .appendField("🔊 Speak");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(260); // Purple color
                this.setTooltip("Speaks the text using Text-to-Speech");
                this.setHelpUrl("");
            }
        };
    }

    // --- Maze Game Blocks ---
    if (!Blockly.Blocks['maze_move_forward']) {
        Blockly.Blocks['maze_move_forward'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🚶 Move Forward");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(290);
            }
        };
    }

    if (!Blockly.Blocks['maze_turn']) {
        Blockly.Blocks['maze_turn'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🔄 Turn")
                    .appendField(new Blockly.FieldDropdown([["Left ↺", "LEFT"], ["Right ↻", "RIGHT"]]), "DIR");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(290);
            }
        };
    }

    // --- Turtle Game Blocks ---
    if (!Blockly.Blocks['turtle_move']) {
        Blockly.Blocks['turtle_move'] = {
            init: function () {
                this.appendValueInput("VALUE")
                    .setCheck("Number")
                    .appendField("🐢 Move Forward by");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(180);
            }
        };
    }

    if (!Blockly.Blocks['turtle_turn']) {
        Blockly.Blocks['turtle_turn'] = {
            init: function () {
                this.appendValueInput("VALUE")
                    .setCheck("Number")
                    .appendField("🐢 Turn Right by");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(180);
            }
        };
    }

    // --- Generators ---

    // --- JavaScript Generators ---
    javascriptGenerator.forBlock['applaa_log'] = function (block) {
        const message = javascriptGenerator.valueToCode(block, 'MESSAGE', JSOrder.ATOMIC) || "''";
        return `console.log(${message});\nif (window.StageManager && window.StageManager.showOutput) window.StageManager.showOutput(String(${message}));\n`;
    };

    javascriptGenerator.forBlock['applaa_speak'] = function (block) {
        const message = javascriptGenerator.valueToCode(block, 'MESSAGE', JSOrder.ATOMIC) || "''";
        return `(function() {
    const msg = new SpeechSynthesisUtterance(String(${message}));
    window.speechSynthesis.speak(msg);
    console.log("🔊 Speaking: " + ${message});
})();\n`;
    };

    javascriptGenerator.forBlock['game_start'] = function (block) {
        const nextBlock = block.getNextBlock();
        const hasCreateSprite = nextBlock?.type === 'k9_create_sprite';
        if (hasCreateSprite) {
            return `// Game Started
console.log("Game Started!");
\n`;
        }
        return `// Game Started
console.log("Game Started!");
if (window.StageManager) { window.StageManager.addSprite('MazeRunner', '🤖'); }
\n`;
    };
    javascriptGenerator.forBlock['game_move_sprite'] = function (block) {
        const direction = block.getFieldValue('DIRECTION');
        const steps = block.getFieldValue('STEPS');
        return `console.log("Moving ${direction} by ${steps}");\n`;
    };
    javascriptGenerator.forBlock['maze_move_forward'] = () => `console.log("🚶 Maze: Moved Forward");
if (window.StageManager) { window.StageManager.moveSprite('MazeRunner', 40, 0); }
\n`;
    javascriptGenerator.forBlock['maze_turn'] = (block) => `console.log("🔄 Maze: Turned ${block.getFieldValue('DIR')}");\n`;
    javascriptGenerator.forBlock['turtle_move'] = (block) => `console.log("🐢 Turtle: Moved Forward by " + (${javascriptGenerator.valueToCode(block, 'VALUE', JSOrder.ATOMIC) || '0'}));\n`;
    javascriptGenerator.forBlock['turtle_turn'] = (block) => `console.log("🐢 Turtle: Turned Right by " + (${javascriptGenerator.valueToCode(block, 'VALUE', JSOrder.ATOMIC) || '0'}));\n`;


    // --- Python Generators ---
    pythonGenerator.forBlock['applaa_log'] = function (block) {
        const message = pythonGenerator.valueToCode(block, 'MESSAGE', PyOrder.ATOMIC) || "''";
        return `print(${message})\n`;
    };

    pythonGenerator.forBlock['applaa_speak'] = function (block) {
        const message = pythonGenerator.valueToCode(block, 'MESSAGE', PyOrder.ATOMIC) || "''";
        return `# TTS: Would speak this text\nprint("🔊 Speaking: " + str(${message}))\n`;
    };

    pythonGenerator.forBlock['game_start'] = function (block) { return `# Game Started\nprint("Game Started!")\n`; };
    pythonGenerator.forBlock['game_move_sprite'] = function (block) {
        const direction = block.getFieldValue('DIRECTION');
        const steps = block.getFieldValue('STEPS');
        return `print("Moving ${direction} by ${steps}")\n`;
    };
    pythonGenerator.forBlock['maze_move_forward'] = () => `print("🚶 Maze: Moved Forward")\n`;
    pythonGenerator.forBlock['maze_turn'] = (block) => `print("🔄 Maze: Turned ${block.getFieldValue('DIR')}")\n`;
    pythonGenerator.forBlock['turtle_move'] = (block) => `print("🐢 Turtle: Moved Forward by " + str(${pythonGenerator.valueToCode(block, 'VALUE', PyOrder.ATOMIC) || '0'}))\n`;
    pythonGenerator.forBlock['turtle_turn'] = (block) => `print("🐢 Turtle: Turned Right by " + str(${pythonGenerator.valueToCode(block, 'VALUE', PyOrder.ATOMIC) || '0'}))\n`;

    // --- PHP Generators ---
    phpGenerator.forBlock['applaa_log'] = function (block) {
        const message = phpGenerator.valueToCode(block, 'MESSAGE', PHPOrder.ATOMIC) || "''";
        return `print(${message});\n`;
    };

    phpGenerator.forBlock['applaa_speak'] = function (block) {
        const message = phpGenerator.valueToCode(block, 'MESSAGE', PHPOrder.ATOMIC) || "''";
        return `// TTS: Would speak this text\nprint("🔊 Speaking: " . ${message} . "\\n");\n`;
    };

    phpGenerator.forBlock['game_start'] = function (block) { return `// Game Started\nprint("Game Started!\\n");\n`; };
    phpGenerator.forBlock['game_move_sprite'] = function (block) {
        return `print("Moving " . "${block.getFieldValue('DIRECTION')}" . " by " . ${block.getFieldValue('STEPS')} . "\\n");\n`;
    };
    phpGenerator.forBlock['maze_move_forward'] = () => `print("🚶 Maze: Moved Forward\\n");\n`;
    phpGenerator.forBlock['maze_turn'] = (block) => `print("🔄 Maze: Turned ${block.getFieldValue('DIR')}\\n");\n`;
    phpGenerator.forBlock['turtle_move'] = (block) => `print("🐢 Turtle: Moved Forward by " . (${phpGenerator.valueToCode(block, 'VALUE', PHPOrder.ATOMIC) || '0'}) . "\\n");\n`;
    phpGenerator.forBlock['turtle_turn'] = (block) => `print("🐢 Turtle: Turned Right by " . (${phpGenerator.valueToCode(block, 'VALUE', PHPOrder.ATOMIC) || '0'}) . "\\n");\n`;

    // --- Lua Generators ---
    luaGenerator.forBlock['applaa_log'] = function (block) {
        const message = luaGenerator.valueToCode(block, 'MESSAGE', LuaOrder.ATOMIC) || "''";
        return `print(${message})\n`;
    };

    luaGenerator.forBlock['applaa_speak'] = function (block) {
        const message = luaGenerator.valueToCode(block, 'MESSAGE', LuaOrder.ATOMIC) || "''";
        return `-- TTS: Would speak this text\nprint("🔊 Speaking: " .. ${message})\n`;
    };

    luaGenerator.forBlock['game_start'] = function (block) { return `-- Game Started\nprint("Game Started!")\n`; };
    luaGenerator.forBlock['game_move_sprite'] = function (block) {
        return `print("Moving " .. "${block.getFieldValue('DIRECTION')}" .. " by " .. ${block.getFieldValue('STEPS')})\n`;
    };
    luaGenerator.forBlock['maze_move_forward'] = () => `print("🚶 Maze: Moved Forward")\n`;
    luaGenerator.forBlock['maze_turn'] = (block) => `print("🔄 Maze: Turned ${block.getFieldValue('DIR')}")\n`;
    luaGenerator.forBlock['turtle_move'] = (block) => `print("🐢 Turtle: Moved Forward by " .. (${luaGenerator.valueToCode(block, 'VALUE', LuaOrder.ATOMIC) || '0'}))\n`;
    luaGenerator.forBlock['turtle_turn'] = (block) => `print("🐢 Turtle: Turned Right by " .. (${luaGenerator.valueToCode(block, 'VALUE', LuaOrder.ATOMIC) || '0'}))\n`;

    // --- Dart Generators ---
    dartGenerator.forBlock['applaa_log'] = function (block) {
        const message = dartGenerator.valueToCode(block, 'MESSAGE', DartOrder.ATOMIC) || "''";
        return `print(${message});\n`;
    };

    dartGenerator.forBlock['applaa_speak'] = function (block) {
        const message = dartGenerator.valueToCode(block, 'MESSAGE', DartOrder.ATOMIC) || "''";
        return `// TTS: Would speak this text\nprint("🔊 Speaking: " + (${message}).toString());\n`;
    };

    dartGenerator.forBlock['game_start'] = function (block) { return `// Game Started\nprint("Game Started!");\n`; };
    dartGenerator.forBlock['game_move_sprite'] = function (block) {
        return `print("Moving ${block.getFieldValue('DIRECTION')} by ${block.getFieldValue('STEPS')}");\n`;
    };
    dartGenerator.forBlock['maze_move_forward'] = () => `print("🚶 Maze: Moved Forward");\n`;
    dartGenerator.forBlock['maze_turn'] = (block) => `print("🔄 Maze: Turned ${block.getFieldValue('DIR')}");\n`;
    dartGenerator.forBlock['turtle_move'] = (block) => `print("🐢 Turtle: Moved Forward by " + (${dartGenerator.valueToCode(block, 'VALUE', DartOrder.ATOMIC) || '0'}).toString());\n`;
    dartGenerator.forBlock['turtle_turn'] = (block) => `print("🐢 Turtle: Turned Right by " + (${dartGenerator.valueToCode(block, 'VALUE', DartOrder.ATOMIC) || '0'}).toString());\n`;
}
