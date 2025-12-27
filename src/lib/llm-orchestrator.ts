/**
 * LLM Orchestrator for Prompt → Project
 * Handles structured JSON generation for starter projects and edits
 * Uses Applaa's existing LLM settings and API keys
 */

import { generateText } from 'ai';
import { getModelClient } from '../ipc/utils/get_model_client';
export { getModelClient };
import { readSettings } from '../main/settings';
import log from 'electron-log';
import { MINECRAFT_MOD_SYSTEM_PROMPT } from '../prompts/minecraft_mod_system_prompt';

const logger = log.scope('llm-orchestrator');

export interface StarterProjectRequest {
    prompt: string;
    frameworkId: 'makecode-arcade' | 'microbit' | 'minecraft-makecode' | 'blockly';
}

export interface StarterProject {
    title: string;
    type: 'ARCADE' | 'MICROBIT' | 'MINECRAFT' | 'BLOCKLY';
    explanationForKid: string;
    stepsToTry: string[];
    payload: {
        makecode?: {
            target: 'arcade' | 'microbit' | 'minecraft';
            preferredLanguage: 'blocks' | 'typescript';
            typescript: string;
            notes: string[];
            sprites?: Array<{ name: string; data: string }>;
        };
        blockly?: {
            workspaceJson: any;
            generatedCode: { language: 'js' | 'py'; code: string };
            variables: string[];
        };
        minecraftMod?: {
            language: 'java';
            code: string;
            fileName: string;
            installationInstructions: string;
            notes: string[];
        };
    };
}

export interface EditProjectRequest {
    project: StarterProject;
    changeRequest: string;
}

/**
 * Generate a starter project from a kid's prompt
 * Uses the configured LLM from Applaa settings
 */
export async function generateStarterProject(
    request: StarterProjectRequest
): Promise<StarterProject> {
    const { prompt, frameworkId } = request;

    try {
        // Get the configured model from settings
        const settings = readSettings();
        if (!settings.selectedModel) {
            throw new Error('No model selected in settings');
        }
        const { modelClient } = await getModelClient(settings.selectedModel, settings);

        logger.info(`Generating starter project for ${frameworkId} with model:`, settings.selectedModel.name);

        // Build system prompt based on framework
        const systemPrompt = buildSystemPrompt(frameworkId);

        // Call LLM with structured output using Applaa's configured model
        const result = await generateText({
            model: modelClient.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            maxTokens: 2000,
        });

        // Parse the response text as JSON
        const responseText = result.text.trim();

        // Try to extract JSON from the response (in case it's wrapped in markdown)
        let jsonText = responseText;
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
            jsonText = jsonMatch[1];
        } else {
            // Try to find JSON object in the response
            const objectMatch = responseText.match(/\{[\s\S]*\}/);
            if (objectMatch) {
                jsonText = objectMatch[0];
            }
        }

        // Parse and validate response
        const project = JSON.parse(jsonText);
        validateStarterProject(project);

        logger.info(`Successfully generated starter project: ${project.title}`);
        return project;
    } catch (error) {
        logger.error('Failed to generate starter project:', error);

        // Retry once with a stricter prompt
        try {
            logger.info('Retrying with stricter JSON prompt...');
            return await generateStarterProjectWithRetry(request);
        } catch (retryError) {
            logger.error('Retry also failed:', retryError);
            throw new Error(`Failed to generate starter project: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

/**
 * Retry generation with stricter JSON formatting instructions
 */
async function generateStarterProjectWithRetry(
    request: StarterProjectRequest
): Promise<StarterProject> {
    const { prompt, frameworkId } = request;

    const settings = readSettings();
    if (!settings.selectedModel) {
        throw new Error('No model selected in settings');
    }
    const { modelClient } = await getModelClient(settings.selectedModel, settings);
    const systemPrompt = buildSystemPrompt(frameworkId);

    const strictPrompt = `${systemPrompt}

CRITICAL: Your previous response was not valid JSON. This time:
1. Return ONLY the JSON object, nothing else
2. No markdown code blocks
3. No explanations before or after
4. Just the raw JSON object starting with { and ending with }`;

    const result = await generateText({
        model: modelClient.model,
        messages: [
            { role: 'system', content: strictPrompt },
            { role: 'user', content: prompt }
        ],
        temperature: 0.5, // Lower temperature for more deterministic output
        maxTokens: 2000,
    });

    const responseText = result.text.trim();
    const project = JSON.parse(responseText);
    validateStarterProject(project);

    return project;
}

/**
 * Edit an existing project based on a change request
 */
export async function editProject(
    request: EditProjectRequest
): Promise<Partial<StarterProject>> {
    const { project, changeRequest } = request;

    try {
        const settings = readSettings();
        if (!settings.selectedModel) {
            throw new Error('No model selected in settings');
        }
        const { modelClient } = await getModelClient(settings.selectedModel, settings);

        const systemPrompt = `You are editing a ${project.type} project for a kid.
Current project: ${JSON.stringify(project, null, 2)}

Return ONLY the fields that need to change in JSON format.
Keep the same structure as the original project.
Return ONLY valid JSON, no markdown, no explanations.`;

        const result = await generateText({
            model: modelClient.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: changeRequest }
            ],
            temperature: 0.7,
            maxTokens: 1500,
        });

        const responseText = result.text.trim();

        // Extract JSON from response
        let jsonText = responseText;
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
            jsonText = jsonMatch[1];
        } else {
            const objectMatch = responseText.match(/\{[\s\S]*\}/);
            if (objectMatch) {
                jsonText = objectMatch[0];
            }
        }

        return JSON.parse(jsonText);
    } catch (error) {
        logger.error('Failed to edit project:', error);
        throw new Error(`Failed to edit project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Build framework-specific system prompt
 */
function buildSystemPrompt(frameworkId: string): string {
    const basePrompt = `You are a kid-friendly coding assistant helping children learn programming.
Generate a starter project based on the user's prompt.

CRITICAL: Return ONLY valid JSON. No markdown code blocks, no explanations, just the JSON object.`;

    const frameworkPrompts = {
        'makecode-arcade': `
${basePrompt}

You're creating a MakeCode Arcade game (retro-style games with sprites).

OUTPUT FORMAT (JSON only):
{
  "title": "string (short, fun game name)",
  "type": "ARCADE",
  "explanationForKid": "string (explain what the game does in simple terms)",
  "stepsToTry": ["string (3-5 things they can try in the game)"],
  "payload": {
    "makecode": {
      "target": "arcade",
      "preferredLanguage": "typescript",
      "typescript": "string (complete TypeScript code using MakeCode Arcade APIs)",
      "notes": ["string (tips for the kid)"]
    }
  }
}

MakeCode Arcade APIs to use:
- game.splash("text") - show splash screen
- sprites.create(img\`...\`, SpriteKind.Player) - create sprite
- controller.moveSprite(sprite) - enable controller
- sprites.onOverlap(kind1, kind2, handler) - collision detection
- info.setScore(0) - initialize score
- info.changeScoreBy(1) - add to score
- game.onUpdate(() => {}) - game loop`,

        'microbit': `
${basePrompt}

You're creating a micro:bit project (LED display, buttons, sensors).

OUTPUT FORMAT (JSON only):
{
  "title": "string (short project name)",
  "type": "MICROBIT",
  "explanationForKid": "string (explain what it does)",
  "stepsToTry": ["string (3-5 things to try)"],
  "payload": {
    "makecode": {
      "target": "microbit",
      "preferredLanguage": "typescript",
      "typescript": "string (complete TypeScript code using micro:bit APIs)",
      "notes": ["string (tips)"]
    }
  }
}

micro:bit APIs to use:
- basic.showString("text") - show scrolling text
- basic.showIcon(IconNames.Heart) - show icon
- basic.showNumber(0) - show number
- input.onButtonPressed(Button.A, handler) - button event
- input.onGesture(Gesture.Shake, handler) - gesture event
- input.temperature() - read temperature
- led.plot(x, y) - turn on LED
- music.playTone(262, 500) - play sound`,

        'minecraft-makecode': `
${basePrompt}

You're creating a Minecraft mod in Java. Your output should be a complete, self-contained Java source file for a Minecraft mod (compatible with Forge or Fabric).

OUTPUT FORMAT (JSON only):
{
  "title": "string (short mod name)",
  "type": "MINECRAFT",
  "explanationForKid": "string (explain what it does)",
  "stepsToTry": ["string (3-5 things to try in Minecraft)"],
  "payload": {
    "minecraftMod": {
      "language": "java",
      "code": "string (complete Java source code)",
      "fileName": "string (e.g., MyMod.java)",
      "installationInstructions": "string (Detailed step-by-step instructions on how to install this mod in Minecraft)",
      "notes": ["string (tips, e.g. which command to use)"]
    }
  }
}

Example requirements:
- If asked for a chat command, use standard Minecraft command registration.
- Use clean, commented Java code.
- Ensure the mod includes a primary class with appropriate annotations if applicable.
- In installationInstructions, explain where to find the %appdata%/.minecraft folder and where to place the file.

${MINECRAFT_MOD_SYSTEM_PROMPT}
`,

        'blockly': `
${basePrompt}

You're creating a Blockly visual program (logic blocks).

OUTPUT FORMAT (JSON only):
{
  "title": "string (short program name)",
  "type": "BLOCKLY",
  "explanationForKid": "string (explain what it does)",
  "stepsToTry": ["string (3-5 things to try)"],
  "payload": {
    "blockly": {
      "workspaceJson": {
        "blocks": {
          "languageVersion": 0,
          "blocks": [
            {
              "type": "block_type",
              "id": "unique_id",
              "x": 50,
              "y": 50,
              "fields": {},
              "inputs": {},
              "next": {}
            }
          ]
        }
      },
      "generatedCode": {
        "language": "js",
        "code": "string (JavaScript equivalent)"
      },
      "variables": ["string (variable names used)"]
    }
  }
}

Common Blockly block types:
- text_print - print text
- math_number - number value
- math_arithmetic - math operation
- controls_repeat_ext - repeat loop
- controls_if - if condition
- logic_compare - comparison
- variables_set - set variable`
    };

    return frameworkPrompts[frameworkId as keyof typeof frameworkPrompts] || frameworkPrompts['blockly'];
}

/**
 * Validate starter project structure
 */
function validateStarterProject(project: any): void {
    if (!project.title || typeof project.title !== 'string') {
        throw new Error('Invalid project: missing or invalid title');
    }

    if (!['ARCADE', 'MICROBIT', 'MINECRAFT', 'BLOCKLY'].includes(project.type)) {
        throw new Error(`Invalid project type: ${project.type}`);
    }

    if (!project.explanationForKid || typeof project.explanationForKid !== 'string') {
        throw new Error('Invalid project: missing explanationForKid');
    }

    if (!Array.isArray(project.stepsToTry) || project.stepsToTry.length === 0) {
        throw new Error('Invalid project: stepsToTry must be a non-empty array');
    }

    if (!project.payload || typeof project.payload !== 'object') {
        throw new Error('Invalid project: missing payload');
    }

    // Validate framework-specific payload
    if (project.type === 'ARCADE' || project.type === 'MICROBIT') {
        if (!project.payload.makecode) {
            throw new Error('Invalid project: MakeCode projects must have makecode payload');
        }
    }

    if (project.type === 'MINECRAFT' && !project.payload.minecraftMod && !project.payload.makecode) {
        throw new Error('Invalid project: Minecraft projects must have minecraftMod or makecode payload');
    }

    if (project.type === 'BLOCKLY' && !project.payload.blockly) {
        throw new Error('Invalid project: Blockly projects must have blockly payload');
    }
}
