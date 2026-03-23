import { ipcMain } from 'electron';
import log from 'electron-log';
import { getSupabaseAuth } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase';
import { readSettings } from '../../main/settings';

// Helper function to get Supabase admin client (bypasses RLS)
function getSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cHJndmx1dHlmcWZ3bWxsdWZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODUxOSwiZXhwIjoyMDcyNjY0NTE5fQ.0SfO6KTBztQUMZuZVQkCATZd0B8w2nnAUQcG4c1hMIs";
  const supabaseUrl = process.env.SUPABASE_URL || "https://pzprgvlutyfqfwmllufm.supabase.co";

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

const logger = log.scope('profile');

export function registerProfileHandlers() {
  // Get current user profile
  ipcMain.handle('profile:get-current', async () => {
    try {
      const auth = getSupabaseAuth();
      const supabaseUser = await auth.getCurrentUser();

      if (supabaseUser) {
        // User is authenticated via Supabase
        const adminClient = getSupabaseAdminClient();
        
        // Try to get profile by Supabase user ID first
        let { data: profile, error: profileError } = await adminClient
          .from('profiles')
          .select('id, email, full_name, avatar_url, subscription_tier, wordpress_user_id, wordpress_username, wordpress_display_name, wordpress_roles, monthly_credits, remaining_credits, credits_last_reset, total_credits_used, total_tokens_used, created_at, updated_at')
          .eq('id', supabaseUser.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          logger.error('Failed to get profile from Supabase:', profileError);
          throw new Error(`Failed to get user profile: ${profileError.message}`);
        }

        // If not found by ID, try by email or username
        if (!profile) {
          const identifier = supabaseUser.email || supabaseUser.user_metadata?.username || supabaseUser.user_metadata?.preferred_username;
          
          if (identifier) {
            profile = await auth.getProfileByEmailOrUsername(identifier);
          }
        }

        // ✅ AUTO-CREATE: If old Supabase user doesn't have a profile, create one
        if (!profile) {
          logger.warn('Old Supabase user without profile detected, creating profile:', {
            userId: supabaseUser.id,
            email: supabaseUser.email,
          });
          
          try {
            const fullName = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null;
            
            const { error: createError } = await adminClient
              .from('profiles')
              .insert({
                id: supabaseUser.id,
                email: supabaseUser.email || 'unknown@example.com',
                full_name: fullName,
                subscription_tier: 'free',
                monthly_credits: 100,
                total_credits_used: 0,
                total_tokens_used: 0,
                credits_last_reset: new Date().toISOString(),
              });
            
            if (createError) {
              logger.error('Failed to auto-create profile for Supabase user:', createError);
              throw new Error(`Failed to create user profile: ${createError.message}`);
            }
            
            // Fetch the newly created profile
            const { data: newProfile } = await adminClient
              .from('profiles')
              .select('id, email, full_name, avatar_url, subscription_tier, wordpress_user_id, wordpress_username, wordpress_display_name, wordpress_roles, monthly_credits, remaining_credits, credits_last_reset, total_credits_used, total_tokens_used, created_at, updated_at')
              .eq('id', supabaseUser.id)
              .single();
            
            logger.info('✅ Profile auto-created for old Supabase user:', {
              userId: supabaseUser.id,
              email: newProfile?.email,
            });
            
            profile = newProfile;
          } catch (createError) {
            logger.error('Failed to auto-create profile for old Supabase user:', createError);
            throw new Error('User profile not found in database and failed to create. Please contact support.');
          }
        }

        if (!profile) {
          throw new Error('User profile not found in database.');
        }

        // Ensure email is set - use auth user email if profile email is missing or invalid
        if ((!profile.email || profile.email === 'unknown@example.com') && supabaseUser.email) {
          logger.info('Profile email missing or invalid, using auth user email:', {
            profileEmail: profile.email,
            authEmail: supabaseUser.email,
          });
          profile.email = supabaseUser.email;
        }

        return { success: true, profile };
      } else {
        // Check WordPress authentication (fallback)
        const settings = readSettings();
        const wordpressAuth = settings.wordpressAuth;

        if (!wordpressAuth?.isAuthenticated || !wordpressAuth?.user) {
          throw new Error('User not authenticated. Please sign in to view profile.');
        }

        // ✅ FIX: Get email from WordPress user - refresh from WordPress API if email is invalid
        let userEmail = wordpressAuth.user.email;
        let wordpressUsername = wordpressAuth.user.username;
        let wordpressDisplayName = wordpressAuth.user.display_name;
        
        // If WordPress email is invalid, try to refresh from WordPress API
        if (!userEmail || userEmail === 'unknown@example.com') {
          logger.info('WordPress email is invalid, refreshing from WordPress API...');
          try {
            const settings = readSettings();
            const wordpressUrl = process.env.WORDPRESS_URL || 'https://app.applaa.com';
            const authToken = wordpressAuth.token;
            
            if (authToken) {
              // ✅ FIX: Use context=edit to get email from WordPress API
              const refreshResponse = await fetch(`${wordpressUrl}/wp-json/wp/v2/users/me?context=edit`, {
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json',
                },
              });
              
              if (refreshResponse.ok) {
                const refreshedUserData = await refreshResponse.json();
                if (refreshedUserData.email && refreshedUserData.email !== 'unknown@example.com') {
                  userEmail = refreshedUserData.email;
                  wordpressUsername = refreshedUserData.username || wordpressUsername;
                  wordpressDisplayName = refreshedUserData.name || wordpressDisplayName;
                  logger.info('Successfully refreshed email from WordPress API:', {
                    email: userEmail,
                    username: wordpressUsername,
                    displayName: wordpressDisplayName,
                  });
                }
              }
            }
          } catch (refreshError) {
            logger.warn('Failed to refresh email from WordPress API:', refreshError);
            // Continue with existing email even if refresh fails
          }
        }
        
        // Look up existing profile in Supabase by email or username
        // Since all WordPress users are already in Supabase, profile should exist
        // Try multiple lookup strategies to find the correct profile
        let profile = null;
        
        // Strategy 1: Try by email
        if (userEmail && userEmail !== 'unknown@example.com') {
          profile = await auth.getProfileByEmailOrUsername(userEmail);
        }
        
        // Strategy 2: Try by display name (often matches the actual username in database)
        if (!profile && wordpressDisplayName) {
          profile = await auth.getProfileByEmailOrUsername(wordpressDisplayName);
        }
        
        // Strategy 3: Try by username
        if (!profile && wordpressUsername) {
          profile = await auth.getProfileByEmailOrUsername(wordpressUsername);
        }
        
        // Strategy 4: Try direct lookup by wordpress_user_id if we have it
        if (!profile && wordpressAuth.user.id) {
          const adminClient = getSupabaseAdminClient();
          const { data: profileById, error: idError } = await adminClient
            .from('profiles')
            .select('*')
            .eq('wordpress_user_id', wordpressAuth.user.id)
            .maybeSingle();
          
          if (profileById && !idError) {
            profile = profileById;
          }
        }
        
        // ✅ AUTO-CREATE: If profile still not found, create a new one for this WordPress user
        if (!profile) {
          try {
            const adminClient = getSupabaseAdminClient();
            
            // Generate a unique UUID for the new profile
            const { randomUUID } = await import('crypto');
            const newProfileId = randomUUID();
            
            // Parse capabilities to get WordPress roles
            const capabilities = wordpressAuth.user.capabilities;
            let roles: string[] = [];
            
            if (Array.isArray(capabilities)) {
              roles = capabilities;
            } else if (typeof capabilities === 'object' && capabilities !== null) {
              // Extract role names from capabilities object (keys with truthy values)
              roles = Object.keys(capabilities).filter(key => {
                const value = capabilities[key];
                if (typeof value === 'boolean') return value;
                if (typeof value === 'number') return value !== 0;
                if (typeof value === 'string') return value !== '' && value !== '0' && value !== 'false';
                return false;
              });
            }
            
            // Create new profile
            const { data: newProfile, error: createError } = await adminClient
              .from('profiles')
              .insert({
                id: newProfileId,
                email: userEmail || 'unknown@example.com',
                full_name: wordpressDisplayName || wordpressUsername || null,
                wordpress_user_id: wordpressAuth.user.id,
                wordpress_username: wordpressUsername || null,
                wordpress_display_name: wordpressDisplayName || null,
                wordpress_roles: roles,
                subscription_tier: 'free',
                monthly_credits: 100,
                total_credits_used: 0,
                total_tokens_used: 0,
                credits_last_reset: new Date().toISOString(),
              })
              .select()
              .single();
            
            if (createError) {
              logger.error('Failed to auto-create profile:', createError);
              throw new Error(`Failed to create user profile: ${createError.message}`);
            }
            
            profile = newProfile;
          } catch (createError) {
            logger.error('Failed to auto-create profile for WordPress user:', createError);
            throw new Error('Failed to create user profile. Please contact support.');
          }
        }

        // ✅ FIX: Prioritize valid email from WordPress if Supabase profile has invalid email
        // Strategy: Use Supabase profile email if it's valid (not 'unknown@example.com')
        // Otherwise, use WordPress email and update Supabase profile
        const isSupabaseEmailValid = profile.email && profile.email !== 'unknown@example.com';
        const isWordPressEmailValid = userEmail && userEmail !== 'unknown@example.com';

        if (isSupabaseEmailValid && profile.email !== userEmail) {
          // Supabase has valid email, use it even if different from WordPress
          logger.info('Using email from Supabase profile (valid email, different from WordPress):', {
            supabaseEmail: profile.email,
            wordpressEmail: userEmail,
          });
        } else if (!isSupabaseEmailValid && isWordPressEmailValid) {
          // Supabase email is invalid but WordPress has valid email - use WordPress email and update Supabase
          logger.warn('Supabase profile has invalid email, using WordPress email and updating Supabase:', {
            profileEmail: profile.email,
            wordpressEmail: userEmail,
          });
          
          // Update Supabase profile with WordPress email
          try {
            const adminClient = getSupabaseAdminClient();
            const { error: updateError } = await adminClient
              .from('profiles')
              .update({ 
                email: userEmail,
                updated_at: new Date().toISOString(),
              })
              .eq('id', profile.id);
            
            if (updateError) {
              logger.error('Failed to update Supabase profile email:', updateError);
            } else {
              logger.info('Successfully updated Supabase profile email from WordPress:', {
                profileId: profile.id,
                newEmail: userEmail,
              });
            }
          } catch (updateError) {
            logger.error('Error updating Supabase profile email:', updateError);
          }
          
          // Use WordPress email
          profile.email = userEmail;
        } else if (!isSupabaseEmailValid && !isWordPressEmailValid) {
          // Both emails are invalid
          logger.warn('Both Supabase and WordPress have invalid email (unknown@example.com) - email needs to be updated in database:', {
            profileId: profile.id,
            wordpressUserId: wordpressAuth.user.id,
            supabaseEmail: profile.email,
            wordpressEmail: userEmail,
          });
        }

        return { success: true, profile };
      }
    } catch (error: any) {
      logger.error('Failed to get profile:', error);
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  });

  // Update user profile
  ipcMain.handle('profile:update', async (_, updates: {
    username?: string;
    full_name?: string;
    avatar_url?: string;
  }) => {
    try {
      const auth = getSupabaseAuth();
      const supabaseUser = await auth.getCurrentUser();

      if (supabaseUser) {
        // User is authenticated via Supabase
        const adminClient = getSupabaseAdminClient();
        
        // Try to get profile by Supabase user ID first
        let { data: profile, error: profileError } = await adminClient
          .from('profiles')
          .select('id')
          .eq('id', supabaseUser.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          logger.error('Failed to get profile from Supabase:', profileError);
          throw new Error(`Failed to get user profile: ${profileError.message}`);
        }

        // If not found by ID, try by email or username
        if (!profile) {
          const identifier = supabaseUser.email || supabaseUser.user_metadata?.username || supabaseUser.user_metadata?.preferred_username;
          
          if (identifier) {
            const foundProfile = await auth.getProfileByEmailOrUsername(identifier);
            if (foundProfile) {
              profile = { id: foundProfile.id };
            }
          }
        }

        if (!profile) {
          throw new Error('User profile not found in database.');
        }

        // Update profile
        const updateData: any = {
          ...updates,
          updated_at: new Date().toISOString(),
        };
        
        const { data: updatedProfile, error: updateError } = await adminClient
          .from('profiles')
          .update(updateData)
          .eq('id', profile.id)
          .select()
          .single();

        if (updateError) {
          logger.error('Failed to update profile:', updateError);
          throw new Error(`Failed to update profile: ${updateError.message}`);
        }

        logger.info('Profile updated successfully');
        return { success: true, profile: updatedProfile };
      } else {
        // Check WordPress authentication (fallback)
        const settings = readSettings();
        const wordpressAuth = settings.wordpressAuth;

        if (!wordpressAuth?.isAuthenticated || !wordpressAuth?.user) {
          throw new Error('User not authenticated. Please sign in to update profile.');
        }

        // Get email from WordPress user
        const userEmail = wordpressAuth.user.email;
        
        // Look up existing profile in Supabase by email or username
        let profile = await auth.getProfileByEmailOrUsername(userEmail);
        
        // If not found by email, try by WordPress username
        if (!profile && wordpressAuth.user.username) {
          profile = await auth.getProfileByEmailOrUsername(wordpressAuth.user.username);
        }
        
        if (!profile) {
          logger.error('WordPress user profile not found in Supabase:', {
            email: userEmail,
            username: wordpressAuth.user.username,
          });
          throw new Error('User profile not found in database. Please contact support.');
        }

        // Update profile
        const adminClient = getSupabaseAdminClient();
        
        const updateData: any = {
          ...updates,
          updated_at: new Date().toISOString(),
        };
        
        const { data: updatedProfile, error: updateError } = await adminClient
          .from('profiles')
          .update(updateData)
          .eq('id', profile.id)
          .select()
          .single();

        if (updateError) {
          logger.error('Failed to update profile:', updateError);
          throw new Error(`Failed to update profile: ${updateError.message}`);
        }

        logger.info('Profile updated successfully');
        return { success: true, profile: updatedProfile };
      }
    } catch (error: any) {
      logger.error('Failed to update profile:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  });
}
