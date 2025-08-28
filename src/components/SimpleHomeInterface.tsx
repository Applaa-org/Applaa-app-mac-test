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
import { ComingSoonTiles } from './ComingSoonTiles';
import { IpcClient } from '@/ipc/ipc_client';
import { useSettings } from '@/hooks/useSettings';
import { useApplaaPro } from '@/hooks/useApplaaPro';
import { Crown, Sparkles, Globe, Smartphone, RefreshCw, Lightbulb } from 'lucide-react';

interface SimpleHomeInterfaceProps {
  onChatSubmit?: (options?: any) => Promise<void>;
}

type ExampleIdea = {
  title: string;
  description: string; // 2–4 lines
  emoji: string;
  tags: string[]; // e.g., ['AI', 'Offline', 'Best Navigation']
  prompt: string; // full prompt to inject
};

export function SimpleHomeInterface({ onChatSubmit }: SimpleHomeInterfaceProps) {
  const [inputValue, setInputValue] = useAtom(homeChatInputValueAtom);
  const [selectedAppType, setSelectedAppType] = useState<'web' | 'expo' | 'flutter' | null>(null);
  const { updateSettings } = useSettings();
  const { isPro, remainingFreeApps, isAtFreeLimit } = useApplaaPro();
  const [ideas, setIdeas] = useState<ExampleIdea[]>([]);

  // Handle app type selection
  const handleAppTypeSelection = useCallback(async (type: 'web' | 'expo' | 'flutter') => {
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

  // When app type changes, (re)load ideas
  useEffect(() => {
    if (selectedAppType) {
      setIdeas(generateUniqueIdeas(selectedAppType, 6));
    }
  }, [selectedAppType]);

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
    setIdeas(generateUniqueIdeas(selectedAppType, 6));
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
          <ComingSoonTiles />
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
                    ) : (
                      <Smartphone className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-600">Building a</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {selectedAppType === 'web' ? 'Web App' : selectedAppType === 'expo' ? 'Expo Mobile App' : 'Flutter Mobile App'}
                    </div>
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                        {selectedAppType === 'web' ? 'Framework: React (default)' : selectedAppType === 'expo' ? 'Framework: Expo' : 'Framework: Flutter'}
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
                Describe your {selectedAppType === 'web' ? 'web app' : 'mobile app'} and we'll create it for you
              </p>
            </div>
            
            <HomeChatInput
              onSubmit={handleChatSubmit}
              placeholder={`Describe your ${selectedAppType === 'web' ? 'web app' : 'mobile app'}... (e.g., "A todo app with dark mode and sync")`}
              showPlatformSelector={false}
              showSparkSelector={true}
              appType={selectedAppType}
            />
          </div>

          {/* Inspiration Ideas - Always visible with Shuffle */}
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3 px-0.5">
              <div className="flex items-center gap-2 text-gray-600">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Need inspiration?</span>
              </div>
              <button
                onClick={handleShuffleIdeas}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Shuffle ideas
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ideas.map((idea, index) => (
                <button
                  key={`${idea.title}-${index}`}
                  onClick={() => setInputValue(idea.prompt)}
                  className="p-4 text-left bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl text-sm transition-all flex items-start gap-3 shadow-sm"
                >
                  <span className="text-xl leading-none pt-0.5">{idea.emoji}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">{idea.title}</div>
                    <p className="text-gray-600 text-[13px] leading-relaxed mb-2 whitespace-pre-line">
                      {idea.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {idea.tags.map((t) => (
                        <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-700 border border-gray-200">{t}</span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: Idea pools
function generateIdeaPool(type: 'web' | 'expo' | 'flutter'): ExampleIdea[] {
  if (type === 'web') {
    const variants = [
      {
        title: 'SaaS Analytics Dashboard',
        description: 'Subscriptions, usage metering, role-based access. AI insights surface churn risk and upsell opportunities. Beautiful charts and real-time events.',
        emoji: '📊',
        tags: ['AI Insights', 'RBAC', 'Realtime'],
        prompt: 'Build a SaaS analytics dashboard with subscriptions, metering, roles, AI insights for churn/upsell, and real-time charts.'
      },
      {
        title: 'Modern E‑commerce Store',
        description: 'Product catalog, Stripe payments, smart search with semantic ranking, wishlists and order tracking. Admin tools with inventory alerts.',
        emoji: '🛒',
        tags: ['Stripe', 'AI Search', 'Admin'],
        prompt: 'Create a modern e‑commerce web app with Stripe payments, semantic search, wishlists, order tracking, and admin inventory tools.'
      },
      {
        title: 'Knowledge Blog Platform',
        description: 'Rich editor with markdown/AI assist, SEO‑friendly routing, reading time and highlights. Personalized recommendations using embeddings.',
        emoji: '✍️',
        tags: ['AI Writer', 'SEO', 'Embeddings'],
        prompt: 'Build a blog platform with rich editor, AI writing assist, SEO routing, reading metrics, and embedding-based recommendations.'
      },
      {
        title: 'Learning Portal',
        description: 'Courses, lessons, quizzes and certificates. AI tutor explains answers and drafts practice questions. Progress tracking and streaks.',
        emoji: '🎓',
        tags: ['AI Tutor', 'Quizzes', 'Streaks'],
        prompt: 'Create a learning portal with courses, quizzes, certificates, AI tutor and progress streaks.'
      },
      {
        title: 'Event Planner',
        description: 'Calendar views, RSVPs, smart suggestions for venues and times, ICS export and shareable links. Mobile-friendly timeline.',
        emoji: '📅',
        tags: ['Calendar', 'AI Suggestions', 'Sharing'],
        prompt: 'Build an event planner with RSVPs, calendar, AI venue/time suggestions, ICS export and sharing.'
      },
      {
        title: 'Travel Planner',
        description: 'Trips, day plans and bookmarks. AI builds itineraries from interests. Map view with offline notes and exportable PDFs.',
        emoji: '🗺️',
        tags: ['AI Itinerary', 'Maps', 'Offline'],
        prompt: 'Create a travel planner with AI itineraries, map view, offline notes and PDF export.'
      }
    ];
    return addUniqueFlavor(variants);
  } else {
    const variants = [
      {
        title: 'Fitness Tracker',
        description: 'Workouts, sets/reps, rest timers and progress charts. AI coach suggests routines and form tips. Offline-first with sync.',
        emoji: '🏋️',
        tags: ['AI Coach', 'Charts', 'Offline'],
        prompt: 'Build an Expo fitness app with workouts, timers, progress charts, and an AI coach that suggests routines and form tips.'
      },
      {
        title: 'Smart Recipe Book',
        description: 'Ingredient scanning, pantry tracking and meal plans. AI suggests recipes based on what you have. Grocery list with categories.',
        emoji: '🍳',
        tags: ['AI Recipes', 'Scanner', 'Planner'],
        prompt: 'Create an Expo recipe app with pantry tracking, AI recipe suggestions, meal planner and categorized shopping lists.'
      },
      {
        title: 'Photo Social',
        description: 'Albums, filters and stories. AI generates captions and hashtags. Smooth gestures and best‑in‑class tab navigation.',
        emoji: '📷',
        tags: ['AI Captions', 'Gestures', 'Nav'],
        prompt: 'Build an Expo social photo app with albums, filters, stories, AI captions/hashtags, and great mobile navigation.'
      },
      {
        title: 'Calm Meditation',
        description: 'Breathing exercises, ambient sounds and streaks. AI mood check‑ins recommend sessions. Beautiful gradients and haptics.',
        emoji: '🧘',
        tags: ['AI Mood', 'Haptics', 'Streaks'],
        prompt: 'Create an Expo meditation app with breathing, sounds, streaks and AI mood‑based recommendations.'
      },
      {
        title: 'Smart Notes',
        description: 'Voice notes with transcription, tagging and search. AI summarizes notes into action items. Offline with background sync.',
        emoji: '📝',
        tags: ['AI Summary', 'Voice', 'Offline'],
        prompt: 'Build an Expo notes app with voice transcription, tagging, semantic search and AI summarization to tasks.'
      },
      {
        title: 'Expense Tracker',
        description: 'Receipt scanning, budgets and charts. AI categorizes and flags anomalies. Privacy‑first local storage with export.',
        emoji: '🧾',
        tags: ['Scanner', 'AI Categorization', 'Privacy'],
        prompt: 'Create an Expo expense tracker with receipt scan, budgets/charts, AI categorization and privacy‑first storage.'
      }
    ];
    return addUniqueFlavor(variants);
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Add small randomized flavor so ideas differ per user/shuffle
function addUniqueFlavor(items: Omit<ExampleIdea, 'prompt'> & { prompt: string }[]): ExampleIdea[] {
  const suffixes = [
    'Use stunning micro-interactions and gestures.',
    'Design top-tier navigation with smooth transitions.',
    'Ensure full accessibility and offline support.',
    'Include delightful empty/loading states.',
    'Add sharing and deep linking where relevant.'
  ];
  return items.map((it) => {
    const extra = suffixes[Math.floor(Math.random() * suffixes.length)];
    return {
      ...it,
      description: `${it.description}\n${extra}`,
      prompt: `${it.prompt} Also: ${extra}`,
    };
  });
}

// Generate truly unique ideas per user/session by mixing feature palettes
function generateUniqueIdeas(type: 'web' | 'expo' | 'flutter', count: number): ExampleIdea[] {
  const base = generateIdeaPool(type);
  const features = [
    'AI semantic search',
    'offline-first caching',
    'role-based access control',
    'real-time collaboration',
    'push notifications',
    'background sync',
    'deep links and shareable routes',
    'export to PDF/CSV',
    'multi-language i18n',
    'theme personalization',
  ];
  const nav = [
    'tab navigation',
    'stack + modal flows',
    'bottom sheets',
    'gesture back navigation',
    'FAB quick actions',
  ];

  const out: ExampleIdea[] = [];
  const uniq = new Set<string>();
  while (out.length < count) {
    const baseIdea = base[Math.floor(Math.random() * base.length)];
    const f1 = features[Math.floor(Math.random() * features.length)];
    const f2 = features[Math.floor(Math.random() * features.length)];
    const n1 = nav[Math.floor(Math.random() * nav.length)];
    const key = `${baseIdea.title}-${f1}-${f2}-${n1}`;
    if (uniq.has(key)) continue;
    uniq.add(key);

    const description = `${baseIdea.description}\nBonus: ${f1}, ${f2}. Navigation: ${n1}.`;
    const prompt = `${baseIdea.prompt} Add ${f1} and ${f2}. Use ${n1}. Ensure accessibility and performance.`;

    out.push({
      ...baseIdea,
      description,
      prompt,
      tags: Array.from(new Set([...baseIdea.tags, 'Unique', 'AI Enabled'])).slice(0, 4),
    });
  }
  return out;
}
