/**
 * Applaa UI Knowledge Registry
 * 
 * This file serves as Appy's "Long Term Memory" of the application interface.
 * It maps UI selectors to knowledge that Appy can use to explain functionality.
 */

export interface UiElementKnowledge {
    name: string;
    purpose: string;
    explanation_kid: string;
    related_action?: string;
}

export interface ModuleKnowledge {
    elements: Record<string, UiElementKnowledge>;
}

export const APPLAA_KNOWLEDGE_BASE: Record<string, ModuleKnowledge> = {
    "blocklaa": {
        "elements": {
            ".blocklyToolboxDiv": {
                "name": "Block Palette",
                "purpose": "Container for all available coding blocks",
                "explanation_kid": "This is your paint palette! 🎨 Pick blocks from here to build your world."
            },
            ".blocklyWorkspace": {
                "name": "Workspace",
                "purpose": "Canvas where code is built",
                "explanation_kid": "This is your canvas! Drag blocks here to make magic happen. ✨"
            },
            ".run-button": { // Hypothetical class, will ensure usage
                "name": "Run Button",
                "purpose": "Executes the current code",
                "explanation_kid": "Ready, Set, GO! 🚀 Click this to run your code."
            },
            ".trash-can": { // Hypothetical class
                "name": "Trash",
                "purpose": "Deletes blocks",
                "explanation_kid": "Hungry for blocks! 🗑️ Drag mistakes here to delete them."
            },
            ".chat-interface": {
                "name": "Appy Chat",
                "purpose": "Chat interface for AI assistance",
                "explanation_kid": "That's me! Type here if you need my help building something. 🤖"
            }
        }
    }
};

export const getKnowledgeForElement = (module: string, selector: string): UiElementKnowledge | null => {
    const mod = APPLAA_KNOWLEDGE_BASE[module];
    if (!mod) return null;
    return mod.elements[selector] || null;
};
