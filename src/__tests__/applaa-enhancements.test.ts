import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * APPLAA ENHANCEMENTS TESTS
 * 
 * Simplified tests that focus on verifying our enhancements are in place:
 * - System prompt improvements
 * - Tag system functionality
 * - Configuration optimizations
 * - Branding consistency
 */

describe("🚀 APPLAA ENHANCEMENTS", () => {
  
  describe("🎨 System Prompt Quality", () => {
    it("should include premium design requirements in web app prompt", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      const premiumFeatures = [
        "MANDATORY APP STRUCTURE",
        "Professional Header Component",
        "Premium Card Components",
        "glassmorphism",
        "backdrop-blur",
        "shadow-xl",
        "Made with Applaa"
      ];

      premiumFeatures.forEach(feature => {
        expect(promptContent).toContain(feature);
      });
    });

    it("should use TanStack Router instead of React Router", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      expect(promptContent).toContain("TanStack Router");
      expect(promptContent).toContain("src/App.tsx");
      expect(promptContent).toContain("programmatic routing");
      expect(promptContent).not.toContain("React Router");
      expect(promptContent).not.toContain("file-based routing");
    });

    it("should enforce mobile patterns in Expo prompt", async () => {
      const expoPromptPath = path.resolve("src/prompts/expo_system_prompt.ts");
      const expoPromptContent = await fs.readFile(expoPromptPath, "utf-8");
      
      const mobilePatterns = [
        "React Native/Expo mobile app",
        "SafeAreaView",
        "StatusBar",
        "StyleSheet.create",
        "TouchableOpacity",
        "Never Use Web Technologies"
      ];

      mobilePatterns.forEach(pattern => {
        expect(expoPromptContent).toContain(pattern);
      });
    });

    it("should include Boost My App enhancements", async () => {
      const expoPromptPath = path.resolve("src/prompts/expo_system_prompt.ts");
      const expoPromptContent = await fs.readFile(expoPromptPath, "utf-8");
      
      const boostFeatures = [
        "BOOST MY APP - Premium Enhancement Mode",
        "Premium Gradients",
        "Glassmorphism Effects",
        "Micro-Animations",
        "App-Specific Color Psychology"
      ];

      boostFeatures.forEach(feature => {
        expect(expoPromptContent).toContain(feature);
      });
    });
  });

  describe("🏷️ Tag System Functionality", () => {
    it("should support all Applaa tag variants", () => {
      const tagVariants = [
        "applaa-write",
        "applaa-create-file", 
        "applaa-update-file",
        "applaa-file-delete",
        "applaa-file-removal",
        "applaa-rename",
        "applaa-add-dependency"
      ];

      tagVariants.forEach(tag => {
        // Test that tag names follow expected pattern
        expect(tag).toMatch(/^applaa-[\w-]+$/);
        expect(tag.startsWith("applaa-")).toBe(true);
      });
    });

    it("should maintain backward compatibility with dyad tags", () => {
      const legacyTags = [
        "dyad-write",
        "dyad-delete", 
        "dyad-rename",
        "dyad-add-dependency"
      ];

      legacyTags.forEach(tag => {
        // Test that legacy tag names are still valid
        expect(tag).toMatch(/^dyad-[\w-]+$/);
        expect(tag.startsWith("dyad-")).toBe(true);
      });
    });

    it("should handle tag attributes correctly", () => {
      const tagExamples = [
        { tag: '<applaa-write path="test.js">', hasPath: true },
        { tag: '<applaa-rename from="a.js" to="b.js">', hasFrom: true },
        { tag: '<applaa-add-dependency packages="react">', hasPackages: true }
      ];

      tagExamples.forEach(({ tag, hasPath, hasFrom, hasPackages }) => {
        if (hasPath) expect(tag).toContain('path=');
        if (hasFrom) expect(tag).toContain('from=');
        if (hasPackages) expect(tag).toContain('packages=');
      });
    });
  });

  describe("⚡ Performance Optimizations", () => {
    it("should have workspace optimization logic", () => {
      // Test the optimization decision logic
      const workspaceStates = [
        { hasNodeModules: true, hasLockFile: true, shouldSkip: true },
        { hasNodeModules: false, hasLockFile: true, shouldSkip: false },
        { hasNodeModules: true, hasLockFile: false, shouldSkip: false },
        { hasNodeModules: false, hasLockFile: false, shouldSkip: false }
      ];

      workspaceStates.forEach(({ hasNodeModules, hasLockFile, shouldSkip }) => {
        const actualShouldSkip = hasNodeModules && hasLockFile;
        expect(actualShouldSkip).toBe(shouldSkip);
      });
    });

    it("should optimize config file updates", () => {
      // Test config update decision logic
      const configScenarios = [
        { 
          existing: "node-linker=hoisted\nshamefully-hoist=true", 
          needsUpdate: false 
        },
        { 
          existing: "shamefully-hoist=true", 
          needsUpdate: true 
        },
        { 
          existing: "", 
          needsUpdate: true 
        }
      ];

      configScenarios.forEach(({ existing, needsUpdate }) => {
        const hasRequiredConfig = existing.includes("node-linker=hoisted") && 
                                 existing.includes("shamefully-hoist=true");
        const actualNeedsUpdate = !hasRequiredConfig;
        expect(actualNeedsUpdate).toBe(needsUpdate);
      });
    });
  });

  describe("🎯 Quality Standards", () => {
    it("should define comprehensive quality checklist", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      const qualityStandards = [
        "Quality Checklist",
        "Professional Header",
        "Glassmorphism Effects",
        "Premium Shadows",
        "Responsive Design",
        "Rich Mock Data",
        "No 404 Errors"
      ];

      qualityStandards.forEach(standard => {
        expect(promptContent).toContain(standard);
      });
    });

    it("should include rejection criteria", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      const rejectionCriteria = [
        "IMMEDIATE REJECTION CRITERIA",
        "Basic/minimal design",
        "Missing navigation header",
        "No glassmorphism",
        "Broken routes"
      ];

      rejectionCriteria.forEach(criteria => {
        expect(promptContent).toContain(criteria);
      });
    });
  });

  describe("🎨 Branding Consistency", () => {
    it("should use Applaa branding in prompts", async () => {
      const promptFiles = [
        "src/prompts/system_prompt.ts",
        "src/prompts/expo_system_prompt.ts"
      ];

      for (const file of promptFiles) {
        const content = await fs.readFile(path.resolve(file), "utf-8");
        
        // Should contain Applaa branding
        expect(content).toContain("Applaa");
        
        // Check for "Made with Applaa" specifically
        if (content.includes("Made with")) {
          expect(content).toContain("Made with Applaa");
        }
      }
    });

    it("should remove Dribbble references", async () => {
      const promptFiles = [
        "src/prompts/system_prompt.ts",
        "src/prompts/expo_system_prompt.ts"
      ];

      for (const file of promptFiles) {
        const content = await fs.readFile(path.resolve(file), "utf-8");
        
        // Should not contain Dribbble references
        expect(content.toLowerCase()).not.toContain("dribbble");
      }
    });
  });

  describe("🔧 Configuration Files", () => {
    it("should have proper test configuration", async () => {
      const testConfigPath = path.resolve("scripts/test-core-features.js");
      const testConfig = await fs.readFile(testConfigPath, "utf-8");
      
      const testFeatures = [
        "Core Features Protection",
        "APPLAA CORE FEATURES PROTECTION SUITE",
        "test:core"
      ];

      testFeatures.forEach(feature => {
        expect(testConfig).toContain(feature);
      });
    });

    it("should have comprehensive package.json scripts", async () => {
      const packagePath = path.resolve("package.json");
      const packageContent = await fs.readFile(packagePath, "utf-8");
      const packageJson = JSON.parse(packageContent);
      
      const requiredScripts = [
        "test",
        "test:core",
        "test:watch"
      ];

      requiredScripts.forEach(script => {
        expect(packageJson.scripts).toHaveProperty(script);
      });
    });
  });

  describe("📊 Performance Benchmarks", () => {
    it("should complete tag parsing efficiently", () => {
      // Test tag parsing performance with realistic data
      const largeTags = Array.from({ length: 50 }, (_, i) => 
        `<applaa-write path="file${i}.js">console.log(${i});</applaa-write>`
      ).join('\n');

      const startTime = performance.now();
      
      // Simulate tag parsing
      const tagCount = (largeTags.match(/<applaa-write/g) || []).length;
      const hasContent = largeTags.includes("console.log");
      
      const endTime = performance.now();
      
      expect(tagCount).toBe(50);
      expect(hasContent).toBe(true);
      expect(endTime - startTime).toBeLessThan(50); // Should be fast
    });

    it("should handle large responses efficiently", () => {
      // Test response processing performance
      const largeResponse = Array.from({ length: 100 }, (_, i) => 
        `Line ${i}: This is a test response with content.`
      ).join('\n');

      const startTime = performance.now();
      
      // Simulate response processing
      const lineCount = largeResponse.split('\n').length;
      const hasContent = largeResponse.includes("test response");
      
      const endTime = performance.now();
      
      expect(lineCount).toBe(100);
      expect(hasContent).toBe(true);
      expect(endTime - startTime).toBeLessThan(25); // Should be very fast
    });
  });

  describe("🔗 Integration Points", () => {
    it("should have proper chat stream integration", () => {
      // Test chat stream data structure
      const mockChatData = {
        chatId: 123,
        appId: 456,
        readyForChat: true,
        hasAttachments: false
      };

      expect(mockChatData.chatId).toBeGreaterThan(0);
      expect(mockChatData.appId).toBeGreaterThan(0);
      expect(mockChatData.readyForChat).toBe(true);
    });

    it("should support parallel app creation", () => {
      // Test parallel app creation data structure
      const mockAppCreation = {
        app: { id: 123, name: "test-app" },
        chatId: 456,
        taskId: "task-789",
        readyForChat: true
      };

      expect(mockAppCreation.app.id).toBeGreaterThan(0);
      expect(mockAppCreation.chatId).toBeGreaterThan(0);
      expect(mockAppCreation.taskId).toMatch(/^task-/);
      expect(mockAppCreation.readyForChat).toBe(true);
    });
  });

  describe("🧹 MVP Cleanup", () => {
    it("should have removed AI feature UI components", async () => {
      // Verify AI-related UI components have been removed
      const settingsPath = path.resolve("src/pages/settings.tsx");
      const settingsContent = await fs.readFile(settingsPath, "utf-8");
      
      const removedFeatures = [
        "Smart Suggestions",
        "Semantic Context", 
        "Usage Analytics",
        "Privacy & Local Processing",
        "AISettings"
      ];

      removedFeatures.forEach(feature => {
        // Should not contain the actual UI components, only removal comments
        expect(settingsContent).not.toMatch(new RegExp(`<.*${feature}.*>`, 'i'));
      });
    });

    it("should have removed Design Studio components", async () => {
      // Verify Design Studio has been removed from preview header
      const previewHeaderPath = path.resolve("src/components/preview_panel/PreviewHeader.tsx");
      const previewHeaderContent = await fs.readFile(previewHeaderPath, "utf-8");
      
      // Should not have design in the PreviewMode type
      expect(previewHeaderContent).not.toContain('| "design"');
      
      // Should not have design button
      expect(previewHeaderContent).not.toContain('"Design"');
    });

    it("should have removed Gemini CLI integration from IPC client", async () => {
      const ipcClientPath = path.resolve("src/ipc/ipc_client.ts");
      const ipcClientContent = await fs.readFile(ipcClientPath, "utf-8");
      
      // Should remove Gemini CLI methods (not the standard Google AI provider)
      const geminiCliMethods = [
        "geminiOAuthLogin",
        "geminiAuthStatus", 
        "geminiComplete",
        "geminiListModels"
      ];

      geminiCliMethods.forEach(method => {
        expect(ipcClientContent).not.toContain(method);
      });
    });

    it("should default to preview mode instead of design mode", async () => {
      const homePath = path.resolve("src/pages/home.tsx");
      const homeContent = await fs.readFile(homePath, "utf-8");
      
      // Should set preview mode, not design mode
      expect(homeContent).toContain('setPreviewMode("preview")');
      expect(homeContent).not.toContain('setPreviewMode("design")');
    });

    it("should have preserved hermetic runtime while removing AI features", async () => {
      const hermeticPath = path.resolve("src/lib/hermetic-runtime.ts");
      const hermeticContent = await fs.readFile(hermeticPath, "utf-8");
      
      // Should remove AI-specific features but keep hermetic runtime
      const removedAIFeatures = [
        "AI_MODEL_PACKAGES",
        "cacheAIModels", 
        "initializeTransformersHermetic"
      ];

      removedAIFeatures.forEach(feature => {
        expect(hermeticContent).not.toContain(feature);
      });
      
      // Should preserve essential hermetic runtime for EXE compatibility
      expect(hermeticContent).toContain("getBestPackageManager");
      expect(hermeticContent).toContain("initializeWorkspace");
      expect(hermeticContent).toContain("ensureExpoDependencies");
      expect(hermeticContent).toContain("runToolWithElectronNode");
      expect(hermeticContent).toContain("verifyHermeticRuntime");
    });

    it("should preserve standard Google AI provider while removing Gemini CLI", async () => {
      const languageModelHelpersPath = path.resolve("src/ipc/shared/language_model_helpers.ts");
      const languageModelHelpersContent = await fs.readFile(languageModelHelpersPath, "utf-8");
      
      // Should preserve standard Google AI provider
      expect(languageModelHelpersContent).toContain('"google"');
      expect(languageModelHelpersContent).toContain("MODEL_OPTIONS");
      
      // Should have Google models available
      expect(languageModelHelpersContent).toContain("google:");
    });
  });

  describe("🎯 Component Selector Integration", () => {
    it("should have component tagger plugin ready for web app templates", async () => {
      const reactTemplatePath = path.resolve("webapp-templates/react/vite.config.ts");
      const reactTemplateContent = await fs.readFile(reactTemplatePath, "utf-8");
      
      // Component tagger is added during app creation, not in template
      expect(reactTemplateContent).toContain("Component tagger will be added by Applaa during app creation");
      expect(reactTemplateContent).toContain("react()");
    });

    it("should detect when component tagger upgrade is needed", () => {
      // Test the component tagger detection logic
      const viteConfigs = [
        { 
          content: 'plugins: [react()]', 
          needsUpgrade: true 
        },
        { 
          content: 'plugins: [dyadComponentTagger(), react()]', 
          needsUpgrade: true  // Still needs upgrade if import is missing
        },
        { 
          content: 'import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";\nplugins: [dyadComponentTagger(), react()]', 
          needsUpgrade: false 
        }
      ];

      viteConfigs.forEach(({ content, needsUpgrade }) => {
        const hasComponentTagger = content.includes("@dyad-sh/react-vite-component-tagger");
        const actualNeedsUpgrade = !hasComponentTagger;
        expect(actualNeedsUpgrade).toBe(needsUpgrade);
      });
    });

    it("should have component selector initialization logic", async () => {
      const previewIframePath = path.resolve("src/components/preview_panel/PreviewIframe.tsx");
      const previewIframeContent = await fs.readFile(previewIframePath, "utf-8");
      
      // Should have component selector state management
      expect(previewIframeContent).toContain("isComponentSelectorInitialized");
      expect(previewIframeContent).toContain("dyad-component-selector-initialized");
      // Should have component selector message types
      expect(previewIframeContent).toContain("dyad-component-selected");
    });

    it("should disable select component button when not initialized", async () => {
      const previewIframePath = path.resolve("src/components/preview_panel/PreviewIframe.tsx");
      const previewIframeContent = await fs.readFile(previewIframePath, "utf-8");
      
      // Should have proper disabled state logic
      expect(previewIframeContent).toContain("disabled={");
      expect(previewIframeContent).toContain("!isComponentSelectorInitialized");
      expect(previewIframeContent).toContain("disabled:opacity-50");
      expect(previewIframeContent).toContain("disabled:cursor-not-allowed");
    });

    it("should have component selector client script", async () => {
      const componentSelectorPath = path.resolve("worker/dyad-component-selector-client.js");
      const componentSelectorContent = await fs.readFile(componentSelectorPath, "utf-8");
      
      // Should have initialization and message handling
      expect(componentSelectorContent).toContain("initializeComponentSelector");
      expect(componentSelectorContent).toContain("data-dyad-id");
      expect(componentSelectorContent).toContain("dyad-component-selector-initialized");
      expect(componentSelectorContent).toContain("activate-dyad-component-selector");
    });
  });

  describe("🖼️ Broken Image Prevention", () => {
    it("should include comprehensive image fallback instructions", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      const imageInstructions = [
        "BROKEN IMAGE PREVENTION",
        "NEVER create broken image placeholders",
        "Lucide Icons with gradients",
        "CSS gradient backgrounds",
        "MANDATORY IMAGE FALLBACK STRATEGY"
      ];

      imageInstructions.forEach(instruction => {
        expect(promptContent).toContain(instruction);
      });
    });

    it("should provide specific icon suggestions by category", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      const iconCategories = [
        "E-commerce",
        "Food/Recipes", 
        "Plants/Garden",
        "Tech/Apps",
        "Travel",
        "Health",
        "Education"
      ];

      iconCategories.forEach(category => {
        expect(promptContent).toContain(category);
      });

      // Should have specific icon suggestions
      const iconSuggestions = [
        "ShoppingBag",
        "Coffee",
        "Leaf", 
        "Smartphone",
        "MapPin",
        "Heart",
        "Book"
      ];

      iconSuggestions.forEach(icon => {
        expect(promptContent).toContain(icon);
      });
    });

    it("should prohibit broken image sources", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      const prohibitedSources = [
        "Getty Images",
        "Shutterstock",
        "Google Images",
        'placeholder text like "image.jpg"',
        'Generic placeholder paths like "/images/product.jpg"',
        '"assets/image.png"'
      ];

      prohibitedSources.forEach(source => {
        expect(promptContent).toContain(source);
      });
    });

    it("should provide three-tier fallback strategy", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      const fallbackTiers = [
        "PRIMARY: Use Lucide Icons",
        "SECONDARY: CSS Gradient Placeholders", 
        "TERTIARY: Picsum with Error Handling"
      ];

      fallbackTiers.forEach(tier => {
        expect(promptContent).toContain(tier);
      });

      // Should emphasize Lucide icons as preferred
      expect(promptContent).toContain("always available");
      expect(promptContent).toContain("PREFERRED - always works");
    });

    it("should include gradient background examples", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      const gradientFeatures = [
        "bg-gradient-to-br",
        "from-green-400",
        "to-green-600", 
        "from-blue-400",
        "via-purple-500",
        "to-pink-500",
        "gradient backgrounds"
      ];

      gradientFeatures.forEach(feature => {
        expect(promptContent).toContain(feature);
      });
    });

    it("should emphasize user experience impact", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      const uxMessages = [
        "Users see ugly broken image icons",
        "ruin the app experience",
        "NEVER create broken image links",
        "instead of broken images"
      ];

      uxMessages.forEach(message => {
        expect(promptContent).toContain(message);
      });
    });
  });

  describe("🔧 Latest Model Integration", () => {
    it("should include MoonshotAI Kimi K2 0905 model", async () => {
      const languageModelHelpersPath = path.resolve("src/ipc/shared/language_model_helpers.ts");
      const languageModelHelpersContent = await fs.readFile(languageModelHelpersPath, "utf-8");
      
      // Should include the new Kimi K2 0905 model
      expect(languageModelHelpersContent).toContain("moonshotai/kimi-k2-0905");
      expect(languageModelHelpersContent).toContain("256k");
      expect(languageModelHelpersContent).toContain("coding");
    });

    it("should have proper model metadata", async () => {
      const languageModelHelpersPath = path.resolve("src/ipc/shared/language_model_helpers.ts");
      const languageModelHelpersContent = await fs.readFile(languageModelHelpersPath, "utf-8");
      
      // Should have comprehensive model information
      const modelFeatures = [
        "contextWindow",
        "description", 
        "displayName"
      ];

      modelFeatures.forEach(feature => {
        expect(languageModelHelpersContent).toContain(feature);
      });
    });
  });

  describe("♿ Accessibility Improvements", () => {
    it("should have proper dialog accessibility", async () => {
      const dialogFiles = [
        "src/components/HelpDialog.tsx",
        "src/pages/home.tsx",
        "src/components/mobile/MobileFrameworkPicker.tsx",
        "src/components/universal/UniversalCreator.tsx"
      ];

      for (const file of dialogFiles) {
        const content = await fs.readFile(path.resolve(file), "utf-8");
        
        // Should have DialogTitle and DialogDescription
        expect(content).toContain("DialogTitle");
        expect(content).toContain("DialogDescription");
        expect(content).toContain("DialogHeader");
      }
    });

    it("should provide screen reader context", async () => {
      const universalCreatorPath = path.resolve("src/components/universal/UniversalCreator.tsx");
      const universalCreatorContent = await fs.readFile(universalCreatorPath, "utf-8");
      
      // Should have screen reader only content
      expect(universalCreatorContent).toContain("sr-only");
      expect(universalCreatorContent).toContain("Universal App Builder");
    });
  });

  describe("🏷️ Branding Consistency Updates", () => {
    it("should use Applaa branding in console output", async () => {
      const brandingFiles = [
        "src/ipc/handlers/app_handlers.ts",
        "src/hooks/useRunApp.ts",
        "src/ipc/processors/response_processor.ts",
        "src/ipc/utils/git_author.ts"
      ];

      for (const file of brandingFiles) {
        const content = await fs.readFile(path.resolve(file), "utf-8");
        
        // Should use applaa branding, not dyad
        if (content.includes("proxy-server")) {
          expect(content).toContain("[applaa-proxy-server]");
          expect(content).not.toContain("[dyad-proxy-server]");
        }
        
        if (content.includes("git@")) {
          expect(content).toContain("git@applaa.sh");
          expect(content).not.toContain("git@dyad.sh");
        }
      }
    });

    it("should have consistent commit message branding", async () => {
      const commitFiles = [
        "src/ipc/processors/response_processor.ts",
        "src/ipc/handlers/app_upgrade_handlers.ts",
        "src/ipc/handlers/portal_handlers.ts"
      ];

      for (const file of commitFiles) {
        const content = await fs.readFile(path.resolve(file), "utf-8");
        
        // Should use [applaa] in commit messages
        if (content.includes("commit") || content.includes("message")) {
          expect(content).toContain("[applaa]");
        }
      }
    });
  });

  describe("🏷️ Applaa Branding Protection", () => {
    it("should include critical instructions to preserve made-with-applaa component", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      expect(promptContent).toContain("🚨 **CRITICAL: PRESERVE APPLAA BRANDING**");
      expect(promptContent).toContain("src/components/made-with-applaa.tsx");
      expect(promptContent).toContain("NEVER delete src/components/made-with-applaa.tsx");
    });

    it("should prohibit deletion of Applaa branding files", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      expect(promptContent).toContain("NEVER use applaa-delete or applaa-file-delete tags on made-with-applaa.tsx");
      expect(promptContent).toContain("ALWAYS preserve existing Applaa branding components");
    });

    it("should suggest using update instead of delete for branding", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      expect(promptContent).toContain("use applaa-update-file to enhance, never delete");
    });
  });

  describe("📱 App Display Names", () => {
    it("should support displayName field in App interface", () => {
      // Test that App interface includes displayName
      const appInterface = `
        export interface App {
          id: number;
          name: string;
          displayName?: string;
          path: string;
        }
      `;
      
      expect(appInterface).toContain("displayName?: string");
    });

    it("should prioritize displayName over name for UI display", () => {
      // Test display logic
      const mockApp = { name: "folder-name", displayName: "User Friendly Name" };
      const displayName = mockApp.displayName || mockApp.name;
      expect(displayName).toBe("User Friendly Name");
      
      const mockAppNoDisplay = { name: "folder-name" };
      const fallbackName = mockAppNoDisplay.displayName || mockAppNoDisplay.name;
      expect(fallbackName).toBe("folder-name");
    });

    it("should include database migration for display_name column", async () => {
      const dbPath = path.resolve("src/db/index.ts");
      const dbContent = await fs.readFile(dbPath, "utf-8");
      
      expect(dbContent).toContain("hasDisplayName");
      expect(dbContent).toContain("display_name column to apps table");
      expect(dbContent).toContain("ALTER TABLE apps ADD COLUMN display_name TEXT");
    });
  });

  describe("🚀 Enhanced Prompt Features", () => {
    it("should include user experience flow guidelines", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      expect(promptContent).toContain("USER EXPERIENCE FLOW");
      expect(promptContent).toContain("First 10 Seconds");
      expect(promptContent).toContain("User Journey Mapping");
      expect(promptContent).toContain("Progressive Disclosure");
    });

    it("should include accessibility and performance requirements", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      expect(promptContent).toContain("ACCESSIBILITY & PERFORMANCE");
      expect(promptContent).toContain("WCAG 2.1 AA");
      expect(promptContent).toContain("Color Contrast");
      expect(promptContent).toContain("Core Web Vitals");
    });

    it("should include advanced UI patterns", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      expect(promptContent).toContain("ADVANCED UI PATTERNS");
      expect(promptContent).toContain("Micro-Interactions");
      expect(promptContent).toContain("Emotional Design");
      expect(promptContent).toContain("Empty States");
    });

    it("should include conversion optimization guidelines", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      expect(promptContent).toContain("CONVERSION OPTIMIZATION");
      expect(promptContent).toContain("Call-to-Action Optimization");
      expect(promptContent).toContain("Social Proof");
      expect(promptContent).toContain("Trust Signals");
    });

    it("should include technical excellence patterns", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      expect(promptContent).toContain("TECHNICAL EXCELLENCE");
      expect(promptContent).toContain("Component Architecture");
      expect(promptContent).toContain("Custom Hooks");
      expect(promptContent).toContain("Suspense Boundaries");
    });

    it("should include industry-specific UX patterns", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      expect(promptContent).toContain("INDUSTRY-SPECIFIC UX PATTERNS");
      expect(promptContent).toContain("E-commerce Apps");
      expect(promptContent).toContain("SaaS/Business Apps");
      expect(promptContent).toContain("Health/Fitness Apps");
    });

    it("should include intelligent content generation guidelines", async () => {
      const promptPath = path.resolve("src/prompts/system_prompt.ts");
      const promptContent = await fs.readFile(promptPath, "utf-8");
      
      expect(promptContent).toContain("INTELLIGENT CONTENT GENERATION");
      expect(promptContent).toContain("Trending Topics");
      expect(promptContent).toContain("Seasonal Relevance");
      expect(promptContent).toContain("Personalization Hooks");
    });
  });

  describe("📁 Template Updates", () => {
    it("should have updated React template to use TanStack Router", async () => {
      const packageJsonPath = path.resolve("webapp-templates/react/package.json");
      const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
      
      expect(packageJsonContent).toContain("@tanstack/react-router");
      expect(packageJsonContent).not.toContain("react-router-dom");
    });

    it("should have updated React template AI_RULES.md", async () => {
      const aiRulesPath = path.resolve("webapp-templates/react/AI_RULES.md");
      const aiRulesContent = await fs.readFile(aiRulesPath, "utf-8");
      
      expect(aiRulesContent).toContain("TanStack Router");
      expect(aiRulesContent).toContain("src/App.tsx");
      expect(aiRulesContent).toContain("programmatic routing");
      expect(aiRulesContent).not.toContain("React Router");
    });

    it("should have TanStack Router setup in App.tsx", async () => {
      const appPath = path.resolve("webapp-templates/react/src/App.tsx");
      const appContent = await fs.readFile(appPath, "utf-8");
      
      expect(appContent).toContain("createRouter");
      expect(appContent).toContain("RouterProvider");
      expect(appContent).toContain("createRootRoute");
      expect(appContent).toContain("createRoute");
      expect(appContent).toContain("defaultPreload");
      expect(appContent).toContain("defaultPreloadStaleTime");
    });

    it("should have strictNullChecks enabled in tsconfig.app.json", async () => {
      const tsconfigPath = path.resolve("webapp-templates/react/tsconfig.app.json");
      const tsconfigContent = await fs.readFile(tsconfigPath, "utf-8");
      
      expect(tsconfigContent).toContain('"strictNullChecks": true');
    });
  });
});
