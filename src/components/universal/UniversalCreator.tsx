/**
 * Universal Creator Component
 * 
 * Replaces the old platform selector dropdown with unlimited framework support.
 * This is the component that integrates with the existing home page.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sparkles, Infinity, Zap } from 'lucide-react';
import { UniversalAppBuilder } from './UniversalAppBuilder';
import { homeChatInputValueAtom } from '@/atoms/chatAtoms';
import { useAtom } from 'jotai';
import type { UniversalFramework } from '@/lib/universal/framework-registry';

interface UniversalCreatorProps {
  onProjectCreated?: () => void;
}

export function UniversalCreator({ onProjectCreated }: UniversalCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue] = useAtom(homeChatInputValueAtom);

  const handleCreateProject = async (
    framework: UniversalFramework, 
    projectName: string, 
    userPrompt: string
  ) => {
    console.log('[UniversalCreator] Creating project:', { 
      framework: framework.name, 
      projectName, 
      userPrompt 
    });

    // TODO: Integrate with existing Applaa project creation flow
    // For now, we'll show a success message
    alert(`🚀 Creating ${framework.name} project: "${projectName}"!\n\nThis will be integrated with the full Applaa project creation system.`);
    
    setIsOpen(false);
    onProjectCreated?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
          <Infinity className="h-4 w-4 mr-2" />
          Build Anything
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Universal App Builder</DialogTitle>
          <DialogDescription>
            Create any type of application using our universal framework selector and AI-powered builder.
          </DialogDescription>
        </DialogHeader>
        <UniversalAppBuilder 
          onCreateProject={handleCreateProject}
          initialPrompt={inputValue}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Universal Platform Selector
 * 
 * This completely replaces the old PlatformSelector component
 * with unlimited framework possibilities.
 */
export function UniversalPlatformSelector() {
  const [inputValue] = useAtom(homeChatInputValueAtom);

  return (
    <div className="flex items-center space-x-2">
      {/* Universal Builder Button */}
      <UniversalCreator />
      
      {/* Quick Framework Buttons */}
      <div className="flex items-center space-x-1">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            // TODO: Quick React project creation
            console.log('Quick React project');
          }}
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          <span className="text-xs">⚛️</span>
          <span className="ml-1 text-xs">React</span>
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            // TODO: Quick Flutter project creation
            console.log('Quick Flutter project');
          }}
          className="text-purple-600 border-purple-200 hover:bg-purple-50"
        >
          <span className="text-xs">💙</span>
          <span className="ml-1 text-xs">Flutter</span>
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            // TODO: Quick Django project creation
            console.log('Quick Django project');
          }}
          className="text-green-600 border-green-200 hover:bg-green-50"
        >
          <span className="text-xs">🐍</span>
          <span className="ml-1 text-xs">Django</span>
        </Button>
        
        <div className="text-xs text-gray-500 px-2">
          +100 more
        </div>
      </div>
    </div>
  );
}

/**
 * Enhanced Home Interface
 * 
 * This can replace the entire chat input controls section
 * with the unlimited building approach.
 */
export function EnhancedHomeInterface() {
  const [inputValue, setInputValue] = useAtom(homeChatInputValueAtom);
  const [isUniversalMode, setIsUniversalMode] = useState(false);

  if (isUniversalMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Universal App Builder</h2>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsUniversalMode(false)}
          >
            Back to Simple Mode
          </Button>
        </div>
        
        <UniversalAppBuilder 
          onCreateProject={(framework, projectName, userPrompt) => {
            console.log('[EnhancedHomeInterface] Creating:', { framework, projectName, userPrompt });
            // TODO: Integrate with existing flow
          }}
          initialPrompt={inputValue}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Input with Universal Mode Toggle */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          {/* Existing chat input would go here */}
          <input 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask Applaa to build... (or try Universal Mode for unlimited possibilities)"
            className="w-full p-3 border rounded-lg"
          />
        </div>
        
        <Button
          onClick={() => setIsUniversalMode(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Universal Mode
        </Button>
      </div>
      
      {/* Framework Quick Access */}
      <div className="flex items-center justify-between">
        <UniversalPlatformSelector />
        
        <div className="text-sm text-gray-500">
          💡 Try: "Build a React todo app", "Create Flutter game", "Make Django API"
        </div>
      </div>
    </div>
  );
}

/**
 * Universal Framework Showcase
 * 
 * Shows the incredible range of what's possible
 */
export function UniversalFrameworkShowcase() {
  const frameworks = [
    { name: 'React', icon: '⚛️', color: 'text-blue-600', category: 'Web Frontend' },
    { name: 'Flutter', icon: '💙', color: 'text-purple-600', category: 'Mobile Cross-Platform' },
    { name: 'Django', icon: '🐍', color: 'text-green-600', category: 'Web Backend' },
    { name: 'Unity', icon: '🎮', color: 'text-red-600', category: 'Game Engine' },
    { name: 'Electron', icon: '⚡', color: 'text-indigo-600', category: 'Desktop Apps' },
    { name: 'FastAPI', icon: '🚀', color: 'text-orange-600', category: 'API Framework' },
    { name: 'Next.js', icon: '▲', color: 'text-gray-600', category: 'Full-Stack' },
    { name: 'Vue.js', icon: '💚', color: 'text-emerald-600', category: 'Web Frontend' },
    { name: 'Rust', icon: '🦀', color: 'text-yellow-600', category: 'Systems Programming' },
    { name: 'WordPress', icon: '📝', color: 'text-blue-500', category: 'CMS' },
    { name: 'TensorFlow', icon: '🧠', color: 'text-pink-600', category: 'AI/ML' },
    { name: 'Go', icon: '🐹', color: 'text-cyan-600', category: 'Backend Services' }
  ];

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6">
      <div className="text-center space-y-4">
        <h3 className="text-2xl font-bold">Build with ANY Framework</h3>
        <p className="text-gray-600">No limits. No restrictions. Just pure creative freedom.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {frameworks.map((framework, index) => (
            <div 
              key={index}
              className="flex flex-col items-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <span className="text-2xl mb-1">{framework.icon}</span>
              <span className={`font-medium ${framework.color}`}>{framework.name}</span>
              <span className="text-xs text-gray-500 text-center">{framework.category}</span>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
          <Infinity className="h-4 w-4" />
          <span>And literally ANY framework you can think of!</span>
        </div>
      </div>
    </div>
  );
}


