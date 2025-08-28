import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Monitor, 
  Smartphone,
  ChevronDown,
  Sparkles,
  Globe,
  Database,
  ShoppingCart
} from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { IpcClient } from "@/ipc/ipc_client";
import { AppCreationWizard } from "@/components/creation/AppCreationWizard";
import { homeChatInputValueAtom } from "@/atoms/chatAtoms";
import { useAtom } from "jotai";

export type Platform = 'web' | 'mobile';
type ExtendedPlatform = Platform | 'advanced';

export function PlatformSelector() {
  const { settings } = useSettings();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('web');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardInitialCategory, setWizardInitialCategory] = useState<string | undefined>(undefined);
  const [inputValue] = useAtom(homeChatInputValueAtom);

  // Initialize from settings - check both selectedPlatform and selectedTemplateId
  useEffect(() => {
    if (settings?.selectedPlatform) {
      setSelectedPlatform(settings.selectedPlatform === 'expo' ? 'mobile' : 'web');
    } else if (settings?.selectedTemplateId) {
      // If no platform setting but template is set, infer platform from template
      const platform = settings.selectedTemplateId === 'expo-base-master' ? 'mobile' : 'web';
      setSelectedPlatform(platform);
    }
  }, [settings?.selectedPlatform, settings?.selectedTemplateId]);

  const handlePlatformChange = async (platform: ExtendedPlatform) => {
    if (platform === 'advanced') {
      // Open the advanced framework selection wizard
      setWizardInitialCategory(undefined);
      setIsWizardOpen(true);
      return;
    }

    if (platform === 'mobile') {
      // For mobile apps, directly select Expo since it's the only mobile framework for MVP
      setSelectedPlatform(platform as Platform);
      
      // Update settings with Expo as the mobile framework
      try {
        await IpcClient.getInstance().setUserSettings({
          selectedPlatform: 'expo',
          selectedTemplateId: 'expo-base-master'
        });
      } catch (error) {
        console.error('Failed to update platform setting:', error);
      }
      return;
    }

    setSelectedPlatform(platform as Platform);
    
    // Update settings with platform and appropriate template
    const templateId = platform === 'mobile' ? 'expo-base-master' : 'react';
    const platformSetting = platform === 'mobile' ? 'expo' : 'web';
    
    try {
      await IpcClient.getInstance().setUserSettings({
        selectedPlatform: platformSetting,
        selectedTemplateId: templateId
      });
    } catch (error) {
      console.error('Failed to update platform setting:', error);
    }
  };

  const handleWizardComplete = () => {
    setIsWizardOpen(false);
    setWizardInitialCategory(undefined);
    // Refresh apps list or navigate as needed
  };

  const getPlatformIcon = (platform: Platform | string) => {
    if (platform === 'web') return Monitor;
    if (platform === 'mobile') return Smartphone;
    return Monitor;
  };

  const getPlatformColor = (platform: Platform) => {
    return platform === 'web' ? 'text-orange-600' : 'text-green-600';
  };

  const getGradientClass = (platform: Platform) => {
    if (platform === 'web') {
      return selectedPlatform === 'web' 
        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' 
        : 'bg-background hover:bg-orange-50';
    } else {
      return selectedPlatform === 'mobile' 
        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
        : 'bg-background hover:bg-green-50';
    }
  };

  const PlatformIcon = getPlatformIcon(selectedPlatform);

  return (
    <>
      <Select value={selectedPlatform} onValueChange={handlePlatformChange}>
        <SelectTrigger className={`w-auto h-8 px-3 border transition-all duration-200 ${getGradientClass(selectedPlatform)}`}>
          <SelectValue asChild>
            <div className="flex items-center">
              <PlatformIcon className="h-4 w-4 mr-2" />
              <span className="capitalize">{selectedPlatform}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="web" className="cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-orange-100 rounded">
                <Monitor className="h-4 w-4 text-orange-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">Web App</span>
                <span className="text-xs text-muted-foreground">React.js • Next.js</span>
              </div>
            </div>
          </SelectItem>
          <SelectItem value="mobile" className="cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-green-100 rounded">
                <Smartphone className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">Mobile App</span>
                <span className="text-xs text-muted-foreground">Expo • React Native</span>
              </div>
            </div>
          </SelectItem>
          
          {/* Separator */}
          <div className="border-t my-1"></div>
          
          {/* REVOLUTIONARY: Unlimited Framework Selection */}
          <SelectItem value="advanced" className="cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">🚀 UNLIMITED App Builder</span>
                <span className="text-xs text-muted-foreground">ANY framework • React • Flutter • Django • Unity • WordPress • ANYTHING!</span>
              </div>
            </div>
          </SelectItem>
          
          {/* NOW AVAILABLE: Unlimited Possibilities */}
          <div className="px-2 py-1">
            <div className="text-xs font-medium text-green-600 mb-1">✨ NOW AVAILABLE - Build ANYTHING:</div>
            <div className="grid grid-cols-4 gap-1">
              <div className="flex flex-col items-center p-1 rounded-lg bg-green-50">
                <Database className="h-3 w-3 text-green-600 mb-1" />
                <span className="text-xs text-green-700">WordPress</span>
              </div>
              <div className="flex flex-col items-center p-1 rounded-lg bg-orange-50">
                <ShoppingCart className="h-3 w-3 text-orange-600 mb-1" />
                <span className="text-xs text-orange-700">E-commerce</span>
              </div>
              <div className="flex flex-col items-center p-1 rounded-lg bg-blue-50">
                <Globe className="h-3 w-3 text-blue-600 mb-1" />
                <span className="text-xs text-blue-700">APIs</span>
              </div>
              <div className="flex flex-col items-center p-1 rounded-lg bg-purple-50">
                <span className="text-xs">🎮</span>
                <span className="text-xs text-purple-700">Games</span>
              </div>
            </div>
            <div className="text-center mt-1">
              <span className="text-xs text-gray-600">+ React, Flutter, Django, Unity, Vue, Angular, Node.js, Python, and 100+ more!</span>
            </div>
          </div>
        </SelectContent>
      </Select>

      {/* Framework Selection Wizard */}
      <AppCreationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        userPrompt={inputValue}
        onComplete={handleWizardComplete}
        initialCategory={wizardInitialCategory}
      />
    </>
  );
}
