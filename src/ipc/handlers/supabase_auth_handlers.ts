import { ipcMain } from 'electron';
import log from 'electron-log';
import { initializeSupabase, getSupabaseAuth, SupabaseConfig } from '../../lib/supabase';
import { readSettings, writeSettings } from '../../main/settings';

// Auth state management
let isInitialized = false;
let currentUser: any = null;
let currentSession: any = null;

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  subscriptionTier: 'free' | 'pro';
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

export function registerSupabaseAuthHandlers() {
  // Initialize Supabase
  ipcMain.handle('supabase:initialize', async (_, config: SupabaseConfig) => {
    try {
      if (isInitialized) {
        return { success: true, message: 'Already initialized' };
      }

      const client = initializeSupabase(config);
      const auth = getSupabaseAuth();

      // Set up auth state listener
      auth.onAuthStateChange(async (event, session) => {
        log.info(`Auth state changed: ${event}`);
        
        if (session) {
          currentSession = session;
          currentUser = session.user;
          
          // Get full profile data
          try {
            const profile = await auth.getProfile(session.user.id);
            currentUser = {
              ...session.user,
              ...profile,
            };
          } catch (error) {
            log.warn('Failed to fetch user profile:', error);
          }
        } else {
          currentSession = null;
          currentUser = null;
        }

        // Notify renderer of auth state change
        // Note: This would need the main window reference
        // mainWindow?.webContents.send('auth:state-changed', { user: currentUser, session: currentSession });
      });

      isInitialized = true;
      log.info('Supabase authentication initialized');
      return { success: true, message: 'Initialized successfully' };
    } catch (error) {
      log.error('Failed to initialize Supabase:', error);
      return { success: false, error: error.message };
    }
  });

  // Sign up
  ipcMain.handle('supabase:sign-up', async (_, { email, password, fullName }: { 
    email: string; 
    password: string; 
    fullName?: string; 
  }) => {
    try {
      if (!isInitialized) {
        throw new Error('Supabase not initialized');
      }

      const auth = getSupabaseAuth();
      const result = await auth.signUp(email, password, fullName);
      
      log.info('User signed up successfully');
      return { 
        success: true, 
        user: result.user,
        session: result.session,
        message: 'Account created successfully' 
      };
    } catch (error) {
      log.error('Sign up failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Sign in
  ipcMain.handle('supabase:sign-in', async (_, { email, password }: { 
    email: string; 
    password: string; 
  }) => {
    try {
      if (!isInitialized) {
        throw new Error('Supabase not initialized');
      }

      const auth = getSupabaseAuth();
      const result = await auth.signIn(email, password);
      
      log.info('User signed in successfully');
      return { 
        success: true, 
        user: result.user,
        session: result.session,
        message: 'Signed in successfully' 
      };
    } catch (error) {
      log.error('Sign in failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Sign out
  ipcMain.handle('supabase:sign-out', async () => {
    try {
      if (!isInitialized) {
        throw new Error('Supabase not initialized');
      }

      const auth = getSupabaseAuth();
      await auth.signOut();
      
      currentUser = null;
      currentSession = null;
      
      log.info('User signed out successfully');
      return { success: true, message: 'Signed out successfully' };
    } catch (error) {
      log.error('Sign out failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Get current user
  ipcMain.handle('supabase:get-current-user', async () => {
    try {
      if (!isInitialized) {
        return { success: false, error: 'Supabase not initialized' };
      }

      const auth = getSupabaseAuth();
      const user = await auth.getCurrentUser();
      
      if (user) {
        // Get full profile
        try {
          const profile = await auth.getProfile(user.id);
          const fullUser = { ...user, ...profile };
          currentUser = fullUser;
          return { success: true, user: fullUser };
        } catch (error) {
          log.warn('Failed to fetch user profile:', error);
          return { success: true, user };
        }
      }
      
      return { success: true, user: null };
    } catch (error) {
      log.error('Get current user failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Get current session
  ipcMain.handle('supabase:get-current-session', async () => {
    try {
      if (!isInitialized) {
        return { success: false, error: 'Supabase not initialized' };
      }

      const auth = getSupabaseAuth();
      const session = await auth.getCurrentSession();
      currentSession = session;
      
      return { success: true, session };
    } catch (error) {
      log.error('Get current session failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Reset password
  ipcMain.handle('supabase:reset-password', async (_, { email }: { email: string }) => {
    try {
      if (!isInitialized) {
        throw new Error('Supabase not initialized');
      }

      const auth = getSupabaseAuth();
      await auth.resetPassword(email);
      
      log.info('Password reset email sent');
      return { success: true, message: 'Password reset email sent' };
    } catch (error) {
      log.error('Reset password failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Update password
  ipcMain.handle('supabase:update-password', async (_, { newPassword }: { newPassword: string }) => {
    try {
      if (!isInitialized) {
        throw new Error('Supabase not initialized');
      }

      const auth = getSupabaseAuth();
      await auth.updatePassword(newPassword);
      
      log.info('Password updated successfully');
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      log.error('Update password failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Update profile
  ipcMain.handle('supabase:update-profile', async (_, updates: {
    fullName?: string;
    avatarUrl?: string;
  }) => {
    try {
      if (!isInitialized || !currentUser) {
        throw new Error('Not authenticated');
      }

      const auth = getSupabaseAuth();
      const updatedProfile = await auth.updateProfile(currentUser.id, updates);
      
      // Update current user
      currentUser = { ...currentUser, ...updatedProfile };
      
      log.info('Profile updated successfully');
      return { success: true, user: currentUser, message: 'Profile updated successfully' };
    } catch (error) {
      log.error('Update profile failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Check if user is authenticated
  ipcMain.handle('supabase:is-authenticated', async () => {
    return {
      isAuthenticated: !!currentUser && !!currentSession,
      user: currentUser,
      session: currentSession
    };
  });

  // Initialize from environment variables only
  ipcMain.handle('supabase:initialize-from-settings', async () => {
    try {
      // Use AUTH environment variables (separate from Supabase integration)
      const envUrl = process.env.AUTH_SUPABASE_URL;
      const envAnonKey = process.env.AUTH_SUPABASE_ANON_KEY;
      const envServiceRoleKey = process.env.AUTH_SUPABASE_SERVICE_ROLE_KEY;
      
      if (!envUrl || !envAnonKey) {
        return { success: false, error: 'Authentication credentials not configured. Please set AUTH_SUPABASE_URL and AUTH_SUPABASE_ANON_KEY in your .env file.' };
      }
      
      const config: SupabaseConfig = {
        url: envUrl,
        anonKey: envAnonKey,
        serviceRoleKey: envServiceRoleKey,
      };
      
      log.info('Using Supabase credentials from environment variables');

      const client = initializeSupabase(config);
      const auth = getSupabaseAuth();

      // Set up auth state listener
      auth.onAuthStateChange(async (event, session) => {
        log.info(`Auth state changed: ${event}`);
        
        if (session) {
          currentSession = session;
          currentUser = session.user;
          
          // Get full profile data
          try {
            const profile = await auth.getProfile(session.user.id);
            currentUser = {
              ...session.user,
              ...profile,
            };
          } catch (error) {
            log.warn('Failed to fetch user profile:', error);
          }
        } else {
          currentSession = null;
          currentUser = null;
        }
      });

      isInitialized = true;
      log.info('Supabase authentication initialized from settings');
      return { success: true, message: 'Initialized successfully from settings' };
    } catch (error) {
      log.error('Failed to initialize from settings:', error);
      return { success: false, error: error.message };
    }
  });

  // Save Supabase credentials to settings (disabled - using environment variables only)
  ipcMain.handle('supabase:save-credentials', async (_, credentials: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  }) => {
    log.warn('Manual credential saving is disabled. Please use environment variables instead.');
    return { 
      success: false, 
      error: 'Manual credential saving is disabled. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.' 
    };
  });

  // Check if Supabase is configured via environment variables
  ipcMain.handle('supabase:check-configuration', async () => {
    try {
      // Try to load .env file if environment variables are not set
      if (!process.env.AUTH_SUPABASE_URL || !process.env.AUTH_SUPABASE_ANON_KEY) {
        try {
          const dotenv = require('dotenv');
          const path = require('path');
          const fs = require('fs');
          
          // Try multiple possible locations for the .env file
          const possibleEnvPaths = [
            path.join(process.cwd(), '.env'),
            path.join(__dirname, '../../.env'),
            path.join(__dirname, '../../../.env'),
            path.join(process.resourcesPath || '', '.env'),
          ];
          
          for (const envPath of possibleEnvPaths) {
            if (fs.existsSync(envPath)) {
              dotenv.config({ path: envPath });
              console.log('✅ Loaded .env from:', envPath);
              break;
            }
          }
        } catch (error) {
          console.log('⚠️ Failed to load .env file:', error);
        }
      }
      
      // Check AUTH environment variables (separate from Supabase integration)
      const envUrl = process.env.AUTH_SUPABASE_URL;
      const envAnonKey = process.env.AUTH_SUPABASE_ANON_KEY;
      const envServiceRoleKey = process.env.AUTH_SUPABASE_SERVICE_ROLE_KEY;
      
      console.log('🔍 Checking Supabase configuration:');
      console.log('SUPABASE_URL:', envUrl ? 'SET' : 'NOT SET');
      console.log('SUPABASE_ANON_KEY:', envAnonKey ? 'SET' : 'NOT SET');
      console.log('SUPABASE_SERVICE_ROLE_KEY:', envServiceRoleKey ? 'SET' : 'NOT SET');
      
      log.info('Checking Supabase configuration:');
      log.info('SUPABASE_URL:', envUrl ? 'SET' : 'NOT SET');
      log.info('SUPABASE_ANON_KEY:', envAnonKey ? 'SET' : 'NOT SET');
      log.info('SUPABASE_SERVICE_ROLE_KEY:', envServiceRoleKey ? 'SET' : 'NOT SET');
      
      if (envUrl && envAnonKey) {
        return {
          isConfigured: true,
          source: 'environment',
          hasUrl: true,
          hasAnonKey: true,
          hasServiceRoleKey: !!envServiceRoleKey,
        };
      }
      
      return {
        isConfigured: false,
        source: 'none',
        hasUrl: false,
        hasAnonKey: false,
        hasServiceRoleKey: false,
      };
    } catch (error) {
      log.error('Failed to check Supabase configuration:', error);
      return {
        isConfigured: false,
        source: 'error',
        error: error.message,
      };
    }
  });

  // Sign in with Google OAuth
  ipcMain.handle('supabase:sign-in-with-google', async () => {
    try {
      if (!isInitialized) {
        throw new Error('Supabase not initialized');
      }

      const auth = getSupabaseAuth();
      const result = await auth.signInWithGoogle();
      
      log.info('Google OAuth URL generated');
      return { 
        success: true, 
        url: result.url,
        message: 'Opening Google sign in...' 
      };
    } catch (error) {
      log.error('Google sign in failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Exchange OAuth code for session
  ipcMain.handle('supabase:exchange-code-for-session', async (_, { code }: { code: string }) => {
    try {
      if (!isInitialized) {
        throw new Error('Supabase not initialized');
      }

      const auth = getSupabaseAuth();
      const session = await auth.exchangeCodeForSession(code);
      
      // Update current session and user
      currentSession = session.session;
      currentUser = session.user;
      
      // Get full profile data
      try {
        const profile = await auth.getProfile(session.user.id);
        currentUser = {
          ...session.user,
          ...profile,
        };
      } catch (error) {
        log.warn('Failed to fetch user profile:', error);
      }
      
      log.info('OAuth code exchanged successfully');
      return { success: true, session };
    } catch (error) {
      log.error('Failed to exchange OAuth code:', error);
      return { success: false, error: error.message };
    }
  });

  // Set session from OAuth callback
  ipcMain.handle('supabase:set-session', async (_, params: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }) => {
    try {
      if (!isInitialized) {
        throw new Error('Supabase not initialized');
      }

      const auth = getSupabaseAuth();
      await auth.setSession(params);
      
      log.info('OAuth session set successfully');
      return { success: true };
    } catch (error) {
      log.error('Failed to set OAuth session:', error);
      return { success: false, error: error.message };
    }
  });
}

