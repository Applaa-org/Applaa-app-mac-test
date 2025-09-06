import OpenAI from 'openai';

export interface UIDesignOptions {
  appType: string;
  appDescription: string;
  style?: 'modern' | 'minimal' | 'playful' | 'professional' | 'dark' | 'colorful';
  platform?: 'ios' | 'android' | 'universal';
  inspiration?: 'dribbble' | 'behance' | 'pinterest';
}

export interface GeneratedUIDesign {
  id: string;
  name: string;
  description: string;
  style: string;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  components: UIComponent[];
  layout: LayoutStructure;
  inspiration: string;
  timestamp: number;
}

export interface UIComponent {
  type: 'header' | 'navigation' | 'card' | 'button' | 'input' | 'list' | 'tab' | 'modal';
  name: string;
  props: Record<string, any>;
  styling: Record<string, any>;
}

export interface LayoutStructure {
  navigation: 'tab' | 'stack' | 'drawer';
  screens: ScreenLayout[];
}

export interface ScreenLayout {
  name: string;
  type: 'home' | 'list' | 'detail' | 'profile' | 'settings' | 'onboarding';
  components: string[];
  layout: 'vertical' | 'horizontal' | 'grid' | 'mixed';
}

export class SuperDesignUIGenerator {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Generate UI designs inspired by top mobile UI patterns from Dribbble
   */
  async generateUIDesigns(options: UIDesignOptions): Promise<GeneratedUIDesign[]> {
    const {
      appType,
      appDescription,
      style = 'modern',
      platform = 'universal',
      inspiration = 'dribbble'
    } = options;

    try {
      console.log(`🎨 Generating UI designs for ${appType} app...`);

      // Generate multiple design variations
      const designPromises = await Promise.all([
        this.generateSingleDesign(appDescription, 'modern-minimal', platform, inspiration),
        this.generateSingleDesign(appDescription, 'colorful-playful', platform, inspiration),
        this.generateSingleDesign(appDescription, 'professional-clean', platform, inspiration),
        this.generateSingleDesign(appDescription, 'dark-elegant', platform, inspiration),
      ]);

      const designs = designPromises.filter(design => design !== null) as GeneratedUIDesign[];
      
      console.log(`✅ Generated ${designs.length} UI design variations`);
      return designs;

    } catch (error) {
      console.error('❌ UI design generation failed:', error);
      throw new Error(`Failed to generate UI designs: ${error.message}`);
    }
  }

  /**
   * Generate a single UI design variation
   */
  private async generateSingleDesign(
    appDescription: string,
    styleVariant: string,
    platform: string,
    inspiration: string
  ): Promise<GeneratedUIDesign | null> {
    const prompt = this.createUIDesignPrompt(appDescription, styleVariant, platform, inspiration);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a world-class mobile UI/UX designer specializing in creating stunning mobile app interfaces inspired by top designs from Dribbble, Behance, and modern design trends. You understand React Native, Expo, and mobile design patterns perfectly.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 2000,
      });

      const designContent = response.choices[0]?.message?.content;
      if (!designContent) {
        throw new Error('No design content generated');
      }

      // Parse the AI response into structured design data
      const design = this.parseDesignResponse(designContent, styleVariant);
      return design;

    } catch (error) {
      console.error(`Failed to generate ${styleVariant} design:`, error);
      return null;
    }
  }

  /**
   * Create a comprehensive prompt for UI design generation
   */
  private createUIDesignPrompt(
    appDescription: string,
    styleVariant: string,
    platform: string,
    inspiration: string
  ): string {
    const dribbbleInspiredPatterns = {
      'modern-minimal': 'Clean white backgrounds, subtle shadows, plenty of whitespace, iOS-style blur effects, minimal color palette with one accent color',
      'colorful-playful': 'Vibrant gradients, rounded corners, playful illustrations, bright color combinations, fun micro-interactions',
      'professional-clean': 'Corporate blue/gray palette, structured layouts, clear typography hierarchy, professional iconography',
      'dark-elegant': 'Dark theme with neon accents, glassmorphism effects, premium feel, sophisticated color combinations'
    };

    const mobileUIPatterns = [
      'Bottom tab navigation with 4-5 main sections',
      'Card-based layouts with subtle shadows and rounded corners',
      'Floating action buttons for primary actions',
      'Pull-to-refresh functionality',
      'Swipe gestures for navigation and actions',
      'Modal overlays for secondary actions',
      'Search bars with recent searches',
      'Profile sections with avatar and stats',
      'List items with leading icons and trailing actions',
      'Onboarding screens with illustrations'
    ];

    return `
Create a comprehensive mobile UI design for: "${appDescription}"

Style Variant: ${styleVariant}
Platform: ${platform}
Inspiration: Top ${inspiration} mobile designs

Design Requirements:
1. **Visual Style**: ${dribbbleInspiredPatterns[styleVariant]}
2. **Mobile Patterns**: Incorporate these proven patterns: ${mobileUIPatterns.slice(0, 5).join(', ')}
3. **Color Psychology**: Choose colors that match the app's purpose and target audience
4. **Typography**: Modern, readable fonts with clear hierarchy
5. **Iconography**: Consistent icon style throughout the app
6. **Spacing**: Proper padding, margins, and visual rhythm
7. **Accessibility**: High contrast ratios and touch-friendly sizes

Please provide a detailed JSON response with this exact structure:
{
  "name": "Design Name",
  "description": "Brief description of the design concept",
  "style": "${styleVariant}",
  "colorPalette": {
    "primary": "#hex",
    "secondary": "#hex", 
    "accent": "#hex",
    "background": "#hex",
    "surface": "#hex",
    "text": "#hex"
  },
  "components": [
    {
      "type": "header|navigation|card|button|input|list|tab|modal",
      "name": "Component Name",
      "props": {"key": "value"},
      "styling": {"backgroundColor": "#hex", "borderRadius": 8}
    }
  ],
  "layout": {
    "navigation": "tab|stack|drawer",
    "screens": [
      {
        "name": "Screen Name",
        "type": "home|list|detail|profile|settings|onboarding",
        "components": ["component1", "component2"],
        "layout": "vertical|horizontal|grid|mixed"
      }
    ]
  },
  "inspiration": "Specific design inspiration or reference"
}

Focus on creating a design that would get thousands of likes on Dribbble - make it visually stunning, user-friendly, and modern!
`;
  }

  /**
   * Parse AI response into structured design data
   */
  private parseDesignResponse(content: string, styleVariant: string): GeneratedUIDesign {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const designData = JSON.parse(jsonMatch[0]);
      
      return {
        id: `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: designData.name || `${styleVariant} Design`,
        description: designData.description || 'AI-generated mobile UI design',
        style: styleVariant,
        colorPalette: designData.colorPalette || this.getDefaultColorPalette(styleVariant),
        components: designData.components || [],
        layout: designData.layout || this.getDefaultLayout(),
        inspiration: designData.inspiration || 'Modern mobile design trends',
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('Failed to parse design response:', error);
      
      // Return a fallback design
      return this.createFallbackDesign(styleVariant);
    }
  }

  /**
   * Get default color palette for style variant
   */
  private getDefaultColorPalette(styleVariant: string) {
    const palettes = {
      'modern-minimal': {
        primary: '#007AFF',
        secondary: '#5856D6',
        accent: '#FF3B30',
        background: '#FFFFFF',
        surface: '#F2F2F7',
        text: '#000000'
      },
      'colorful-playful': {
        primary: '#FF6B6B',
        secondary: '#4ECDC4',
        accent: '#45B7D1',
        background: '#FFFFFF',
        surface: '#F8F9FA',
        text: '#2C3E50'
      },
      'professional-clean': {
        primary: '#2C3E50',
        secondary: '#3498DB',
        accent: '#E74C3C',
        background: '#FFFFFF',
        surface: '#ECF0F1',
        text: '#2C3E50'
      },
      'dark-elegant': {
        primary: '#BB86FC',
        secondary: '#03DAC6',
        accent: '#CF6679',
        background: '#121212',
        surface: '#1E1E1E',
        text: '#FFFFFF'
      }
    };

    return palettes[styleVariant] || palettes['modern-minimal'];
  }

  /**
   * Get default layout structure
   */
  private getDefaultLayout(): LayoutStructure {
    return {
      navigation: 'tab',
      screens: [
        {
          name: 'Home',
          type: 'home',
          components: ['header', 'card', 'list'],
          layout: 'vertical'
        },
        {
          name: 'Profile',
          type: 'profile',
          components: ['header', 'card', 'button'],
          layout: 'vertical'
        }
      ]
    };
  }

  /**
   * Create fallback design when parsing fails
   */
  private createFallbackDesign(styleVariant: string): GeneratedUIDesign {
    return {
      id: `fallback_${Date.now()}`,
      name: `${styleVariant} Design`,
      description: 'Clean and modern mobile UI design',
      style: styleVariant,
      colorPalette: this.getDefaultColorPalette(styleVariant),
      components: [
        {
          type: 'header',
          name: 'App Header',
          props: { title: 'App Name' },
          styling: { backgroundColor: '#FFFFFF', height: 60 }
        },
        {
          type: 'button',
          name: 'Primary Button',
          props: { title: 'Get Started' },
          styling: { backgroundColor: '#007AFF', borderRadius: 8 }
        }
      ],
      layout: this.getDefaultLayout(),
      inspiration: 'Modern mobile design patterns',
      timestamp: Date.now(),
    };
  }

  /**
   * Generate design variations for specific app types
   */
  async generateAppTypeDesigns(appType: string, appDescription: string): Promise<GeneratedUIDesign[]> {
    const appTypeStyles = {
      fitness: ['energetic-vibrant', 'clean-minimal', 'dark-premium'],
      social: ['playful-colorful', 'modern-clean', 'trendy-gradient'],
      productivity: ['professional-clean', 'minimal-focused', 'dark-productive'],
      ecommerce: ['trustworthy-clean', 'premium-elegant', 'friendly-approachable'],
      education: ['inspiring-bright', 'focused-minimal', 'playful-engaging'],
      entertainment: ['vibrant-fun', 'dark-cinematic', 'colorful-energetic']
    };

    const styles = appTypeStyles[appType] || ['modern-minimal', 'colorful-playful', 'professional-clean'];
    
    const designs = await Promise.all(
      styles.map(style => 
        this.generateSingleDesign(appDescription, style, 'universal', 'dribbble')
      )
    );

    return designs.filter(design => design !== null) as GeneratedUIDesign[];
  }
}

/**
 * Utility function to create UI generator instance
 */
export function createUIGenerator(apiKey: string): SuperDesignUIGenerator {
  return new SuperDesignUIGenerator(apiKey);
}

/**
 * Pre-defined UI design templates for quick generation
 */
export const UI_DESIGN_TEMPLATES = {
  fitness: {
    description: "Fitness tracking app with workout plans and progress monitoring",
    keywords: ["energetic", "motivational", "progress tracking", "vibrant colors"]
  },
  social: {
    description: "Social media app for connecting and sharing with friends",
    keywords: ["friendly", "engaging", "colorful", "interactive"]
  },
  productivity: {
    description: "Task management and productivity app for professionals",
    keywords: ["clean", "organized", "efficient", "minimal"]
  },
  ecommerce: {
    description: "Shopping app with product catalog and secure checkout",
    keywords: ["trustworthy", "clean", "product-focused", "conversion-optimized"]
  },
  education: {
    description: "Learning platform with courses and interactive content",
    keywords: ["inspiring", "knowledge-focused", "engaging", "accessible"]
  },
  entertainment: {
    description: "Entertainment app with media content and social features",
    keywords: ["fun", "engaging", "media-rich", "immersive"]
  }
};
