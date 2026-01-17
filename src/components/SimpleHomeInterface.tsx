/**
 * Simple Home Interface - MVP Version
 * 
 * Clean, straightforward interface that replaces the complex revolutionary interface
 * with a simple app type selector and chat input.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useAtom } from 'jotai';
import { homeChatInputValueAtom } from '@/atoms/chatAtoms';
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
import { Crown, Sparkles, Globe, Smartphone, RefreshCw, Lightbulb, ExternalLink, Gamepad2, Play, Cpu, Box } from 'lucide-react';
import { GODOT_GAMES_DATA, getEmojiForGame } from '@/data/godotGamesData';
import { ALL_TEMPLATES as MINECRAFT_TEMPLATES, getRandomTemplates as getRandomMinecraftTemplates } from '@/lib/minecraft/minecraft-direct-templates';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { AddGameTemplateDialog } from './AddGameTemplateDialog';
import { EditGameTemplateDialog } from './EditGameTemplateDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { showError, showSuccess } from '@/lib/toast';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { AppNamingDialog } from './AppNamingDialog';

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
  const navigate = useNavigate();
  const [selectedAppType, setSelectedAppType] = useState<'web' | 'expo' | 'flutter' | 'godot' | 'arcade' | 'microbit' | 'minecraft' | 'blockly' | null>(null);
  const { updateSettings } = useSettings();
  const { isPro, remainingFreeApps, isAtFreeLimit } = useApplaaPro();
  const [ideas, setIdeas] = useState<ExampleIdea[]>([]);
  const [visibleIdeasCount, setVisibleIdeasCount] = useState<number>(6);
  const [selectedGameUrl, setSelectedGameUrl] = useState<string | null>(null);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [isAddTemplateDialogOpen, setIsAddTemplateDialogOpen] = useState(false);
  const [isEditTemplateDialogOpen, setIsEditTemplateDialogOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<{ id: string; name: string; details: string; previewUrl?: string | null; imageUrl?: string | null; emoji?: string | null; appType: 'web' | 'expo' | 'flutter' | 'godot' | 'arcade' | 'microbit' | 'minecraft' | 'blockly' } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);

  // Minecraft template naming dialog state
  const [isMinecraftNamingDialogOpen, setIsMinecraftNamingDialogOpen] = useState(false);
  const [pendingMinecraftTemplate, setPendingMinecraftTemplate] = useState<ExampleIdea | null>(null);

  // Handle app type selection
  const handleAppTypeSelection = useCallback(async (type: 'web' | 'expo' | 'flutter' | 'godot' | 'arcade' | 'microbit' | 'minecraft' | 'blockly') => {
    console.log('[SimpleHomeInterface] App type selected:', type);

    setSelectedAppType(type);

    // Handle Arcade - create app directly and open in editor
    if (type === 'arcade') {
      try {
        toast.info('Creating Arcade app...');
        const client = IpcClient.getInstance();

        const appName = `arcade-game-${Date.now()}`;

        // Create empty Arcade app
        const result = await client.createApp({
          name: appName,
          displayName: 'My Arcade Game',
          appType: 'arcade',
          framework: 'arcade' as any, // Type cast to avoid TS error
          path: `apps/web/${appName}`, // Provide explicit path
        });

        toast.success('Arcade app created!');

        // Navigate to Arcade editor
        window.location.href = `/arcade?id=${result.app.id}`;
      } catch (error: any) {
        console.error('Failed to create Arcade app:', error);
        toast.error(`Failed to create Arcade app: ${error?.message || 'Unknown error'}`);
      }
      return;
    }

    // Other educational frameworks go to prompted creation
    // Minecraft now uses the unified interface like web/mobile/godot
    const educationalTypes = ['microbit', 'blockly'];
    if (educationalTypes.includes(type)) {
      navigate({ to: `/create-with-prompt`, search: { type: type as any } });
      return;
    }

    // Update settings based on selection for traditional frameworks
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
  }, [updateSettings, navigate]);

  const ipcClient = IpcClient.getInstance();
  const queryClient = useQueryClient();
  const { hasPermission: hasAdminPermission } = useAdminPermission();

  // Handler for when user confirms Minecraft app name
  const handleMinecraftNameSelected = async (name: string) => {
    if (!pendingMinecraftTemplate) return;

    try {
      console.log('[Minecraft] Creating app with name:', name);
      toast.loading(`Creating ${name}...`);

      const normalizedName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const appName = `${normalizedName}-${Date.now().toString(36)}`;

      // Create Minecraft app
      const result = await ipcClient.createApp({
        name: appName,
        displayName: name,
        appType: 'minecraft',
        framework: 'minecraft' as any,
        path: `apps/minecraft/${appName}`,
      });

      console.log('[Minecraft] App created:', result);

      // Store template code and info for the editor to pick up
      localStorage.setItem('minecraft-template-code', pendingMinecraftTemplate.prompt);
      localStorage.setItem('minecraft-template-name', pendingMinecraftTemplate.title);
      localStorage.setItem('minecraft-template-features', pendingMinecraftTemplate.description);
      localStorage.setItem('minecraft-template-show-welcome', 'true');

      toast.dismiss();
      toast.success(`${name} ready! Modify it in the chat.`);

      // Clear pending template
      setPendingMinecraftTemplate(null);

      // Navigate to chat page with this app using router
      console.log('[Minecraft] Navigating to chat with app:', result.app.id);
      navigate({ to: '/chat', search: { id: result.app.id } });
    } catch (error: any) {
      toast.dismiss();
      console.error('[Minecraft] Failed to create app:', error);
      toast.error(`Failed to create app: ${error?.message || 'Unknown error'}`);
    }
  };

  // Fetch game templates from Supabase
  const { data: gameTemplates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['game-templates', selectedAppType],
    queryFn: async () => {
      if (!selectedAppType) return [];
      try {
        const templates = await ipcClient.listGameTemplates({ appType: selectedAppType });
        return templates;
      } catch (error) {
        console.error('Error fetching game templates:', error);
        // Fallback to static data if Supabase fails
        return [];
      }
    },
    enabled: !!selectedAppType,
  });

  // When app type changes, load ideas from Supabase or fallback to static
  useEffect(() => {
    if (selectedAppType) {
      if (gameTemplates.length > 0) {
        // Convert Supabase templates to ExampleIdea format
        const templateIdeas: ExampleIdea[] = gameTemplates.map(template => {
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
        });
        setIdeas(templateIdeas);
      } else if (!isLoadingTemplates) {
        // Fallback to static data if no templates from Supabase
        setIdeas(getStaticIdeas(selectedAppType));
      }
      setVisibleIdeasCount(6); // Reset to 6 when app type changes
    }
  }, [selectedAppType, gameTemplates, isLoadingTemplates]);

  // Handle chat submission
  const handleChatSubmit = useCallback(async (options?: any) => {
    console.log('[SimpleHomeInterface] Chat submitted with type:', selectedAppType);

    if (!selectedAppType) {
      // If no app type selected, show a helpful message
      alert('Please select an app type first (Web or Mobile)');
      return;
    }

    if (onChatSubmit) {
      // Pass the selectedAppType to the parent handler
      await onChatSubmit({ ...options, appType: selectedAppType });
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

  const handleShowMore = () => {
    setVisibleIdeasCount(ideas.length); // Show all ideas
  };

  const handleShowLess = () => {
    setVisibleIdeasCount(6); // Show only first 6
  };

  const handlePlayGame = (url: string) => {
    setSelectedGameUrl(url);
    setIsGameModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsGameModalOpen(false);
    setSelectedGameUrl(null);
  };

  const handleOpenExternal = () => {
    if (selectedGameUrl) {
      window.open(selectedGameUrl, '_blank');
    }
  };

  // Template management handlers
  const handleTemplateAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['game-templates', selectedAppType] });
  };

  const handleEditTemplate = (templateId: string) => {
    const template = gameTemplates.find(t => t.id === templateId);
    if (template) {
      setTemplateToEdit({
        id: template.id,
        name: template.name,
        details: template.details,
        previewUrl: template.previewUrl,
        imageUrl: template.imageUrl,
        emoji: template.emoji,
        appType: template.appType as any,
      });
      setIsEditTemplateDialogOpen(true);
    }
  };

  const handleTemplateUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['game-templates', selectedAppType] });
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
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Subtitle - Only show when no app type is selected */}
      {!selectedAppType && (
        <div className="text-center space-y-4 mb-8">
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose your platform and let Applaa build it for you
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
                    ) : selectedAppType === 'arcade' ? (
                      <Gamepad2 className="h-4 w-4 text-indigo-600" />
                    ) : selectedAppType === 'microbit' ? (
                      <Cpu className="h-4 w-4 text-orange-600" />
                    ) : selectedAppType === 'minecraft' ? (
                      <Box className="h-4 w-4 text-green-600" />
                    ) : selectedAppType === 'godot' ? (
                      <Gamepad2 className="h-4 w-4 text-purple-600" />
                    ) : (
                      <Smartphone className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-600">Building a</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {selectedAppType === 'web' ? 'Web App' :
                        selectedAppType === 'expo' ? 'Expo Mobile App' :
                          selectedAppType === 'flutter' ? 'Flutter Mobile App' :
                            selectedAppType === 'arcade' ? 'MakeCode Arcade Game' :
                              selectedAppType === 'microbit' ? 'Applaa:bit Project' :
                                selectedAppType === 'minecraft' ? 'Minecraft Mod' :
                                  'Applaa Game'}
                    </div>
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                        {selectedAppType === 'web' ? 'Framework: React (default)' :
                          selectedAppType === 'expo' ? 'Framework: Expo' :
                            selectedAppType === 'flutter' ? 'Framework: Flutter' :
                              selectedAppType === 'arcade' ? 'Platform: MakeCode Arcade' :
                                selectedAppType === 'microbit' ? 'Platform: Applaa:bit' :
                                  selectedAppType === 'minecraft' ? 'Platform: Minecraft' :
                                    'Engine: Applaa'}
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
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                What do you want to build?
              </h2>
              <p className="text-lg text-gray-600">
                Describe your {
                  selectedAppType === 'web' ? 'web app' :
                    selectedAppType === 'arcade' ? 'arcade game' :
                      selectedAppType === 'microbit' ? 'Applaa:bit project' :
                        selectedAppType === 'minecraft' ? 'minecraft mod' :
                          selectedAppType === 'godot' ? 'game' :
                            'mobile app'
                } and we'll create it for you
              </p>
            </div>

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

          {/* Inspiration Ideas - Game Templates */}
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3 px-0.5">
              <div className="flex items-center gap-2 text-gray-600">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Choose from 1000's of Game templates</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ideas.slice(0, visibleIdeasCount).map((idea, index) => {
                // Find the template ID from gameTemplates
                const template = gameTemplates.find(t => t.name === idea.title && t.details === idea.prompt);
                const canEdit = hasAdminPermission && template && !template.isDefault;

                return (
                  <div
                    key={`${idea.title}-${index}`}
                    className="p-4 text-left bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl text-sm transition-all flex items-start gap-3 shadow-sm relative group"
                  >
                    <span className="text-xl leading-none pt-0.5 flex-shrink-0">{idea.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={async () => {
                          console.log('[Template Click] selectedAppType:', selectedAppType, 'idea.title:', idea.title);

                          // For Minecraft templates, show naming dialog first
                          if (selectedAppType === 'minecraft') {
                            console.log('[Minecraft] Opening naming dialog for template:', idea.title);
                            setPendingMinecraftTemplate(idea);
                            setIsMinecraftNamingDialogOpen(true);
                          } else {
                            // For other app types, use normal flow
                            setInputValue(idea.prompt);
                          }
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
                              e.stopPropagation();
                              if (template) handleEditTemplate(template.id);
                            }}
                            className="h-7 w-7 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 shadow-sm flex items-center justify-center"
                            title="Edit template"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (template) handleDeleteTemplate(template.id, template.name);
                            }}
                            className="h-7 w-7 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 shadow-sm flex items-center justify-center"
                            title="Delete template"
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
              <div className="flex justify-center mt-4">
                {visibleIdeasCount < ideas.length ? (
                  <button
                    onClick={handleShowMore}
                    className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md text-xs font-medium border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700"
                  >
                    Show More ({ideas.length - visibleIdeasCount} more)
                  </button>
                ) : (
                  <button
                    onClick={handleShowLess}
                    className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md text-xs font-medium border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700"
                  >
                    Show Less
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Game Preview Modal - Same as Hub */}
      <Dialog open={isGameModalOpen} onOpenChange={setIsGameModalOpen}>
        <DialogContent className="!max-w-none !w-[98vw] !h-[95vh] p-0" style={{ width: '98vw', height: '95vh', maxWidth: 'none', maxHeight: 'none' }}>
          <DialogHeader className="p-6 pb-0 mt-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">
                Playing Game
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenExternal}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </Button>
            </div>
          </DialogHeader>

          {selectedGameUrl && (
            <div className="flex-1 p-6 pt-0" style={{ height: 'calc(95vh - 120px)' }}>
              <iframe
                src={selectedGameUrl}
                className="w-full h-full border-0 rounded-lg"
                title="Game Preview"
                allow="fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ height: 'calc(95vh - 120px)' }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {/* Minecraft Template Naming Dialog */}
      <AppNamingDialog
        open={isMinecraftNamingDialogOpen}
        onOpenChange={(open) => {
          setIsMinecraftNamingDialogOpen(open);
          if (!open) setPendingMinecraftTemplate(null);
        }}
        userPrompt={pendingMinecraftTemplate?.title || ''}
        onNameSelected={handleMinecraftNameSelected}
      />
    </div>
  );
}



// PERFORMANCE: Simple static ideas (like Dyad) - no complex generation
function getStaticIdeas(type: 'web' | 'expo' | 'flutter' | 'godot' | 'arcade' | 'microbit' | 'minecraft' | 'blockly'): ExampleIdea[] {
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
        description: "Build a meditation timer app with guided sessions, ambient sounds, progress tracking, and calming Flutter UI design.",
        emoji: "🧘",
        prompt: "Build a meditation timer app with guided sessions, ambient sounds, progress tracking, and calming Flutter UI design."
      }
    ];
  } else if (type === 'arcade') {
    return [
      {
        title: "Space Shooter",
        description: "Classic retro space shooter with enemies and power-ups.\nSmooth controls and explosive effects.",
        emoji: "🚀",
        prompt: "Create a retro space shooter game in MakeCode Arcade. Include player movement, enemy waves, projectile firing, and score tracking. Use cool sprites and background music."
      },
      {
        title: "Platformer Adventure",
        description: "Side-scrolling platformer with jumps and levels.\nCollectible coins and obstacles.",
        emoji: "🚀",
        prompt: "Build an epic adventure game where you explore ancient ruins!"
      },
      {
        title: "Dino Runner",
        description: "Endless runner inspired by the classic chrome game.\nIncreasing difficulty and sound effects.",
        emoji: "🦖",
        prompt: "Create an endless runner game in MakeCode Arcade where a dinosaur dodges cacti. Make the speed increase over time and add a high score system."
      }
    ];
  } else if (type === 'microbit') {
    return [
      {
        title: "Digital Pet",
        description: "An interactive pet that reacts to button presses.\nDisplays emotions on the LED screen.",
        emoji: "🐶",
        prompt: "Create a digital pet for micro:bit. Buttons A and B should feed or play with the pet. Use icons to show if it's happy, hungry, or sleepy. Add an alert if it needs attention."
      },
      {
        title: "Step Counter",
        description: "A wearable pedometer that counts your steps.\nUses the accelerometer to detect movement.",
        emoji: "🚶",
        prompt: "Build a step counter for micro:bit using the accelerometer. Display the step count on the screen and reset it when the device is shaken."
      },
      {
        title: "Temperature Alarm",
        description: "Monitors ambient temperature and alerts you.\nVisual and audio feedback for hot/cold.",
        emoji: "🌡️",
        prompt: "Build a temperature monitoring system for micro:bit. If the temperature goes above 30 degrees, show a 'Hot' icon and play a sound. If below 10, show 'Cold'."
      }
    ];
  } else if (type === 'minecraft') {
    // Use new Minecraft Templates Hub (45+ templates)
    const shuffled = [...MINECRAFT_TEMPLATES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 12).map(template => ({
      title: template.name,
      description: template.description + '\n' + template.features.slice(0, 2).join(' • '),
      emoji: template.icon,
      prompt: template.mcfunction,
    }));
  } else if (type === 'blockly') {
    return [
      {
        title: "Simple Calculator",
        description: "A drag-and-drop calculator using logic blocks.",
        emoji: "🧮",
        prompt: "Create a calculator that can add, subtract, multiply, and divide two numbers using variables and math blocks."
      },
      {
        title: "Magic 8-Ball",
        description: "Ask a question and get a random answer!",
        emoji: "🔮",
        prompt: "Build a Magic 8-Ball program that picks a random answer from a list of strings when run."
      },
      {
        title: "Story Generator",
        description: "A fun text program that makes silly stories.",
        emoji: "📖",
        prompt: "Create a program that joins different text blocks together to make a funny story about a space hamster."
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
