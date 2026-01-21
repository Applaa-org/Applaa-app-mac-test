import { ipcMain } from 'electron';
import log from 'electron-log';
import { readSettings, writeSettings } from '../../main/settings';
import { loadWordPressConfig, getWordPressAuthEndpoint } from '../../lib/wordpress-config';
import { syncWordPressUserToSupabase } from '../../lib/supabase';
import { hasAdminPermission } from '../../utils/permissions';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase';

// Helper function to get Supabase admin client (bypasses RLS)
function getSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    throw new Error('Supabase service role key or URL not configured');
  }

  return createClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

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
      
      // ✅ FIX: Get user details using the token with context=edit to include email
      // WordPress REST API requires context=edit to return email field for privacy/security
      const userResponse = await fetch(`${wordpressUrl}/wp-json/wp/v2/users/me?context=edit`, {
        headers: {
          'Authorization': `Bearer ${authData.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user details');
      }

      const userData = await userResponse.json();
      
      console.log('🔑 [WordPress Auth] Raw userData from WordPress API:', JSON.stringify(userData, null, 2));
      
      // ✅ FIX: Resolve email from Supabase if WordPress doesn't provide it
      // WordPress users already exist in Supabase, so we can fetch their real email
      let resolvedEmail = userData.email;
      
      if (!resolvedEmail || resolvedEmail === '') {
        console.log('🔍 [WordPress Auth] Email not provided by WordPress API, looking up in Supabase...');
        
        try {
          const adminClient = getSupabaseAdminClient();
          let profile = null;
          
          // Strategy 1: Try by wordpress_username
          if (userData.username) {
            console.log('🔍 [WordPress Auth] Strategy 1: Looking up by wordpress_username:', userData.username);
            const { data, error } = await adminClient
              .from('profiles')
              .select('email')
              .eq('wordpress_username', userData.username)
              .maybeSingle();
            
            if (data && !error) {
              profile = data;
              console.log('✅ [WordPress Auth] Found profile by wordpress_username:', data.email);
            }
          }
          
          // Strategy 2: Try by wordpress_display_name (often matches username in database)
          if (!profile && userData.name) {
            console.log('🔍 [WordPress Auth] Strategy 2: Looking up by wordpress_display_name:', userData.name);
            const { data, error } = await adminClient
              .from('profiles')
              .select('email')
              .eq('wordpress_display_name', userData.name)
              .maybeSingle();
            
            if (data && !error) {
              profile = data;
              console.log('✅ [WordPress Auth] Found profile by wordpress_display_name:', data.email);
            }
          }
          
          // Strategy 3: Try by wordpress_user_id
          if (!profile && userData.id) {
            console.log('🔍 [WordPress Auth] Strategy 3: Looking up by wordpress_user_id:', userData.id);
            const { data, error } = await adminClient
              .from('profiles')
              .select('email')
              .eq('wordpress_user_id', userData.id)
              .maybeSingle();
            
            if (data && !error) {
              profile = data;
              console.log('✅ [WordPress Auth] Found profile by wordpress_user_id:', data.email);
            }
          }
          
          // Use found email or fallback
          if (profile?.email) {
            resolvedEmail = profile.email;
            console.log('✅ [WordPress Auth] Successfully resolved email from Supabase:', resolvedEmail);
          } else {
            console.log('⚠️ [WordPress Auth] No existing profile found in Supabase, using fallback email');
            resolvedEmail = 'unknown@example.com';
          }
        } catch (error) {
          console.error('❌ [WordPress Auth] Failed to lookup email from Supabase:', error);
          log.warn('Failed to lookup WordPress user email from Supabase:', error);
          resolvedEmail = 'unknown@example.com';
        }
      } else {
        console.log('✅ [WordPress Auth] Email provided by WordPress API:', resolvedEmail);
      }
      
      // Store user data with proper validation and fallbacks
      currentUser = {
        id: userData.id || 0,
        username: userData.username || 'unknown',
        email: resolvedEmail,
        display_name: userData.name || userData.username || 'User',
        roles: userData.roles || ['subscriber'],
        avatar_url: userData.avatar_urls?.['96'],
        capabilities: userData.capabilities || [],
      };
      
      console.log('🔑 [WordPress Auth] Processed currentUser object:', JSON.stringify(currentUser, null, 2));
      console.log('🔑 [WordPress Auth] Username:', currentUser.username);
      console.log('🔑 [WordPress Auth] Display name:', currentUser.display_name);
      
      authToken = authData.token;
      isAuthenticated = true;
      
        // Save to settings with proper validation
        try {
          const settings = readSettings();
          settings.wordpressAuth = {
            isAuthenticated: true,
            user: currentUser,
            token: authData.token,
            lastLogin: new Date().toISOString(),
          };
          writeSettings(settings);
          console.log('🔑 [WordPress Auth] ✅ Saved to settings:', JSON.stringify(settings.wordpressAuth, null, 2));
        } catch (error) {
          console.error('🔑 [WordPress Auth] ❌ Failed to save to settings:', error);
          log.warn('Failed to save WordPress auth to settings:', error);
          // Continue without saving to settings - authentication still works
        }
      
      // Sync WordPress user to Supabase (non-blocking)
      try {
        await syncWordPressUserToSupabase({
          email: currentUser.email,
          username: currentUser.username,
          display_name: currentUser.display_name,
          id: currentUser.id,
          roles: currentUser.roles,
          avatar_url: currentUser.avatar_url,
        });
      } catch (error) {
        log.warn('Failed to sync WordPress user to Supabase (non-critical):', error);
        // Don't fail login if Supabase sync fails
      }
      
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

  // Sync WordPress user to Supabase (manual trigger)
  ipcMain.handle('wordpress:sync-to-supabase', async () => {
    try {
      if (!currentUser || !isAuthenticated) {
        return { success: false, error: 'No WordPress user logged in' };
      }

      const profile = await syncWordPressUserToSupabase({
        email: currentUser.email,
        username: currentUser.username,
        display_name: currentUser.display_name,
        id: currentUser.id,
        roles: currentUser.roles,
        avatar_url: currentUser.avatar_url,
      });

      if (!profile) {
        return { success: false, error: 'Supabase not configured or sync failed' };
      }

      return { success: true, profile };
    } catch (error) {
      log.error('Failed to sync WordPress user to Supabase:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // WordPress Logout
  ipcMain.handle('wordpress:logout', async () => {
    try {
      currentUser = null;
      authToken = null;
      isAuthenticated = false;
      
      // Clear from settings with proper error handling
      try {
        const settings = readSettings();
        settings.wordpressAuth = {
          isAuthenticated: false,
          user: undefined,
          token: undefined,
          lastLogin: undefined,
        };
        writeSettings(settings);
      } catch (error) {
        log.warn('Failed to clear WordPress auth from settings:', error);
        // Continue with logout even if settings update fails
      }
      
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
        // Try to restore from settings with proper validation
        try {
          const settings = readSettings();
          if (settings.wordpressAuth?.isAuthenticated && settings.wordpressAuth?.user) {
            const user = settings.wordpressAuth.user;
            // Validate that user has required fields
            if (user.username && user.email) {
              currentUser = user;
              authToken = settings.wordpressAuth.token || null;
              isAuthenticated = true;
            }
          }
        } catch (error) {
          log.warn('Failed to restore WordPress auth from settings:', error);
          // Continue with unauthenticated state
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

  // Check if user has admin permission (for games and game templates management)
  ipcMain.handle('wordpress:check-admin-permission', async () => {
    try {
      const hasPermission = hasAdminPermission();
      return { hasPermission };
    } catch (error) {
      log.error('Failed to check admin permission:', error);
      return { hasPermission: false };
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

      // ✅ FIX: Validate with WordPress API using context=edit to get email
      const response = await fetch(`${wordpressUrl}/wp-json/wp/v2/users/me?context=edit`, {
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
