import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export interface WordPressConfig {
  url: string;
  apiEndpoint?: string;
  authEndpoint?: string;
  customHeaders?: Record<string, string>;
}

/**
 * Get the config file path - uses user data directory for packaged apps
 */
function getConfigPath(): string {
  // In development, use project root
  if (!app.isPackaged) {
    return path.join(process.cwd(), 'wordpress-config.json');
  }
  
  // In production EXE, use user data directory (e.g., AppData/Roaming/Applaa)
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'wordpress-config.json');
}

export function loadWordPressConfig(): WordPressConfig | null {
  try {
    // Try to load from config file first
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    }

    // Fallback to environment variables (only works in development)
    const wordpressUrl = process.env.WORDPRESS_URL;
    if (wordpressUrl) {
      console.log('[WordPress Config] Using WORDPRESS_URL from environment:', wordpressUrl);
      return {
        url: wordpressUrl,
        apiEndpoint: `${wordpressUrl}/wp-json/wp/v2`,
        authEndpoint: `${wordpressUrl}/wp-json/wp/v2/users/me`,
      };
    }

    // For packaged apps without config, provide a default placeholder
    if (app.isPackaged) {
      console.log('[WordPress Config] No config found in packaged app - will prompt for setup');
      return {
        url: 'https://applaa.io', // Default placeholder - user will be prompted to change
        apiEndpoint: 'https://applaa.io/wp-json/wp/v2',
        authEndpoint: 'https://applaa.io/wp-json/wp/v2/users/me',
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to load WordPress config:', error);
    return null;
  }
}

export function saveWordPressConfig(config: WordPressConfig): boolean {
  try {
    const configPath = getConfigPath();
    
    // Ensure directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('[WordPress Config] Saved to:', configPath);
    return true;
  } catch (error) {
    console.error('Failed to save WordPress config:', error);
    return false;
  }
}

export function getWordPressAuthEndpoint(): string {
  const config = loadWordPressConfig();
  return config?.authEndpoint || `${config?.url || process.env.WORDPRESS_URL}/wp-json/wp/v2/users/me`;
}

export function getWordPressApiEndpoint(): string {
  const config = loadWordPressConfig();
  return config?.apiEndpoint || `${config?.url || process.env.WORDPRESS_URL}/wp-json/wp/v2`;
}
