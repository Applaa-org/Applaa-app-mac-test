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

const WEBAPP_ENHANCEMENT_TEMPLATE = `Create a [USER_CONCEPT] web application with ultra-modern, dynamic design inspired by contemporary web design aesthetics and premium UI patterns. The color scheme should intelligently adapt based on the concept theme:

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

MODERN DESIGN INSPIRATION (Premium-style):

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

const MOBILE_ENHANCEMENT_TEMPLATE = `Create a [USER_CONCEPT] mobile app with ultra-modern design inspired by premium mobile UI patterns. Apply smart color schemes and contemporary mobile design:

🎨 **SMART COLOR SCHEMES:** Food (warm oranges), Fitness (energetic blues), Shopping (premium purples), Finance (professional blues), Social (vibrant gradients)

💎 **PREMIUM MOBILE PATTERNS:**
- Modern card layouts with gradients and shadows
- Smooth navigation with gesture support
- Beautiful typography hierarchy (mix of bold/elegant fonts)
- Creative micro-interactions and loading animations
- Professional iconography with app-specific styling

🚀 **MOBILE-FIRST FEATURES:**
- 4-6 main screens with intuitive navigation
- Rich mock data (15-20 items) with realistic content
- Search/filter interfaces with smooth animations
- Touch-friendly design with proper accessibility
- Beautiful empty states and error handling

📱 **MOBILE ESSENTIALS:**
- Use Unsplash/Pexels for free images (never Getty/Shutterstock)
- Create 15-20 realistic list items with thumbnails and descriptions
- Include detailed screens with hero images, full descriptions, and action buttons
- NO Lorem Ipsum - use realistic, engaging content
- Ensure proper text contrast and mobile accessibility`;

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
          systemPrompt = `You are a prompt optimization expert specializing in creating stunning mobile applications with ultra-modern, premium mobile design.

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
          systemPrompt = `You are a prompt optimization expert specializing in creating stunning web applications with ultra-modern, premium design.

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
