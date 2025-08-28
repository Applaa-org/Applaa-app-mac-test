/**
 * App Creation Wizard Component
 * 
 * A comprehensive wizard that replaces the simple dropdown with a beautiful
 * multi-step interface for creating different types of applications.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FrameworkCategoryPicker, type FrameworkCategory, FRAMEWORK_CATEGORIES } from './FrameworkCategoryPicker';
import { MobileFrameworkPicker } from '@/components/mobile/MobileFrameworkPicker';
import { MobileProjectCreationDialog } from '@/components/mobile/MobileProjectCreationDialog';
import { useMobileProjectCreation } from '@/hooks/mobile/useMobileProjectCreation';
import type { Framework, TemplateOption, Platform } from '@/lib/mobile/types';

/**
 * Wizard step definitions
 */
type WizardStep = 'category' | 'framework' | 'template' | 'creation';

/**
 * Props for the AppCreationWizard component
 */
interface AppCreationWizardProps {
  /** Whether the wizard is open */
  isOpen: boolean;
  
  /** Function to close the wizard */
  onClose: () => void;
  
  /** User's prompt for the application */
  userPrompt?: string;
  
  /** Function called when app creation is complete */
  onComplete?: () => void;
  
  /** Initial category selection (optional) */
  initialCategory?: string;
}

/**
 * Creation request data
 */
interface CreationRequest {
  category: FrameworkCategory;
  framework?: Framework;
  template?: TemplateOption;
  platforms?: Platform[];
  userPrompt: string;
}

/**
 * Main AppCreationWizard component
 */
export function AppCreationWizard({
  isOpen,
  onClose,
  userPrompt = '',
  onComplete,
  initialCategory
}: AppCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('category');
  const [creationRequest, setCreationRequest] = useState<Partial<CreationRequest>>({
    userPrompt
  });

  // Mobile project creation hook (for mobile apps)
  const {
    createProject: createMobileProject,
    isCreating: isCreatingMobile,
    progress: mobileProgress,
    error: mobileError,
    reset: resetMobileCreation
  } = useMobileProjectCreation();

  // Reset wizard when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(initialCategory ? 'framework' : 'category');
      setCreationRequest({ userPrompt });
      resetMobileCreation();
      
      // Set initial category if provided
      if (initialCategory) {
        const category = FRAMEWORK_CATEGORIES.find(cat => cat.id === initialCategory);
        if (category) {
          setCreationRequest(prev => ({ ...prev, category }));
        }
      }
    }
    // Note: resetMobileCreation removed from deps to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialCategory, userPrompt]);

  // Calculate progress
  const progress = (() => {
    switch (currentStep) {
      case 'category': return 25;
      case 'framework': return 50;
      case 'template': return 75;
      case 'creation': return 100;
      default: return 0;
    }
  })();

  // Handle category selection
  const handleCategorySelect = useCallback((category: FrameworkCategory) => {
    console.log('[AppCreationWizard] Category selected:', category.name);
    
    if (category.comingSoon) {
      // Handle coming soon categories
      console.log('[AppCreationWizard] Category coming soon:', category.id);
      return;
    }

    setCreationRequest(prev => ({ ...prev, category }));
    
    // Move to appropriate next step based on category
    if (category.id === 'mobile-apps') {
      setCurrentStep('framework');
    } else {
      // For other categories, we might skip directly to template selection
      // or handle differently based on the category
      setCurrentStep('framework');
    }
  }, []);

  // Handle mobile framework and template selection
  const handleMobileSelection = useCallback(async (
    framework: Framework,
    template: TemplateOption,
    platforms: Platform[]
  ) => {
    console.log('[AppCreationWizard] Mobile selection:', { framework, template: template.id, platforms });

    setCreationRequest(prev => ({
      ...prev,
      framework,
      template,
      platforms
    }));

    setCurrentStep('creation');

    // Start mobile project creation
    try {
      await createMobileProject({
        framework,
        template,
        platforms,
        userPrompt
      });
      
      // Success handled in the mobile progress dialog
    } catch (error) {
      console.error('[AppCreationWizard] Mobile creation failed:', error);
    }
  }, [createMobileProject, userPrompt]);

  // Handle project creation completion
  const handleCreationComplete = useCallback(() => {
    console.log('[AppCreationWizard] Creation completed successfully');
    onComplete?.();
    onClose();
  }, [onComplete, onClose]);

  // Handle going back
  const handleBack = useCallback(() => {
    switch (currentStep) {
      case 'framework':
        setCurrentStep('category');
        break;
      case 'template':
        setCurrentStep('framework');
        break;
      case 'creation':
        setCurrentStep('template');
        break;
    }
  }, [currentStep]);

  // Handle wizard close
  const handleClose = useCallback(() => {
    resetMobileCreation();
    onClose();
  }, [onClose, resetMobileCreation]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'category':
        return (
          <FrameworkCategoryPicker
            onCategorySelect={handleCategorySelect}
            selectedCategory={creationRequest.category}
            showOnlyAvailable={true}
          />
        );

      case 'framework':
        if (creationRequest.category?.id === 'mobile-apps') {
          return (
            <MobileFrameworkPicker
              isOpen={true}
              onClose={() => setCurrentStep('category')}
              onSelect={handleMobileSelection}
              userPrompt={userPrompt}
            />
          );
        }
        
        // For other categories, render appropriate framework picker
        return (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {creationRequest.category?.name} Framework Selection
            </h3>
            <p className="text-gray-600 mb-6">
              Framework selection for {creationRequest.category?.name} is coming soon!
            </p>
            <Button onClick={() => setCurrentStep('category')}>
              Choose Different Category
            </Button>
          </div>
        );

      case 'template':
        return (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Template Selection</h3>
            <p className="text-gray-600">Template selection step</p>
          </div>
        );

      case 'creation':
        if (creationRequest.category?.id === 'mobile-apps') {
          return (
            <MobileProjectCreationDialog
              isOpen={true}
              progress={mobileProgress}
              isCreating={isCreatingMobile}
              error={mobileError}
              framework={creationRequest.framework}
              onClose={handleClose}
              onComplete={handleCreationComplete}
            />
          );
        }
        
        return (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Creating Your App</h3>
            <p className="text-gray-600">Setting up your {creationRequest.category?.name}...</p>
          </div>
        );

      default:
        return null;
    }
  };

  // For mobile framework picker, we handle the dialog internally
  if (currentStep === 'framework' && creationRequest.category?.id === 'mobile-apps') {
    return renderStepContent();
  }

  // For mobile creation, we handle the dialog internally
  if (currentStep === 'creation' && creationRequest.category?.id === 'mobile-apps') {
    return renderStepContent();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Create Your Dream App</h2>
                <p className="text-sm text-gray-600">
                  {getStepDescription(currentStep, creationRequest.category)}
                </p>
              </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center space-x-2">
              <Badge variant={currentStep === 'category' ? 'default' : 'secondary'}>
                1. Category
              </Badge>
              <Badge variant={currentStep === 'framework' ? 'default' : 'secondary'}>
                2. Framework
              </Badge>
              <Badge variant={currentStep === 'template' ? 'default' : 'secondary'}>
                3. Template
              </Badge>
              <Badge variant={currentStep === 'creation' ? 'default' : 'secondary'}>
                4. Create
              </Badge>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {renderStepContent()}
        </div>

        {/* Footer - only show for non-mobile steps */}
        {!(currentStep === 'framework' && creationRequest.category?.id === 'mobile-apps') &&
         !(currentStep === 'creation' && creationRequest.category?.id === 'mobile-apps') && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 'category'}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              <div className="flex items-center space-x-2">
                {userPrompt && (
                  <div className="text-sm text-gray-600 max-w-xs truncate">
                    "{userPrompt}"
                  </div>
                )}
              </div>

              <Button
                onClick={handleClose}
                variant="ghost"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Get step description
 */
function getStepDescription(step: WizardStep, category?: FrameworkCategory): string {
  switch (step) {
    case 'category':
      return 'Choose the type of application you want to build';
    case 'framework':
      return category ? `Select a framework for your ${category.name}` : 'Choose your framework';
    case 'template':
      return 'Pick a template that matches your needs';
    case 'creation':
      return 'We\'re setting up your project...';
    default:
      return '';
  }
}

/**
 * Quick app creation buttons for specific categories
 */
interface QuickCreateButtonProps {
  category: string;
  userPrompt?: string;
  onComplete?: () => void;
  children: React.ReactNode;
}

export function QuickCreateButton({
  category,
  userPrompt,
  onComplete,
  children
}: QuickCreateButtonProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const handleClick = () => {
    setIsWizardOpen(true);
  };

  const handleClose = () => {
    setIsWizardOpen(false);
  };

  const handleComplete = () => {
    onComplete?.();
    setIsWizardOpen(false);
  };

  return (
    <>
      <div onClick={handleClick}>
        {children}
      </div>
      
      <AppCreationWizard
        isOpen={isWizardOpen}
        onClose={handleClose}
        userPrompt={userPrompt}
        onComplete={handleComplete}
        initialCategory={category}
      />
    </>
  );
}

/**
 * Enhanced version of the existing mobile app creator card
 */
export function EnhancedMobileAppCard({ userPrompt, onComplete }: {
  userPrompt?: string;
  onComplete?: () => void;
}) {
  return (
    <QuickCreateButton
      category="mobile-apps"
      userPrompt={userPrompt}
      onComplete={onComplete}
    >
      <div className="bg-gradient-to-br from-purple-50 to-pink-100 border border-purple-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className="p-1.5 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <Sparkles className="h-4 w-4 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Mobile App</h3>
              <Badge className="bg-purple-100 text-purple-800 text-xs">Enhanced</Badge>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              Create native mobile apps with Flutter or Expo. Single codebase, multiple platforms.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                📱 iOS & Android
              </span>
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                🌐 Web Support
              </span>
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                ⚡ Hot Reload
              </span>
            </div>

            <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
              Create Mobile App
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </QuickCreateButton>
  );
}
