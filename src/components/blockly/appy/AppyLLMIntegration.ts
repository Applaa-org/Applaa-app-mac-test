/**
 * Appy LLM Integration
 * Makes Appy understand user goals and provide step-by-step guidance
 */

import { generateText } from 'ai';
import { getModelClient } from '../../../lib/llm-orchestrator';
import { readSettings } from '../../../main/settings';
import type { WorkspaceState } from './BlocklyEventMonitor';

export interface AppyResponse {
    message: string;
    emotion: 'happy' | 'excited' | 'thinking' | 'explaining' | 'celebrating' | 'encouraging';
    action: 'walk_to' | 'point_at' | 'click' | 'demonstrate' | 'none';
    target: string | null; // Element ID or position
    nextSteps?: string[]; // Suggested next steps
    blocksNeeded?: string[]; // Blocks user should use
}

export interface UserGoal {
    description: string; // e.g., "prime number checker"
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    blocksNeeded: string[];
    steps: string[];
}

const APPY_SYSTEM_PROMPT = `You are Appy, a friendly AI coding teacher for kids aged 6-12 learning block-based programming in Blocklaa.

You are like a Code Ninjas teacher - patient, encouraging, and step-by-step.

Your role:
- Understand what program the kid wants to build (e.g., "prime number checker")
- Break it down into simple steps
- Tell them exactly which blocks to use
- Guide them through connecting blocks
- Celebrate their progress
- Help fix mistakes

Communication style:
- Use VERY short sentences (5-10 words)
- Include emojis 🎉
- Be super encouraging
- Avoid technical words
- Use kid-friendly analogies

When responding, ALWAYS include:
- EMOTION: [happy/excited/thinking/explaining/celebrating/encouraging]
- ACTION: [walk_to/point_at/click/demonstrate/none]
- TARGET: [element_id like 'category-loops' or 'run-button']
- BLOCKS_NEEDED: [list of block types needed]
- NEXT_STEPS: [what to do next]

Example response for "prime number":
"Let's build a prime number checker! 🎯
First, we need a loop block! 🔄
EMOTION: excited
ACTION: walk_to
TARGET: category-loops
BLOCKS_NEEDED: controls_repeat, logic_compare, math_modulo
NEXT_STEPS: 1. Get a repeat block, 2. Add an if block inside, 3. Use math to check divisibility"`;

export class AppyLLMIntegration {
    private systemPrompt = APPY_SYSTEM_PROMPT;

    /**
     * Understand what the user wants to build
     */
    async understandGoal(userInput: string, workspaceState: WorkspaceState): Promise<UserGoal> {
        const settings = readSettings();
        const modelClient = getModelClient(settings);

        const prompt = `The kid wants to build: "${userInput}"
        
Current workspace:
- Blocks: ${workspaceState.blockCount}
- Has loops: ${workspaceState.hasLoops}
- Has logic: ${workspaceState.hasLogic}
- Has math: ${workspaceState.hasMath}

Break this down into:
1. What blocks they need
2. Step-by-step instructions (3-5 steps max)
3. Difficulty level

Format as JSON:
{
  "description": "short description",
  "difficulty": "beginner/intermediate/advanced",
  "blocksNeeded": ["block1", "block2"],
  "steps": ["step 1", "step 2"]
}`;

        const { text } = await generateText({
            model: modelClient,
            system: this.systemPrompt,
            prompt,
            maxTokens: 300
        });

        // Parse JSON response
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error('Failed to parse goal:', e);
        }

        // Fallback
        return {
            description: userInput,
            difficulty: 'beginner',
            blocksNeeded: [],
            steps: ['Let me help you build this! 🎯']
        };
    }

    /**
     * Provide step-by-step guidance
     */
    async provideGuidance(
        userGoal: UserGoal,
        workspaceState: WorkspaceState,
        currentStep: number
    ): Promise<AppyResponse> {
        const settings = readSettings();
        const modelClient = getModelClient(settings);

        const prompt = `User wants to build: ${userGoal.description}
        
Current step: ${currentStep + 1} of ${userGoal.steps.length}
Step instruction: ${userGoal.steps[currentStep]}

Workspace state:
- Blocks: ${workspaceState.blockCount}
- Block types: ${workspaceState.blockTypes.join(', ')}

Guide them on this specific step. Be VERY specific about which block to use and where to find it.`;

        const { text } = await generateText({
            model: modelClient,
            system: this.systemPrompt,
            prompt,
            maxTokens: 150
        });

        return this.parseResponse(text);
    }

    /**
     * Answer user questions
     */
    async answerQuestion(
        question: string,
        workspaceState: WorkspaceState
    ): Promise<AppyResponse> {
        const settings = readSettings();
        const modelClient = getModelClient(settings);

        const contextPrompt = `Workspace state:
- Blocks: ${workspaceState.blockCount}
- Has loops: ${workspaceState.hasLoops}
- Has logic: ${workspaceState.hasLogic}
- Has math: ${workspaceState.hasMath}
- Block types: ${workspaceState.blockTypes.join(', ')}

User question: ${question}

Answer in a kid-friendly way!`;

        const { text } = await generateText({
            model: modelClient,
            system: this.systemPrompt,
            prompt: contextPrompt,
            maxTokens: 150
        });

        return this.parseResponse(text);
    }

    /**
     * React to block additions
     */
    async reactToBlock(
        blockType: string,
        blockCategory: string,
        workspaceState: WorkspaceState,
        userGoal?: UserGoal
    ): Promise<AppyResponse> {
        const settings = readSettings();
        const modelClient = getModelClient(settings);

        let prompt = `User just added a ${blockType} block (${blockCategory} category).

Workspace: ${workspaceState.blockCount} blocks total.`;

        if (userGoal) {
            prompt += `\n\nThey're trying to build: ${userGoal.description}
Blocks needed: ${userGoal.blocksNeeded.join(', ')}`;
        }

        prompt += '\n\nReact to this! Encourage them or guide next step.';

        const { text } = await generateText({
            model: modelClient,
            system: this.systemPrompt,
            prompt,
            maxTokens: 100
        });

        return this.parseResponse(text);
    }

    /**
     * Parse LLM response
     */
    private parseResponse(text: string): AppyResponse {
        // Extract metadata
        const emotionMatch = text.match(/EMOTION:\s*(\w+)/i);
        const actionMatch = text.match(/ACTION:\s*([\w_]+)/i);
        const targetMatch = text.match(/TARGET:\s*([\w-]+)/i);
        const blocksMatch = text.match(/BLOCKS_NEEDED:\s*\[(.*?)\]/i);
        const stepsMatch = text.match(/NEXT_STEPS:\s*(.*?)(?=\n\n|$)/is);

        // Remove metadata from message
        const message = text
            .replace(/EMOTION:.*\n?/gi, '')
            .replace(/ACTION:.*\n?/gi, '')
            .replace(/TARGET:.*\n?/gi, '')
            .replace(/BLOCKS_NEEDED:.*\n?/gi, '')
            .replace(/NEXT_STEPS:.*$/is, '')
            .trim();

        // Parse blocks needed
        let blocksNeeded: string[] = [];
        if (blocksMatch) {
            blocksNeeded = blocksMatch[1]
                .split(',')
                .map(b => b.trim())
                .filter(b => b.length > 0);
        }

        // Parse next steps
        let nextSteps: string[] = [];
        if (stepsMatch) {
            nextSteps = stepsMatch[1]
                .split(/\d+\./)
                .map(s => s.trim())
                .filter(s => s.length > 0);
        }

        return {
            message,
            emotion: (emotionMatch?.[1] as any) || 'happy',
            action: (actionMatch?.[1] as any) || 'none',
            target: targetMatch?.[1] || null,
            blocksNeeded: blocksNeeded.length > 0 ? blocksNeeded : undefined,
            nextSteps: nextSteps.length > 0 ? nextSteps : undefined
        };
    }
}
