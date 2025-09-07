import { describe, it, expect, beforeAll } from "vitest";

/**
 * SYSTEM PROMPT ENHANCEMENTS TESTS
 * 
 * Tests for the comprehensive system prompt improvements:
 * - Web app premium design requirements
 * - Expo mobile design patterns
 * - Boost My App functionality
 * - Quality assurance standards
 */

describe("🎨 SYSTEM PROMPT ENHANCEMENTS", () => {
  
  describe("🌐 Web App System Prompt", () => {
    let promptContent: string;
    
    beforeAll(async () => {
      // Read the system prompt file once for all tests
      const fs = await import("fs");
      const path = await import("path");
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      promptContent = fs.readFileSync(promptPath, "utf-8");
    });

    it("should enforce mandatory app structure", () => {
      const mandatoryElements = [
        "MANDATORY APP STRUCTURE",
        "Required Navigation Header",
        "Required Layout Structure",
        "Professional Header Component",
        "Premium Card Components",
        "Search & Filter Components"
      ];

      mandatoryElements.forEach(element => {
        expect(promptContent).toContain(element);
      });
    });

    it("should include comprehensive quality checklist", () => {
      const qualityChecks = [
        "Professional Header",
        "Industry-Appropriate Colors",
        "Glassmorphism Effects", 
        "Premium Shadows",
        "Micro-Interactions",
        "Responsive Design",
        "Rich Mock Data",
        "Search Functionality",
        "No 404 Errors",
        "Footer Branding"
      ];

      qualityChecks.forEach(check => {
        expect(promptContent).toContain(check);
      });
    });

    it("should define immediate rejection criteria", () => {
      const rejectionCriteria = [
        "IMMEDIATE REJECTION CRITERIA",
        "Basic/minimal design",
        "Missing navigation header",
        "No glassmorphism",
        "Broken routes",
        "Poor mock data",
        "No search/filter functionality"
      ];

      rejectionCriteria.forEach(criteria => {
        expect(promptContent).toContain(criteria);
      });
    });

    it("should specify glassmorphism and premium styling requirements", () => {
      const stylingRequirements = [
        "backdrop-blur",
        "glassmorphism",
        "gradient",
        "shadow-xl",
        "hover:shadow-2xl",
        "transition-all",
        "rounded-2xl",
        "bg-white/80"
      ];

      stylingRequirements.forEach(requirement => {
        expect(promptContent).toContain(requirement);
      });
    });

    it("should include Applaa branding requirements", () => {
      expect(promptContent).toContain("Made with Applaa");
      expect(promptContent).toContain("Applaa");
      // Note: File may contain "Dyad" in comments or legacy references, so we don't test for its absence
    });
  });

  describe("📱 Expo System Prompt", () => {
    it("should enforce mobile-only patterns", async () => {
      const { EXPO_SYSTEM_PROMPT } = await import("../prompts/expo_system_prompt");
      
      const mobileRequirements = [
        "React Native/Expo mobile app",
        "Never Use Web Technologies",
        "Always Use Mobile Patterns",
        "SafeAreaView",
        "StatusBar", 
        "FlatList",
        "TouchableOpacity",
        "Pressable",
        "StyleSheet.create"
      ];

      mobileRequirements.forEach(requirement => {
        expect(EXPO_SYSTEM_PROMPT).toContain(requirement);
      });
    });

    it("should forbid web technologies explicitly", async () => {
      const { EXPO_SYSTEM_PROMPT } = await import("../prompts/expo_system_prompt");
      
      const forbiddenTech = [
        "No HTML elements",
        "No className prop",
        "No CSS classes",
        "No web libraries"
      ];

      forbiddenTech.forEach(forbidden => {
        expect(EXPO_SYSTEM_PROMPT).toContain(forbidden);
      });
    });

    it("should include Boost My App premium enhancements", async () => {
      const { EXPO_SYSTEM_PROMPT } = await import("../prompts/expo_system_prompt");
      
      const premiumFeatures = [
        "BOOST MY APP - Premium Enhancement Mode",
        "Premium Gradients",
        "Modern Typography",
        "Glassmorphism Effects",
        "Micro-Animations",
        "Touch Feedback",
        "App-Specific Color Psychology"
      ];

      premiumFeatures.forEach(feature => {
        expect(EXPO_SYSTEM_PROMPT).toContain(feature);
      });
    });

    it("should define proper Expo Router structure", async () => {
      const { EXPO_SYSTEM_PROMPT } = await import("../prompts/expo_system_prompt");
      
      const routerStructure = [
        "Expo Router Structure",
        "_layout.tsx",
        "(tabs)",
        "index.tsx",
        "[id].tsx"
      ];

      routerStructure.forEach(element => {
        expect(EXPO_SYSTEM_PROMPT).toContain(element);
      });
    });
  });

  describe("🚀 Boost My App Integration", () => {
    it("should remove all Dribbble references", async () => {
      const modules = [
        await import("../prompts/system_prompt"),
        await import("../prompts/expo_system_prompt")
      ];

      modules.forEach(module => {
        const content = JSON.stringify(module).toLowerCase();
        expect(content).not.toContain("dribbble");
      });
    });

    it("should use premium design terminology", async () => {
      const { constructSystemPrompt, DEFAULT_AI_RULES } = await import("../prompts/system_prompt");
      const { EXPO_SYSTEM_PROMPT } = await import("../prompts/expo_system_prompt");
      
      const buildPrompt = constructSystemPrompt({ aiRules: DEFAULT_AI_RULES, chatMode: "build" });
      
      // Check build prompt for premium terms
      const buildContent = buildPrompt.toLowerCase();
      expect(buildContent).toContain("premium");
      expect(buildContent).toContain("professional");
      expect(buildContent).toContain("award-winning");
      
      // Check expo prompt for premium terms
      const expoContent = EXPO_SYSTEM_PROMPT.toLowerCase();
      expect(expoContent).toContain("premium");
      expect(expoContent).toContain("professional");
    });

    it("should include industry-specific color psychology", async () => {
      const { EXPO_SYSTEM_PROMPT } = await import("../prompts/expo_system_prompt");
      
      const industries = [
        "Food/Recipe Apps",
        "Fitness Apps", 
        "Finance Apps",
        "Shopping Apps",
        "Social Apps",
        "Productivity Apps",
        "Health Apps",
        "Travel Apps"
      ];

      industries.forEach(industry => {
        expect(EXPO_SYSTEM_PROMPT).toContain(industry);
      });
    });
  });

  describe("🎯 Quality Assurance Standards", () => {
    it("should define measurable quality metrics", async () => {
      const { constructSystemPrompt, DEFAULT_AI_RULES } = await import("../prompts/system_prompt");
      const prompt = constructSystemPrompt({ aiRules: DEFAULT_AI_RULES, chatMode: "build" });
      
      const metrics = [
        "8-12 realistic items per section",
        "shadow-xl hover:shadow-2xl",
        "transition-all duration-300",
        "rounded-2xl",
        "backdrop-blur-xl"
      ];

      metrics.forEach(metric => {
        expect(prompt).toContain(metric);
      });
    });

    it("should require comprehensive mock data", async () => {
      const { constructSystemPrompt, DEFAULT_AI_RULES } = await import("../prompts/system_prompt");
      const prompt = constructSystemPrompt({ aiRules: DEFAULT_AI_RULES, chatMode: "build" });
      
      const mockDataRequirements = [
        "Rich Mock Data",
        "8-12 items per section",
        "realistic",
        "industry-relevant content",
        "Detail Pages",
        "comprehensive detail page"
      ];

      mockDataRequirements.forEach(requirement => {
        expect(prompt).toContain(requirement);
      });
    });

    it("should enforce routing standards", async () => {
      const { constructSystemPrompt, DEFAULT_AI_RULES } = await import("../prompts/system_prompt");
      const prompt = constructSystemPrompt({ aiRules: DEFAULT_AI_RULES, chatMode: "build" });
      
      const routingStandards = [
        "NO 404 ERRORS",
        "Every route must have a corresponding page",
        "Detail Pages",
        "Breadcrumbs",
        "Back Buttons"
      ];

      routingStandards.forEach(standard => {
        expect(prompt).toContain(standard);
      });
    });
  });

  describe("🔧 Technical Requirements", () => {
    it("should specify required UI component patterns", async () => {
      const { constructSystemPrompt, DEFAULT_AI_RULES } = await import("../prompts/system_prompt");
      const prompt = constructSystemPrompt({ aiRules: DEFAULT_AI_RULES, chatMode: "build" });
      
      const componentPatterns = [
        "Professional Header Component",
        "Premium Card Components",
        "Search & Filter Components",
        "lucide-react",
        "shadcn/ui components",
        "Button from shadcn/ui"
      ];

      componentPatterns.forEach(pattern => {
        expect(prompt).toContain(pattern);
      });
    });

    it("should define responsive design requirements", async () => {
      const { constructSystemPrompt, DEFAULT_AI_RULES } = await import("../prompts/system_prompt");
      const prompt = constructSystemPrompt({ aiRules: DEFAULT_AI_RULES, chatMode: "build" });
      
      const responsiveRequirements = [
        "Responsive Design",
        "mobile, tablet, desktop",
        "hidden md:flex",
        "container mx-auto",
        "responsive layout"
      ];

      responsiveRequirements.forEach(requirement => {
        expect(prompt).toContain(requirement);
      });
    });

    it("should include accessibility considerations", async () => {
      const { constructSystemPrompt, DEFAULT_AI_RULES } = await import("../prompts/system_prompt");
      const prompt = constructSystemPrompt({ aiRules: DEFAULT_AI_RULES, chatMode: "build" });
      
      // While not explicitly mentioned, good design practices should be implied
      const designPractices = [
        "proper spacing",
        "visual feedback",
        "hover effects",
        "focus states",
        "transition"
      ];

      designPractices.forEach(practice => {
        expect(prompt).toContain(practice);
      });
    });
  });

  describe("📊 Performance Standards", () => {
    it("should optimize for development speed", async () => {
      const { constructSystemPrompt, DEFAULT_AI_RULES } = await import("../prompts/system_prompt");
      const prompt = constructSystemPrompt({ aiRules: DEFAULT_AI_RULES, chatMode: "build" });
      
      const speedOptimizations = [
        "shadcn/ui",
        "prebuilt components",
        "Tailwind CSS",
        "lucide-react",
        "ALREADY have ALL"
      ];

      speedOptimizations.forEach(optimization => {
        expect(prompt).toContain(optimization);
      });
    });

    it("should minimize external dependencies", async () => {
      const { constructSystemPrompt, DEFAULT_AI_RULES } = await import("../prompts/system_prompt");
      const prompt = constructSystemPrompt({ aiRules: DEFAULT_AI_RULES, chatMode: "build" });
      
      // Check for key dependency management concepts
      expect(prompt.toLowerCase()).toContain("shadcn/ui components");
      expect(prompt.toLowerCase()).toContain("don't need to install");
    });
  });

  describe("🎨 Brand Consistency", () => {
    it("should use consistent Applaa branding", async () => {
      const modules = [
        await import("../prompts/system_prompt"),
        await import("../prompts/expo_system_prompt"),
        await import("../prompts/supabase_prompt")
      ];

      modules.forEach(module => {
        const content = JSON.stringify(module);
        if (content.includes("Made with")) {
          expect(content).toContain("Made with Applaa");
        }
        // Should not contain old Dyad branding in user-facing content
        const userFacingContent = content.toLowerCase();
        if (userFacingContent.includes("made with") || userFacingContent.includes("created by")) {
          expect(userFacingContent).not.toContain("dyad");
        }
      });
    });

    it("should maintain technical tag compatibility", async () => {
      const modules = [
        await import("../prompts/system_prompt"),
        await import("../prompts/expo_system_prompt")
      ];

      modules.forEach(module => {
        const content = JSON.stringify(module);
        
        // Should support both dyad and applaa tags for backward compatibility
        expect(content).toContain("applaa-write");
        // But may reference dyad tags for technical compatibility
      });
    });
  });
});
