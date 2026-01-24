/**
 * Roblox Template Selector Component
 * 
 * UI component for browsing and selecting Roblox templates.
 */

import React, { useState, useEffect } from 'react';
import { Search, Filter, Star, Clock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TemplateCategory, TemplateDifficulty, RobloxTemplate } from '@/services/roblox/template-metadata';

interface RobloxTemplateSelectorProps {
    onSelectTemplate: (templateId: string) => void;
    onClose: () => void;
}

export const RobloxTemplateSelector: React.FC<RobloxTemplateSelectorProps> = ({ onSelectTemplate, onClose }) => {
    const [templates, setTemplates] = useState<RobloxTemplate[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<RobloxTemplate[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
    const [selectedDifficulty, setSelectedDifficulty] = useState<TemplateDifficulty | 'all'>('all');
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(true);

    // Load templates
    useEffect(() => {
        loadTemplates();
    }, []);

    // Filter templates
    useEffect(() => {
        filterTemplates();
    }, [templates, selectedCategory, selectedDifficulty, searchText]);

    const loadTemplates = async () => {
        try {
            // In a real implementation, this would call an IPC handler
            // For now, we'll use a placeholder
            const mockTemplates: RobloxTemplate[] = [];
            setTemplates(mockTemplates);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load templates:', error);
            setLoading(false);
        }
    };

    const filterTemplates = () => {
        let filtered = templates;

        // Filter by category
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(t => t.metadata.category === selectedCategory);
        }

        // Filter by difficulty
        if (selectedDifficulty !== 'all') {
            filtered = filtered.filter(t => t.metadata.difficulty === selectedDifficulty);
        }

        // Filter by search text
        if (searchText) {
            const search = searchText.toLowerCase();
            filtered = filtered.filter(t =>
                t.metadata.name.toLowerCase().includes(search) ||
                t.metadata.description.toLowerCase().includes(search) ||
                t.metadata.tags.some(tag => tag.toLowerCase().includes(search))
            );
        }

        setFilteredTemplates(filtered);
    };

    const getDifficultyColor = (difficulty: TemplateDifficulty) => {
        switch (difficulty) {
            case 'beginner': return 'bg-green-500';
            case 'intermediate': return 'bg-yellow-500';
            case 'advanced': return 'bg-orange-500';
            case 'expert': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getCategoryIcon = (category: TemplateCategory) => {
        // Return appropriate icon based on category
        return '📦';
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[90vw] h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">Roblox Templates</h2>
                        <Button variant="ghost" onClick={onClose}>✕</Button>
                    </div>

                    {/* Search and Filters */}
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Search templates..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <select
                            value={selectedDifficulty}
                            onChange={(e) => setSelectedDifficulty(e.target.value as TemplateDifficulty | 'all')}
                            className="px-4 py-2 border rounded-md"
                        >
                            <option value="all">All Difficulties</option>
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                            <option value="expert">Expert</option>
                        </select>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as TemplateCategory | 'all')} className="h-full flex flex-col">
                        <TabsList className="px-6 pt-4">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="scripts">Scripts</TabsTrigger>
                            <TabsTrigger value="games">Games</TabsTrigger>
                            <TabsTrigger value="npcs">NPCs</TabsTrigger>
                            <TabsTrigger value="ui">UI/UX</TabsTrigger>
                            <TabsTrigger value="monetization">Monetization</TabsTrigger>
                            <TabsTrigger value="educational">Educational</TabsTrigger>
                        </TabsList>

                        <TabsContent value={selectedCategory} className="flex-1 overflow-y-auto p-6">
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-gray-500">Loading templates...</div>
                                </div>
                            ) : filteredTemplates.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-gray-500">No templates found</div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredTemplates.map((template) => (
                                        <Card
                                            key={template.metadata.id}
                                            className="cursor-pointer hover:shadow-lg transition-shadow"
                                            onClick={() => onSelectTemplate(template.metadata.id)}
                                        >
                                            <CardHeader>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <CardTitle className="text-lg">{template.metadata.name}</CardTitle>
                                                        <CardDescription className="mt-1 line-clamp-2">
                                                            {template.metadata.description}
                                                        </CardDescription>
                                                    </div>
                                                    <div className={`w-2 h-2 rounded-full ${getDifficultyColor(template.metadata.difficulty)}`} />
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {template.metadata.tags.slice(0, 3).map((tag) => (
                                                        <Badge key={tag} variant="secondary" className="text-xs">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{template.metadata.estimatedTime || 15} min</span>
                                                    </div>
                                                    <div className="capitalize">{template.metadata.difficulty}</div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
};
