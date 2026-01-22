/**
 * Hook to load and manage Minecraft Bedrock templates
 * Parses template files from the minecraft-bedrock-templates folder
 */

import { useState, useEffect, useMemo } from 'react';
import { IpcClient } from '@/ipc/ipc_client';

export interface MinecraftTemplate {
    id: string;
    name: string;
    category: string;
    fileName: string;
    filePath: string;
    icon: string;
    description: string;
}

export interface TemplateCategory {
    id: string;
    name: string;
    icon: string;
    count: number;
}

// Category definitions
const CATEGORIES: Record<string, { name: string; icon: string; pattern: RegExp }> = {
    watchtower: { name: '🗼 Watchtower', icon: '🗼', pattern: /_watchtower_/i },
    cottage: { name: '🏡 Cottage', icon: '🏡', pattern: /_cottage_/i },
    market_stall: { name: '🛒 Market Stall', icon: '🛒', pattern: /_market_stall_/i },
    statue: { name: '🗿 Statue', icon: '🗿', pattern: /_statue_/i },
    garden_plot: { name: '🌿 Garden', icon: '🌿', pattern: /_garden_plot_/i },
    bridge: { name: '🌉 Bridge', icon: '🌉', pattern: /_bridge_/i },
    boat: { name: '⛵ Boat', icon: '⛵', pattern: /_boat_/i },
    camp: { name: '🏕️ Camp', icon: '🏕️', pattern: /_camp_/i },
    shrine: { name: '🕯️ Shrine', icon: '🕯️', pattern: /_shrine_/i },
    starter: { name: '🎯 Starter', icon: '🎯', pattern: /^(hello_world|quick_shelter)/i },
};

function categorizeTemplate(fileName: string): string {
    for (const [categoryId, { pattern }] of Object.entries(CATEGORIES)) {
        if (pattern.test(fileName)) {
            return categoryId;
        }
    }
    return 'other';
}

function extractTemplateName(fileName: string): string {
    // Remove file extension and number prefix
    let name = fileName.replace('.mcfunction', '');
    // Remove number prefix like "001_"
    name = name.replace(/^\d+_/, '');
    // Convert underscores to spaces and capitalize
    name = name.replace(/_/g, ' ');
    return name.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

export function useMinecraftTemplates() {
    const [templates, setTemplates] = useState<MinecraftTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setIsLoading(true);
            const ipcClient = IpcClient.getInstance();

            // Get templates from "more templates" folder
            const moreTemplatesPath = 'minecraft-bedrock-templates/more templates';
            const starterPath = 'minecraft-bedrock-templates/starter';

            // Read directory contents
            const moreFiles = await ipcClient.listTemplateFiles({ path: moreTemplatesPath }).catch(() => []);
            const starterFiles = await ipcClient.listTemplateFiles({ path: starterPath }).catch(() => []);

            const allTemplates: MinecraftTemplate[] = [];

            // Process "more templates" files
            if (Array.isArray(moreFiles)) {
                for (const file of moreFiles) {
                    if (file.endsWith('.mcfunction')) {
                        const category = categorizeTemplate(file);
                        const catInfo = CATEGORIES[category] || { name: 'Other', icon: '📦' };

                        allTemplates.push({
                            id: file.replace('.mcfunction', ''),
                            name: extractTemplateName(file),
                            category,
                            fileName: file,
                            filePath: `${moreTemplatesPath}/${file}`,
                            icon: catInfo.icon,
                            description: `${catInfo.name} build template`,
                        });
                    }
                }
            }

            // Process starter files
            if (Array.isArray(starterFiles)) {
                for (const file of starterFiles) {
                    if (file.endsWith('.mcfunction')) {
                        allTemplates.push({
                            id: file.replace('.mcfunction', ''),
                            name: extractTemplateName(file),
                            category: 'starter',
                            fileName: file,
                            filePath: `${starterPath}/${file}`,
                            icon: '🎯',
                            description: 'Beginner-friendly starter template',
                        });
                    }
                }
            }

            setTemplates(allTemplates);
            setError(null);
        } catch (err) {
            console.error('Failed to load templates:', err);
            setError('Failed to load templates');

            // Fallback: generate templates from known patterns
            const fallbackTemplates = generateFallbackTemplates();
            setTemplates(fallbackTemplates);
        } finally {
            setIsLoading(false);
        }
    };

    // Fallback template generation if IPC fails
    const generateFallbackTemplates = (): MinecraftTemplate[] => {
        const templates: MinecraftTemplate[] = [];
        const basePath = 'minecraft-bedrock-templates/more templates';

        // Generate 500 templates based on known patterns
        for (let i = 1; i <= 500; i++) {
            const num = String(i).padStart(3, '0');
            const types = ['watchtower', 'cottage', 'market_stall', 'statue', 'garden_plot', 'bridge', 'boat', 'camp', 'shrine'];
            const type = types[(i - 1) % types.length];
            const fileName = `${num}_${type}_${i}.mcfunction`;
            const catInfo = CATEGORIES[type];

            templates.push({
                id: `${num}_${type}_${i}`,
                name: `${catInfo.name.split(' ')[1] || type} ${i}`,
                category: type,
                fileName,
                filePath: `${basePath}/${fileName}`,
                icon: catInfo.icon,
                description: `${catInfo.name} build template`,
            });
        }

        return templates;
    };

    // Compute categories with counts
    const categories = useMemo((): TemplateCategory[] => {
        const counts: Record<string, number> = {};

        for (const template of templates) {
            counts[template.category] = (counts[template.category] || 0) + 1;
        }

        return Object.entries(CATEGORIES).map(([id, { name, icon }]) => ({
            id,
            name,
            icon,
            count: counts[id] || 0,
        })).filter(cat => cat.count > 0);
    }, [templates]);

    // Filter templates by category
    const filteredTemplates = useMemo(() => {
        if (selectedCategory === 'all') {
            return templates;
        }
        return templates.filter(t => t.category === selectedCategory);
    }, [templates, selectedCategory]);

    return {
        templates: filteredTemplates,
        allTemplates: templates,
        categories,
        isLoading,
        error,
        selectedCategory,
        setSelectedCategory,
        totalCount: templates.length,
        refresh: loadTemplates,
    };
}
