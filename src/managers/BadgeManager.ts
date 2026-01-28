import { CelebrationManager } from './CelebrationManager';

export interface Badge {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
    unlockedAt?: number;
}

export const BADGES: Badge[] = [
    {
        id: 'first_steps',
        title: 'First Steps',
        description: 'Drag your first block to the workspace.',
        icon: '🦶',
        unlocked: false
    },
    {
        id: 'bug_hunter',
        title: 'Bug Hunter',
        description: 'Fix a mistake in your code.',
        icon: '🐞',
        unlocked: false
    },
    {
        id: 'loop_master',
        title: 'Loop Master',
        description: 'Use a repeat loop block.',
        icon: '🔄',
        unlocked: false
    },
    {
        id: 'story_teller',
        title: 'Story Teller',
        description: 'Create a story with 3+ characters.',
        icon: '📖',
        unlocked: false
    },
    {
        id: 'game_dev',
        title: 'Game Dev',
        description: 'Create a sprite for a game.',
        icon: '🎮',
        unlocked: false
    },
    {
        id: 'musician',
        title: 'Maestro',
        description: 'Play a song with 5+ notes.',
        icon: '🎹',
        unlocked: false
    }
];

/**
 * Badge Manager 🏅
 * Handles unlocking, storage, and retrieval of user badges.
 */
export class BadgeManager {
    static getBadges(): Badge[] {
        if (typeof window === 'undefined') return BADGES;

        const saved = localStorage.getItem('applaa_badges');
        if (saved) {
            return JSON.parse(saved);
        }
        return BADGES;
    }

    static unlockBadge(badgeId: string) {
        if (typeof window === 'undefined') return;

        const badges = this.getBadges();
        const badgeIndex = badges.findIndex(b => b.id === badgeId);

        if (badgeIndex !== -1 && !badges[badgeIndex].unlocked) {
            // Unlock it!
            badges[badgeIndex].unlocked = true;
            badges[badgeIndex].unlockedAt = Date.now();

            // Save
            localStorage.setItem('applaa_badges', JSON.stringify(badges));

            // Notify User
            this.showBadgeNotification(badges[badgeIndex]);

            // Celebration
            CelebrationManager.celebrateLevelUp();
        }
    }

    static showBadgeNotification(badge: Badge) {
        // Dispatch custom event for UI to pick up
        const event = new CustomEvent('badge-unlocked', { detail: badge });
        window.dispatchEvent(event);
        console.log(`🏅 Unlocked Badge: ${badge.title}`);
    }

    // Reset for testing
    static resetBadges() {
        localStorage.removeItem('applaa_badges');
        window.location.reload();
    }
}
