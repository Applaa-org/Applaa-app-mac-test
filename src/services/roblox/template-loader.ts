/**
 * Roblox Template Loader Service
 * 
 * Manages loading, searching, and retrieving Roblox templates.
 */

import log from 'electron-log';
import type {
    RobloxTemplate,
    TemplateCategory,
    TemplateDifficulty,
    GameType,
    TemplateSearchOptions,
    TemplateRegistry
} from './template-metadata';
import { scriptTemplates } from './templates/scripts';
import { gameTemplates } from './templates/games';
import { npcTemplates } from './templates/npcs';
import { uiTemplates } from './templates/ui';
import { monetizationTemplates } from './templates/monetization';
import { educationalTemplates } from './templates/educational';

const logger = log.scope('roblox-template-loader');

class RobloxTemplateLoader {
    private registry: TemplateRegistry;
    private initialized = false;

    constructor() {
        this.registry = {
            templates: new Map(),
            byCategory: new Map(),
            byDifficulty: new Map(),
            byGameType: new Map()
        };
    }

    /**
     * Initialize the template registry
     */
    initialize(): void {
        if (this.initialized) {
            logger.warn('Template loader already initialized');
            return;
        }

        logger.info('Initializing Roblox template loader...');

        try {
            // Load all template categories
            this.loadTemplates(scriptTemplates);
            this.loadTemplates(gameTemplates);
            this.loadTemplates(npcTemplates);
            this.loadTemplates(uiTemplates);
            this.loadTemplates(monetizationTemplates);
            this.loadTemplates(educationalTemplates);

            this.initialized = true;
            logger.info(`✅ Loaded ${this.registry.templates.size} Roblox templates`);
        } catch (error) {
            logger.error('Failed to initialize template loader:', error);
            throw error;
        }
    }

    /**
     * Load templates into the registry
     */
    private loadTemplates(templates: RobloxTemplate[]): void {
        for (const template of templates) {
            const id = template.metadata.id;

            // Add to main registry
            this.registry.templates.set(id, template);

            // Index by category
            const category = template.metadata.category;
            if (!this.registry.byCategory.has(category)) {
                this.registry.byCategory.set(category, []);
            }
            this.registry.byCategory.get(category)!.push(id);

            // Index by difficulty
            const difficulty = template.metadata.difficulty;
            if (!this.registry.byDifficulty.has(difficulty)) {
                this.registry.byDifficulty.set(difficulty, []);
            }
            this.registry.byDifficulty.get(difficulty)!.push(id);

            // Index by game type (if applicable)
            if (template.metadata.gameType) {
                const gameType = template.metadata.gameType;
                if (!this.registry.byGameType.has(gameType)) {
                    this.registry.byGameType.set(gameType, []);
                }
                this.registry.byGameType.get(gameType)!.push(id);
            }
        }
    }

    /**
     * Get a template by ID
     */
    getTemplate(id: string): RobloxTemplate | null {
        if (!this.initialized) {
            this.initialize();
        }

        return this.registry.templates.get(id) || null;
    }

    /**
     * Get all templates
     */
    getAllTemplates(): RobloxTemplate[] {
        if (!this.initialized) {
            this.initialize();
        }

        return Array.from(this.registry.templates.values());
    }

    /**
     * Search templates with filters
     */
    searchTemplates(options: TemplateSearchOptions = {}): RobloxTemplate[] {
        if (!this.initialized) {
            this.initialize();
        }

        let results = this.getAllTemplates();

        // Filter by category
        if (options.category) {
            const categoryIds = this.registry.byCategory.get(options.category) || [];
            results = results.filter(t => categoryIds.includes(t.metadata.id));
        }

        // Filter by difficulty
        if (options.difficulty) {
            const difficultyIds = this.registry.byDifficulty.get(options.difficulty) || [];
            results = results.filter(t => difficultyIds.includes(t.metadata.id));
        }

        // Filter by game type
        if (options.gameType) {
            const gameTypeIds = this.registry.byGameType.get(options.gameType) || [];
            results = results.filter(t => gameTypeIds.includes(t.metadata.id));
        }

        // Filter by tags
        if (options.tags && options.tags.length > 0) {
            results = results.filter(t =>
                options.tags!.some(tag => t.metadata.tags.includes(tag))
            );
        }

        // Text search
        if (options.searchText) {
            const searchLower = options.searchText.toLowerCase();
            results = results.filter(t =>
                t.metadata.name.toLowerCase().includes(searchLower) ||
                t.metadata.description.toLowerCase().includes(searchLower) ||
                t.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
            );
        }

        return results;
    }

    /**
     * Get templates by category
     */
    getTemplatesByCategory(category: TemplateCategory): RobloxTemplate[] {
        return this.searchTemplates({ category });
    }

    /**
     * Get templates by difficulty
     */
    getTemplatesByDifficulty(difficulty: TemplateDifficulty): RobloxTemplate[] {
        return this.searchTemplates({ difficulty });
    }

    /**
     * Get templates by game type
     */
    getTemplatesByGameType(gameType: GameType): RobloxTemplate[] {
        return this.searchTemplates({ gameType });
    }

    /**
     * Get all categories with template counts
     */
    getCategoryCounts(): Map<TemplateCategory, number> {
        if (!this.initialized) {
            this.initialize();
        }

        const counts = new Map<TemplateCategory, number>();
        for (const [category, ids] of this.registry.byCategory.entries()) {
            counts.set(category, ids.length);
        }
        return counts;
    }

    /**
     * Get featured templates (e.g., for homepage)
     */
    getFeaturedTemplates(limit: number = 6): RobloxTemplate[] {
        if (!this.initialized) {
            this.initialize();
        }

        // Return a mix of popular templates from different categories
        const featured: RobloxTemplate[] = [];
        const categories: TemplateCategory[] = ['games', 'scripts', 'npcs', 'ui', 'monetization', 'educational'];

        for (const category of categories) {
            const templates = this.getTemplatesByCategory(category);
            if (templates.length > 0) {
                featured.push(templates[0]); // Take first template from each category
            }
            if (featured.length >= limit) break;
        }

        return featured.slice(0, limit);
    }
}

// Singleton instance
let templateLoaderInstance: RobloxTemplateLoader | null = null;

/**
 * Get the singleton template loader instance
 */
export function getTemplateLoader(): RobloxTemplateLoader {
    if (!templateLoaderInstance) {
        templateLoaderInstance = new RobloxTemplateLoader();
    }
    return templateLoaderInstance;
}

/**
 * Load a template by ID (convenience function)
 */
export function loadTemplate(id: string): RobloxTemplate | null {
    return getTemplateLoader().getTemplate(id);
}

/**
 * Search templates (convenience function)
 */
export function searchTemplates(options: TemplateSearchOptions = {}): RobloxTemplate[] {
    return getTemplateLoader().searchTemplates(options);
}
