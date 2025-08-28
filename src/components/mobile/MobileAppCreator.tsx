/**
 * Mobile App Creator Component
 * 
 * The main integration component that brings together the framework picker,
 * project creation, and progress tracking. This component can be embedded
 * in any part of the Applaa interface.
 */

import React, { useState, useCallback } from 'react';
import { Smartphone, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileFrameworkPicker } from './MobileFrameworkPicker';
import { MobileProjectCreationDialog } from './MobileProjectCreationDialog';
import { useMobileProjectCreation, type MobileProjectCreationRequest } from '@/hooks/mobile/useMobileProjectCreation';
import type { Framework, TemplateOption, Platform } from '@/lib/mobile/types';

/**
 * Props for the MobileAppCreator component
 */
interface MobileAppCreatorProps {
  /** User's prompt for the mobile app */
  userPrompt?: string;
  
  /** Whether to show as a button (true) or inline (false) */
  trigger?: 'button' | 'inline';
  
  /** Button text (when trigger is 'button') */
  buttonText?: string;
  
  /** Initial framework selection */
  initialFramework?: Framework;
  
  /** Whether to show in compact mode */
  compact?: boolean;
  
  /** Function called when project creation starts */
  onCreationStart?: () => void;
  
  /** Function called when project is created successfully */
  onCreationComplete?: (projectPath?: string) => void;
  
  /** Function called when creation is cancelled */
  onCancel?: () => void;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * Main MobileAppCreator component
 */
export function MobileAppCreator({
  userPrompt = '',
  trigger = 'button',
  buttonText = 'Create Mobile App',
  initialFramework,
  compact = false,
  onCreationStart,
  onCreationComplete,
  onCancel,
  className = ''
}: MobileAppCreatorProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isCreationDialogOpen, setIsCreationDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MobileProjectCreationRequest | null>(null);

  // Mobile project creation hook
  const {
    createProject,
    isCreating,
    progress,
    error,
    reset
  } = useMobileProjectCreation();

  // Handle framework and template selection
  const handleSelection = useCallback(async (
    framework: Framework,
    template: TemplateOption,
    platforms: Platform[]
  ) => {
    console.log('[MobileAppCreator] Selection made:', { framework, template: template.id, platforms });

    const request: MobileProjectCreationRequest = {
      framework,
      template,
      platforms,
      userPrompt
    };

    setSelectedRequest(request);
    setIsPickerOpen(false);
    setIsCreationDialogOpen(true);

    // Notify parent
    onCreationStart?.();

    try {
      await createProject(request);
      // Success handling is done in the creation dialog
    } catch (error) {
      console.error('[MobileAppCreator] Creation failed:', error);
      // Error handling is done in the creation dialog
    }
  }, [userPrompt, createProject, onCreationStart]);

  // Handle picker close
  const handlePickerClose = useCallback(() => {
    setIsPickerOpen(false);
    onCancel?.();
  }, [onCancel]);

  // Handle creation dialog close
  const handleCreationDialogClose = useCallback(() => {
    setIsCreationDialogOpen(false);
    setSelectedRequest(null);
    reset();
  }, [reset]);

  // Handle creation completion
  const handleCreationComplete = useCallback(() => {
    onCreationComplete?.();
    handleCreationDialogClose();
  }, [onCreationComplete, handleCreationDialogClose]);

  // Handle trigger click
  const handleTriggerClick = useCallback(() => {
    setIsPickerOpen(true);
  }, []);

  // Render trigger
  const renderTrigger = () => {
    if (trigger === 'button') {
      return (
        <Button
          onClick={handleTriggerClick}
          className={`bg-blue-600 hover:bg-blue-700 text-white ${className}`}
          disabled={isCreating}
        >
          <Smartphone className="h-4 w-4 mr-2" />
          {buttonText}
          {!compact && <Plus className="h-4 w-4 ml-2" />}
        </Button>
      );
    }

    // Inline trigger
    return (
      <div 
        onClick={handleTriggerClick}
        className={`cursor-pointer ${className}`}
      >
        <div className="flex items-center space-x-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
          <Smartphone className="h-5 w-5 text-gray-400" />
          <span className="text-gray-600">Create Mobile App</span>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderTrigger()}

      {/* Framework Picker Modal */}
      <MobileFrameworkPicker
        isOpen={isPickerOpen}
        onClose={handlePickerClose}
        onSelect={handleSelection}
        userPrompt={userPrompt}
        initialFramework={initialFramework}
        compact={compact}
      />

      {/* Project Creation Dialog */}
      <MobileProjectCreationDialog
        isOpen={isCreationDialogOpen}
        progress={progress}
        isCreating={isCreating}
        error={error}
        framework={selectedRequest?.framework}
        onClose={handleCreationDialogClose}
        onComplete={handleCreationComplete}
      />
    </>
  );
}

/**
 * Quick mobile app creator for specific frameworks
 */
interface QuickMobileCreatorProps {
  framework: Framework;
  userPrompt?: string;
  onCreationComplete?: () => void;
  compact?: boolean;
}

export function QuickMobileCreator({
  framework,
  userPrompt = '',
  onCreationComplete,
  compact = false
}: QuickMobileCreatorProps) {
  return (
    <MobileAppCreator
      userPrompt={userPrompt}
      initialFramework={framework}
      buttonText={`Create ${framework === 'flutter' ? 'Flutter' : 'Expo'} App`}
      onCreationComplete={onCreationComplete}
      compact={compact}
    />
  );
}

/**
 * Mobile app creator card for home page
 */
interface MobileAppCreatorCardProps {
  userPrompt?: string;
  onCreationComplete?: () => void;
}

export function MobileAppCreatorCard({
  userPrompt,
  onCreationComplete
}: MobileAppCreatorCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Mobile App</h3>
          </div>
          
          <p className="text-gray-600 text-sm mb-4">
            Create native mobile apps with Flutter or Expo. Single codebase, multiple platforms.
          </p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              📱 iOS & Android
            </span>
            <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              🌐 Web Support
            </span>
            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              ⚡ Hot Reload
            </span>
          </div>
        </div>
      </div>

      <MobileAppCreator
        userPrompt={userPrompt}
        trigger="button"
        buttonText="Create Mobile App"
        onCreationComplete={onCreationComplete}
        className="w-full"
      />
    </div>
  );
}

/**
 * Mobile framework comparison component
 */
export function MobileFrameworkComparison() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-xl">💙</span>
          <h3 className="font-semibold">Flutter</h3>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Google's UI toolkit for beautiful, natively compiled apps from a single codebase.
        </p>
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Native performance</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Single codebase</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Hot reload</span>
          </div>
        </div>
        <QuickMobileCreator framework="flutter" compact />
      </div>

      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-xl">⚛️</span>
          <h3 className="font-semibold">Expo</h3>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          The fastest way to build React Native apps with powerful tools and services.
        </p>
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>React Native</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Easy to start</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Cloud services</span>
          </div>
        </div>
        <QuickMobileCreator framework="expo" compact />
      </div>
    </div>
  );
}


