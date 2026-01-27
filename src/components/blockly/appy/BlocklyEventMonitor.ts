/**
 * Blockly Event Monitor
 * Monitors all workspace events and block changes
 */

import * as Blockly from 'blockly';

export interface BlocklyEventData {
    type: string;
    timestamp: number;
    blockId?: string;
    blockType?: string;
    blockCategory?: string;
    isFirstBlock?: boolean;
    workspaceState?: WorkspaceState;
}

export interface WorkspaceState {
    blockCount: number;
    blockTypes: string[];
    topBlocks: any[];
    hasLoops: boolean;
    hasLogic: boolean;
    hasMath: boolean;
    hasVariables: boolean;
}

export class BlocklyEventMonitor {
    private workspace: Blockly.WorkspaceSvg | null = null;
    private onEvent: ((event: BlocklyEventData) => void) | null = null;

    /**
     * Initialize event monitoring
     */
    initialize(workspace: Blockly.WorkspaceSvg, callback: (event: BlocklyEventData) => void) {
        this.workspace = workspace;
        this.onEvent = callback;

        workspace.addChangeListener((event: Blockly.Events.Abstract) => {
            this.handleEvent(event);
        });
    }

    /**
     * Handle Blockly events
     */
    private handleEvent(event: Blockly.Events.Abstract) {
        if (!this.workspace || !this.onEvent) return;

        const eventData: BlocklyEventData = {
            type: event.type,
            timestamp: Date.now(),
            workspaceState: this.getWorkspaceState()
        };

        // Extract event-specific data
        switch (event.type) {
            case Blockly.Events.BLOCK_CREATE:
                const createEvent = event as any;
                const createdBlock = this.workspace.getBlockById(createEvent.blockId);
                if (createdBlock) {
                    eventData.blockId = createEvent.blockId;
                    eventData.blockType = createdBlock.type;
                    eventData.blockCategory = this.getBlockCategory(createdBlock.type);
                    eventData.isFirstBlock = this.workspace.getAllBlocks(false).length === 1;
                }
                break;

            case Blockly.Events.BLOCK_DELETE:
                const deleteEvent = event as any;
                eventData.blockId = deleteEvent.blockId;
                break;

            case Blockly.Events.BLOCK_MOVE:
                const moveEvent = event as any;
                eventData.blockId = moveEvent.blockId;
                break;
        }

        this.onEvent(eventData);
    }

    /**
     * Get current workspace state
     */
    getWorkspaceState(): WorkspaceState {
        if (!this.workspace) {
            return {
                blockCount: 0,
                blockTypes: [],
                topBlocks: [],
                hasLoops: false,
                hasLogic: false,
                hasMath: false,
                hasVariables: false
            };
        }

        const blocks = this.workspace.getAllBlocks(false);
        const blockTypes = blocks.map(b => b.type);

        return {
            blockCount: blocks.length,
            blockTypes: [...new Set(blockTypes)],
            topBlocks: this.workspace.getTopBlocks(false),
            hasLoops: blockTypes.some(t => t.includes('repeat') || t.includes('while') || t.includes('for')),
            hasLogic: blockTypes.some(t => t.includes('if') || t.includes('logic')),
            hasMath: blockTypes.some(t => t.includes('math')),
            hasVariables: blockTypes.some(t => t.includes('variable'))
        };
    }

    /**
     * Get block category
     */
    private getBlockCategory(blockType: string): string {
        if (blockType.includes('logic') || blockType.includes('if')) return 'logic';
        if (blockType.includes('loop') || blockType.includes('repeat') || blockType.includes('while')) return 'loops';
        if (blockType.includes('math')) return 'math';
        if (blockType.includes('text')) return 'text';
        if (blockType.includes('variable')) return 'variables';
        return 'other';
    }

    /**
     * Get blocks by category
     */
    getBlocksByCategory(category: string): any[] {
        if (!this.workspace) return [];

        return this.workspace.getAllBlocks(false).filter(block => {
            const blockCategory = this.getBlockCategory(block.type);
            return blockCategory === category;
        });
    }
}
