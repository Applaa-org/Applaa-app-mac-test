import * as Blockly from 'blockly/core';

// 🧪 Science Lab Blocks
// Focus on: Biology, Chemistry, Physics (Sensors)

const createScienceBlock = (type: string, message: string, args0: any[], tooltip: string) => {
    Blockly.Blocks[type] = {
        init: function () {
            this.jsonInit({
                "type": type,
                "message0": message,
                "args0": args0,
                "previousStatement": null,
                "nextStatement": null,
                "colour": 120, // Green/Teal
                "tooltip": tooltip,
                "helpUrl": ""
            });
        }
    };
};

export const defineStemBlocks = () => {

    // --- 🌿 BIOLOGY ---
    createScienceBlock(
        "stem_plant_seed",
        "🌱 Plant a %1 seed in %2 soil",
        [
            { "type": "field_dropdown", "name": "SEED", "options": [["Sunflower 🌻", "SUNFLOWER"], ["Bean 🫘", "BEAN"], ["Tomato 🍅", "TOMATO"]] },
            { "type": "field_dropdown", "name": "SOIL", "options": [["Potting Mix", "POT"], ["Sand", "SAND"], ["Clay", "CLAY"]] }
        ],
        "Start growing a plant."
    );

    createScienceBlock(
        "stem_water_plant",
        "💧 Water plant with %1 ml",
        [
            { "type": "input_value", "name": "WATER", "check": "Number" }
        ],
        "Add water to your plant."
    );

    createScienceBlock(
        "stem_check_growth",
        "📏 Measure plant height",
        [],
        "Check how tall the plant is."
    );

    // --- ⚗️ CHEMISTRY ---
    createScienceBlock(
        "stem_start_reaction",
        "⚗️ Chemistry: Mix %1 and %2",
        [
            { "type": "input_value", "name": "A" },
            { "type": "input_value", "name": "B" }
        ],
        "Mix two elements together."
    );

    createScienceBlock(
        "stem_heat_liquid",
        "🔥 Heat mixture to %1 °C",
        [
            { "type": "field_number", "name": "TEMP", "value": 100 }
        ],
        "Apply heat to the experiment."
    );

    // --- 📡 SENSORS ---
    Blockly.Blocks['stem_read_sensor'] = {
        init: function () {
            this.jsonInit({
                "type": "stem_read_sensor",
                "message0": "📡 Read %1 Sensor",
                "args0": [
                    { "type": "field_dropdown", "name": "SENSOR", "options": [["Temperature 🌡️", "TEMP"], ["Light ☀️", "LIGHT"], ["Moisture 💧", "WET"]] }
                ],
                "output": "Number",
                "colour": 120,
                "tooltip": "Get a value from a simulated sensor."
            });
        }
    };

};
