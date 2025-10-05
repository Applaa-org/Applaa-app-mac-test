import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';

export function InstallationProgressDemo() {
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);

  const mockInstallation = async () => {
    setIsInstalling(true);
    setProgress([]);

    const steps = [
      '🚀 Starting Android dependencies auto-installation...',
      '🖥️ Detected platform: darwin',
      '🍎 Installing on macOS...',
      '🔍 Checking for Homebrew...',
      '✅ Homebrew already installed',
      '☕ Installing Java (OpenJDK 11)...',
      '📥 Running: brew install openjdk@11',
      '📤 ==> Downloading openjdk@11',
      '📤 ==> Installing openjdk@11',
      '📤 ==> Pouring openjdk@11--11.0.20.8.catalina.bottle.tar.gz',
      '✅ Command completed successfully',
      '✅ Java (OpenJDK 11) installed successfully',
      '📱 Installing Android Studio...',
      '📥 Running: brew install --cask android-studio',
      '📤 ==> Downloading Android Studio',
      '📤 ==> Installing Android Studio',
      '📤 ==> Moving Android Studio to Applications',
      '✅ Command completed successfully',
      '✅ Android Studio installed successfully',
      '⚠️ Next step: Open Android Studio and install SDK/NDK through SDK Manager',
      '📋 SDK Manager → SDK Tools → Check "Android SDK Build-Tools" and "NDK"',
      '🔧 Setting up environment variables...',
      '✅ Environment variables configured',
      '🎉 Android installation completed successfully!',
      '📋 Installed: Java (OpenJDK 11), Android Studio'
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      setProgress(prev => [...prev, steps[i]]);
    }

    setIsInstalling(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Installation Progress Demo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={mockInstallation}
          disabled={isInstalling}
          className="w-full"
        >
          {isInstalling ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Installing Dependencies...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Start Mock Installation
            </>
          )}
        </Button>

        {progress.length > 0 && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Installation Progress:</h4>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {progress.map((line, index) => (
                <div key={index} className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
