import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

export function initK5Blocks() {

    // 🟡 CATEGORY: My First Code (Simple Events & Actions)
    const CATEGORY_COLOR = "#FFD700"; // Gold

    // 1. Show Character (Emoji based)
    if (!Blockly.Blocks['k5_show_character']) {
        Blockly.Blocks['k5_show_character'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🐱 Show Character")
                    .appendField(new Blockly.FieldDropdown([
                        ["Cat 🐱", "🐱"],
                        ["Dog 🐶", "🐶"],
                        ["Robot 🤖", "🤖"],
                        ["Princess 👸", "👸"],
                        ["Ninja 🥷", "🥷"]
                    ]), "CHAR");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(CATEGORY_COLOR);
                this.setTooltip("Shows a character on the screen");
            }
        };
    }

    javascriptGenerator.forBlock['k5_show_character'] = function (block) {
        const char = block.getFieldValue('CHAR');
        return `
        if (window.StageManager) {
            window.StageManager.addSprite('Actor', '${char}'); 
        } else {
            console.log("ACTOR: Show ${char}");
        }
        \n`;
    };

    // 2. Play Sound (Simple + Art & Music: notes & drums)
    const PLAY_SOUND_OPTIONS: [string, string][] = [
        ["Meow 🐱", "MEOW"],
        ["Woof 🐶", "WOOF"],
        ["Beep 🤖", "BEEP"],
        ["Magic ✨", "MAGIC"],
        ["Pop 🎈", "POP"],
        ["Note C 🎹", "C4"],
        ["Note D 🎹", "D4"],
        ["Note E 🎹", "E4"],
        ["Note F 🎹", "F4"],
        ["Note G 🎹", "G4"],
        ["Note A 🎹", "A4"],
        ["Note B 🎹", "B4"],
        ["Drum Snare 🥁", "SNARE"],
        ["Drum Bass 🥁", "BASS"],
        ["Drum Hi-Hat 🥁", "HIHAT"],
        ["Drum Clap 🥁", "CLAP"],
        ["Drum Cymbal 🥁", "CYMBAL"],
    ];
    if (!Blockly.Blocks['k5_play_sound']) {
        Blockly.Blocks['k5_play_sound'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🎵 Play Sound")
                    .appendField(new Blockly.FieldDropdown(PLAY_SOUND_OPTIONS), "SOUND");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(CATEGORY_COLOR);
                this.setTooltip("Plays a sound (simple, notes, or drums from Art & Music)");
            }
        };
    }

    javascriptGenerator.forBlock['k5_play_sound'] = function (block) {
        const sound = block.getFieldValue('SOUND');
        return `
if (window.AudioManager && window.AudioManager.playSound) {
    window.AudioManager.playSound("${sound}");
} else {
    console.log("AUDIO: Play ${sound}");
}
`;
    };

    // 3. Wait (Simplified)
    if (!Blockly.Blocks['k5_wait_seconds']) {
        Blockly.Blocks['k5_wait_seconds'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("⏱️ Wait")
                    .appendField(new Blockly.FieldNumber(1, 0, 60), "SECONDS")
                    .appendField("seconds");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(CATEGORY_COLOR);
                this.setTooltip("Waits for a few seconds");
            }
        };
    }

    javascriptGenerator.forBlock['k5_wait_seconds'] = function (block) {
        const seconds = block.getFieldValue('SECONDS');
        const milliseconds = seconds * 1000;
        return `await new Promise(resolve => setTimeout(resolve, ${milliseconds}));\n`;
    };

    // 4. Character Say (Speech Bubble)
    if (!Blockly.Blocks['k5_character_say']) {
        Blockly.Blocks['k5_character_say'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("💬 Say")
                    .appendField(new Blockly.FieldTextInput("Hello!"), "TEXT");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(CATEGORY_COLOR);
                this.setTooltip("Makes the character talk");
            }
        };
    }

    javascriptGenerator.forBlock['k5_character_say'] = function (block) {
        const text = block.getFieldValue('TEXT');
        return `console.log("ACTOR: Say '${text}'");\n`;
    };

    // 5. Change Background
    if (!Blockly.Blocks['k5_change_background']) {
        Blockly.Blocks['k5_change_background'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🌈 Background")
                    .appendField(new Blockly.FieldDropdown([
                        ["Blue Sky ☀️", "#87CEEB"],
                        ["Night ⭐", "#191970"],
                        ["Forest 🌳", "#228B22"],
                        ["Pink Party 🎉", "#FF69B4"],
                        ["Black ⚫", "#000000"]
                    ]), "COLOR");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(CATEGORY_COLOR);
                this.setTooltip("Changes the background color");
            }
        };
    }

    javascriptGenerator.forBlock['k5_change_background'] = function (block) {
        const color = block.getFieldValue('COLOR');
        return `
        if (window.StageManager) {
            window.StageManager.setBackground('${color}');
        } else {
            console.log("SCENE: Background ${color}");
        }
        \n`;
    };

    // 6. Count To (Simple Loop)
    if (!Blockly.Blocks['k5_count_to']) {
        Blockly.Blocks['k5_count_to'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🔢 Count to")
                    .appendField(new Blockly.FieldNumber(10, 1, 100), "NUM");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(CATEGORY_COLOR);
                this.setTooltip("Counts up to a number");
            }
        };
    }

    javascriptGenerator.forBlock['k5_count_to'] = function (block) {
        const num = block.getFieldValue('NUM');
        // Generates a simple for loop
        return `for (let i = 1; i <= ${num}; i++) { console.log(i); }\n`;
    };

    // 7. Wave Hello (Animation)
    if (!Blockly.Blocks['k5_wave_hello']) {
        Blockly.Blocks['k5_wave_hello'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("👋 Wave Hello");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(CATEGORY_COLOR);
                this.setTooltip("Makes the character wave");
            }
        };
    }

    javascriptGenerator.forBlock['k5_wave_hello'] = function (block) {
        return `console.log("ACTOR: Animate Wave");\n`;
    };

    // 8. Celebrate (Particle Effect)
    if (!Blockly.Blocks['k5_celebrate']) {
        Blockly.Blocks['k5_celebrate'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🎉 Celebrate!");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(CATEGORY_COLOR);
                this.setTooltip("Shows fireworks or confetti");
            }
        };
    }

    javascriptGenerator.forBlock['k5_celebrate'] = function (block) {
        return `
        if (window.CelebrationManager) {
            window.CelebrationManager.celebrateSuccess();
        } else {
            console.log("🎉 Celebration!");
        }
        \n`;
    };
}
