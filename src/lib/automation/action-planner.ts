import { GoogleGenerativeAI } from '@google/generative-ai';
import { PageContext } from './context-manager';
import { BrowserAction } from './action-executor';
import log from 'electron-log';
import { readSettings } from '../../main/settings';

const logger = log.scope('action-planner');

export class ActionPlanner {
    private genAI: GoogleGenerativeAI | null = null;
    private model: any = null;

    async initialize() {
        try {
            // Get Gemini API key from settings
            const settings = readSettings();
            const geminiProvider = settings.providerSettings?.google;
            const apiKey = geminiProvider?.apiKey?.value;

            if (!apiKey) {
                throw new Error('Gemini API key not found in settings');
            }

            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

            logger.info('✅ ActionPlanner initialized with Gemini');
        } catch (error) {
            logger.error('Failed to initialize ActionPlanner:', error);
            throw error;
        }
    }

    async planActions(command: string, context: PageContext): Promise<BrowserAction[]> {
        if (!this.model) {
            throw new Error('ActionPlanner not initialized');
        }

        try {
            const prompt = this.buildPrompt(command, context);
            logger.info('Sending command to Gemini:', command);

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            logger.info('Gemini response:', text);

            // Parse JSON response
            const actions = this.parseActions(text);
            logger.info('Parsed actions:', actions);

            return actions;
        } catch (error) {
            logger.error('Failed to plan actions:', error);
            throw error;
        }
    }

    private buildPrompt(command: string, context: PageContext): string {
        return `You are a browser automation assistant. Analyze the current page and generate a sequence of actions to execute this command:

**User Command**: "${command}"

**Current Page State**:
- URL: ${context.url}
- Title: ${context.title}
- Visible Interactive Elements:
${context.simplifiedDOM}

**Available Actions**:
1. navigate - Go to a URL: { "action": "navigate", "url": "https://example.com" }
2. click - Click an element: { "action": "click", "selector": "button.search" }
3. type - Type text into input: { "action": "type", "selector": "input[name='q']", "text": "search query" }
4. wait - Wait for element: { "action": "wait", "selector": ".results" }
5. scroll - Scroll page: { "action": "scroll", "direction": "down" }

**Instructions**:
- Generate a JSON array of actions to complete the command
- Use CSS selectors that are likely to work (prefer id, name, type, or simple class names)
- Be specific and practical
- If the command requires navigation, start with a navigate action
- Return ONLY valid JSON, no explanations

**Example Response**:
[
  { "action": "navigate", "url": "https://youtube.com" },
  { "action": "wait", "selector": "input[name='search_query']" },
  { "action": "type", "selector": "input[name='search_query']", "text": "telugu recipes" },
  { "action": "click", "selector": "button#search-icon-legacy" }
]

Generate the action sequence now:`;
    }

    private parseActions(text: string): BrowserAction[] {
        try {
            // Extract JSON from response (handle markdown code blocks)
            let jsonText = text.trim();

            // Remove markdown code blocks if present
            if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            }

            // Find JSON array
            const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('No JSON array found in response');
            }

            const actions = JSON.parse(jsonMatch[0]);

            if (!Array.isArray(actions)) {
                throw new Error('Response is not an array');
            }

            return actions as BrowserAction[];
        } catch (error) {
            logger.error('Failed to parse actions from Gemini response:', error);
            logger.error('Raw response:', text);
            throw new Error('Failed to parse AI response. Please try again.');
        }
    }
}

export const actionPlanner = new ActionPlanner();
