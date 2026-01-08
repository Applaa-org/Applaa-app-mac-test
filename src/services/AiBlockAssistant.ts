import { AppyAnimatedRef } from '../components/blockly/AppyAnimated';

/**
 * AI Block Assistant Service
 * 
 * Handles the translation of Natural Language -> Blockly Actions.
 * Simulates a "Brain" for Appy.
 */

interface AiResponse {
    text: string;
    action?: string;
    blockXml?: string; // XML string to inject a block
}

export class AiBlockAssistant {
    private appy: AppyAnimatedRef | null = null;
    private workspace: any = null; // Blockly Workspace

    constructor() {
        // Singleton initialization if needed
    }

    public setReferences(appy: AppyAnimatedRef | null, workspace: any) {
        this.appy = appy;
        this.workspace = workspace;
    }

    /**
     * Process a user message and return Appy's response/action
     */
    public async processMessage(userMessage: string): Promise<AiResponse> {
        const msg = userMessage.toLowerCase();
        let response: AiResponse = { text: "I didn't catch that." };

        // 1. Check for "Knowledge" questions (What is X?)
        if (msg.includes("run button") || msg.includes("green button")) {
            response = {
                text: "That's the Run Button! 🚀 Click it to see your code run.",
                action: "point_run"
            };
        }

        // LOOP
        else if (msg.includes("loop") || msg.includes("repeat")) {
            response = {
                text: "Loops are great! I'll add one for you! 🔄",
                action: "create_loop",
                blockXml: `<block type="controls_repeat_ext"><value name="TIMES"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block>`
            };
        }

        // PRINT / LOG
        else if (msg.includes("print") || msg.includes("say") || msg.includes("hello")) {
            response = {
                text: "Printing messages is fun! Here is a print block. 📝",
                action: "create_print",
                blockXml: `<block type="text_print"><value name="TEXT"><shadow type="text"><field name="TEXT">Hello World!</field></shadow></value></block>`
            };
        }

        // IF / LOGIC
        else if (msg.includes("if") || msg.includes("check")) {
            response = {
                text: "Making decisions? You need an 'If' block! 🤔",
                action: "create_if",
                blockXml: `<block type="controls_if"></block>`
            };
        }

        // MATH
        else if (msg.includes("add") || msg.includes("math") || msg.includes("plus")) {
            response = {
                text: "Math time! ➕",
                action: "create_math",
                blockXml: `<block type="math_arithmetic"></block>`
            };
        } else {
            // Default "Personality" response
            const fallbackResponses = [
                "I'm listening! Tell me what to build.",
                "Want to try adding a loop? or maybe some math?",
                "I love coding! 💻 What's next?",
                "You can ask me to 'Make a loop' or 'Show me the Run button'!"
            ];
            response = {
                text: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
            };
        }

        // 🗣️ TRIGGER APPY SPEECH
        if (this.appy && response.text) {
            this.appy.speak(response.text);
        }

        return response;
    }
}

export const aiBlockAssistant = new AiBlockAssistant();
