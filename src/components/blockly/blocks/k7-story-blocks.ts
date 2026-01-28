import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

export function initK7Blocks() {

    // 🟣 CATEGORY: Story Maker (Sequencing & Events)
    const STORY_COLOR = "#9966FF"; // Purple

    // 1. Start Story
    if (!Blockly.Blocks['k7_start_story']) {
        Blockly.Blocks['k7_start_story'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("📖 Start Story")
                    .appendField(new Blockly.FieldTextInput("My Adventure"), "TITLE");
                this.setNextStatement(true, null);
                this.setColour(STORY_COLOR);
                this.setTooltip("Begins a new story");
                this.setHelpUrl("");
            }
        };
    }
    javascriptGenerator.forBlock['k7_start_story'] = function (block) {
        const title = block.getFieldValue('TITLE');
        const escapedTitle = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        return `
console.log("STORY: Start '${escapedTitle}'");
(function() {
    const speechText = "Starting story: ${escapedTitle}";
    if (window.SpeechManager && window.SpeechManager.speak) {
        window.SpeechManager.speak(speechText);
    } else if (window.speechSynthesis) {
        const msg = new SpeechSynthesisUtterance(speechText);
        window.speechSynthesis.speak(msg);
    }
})();
`;
    };

    // 2. Add Character
    if (!Blockly.Blocks['k7_add_character']) {
        Blockly.Blocks['k7_add_character'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🧑 Add Character")
                    .appendField(new Blockly.FieldDropdown([
                        ["Boy 👦", "BOY"],
                        ["Girl 👧", "GIRL"],
                        ["Wizard 🧙", "WIZARD"],
                        ["Dragon 🐉", "DRAGON"],
                        ["Alien 👽", "ALIEN"]
                    ]), "CHAR")
                    .appendField("named")
                    .appendField(new Blockly.FieldTextInput("Hero"), "NAME");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(STORY_COLOR);
                this.setTooltip("Adds a character to the scene");
            }
        };
    }
    javascriptGenerator.forBlock['k7_add_character'] = function (block) {
        const char = block.getFieldValue('CHAR');
        const name = block.getFieldValue('NAME');
        return `console.log("STORY: Add ${char} named ${name}");\n`;
    };

    // 3. Character Says (with speech)
    if (!Blockly.Blocks['k7_character_says']) {
        Blockly.Blocks['k7_character_says'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("💬")
                    .appendField(new Blockly.FieldTextInput("Hero"), "NAME")
                    .appendField("says")
                    .appendField(new Blockly.FieldTextInput("Hello!"), "TEXT");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(STORY_COLOR);
                this.setTooltip("Character speaks and the text is read aloud");
            }
        };
    }
    javascriptGenerator.forBlock['k7_character_says'] = function (block) {
        const name = block.getFieldValue('NAME');
        const text = block.getFieldValue('TEXT');
        const escapedText = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        return `
(function() {
    const speechText = "${name} says: ${escapedText}";
    console.log("STORY: " + speechText);
    if (window.SpeechManager && window.SpeechManager.speak) {
        window.SpeechManager.speak(speechText);
    } else if (window.speechSynthesis) {
        const msg = new SpeechSynthesisUtterance(speechText);
        window.speechSynthesis.speak(msg);
    }
})();
`;
    };

    // 4. Character Think
    if (!Blockly.Blocks['k7_character_think']) {
        Blockly.Blocks['k7_character_think'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("💭")
                    .appendField(new Blockly.FieldTextInput("Hero"), "NAME")
                    .appendField("thinks")
                    .appendField(new Blockly.FieldTextInput("Hmm..."), "TEXT");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(STORY_COLOR);
                this.setTooltip("Shows a thought bubble");
            }
        };
    }
    javascriptGenerator.forBlock['k7_character_think'] = function (block) {
        const name = block.getFieldValue('NAME');
        const text = block.getFieldValue('TEXT');
        const escapedText = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        return `
console.log("STORY: ${name} thinks '${escapedText}'");
(function() {
    const speechText = "${name} thinks ${escapedText}";
    if (window.SpeechManager && window.SpeechManager.speak) {
        window.SpeechManager.speak(speechText);
    } else if (window.speechSynthesis) {
        const msg = new SpeechSynthesisUtterance(speechText);
        window.speechSynthesis.speak(msg);
    }
})();
`;
    };

    // 5. Move To
    if (!Blockly.Blocks['k7_character_move_to']) {
        Blockly.Blocks['k7_character_move_to'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🏃 Move")
                    .appendField(new Blockly.FieldTextInput("Hero"), "NAME")
                    .appendField("to")
                    .appendField(new Blockly.FieldDropdown([
                        ["Center", "CENTER"],
                        ["Left", "LEFT"],
                        ["Right", "RIGHT"],
                        ["Top", "TOP"],
                        ["Bottom", "BOTTOM"]
                    ]), "POS");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(STORY_COLOR);
                this.setTooltip("Moves a character to a position");
            }
        };
    }
    javascriptGenerator.forBlock['k7_character_move_to'] = function (block) {
        const name = block.getFieldValue('NAME');
        const pos = block.getFieldValue('POS');
        return `console.log("STORY: Move ${name} to ${pos}");\n`;
    };

    // 6. Ask Question
    if (!Blockly.Blocks['k7_ask_question']) {
        Blockly.Blocks['k7_ask_question'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("❓ Ask Question")
                    .appendField(new Blockly.FieldTextInput("What is your name?"), "QUESTION");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(STORY_COLOR);
                this.setTooltip("Asks the user a question");
            }
        };
    }
    javascriptGenerator.forBlock['k7_ask_question'] = function (block) {
        const q = block.getFieldValue('QUESTION');
        return `prompt("${q}");\n`;
    };


    // 🎨 CATEGORY: Music & Art (Creativity)
    const ART_COLOR = "#FF66CC"; // Pink

    // 7. Play Note
    if (!Blockly.Blocks['k7_play_note']) {
        Blockly.Blocks['k7_play_note'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🎹 Play Note")
                    .appendField(new Blockly.FieldDropdown([
                        ["C", "C4"],
                        ["D", "D4"],
                        ["E", "E4"],
                        ["F", "F4"],
                        ["G", "G4"],
                        ["A", "A4"],
                        ["B", "B4"]
                    ]), "NOTE");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(ART_COLOR);
                this.setTooltip("Plays a musical note");
            }
        };
    }
    javascriptGenerator.forBlock['k7_play_note'] = function (block) {
        const note = block.getFieldValue('NOTE');
        return `
if (window.AudioManager) {
    window.AudioManager.playNote("${note}");
} else {
    console.log("MUSIC: Play Note ${note}");
}
`;
    };

    // 8. Play Drum
    if (!Blockly.Blocks['k7_play_drum']) {
        Blockly.Blocks['k7_play_drum'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🥁 Play Drum")
                    .appendField(new Blockly.FieldDropdown([
                        ["Snare", "SNARE"],
                        ["Bass", "BASS"],
                        ["Hi-Hat", "HIHAT"],
                        ["Clap", "CLAP"],
                        ["Cymbal", "CYMBAL"]
                    ]), "DRUM");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(ART_COLOR);
                this.setTooltip("Plays a drum sound");
            }
        };
    }
    javascriptGenerator.forBlock['k7_play_drum'] = function (block) {
        const drum = block.getFieldValue('DRUM');
        return `
if (window.AudioManager) {
    window.AudioManager.playDrum("${drum}");
} else {
    console.log("MUSIC: Play Drum ${drum}");
}
`;
    };

    // 9. Draw Shape
    if (!Blockly.Blocks['k7_draw_shape']) {
        Blockly.Blocks['k7_draw_shape'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("🖌️ Draw")
                    .appendField(new Blockly.FieldDropdown([
                        ["Square ⬜", "SQUARE"],
                        ["Circle ⚪", "CIRCLE"],
                        ["Triangle 🔺", "TRIANGLE"],
                        ["Star ⭐", "STAR"]
                    ]), "SHAPE");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(ART_COLOR);
                this.setTooltip("Draws a shape on the canvas");
            }
        };
    }
    javascriptGenerator.forBlock['k7_draw_shape'] = function (block) {
        const shape = block.getFieldValue('SHAPE');
        return `
        if (window.StageManager) {
            window.StageManager.addShape("${shape}");
        } else {
            console.log("ART: Draw ${shape}");
        } 
        \n`;
    };

    // 10. Add Sparkle
    if (!Blockly.Blocks['k7_add_sparkle']) {
        Blockly.Blocks['k7_add_sparkle'] = {
            init: function () {
                this.appendDummyInput()
                    .appendField("✨ Add Sparkle");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(ART_COLOR);
                this.setTooltip("Adds a sparkle effect");
            }
        };
    }
    javascriptGenerator.forBlock['k7_add_sparkle'] = function (block) {
        return `
        if (window.CelebrationManager) {
            window.CelebrationManager.celebrateMagic();
        } else {
            console.log("✨ Sparkle!");
        }
        \n`;
    };
}
