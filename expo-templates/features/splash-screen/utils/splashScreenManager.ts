import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { useState, useEffect } from 'react';

export interface SplashScreenConfig {
  backgroundColor?: string;
  darkBackgroundColor?: string;
  iconPath?: string;
  darkIconPath?: string;
  imageWidth?: number;
  duration?: number;
  fade?: boolean;
}

export class SplashScreenManager {
  private static isConfigured = false;

  /**
   * Initialize splash screen with custom configuration
   */
  static async initialize(config?: SplashScreenConfig): Promise<void> {
    if (this.isConfigured) return;

    try {
      // Prevent auto-hide to control splash screen manually
      await SplashScreen.preventAutoHideAsync();

      // Set animation options
      SplashScreen.setOptions({
        duration: config?.duration || 1000,
        fade: config?.fade !== false, // Default to true
      });

      this.isConfigured = true;
      console.log('🎨 Splash screen initialized with custom config');

    } catch (error) {
      console.error('Failed to initialize splash screen:', error);
    }
  }

  /**
   * Hide splash screen with animation
   */
  static async hide(): Promise<void> {
    try {
      await SplashScreen.hideAsync();
      console.log('🎨 Splash screen hidden');
    } catch (error) {
      console.error('Failed to hide splash screen:', error);
    }
  }

  /**
   * Hide splash screen immediately without animation
   */
  static hideImmediate(): void {
    try {
      SplashScreen.hide();
      console.log('🎨 Splash screen hidden immediately');
    } catch (error) {
      console.error('Failed to hide splash screen immediately:', error);
    }
  }

  /**
   * Load custom fonts and hide splash screen when ready
   */
  static async loadResourcesAndHide(fonts?: Record<string, any>): Promise<void> {
    try {
      if (fonts) {
        console.log('🔤 Loading custom fonts...');
        await Font.loadAsync(fonts);
        console.log('✅ Custom fonts loaded');
      }

      // Add a small delay for smooth transition
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await this.hide();
    } catch (error) {
      console.error('Failed to load resources:', error);
      // Hide splash screen anyway to prevent indefinite loading
      await this.hide();
    }
  }

  /**
   * Create a splash screen configuration for app.json
   */
  static createConfig(options: SplashScreenConfig): any {
    return {
      backgroundColor: options.backgroundColor || '#ffffff',
      image: options.iconPath || './assets/splash-icon.png',
      imageWidth: options.imageWidth || 200,
      resizeMode: 'contain',
      ...(options.darkBackgroundColor || options.darkIconPath ? {
        dark: {
          backgroundColor: options.darkBackgroundColor || '#000000',
          image: options.darkIconPath || './assets/splash-icon-dark.png',
        }
      } : {})
    };
  }

  /**
   * Generate splash screen assets from app icon
   */
  static async generateSplashAssets(iconPath: string, backgroundColor: string = '#ffffff'): Promise<{
    lightSplash: string;
    darkSplash: string;
  }> {
    // In a real implementation, this would:
    // 1. Load the icon image
    // 2. Create a splash screen with the icon centered
    // 3. Generate both light and dark variants
    // 4. Save to assets folder
    
    // For now, return the paths where they would be saved
    return {
      lightSplash: './assets/splash-icon.png',
      darkSplash: './assets/splash-icon-dark.png'
    };
  }
}

/**
 * React hook for managing splash screen in components
 */
export function useSplashScreen(options?: {
  fonts?: Record<string, any>;
  hideDelay?: number;
}) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize splash screen
        await SplashScreenManager.initialize();

        // Load fonts if provided
        if (options?.fonts) {
          await Font.loadAsync(options.fonts);
        }

        // Add delay if specified
        if (options?.hideDelay) {
          await new Promise(resolve => setTimeout(resolve, options.hideDelay));
        }

        setIsReady(true);
      } catch (error) {
        console.error('Splash screen preparation failed:', error);
        setIsReady(true); // Set ready anyway to prevent infinite loading
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (isReady) {
      SplashScreenManager.hide();
    }
  }, [isReady]);

  return { isReady };
}

// Re-export for convenience
export { SplashScreen };
