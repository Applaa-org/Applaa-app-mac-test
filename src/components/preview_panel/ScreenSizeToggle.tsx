import React from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

export interface ScreenSizePreset {
  id: ScreenSize;
  name: string;
  width: number;
  height: number;
  icon: React.ReactNode;
}

const SCREEN_SIZE_PRESETS: Record<ScreenSize, ScreenSizePreset> = {
  mobile: {
    id: 'mobile',
    name: 'Mobile',
    width: 375,
    height: 667,
    icon: <Smartphone className="w-5 h-5" />,
  },
  tablet: {
    id: 'tablet',
    name: 'Tablet',
    width: 768,
    height: 1024,
    icon: <Tablet className="w-5 h-5" />,
  },
  desktop: {
    id: 'desktop',
    name: 'Desktop',
    width: 1200,
    height: 800,
    icon: <Monitor className="w-5 h-5" />,
  },
};

interface ScreenSizeToggleProps {
  value: ScreenSize;
  onChange: (size: ScreenSize) => void;
  className?: string;
}

export function ScreenSizeToggle({ value, onChange, className }: ScreenSizeToggleProps) {
  const currentPreset = SCREEN_SIZE_PRESETS[value];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors",
            "flex items-center justify-center border-0 outline-none focus:outline-none",
            className
          )}
          title={`Screen Size: ${currentPreset.name} (${currentPreset.width}×${currentPreset.height})`}
        >
          {currentPreset.icon}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className={cn(
          "p-1.5 bg-white dark:bg-gray-900 rounded-lg",
          "!border-0 !shadow-none outline-none",
          "min-w-auto w-auto"
        )}
        align="end"
        sideOffset={4}
      >
        <div className="flex flex-row gap-0.5">
          {Object.values(SCREEN_SIZE_PRESETS).map((preset) => (
            <button
              key={preset.id}
              onClick={() => onChange(preset.id)}
              className={cn(
                "p-2 rounded transition-colors flex items-center justify-center",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                "border-0 outline-none focus:outline-none",
                "w-10 h-10",
                value === preset.id && "bg-gray-100 dark:bg-gray-800"
              )}
              title={`${preset.name} (${preset.width}×${preset.height})`}
            >
              {preset.icon}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function getScreenSizeDimensions(size: ScreenSize): { width: number; height: number } {
  return {
    width: SCREEN_SIZE_PRESETS[size].width,
    height: SCREEN_SIZE_PRESETS[size].height,
  };
}

