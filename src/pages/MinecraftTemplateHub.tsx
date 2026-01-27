/**
 * Minecraft Template Hub Page
 * 
 * A beautiful category browser for 500+ Minecraft Bedrock templates
 * User selects template → Creates app → Auto-opens 3D preview
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMinecraftTemplates, MinecraftTemplate, TemplateCategory } from '@/hooks/useMinecraftTemplates';
import { IpcClient } from '@/ipc/ipc_client';
import { showSuccess, showError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Search, Grid3X3, List, Sparkles, Box } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSetAtom } from 'jotai';
import { isPreviewOpenAtom } from '@/atoms/viewAtoms';
import { previewModeAtom, selectedAppIdAtom } from '@/atoms/appAtoms';

// Category navigation component
function CategoryNav({
    categories,
    selected,
    onSelect,
    totalCount
}: {
    categories: TemplateCategory[];
    selected: string;
    onSelect: (id: string) => void;
    totalCount: number;
}) {
    return (
        <div className="w-64 shrink-0 bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl p-4 border border-gray-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Box className="w-5 h-5 text-emerald-400" />
                Categories
            </h3>

            {/* All templates */}
            <button
                onClick={() => onSelect('all')}
                className={cn(
                    "w-full text-left px-4 py-3 rounded-xl mb-2 transition-all duration-200",
                    "flex items-center justify-between",
                    selected === 'all'
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                        : "bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
            >
                <span className="flex items-center gap-2">
                    <span>🎮</span>
                    <span>All Templates</span>
                </span>
                <span className="text-sm opacity-70">{totalCount}</span>
            </button>

            <div className="h-px bg-gray-700 my-3" />

            {/* Category buttons */}
            <div className="space-y-1">
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => onSelect(cat.id)}
                        className={cn(
                            "w-full text-left px-4 py-2.5 rounded-lg transition-all duration-200",
                            "flex items-center justify-between text-sm",
                            selected === cat.id
                                ? "bg-emerald-600 text-white"
                                : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                        )}
                    >
                        <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.name.split(' ').slice(1).join(' ')}</span>
                        </span>
                        <span className="text-xs opacity-60">{cat.count}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// Template card component
function TemplateCard({
    template,
    onSelect,
    isLoading
}: {
    template: MinecraftTemplate;
    onSelect: (template: MinecraftTemplate) => void;
    isLoading: boolean;
}) {
    return (
        <div
            className={cn(
                "group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700",
                "hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300",
                "cursor-pointer"
            )}
            onClick={() => !isLoading && onSelect(template)}
        >
            {/* Icon & Category Badge */}
            <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl shadow-lg">
                    {template.icon}
                </div>
                <span className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded-full">
                    {template.category}
                </span>
            </div>

            {/* Name */}
            <h4 className="font-semibold text-white group-hover:text-emerald-300 transition-colors mb-1">
                {template.name}
            </h4>

            {/* Description */}
            <p className="text-sm text-gray-400 mb-3">
                {template.description}
            </p>

            {/* Use Button */}
            <div className="flex items-center justify-between mt-auto">
                <span className="text-xs text-gray-500">{template.fileName}</span>
                <Button
                    size="sm"
                    variant="ghost"
                    className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white"
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Use Template"}
                </Button>
            </div>
        </div>
    );
}

export default function MinecraftTemplateHub() {
    const navigate = useNavigate();
    const {
        templates,
        categories,
        isLoading: templatesLoading,
        error,
        selectedCategory,
        setSelectedCategory,
        totalCount,
    } = useMinecraftTemplates();

    const [searchQuery, setSearchQuery] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Atoms for auto-opening preview
    const setIsPreviewOpen = useSetAtom(isPreviewOpenAtom);
    const setPreviewMode = useSetAtom(previewModeAtom);
    const setSelectedAppId = useSetAtom(selectedAppIdAtom);

    // Filter by search
    const filteredTemplates = searchQuery
        ? templates.filter(t =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : templates;

    const handleSelectTemplate = useCallback(async (template: MinecraftTemplate) => {
        try {
            setIsCreating(true);
            setCreatingTemplateId(template.id);

            const ipcClient = IpcClient.getInstance();

            // 1. Create app with minecraft type
            const result = await ipcClient.createApp({
                name: template.name,
                appType: 'minecraft',
                framework: 'minecraft' as any,
            });

            const appId = result.app.id;
            const chatId = result.chatId;

            // 2. Read all template files (mcfunction, manifest, tick)
            const templateDir = template.filePath.replace(/\.mcfunction$/, '');
            const templateBaseName = template.filePath.split('/').pop()?.replace('.mcfunction', '') || '';

            // Read .mcfunction file
            const mcfunctionContent = await ipcClient.readTemplateFile({
                path: template.filePath,
            });

            // Read manifest.json (generated by migration script)
            let manifestContent = null;
            try {
                const manifestPath = `${templateDir}_manifest.json`;
                const manifestStr = await ipcClient.readTemplateFile({ path: manifestPath });
                manifestContent = JSON.parse(manifestStr);
            } catch (e) {
                console.warn('[MinecraftTemplateHub] No manifest found, will use default');
            }

            // Read tick.json (generated by migration script)
            let tickContent = null;
            try {
                const tickPath = `${templateDir}_tick.json`;
                const tickStr = await ipcClient.readTemplateFile({ path: tickPath });
                tickContent = JSON.parse(tickStr);
            } catch (e) {
                console.warn('[MinecraftTemplateHub] No tick found, will use default');
            }

            // 3. Write ALL 3 files to behavior pack
            const mainPath = 'behavior_pack/functions/main.mcfunction';
            const manifestPath = 'behavior_pack/manifest.json';
            const tickPath = 'behavior_pack/functions/tick.json';

            // Write main.mcfunction
            await ipcClient.writeFile({
                appId,
                filePath: mainPath,
                content: mcfunctionContent,
            });

            // Write manifest.json
            if (manifestContent) {
                await ipcClient.writeFile({
                    appId,
                    filePath: manifestPath,
                    content: JSON.stringify(manifestContent, null, 2),
                });
            }

            // Write tick.json
            if (tickContent) {
                await ipcClient.writeFile({
                    appId,
                    filePath: tickPath,
                    content: JSON.stringify(tickContent, null, 2),
                });
            }

            // 4. Parse template to extract features for chat card
            const lines = mcfunctionContent.split('\n');
            const entities = lines
                .filter(line => line.trim().startsWith('summon'))
                .map(line => {
                    const parts = line.trim().split(/\s+/);
                    return parts[1] || 'entity';
                });

            showSuccess(`Created "${template.name}" - Loading 3D preview...`);

            // 5. Set app ID and auto-open preview
            setSelectedAppId(appId);
            setPreviewMode('preview');
            setIsPreviewOpen(true);

            // 6. Store template metadata for chat
            const templateMetadata = {
                name: template.name,
                features: {
                    structure: template.description,
                    entities: entities.length > 0 ? entities : undefined,
                    size: template.category === 'watchtower' ? 'Tall structure' : undefined,
                }
            };
            localStorage.setItem('template-metadata', JSON.stringify(templateMetadata));

            // 7. Navigate to chat with template context
            console.log(`[MinecraftTemplateHub] Navigating to chat with chatId: ${chatId}, appId: ${appId}`);
            navigate({
                to: '/chat',
                search: {
                    id: chatId,
                    fromTemplate: 'true',
                    templateName: template.name
                } as any
            });

        } catch (err) {
            console.error('Failed to create app from template:', err);
            showError(`Failed to create app: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsCreating(false);
            setCreatingTemplateId(null);
        }
    }, [navigate, setSelectedAppId, setPreviewMode, setIsPreviewOpen]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={() => navigate({ to: '/' })}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>

                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <span className="text-4xl">⛏️</span>
                                Minecraft Template Hub
                            </h1>
                            <p className="text-gray-400 mt-1">
                                500+ ready-to-use builds • Select a template to start creating
                            </p>
                        </div>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-2 rounded-md transition-colors",
                                viewMode === 'grid' ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"
                            )}
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "p-2 rounded-md transition-colors",
                                viewMode === 'list' ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"
                            )}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                        placeholder="Search templates by name or category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 py-6 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 rounded-xl focus:border-emerald-500"
                    />
                </div>

                {/* Main Content */}
                <div className="flex gap-6">
                    {/* Category Sidebar */}
                    <CategoryNav
                        categories={categories}
                        selected={selectedCategory}
                        onSelect={setSelectedCategory}
                        totalCount={totalCount}
                    />

                    {/* Template Grid */}
                    <div className="flex-1">
                        {templatesLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                                <span className="ml-3 text-gray-400">Loading templates...</span>
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <p className="text-red-400">{error}</p>
                            </div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-400">No templates found</p>
                            </div>
                        ) : (
                            <div className={cn(
                                "gap-4",
                                viewMode === 'grid'
                                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                                    : "flex flex-col"
                            )}>
                                {filteredTemplates.slice(0, 50).map((template) => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onSelect={handleSelectTemplate}
                                        isLoading={isCreating && creatingTemplateId === template.id}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Show more indicator */}
                        {filteredTemplates.length > 50 && (
                            <div className="text-center mt-6 text-gray-400">
                                Showing 50 of {filteredTemplates.length} templates. Use search to find more.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
