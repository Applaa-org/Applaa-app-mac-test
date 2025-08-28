import { ipcMain } from "electron";
import log from "electron-log";
import { readSettings } from "../../main/settings";
import { getModelClient } from "../utils/get_model_client";
import { generateText } from "ai";
import type { LargeLanguageModel } from "../../lib/schemas";

const logger = log.scope("prompt_optimization_handlers");

export interface OptimizePromptParams {
  originalPrompt: string;
  selectedModel: LargeLanguageModel;
  appType?: "web" | "mobile" | "expo"; // Add app type parameter
}

export interface OptimizePromptResponse {
  optimizedPrompt: string;
  originalPrompt: string;
}

const WEBAPP_ENHANCEMENT_TEMPLATE = `Create a [USER_CONCEPT] web application with ultra-modern, dynamic design inspired by trending Dribbble UI patterns and contemporary web design aesthetics. The color scheme should intelligently adapt based on the concept theme:

DYNAMIC COLOR SCHEMES BY CONCEPT:

Food/Recipes: Warm appetite-stimulating gradients (orange-red, golden-yellow, coral-pink)
Health/Fitness/Workouts: Energetic vibrant colors (electric blue-green, lime-orange, purple-cyan)
Meditation/Wellness/Spirituality: Calming earth tones (sage-lavender, teal-mint, soft purple-pink)
E-commerce/Business/Professional: Premium sophisticated gradients (navy-gold, charcoal-blue, emerald-teal)
Kids/Children: Playful bright colors (rainbow gradients, bubblegum pink-blue, sunny yellow-orange)
Women's Fashion/Jewelry: Elegant feminine tones (rose gold-blush, champagne-lavender, coral-peach)
Senior/Mature Audience: Refined muted gradients (sage-cream, dusty blue-gold, warm gray-teal)
Gen Z/Youth: Bold trending colors (neon gradients, electric pink-cyan, vibrant purple-lime)
Tech/SaaS: Modern tech aesthetics (dark mode ready, electric blue-purple, sleek gray-cyan)
Finance/Investment: Professional trust colors (deep blue-gold, forest green-silver, navy-platinum)

MODERN DESIGN INSPIRATION (Dribbble-style):

Contemporary card layouts with asymmetric grids and creative spacing
Trending micro-interactions and delightful hover animations
Modern glassmorphism and neumorphism elements where appropriate
Creative typography mixing (sans-serif headers, elegant body fonts)
Innovative navigation patterns (floating menus, morphing tabs, gesture-based)
Advanced visual hierarchy with creative use of whitespace
Trending UI components (floating action buttons, card carousels, infinite scroll)
Modern iconography with custom SVG illustrations matching the theme
Progressive web app features (smooth transitions, app-like experience)

MANDATORY TEXT VISIBILITY & CONTRAST REQUIREMENTS:

ALL text MUST have perfect readability with dynamic contrast adjustment based on background
Smart text color switching: white text on dark gradients, dark text on light gradients
Adaptive text shadows that automatically adjust intensity based on background luminosity
Search and form inputs with intelligent background opacity and contrast
Dynamic overlay systems that ensure 4.5:1+ contrast ratio across all color combinations
Context-aware button styling with theme-appropriate hover states
Responsive text sizing that maintains readability across all devices

ADVANCED FEATURES:

4-6 intelligently organized sections with smooth page transitions
Rich, contextually relevant mock data (12-20 items per section)
Advanced search with filters, categories, and real-time results
Mobile-first responsive design with gesture navigation
Loading states, skeleton screens, and progressive enhancement
Accessibility compliance (ARIA labels, keyboard navigation, screen reader friendly)
Performance optimized with smooth 60fps animations

🖼️ **CRITICAL: Image Sources & Mock Data Guidelines**

**✅ APPROVED FREE IMAGE SOURCES (NO LICENSE ISSUES):**
- **Unsplash**: https://images.unsplash.com/photo-[id]?w=400&h=300&fit=crop
- **Pixabay**: https://cdn.pixabay.com/photo/[year]/[month]/[day]/[id]_640.jpg  
- **Pexels**: https://images.pexels.com/photos/[id]/pexels-photo-[id].jpeg?w=400&h=300&fit=crop
- **Picsum**: https://picsum.photos/400/300?random=[number] (for generic placeholders)

**🚫 NEVER USE:** Getty Images, Shutterstock, copyrighted images, or broken URLs

**📝 DETAILED MOCK DATA REQUIREMENTS:**
For EVERY list item, create both:
1. **Main List View**: 12-20 items with thumbnails, titles, brief descriptions
2. **Detailed Single Pages**: For EACH item, create comprehensive detail pages with:
   - Hero image (high-quality from approved sources)
   - Full description (3-4 paragraphs of realistic content)
   - Specifications/Details relevant to the item type
   - Related items or recommendations
   - Action buttons (Buy, Contact, Save, Share, etc.)
   - Reviews/Ratings with realistic user feedback
   - Image gallery (3-5 additional images)

**🎯 CONTENT QUALITY:** NO Lorem Ipsum - Use realistic, industry-specific, engaging content with professional tone and clear call-to-actions`;

const MOBILE_ENHANCEMENT_TEMPLATE = `Create a [USER_CONCEPT] mobile app with ultra-modern, dynamic design inspired by trending Dribbble mobile UI patterns (https://dribbble.com/shots/popular/mobile) and award-winning mobile app aesthetics. The color scheme and interface should intelligently adapt based on the concept theme:

DYNAMIC COLOR SCHEMES BY CONCEPT:

Food/Recipes: Warm appetite-stimulating gradients (orange-red, golden-yellow, coral-pink)
Health/Fitness/Workouts: Energetic vibrant colors (electric blue-green, lime-orange, purple-cyan)
Meditation/Wellness/Spirituality: Calming earth tones (sage-lavender, teal-mint, soft purple-pink)
E-commerce/Shopping: Premium sophisticated gradients (navy-gold, charcoal-blue, emerald-teal)
Kids/Children: Playful bright colors (rainbow gradients, bubblegum pink-blue, sunny yellow-orange)
Women's Fashion/Beauty: Elegant feminine tones (rose gold-blush, champagne-lavender, coral-peach)
Senior/Mature Audience: Refined muted gradients (sage-cream, dusty blue-gold, warm gray-teal)
Gen Z/Youth: Bold trending colors (neon gradients, electric pink-cyan, vibrant purple-lime)
Tech/Productivity: Modern sleek aesthetics (dark mode ready, electric blue-purple, sleek gray-cyan)
Finance/Investment: Professional trust colors (deep blue-gold, forest green-silver, navy-platinum)

DRIBBBLE-INSPIRED MOBILE DESIGN PATTERNS:

Creative card compositions with asymmetric layouts and artistic spacing
Innovative navigation concepts (morphing tab bars, floating menus, gesture-driven interfaces)
Award-winning onboarding flows with creative illustrations and animations
Artistic use of white space and visual hierarchy inspired by top Dribbble shots
Creative button designs with unique shapes, gradients, and hover states
Innovative data visualization with custom charts and interactive elements
Modern typography combinations mixing bold headers with elegant body fonts
Creative use of shadows, depth, and layering effects
Trending mobile interactions (swipe patterns, drag gestures, pinch-to-zoom)
Artistic color blocking and gradient transitions between screens
Custom illustration styles and icon systems matching the app theme
Creative loading animations and micro-interactions that delight users

CUTTING-EDGE MOBILE UX PATTERNS:

Bottom sheet designs with creative handles and peek behaviors
Floating elements that respond to scroll and gesture interactions
Creative search interfaces with animated suggestions and filters
Innovative profile and settings screens with personality
Modern list designs with creative separators and grouping
Artistic empty states and error screens with custom illustrations
Creative notification designs and alert patterns
Innovative modal and overlay designs with artistic backdrops

MANDATORY TEXT VISIBILITY & MOBILE ACCESSIBILITY:

ALL text MUST have perfect readability with mobile-optimized contrast ratios
Smart text color adaptation with artistic flair while maintaining accessibility
Creative text treatments (outlined text, gradient text, shadowed text) that remain readable
Touch-friendly text sizes (minimum 16px) with artistic typography hierarchy
High contrast mode compatibility and dynamic text sizing support
Form inputs with creative styling while maintaining clear readability
Dynamic overlay systems ensuring 4.5:1+ contrast across all artistic color combinations
Creative but readable placeholder text and labels

DRIBBBLE-LEVEL VISUAL EXCELLENCE:

Award-worthy animations with creative transitions and delightful micro-interactions
Custom iconography with artistic styling that matches the app's visual identity
Creative use of gradients, shadows, and visual effects inspired by top mobile designs
Artistic composition with creative use of negative space and visual balance
Innovative color application with artistic gradients and color transitions
Custom illustration integration that enhances the user experience
Creative photography integration and image treatment styles
Artistic dark/light mode implementations with smooth, creative transitions

ADVANCED FEATURES:

4-6 main screens with creative navigation patterns inspired by award-winning apps
Rich, contextually relevant mock data (15-25 items) with creative presentation
Innovative search and filter interfaces with artistic animations
Creative gesture-based interactions and haptic feedback integration
Artistic loading states and skeleton screens with brand personality
Creative responsive layouts optimized for various screen sizes
Innovative sharing and social features with artistic presentation

🖼️ **CRITICAL: Image Sources & Mock Data Guidelines**

**✅ APPROVED FREE IMAGE SOURCES (NO LICENSE ISSUES):**
- **Unsplash**: https://images.unsplash.com/photo-[id]?w=400&h=300&fit=crop
- **Pixabay**: https://cdn.pixabay.com/photo/[year]/[month]/[day]/[id]_640.jpg
- **Pexels**: https://images.pexels.com/photos/[id]/pexels-photo-[id].jpeg?w=400&h=300&fit=crop
- **Picsum**: https://picsum.photos/400/300?random=[number] (for generic placeholders)

**🚫 NEVER USE:** Getty Images, Shutterstock, copyrighted images, or broken URLs

**📝 DETAILED MOCK DATA REQUIREMENTS:**
For EVERY list item, create both:
1. **Main List View**: 15-25 items with thumbnails, titles, brief descriptions
2. **Detailed Single Screens**: For EACH item, create comprehensive detail screens with:
   - Hero image (high-quality from approved sources)
   - Full description (3-4 paragraphs of realistic content)
   - Specifications/Details relevant to the item type
   - Related items or recommendations
   - Action buttons (Buy, Contact, Save, Share, etc.)
   - Reviews/Ratings with realistic user feedback
   - Image gallery (3-5 additional images with swipe navigation)

**🎯 CONTENT QUALITY:** NO Lorem Ipsum - Use realistic, industry-specific, engaging content with professional tone and clear call-to-actions`;

export function registerPromptOptimizationHandlers() {
  ipcMain.handle(
    "prompt:optimize",
    async (event, params: OptimizePromptParams): Promise<OptimizePromptResponse> => {
      try {
        logger.log("Optimizing prompt using LLM for:", params.originalPrompt);
        
        const settings = readSettings();
        const { modelClient } = await getModelClient(params.selectedModel, settings);

        // Select enhancement template based on app type
        let enhancementTemplate: string;
        let systemPrompt: string;
        
        if (params.appType === "mobile" || params.appType === "expo") {
          enhancementTemplate = MOBILE_ENHANCEMENT_TEMPLATE;
          systemPrompt = `You are a prompt optimization expert specializing in creating stunning mobile applications with ultra-modern, Dribbble-inspired mobile design.

CRITICAL MISSION: Transform EVERY user request into a beautiful, modern mobile application with world-class UI/UX design.

AUTOMATIC ENHANCEMENT RULES:
1. ALWAYS apply the mobile enhancement template - no exceptions
2. Even simple 1-2 word prompts get full enhancement treatment
3. Replace [USER_CONCEPT] with the user's concept (expand if needed)
4. Add rich context and features based on the concept
5. Apply appropriate color schemes and modern design patterns
6. Include comprehensive mock data and interactive features

MOBILE ENHANCEMENT TEMPLATE:
${MOBILE_ENHANCEMENT_TEMPLATE}

EXAMPLES:
- "todo app" → Full template with task management features, modern mobile UI
- "garden center" → Full template with plants, accessories, knowledge base
- "fitness tracker" → Full template with workouts, progress tracking, social features

Return ONLY the enhanced prompt without any explanations, meta-commentary, or formatting markers. The enhanced prompt should be ready to use directly.`;
        } else {
          enhancementTemplate = WEBAPP_ENHANCEMENT_TEMPLATE;
          systemPrompt = `You are a prompt optimization expert specializing in creating stunning web applications with ultra-modern, Dribbble-inspired design.

CRITICAL MISSION: Transform EVERY user request into a beautiful, modern web application with world-class UI/UX design.

AUTOMATIC ENHANCEMENT RULES:
1. ALWAYS apply the webapp enhancement template - no exceptions
2. Even simple 1-2 word prompts get full enhancement treatment
3. Replace [USER_CONCEPT] with the user's concept (expand if needed)
4. Add rich context and features based on the concept
5. Apply appropriate color schemes and modern design patterns
6. Include comprehensive mock data and interactive features

WEBAPP ENHANCEMENT TEMPLATE:
${WEBAPP_ENHANCEMENT_TEMPLATE}

EXAMPLES:
- "todo app" → Full template with task management, modern web UI, responsive design
- "garden center" → Full template with plants, e-commerce, knowledge base, modern design
- "fitness tracker" → Full template with dashboards, analytics, social features

Return ONLY the enhanced prompt without any explanations, meta-commentary, or formatting markers. The enhanced prompt should be ready to use directly.`;
        }

        const result = await generateText({
          model: modelClient,
          system: systemPrompt,
          prompt: `Original prompt to optimize: "${params.originalPrompt}"

Enhanced prompt:`,
          maxTokens: 1500,
          temperature: 0.7,
        });

        const optimizedPrompt = result.text.trim();
        
        logger.log("Prompt optimization completed successfully with LLM");

        return {
          optimizedPrompt,
          originalPrompt: params.originalPrompt,
        };

      } catch (error: any) {
        logger.error("Error optimizing prompt with LLM:", error);
        
        // Provide better error handling for different scenarios
        if (error.message?.includes("Unsupported model version") || 
            error.message?.includes("AI SDK 4 only supports")) {
          logger.log("Model incompatible, falling back to simple enhancement");
        } else if (error.message?.includes("API key") || error.message?.includes("authentication")) {
          logger.log("API authentication issue, falling back to simple enhancement");
        } else {
          logger.log("General error, falling back to simple enhancement");
        }
        
        // Fallback to the appropriate enhancement template
        let fallbackEnhanced: string;
        if (params.appType === "mobile" || params.appType === "expo") {
          fallbackEnhanced = MOBILE_ENHANCEMENT_TEMPLATE.replace('[USER_CONCEPT]', params.originalPrompt);
        } else {
          fallbackEnhanced = WEBAPP_ENHANCEMENT_TEMPLATE.replace('[USER_CONCEPT]', params.originalPrompt);
        }

        return {
          optimizedPrompt: fallbackEnhanced,
          originalPrompt: params.originalPrompt,
        };
      }
    }
  );
}
