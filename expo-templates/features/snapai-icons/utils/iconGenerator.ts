import OpenAI from 'openai';
import * as FileSystem from 'expo-file-system';

export interface IconGenerationOptions {
  prompt: string;
  model?: 'gpt-image-1' | 'dall-e-3' | 'dall-e-2';
  size?: '1024x1024' | '1536x1024' | '1024x1536' | '1792x1024' | '1024x1792' | '256x256' | '512x512';
  quality?: 'auto' | 'high' | 'medium' | 'low' | 'standard' | 'hd';
  numImages?: number;
  style?: 'vivid' | 'natural';
}

export interface GeneratedIcon {
  id: string;
  url: string;
  localPath?: string;
  prompt: string;
  model: string;
  size: string;
  timestamp: number;
}

export class SnapAIIconGenerator {
  private openai: OpenAI;
  private iconsDirectory: string;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
    this.iconsDirectory = FileSystem.documentDirectory + 'generated-icons/';
    this.ensureIconsDirectory();
  }

  private async ensureIconsDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.iconsDirectory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.iconsDirectory, { intermediates: true });
    }
  }

  /**
   * Generate app icons using AI based on the app description/prompt
   */
  async generateAppIcons(options: IconGenerationOptions): Promise<GeneratedIcon[]> {
    const {
      prompt,
      model = 'gpt-image-1',
      size = '1024x1024',
      quality = 'auto',
      numImages = 4,
      style = 'vivid'
    } = options;

    // Enhanced prompt for better app icon generation
    const enhancedPrompt = this.enhanceIconPrompt(prompt);

    try {
      console.log(`🎨 Generating ${numImages} app icons with ${model}...`);
      
      let response;
      
      if (model === 'dall-e-3') {
        // DALL-E 3 only supports 1 image at a time
        const icons: GeneratedIcon[] = [];
        for (let i = 0; i < Math.min(numImages, 1); i++) {
          const singleResponse = await this.openai.images.generate({
            model: 'dall-e-3',
            prompt: enhancedPrompt,
            size: size as any,
            quality: quality === 'auto' ? 'standard' : quality as any,
            style,
            n: 1,
          });
          
          if (singleResponse.data[0]?.url) {
            const icon = await this.downloadAndSaveIcon(
              singleResponse.data[0].url,
              prompt,
              model,
              size,
              i
            );
            icons.push(icon);
          }
        }
        return icons;
      } else if (model === 'dall-e-2') {
        response = await this.openai.images.generate({
          model: 'dall-e-2',
          prompt: enhancedPrompt,
          size: size as any,
          n: Math.min(numImages, 10),
        });
      } else {
        // GPT-Image-1 (when available) or fallback to DALL-E 3
        response = await this.openai.images.generate({
          model: 'dall-e-3', // Fallback since GPT-Image-1 might not be available
          prompt: enhancedPrompt,
          size: size as any,
          quality: quality === 'auto' ? 'standard' : quality as any,
          style,
          n: 1,
        });
      }

      // Download and save all generated icons
      const icons: GeneratedIcon[] = [];
      for (let i = 0; i < response.data.length; i++) {
        const imageData = response.data[i];
        if (imageData.url) {
          const icon = await this.downloadAndSaveIcon(
            imageData.url,
            prompt,
            model,
            size,
            i
          );
          icons.push(icon);
        }
      }

      console.log(`✅ Generated ${icons.length} app icons successfully`);
      return icons;

    } catch (error) {
      console.error('❌ Icon generation failed:', error);
      throw new Error(`Failed to generate icons: ${error.message}`);
    }
  }

  /**
   * Enhance the user prompt for better app icon generation
   */
  private enhanceIconPrompt(userPrompt: string): string {
    const iconEnhancements = [
      "mobile app icon",
      "clean and modern design",
      "simple and recognizable",
      "suitable for iOS and Android",
      "professional appearance",
      "centered composition",
      "solid background or transparent",
      "high contrast",
      "scalable design"
    ];

    // Check if prompt already mentions "icon" or "app"
    const hasIconContext = /\b(icon|app|logo|symbol)\b/i.test(userPrompt);
    
    if (hasIconContext) {
      return `${userPrompt}, ${iconEnhancements.slice(1).join(', ')}`;
    } else {
      return `${iconEnhancements[0]} for ${userPrompt}, ${iconEnhancements.slice(1).join(', ')}`;
    }
  }

  /**
   * Download and save icon locally
   */
  private async downloadAndSaveIcon(
    url: string,
    prompt: string,
    model: string,
    size: string,
    index: number
  ): Promise<GeneratedIcon> {
    const timestamp = Date.now();
    const filename = `icon_${timestamp}_${index}.png`;
    const localPath = this.iconsDirectory + filename;

    try {
      // Download the image
      const downloadResult = await FileSystem.downloadAsync(url, localPath);
      
      const icon: GeneratedIcon = {
        id: `${timestamp}_${index}`,
        url,
        localPath: downloadResult.uri,
        prompt,
        model,
        size,
        timestamp,
      };

      return icon;
    } catch (error) {
      console.error(`Failed to download icon ${index}:`, error);
      // Return without local path if download fails
      return {
        id: `${timestamp}_${index}`,
        url,
        prompt,
        model,
        size,
        timestamp,
      };
    }
  }

  /**
   * Generate icons specifically optimized for different platforms
   */
  async generatePlatformIcons(appDescription: string): Promise<{
    ios: GeneratedIcon[];
    android: GeneratedIcon[];
    universal: GeneratedIcon[];
  }> {
    const basePrompt = appDescription;

    const [iosIcons, androidIcons, universalIcons] = await Promise.all([
      // iOS-optimized icons (rounded corners, iOS style)
      this.generateAppIcons({
        prompt: `${basePrompt}, iOS app icon style, rounded corners, clean minimal design`,
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'hd',
        numImages: 2,
      }),
      
      // Android-optimized icons (adaptive icon style)
      this.generateAppIcons({
        prompt: `${basePrompt}, Android app icon style, adaptive icon design, material design`,
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'hd',
        numImages: 2,
      }),
      
      // Universal icons (work well on both platforms)
      this.generateAppIcons({
        prompt: `${basePrompt}, universal app icon, works on iOS and Android, simple and scalable`,
        model: 'dall-e-2',
        size: '1024x1024',
        numImages: 4,
      }),
    ]);

    return {
      ios: iosIcons,
      android: androidIcons,
      universal: universalIcons,
    };
  }

  /**
   * Get all previously generated icons
   */
  async getGeneratedIcons(): Promise<GeneratedIcon[]> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.iconsDirectory);
      const iconFiles = files.filter(file => file.endsWith('.png'));
      
      // Create icon objects from files (basic info only)
      const icons: GeneratedIcon[] = iconFiles.map(filename => {
        const timestamp = parseInt(filename.split('_')[1]) || Date.now();
        return {
          id: filename.replace('.png', ''),
          url: '',
          localPath: this.iconsDirectory + filename,
          prompt: 'Previously generated',
          model: 'unknown',
          size: '1024x1024',
          timestamp,
        };
      });

      return icons.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to get generated icons:', error);
      return [];
    }
  }

  /**
   * Clear all generated icons
   */
  async clearGeneratedIcons(): Promise<void> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.iconsDirectory);
      await Promise.all(
        files.map(file => 
          FileSystem.deleteAsync(this.iconsDirectory + file, { idempotent: true })
        )
      );
      console.log('🗑️ Cleared all generated icons');
    } catch (error) {
      console.error('Failed to clear icons:', error);
    }
  }
}

/**
 * Utility function to create icon generator instance
 */
export function createIconGenerator(apiKey: string): SnapAIIconGenerator {
  return new SnapAIIconGenerator(apiKey);
}

/**
 * Default icon generation presets for common app types
 */
export const ICON_PRESETS = {
  fitness: "fitness and health app, dumbbell or heart icon, energetic colors",
  social: "social media app, chat bubbles or people icons, friendly colors",
  productivity: "productivity app, checkmark or calendar icon, professional colors",
  gaming: "mobile game, playful and fun design, vibrant colors",
  ecommerce: "shopping app, shopping bag or cart icon, trustworthy colors",
  education: "educational app, book or graduation cap icon, inspiring colors",
  finance: "financial app, dollar sign or graph icon, professional and secure",
  travel: "travel app, airplane or map icon, adventurous colors",
  food: "food delivery app, fork and knife or chef hat icon, appetizing colors",
  music: "music app, musical note or headphones icon, creative colors",
  photo: "photo editing app, camera or image icon, creative and modern",
  weather: "weather app, sun and cloud icon, natural colors",
};
