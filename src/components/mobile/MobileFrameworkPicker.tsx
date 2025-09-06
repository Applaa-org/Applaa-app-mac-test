/**
 * Mobile Framework Picker Component
 * 
 * A beautiful 2-step modal interface for selecting mobile frameworks and templates.
 * Features smart template recommendations, real-time environment validation,
 * and an intuitive user experience.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, ArrowLeft, ArrowRight, Smartphone, Zap, Settings, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTemplateRegistry, useTemplateRecommendations } from '@/hooks/mobile/useTemplateRegistry';
import { useFlutterEnvironment } from '@/hooks/mobile/useFlutterEnvironment';
import type { 
  Framework, 
  TemplateOption, 
  GenerationSpec, 
  Platform 
} from '@/lib/mobile/types';

/**
 * Props for the MobileFrameworkPicker component
 */
interface MobileFrameworkPickerProps {
  /** Whether the modal is open */
  isOpen: boolean;
  
  /** Function to close the modal */
  onClose: () => void;
  
  /** Function called when framework and template are selected */
  onSelect: (framework: Framework, template: TemplateOption, platforms: Platform[]) => void;
  
  /** User's prompt for smart recommendations */
  userPrompt?: string;
  
  /** Initially selected framework (optional) */
  initialFramework?: Framework;
  
  /** Whether to show the modal in compact mode */
  compact?: boolean;
}

/**
 * Framework information for the picker
 */
const FRAMEWORKS = [
  {
    id: 'expo' as Framework,
    name: 'Expo',
    description: 'The fastest way to build React Native apps with powerful tools and services',
    icon: '⚛️',
    features: [
      'React Native made easy',
      'Instant preview on device',
      'Over-the-air updates',
      'Rich development tools',
      'Cloud build services'
    ],
    platforms: ['android', 'ios', 'web'] as Platform[],
    difficulty: 'Beginner',
    popularity: 88,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  }
  // Flutter is disabled for MVP
  // {
  //   id: 'flutter' as Framework,
  //   name: 'Flutter',
  //   description: 'Google\'s UI toolkit for building beautiful, natively compiled applications',
  //   icon: '💙',
  //   features: [
  //     'Single codebase for all platforms',
  //     'Hot reload for fast development',
  //     'Rich widget ecosystem',
  //     'Native performance',
  //     'Material Design & Cupertino'
  //   ],
  //   platforms: ['android', 'ios', 'web', 'desktop'] as Platform[],
  //   difficulty: 'Intermediate',
  //   popularity: 95,
  //   color: 'bg-blue-500',
  //   lightColor: 'bg-blue-50',
  //   borderColor: 'border-blue-200'
  // }
];

/**
 * Main MobileFrameworkPicker component
 */
export function MobileFrameworkPicker({
  isOpen,
  onClose,
  onSelect,
  userPrompt = '',
  initialFramework,
  compact = false
}: MobileFrameworkPickerProps) {
  const [step, setStep] = useState<'framework' | 'template'>('framework');
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(initialFramework || null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);

  // Hooks
  const { filteredTemplates, isLoading: templatesLoading } = useTemplateRegistry({
    framework: selectedFramework || undefined
  });
  
  const { recommendations } = useTemplateRecommendations(userPrompt, selectedFramework || undefined);
  const { environmentStatus } = useFlutterEnvironment();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('framework');
      setSelectedFramework(initialFramework || null);
      setSelectedTemplate(null);
      setSelectedPlatforms([]);
    }
  }, [isOpen, initialFramework]);

  // Auto-advance to template step if framework is pre-selected
  useEffect(() => {
    if (selectedFramework && step === 'framework') {
      setStep('template');
    }
  }, [selectedFramework, step]);

  // Auto-select Expo since it's the only framework for MVP
  useEffect(() => {
    if (isOpen && !selectedFramework && FRAMEWORKS.length === 1) {
      setSelectedFramework('expo');
      setStep('template');
    }
  }, [isOpen, selectedFramework]);

  // Get framework info
  const selectedFrameworkInfo = useMemo(() => 
    selectedFramework ? FRAMEWORKS.find(f => f.id === selectedFramework) : null,
    [selectedFramework]
  );

  // Handle framework selection
  const handleFrameworkSelect = (framework: Framework) => {
    setSelectedFramework(framework);
    setStep('template');
    
    // Set default platforms for the framework
    const frameworkInfo = FRAMEWORKS.find(f => f.id === framework);
    if (frameworkInfo) {
      setSelectedPlatforms(frameworkInfo.platforms.slice(0, 2)); // Default to first 2 platforms
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: TemplateOption) => {
    if (selectedTemplate?.id === template.id) {
      // If clicking the same template, proceed to selection
      if (selectedFramework) {
        onSelect(selectedFramework, template, selectedPlatforms);
        onClose();
      }
    } else {
      // Select the template
      setSelectedTemplate(template);
    }
  };

  // Handle platform toggle
  const handlePlatformToggle = (platform: Platform) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platform)) {
        return prev.filter(p => p !== platform);
      } else {
        return [...prev, platform];
      }
    });
  };

  // Handle final selection
  const handleProceed = () => {
    if (selectedFramework && selectedTemplate) {
      onSelect(selectedFramework, selectedTemplate, selectedPlatforms);
      onClose();
    }
  };

  // Check if we can proceed
  const canProceed = selectedFramework && selectedTemplate && selectedPlatforms.length > 0;

  // Flutter environment warning for Flutter framework
  const showFlutterWarning = selectedFramework === 'flutter' && 
    environmentStatus.hasChecked && 
    !environmentStatus.isReady;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-hidden ${compact ? 'max-w-2xl' : ''}`}>
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {step === 'template' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('framework')}
                  className="mr-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <Smartphone className="h-5 w-5 text-blue-600" />
              <DialogTitle>
                {step === 'framework' ? 'Choose Mobile Framework' : 'Select Template'}
              </DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <DialogDescription>
            {step === 'framework' 
              ? 'Select the mobile framework that best fits your project needs and development experience.'
              : 'Choose a template to get started quickly with your mobile app development.'
            }
          </DialogDescription>
          
          {/* Progress indicator */}
          <div className="flex items-center space-x-2 mt-4">
            <div className="flex-1">
              <Progress value={step === 'framework' ? 50 : 100} className="h-2" />
            </div>
            <div className="text-sm text-gray-500 min-w-fit">
              Step {step === 'framework' ? '1' : '2'} of 2
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === 'framework' ? (
            <FrameworkSelection
              frameworks={FRAMEWORKS}
              onSelect={handleFrameworkSelect}
              userPrompt={userPrompt}
              compact={compact}
            />
          ) : (
            <TemplateSelection
              framework={selectedFramework!}
              frameworkInfo={selectedFrameworkInfo!}
              templates={filteredTemplates}
              recommendations={recommendations}
              selectedTemplate={selectedTemplate}
              selectedPlatforms={selectedPlatforms}
              onTemplateSelect={handleTemplateSelect}
              onPlatformToggle={handlePlatformToggle}
              templatesLoading={templatesLoading}
              showFlutterWarning={showFlutterWarning}
              environmentStatus={environmentStatus}
              compact={compact}
            />
          )}
        </div>

        {/* Footer */}
        {step === 'template' && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {selectedTemplate ? (
                  <span className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    Template selected
                  </span>
                ) : (
                  'Select a template to continue'
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('framework')}
                >
                  Back
                </Button>
                <Button
                  onClick={handleProceed}
                  disabled={!canProceed}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Create Project
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Framework Selection Step Component
 */
interface FrameworkSelectionProps {
  frameworks: typeof FRAMEWORKS;
  onSelect: (framework: Framework) => void;
  userPrompt: string;
  compact: boolean;
}

function FrameworkSelection({ frameworks, onSelect, userPrompt, compact }: FrameworkSelectionProps) {
  return (
    <div className="space-y-6">
      {userPrompt && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Based on your prompt:</h3>
          <p className="text-blue-700 text-sm italic">"{userPrompt}"</p>
        </div>
      )}

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {frameworks.map((framework) => (
          <Card
            key={framework.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${framework.borderColor} border-2`}
            onClick={() => onSelect(framework.id)}
          >
            <CardHeader className={framework.lightColor}>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{framework.icon}</div>
                  <div>
                    <CardTitle className="text-lg">{framework.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {framework.difficulty}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">Popularity</div>
                  <div className="text-lg font-bold text-green-600">{framework.popularity}%</div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <CardDescription className="text-sm leading-relaxed">
                {framework.description}
              </CardDescription>
              
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <Zap className="h-4 w-4 mr-1" />
                  Key Features
                </h4>
                <ul className="space-y-1">
                  {framework.features.slice(0, compact ? 3 : 5).map((feature, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-center">
                      <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Supported Platforms</h4>
                <div className="flex flex-wrap gap-1">
                  {framework.platforms.map((platform) => (
                    <Badge key={platform} variant="outline" className="text-xs">
                      {platform}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-gray-500">
        Choose the framework that best fits your project needs
      </div>
    </div>
  );
}

/**
 * Template Selection Step Component
 */
interface TemplateSelectionProps {
  framework: Framework;
  frameworkInfo: typeof FRAMEWORKS[0];
  templates: TemplateOption[];
  recommendations: TemplateOption[];
  selectedTemplate: TemplateOption | null;
  selectedPlatforms: Platform[];
  onTemplateSelect: (template: TemplateOption) => void;
  onPlatformToggle: (platform: Platform) => void;
  templatesLoading: boolean;
  showFlutterWarning: boolean;
  environmentStatus: any;
  compact: boolean;
}

function TemplateSelection({
  framework,
  frameworkInfo,
  templates,
  recommendations,
  selectedTemplate,
  selectedPlatforms,
  onTemplateSelect,
  onPlatformToggle,
  templatesLoading,
  showFlutterWarning,
  environmentStatus,
  compact
}: TemplateSelectionProps) {
  const displayTemplates = recommendations.length > 0 ? recommendations : templates.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Framework Summary */}
      <div className={`${frameworkInfo.lightColor} border ${frameworkInfo.borderColor} rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-xl">{frameworkInfo.icon}</div>
            <div>
              <h3 className="font-semibold">{frameworkInfo.name}</h3>
              <p className="text-sm text-gray-600">{frameworkInfo.description}</p>
            </div>
          </div>
          <Badge className={frameworkInfo.color}>Selected</Badge>
        </div>
      </div>

      {/* Flutter Environment Warning */}
      {showFlutterWarning && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium text-orange-800">Flutter environment needs attention:</p>
              <ul className="text-sm text-orange-700 list-disc list-inside space-y-1">
                {environmentStatus.issues.slice(0, 3).map((issue: string, index: number) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => window.open('https://docs.flutter.dev/get-started/install', '_blank')}
              >
                Install Flutter <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Platform Selection */}
      <div>
        <h3 className="font-medium mb-3 flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          Target Platforms
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {frameworkInfo.platforms.map((platform) => (
            <Button
              key={platform}
              variant={selectedPlatforms.includes(platform) ? "default" : "outline"}
              size="sm"
              onClick={() => onPlatformToggle(platform)}
              className="justify-start capitalize"
            >
              <span className="mr-2">
                {platform === 'android' && '🤖'}
                {platform === 'ios' && '🍎'}
                {platform === 'web' && '🌐'}
                {platform === 'desktop' && '💻'}
              </span>
              {platform}
            </Button>
          ))}
        </div>
      </div>

      {/* Template Selection */}
      <div>
        <h3 className="font-medium mb-3">
          {recommendations.length > 0 ? 'Recommended Templates' : 'Available Templates'}
        </h3>
        
        {templatesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {displayTemplates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedTemplate?.id === template.id
                    ? 'ring-2 ring-blue-500 border-blue-300'
                    : 'hover:border-gray-300'
                }`}
                onClick={() => onTemplateSelect(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{template.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                        {template.complexity && (
                          <Badge variant="secondary" className="text-xs">
                            Level {template.complexity}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {selectedTemplate?.id === template.id && (
                      <CheckCircle className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <CardDescription className="text-sm mb-3">
                    {template.description}
                  </CardDescription>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{template.setupTime}min setup</span>
                    <div className="flex space-x-1">
                      {template.platforms.slice(0, 3).map((platform) => (
                        <Badge key={platform} variant="outline" className="text-xs">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {recommendations.length > 0 && templates.length > recommendations.length && (
        <div className="text-center">
          <Button variant="outline" size="sm">
            View All {templates.length} Templates
          </Button>
        </div>
      )}
    </div>
  );
}


