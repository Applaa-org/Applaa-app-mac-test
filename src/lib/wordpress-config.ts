import fs from 'fs';
import path from 'path';

export interface WordPressConfig {
  url: string;
  apiEndpoint?: string;
  authEndpoint?: string;
  customHeaders?: Record<string, string>;
}

export function loadWordPressConfig(): WordPressConfig | null {
  try {
    // Try to load from config file first
    const configPath = path.join(process.cwd(), 'wordpress-config.json');
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    }

    // Fallback to environment variables
    const wordpressUrl = process.env.WORDPRESS_URL;
    if (wordpressUrl) {
      return {
        url: wordpressUrl,
        apiEndpoint: `${wordpressUrl}/wp-json/wp/v2`,
        authEndpoint: `${wordpressUrl}/wp-json/wp/v2/users/me`,
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
    const configPath = path.join(process.cwd(), 'wordpress-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
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
