/**
 * Mobile Project Creation Dialog Component
 * 
 * A beautiful, animated dialog that shows the progress of mobile project creation.
 * Features real-time progress updates, smooth animations, and informative status messages.
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Loader2, Smartphone, Settings, Package, Sparkles } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { ProjectCreationProgress } from '@/hooks/mobile/useMobileProjectCreation';
import type { Framework } from '@/lib/mobile/types';

/**
 * Props for the MobileProjectCreationDialog component
 */
interface MobileProjectCreationDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  
  /** Current progress information */
  progress: ProjectCreationProgress | null;
  
  /** Whether creation is in progress */
  isCreating: boolean;
  
  /** Error from creation process */
  error: Error | null;
  
  /** Framework being used */
  framework?: Framework;
  
  /** Function to close the dialog */
  onClose: () => void;
  
  /** Function called when creation completes successfully */
  onComplete?: () => void;
}

/**
 * Phase configuration for visual styling
 */
const PHASE_CONFIG = {
  'generating-name': {
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    title: 'Generating Name',
    description: 'Creating a perfect name for your project'
  },
  'creating-project': {
    icon: Smartphone,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    title: 'Creating Project',
    description: 'Setting up your mobile app structure'
  },
  'configuring': {
    icon: Settings,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    title: 'Configuring',
    description: 'Applying your template and settings'
  },
  'installing-deps': {
    icon: Package,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    title: 'Installing Dependencies',
    description: 'Adding required packages and tools'
  },
  'finalizing': {
    icon: CheckCircle,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    title: 'Finalizing',
    description: 'Finishing up your project setup'
  },
  'complete': {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    title: 'Complete!',
    description: 'Your mobile project is ready'
  }
};

/**
 * Main MobileProjectCreationDialog component
 */
export function MobileProjectCreationDialog({
  isOpen,
  progress,
  isCreating,
  error,
  framework,
  onClose,
  onComplete
}: MobileProjectCreationDialogProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  // Handle completion
  useEffect(() => {
    if (progress?.phase === 'complete' && !showSuccess) {
      setShowSuccess(true);
      
      // Auto-close after showing success for a moment
      const timer = setTimeout(() => {
        onComplete?.();
        onClose();
        setShowSuccess(false);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [progress?.phase, showSuccess, onComplete, onClose]);

  // Reset success state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setShowSuccess(false);
    }
  }, [isOpen]);

  if (!progress && !error) {
    return null;
  }

  const currentPhase = progress?.phase || 'generating-name';
  const phaseConfig = PHASE_CONFIG[currentPhase];
  const IconComponent = phaseConfig.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto" hideCloseButton>
        <div className="text-center space-y-6 py-4">
          {/* Header */}
          <div className="space-y-2">
            <div className={`inline-flex p-3 rounded-full ${phaseConfig.bgColor} ${phaseConfig.borderColor} border-2`}>
              {error ? (
                <AlertCircle className="h-8 w-8 text-red-600" />
              ) : isCreating && progress?.phase !== 'complete' ? (
                <div className="relative">
                  <IconComponent className={`h-8 w-8 ${phaseConfig.color}`} />
                  {progress?.phase !== 'complete' && (
                    <Loader2 className="h-4 w-4 animate-spin absolute -top-1 -right-1 text-gray-400" />
                  )}
                </div>
              ) : (
                <IconComponent className={`h-8 w-8 ${phaseConfig.color}`} />
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {error ? 'Creation Failed' : phaseConfig.title}
              </h2>
              <p className="text-gray-600 text-sm">
                {error ? error.message : phaseConfig.description}
              </p>
            </div>

            {framework && !error && (
              <Badge variant="outline" className="mt-2">
                {framework === 'flutter' ? '💙 Flutter' : '⚛️ Expo'} Project
              </Badge>
            )}
          </div>

          {/* Progress Section */}
          {!error && progress && (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{progress.step}</span>
                  <span className="font-medium">{Math.round(progress.progress)}%</span>
                </div>
                <Progress 
                  value={progress.progress} 
                  className={`h-2 ${phaseConfig.bgColor}`}
                />
              </div>

              {/* Current Message */}
              <div className={`p-3 rounded-lg ${phaseConfig.bgColor} ${phaseConfig.borderColor} border`}>
                <p className="text-sm text-gray-700">
                  {progress.message}
                </p>
              </div>

              {/* Phase Indicators */}
              <div className="flex justify-center space-x-2">
                {Object.entries(PHASE_CONFIG).map(([phase, config], index) => {
                  const isCurrentPhase = phase === currentPhase;
                  const isCompletedPhase = Object.keys(PHASE_CONFIG).indexOf(currentPhase) > index;
                  const isActivePhase = isCurrentPhase || isCompletedPhase;

                  return (
                    <div
                      key={phase}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        isCompletedPhase 
                          ? 'bg-green-500' 
                          : isCurrentPhase 
                            ? config.color.replace('text-', 'bg-')
                            : 'bg-gray-200'
                      } ${
                        isCurrentPhase ? 'scale-125' : ''
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Success Animation */}
          {showSuccess && (
            <div className="space-y-4 animate-in fade-in-50 duration-500">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  Project Created Successfully!
                </h3>
                <p className="text-green-700 text-sm">
                  Your {framework} project is ready to use
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-center space-y-2">
                  <AlertCircle className="h-6 w-6 text-red-600 mx-auto" />
                  <div>
                    <h3 className="font-medium text-red-900">Something went wrong</h3>
                    <p className="text-sm text-red-700 mt-1">
                      {error.message}
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors duration-200"
              >
                Close
              </button>
            </div>
          )}

          {/* Tips during creation */}
          {!error && isCreating && progress?.phase !== 'complete' && (
            <div className="text-xs text-gray-500 space-y-1">
              <p>💡 <strong>Tip:</strong> {getRandomTip(framework)}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Get random tip based on framework
 */
function getRandomTip(framework?: Framework): string {
  const flutterTips = [
    "Hot reload lets you see changes instantly while developing",
    "Flutter uses a single codebase for all platforms",
    "Widgets are the building blocks of Flutter UIs",
    "Flutter compiles to native code for best performance",
    "Material Design and Cupertino widgets are built-in"
  ];

  const expoTips = [
    "Use Expo Go app to preview your project on your phone",
    "Over-the-air updates let you push changes instantly",
    "Expo provides many native APIs out of the box",
    "EAS Build creates production-ready apps in the cloud",
    "Metro bundler enables fast refresh during development"
  ];

  const generalTips = [
    "Great mobile apps start with understanding your users",
    "Consistent design creates better user experiences",
    "Performance matters - optimize for your target devices",
    "Test on real devices for the best results",
    "Consider accessibility from the beginning"
  ];

  const tips = framework === 'flutter' ? flutterTips :
               framework === 'expo' ? expoTips :
               generalTips;

  return tips[Math.floor(Math.random() * tips.length)];
}

/**
 * Simplified version for inline progress display
 */
interface MobileProjectProgressIndicatorProps {
  progress: ProjectCreationProgress | null;
  framework?: Framework;
  compact?: boolean;
}

export function MobileProjectProgressIndicator({
  progress,
  framework,
  compact = false
}: MobileProjectProgressIndicatorProps) {
  if (!progress) return null;

  const phaseConfig = PHASE_CONFIG[progress.phase];
  const IconComponent = phaseConfig.icon;

  return (
    <div className={`flex items-center space-x-3 ${compact ? 'text-sm' : ''}`}>
      <div className={`p-2 rounded-full ${phaseConfig.bgColor}`}>
        <IconComponent className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} ${phaseConfig.color}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`font-medium text-gray-900 truncate ${compact ? 'text-sm' : ''}`}>
            {progress.step}
          </p>
          <span className={`text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>
            {Math.round(progress.progress)}%
          </span>
        </div>
        
        <Progress 
          value={progress.progress} 
          className={`mt-1 ${compact ? 'h-1' : 'h-2'}`}
        />
        
        {!compact && (
          <p className="text-xs text-gray-600 mt-1 truncate">
            {progress.message}
          </p>
        )}
      </div>

      {framework && (
        <Badge variant="outline" className={compact ? 'text-xs' : ''}>
          {framework === 'flutter' ? '💙' : '⚛️'}
        </Badge>
      )}
    </div>
  );
}


