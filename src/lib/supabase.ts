import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: 'free' | 'pro';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: 'free' | 'pro';
          created_at?: string;
          updated_at?: string;
        };
      };
      user_apps: {
        Row: {
          id: string;
          user_id: string;
          app_name: string;
          app_type: 'web' | 'expo' | 'flutter';
          local_path: string | null;
          r2_storage_path: string | null;
          github_repo_url: string | null;
          created_at: string;
          updated_at: string;
          sync_enabled: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          app_name: string;
          app_type: 'web' | 'expo' | 'flutter';
          local_path?: string | null;
          r2_storage_path?: string | null;
          github_repo_url?: string | null;
          created_at?: string;
          updated_at?: string;
          sync_enabled?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          app_name?: string;
          app_type?: 'web' | 'expo' | 'flutter';
          local_path?: string | null;
          r2_storage_path?: string | null;
          github_repo_url?: string | null;
          created_at?: string;
          updated_at?: string;
          sync_enabled?: boolean;
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
}

// Export singleton auth instance
export function getSupabaseAuth(): SupabaseAuth {
  const client = getSupabaseClient();
  return new SupabaseAuth(client);
}

