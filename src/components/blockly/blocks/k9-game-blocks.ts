import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

export function initK9Blocks() {

    // 🟠 CATEGORY: Game Mechanics
    const GAME_COLOR = "#FF8C1A"; // Orange

    // 1. Create Sprite
    if (!Blockly.Blocks['k9_create_sprite']) {
        Blockly.Blocks['k9_create_sprite'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("⭐ Create Sprite")
                    .appendField(new Blockly.FieldTextInput("Player"), "NAME")
                    .appendField("image")
                    .appendField(new Blockly.FieldDropdown([
                        ["Snake 🐍", "SNAKE"],
                        ["Apple 🍎", "APPLE"],
                        ["Hero 🦸", "HERO"],
                        ["Enemy 👾", "ENEMY"],
                        ["Coin 🪙", "COIN"],
                        ["Platform 🧱", "PLATFORM"],
                        ["Ball ⚽", "BALL"]
                    ]), "IMG");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(GAME_COLOR);
                this.setTooltip("Creates a new game character");
            }
        };
    }
    javascriptGenerator.forBlock['k9_create_sprite'] = function (block) {
        const name = block.getFieldValue('NAME');
        const img = block.getFieldValue('IMG');
        return `
        if (window.StageManager) {
            window.StageManager.addSprite('${name}', '${img}');
        } else {
            console.log("GAME: Create Sprite '${name}' type ${img}");
        }
        \n`;
    };

    // 2. Set Position
    if (!Blockly.Blocks['k9_set_position']) {
        Blockly.Blocks['k9_set_position'] = {
            init: function () {
                this.appendValueInput("X")
                    .setCheck("Number")
                    .appendField("🎯 Set")
                    .appendField(new Blockly.FieldTextInput("Player"), "NAME")
                    .appendField("x to");
                this.appendValueInput("Y")
                    .setCheck("Number")
                    .appendField("y to");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(GAME_COLOR);
                this.setTooltip("Moves a sprite to specific coordinates");
            }
        };
    }
    javascriptGenerator.forBlock['k9_set_position'] = function (block) {
        const name = block.getFieldValue('NAME');
        const x = javascriptGenerator.valueToCode(block, 'X', Order.ATOMIC) || '0';
        const y = javascriptGenerator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
        return `
        if (window.StageManager) {
            window.StageManager.setSpritePosition('${name}', ${x}, ${y});
        }
        console.log("GAME: Move '${name}' to (${x}, ${y})");
        \n`;
    };

    // 3. Update Score
    if (!Blockly.Blocks['k9_update_score']) {
        Blockly.Blocks['k9_update_score'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("❤️ Score")
                    .appendField(new Blockly.FieldDropdown([
                        ["Add", "ADD"],
                        ["Subtract", "SUB"]
                    ]), "OP")
                    .appendField(new Blockly.FieldNumber(1), "POINTS")
                    .appendField("points");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(GAME_COLOR);
                this.setTooltip("Changes the player's score");
            }
        };
    }
    javascriptGenerator.forBlock['k9_update_score'] = function (block) {
        const op = block.getFieldValue('OP');
        const points = block.getFieldValue('POINTS');
        return `console.log("GAME: Score ${op} ${points}");\n`;
    };

    // 4. On Key Press (Event)
    if (!Blockly.Blocks['k9_on_key_press']) {
        Blockly.Blocks['k9_on_key_press'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🎮 When")
                    .appendField(new Blockly.FieldDropdown([
                        ["Space", "SPACE"],
                        ["Up Arrow", "UP"],
                        ["Down Arrow", "DOWN"],
                        ["Left Arrow", "LEFT"],
                        ["Right Arrow", "RIGHT"],
                        ["Enter", "ENTER"]
                    ]), "KEY")
                    .appendField("pressed");
                this.appendStatementInput("DO")
                    .setCheck(null);
                this.setColour(GAME_COLOR);
                this.setTooltip("Runs code when a key is pressed");
            }
        };
    }
    javascriptGenerator.forBlock['k9_on_key_press'] = function (block) {
        const key = block.getFieldValue('KEY');
        const branch = javascriptGenerator.statementToCode(block, 'DO');
        const keyMap: Record<string, string> = {
            UP: "'ArrowUp'", DOWN: "'ArrowDown'", LEFT: "'ArrowLeft'", RIGHT: "'ArrowRight'",
            SPACE: "' '", ENTER: "'Enter'"
        };
        const keyCode = keyMap[key] || "'" + key + "'";
        // Register with parent so keydown (when stage is open) can trigger this handler
        return `
        (function() {
            window.__keyHandlers = window.__keyHandlers || [];
            window.__keyHandlers.push({ key: ${keyCode}, fn: function() { ${branch} } });
        })();
        \n`;
    };

    // 4b. Move Sprite (used inside On Key Press etc.)
    if (!Blockly.Blocks['k9_move_sprite']) {
        Blockly.Blocks['k9_move_sprite'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🔄 Move")
                    .appendField(new Blockly.FieldTextInput("Player"), "NAME")
                    .appendField(new Blockly.FieldDropdown([
                        ["Left", "LEFT"],
                        ["Right", "RIGHT"],
                        ["Up", "UP"],
                        ["Down", "DOWN"]
                    ]), "DIR")
                    .appendField("by")
                    .appendField(new Blockly.FieldNumber(10, 1, 500), "STEPS")
                    .appendField("steps");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(GAME_COLOR);
                this.setTooltip("Moves a sprite in a direction by a number of steps");
            }
        };
    }
    javascriptGenerator.forBlock['k9_move_sprite'] = function (block) {
        const name = block.getFieldValue('NAME');
        const dir = block.getFieldValue('DIR');
        const steps = block.getFieldValue('STEPS');
        // StageManager.moveSprite(name, dx, dy) expects pixel deltas
        const dx = dir === 'LEFT' ? -steps : dir === 'RIGHT' ? steps : 0;
        const dy = dir === 'UP' ? -steps : dir === 'DOWN' ? steps : 0;
        return `
        if (window.StageManager) {
            window.StageManager.moveSprite('${name}', ${dx}, ${dy});
        } else {
            console.log("GAME: Move '${name}' ${dir} ${steps} steps");
        }
        \n`;
    };

    // 🔵 CATEGORY: Physics
    const PHYSICS_COLOR = "#4C97FF"; // Blue

    // 5. Add Gravity
    if (!Blockly.Blocks['k9_add_gravity']) {
        Blockly.Blocks['k9_add_gravity'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🍎 Add Gravity to")
                    .appendField(new Blockly.FieldTextInput("Player"), "NAME")
                    .appendField("strength")
                    .appendField(new Blockly.FieldNumber(10), "STR");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(PHYSICS_COLOR);
                this.setTooltip("Makes a sprite fall");
            }
        };
    }
    javascriptGenerator.forBlock['k9_add_gravity'] = function (block) {
        const name = block.getFieldValue('NAME');
        const str = block.getFieldValue('STR');
        return `console.log("PHYSICS: '${name}' gravity = ${str}");\n`;
    };

    // 6. Set Velocity
    if (!Blockly.Blocks['k9_set_velocity']) {
        Blockly.Blocks['k9_set_velocity'] = {
            init: function () {
                this.appendValueInput("VX")
                    .setCheck("Number")
                    .appendField("⚡ Set")
                    .appendField(new Blockly.FieldTextInput("Player"), "NAME")
                    .appendField("speed X");
                this.appendValueInput("VY")
                    .setCheck("Number")
                    .appendField("speed Y");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(PHYSICS_COLOR);
                this.setTooltip("Sets the moving speed of a sprite");
            }
        };
    }
    javascriptGenerator.forBlock['k9_set_velocity'] = function (block) {
        const name = block.getFieldValue('NAME');
        const vx = javascriptGenerator.valueToCode(block, 'VX', Order.ATOMIC) || '0';
        const vy = javascriptGenerator.valueToCode(block, 'VY', Order.ATOMIC) || '0';
        return `
        if (window.StageManager) {
            window.StageManager.setSpriteVelocity('${name}', ${vx}, ${vy});
        }
        console.log("PHYSICS: '${name}' velocity = (${vx}, ${vy})");
        \n`;
    };

    // 7. On Collision (Event)
    if (!Blockly.Blocks['k9_on_collision']) {
        Blockly.Blocks['k9_on_collision'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("💥 When")
                    .appendField(new Blockly.FieldTextInput("Player"), "A")
                    .appendField("touches")
                    .appendField(new Blockly.FieldTextInput("Enemy"), "B");
                this.appendStatementInput("DO")
                    .setCheck(null);
                this.setColour(PHYSICS_COLOR);
                this.setTooltip("Runs code when two sprites collide");
            }
        };
    }
    javascriptGenerator.forBlock['k9_on_collision'] = function (block) {
        const a = block.getFieldValue('A');
        const b = block.getFieldValue('B');
        const branch = javascriptGenerator.statementToCode(block, 'DO');
        return `
        (function() {
            window.__collisionHandlers = window.__collisionHandlers || [];
            window.__collisionHandlers.push({ a: '${a}', b: '${b}', fn: function() { ${branch} } });
        })();
        \n`;
    };

    // 8. Set Bounciness
    if (!Blockly.Blocks['k9_set_bounciness']) {
        Blockly.Blocks['k9_set_bounciness'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🏀 Set")
                    .appendField(new Blockly.FieldTextInput("Player"), "NAME")
                    .appendField("bounciness")
                    .appendField(new Blockly.FieldNumber(50, 0, 100), "BOUNCE")
                    .appendField("%");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(PHYSICS_COLOR);
                this.setTooltip("Makes a sprite bounce off things");
            }
        };
    }
    javascriptGenerator.forBlock['k9_set_bounciness'] = function (block) {
        const name = block.getFieldValue('NAME');
        const bounce = block.getFieldValue('BOUNCE');
        return `console.log("PHYSICS: '${name}' bounciness = ${bounce}%");\n`;
    };
}
