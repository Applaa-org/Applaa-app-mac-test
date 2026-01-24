import { ipcMain } from "electron";
import log from "electron-log";
import { readSettings } from "../../main/settings";
import { getModelClient } from "../utils/get_model_client";
import { generateText } from "ai";
import type { LargeLanguageModel } from "../../lib/schemas";
import { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { getExtraProviderOptions } from "../utils/thinking_utils";

const logger = log.scope("prompt_optimization_handlers");

export interface OptimizePromptParams {
  originalPrompt: string;
  selectedModel: LargeLanguageModel;
  appType?: "web" | "expo" | "flutter" | "godot" | "arcade" | "microbit" | "minecraft" | "blockly" | "mobile";
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
        logger.log("🚀 [PromptOptimization] Starting optimization for:", params.originalPrompt);
        logger.log("🚀 [PromptOptimization] Selected model:", params.selectedModel.provider, params.selectedModel.name);
        logger.log("🚀 [PromptOptimization] App type:", params.appType);

        const settings = readSettings();
        logger.log("🚀 [PromptOptimization] Getting model client...");
        const { modelClient } = await getModelClient(params.selectedModel, settings);
        logger.log("🚀 [PromptOptimization] Model client obtained, generating text...");

        // Select enhancement template based on app type
        let enhancementTemplate: string;
        let systemPrompt: string;

        if (params.appType === "mobile" || params.appType === "expo") {
          enhancementTemplate = MOBILE_ENHANCEMENT_TEMPLATE;
          systemPrompt = `You are a technical specification writer. Write a clear, functional description of what a mobile application should do.

CRITICAL RULES - YOU MUST FOLLOW:
1. Write in plain, natural language - like you're describing the app to a developer
2. Focus ONLY on functionality, features, and what the app does
3. Do NOT use phrases like "ultra-modern", "premium design", "dynamic design", "glassmorphism", "neumorphism"
4. Do NOT mention color schemes, gradients, or visual styling
5. Do NOT include design guidelines, UI patterns, or styling instructions
6. Do NOT list image sources (Unsplash, Pexels, etc.)
7. Do NOT use template-like formatting with headers and sections
8. Just describe the features and functionality in a natural paragraph format

Example of GOOD output:
"A todo application where users can create tasks, mark them as complete, organize them into categories, set due dates and priorities, search and filter tasks, and receive reminders for upcoming tasks."

Example of BAD output (DO NOT DO THIS):
"Create a todo app with ultra-modern design and premium UI patterns. Use dynamic color schemes..."

Write a functional description for: "${params.originalPrompt}"

Return ONLY the functional description without any explanations.`;
        } else {
          enhancementTemplate = WEBAPP_ENHANCEMENT_TEMPLATE;
          systemPrompt = `You are a technical specification writer. Write a clear, functional description of what a web application should do.

CRITICAL RULES - YOU MUST FOLLOW:
1. Write in plain, natural language - like you're describing the app to a developer
2. Focus ONLY on functionality, features, and what the app does
3. Do NOT use phrases like "ultra-modern", "premium design", "dynamic design", "glassmorphism", "neumorphism"
4. Do NOT mention color schemes, gradients, or visual styling
5. Do NOT include design guidelines, UI patterns, or styling instructions
6. Do NOT list image sources (Unsplash, Pexels, etc.)
7. Do NOT use template-like formatting with headers and sections
8. Just describe the features and functionality in a natural paragraph format

Example of GOOD output:
"A weather dashboard that displays current weather conditions including temperature, humidity, wind speed, and conditions. Shows a 5-day forecast with daily highs, lows, and precipitation chances. Includes location search to find weather for any city. Displays weather maps, hourly forecasts, and weather alerts."

Example of BAD output (DO NOT DO THIS):
"Create a weather dashboard with ultra-modern design and premium UI patterns. Use dynamic color schemes..."

Write a functional description for: "${params.originalPrompt}"

Return ONLY the functional description without any explanations.`;
        }

        // Use provider options like chat stream handler does for compatibility
        const providerOptions: any = {
          google: {
            thinkingConfig: {
              includeThoughts: true,
            },
          } satisfies GoogleGenerativeAIProviderOptions,
          openai: {
            reasoningSummary: "auto",
          } satisfies OpenAIResponsesProviderOptions,
          "azure-openai": {
            reasoningSummary: "auto",
            reasoning_effort: "medium",
          },
        };

        // Add extra provider options if available
        if (modelClient.builtinProviderId) {
          const extraOptions = getExtraProviderOptions(
            modelClient.builtinProviderId,
            settings,
          );
          if (extraOptions && Object.keys(extraOptions).length > 0) {
            providerOptions["dyad-gateway"] = extraOptions;
          }
        }

        const result = await generateText({
          model: modelClient.model, // Use .model property, not the whole client
          system: systemPrompt,
          prompt: `User's original request: "${params.originalPrompt}"

Your task: Write a detailed, unique prompt that expands on this request. Describe ONLY the functionality and features.

IMPORTANT RULES:
1. Write in plain, natural language - NOT as a template
2. Focus on WHAT the app does, not HOW it looks
3. Be specific to "${params.originalPrompt}" - make it unique
4. Do NOT use phrases like "ultra-modern design", "dynamic design", "premium UI patterns"
5. Do NOT include color schemes, design guidelines, or styling instructions
6. Do NOT list image sources or mock data guidelines
7. Just describe the features, functionality, and what the app should do

Example for "todo app":
"A todo application where users can create, edit, and delete tasks. Tasks can be organized into categories or projects. Users can mark tasks as complete, set due dates, add priorities, and add notes. The app should support filtering tasks by status (all, active, completed), searching tasks, and sorting by date or priority. Include features like task reminders, recurring tasks, and the ability to archive completed tasks."

Now write a similar detailed prompt for: "${params.originalPrompt}"

Expanded prompt:`,
          maxTokens: 1500,
          temperature: 0.9, // Higher temperature for more variation
          providerOptions: providerOptions,
        });

        let optimizedPrompt = result.text.trim();

        logger.log("✅ [PromptOptimization] AI response received");
        logger.log("✅ [PromptOptimization] Enhanced prompt length:", optimizedPrompt.length);
        logger.log("✅ [PromptOptimization] Enhanced prompt preview:", optimizedPrompt.substring(0, 200) + "...");

        // Validate that we got a real AI-generated response, not a template copy
        const templateIndicators = [
          'DYNAMIC COLOR SCHEMES BY CONCEPT',
          'MODERN DESIGN INSPIRATION',
          'MANDATORY TEXT VISIBILITY',
          'APPROVED FREE IMAGE SOURCES',
          'ultra-modern, dynamic design',
          'premium UI patterns',
          'glassmorphism',
          'neumorphism',
          'Unsplash.*photo-',
          'Pixabay.*photo',
          'Pexels.*photos'
        ];

        const isTemplateCopy = templateIndicators.some(indicator => {
          const regex = new RegExp(indicator, 'i');
          return regex.test(optimizedPrompt);
        });

        if (isTemplateCopy) {
          logger.warn("⚠️ [PromptOptimization] Detected template-like response, regenerating with stricter instructions");

          // Retry with even more explicit instructions
          const retryResult = await generateText({
            model: modelClient.model,
            system: `You are a technical writer. Write a clear, functional specification for an application. Do NOT include any design, styling, or visual guidelines. Only describe features and functionality.`,
            prompt: `Write a detailed functional specification for: "${params.originalPrompt}"

Describe:
- What the application does
- Key features
- User interactions
- Data it handles
- Workflows

Write in plain language. No design terms. No templates. Just functionality.

Specification:`,
            maxTokens: 1500,
            temperature: 1.0, // Maximum creativity
          });

          const retryOptimized = retryResult.text.trim();
          if (retryOptimized && !templateIndicators.some(ind => new RegExp(ind, 'i').test(retryOptimized))) {
            logger.log("✅ [PromptOptimization] Retry successful - got unique prompt");
            optimizedPrompt = retryOptimized;
          } else {
            logger.warn("⚠️ [PromptOptimization] Retry also returned template-like content");
          }
        }

        // Final validation
        if (optimizedPrompt.includes('[USER_CONCEPT]')) {
          logger.warn("⚠️ [PromptOptimization] AI response contains placeholder [USER_CONCEPT]");
        }

        if (!optimizedPrompt || optimizedPrompt.length < 50) {
          logger.warn("⚠️ [PromptOptimization] Enhanced prompt seems too short");
        }

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
