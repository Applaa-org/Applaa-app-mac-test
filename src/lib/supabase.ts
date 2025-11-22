import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import log from 'electron-log';

// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          subscription_tier: 'free' | 'pro';
          wordpress_user_id: number | null;
          wordpress_username: string | null;
          wordpress_display_name: string | null;
          wordpress_roles: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: 'free' | 'pro';
          wordpress_user_id?: number | null;
          wordpress_username?: string | null;
          wordpress_display_name?: string | null;
          wordpress_roles?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: 'free' | 'pro';
          wordpress_user_id?: number | null;
          wordpress_username?: string | null;
          wordpress_display_name?: string | null;
          wordpress_roles?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_apps: {
        Row: {
          id: string;
          user_display_name: string;
          local_app_id: number;
          app_name: string;
          app_type: 'web' | 'mobile' | 'godot';
          local_path: string | null;
          status: string | null;
          github_org: string | null;
          github_repo: string | null;
          github_branch: string | null;
          github_repo_url: string | null;
          vercel_project_id: string | null;
          vercel_project_name: string | null;
          vercel_team_id: string | null;
          vercel_deployment_url: string | null;
          supabase_project_id: string | null;
          neon_project_id: string | null;
          neon_development_branch_id: string | null;
          neon_preview_branch_id: string | null;
          eas_build_url: string | null;
          eas_deployment_url: string | null;
          eas_project_id: string | null;
          eas_build_id: string | null;
          local_apk_path: string | null;
          local_aab_path: string | null;
          local_ipa_path: string | null;
          local_apk_built_at: string | null;
          local_aab_built_at: string | null;
          local_ipa_built_at: string | null;
          deployment_status: string | null;
          last_deployment_at: string | null;
          deployment_notes: string | null;
          show_in_hub: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_display_name: string;
          local_app_id: number;
          app_name: string;
          app_type?: 'web' | 'mobile' | 'godot';
          local_path?: string | null;
          status?: string | null;
          github_org?: string | null;
          github_repo?: string | null;
          github_branch?: string | null;
          github_repo_url?: string | null;
          vercel_project_id?: string | null;
          vercel_project_name?: string | null;
          vercel_team_id?: string | null;
          vercel_deployment_url?: string | null;
          supabase_project_id?: string | null;
          neon_project_id?: string | null;
          neon_development_branch_id?: string | null;
          neon_preview_branch_id?: string | null;
          eas_build_url?: string | null;
          eas_deployment_url?: string | null;
          eas_project_id?: string | null;
          eas_build_id?: string | null;
          local_apk_path?: string | null;
          local_aab_path?: string | null;
          local_ipa_path?: string | null;
          local_apk_built_at?: string | null;
          local_aab_built_at?: string | null;
          local_ipa_built_at?: string | null;
          deployment_status?: string | null;
          last_deployment_at?: string | null;
          deployment_notes?: string | null;
          show_in_hub?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_display_name?: string;
          local_app_id?: number;
          app_name?: string;
          app_type?: 'web' | 'mobile' | 'godot';
          local_path?: string | null;
          status?: string | null;
          github_org?: string | null;
          github_repo?: string | null;
          github_branch?: string | null;
          github_repo_url?: string | null;
          vercel_project_id?: string | null;
          vercel_project_name?: string | null;
          vercel_team_id?: string | null;
          vercel_deployment_url?: string | null;
          supabase_project_id?: string | null;
          neon_project_id?: string | null;
          neon_development_branch_id?: string | null;
          neon_preview_branch_id?: string | null;
          eas_build_url?: string | null;
          eas_deployment_url?: string | null;
          eas_project_id?: string | null;
          eas_build_id?: string | null;
          local_apk_path?: string | null;
          local_aab_path?: string | null;
          local_ipa_path?: string | null;
          local_apk_built_at?: string | null;
          local_aab_built_at?: string | null;
          local_ipa_built_at?: string | null;
          deployment_status?: string | null;
          last_deployment_at?: string | null;
          deployment_notes?: string | null;
          show_in_hub?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sqlite_backups: {
        Row: {
          id: string;
          user_id: string;
          backup_path: string;
          backup_size: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          backup_path: string;
          backup_size?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          backup_path?: string;
          backup_size?: number | null;
          created_at?: string;
        };
      };
    };
  };
}

// Singleton Supabase client
let supabaseClient: SupabaseClient<Database> | null = null;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

export function initializeSupabase(config: SupabaseConfig): SupabaseClient<Database> {
  if (supabaseClient) {
    return supabaseClient;
  }

  try {
    supabaseClient = createClient<Database>(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Disable for Electron
      },
      global: {
        headers: {
          'X-Client-Info': 'applaa-desktop',
        },
      },
    });

    log.info('Supabase client initialized successfully');
    return supabaseClient;
  } catch (error) {
    log.error('Failed to initialize Supabase client:', error);
    throw error;
  }
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call initializeSupabase() first.');
  }
  return supabaseClient;
}

// Auth helper functions
export class SupabaseAuth {
  private client: SupabaseClient<Database>;

  constructor(client: SupabaseClient<Database>) {
    this.client = client;
  }

  // Sign up with email and password
  async signUp(email: string, password: string, fullName?: string) {
    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      // Create profile if user was created
      if (data.user && !error) {
        await this.createProfile(data.user, fullName);
      }

      return { user: data.user, session: data.session };
    } catch (error) {
      log.error('Sign up error:', error);
      throw error;
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { user: data.user, session: data.session };
    } catch (error) {
      log.error('Sign in error:', error);
      throw error;
    }
  }

  // Sign out
  async signOut() {
    try {
      const { error } = await this.client.auth.signOut();
      if (error) throw error;
      log.info('User signed out successfully');
    } catch (error) {
      log.error('Sign out error:', error);
      throw error;
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      log.error('Get current user error:', error);
      return null;
    }
  }

  // Get current session
  async getCurrentSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await this.client.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      log.error('Get current session error:', error);
      return null;
    }
  }

  // Reset password
  async resetPassword(email: string) {
    try {
      const { error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: 'dyad://auth/reset-password',
      });
      if (error) throw error;
      log.info('Password reset email sent');
    } catch (error) {
      log.error('Reset password error:', error);
      throw error;
    }
  }

  // Update password
  async updatePassword(newPassword: string) {
    try {
      const { error } = await this.client.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      log.info('Password updated successfully');
    } catch (error) {
      log.error('Update password error:', error);
      throw error;
    }
  }

  // Create user profile
  private async createProfile(user: User, fullName?: string) {
    try {
      const { error } = await this.client
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: fullName || null,
          subscription_tier: 'free',
        });

      if (error) throw error;
      log.info('User profile created successfully');
    } catch (error) {
      log.error('Create profile error:', error);
      // Don't throw here as the user was created successfully
    }
  }

  // Get user profile
  async getProfile(userId: string) {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log.error('Get profile error:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId: string, updates: Database['public']['Tables']['profiles']['Update']) {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      log.info('Profile updated successfully');
      return data;
    } catch (error) {
      log.error('Update profile error:', error);
      throw error;
    }
  }

  // Sign in with Google OAuth
  async signInWithGoogle() {
    try {
      const { data, error } = await this.client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'applaa://auth-callback',
        },
      });

      if (error) throw error;
      return { url: data.url };
    } catch (error) {
      log.error('Google sign in error:', error);
      throw error;
    }
  }

  // Set session from OAuth callback
  async setSession(params: { accessToken: string; refreshToken: string; expiresIn: number }) {
    try {
      const { data, error } = await this.client.auth.setSession({
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      log.error('Set session error:', error);
      throw error;
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return this.client.auth.onAuthStateChange(callback);
  }

  // Sync WordPress user to Supabase profile (uses service role for admin operations)
  async syncWordPressUser(wordpressUser: {
    email: string;
    username: string;
    display_name: string;
    id: number;
    roles: string[];
    avatar_url?: string;
  }) {
    try {
      // Use service role key for admin operations
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
      }

      const supabaseUrl = process.env.SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('SUPABASE_URL not configured');
      }

      // Create admin client for service role operations
      const adminClient = createClient<Database>(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      // Check if profile exists by email
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('*')
        .eq('email', wordpressUser.email)
        .maybeSingle();

      const profileData: Database['public']['Tables']['profiles']['Insert'] = {
        id: existingProfile?.id || randomUUID(),
        email: wordpressUser.email,
        full_name: wordpressUser.display_name,
        avatar_url: wordpressUser.avatar_url || null,
        subscription_tier: 'free',
        wordpress_user_id: wordpressUser.id,
        wordpress_username: wordpressUser.username,
        wordpress_display_name: wordpressUser.display_name,
        wordpress_roles: wordpressUser.roles,
      };

      if (existingProfile) {
        // Update existing profile
        const { data, error } = await adminClient
          .from('profiles')
          .update({
            full_name: profileData.full_name,
            avatar_url: profileData.avatar_url,
            wordpress_user_id: profileData.wordpress_user_id,
            wordpress_username: profileData.wordpress_username,
            wordpress_display_name: profileData.wordpress_display_name,
            wordpress_roles: profileData.wordpress_roles,
          })
          .eq('email', wordpressUser.email)
          .select()
          .single();

        if (error) throw error;
        log.info('WordPress user profile updated in Supabase:', wordpressUser.email);
        return data;
      } else {
        // Create new profile
        const { data, error } = await adminClient
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (error) throw error;
        log.info('WordPress user profile created in Supabase:', wordpressUser.email);
        return data;
      }
    } catch (error) {
      log.error('Failed to sync WordPress user to Supabase:', error);
      throw error;
    }
  }

  // Get profile by email (for WordPress users, uses service role)
  async getProfileByEmail(email: string) {
    try {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
      }

      const supabaseUrl = process.env.SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('SUPABASE_URL not configured');
      }

      const adminClient = createClient<Database>(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      const { data, error } = await adminClient
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      log.error('Get profile by email error:', error);
      throw error;
    }
  }
}

// Export singleton auth instance
export function getSupabaseAuth(): SupabaseAuth {
  const client = getSupabaseClient();
  return new SupabaseAuth(client);
}

// Helper function to get WordPress user display_name from settings
export function getWordPressUserDisplayName(): string | null {
  try {
    // Use static import to avoid module resolution issues in bundled Electron app
    const { readSettings } = require('../../main/settings');
    const settings = readSettings();
    const displayName = settings.wordpressAuth?.user?.display_name || null;
    if (!displayName) {
      log.warn('No WordPress display_name found in settings');
      log.debug('WordPress auth state:', {
        hasWordPressAuth: !!settings.wordpressAuth,
        isAuthenticated: settings.wordpressAuth?.isAuthenticated,
        hasUser: !!settings.wordpressAuth?.user,
        user: settings.wordpressAuth?.user,
      });
    }
    return displayName;
  } catch (error: any) {
    log.error('Failed to get WordPress user display_name:', error);
    log.error('Error details:', error.message, error.stack);
    return null;
  }
}

// Helper function to sync app data to Supabase
export async function syncAppToSupabase(
  appData: {
    id: number;
    name: string;
    path: string;
    appType?: string | null;
    status?: string | null;
    githubOrg?: string | null;
    githubRepo?: string | null;
    githubBranch?: string | null;
    githubRepoUrl?: string | null;
    vercelProjectId?: string | null;
    vercelProjectName?: string | null;
    vercelTeamId?: string | null;
    vercelDeploymentUrl?: string | null;
    supabaseProjectId?: string | null;
    neonProjectId?: string | null;
    neonDevelopmentBranchId?: string | null;
    neonPreviewBranchId?: string | null;
    easBuildUrl?: string | null;
    easDeploymentUrl?: string | null;
    easProjectId?: string | null;
    easBuildId?: string | null;
    localApkPath?: string | null;
    localAabPath?: string | null;
    localIpaPath?: string | null;
    localApkBuiltAt?: number | null;
    localAabBuiltAt?: number | null;
    localIpaBuiltAt?: number | null;
    deploymentStatus?: string | null;
    lastDeploymentAt?: number | null;
    deploymentNotes?: string | null;
    showInHub?: boolean | null;
  },
  userDisplayName: string
) {
  try {
    if (!userDisplayName) {
      const error = new Error('No WordPress user display_name provided. Please log in with WordPress.');
      log.error('❌ Cannot sync app to Supabase:', error.message);
      throw error;
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      const error = new Error('Supabase not configured. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.');
      log.error('❌ Cannot sync app to Supabase:', error.message);
      throw error;
    }

    // Create admin client for service role operations
    const adminClient = createClient<Database>(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if app exists in Supabase
    const { data: existingApp, error: checkError } = await adminClient
      .from('user_apps')
      .select('*')
      .eq('user_display_name', userDisplayName)
      .eq('local_app_id', appData.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" which is OK
      log.error('Error checking existing app in Supabase:', checkError);
    }

    // Helper function to safely convert Unix timestamp to ISO string
    const safeTimestampToISO = (timestamp: number | null | undefined): string | null => {
      if (!timestamp) return null;
      
      // If timestamp is already in milliseconds (>= year 2000), use as-is
      // If timestamp is in seconds (< year 2000), multiply by 1000
      // Check if it's already in milliseconds (timestamp > year 2000 in seconds = 946684800)
      const timestampMs = timestamp > 946684800000 ? timestamp : timestamp * 1000;
      
      const date = new Date(timestampMs);
      
      // Validate the date is reasonable (between 1970 and 2100)
      const year = date.getFullYear();
      if (isNaN(timestampMs) || year < 1970 || year > 2100) {
        log.warn(`Invalid timestamp ${timestamp} (converted to year ${year}), skipping date conversion`);
        return null;
      }
      
      return date.toISOString();
    };

    const appDataToSync: Database['public']['Tables']['user_apps']['Insert'] = {
      user_display_name: userDisplayName,
      local_app_id: appData.id,
      app_name: appData.name,
      app_type: (appData.appType as 'web' | 'mobile' | 'godot') || 'web',
      local_path: appData.path,
      status: appData.status || 'ready',
      github_org: appData.githubOrg || null,
      github_repo: appData.githubRepo || null,
      github_branch: appData.githubBranch || null,
      github_repo_url: appData.githubRepoUrl || null,
      vercel_project_id: appData.vercelProjectId || null,
      vercel_project_name: appData.vercelProjectName || null,
      vercel_team_id: appData.vercelTeamId || null,
      vercel_deployment_url: appData.vercelDeploymentUrl || null,
      supabase_project_id: appData.supabaseProjectId || null,
      neon_project_id: appData.neonProjectId || null,
      neon_development_branch_id: appData.neonDevelopmentBranchId || null,
      neon_preview_branch_id: appData.neonPreviewBranchId || null,
      eas_build_url: appData.easBuildUrl || null,
      eas_deployment_url: appData.easDeploymentUrl || null,
      eas_project_id: appData.easProjectId || null,
      eas_build_id: appData.easBuildId || null,
      local_apk_path: appData.localApkPath || null,
      local_aab_path: appData.localAabPath || null,
      local_ipa_path: appData.localIpaPath || null,
      local_apk_built_at: safeTimestampToISO(appData.localApkBuiltAt),
      local_aab_built_at: safeTimestampToISO(appData.localAabBuiltAt),
      local_ipa_built_at: safeTimestampToISO(appData.localIpaBuiltAt),
      deployment_status: appData.deploymentStatus || 'not_deployed',
      last_deployment_at: safeTimestampToISO(appData.lastDeploymentAt),
      deployment_notes: appData.deploymentNotes || null,
    };

    if (existingApp) {
      // Update existing app
      const { data, error } = await adminClient
        .from('user_apps')
        .update(appDataToSync)
        .eq('user_display_name', userDisplayName)
        .eq('local_app_id', appData.id)
        .select()
        .single();

      if (error) {
        log.error(`❌ Failed to update app in Supabase:`, error);
        log.error(`   Error message: ${error.message}`);
        log.error(`   Error code: ${error.code}`);
        log.error(`   Error details: ${error.details}`);
        log.error(`   Error hint: ${error.hint}`);
        log.error(`   App data being updated:`, JSON.stringify(appDataToSync, null, 2));
        throw error;
      }
      log.info(`✅ App synced to Supabase (updated): ${appData.name} (ID: ${appData.id}) for user: ${userDisplayName}`);
      log.info(`   Supabase record ID: ${data.id}`);
      return data;
    } else {
      // Create new app
      const { data, error } = await adminClient
        .from('user_apps')
        .insert(appDataToSync)
        .select()
        .single();

      if (error) {
        log.error(`❌ Failed to insert app in Supabase:`, error);
        log.error(`   Error message: ${error.message}`);
        log.error(`   Error code: ${error.code}`);
        log.error(`   Error details: ${error.details}`);
        log.error(`   Error hint: ${error.hint}`);
        log.error(`   App data being inserted:`, JSON.stringify(appDataToSync, null, 2));
        log.error(`   User display_name: ${userDisplayName}`);
        
        // If it's a schema issue, provide helpful message
        if (error.message?.includes('user_email') && error.message?.includes('not-null')) {
          log.error(`   ⚠️ TABLE SCHEMA ISSUE: user_email column is NOT NULL`);
          log.error(`   ⚠️ Run this SQL in Supabase: ALTER TABLE public.user_apps ALTER COLUMN user_email DROP NOT NULL;`);
        }
        
        throw error;
      }
      log.info(`✅ App synced to Supabase (created): ${appData.name} (ID: ${appData.id}) for user: ${userDisplayName}`);
      log.info(`   Supabase record ID: ${data.id}`);
      
      // Verify the data was actually saved
      const { data: verifyData } = await adminClient
        .from('user_apps')
        .select('*')
        .eq('id', data.id)
        .single();
      
      if (verifyData) {
        log.info(`   ✅ Verified: App data exists in Supabase`);
      } else {
        log.warn(`   ⚠️ Warning: App data not found after insert (may be RLS issue)`);
      }
      
      return data;
    }
  } catch (error: any) {
    log.error('❌ Failed to sync app to Supabase:', error);
    log.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    
    // Don't return null - throw the error so it can be caught and reported
    // This allows the sync handler to see the actual error
    throw error;
  }
}

// Helper function to verify app data in Supabase (for debugging)
export async function verifyAppInSupabase(appId: number, userDisplayName: string) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return { success: false, error: 'Supabase not configured' };
    }

    const adminClient = createClient<Database>(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data, error } = await adminClient
      .from('user_apps')
      .select('*')
      .eq('user_display_name', userDisplayName)
      .eq('local_app_id', appId)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message, code: error.code };
    }

    if (!data) {
      return { success: false, error: 'App not found in Supabase' };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Helper function to sync WordPress user to Supabase (standalone, doesn't require initialized client)
export async function syncWordPressUserToSupabase(wordpressUser: {
  email: string;
  username: string;
  display_name: string;
  id: number;
  roles: string[];
  avatar_url?: string;
}) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      log.warn('Supabase not configured for WordPress sync. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.');
      return null;
    }

    // Create admin client for service role operations
    const adminClient = createClient<Database>(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if profile exists by email
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('email', wordpressUser.email)
      .maybeSingle();

    const profileData: Database['public']['Tables']['profiles']['Insert'] = {
      id: existingProfile?.id || randomUUID(),
      email: wordpressUser.email,
      full_name: wordpressUser.display_name,
      avatar_url: wordpressUser.avatar_url || null,
      subscription_tier: 'free',
      wordpress_user_id: wordpressUser.id,
      wordpress_username: wordpressUser.username,
      wordpress_display_name: wordpressUser.display_name,
      wordpress_roles: wordpressUser.roles,
    };

    if (existingProfile) {
      // Update existing profile
      const { data, error } = await adminClient
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          wordpress_user_id: profileData.wordpress_user_id,
          wordpress_username: profileData.wordpress_username,
          wordpress_display_name: profileData.wordpress_display_name,
          wordpress_roles: profileData.wordpress_roles,
        })
        .eq('email', wordpressUser.email)
        .select()
        .single();

      if (error) throw error;
      log.info('WordPress user profile updated in Supabase:', wordpressUser.email);
      return data;
    } else {
      // Create new profile
      const { data, error } = await adminClient
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) throw error;
      log.info('WordPress user profile created in Supabase:', wordpressUser.email);
      return data;
    }
  } catch (error) {
    log.error('Failed to sync WordPress user to Supabase:', error);
    // Don't throw - allow login to continue even if sync fails
    return null;
  }
}

