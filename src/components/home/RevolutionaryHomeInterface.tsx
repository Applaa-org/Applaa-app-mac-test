/**
 * Revolutionary Home Interface
 * 
 * Completely replaces the old dropdown-based approach with a stunning,
 * prominent app type selection interface right on the home page.
 */

import React, { useState, useCallback } from 'react';
import { 
  Sparkles, 
  Zap, 
  ArrowRight, 
  Infinity,
  Rocket,
  Star,
  TrendingUp,
  Users,
  Globe,
  Smartphone,
  Monitor,
  Server,
  Database,
  Gamepad2,
  Brain,
  ShoppingCart
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppTypeSelector } from './AppTypeSelector';
import { homeChatInputValueAtom } from '@/atoms/chatAtoms';
import { useAtom } from 'jotai';
import { HomeChatInput } from '@/components/chat/HomeChatInput';

// Re-enabled after fixing process.platform issues
import { MobileFrameworkPicker } from '@/components/mobile/MobileFrameworkPicker';
import { AppCreationWizard } from '@/components/creation/AppCreationWizard';
import type { Framework, TemplateOption, Platform } from '@/lib/mobile/types';

interface AppType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  gradient: string;
  lightBg: string;
  borderColor: string;
  textColor: string;
  popularity: number;
  frameworks: string[];
  examples: string[];
  buildTime: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  trending?: boolean;
  new?: boolean;
}

interface RevolutionaryHomeInterfaceProps {
  onChatSubmit?: (options?: any) => Promise<void>;
}

export function RevolutionaryHomeInterface({ onChatSubmit }: RevolutionaryHomeInterfaceProps) {
  const [inputValue, setInputValue] = useAtom(homeChatInputValueAtom);
  const [selectedAppType, setSelectedAppType] = useState<AppType | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isMobilePickerOpen, setIsMobilePickerOpen] = useState(false);

  // Handle chat submission
  const handleChatSubmit = useCallback(async (options?: any) => {
    console.log('[RevolutionaryHomeInterface] Chat submitted:', options);
    if (onChatSubmit) {
      await onChatSubmit(options);
    }
  }, [onChatSubmit]);

  // Handle app type selection
  const handleAppTypeSelect = useCallback((appType: AppType) => {
    console.log('[RevolutionaryHomeInterface] App type selected:', appType.name);
    setSelectedAppType(appType);

    // Route to appropriate creation flow
    if (appType.id === 'flutter-app' || appType.id === 'mobile-apps') {
      setIsMobilePickerOpen(true);
    } else if (appType.id === 'web-apps') {
      setIsWizardOpen(true);
    } else {
      // For other types, show coming soon message
      alert(`🚀 ${appType.name} Creation!\n\n${appType.description}\n\nThis feature is coming soon in Applaa!`);
      setSelectedAppType(null);
    }
  }, []);

  // Handle mobile selection
  const handleMobileSelection = useCallback((framework: Framework, template: TemplateOption, platforms: Platform[]) => {
    console.log('[RevolutionaryHomeInterface] Mobile selection completed:', { framework, template: template.id, platforms });
    setIsMobilePickerOpen(false);
    setSelectedAppType(null);
    // The mobile creation will be handled by the MobileFrameworkPicker
  }, []);

  // Handle wizard completion
  const handleWizardComplete = useCallback(() => {
    console.log('[RevolutionaryHomeInterface] Wizard completed');
    setIsWizardOpen(false);
    setSelectedAppType(null);
  }, []);

  // Handle close actions
  const handleMobilePickerClose = useCallback(() => {
    setIsMobilePickerOpen(false);
    setSelectedAppType(null);
  }, []);

  const handleWizardClose = useCallback(() => {
    setIsWizardOpen(false);
    setSelectedAppType(null);
  }, []);

  // Quick action buttons for popular choices
  const quickActions = [
    {
      id: 'react-app',
      name: 'React App',
      icon: '⚛️',
      gradient: 'from-blue-500 to-cyan-500',
      description: 'Modern web app with React',
      action: () => {
        // TODO: Quick React app creation
        alert('🚀 Creating React app with modern setup!');
      }
    },
    {
      id: 'flutter-app',
      name: 'Flutter App',
      icon: '💙',
      gradient: 'from-purple-500 to-pink-500',
      description: 'Cross-platform mobile app',
      action: () => {
        setIsMobilePickerOpen(true);
      }
    },
    {
      id: 'api-service',
      name: 'API Service',
      icon: '🚀',
      gradient: 'from-green-500 to-emerald-500',
      description: 'REST API with Node.js/Django',
      action: () => {
        // TODO: Quick API creation
        alert('🚀 Creating API service with best practices!');
      }
    },
    {
      id: 'wordpress-site',
      name: 'WordPress Site',
      icon: '📝',
      gradient: 'from-orange-500 to-red-500',
      description: 'CMS-powered website',
      action: () => {
        // TODO: Quick WordPress creation
        alert('🚀 Creating WordPress site with custom theme!');
      }
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section - No duplicate heading */}
      <div className="text-center space-y-6">
        {/* Subtitle only - main title is handled by the page */}
        <div className="space-y-2">
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose your app type below and let AI build it for you with the perfect framework and tools.
          </p>
        </div>

        {/* Revolutionary Stats */}
        <div className="flex flex-wrap justify-center gap-4">
          <Badge className="bg-blue-100 text-blue-800 text-sm px-4 py-2">
            <Globe className="h-4 w-4 mr-2" />
            100+ Frameworks
          </Badge>
          <Badge className="bg-green-100 text-green-800 text-sm px-4 py-2">
            <Rocket className="h-4 w-4 mr-2" />
            500+ Templates
          </Badge>
          <Badge className="bg-purple-100 text-purple-800 text-sm px-4 py-2">
            <Infinity className="h-4 w-4 mr-2" />
            Unlimited Possibilities
          </Badge>
          <Badge className="bg-orange-100 text-orange-800 text-sm px-4 py-2">
            <Star className="h-4 w-4 mr-2" />
            AI-Powered
          </Badge>
        </div>
      </div>

      {/* HEART OF APPLAA - Chat Control with Model Selection, Spark & Build */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            💬 Tell Applaa what you want to build
          </h2>
          <p className="text-gray-600">
            Use natural language to describe your app. Choose your AI model, enable Spark mode, and hit Build!
          </p>
        </div>
        
        {/* The HEART - HomeChatInput with all controls */}
        <HomeChatInput onSubmit={handleChatSubmit} />
      </div>

      {/* Prominent App Type Selector */}
      <AppTypeSelector 
        onTypeSelect={handleAppTypeSelect}
        className="max-w-7xl mx-auto"
      />

      {/* Quick Actions Section */}
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Or start with a popular choice
          </h2>
          <p className="text-gray-600">
            One-click creation for the most common app types
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Card
              key={action.id}
              className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-2 border-gray-200 hover:border-gray-300"
              onClick={action.action}
            >
              <CardContent className="p-4 text-center space-y-3">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${action.gradient}`}>
                  <span className="text-2xl">{action.icon}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{action.name}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
                <Button 
                  size="sm" 
                  className={`w-full bg-gradient-to-r ${action.gradient} hover:opacity-90 text-white`}
                >
                  <Zap className="h-3 w-3 mr-2" />
                  Quick Build
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Unlimited Possibilities Banner */}
      <div className="max-w-4xl mx-auto">
        <Card className="border-2 border-dashed border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Infinity className="h-6 w-6 text-purple-600" />
              <h3 className="text-xl font-bold text-purple-900">
                Need something else?
              </h3>
              <Infinity className="h-6 w-6 text-pink-600" />
            </div>
            <p className="text-purple-700 max-w-2xl mx-auto">
              We support <strong>ANY framework</strong> you can think of! 
              React, Vue, Angular, Django, FastAPI, Unity, Unreal, WordPress, Shopify, and 100+ more.
            </p>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              onClick={() => {
                setIsWizardOpen(true);
              }}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Build with ANY Framework
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Success Stories */}
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">
          Join thousands of builders creating amazing apps
        </h3>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span>50,000+ Apps Built</span>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span>95% Success Rate</span>
          </div>
          <div className="flex items-center space-x-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>4.9/5 Rating</span>
          </div>
        </div>
      </div>

      {/* Mobile Framework Picker */}
      <MobileFrameworkPicker
        isOpen={isMobilePickerOpen}
        onClose={handleMobilePickerClose}
        onSelection={handleMobileSelection}
        userPrompt={inputValue}
      />

      {/* App Creation Wizard */}
      <AppCreationWizard
        isOpen={isWizardOpen}
        onClose={handleWizardClose}
        onComplete={handleWizardComplete}
        userPrompt={inputValue}
      />
    </div>
  );
}
