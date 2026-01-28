import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';

export const defineStemGenerators = () => {

    // 🌱 Plant Seed
    javascriptGenerator.forBlock['stem_plant_seed'] = function (block: any) {
        const seed = block.getFieldValue('SEED');
        const soil = block.getFieldValue('SOIL');
        // Simulate planting
        return `console.log("🌱 Planting ${seed} in ${soil}...");\n` +
            `applaaLog("🌱 You planted a ${seed}!");\n`;
    };

    // 💧 Water Plant
    javascriptGenerator.forBlock['stem_water_plant'] = function (block: any) {
        const water = javascriptGenerator.valueToCode(block, 'WATER', javascriptGenerator.ORDER_ATOMIC) || '0';
        return `console.log("💧 Adding " + ${water} + "ml of water...");\n` +
            `applaaLog("💧 Glug glug! Added " + ${water} + "ml water.");\n`;
    };

    // 📏 Check Growth
    javascriptGenerator.forBlock['stem_check_growth'] = function (block: any) {
        return `console.log("📏 Measuring plant...");\n` +
            `var height = Math.floor(Math.random() * 20) + 1;\n` +
            `applaaLog("📏 It is " + height + " cm tall!");\n`;
    };

    // ⚗️ Reaction
    javascriptGenerator.forBlock['stem_start_reaction'] = function (block: any) {
        const a = javascriptGenerator.valueToCode(block, 'A', javascriptGenerator.ORDER_ATOMIC) || '"Something"';
        const b = javascriptGenerator.valueToCode(block, 'B', javascriptGenerator.ORDER_ATOMIC) || '"Something"';
        return `console.log("⚗️ Mixing " + ${a} + " and " + ${b});\n` +
            `applaaLog("💥 FIZZ! BUBBLE! You mixed " + ${a} + " and " + ${b});\n`;
    };

    // 🔥 Heat
    javascriptGenerator.forBlock['stem_heat_liquid'] = function (block: any) {
        const temp = block.getFieldValue('TEMP');
        return `console.log("🔥 Heating to ${temp}°C...");\n` +
            `applaaLog("🔥 Getting hot! Reaching ${temp}°C");\n`;
    };

    // 📡 Sensor (Output)
    javascriptGenerator.forBlock['stem_read_sensor'] = function (block: any) {
        const sensor = block.getFieldValue('SENSOR');
        // Return a random simulator value
        const code = `(function() { return Math.floor(Math.random() * 100); })()`;
        // Order atomic to ensure it wraps correctly if needed
        return [code, javascriptGenerator.ORDER_ATOMIC];
    };
};
