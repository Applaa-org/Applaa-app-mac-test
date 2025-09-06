import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, Palette, Smartphone, Monitor } from 'lucide-react';

interface UIDesignPanelProps {
  appPrompt?: string;
  appName?: string;
  selectedAppId?: number;
  isAppBuilding?: boolean;
}

export function UIDesignPanel({ appPrompt, appName, selectedAppId, isAppBuilding }: UIDesignPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const designStyles = [
    { id: 'modern', name: 'Modern Minimalist', description: 'Clean lines, lots of whitespace' },
    { id: 'glassmorphism', name: 'Glassmorphism', description: 'Frosted glass effects, transparency' },
    { id: 'neumorphism', name: 'Neumorphism', description: 'Soft shadows, tactile feel' },
    { id: 'gradient', name: 'Gradient Vibes', description: 'Colorful gradients, vibrant' },
    { id: 'dark', name: 'Dark Mode', description: 'Dark theme, neon accents' },
    { id: 'retro', name: 'Retro Gaming', description: '80s aesthetic, pixel art vibes' }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          🎨 AI-Powered UI Design Generation
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Generate Dribbble-inspired mobile UI designs for your app.
        </p>
      </div>

      {/* Design Styles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Choose Design Style
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {designStyles.map((style) => (
              <button
                key={style.id}
                className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 text-left transition-colors"
              >
                <div className="font-medium text-sm">{style.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{style.description}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generation Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate UI Screens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button className="flex-1" disabled>
              <Smartphone className="w-4 h-4 mr-2" />
              Mobile Screens
              <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
            </Button>
            
            <Button variant="outline" className="flex-1" disabled>
              <Monitor className="w-4 h-4 mr-2" />
              Web Layouts
              <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
            </Button>
          </div>
          
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Palette className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">UI Design generation is coming soon!</p>
            <p className="text-xs mt-1">We're working on Dribbble-inspired mobile UI generation.</p>
          </div>
        </CardContent>
      </Card>

      {/* Building Notice */}
      {isAppBuilding && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Palette className="w-4 h-4" />
            <span className="text-sm font-medium">
              UI designs will be available while your app builds!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}