import fs from "node:fs";
import path from "node:path";
import log from "electron-log";

const logger = log.scope("expo-template-creator");

interface TemplateConfig {
  templates: Record<string, {
    name: string;
    description: string;
    path: string;
    features: string[];
  }>;
  features: Record<string, {
    name: string;
    description: string;
    dependencies?: string[];
    plugins?: string[];
    babel?: string[];
    components?: string[];
    utils?: string[];
  }>;
}

interface CreateExpoAppParams {
  fullAppPath: string;
  appName: string;
  displayName: string;
  packageId: string;
  slug: string;
  template?: string;
  features?: string[];
}

export class ExpoTemplateCreator {
  private static templateConfig: TemplateConfig | null = null;
  private static templatesPath = path.join(process.cwd(), "expo-templates");

  static async loadTemplateConfig(): Promise<TemplateConfig> {
    if (this.templateConfig) {
      return this.templateConfig;
    }

    try {
      // Try multiple possible paths for template configuration
      const possiblePaths = [
        path.join(process.cwd(), "expo-templates", "template-config.json"),
        path.join(__dirname, "..", "..", "..", "expo-templates", "template-config.json"),
        path.join(__dirname, "..", "..", "expo-templates", "template-config.json"),
      ];

      let configPath: string | null = null;
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          configPath = possiblePath;
          this.templatesPath = path.dirname(possiblePath);
          break;
        }
      }

      if (!configPath) {
        throw new Error(`Template configuration not found. Tried paths: ${possiblePaths.join(', ')}`);
      }

      const configContent = fs.readFileSync(configPath, "utf-8");
      this.templateConfig = JSON.parse(configContent);
      logger.info(`✅ Template configuration loaded from: ${configPath}`);
      return this.templateConfig;
    } catch (error) {
      logger.error("❌ Failed to load template configuration:", error);
      throw new Error(`Template configuration not found: ${error.message}`);
    }
  }

  static async createExpoApp(params: CreateExpoAppParams): Promise<void> {
    const startTime = performance.now();
    logger.info(`🚀 [EXPO-TEMPLATE] Creating Expo app: ${params.appName}`);
    logger.info(`📋 [EXPO-TEMPLATE] Template path: ${this.templatesPath}`);
    logger.info(`📋 [EXPO-TEMPLATE] Requested template: ${params.template || 'base-router'}`);

    try {
      const config = await this.loadTemplateConfig();
      const templateName = params.template || 'base-router';
      const template = config.templates[templateName];

      if (!template) {
        const availableTemplates = Object.keys(config.templates);
        throw new Error(`Template '${templateName}' not found. Available templates: ${availableTemplates.join(', ')}`);
      }

      logger.info(`✅ [EXPO-TEMPLATE] Using template: ${template.name} with ${template.features.length} features`);
      logger.info(`📁 [EXPO-TEMPLATE] Target path: ${params.fullAppPath}`);

      // 1. Copy base template
      await this.copyBaseTemplate(params.fullAppPath, template.path);

      // 2. Get features first (needed for template variables)
      const features = params.features || template.features;

      // 3. Apply template variables (including FEATURES)
      await this.applyTemplateVariables(params.fullAppPath, {
        APP_NAME: params.appName,
        APP_DISPLAY_NAME: params.displayName,
        APP_SLUG: params.slug,
        PACKAGE_ID: params.packageId,
        FEATURES: JSON.stringify(features), // Convert array to JSON string for replacement
      });

      // 4. Add selected features
      if (features.length > 0) {
        await this.addFeatures(params.fullAppPath, features, config);
      }

      // 5. Create essential directories and files
      await this.createEssentialStructure(params.fullAppPath);

      // 6. Validate template structure matches system prompt
      await this.validateTemplateStructure(params.fullAppPath);

      // 7. Create .env file for non-interactive mode
      await this.createEnvFile(params.fullAppPath);

      // 7. Rebuild native modules if AI features are included
      const hasAIFeatures = features.some(f => 
        ['transformers-ai', 'snapai-icons', 'superdesign-ui'].includes(f)
      );
      if (hasAIFeatures) {
        try {
          const { rebuildNativeModules } = await import('../../lib/hermetic-runtime');
          await rebuildNativeModules(params.fullAppPath);
        } catch (error) {
          logger.warn('⚠️ Native module rebuild failed, but continuing:', error);
        }
      }

      const totalTime = performance.now() - startTime;
      logger.info(`✅ [EXPO-TEMPLATE] Expo app created in ${totalTime.toFixed(2)}ms`);

    } catch (error) {
      logger.error(`❌ [EXPO-TEMPLATE] Failed to create Expo app:`, error);
      throw error;
    }
  }

  private static async copyBaseTemplate(targetPath: string, templatePath: string): Promise<void> {
    const sourcePath = path.join(this.templatesPath, templatePath);
    
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Template path not found: ${sourcePath}`);
    }

    logger.info(`📋 [EXPO-TEMPLATE] Copying base template from ${templatePath}`);
    await this.copyDirectory(sourcePath, targetPath);
  }

  private static async copyDirectory(source: string, target: string): Promise<void> {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    const items = fs.readdirSync(source);

    for (const item of items) {
      const sourcePath = path.join(source, item);
      const targetPath = path.join(target, item);
      const stat = fs.statSync(sourcePath);

      if (stat.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }

  private static async applyTemplateVariables(
    appPath: string, 
    variables: Record<string, string>
  ): Promise<void> {
    logger.info(`🔧 [EXPO-TEMPLATE] Applying template variables`);

    const filesToProcess = [
      'app.json',
      'package.json',
      'app/index.tsx',
      'app/_layout.tsx'
    ];

    for (const file of filesToProcess) {
      const filePath = path.join(appPath, file);
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf-8');
        
        // Replace template variables
        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          content = content.replace(regex, value);
        });

        fs.writeFileSync(filePath, content, 'utf-8');
      }
    }
  }

  private static async addFeatures(
    appPath: string, 
    features: string[], 
    config: TemplateConfig
  ): Promise<void> {
    logger.info(`🔌 [EXPO-TEMPLATE] Adding features: ${features.join(', ')}`);

    const packageJson = JSON.parse(fs.readFileSync(path.join(appPath, 'package.json'), 'utf-8'));
    const appJson = JSON.parse(fs.readFileSync(path.join(appPath, 'app.json'), 'utf-8'));

    for (const featureName of features) {
      const feature = config.features[featureName];
      if (!feature) {
        logger.warn(`Feature '${featureName}' not found, skipping`);
        continue;
      }

      logger.info(`📦 [EXPO-TEMPLATE] Adding feature: ${feature.name}`);

      // Add dependencies
      if (feature.dependencies) {
        const featurePackagePath = path.join(this.templatesPath, 'features', featureName, 'package-additions.json');
        if (fs.existsSync(featurePackagePath)) {
          const additions = JSON.parse(fs.readFileSync(featurePackagePath, 'utf-8'));
          
          // Merge dependencies
          if (additions.dependencies) {
            packageJson.dependencies = { ...packageJson.dependencies, ...additions.dependencies };
          }

          // Add plugins to app.json
          if (additions.plugins) {
            appJson.expo.plugins = appJson.expo.plugins || [];
            additions.plugins.forEach((plugin: string) => {
              if (!appJson.expo.plugins.includes(plugin)) {
                appJson.expo.plugins.push(plugin);
              }
            });
          }

          // Add babel plugins
          if (additions.babel?.plugins) {
            // Create or update babel.config.js
            await this.updateBabelConfig(appPath, additions.babel.plugins);
          }
        }
      }

      // Copy feature files
      await this.copyFeatureFiles(appPath, featureName);
    }

    // Write updated package.json and app.json
    fs.writeFileSync(path.join(appPath, 'package.json'), JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(path.join(appPath, 'app.json'), JSON.stringify(appJson, null, 2));
  }

  private static async copyFeatureFiles(appPath: string, featureName: string): Promise<void> {
    const featurePath = path.join(this.templatesPath, 'features', featureName);
    
    // Copy components
    const componentsPath = path.join(featurePath, 'components');
    if (fs.existsSync(componentsPath)) {
      const targetComponentsPath = path.join(appPath, 'components');
      if (!fs.existsSync(targetComponentsPath)) {
        fs.mkdirSync(targetComponentsPath, { recursive: true });
      }
      await this.copyDirectory(componentsPath, targetComponentsPath);
    }

    // Copy utils
    const utilsPath = path.join(featurePath, 'utils');
    if (fs.existsSync(utilsPath)) {
      const targetUtilsPath = path.join(appPath, 'utils');
      if (!fs.existsSync(targetUtilsPath)) {
        fs.mkdirSync(targetUtilsPath, { recursive: true });
      }
      await this.copyDirectory(utilsPath, targetUtilsPath);
    }
  }

  private static async updateBabelConfig(appPath: string, plugins: string[]): Promise<void> {
    const babelConfigPath = path.join(appPath, 'babel.config.js');
    
    const babelConfig = `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [${plugins.map(p => `'${p}'`).join(', ')}],
  };
};`;

    fs.writeFileSync(babelConfigPath, babelConfig);
  }

  private static async createEssentialStructure(appPath: string): Promise<void> {
    // Create essential directories
    const directories = [
      'assets',
      'components',
      'utils',
      'constants'
    ];

    directories.forEach(dir => {
      const dirPath = path.join(appPath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });

    // Create placeholder assets
    await this.createPlaceholderAssets(appPath);
  }

  private static async createPlaceholderAssets(appPath: string): Promise<void> {
    const assetsPath = path.join(appPath, 'assets');
    
    // Create simple placeholder files with valid PNG data
    const placeholderFiles = [
      'icon.png',
      'splash.png',
      'adaptive-icon.png',
      'favicon.png'
    ];

    // Minimal valid 1x1 transparent PNG (base64 encoded)
    const minimalPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const minimalPngBuffer = Buffer.from(minimalPngBase64, 'base64');

    placeholderFiles.forEach(file => {
      const filePath = path.join(assetsPath, file);
      if (!fs.existsSync(filePath)) {
        // Create a valid minimal PNG file instead of empty file
        fs.writeFileSync(filePath, minimalPngBuffer);
      }
    });
  }

  private static async validateTemplateStructure(appPath: string): Promise<void> {
    logger.info(`🔍 [EXPO-TEMPLATE] Validating template structure matches system prompt`);
    
    const requiredFiles = [
      'app/_layout.tsx',
      'app/index.tsx', 
      'app/features.tsx',
      'app/+not-found.tsx',
      'constants/Colors.ts',
      'components/AITextGenerator.tsx',
      'components/ui/GradientCard.tsx',
      'components/ui/GlassmorphismView.tsx',
      'components/ui/AnimatedButton.tsx',
      'package.json',
      'app.json'
    ];

    const missingFiles = [];
    for (const file of requiredFiles) {
      const filePath = path.join(appPath, file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      logger.warn(`⚠️ [EXPO-TEMPLATE] Missing required files: ${missingFiles.join(', ')}`);
    }

    // Validate no conflicting structures exist
    const conflictingPaths = [
      'app/(tabs)',  // Should not exist - template uses flat structure
      'constants/colors.ts', // Wrong case
      'src/constants/Colors.ts' // Wrong location
    ];

    const conflicts = [];
    for (const conflictPath of conflictingPaths) {
      const fullPath = path.join(appPath, conflictPath);
      if (fs.existsSync(fullPath)) {
        conflicts.push(conflictPath);
      }
    }

    if (conflicts.length > 0) {
      logger.warn(`⚠️ [EXPO-TEMPLATE] Conflicting structures found: ${conflicts.join(', ')}`);
    }

    logger.info(`✅ [EXPO-TEMPLATE] Template structure validation completed`);
  }

  static getAvailableTemplates(): Record<string, any> {
    try {
      const config = this.templateConfig || JSON.parse(
        fs.readFileSync(path.join(this.templatesPath, "template-config.json"), "utf-8")
      );
      return config.templates;
    } catch (error) {
      logger.error("Failed to get available templates:", error);
      return {};
    }
  }

  static getAvailableFeatures(): Record<string, any> {
    try {
      const config = this.templateConfig || JSON.parse(
        fs.readFileSync(path.join(this.templatesPath, "template-config.json"), "utf-8")
      );
      return config.features;
    } catch (error) {
      logger.error("Failed to get available features:", error);
      return {};
    }
  }

  private static async createEnvFile(appPath: string): Promise<void> {
    logger.info(`🔧 [EXPO-TEMPLATE] Creating .env file for non-interactive mode`);
    
    const envContent = `# Expo Environment Configuration
# Prevents interactive prompts and ensures smooth operation

# Disable interactive prompts
EXPO_NO_DOCTOR=1
EXPO_NO_UPDATE_CHECK=1
EXPO_NO_TYPESCRIPT_SETUP=1
EXPO_NO_WEB_SETUP=1

# Metro bundler configuration
METRO_NO_INTERACTIVE=1
CI=1

# Tunnel configuration (prevents ngrok prompts)
EXPO_USE_NGROK=1
NGROK_REGION=us

# Development settings
NODE_ENV=development
EXPO_DEBUG=0
`;

    const envPath = path.join(appPath, '.env');
    fs.writeFileSync(envPath, envContent, 'utf-8');
    logger.info(`✅ [EXPO-TEMPLATE] Created .env file at ${envPath}`);
  }
}
