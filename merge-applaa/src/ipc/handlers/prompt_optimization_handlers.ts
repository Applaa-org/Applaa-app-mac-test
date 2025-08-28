import { ipcMain } from "electron";
import log from "electron-log";
import { readSettings } from "../../main/settings";
import { getModelClient } from "../utils/get_model_client";
import { generateText } from "ai";
import type { LargeLanguageModel } from "../shared/language_model_helpers";

const logger = log.scope("prompt_optimization_handlers");

export interface OptimizePromptParams {
  originalPrompt: string;
  selectedModel: LargeLanguageModel;
}

export interface OptimizePromptResponse {
  optimizedPrompt: string;
  originalPrompt: string;
}

const WEBAPP_ENHANCEMENT_TEMPLATE = `Create a [USER_CONCEPT] web application with ultra-modern, dynamic design inspired by trending Dribbble UI patterns and contemporary web design aesthetics. The color scheme should intelligently adapt based on the concept theme:

🎨 **DYNAMIC COLOR SCHEMES BY CONCEPT:**
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

🏗️ **ARCHITECTURE & CODE QUALITY:**
- Clean, well-structured code with proper component organization
- Modular components with clear separation of concerns
- Comprehensive error handling and input validation throughout
- TypeScript implementation for complete type safety
- Custom hooks for reusable business logic
- Proper state management with context/reducers where needed
- Clean code principles with meaningful variable names
- Consistent coding patterns and conventions

🎨 **MODERN DESIGN INSPIRATION (Dribbble-style):**
- Contemporary card layouts with asymmetric grids and creative spacing
- Trending micro-interactions and delightful hover animations
- Modern glassmorphism and neumorphism elements where appropriate
- Creative typography mixing (sans-serif headers, elegant body fonts)
- Innovative navigation patterns (floating menus, morphing tabs, gesture-based)
- Advanced visual hierarchy with creative use of whitespace
- Trending UI components (floating action buttons, card carousels, infinite scroll)
- Modern iconography with custom SVG illustrations matching the theme
- Progressive web app features (smooth transitions, app-like experience)

📱 **RESPONSIVE DESIGN & USER EXPERIENCE:**
- Mobile-first responsive design with perfect breakpoints
- Touch-friendly interfaces with appropriate tap targets
- Intuitive navigation and user flow optimization
- Loading states, skeleton screens, and progressive enhancement
- User feedback systems with toast notifications and confirmations
- Smooth page transitions and micro-animations
- Gesture navigation support for mobile devices
- Professional loading indicators and empty states

♿ **ACCESSIBILITY & CONTRAST REQUIREMENTS:**
- ALL text MUST have perfect readability with dynamic contrast adjustment
- Smart text color switching: white text on dark gradients, dark text on light gradients
- Adaptive text shadows that automatically adjust intensity based on background luminosity
- ARIA labels, roles, and properties for screen readers
- Keyboard navigation support with visible focus indicators
- Semantic HTML structure with proper heading hierarchy
- Alt text for all images and meaningful link descriptions
- Color contrast ratios meeting WCAG 2.1 AA standards (4.5:1+ minimum)
- Skip navigation links and landmark regions

⚡ **PERFORMANCE & BEST PRACTICES:**
- Optimized performance with lazy loading and code splitting
- Fast loading times with efficient asset management
- SEO-friendly structure with proper meta tags and schema markup
- Security best practices with input sanitization and validation
- Efficient state updates and re-render optimization
- Image optimization with responsive images and modern formats
- Caching strategies for improved performance
- Bundle size optimization and tree shaking

🔧 **ADVANCED FEATURES & FUNCTIONALITY:**
- 4-6 intelligently organized sections with smooth page transitions
- Rich, contextually relevant mock data (12-20 items per section)
- Advanced search with filters, categories, and real-time results
- Working navigation header with proper page links and routing
- Functional internal navigation between all sections
- Interactive components with proper state management
- Form validation with real-time feedback and error handling
- Data persistence with localStorage/sessionStorage where appropriate
- API integration patterns with proper error handling
- Cross-browser compatibility and modern web standards

🧪 **TESTING & MAINTENANCE CONSIDERATIONS:**
- Component structure designed for easy unit testing
- Clear separation of business logic for testability
- Consistent naming conventions and code organization
- Comprehensive error boundaries and fallback UI
- Detailed code comments and documentation
- Scalable folder structure and file organization
- Reusable utility functions and custom hooks
- Environment-specific configurations and constants

📊 **DATA MANAGEMENT & VALIDATION:**
- Robust form validation with client-side and server-side checks
- Type-safe data structures and API interfaces
- Error handling with user-friendly error messages
- Data transformation and normalization utilities
- Proper loading and error states for all async operations
- Optimistic updates with rollback capabilities
- Data caching and synchronization strategies

🎯 **INDUSTRY-SPECIFIC ENHANCEMENTS:**
Add specialized features relevant to the [USER_CONCEPT] domain, including:
- Domain-specific calculations and business logic
- Industry-standard UI patterns and workflows
- Relevant integrations and third-party services
- Specialized data visualization and reporting
- Professional-grade features expected in the industry
- Compliance with industry standards and regulations`;

const OPTIMIZATION_SYSTEM_PROMPT = `You are a prompt optimization expert specializing in creating stunning web applications. Your job is to take a user's basic prompt and enhance it to produce visually spectacular, modern web applications.

WEBAPP DETECTION: If the user's prompt is about creating any kind of web application, website, or digital interface, use the enhanced webapp template below.

For webapp prompts:
1. Replace [USER_CONCEPT] in the template with the user's specific concept
2. Identify the appropriate color scheme category from the list
3. Add specific functionality relevant to their concept
4. Include industry-specific features and requirements
5. Ensure all navigation and interactive elements are functional

For non-webapp prompts, apply these general optimizations:
1. Keep the original intent but make it much more specific and actionable
2. Add technical requirements and best practices
3. Include implementation details and structure
4. Specify coding standards and quality requirements
5. Add user experience and design considerations
6. Make it comprehensive but focused

WEBAPP ENHANCEMENT TEMPLATE:
${WEBAPP_ENHANCEMENT_TEMPLATE}

Return ONLY the enhanced prompt without any explanations, meta-commentary, or formatting markers. The enhanced prompt should be ready to use directly.`;

export function registerPromptOptimizationHandlers() {
  ipcMain.handle(
    "prompt:optimize",
    async (event, params: OptimizePromptParams): Promise<OptimizePromptResponse> => {
      try {
        logger.log("Optimizing prompt using LLM for:", params.originalPrompt);
        
        const settings = readSettings();
        const { modelClient } = await getModelClient(params.selectedModel, settings);

        const result = await generateText({
          model: modelClient,
          system: OPTIMIZATION_SYSTEM_PROMPT,
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
        
        // Fallback to a simple but useful enhancement
        const simpleEnhanced = `${params.originalPrompt}

Please provide a comprehensive implementation that includes:

🏗️ **Architecture & Code Quality:**
- Clean, well-structured code with proper organization
- Modular components and separation of concerns
- Appropriate error handling and input validation
- TypeScript for type safety (if applicable)

🎨 **Design & User Experience:**
- Responsive design that works on all screen sizes
- Modern, professional styling and intuitive user interface
- Loading states and user feedback for better UX
- Accessibility features (ARIA labels, keyboard navigation)

⚡ **Performance & Best Practices:**
- Optimized performance and fast loading times
- SEO-friendly structure and metadata
- Security best practices and data validation
- Code documentation and helpful comments

🧪 **Testing & Maintenance:**
- Consider testability in the implementation
- Follow established design patterns and conventions
- Ensure code is maintainable and scalable`;

        return {
          optimizedPrompt: simpleEnhanced,
          originalPrompt: params.originalPrompt,
        };
      }
    }
  );
}
