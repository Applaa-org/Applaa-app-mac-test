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
  Monitor, 
  Smartphone,
  ChevronDown
} from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { IpcClient } from "@/ipc/ipc_client";

export type Platform = 'web' | 'mobile';

export function PlatformSelector() {
  const { settings } = useSettings();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('web');

  // Initialize from settings - check both selectedPlatform and selectedTemplateId
  useEffect(() => {
    if (settings?.selectedPlatform) {
      setSelectedPlatform(settings.selectedPlatform === 'expo' ? 'mobile' : 'web');
    } else if (settings?.selectedTemplateId) {
      // If no platform setting but template is set, infer platform from template
      const platform = settings.selectedTemplateId === 'expo-base-master' ? 'mobile' : 'web';
      setSelectedPlatform(platform);
      
      // Also update the settings to include the platform
      const platformSetting = platform === 'mobile' ? 'expo' : 'web';
      IpcClient.getInstance().setUserSettings({
        selectedPlatform: platformSetting,
      }).catch(error => {
        console.error('Failed to sync platform setting:', error);
      });
    }
  }, [settings?.selectedPlatform, settings?.selectedTemplateId]);

  const handlePlatformChange = async (platform: Platform) => {
    setSelectedPlatform(platform);
    
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

  const getPlatformIcon = (platform: Platform) => {
    return platform === 'web' ? Monitor : Smartphone;
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
      </SelectContent>
    </Select>
  );
}
