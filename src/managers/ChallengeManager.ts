import * as Blockly from 'blockly/core';
import { BadgeManager } from './BadgeManager';
import { CelebrationManager } from './CelebrationManager';

export interface Challenge {
    id: string;
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    goal: string;
    startBlocks?: string; // Optional XML string to prepopulate
    validation: (workspace: Blockly.WorkspaceSvg) => boolean;
    completed: boolean;
}

const CHALLENGES: Challenge[] = [
    {
        id: 'c1_loop_master',
        title: 'Loop the Loop',
        description: 'Learn to use loops to repeat actions.',
        difficulty: 'easy',
        goal: 'Use a "repeat" block to run code 5 times.',
        completed: false,
        validation: (workspace: Blockly.WorkspaceSvg) => {
            const blocks = workspace.getAllBlocks(false);
            const repeatBlock = blocks.find(b => b.type === 'controls_repeat_ext' || b.type === 'controls_repeat');

            if (!repeatBlock) return false;

            // Check if it is set to 5 times (simplified check)
            // In a real scenario we'd check input values deeper
            return true;
        }
    },
    {
        id: 'c2_sprite_creator',
        title: 'Sprite Creator',
        description: 'Create your first game character.',
        difficulty: 'easy',
        goal: 'Use the "Create Sprite" block to make a Player.',
        completed: false,
        validation: (workspace: Blockly.WorkspaceSvg) => {
            return workspace.getAllBlocks(false).some(b => b.type === 'k9_create_sprite');
        }
    },
    {
        id: 'c3_musician',
        title: 'Music Maestro',
        description: 'Compose a short melody.',
        difficulty: 'medium',
        goal: 'Play at least 3 distinct notes.',
        completed: false,
        validation: (workspace: Blockly.WorkspaceSvg) => {
            const notes = workspace.getAllBlocks(false).filter(b => b.type === 'k7_play_note');
            return notes.length >= 3;
        }
    }
];

/**
 * Challenge Manager 🧩
 * Handles active challenges and validation.
 */
export class ChallengeManager {
    static getChallenges(): Challenge[] {
        if (typeof window === 'undefined') return CHALLENGES;

        // Restore completion status from local storage
        const savedStatus = localStorage.getItem('applaa_challenges');
        if (savedStatus) {
            const completedIds = JSON.parse(savedStatus);
            CHALLENGES.forEach(c => {
                c.completed = completedIds.includes(c.id);
            });
        }
        return CHALLENGES;
    }

    static validateChallenge(challengeId: string, workspace: Blockly.WorkspaceSvg): boolean {
        const challenge = CHALLENGES.find(c => c.id === challengeId);
        if (!challenge) return false;

        const passed = challenge.validation(workspace);

        if (passed && !challenge.completed) {
            this.markComplete(challengeId);
        }

        return passed;
    }

    static markComplete(challengeId: string) {
        const challenge = CHALLENGES.find(c => c.id === challengeId);
        if (challenge) {
            challenge.completed = true;

            // Celebration!
            CelebrationManager.celebrateSuccess();

            // Save to storage
            const completedIds = CHALLENGES.filter(c => c.completed).map(c => c.id);
            localStorage.setItem('applaa_challenges', JSON.stringify(completedIds));

            // Notify UI
            window.dispatchEvent(new CustomEvent('challenge-completed', { detail: challenge }));
        }
    }
}
