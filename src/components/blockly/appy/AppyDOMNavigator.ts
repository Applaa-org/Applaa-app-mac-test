/**
 * Appy DOM Navigator
 * Knows all UI elements in Blocklaa and their functionality
 */

export interface UIElement {
    id: string;
    type: 'button' | 'panel' | 'workspace' | 'category' | 'block';
    selector: string;
    position: { x: number; y: number }; // Percentage of screen
    functionality: string;
    helpText: string;
    canAutomate: boolean;
}

// Complete map of Blocklaa UI elements
export const BLOCKLAA_DOM_MAP: UIElement[] = [
    // Toolbar buttons
    {
        id: 'run-button',
        type: 'button',
        selector: 'button[title*="Run"], button:has(.play-icon)',
        position: { x: 50, y: 8 },
        functionality: 'Executes the block code',
        helpText: 'Click this to run your code! 🚀',
        canAutomate: true
    },
    {
        id: 'stop-button',
        type: 'button',
        selector: 'button[title*="Stop"]',
        position: { x: 55, y: 8 },
        functionality: 'Stops code execution',
        helpText: 'Click this to stop your code! ⏹️',
        canAutomate: true
    },
    {
        id: 'clear-button',
        type: 'button',
        selector: 'button[title*="Clear"]',
        position: { x: 60, y: 8 },
        functionality: 'Clears the workspace',
        helpText: 'This removes all blocks! 🗑️',
        canAutomate: true
    },

    // Main areas
    {
        id: 'toolbox',
        type: 'panel',
        selector: '.blocklyToolboxDiv',
        position: { x: 12, y: 50 },
        functionality: 'Contains all available blocks',
        helpText: 'All your coding blocks are here! Drag them to the workspace! 🧩',
        canAutomate: false
    },
    {
        id: 'workspace',
        type: 'workspace',
        selector: '.blocklyWorkspace',
        position: { x: 55, y: 50 },
        functionality: 'Area where blocks are assembled',
        helpText: 'This is where you build your code! Snap blocks together! ✨',
        canAutomate: false
    },
    {
        id: 'trash',
        type: 'button',
        selector: '.blocklyTrash',
        position: { x: 90, y: 85 },
        functionality: 'Deletes blocks',
        helpText: 'Drag blocks here to delete them! 🗑️',
        canAutomate: false
    },

    // Block categories
    {
        id: 'category-logic',
        type: 'category',
        selector: '[data-id="catLogic"]',
        position: { x: 12, y: 20 },
        functionality: 'Logic blocks (if/then)',
        helpText: 'Logic blocks help you make decisions! 🤔',
        canAutomate: true
    },
    {
        id: 'category-loops',
        type: 'category',
        selector: '[data-id="catLoops"]',
        position: { x: 12, y: 28 },
        functionality: 'Loop blocks (repeat)',
        helpText: 'Loop blocks repeat actions! 🔄',
        canAutomate: true
    },
    {
        id: 'category-math',
        type: 'category',
        selector: '[data-id="catMath"]',
        position: { x: 12, y: 36 },
        functionality: 'Math blocks',
        helpText: 'Math blocks do calculations! ➕➖✖️➗',
        canAutomate: true
    },
    {
        id: 'category-text',
        type: 'category',
        selector: '[data-id="catText"]',
        position: { x: 12, y: 44 },
        functionality: 'Text blocks',
        helpText: 'Text blocks work with words! 📝',
        canAutomate: true
    },
    {
        id: 'category-variables',
        type: 'category',
        selector: '[data-id="catVariables"]',
        position: { x: 12, y: 52 },
        functionality: 'Variable blocks',
        helpText: 'Variables store information! 📦',
        canAutomate: true
    },
];

export class AppyDOMNavigator {
    private domMap: UIElement[] = BLOCKLAA_DOM_MAP;

    /**
     * Get element info by ID
     */
    getElement(id: string): UIElement | null {
        return this.domMap.find(el => el.id === id) || null;
    }

    /**
     * Get actual DOM element
     */
    getDOMElement(id: string): HTMLElement | null {
        const element = this.getElement(id);
        if (!element) return null;

        return document.querySelector(element.selector);
    }

    /**
     * Check if element is visible
     */
    isVisible(id: string): boolean {
        const domEl = this.getDOMElement(id);
        if (!domEl) return false;

        const rect = domEl.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && domEl.offsetParent !== null;
    }

    /**
     * Get element's actual screen position
     */
    getActualPosition(id: string): { x: number; y: number } | null {
        const domEl = this.getDOMElement(id);
        if (!domEl) return null;

        const rect = domEl.getBoundingClientRect();
        return {
            x: ((rect.left + rect.width / 2) / window.innerWidth) * 100,
            y: ((rect.top + rect.height / 2) / window.innerHeight) * 100
        };
    }

    /**
     * Get all visible elements
     */
    getVisibleElements(): UIElement[] {
        return this.domMap.filter(el => this.isVisible(el.id));
    }

    /**
     * Find nearest element to a position
     */
    getNearestElement(pos: { x: number; y: number }, type?: string): UIElement | null {
        let nearest: UIElement | null = null;
        let minDist = Infinity;

        for (const element of this.domMap) {
            if (type && element.type !== type) continue;
            if (!this.isVisible(element.id)) continue;

            const actualPos = this.getActualPosition(element.id);
            if (!actualPos) continue;

            const dist = Math.sqrt(
                Math.pow(actualPos.x - pos.x, 2) +
                Math.pow(actualPos.y - pos.y, 2)
            );

            if (dist < minDist) {
                minDist = dist;
                nearest = element;
            }
        }

        return nearest;
    }
    /**
     * Find element by keyword matching
     */
    findElementByKeyword(userInput: string): UIElement | null {
        const lowerInput = userInput.toLowerCase();

        // Exact ID match check first (e.g. "trash")
        const idMatch = this.domMap.find(el => lowerInput.includes(el.id));
        if (idMatch) return idMatch;

        // Keyword mapping
        // This allows natural language mapping to specific IDs
        const keywordMap: Record<string, string[]> = {
            'run-button': ['run', 'play', 'start', 'execute', 'go'],
            'stop-button': ['stop', 'halt', 'pause', 'break'],
            'clear-button': ['clear', 'empty', 'reset', 'wipe'],
            'trash': ['trash', 'garbage', 'bin', 'recycle', 'delete', 'remove'],
            'toolbox': ['tool', 'menu', 'sidebar', 'blocks', 'drawer'],
            'workspace': ['work', 'canvas', 'area', 'space', 'main'],

            // Cateogries
            'category-logic': ['logic', 'if', 'condition', 'boolean'],
            'category-loops': ['loop', 'repeat', 'while', 'for'],
            'category-math': ['math', 'number', 'calculate', 'count'],
            'category-text': ['text', 'string', 'word', 'letter'],
            'category-variables': ['variable', 'store', 'data', 'memory']
        };

        for (const [elementId, keywords] of Object.entries(keywordMap)) {
            if (keywords.some(k => lowerInput.includes(k))) {
                return this.getElement(elementId);
            }
        }

        return null;
    }

}
