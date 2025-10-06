import { ipcMain } from 'electron';
import log from 'electron-log';
import { readSettings, writeSettings } from '../../main/settings';
import { loadWordPressConfig, getWordPressAuthEndpoint } from '../../lib/wordpress-config';

// WordPress Auth state management
let isAuthenticated = false;
let currentUser: any = null;
let authToken: string | null = null;

export interface WordPressUser {
  id: number;
  username: string;
  email: string;
  display_name: string;
  roles: string[];
  avatar_url?: string;
  capabilities: string[];
}

export interface WordPressAuthSession {
  token: string;
  user: WordPressUser;
  expires_at: number;
}

export function registerWordPressAuthHandlers() {
  // Check WordPress authentication configuration
  ipcMain.handle('wordpress:check-configuration', async () => {
    try {
      // Always return configured since we're using API-based authentication
      console.log('🔍 WordPress configuration: Using API-based authentication with Applaa.com');
      
      return {
        isConfigured: true,
        source: 'api',
        hasUrl: true,
        hasApplicationPassword: false, // Not needed for API-based auth
        url: 'https://applaa.com',
      };
    } catch (error) {
      log.error('Failed to check WordPress configuration:', error);
      return {
        isConfigured: true, // Even on error, assume it's configured for API-based auth
        source: 'api',
        hasUrl: true,
        url: 'https://applaa.com',
      };
    }
  });

  // WordPress Login - Simple integration with existing web app
  ipcMain.handle('wordpress:login', async (_, { username, password }: { 
    username: string; 
    password: string; 
  }) => {
    try {
      // Get WordPress configuration
      const config = loadWordPressConfig();
      const wordpressUrl = config?.url || process.env.WORDPRESS_URL;
      
      if (!wordpressUrl) {
        throw new Error('WordPress not configured. Please set WORDPRESS_URL in your .env file or create wordpress-config.json file.');
      }

      // Use JWT authentication endpoint
      const loginEndpoint = `${wordpressUrl}/wp-json/jwt-auth/v1/token`;
      
      const response = await fetch(loginEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid username or password');
        }
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const authData = await response.json();
      
      if (!authData.token) {
        throw new Error('No token received from server');
      }
      
      // Get user details using the token
      const userResponse = await fetch(`${wordpressUrl}/wp-json/wp/v2/users/me`, {
        headers: {
          'Authorization': `Bearer ${authData.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user details');
      }

      const userData = await userResponse.json();
      
      // Store user data
      currentUser = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        display_name: userData.name,
        roles: userData.roles || ['subscriber'],
        avatar_url: userData.avatar_urls?.['96'],
        capabilities: userData.capabilities || [],
      };
      
      authToken = authData.token;
      isAuthenticated = true;
      
      // Save to settings
      const settings = readSettings();
      settings.wordpressAuth = {
        isAuthenticated: true,
        user: currentUser,
        token: authData.token,
        lastLogin: new Date().toISOString(),
      };
      writeSettings(settings);
      
      log.info('WordPress user authenticated successfully:', currentUser.username);
      return { 
        success: true, 
        user: currentUser,
        token: authData.token,
        message: 'Login successful' 
      };
    } catch (error) {
      log.error('WordPress login failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // WordPress registration handler
  ipcMain.handle('wordpress:register', async (_, { username, email, password, first_name, last_name }: { 
    username: string; 
    email: string; 
    password: string; 
    first_name: string;
    last_name: string;
  }) => {
    try {
      const config = loadWordPressConfig();
      const wordpressUrl = config?.url || process.env.WORDPRESS_URL;
      
      if (!wordpressUrl) {
        throw new Error('WordPress not configured. Please set WORDPRESS_URL in your .env file or create wordpress-config.json file.');
      }

      // Use your custom registration endpoint
      const registerEndpoint = `${wordpressUrl}/wp-json/applaa/v1/register`;
      
      const response = await fetch(registerEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
          first_name,
          last_name,
        }),
      });

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('Username or email already exists');
        }
        throw new Error(`Registration failed: ${response.statusText}`);
      }

      const registerData = await response.json();
      
      if (!registerData.success) {
        throw new Error('Registration failed');
      }
      
      log.info('WordPress user registered successfully:', registerData.username);
      return { 
        success: true, 
        user_id: registerData.user_id,
        username: registerData.username,
        email: registerData.email,
        message: 'Registration successful' 
      };
    } catch (error) {
      log.error('WordPress registration failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // WordPress Logout
  ipcMain.handle('wordpress:logout', async () => {
    try {
      currentUser = null;
      authToken = null;
      isAuthenticated = false;
      
      // Clear from settings
      const settings = readSettings();
      settings.wordpressAuth = {
        isAuthenticated: false,
        user: undefined,
        token: undefined,
        lastLogin: undefined,
      };
      writeSettings(settings);
      
      log.info('WordPress user logged out successfully');
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      log.error('WordPress logout failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get current WordPress user
  ipcMain.handle('wordpress:get-current-user', async () => {
    try {
      if (!isAuthenticated || !currentUser) {
        // Try to restore from settings
        const settings = readSettings();
        if (settings.wordpressAuth?.isAuthenticated && settings.wordpressAuth?.user) {
          currentUser = settings.wordpressAuth.user;
          authToken = settings.wordpressAuth.token || null;
          isAuthenticated = true;
        }
      }
      
      return {
        isAuthenticated,
        user: currentUser || undefined,
        token: authToken || undefined,
      };
    } catch (error) {
      log.error('Failed to get current WordPress user:', error);
      return {
        isAuthenticated: false,
        user: undefined,
        token: undefined,
      };
    }
  });

  // Check if user has specific capability
  ipcMain.handle('wordpress:check-capability', async (_, { capability }: { capability: string }) => {
    try {
      if (!isAuthenticated || !currentUser) {
        return { hasCapability: false };
      }
      
      const hasCapability = currentUser.capabilities?.includes(capability) || false;
      return { hasCapability };
    } catch (error) {
      log.error('Failed to check WordPress capability:', error);
      return { hasCapability: false };
    }
  });

  // Validate WordPress session
  ipcMain.handle('wordpress:validate-session', async () => {
    try {
      if (!isAuthenticated || !authToken || !currentUser) {
        return { isValid: false };
      }

      const wordpressUrl = process.env.WORDPRESS_URL;
      if (!wordpressUrl) {
        return { isValid: false };
      }

      // Validate with WordPress API
      const response = await fetch(`${wordpressUrl}/wp-json/wp/v2/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const isValid = response.ok;
      if (!isValid) {
        // Session expired, clear auth state
        currentUser = null;
        authToken = null;
        isAuthenticated = false;
      }

      return { isValid };
    } catch (error) {
      log.error('Failed to validate WordPress session:', error);
      return { isValid: false };
    }
  });

  // WordPress OAuth (if you have OAuth plugin)
  ipcMain.handle('wordpress:oauth-login', async (_, { provider }: { provider: string }) => {
    try {
      const wordpressUrl = process.env.WORDPRESS_URL;
      if (!wordpressUrl) {
        throw new Error('WordPress not configured');
      }

      // This would depend on your WordPress OAuth setup
      // You might need to redirect to WordPress OAuth endpoint
      const oauthUrl = `${wordpressUrl}/wp-json/oauth/v1/authorize?client_id=${process.env.WORDPRESS_OAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent('applaa://oauth-callback')}&response_type=code&scope=read`;
      
      return {
        success: true,
        oauthUrl,
        message: 'Redirect to OAuth URL'
      };
    } catch (error) {
      log.error('WordPress OAuth login failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
