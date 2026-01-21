/**
 * Simple Home Interface - MVP Version
 * 
 * Clean, straightforward interface that replaces the complex revolutionary interface
 * with a simple app type selector and chat input.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { homeChatInputValueAtom, isStreamingAtom } from '@/atoms/chatAtoms';
import { HomeChatInput } from '@/components/chat/HomeChatInput';
import { SimpleAppTypeSelector } from './SimpleAppTypeSelector';
import { ComingSoonCards } from './ComingSoonCards';
import { FeaturedGames } from './FeaturedGames';
import { YourDeployedApps } from './YourDeployedApps';
import { GodotGameCreationInput } from '@/components/godot/GodotGameCreationInput';
// 🚀 PERFORMANCE: Commented out for MVP - move to website as marketing content
// import { ComingSoonTiles } from './ComingSoonTiles';
import { IpcClient } from '@/ipc/ipc_client';
import { useSettings } from '@/hooks/useSettings';
import { useApplaaPro } from '@/hooks/useApplaaPro';
import { useNavigate } from '@tanstack/react-router';
import { Crown, Sparkles, Globe, Smartphone, RefreshCw, Lightbulb, ExternalLink, Gamepad2, Play } from 'lucide-react';
import { GODOT_GAMES_DATA, getEmojiForGame } from '@/data/godotGamesData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { AddGameTemplateDialog } from './AddGameTemplateDialog';
import { EditGameTemplateDialog } from './EditGameTemplateDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { showError, showSuccess } from '@/lib/toast';
import { useAdminPermission } from '@/hooks/useAdminPermission';

interface SimpleHomeInterfaceProps {
  onChatSubmit?: (options?: any) => Promise<void>;
}

type ExampleIdea = {
  title: string;
  description: string; // 2–3 lines max
  emoji: string;
  prompt: string; // full prompt to inject
  previewUrl?: string; // Optional preview URL
};

export function SimpleHomeInterface({ onChatSubmit }: SimpleHomeInterfaceProps) {
  const [inputValue, setInputValue] = useAtom(homeChatInputValueAtom);
  const isStreaming = useAtomValue(isStreamingAtom);
  const navigate = useNavigate();
  const [selectedAppType, setSelectedAppType] = useState<'web' | 'expo' | 'flutter' | 'godot' | null>(null);
  const { updateSettings } = useSettings();
  const { isPro, remainingFreeApps, isAtFreeLimit, userTier } = useApplaaPro();
  const [ideas, setIdeas] = useState<ExampleIdea[]>([]);
  const [visibleIdeasCount, setVisibleIdeasCount] = useState<number>(6);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddTemplateDialogOpen, setIsAddTemplateDialogOpen] = useState(false);
  const [isEditTemplateDialogOpen, setIsEditTemplateDialogOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<{ id: string; name: string; details: string; previewUrl?: string | null; imageUrl?: string | null; emoji?: string | null; appType: 'web' | 'expo' | 'flutter' | 'godot' } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);

  // Handle app type selection
  const handleAppTypeSelection = useCallback(async (type: 'web' | 'expo' | 'flutter' | 'godot') => {
    console.log('[SimpleHomeInterface] App type selected:', type);
    
    setSelectedAppType(type);

    // Update settings based on selection
    try {
      if (type === 'web') {
        await updateSettings({
          selectedPlatform: 'web',
          selectedTemplateId: 'react', // Default web template
        });
      } else if (type === 'expo') {
        await updateSettings({
          selectedPlatform: 'expo',
          selectedTemplateId: 'expo-base-master', // Default Expo template
        });
      } else if (type === 'flutter') {
        await updateSettings({
          selectedPlatform: 'flutter',
          selectedTemplateId: 'flutter-basic', // Default Flutter template
        });
      }

      console.log('[SimpleHomeInterface] Settings updated for:', type);
    } catch (error) {
      console.error('[SimpleHomeInterface] Failed to update settings:', error);
    }
  }, [updateSettings]);

  const ipcClient = IpcClient.getInstance();
  const queryClient = useQueryClient();
  const { hasPermission: hasAdminPermission } = useAdminPermission();

  // Fetch game templates from Supabase (for non-web app types)
  const { data: gameTemplates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['game-templates', selectedAppType],
    queryFn: async () => {
      if (!selectedAppType || selectedAppType === 'web') return [];
      try {
        const templates = await ipcClient.listGameTemplates({ appType: selectedAppType });
        return templates;
      } catch (error) {
        console.error('Error fetching game templates:', error);
        return [];
      }
    },
    enabled: !!selectedAppType && selectedAppType !== 'web',
  });

  // Fetch web apps templates from Supabase (for web app type)
  const { data: webAppsTemplates = [], isLoading: isLoadingWebApps } = useQuery({
    queryKey: ['web-apps', selectedAppType, selectedCategory],
    queryFn: async () => {
      if (selectedAppType !== 'web') return [];
      try {
        const templates = await ipcClient.listWebApps({ 
          appType: 'web',
          category: selectedCategory || undefined 
        });
        return templates;
      } catch (error) {
        console.error('Error fetching web apps templates:', error);
        return [];
      }
    },
    enabled: selectedAppType === 'web',
  });

  // Get unique categories from ALL web apps templates (not filtered by selectedCategory)
  // We need to fetch all templates first to get all categories
  const { data: allWebAppsTemplates = [] } = useQuery({
    queryKey: ['web-apps-all', 'web'],
    queryFn: async () => {
      if (selectedAppType !== 'web') return [];
      try {
        const templates = await ipcClient.listWebApps({ appType: 'web' });
        return templates;
      } catch (error) {
        console.error('Error fetching all web apps templates:', error);
        return [];
      }
    },
    enabled: selectedAppType === 'web',
  });

  // Get unique categories from ALL web apps templates
  const categories = useMemo(() => {
    if (selectedAppType !== 'web') return [];
    const allCategories = allWebAppsTemplates.map(t => t.category).filter(Boolean);
    return Array.from(new Set(allCategories)).sort();
  }, [allWebAppsTemplates, selectedAppType]);

  // Reset category filter when app type changes
  useEffect(() => {
    setSelectedCategory(null);
  }, [selectedAppType]);

  // Track previous values to detect actual changes
  const prevSelectedAppTypeRef = useRef(selectedAppType);
  const prevSelectedCategoryRef = useRef(selectedCategory);
  const prevWebAppsTemplatesLengthRef = useRef(webAppsTemplates.length);
  const prevGameTemplatesLengthRef = useRef(gameTemplates.length);

  // When app type changes, load ideas from Supabase or fallback to static
  useEffect(() => {
    if (!selectedAppType) return;

    // Check if app type or category actually changed
    const appTypeChanged = prevSelectedAppTypeRef.current !== selectedAppType;
    const categoryChanged = prevSelectedCategoryRef.current !== selectedCategory;
    const shouldResetCount = appTypeChanged || categoryChanged;

    // Update refs
    prevSelectedAppTypeRef.current = selectedAppType;
    prevSelectedCategoryRef.current = selectedCategory;

    // For web apps
    if (selectedAppType === 'web') {
      if (!isLoadingWebApps) {
        const templatesLengthChanged = prevWebAppsTemplatesLengthRef.current !== webAppsTemplates.length;
        prevWebAppsTemplatesLengthRef.current = webAppsTemplates.length;

        const newIdeas = webAppsTemplates.length > 0
          ? webAppsTemplates.map(template => {
              const firstSentence = template.details.split('.')[0] || template.name;
              const shortDesc = firstSentence.length > 100 
                ? firstSentence.substring(0, 97) + '...'
                : firstSentence;
              
              return {
                title: template.name,
                description: shortDesc + '\nClick to use the full detailed prompt.',
                emoji: template.emoji || '🌐',
                prompt: template.details,
                previewUrl: template.previewUrl || undefined,
              };
            })
          : getStaticIdeas(selectedAppType);
        
        // Only update if ideas actually changed
        setIdeas(prevIdeas => {
          const ideasChanged = JSON.stringify(prevIdeas) !== JSON.stringify(newIdeas);
          if (!ideasChanged) {
            return prevIdeas;
          }
          // Only reset count if ideas actually changed AND it's due to category/app type change
          // AND user hasn't manually changed the count
          if ((shouldResetCount || templatesLengthChanged) && !userManuallyChangedCountRef.current) {
            setVisibleIdeasCount(6);
          }
          // Reset the flag when ideas change due to category/app type change
          if (shouldResetCount || templatesLengthChanged) {
            userManuallyChangedCountRef.current = false;
          }
          return newIdeas;
        });
      }
    } else {
      // For non-web apps (game templates)
      if (!isLoadingTemplates) {
        const templatesLengthChanged = prevGameTemplatesLengthRef.current !== gameTemplates.length;
        prevGameTemplatesLengthRef.current = gameTemplates.length;

        const newIdeas = gameTemplates.length > 0
          ? gameTemplates.map(template => {
              const firstSentence = template.details.split('.')[0] || template.name;
              const shortDesc = firstSentence.length > 100 
                ? firstSentence.substring(0, 97) + '...'
                : firstSentence;
              
              return {
                title: template.name,
                description: shortDesc + '\nClick to use the full detailed prompt.',
                emoji: template.emoji || getEmojiForGame(template.name),
                prompt: template.details,
                previewUrl: template.previewUrl || undefined,
              };
            })
          : getStaticIdeas(selectedAppType);
        
        // Only update if ideas actually changed
        setIdeas(prevIdeas => {
          const ideasChanged = JSON.stringify(prevIdeas) !== JSON.stringify(newIdeas);
          if (!ideasChanged) {
            return prevIdeas;
          }
          // Only reset count if ideas actually changed AND it's due to app type change
          // AND user hasn't manually changed the count
          if ((shouldResetCount || templatesLengthChanged) && !userManuallyChangedCountRef.current) {
            setVisibleIdeasCount(6);
          }
          // Reset the flag when ideas change due to app type change
          if (shouldResetCount || templatesLengthChanged) {
            userManuallyChangedCountRef.current = false;
          }
          return newIdeas;
        });
      }
    }
  }, [selectedAppType, gameTemplates, webAppsTemplates, isLoadingTemplates, isLoadingWebApps, selectedCategory]);

  // Handle chat submission
  const handleChatSubmit = useCallback(async (options?: any) => {
    console.log('[SimpleHomeInterface] Chat submitted with type:', selectedAppType);
    
    if (!selectedAppType) {
      // If no app type selected, show a helpful message
      alert('Please select an app type first (Web or Mobile)');
      return;
    }

    if (onChatSubmit) {
      await onChatSubmit(options);
    }
  }, [onChatSubmit, selectedAppType]);

  // Reset selection
  const handleReset = useCallback(() => {
    setSelectedAppType(null);
  }, []);

  const handleShuffleIdeas = () => {
    if (!selectedAppType) return;
    // Shuffle the current ideas array
    const shuffled = [...ideas].sort(() => Math.random() - 0.5);
    setIdeas(shuffled);
    setVisibleIdeasCount(6); // Reset to 6 when shuffling
  };

  // Track if user manually changed the visible count
  const userManuallyChangedCountRef = useRef(false);

  const handleShowMore = () => {
    console.log('[SimpleHomeInterface] Show More clicked, current count:', visibleIdeasCount, 'total ideas:', ideas.length);
    userManuallyChangedCountRef.current = true;
    setVisibleIdeasCount(ideas.length); // Show all ideas
  };

  const handleShowLess = () => {
    console.log('[SimpleHomeInterface] Show Less clicked');
    userManuallyChangedCountRef.current = true;
    setVisibleIdeasCount(6); // Show only first 6
  };

  const handlePlayGame = (url: string) => {
    // Open game directly in a new tab instead of iframe modal
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Template management handlers
  const handleTemplateAdded = () => {
    // Invalidate both queries to refresh templates
    queryClient.invalidateQueries({ queryKey: ['game-templates', selectedAppType] });
    queryClient.invalidateQueries({ queryKey: ['web-apps', selectedAppType] });
  };

  const handleEditTemplate = (templateId: string) => {
    // Find template in the appropriate array based on app type
    const template = selectedAppType === 'web'
      ? webAppsTemplates.find(t => t.id === templateId)
      : gameTemplates.find(t => t.id === templateId);
    
    if (template) {
      setTemplateToEdit({
        id: template.id,
        name: template.name,
        details: template.details,
        previewUrl: template.previewUrl,
        imageUrl: template.imageUrl,
        emoji: template.emoji,
        appType: template.appType,
      });
      setIsEditTemplateDialogOpen(true);
    }
  };

  const handleTemplateUpdated = () => {
    // Invalidate both queries to refresh templates
    queryClient.invalidateQueries({ queryKey: ['game-templates', selectedAppType] });
    queryClient.invalidateQueries({ queryKey: ['web-apps', selectedAppType] });
    setIsEditTemplateDialogOpen(false);
    setTemplateToEdit(null);
  };

  const handleDeleteTemplate = (templateId: string, name: string) => {
    setTemplateToDelete({ id: templateId, name });
    setIsDeleteDialogOpen(true);
  };

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return ipcClient.deleteGameTemplate({ id });
    },
    onSuccess: () => {
      showSuccess('Template deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['game-templates', selectedAppType] });
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
    },
    onError: (error) => {
      showError(error as Error);
    },
  });

  const handleConfirmDelete = () => {
    if (templateToDelete) {
      deleteTemplateMutation.mutate(templateToDelete.id);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 relative">
      {/* Top Right Building Status Message - Show when input is disabled (streaming) */}
      {isStreaming && (
        <div className="fixed top-6 right-4 z-50 bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
          <span className="text-sm font-medium">App building in progress</span>
        </div>
      )}
      
      {/* Subtitle - Only show when no app type is selected */}
      {!selectedAppType && (
        <div className="text-center space-y-4 mb-8">
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Turn your ideas into real apps with Applaa
          </p>
          
          {/* Pro Status Indicator */}
          <div className="flex justify-center">
            {isPro ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full border border-purple-200 dark:border-purple-800">
                <Crown className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Applaa Pro • Unlimited Apps
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {isAtFreeLimit ? (
                    <>🚫 App limit reached • <button className="text-purple-600 hover:text-purple-700 underline" onClick={() => window.location.hash = '/settings/providers/auto'}>Upgrade to Pro</button></>
                  ) : (
                    <>{remainingFreeApps} apps remaining • <button className="text-purple-600 hover:text-purple-700 underline" onClick={() => window.location.hash = '/settings/providers/auto'}>Upgrade to Pro</button></>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* App Type Selection */}
      {!selectedAppType ? (
        <>
          <SimpleAppTypeSelector onSelection={handleAppTypeSelection} />
          
          {/* Your Deployed Apps */}
          <YourDeployedApps className="mt-12" />
          
          {/* Featured Games */}
          <FeaturedGames className="mt-12" />
          
          {/* Hub Link */}
          <div className="mt-8 text-center space-y-4">
            <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
              Check out awesome games and applications built by Applaa
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                onClick={() => navigate({ to: "/hub" })}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-lg rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Sparkles className="w-6 h-6" />
                Explore Hub
              </button>
              <button 
                onClick={() => navigate({ to: "/docs" })}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold text-lg rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Globe className="w-6 h-6" />
                Applaa Setup
              </button>
            </div>
          </div>
          
          {/* Coming Soon Cards */}
          <ComingSoonCards className="mt-12" />
          
          {/* 🚀 PERFORMANCE: Commented out for MVP - move to website as marketing content */}
          {/* <ComingSoonTiles /> */}
        </>
      ) : (
        <div className="space-y-8">
          {/* Prominent Selected Type Display */}
          <div className="text-center">
            <div className="max-w-xl mx-auto relative overflow-hidden rounded-lg p-2.5 border border-indigo-100 dark:border-indigo-800/50 bg-gradient-to-r from-indigo-50 to-transparent dark:from-indigo-900/10 dark:to-transparent">
              {/* Decorative gradient blob */}
              <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-400/15 blur-xl" />

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-md bg-white/70 dark:bg-gray-800/70 flex items-center justify-center shadow-sm">
                    {selectedAppType === 'web' ? (
                      <Globe className="h-4 w-4 text-emerald-600" />
                    ) : selectedAppType === 'godot' ? (
                      <Gamepad2 className="h-4 w-4 text-purple-600" />
                    ) : (
                      <Smartphone className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-600">Building a</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {selectedAppType === 'web' ? 'Web App' : selectedAppType === 'expo' ? 'Mobile App' : selectedAppType === 'flutter' ? 'Flutter Mobile App' : 'Applaa Game'}
                    </div>
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                        {selectedAppType === 'web' ? 'Framework: React (default)' : selectedAppType === 'expo' ? 'Mobile Apps' : selectedAppType === 'flutter' ? 'Framework: Flutter' : 'Engine: Applaa'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="h-7 px-3 bg-white/90 dark:bg-gray-800/80 hover:bg-white border border-gray-200 dark:border-gray-700 rounded-full text-[11px] font-medium shadow-sm transition-colors"
                >
                  Change Type
                </button>
              </div>
            </div>
          </div>

          {/* Chat Input */}
          <div className="max-w-4xl mx-auto">
            {/* <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                What do you want to build?
              </h2>
              <p className="text-lg text-gray-600">
                Describe your {selectedAppType === 'web' ? 'web app' : selectedAppType === 'godot' ? 'game' : 'mobile app'} and we'll create it for you
              </p>
            </div> */}
            
            {selectedAppType === 'godot' ? (
              <GodotGameCreationInput
                onGameCreated={() => {
                  setSelectedAppType(null);
                  setInputValue('');
                }}
                initialDescription={inputValue}
              />
            ) : (
              <HomeChatInput
                onSubmit={handleChatSubmit}
                placeholder={`Describe your ${selectedAppType === 'web' ? 'web app' : 'mobile app'}... (e.g., "A todo app with dark mode and sync")`}
                showPlatformSelector={false}
                showSparkSelector={true}
                appType={selectedAppType}
              />
            )}
          </div>

          {/* Your Deployed Apps - Filtered by selected app type */}
          <YourDeployedApps className="mt-12" filterByAppType={selectedAppType} maxApps={3} />

          {/* Inspiration Ideas - Game Templates */}
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3 px-0.5">
              <div className="flex items-center gap-2 text-gray-600">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Choose from 1000's of templates</span>
              </div>
              <div className="flex items-center gap-2">
                {hasAdminPermission && (
                  <button
                    onClick={() => setIsAddTemplateDialogOpen(true)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs border border-gray-300 hover:bg-gray-50 transition-colors"
                    title="Add new template"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Template
                  </button>
                )}
                <button
                  onClick={handleShuffleIdeas}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Shuffle ideas
                </button>
              </div>
            </div>
            
            {/* Category Filter Pills - Only show for web apps */}
            {selectedAppType === 'web' && categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4 px-0.5">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                    selectedCategory === null
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" key={`ideas-grid-${visibleIdeasCount}`}>
              {ideas.slice(0, visibleIdeasCount).map((idea, index) => {
                // Find the template ID from gameTemplates or webAppsTemplates
                const template = selectedAppType === 'web' 
                  ? webAppsTemplates.find(t => t.name === idea.title && t.details === idea.prompt)
                  : gameTemplates.find(t => t.name === idea.title && t.details === idea.prompt);
                const canEdit = hasAdminPermission && template && !template.isDefault;
                
                return (
                  <div
                    key={`${idea.title}-${index}`}
                    className="p-4 text-left bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl text-sm transition-all flex items-start gap-3 shadow-sm relative group"
                  >
                    <span className="text-xl leading-none pt-0.5 flex-shrink-0">{idea.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => {
                          setInputValue(idea.prompt);
                          // For Godot, the component will pick up the value via initialDescription prop
                        }}
                        className="w-full text-left"
                      >
                        <div className="font-medium text-gray-900 mb-1">{idea.title}</div>
                        <p className="text-gray-600 text-[13px] leading-relaxed mb-2 whitespace-pre-line">
                          {idea.description}
                        </p>
                      </button>
                    </div>
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1">
                      {canEdit && (
                        <>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (template) {
                                handleEditTemplate(template.id);
                              }
                            }}
                            className="h-7 w-7 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 shadow-sm flex items-center justify-center cursor-pointer"
                            title="Edit template"
                            type="button"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (template) {
                                handleDeleteTemplate(template.id, template.name);
                              }
                            }}
                            className="h-7 w-7 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 shadow-sm flex items-center justify-center cursor-pointer"
                            title="Delete template"
                            type="button"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                          </button>
                        </>
                      )}
                      {idea.previewUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayGame(idea.previewUrl!);
                          }}
                          className="h-7 px-2 rounded-full bg-green-600 dark:bg-green-500 flex items-center justify-center gap-1 shadow-sm hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                          title="Preview Game"
                        >
                          <Play className="h-3 w-3 text-white fill-white" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {ideas.length > 6 && (
              <div className="flex justify-center mt-4" onClick={(e) => e.stopPropagation()}>
                {visibleIdeasCount < ideas.length ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[SimpleHomeInterface] Show More button clicked, ideas.length:', ideas.length);
                      handleShowMore();
                    }}
                    className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md text-xs font-medium border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700 cursor-pointer"
                  >
                    Show More ({ideas.length - visibleIdeasCount} more)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[SimpleHomeInterface] Show Less button clicked');
                      handleShowLess();
                    }}
                    className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md text-xs font-medium border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700 cursor-pointer"
                  >
                    Show Less
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Add Template Dialog */}
      {selectedAppType && (
        <AddGameTemplateDialog
          open={isAddTemplateDialogOpen}
          onOpenChange={setIsAddTemplateDialogOpen}
          appType={selectedAppType}
          onTemplateAdded={handleTemplateAdded}
        />
      )}

      {/* Edit Template Dialog */}
      {templateToEdit && (
        <EditGameTemplateDialog
          open={isEditTemplateDialogOpen}
          onOpenChange={setIsEditTemplateDialogOpen}
          template={templateToEdit}
          onTemplateUpdated={handleTemplateUpdated}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the template "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteTemplateMutation.isPending}
            >
              {deleteTemplateMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}



// PERFORMANCE: Simple static ideas (like Dyad) - no complex generation
function getStaticIdeas(type: 'web' | 'expo' | 'flutter' | 'godot'): ExampleIdea[] {
  if (type === 'web') {
    return [
      {
        title: "Todo App",
        description: "A simple todo list with add, edit, delete functionality.\nClean interface with local storage.",
        emoji: "✅",
        prompt: "Create a todo app with add, edit, delete, and mark complete functionality. Use React with clean, modern UI and local storage."
      },
      {
        title: "Weather Dashboard", 
        description: "Display current weather and 5-day forecast.\nLocation-based with search functionality.",
        emoji: "🌤️",
        prompt: "Build a weather dashboard that shows current weather and 5-day forecast. Include location search and clean, responsive design."
      },
      {
        title: "Blog Platform",
        description: "Simple blog with posts, categories, and search.\nMarkdown support and responsive design.",
        emoji: "📝",
        prompt: "Create a blog platform with post creation, categories, search functionality, and markdown support. Modern, clean design."
      },
      {
        title: "Calculator",
        description: "Scientific calculator with history.\nKeyboard support and responsive layout.",
        emoji: "🧮",
        prompt: "Build a scientific calculator with calculation history, keyboard support, and responsive design. Include basic and advanced operations."
      },
      {
        title: "Chat App",
        description: "Real-time messaging interface.\nMessage history and clean chat UI.",
        emoji: "💬",
        prompt: "Create a chat application interface with message history, real-time messaging simulation, and modern chat UI design."
      },
      {
        title: "Portfolio Site",
        description: "Personal portfolio with projects showcase.\nContact form and responsive design.",
        emoji: "🎨",
        prompt: "Build a personal portfolio website with projects showcase, about section, contact form, and fully responsive design."
      }
    ];
  } else if (type === 'expo') {
    return [
      {
        title: "Task Manager",
        description: "Mobile task management with categories.\nSwipe gestures and notifications.",
        emoji: "📱",
        prompt: "Create a mobile task manager app with categories, swipe gestures, local notifications, and clean mobile UI using Expo."
      },
      {
        title: "Expense Tracker",
        description: "Track expenses with categories and charts.\nCamera receipt scanning simulation.",
        emoji: "💰",
        prompt: "Build an expense tracking app with categories, spending charts, receipt photo capture, and budget tracking using Expo."
      },
      {
        title: "Fitness Tracker",
        description: "Workout logging and progress tracking.\nTimer and exercise database.",
        emoji: "🏃",
        prompt: "Create a fitness tracking app with workout logging, progress charts, exercise timer, and workout history using Expo."
      },
      {
        title: "Recipe App",
        description: "Recipe collection with search and favorites.\nStep-by-step cooking mode.",
        emoji: "🍳",
        prompt: "Build a recipe app with search functionality, favorites, step-by-step cooking mode, and ingredient lists using Expo."
      },
      {
        title: "Note Taking",
        description: "Simple note app with categories.\nSearch and offline storage.",
        emoji: "📓",
        prompt: "Create a note-taking app with categories, search functionality, offline storage, and clean mobile interface using Expo."
      },
      {
        title: "Music Player",
        description: "Audio player with playlists.\nBackground playback and controls.",
        emoji: "🎵",
        prompt: "Build a music player app with playlist management, background playback, audio controls, and modern UI using Expo."
      }
    ];
  } else if (type === 'flutter') {
    return [
      {
        title: "Shopping List",
        description: "Grocery shopping with categories.\nShare lists and check-off items.",
        emoji: "🛒",
        prompt: "Create a shopping list app with categories, item check-off, list sharing, and clean Flutter UI with material design."
      },
      {
        title: "Habit Tracker",
        description: "Daily habit tracking with streaks.\nProgress visualization and reminders.",
        emoji: "🎯",
        prompt: "Build a habit tracking app with daily check-ins, streak counting, progress charts, and reminder notifications using Flutter."
      },
      {
        title: "Photo Gallery",
        description: "Image gallery with albums.\nPhoto editing and sharing features.",
        emoji: "📸",
        prompt: "Create a photo gallery app with album organization, basic photo editing, sharing functionality, and smooth Flutter animations."
      },
      {
        title: "Language Learning",
        description: "Vocabulary practice with flashcards.\nProgress tracking and spaced repetition.",
        emoji: "🗣️",
        prompt: "Build a language learning app with flashcards, spaced repetition, progress tracking, and interactive quizzes using Flutter."
      },
      {
        title: "Budget Planner",
        description: "Monthly budget planning with categories.\nExpense tracking and savings goals.",
        emoji: "📊",
        prompt: "Create a budget planning app with monthly budgets, expense categories, savings goals, and financial charts using Flutter."
      },
      {
        title: "Meditation Timer",
        description: "Guided meditation with timers.\nProgress tracking and ambient sounds.",
        emoji: "🧘",
        prompt: "Build a meditation timer app with guided sessions, ambient sounds, progress tracking, and calming Flutter UI design."
      }
    ];
  } else { // godot
    // Convert CSV games to ExampleIdea format with exact prompts
    const csvGames: ExampleIdea[] = GODOT_GAMES_DATA.map(game => {
      // Extract a short description from the first sentence of details, or use game name
      const firstSentence = game.details.split('.')[0] || game.name;
      const shortDesc = firstSentence.length > 100 
        ? firstSentence.substring(0, 97) + '...'
        : firstSentence;
      
      return {
        title: game.name,
        description: shortDesc + '\nClick to use the full detailed prompt.',
        emoji: getEmojiForGame(game.name),
        prompt: game.details, // Use exact prompt from CSV
        previewUrl: game.previewUrl // Include preview URL if available
      };
    });

    return csvGames;
  }
}
