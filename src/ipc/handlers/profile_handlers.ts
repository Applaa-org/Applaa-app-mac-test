import { ipcMain } from 'electron';
import log from 'electron-log';
import { getSupabaseAuth } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase';
import { readSettings } from '../../main/settings';

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

const logger = log.scope('profile');

export function registerProfileHandlers() {
  // Get current user profile
  ipcMain.handle('profile:get-current', async () => {
    try {
      const auth = getSupabaseAuth();
      const supabaseUser = await auth.getCurrentUser();

      console.log('🔍 [Profile Handler] Supabase user check:', {
        hasSupabaseUser: !!supabaseUser,
        supabaseUserId: supabaseUser?.id,
        supabaseUserEmail: supabaseUser?.email,
        supabaseUserMetadata: supabaseUser?.user_metadata,
      });

      if (supabaseUser) {
        // User is authenticated via Supabase
        const adminClient = getSupabaseAdminClient();
        
        // Try to get profile by Supabase user ID first
        let { data: profile, error: profileError } = await adminClient
          .from('profiles')
          .select('id, email, username, full_name, first_name, last_name, avatar_url, subscription_tier, wordpress_user_id, wordpress_username, wordpress_display_name, wordpress_roles, monthly_credits, remaining_credits, credits_last_reset, total_credits_used, created_at, updated_at')
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

        logger.info('Profile retrieved successfully:', {
          id: profile.id,
          email: profile.email,
          hasEmail: !!profile.email,
        });

        console.log('✅ [Profile Handler] Profile from Supabase auth:', {
          profileId: profile.id,
          profileEmail: profile.email,
          profileFullName: profile.full_name,
          profileSubscriptionTier: profile.subscription_tier,
          wordpressUsername: profile.wordpress_username,
          source: 'Supabase Authentication',
        });

        return { success: true, profile };
      } else {
        // Check WordPress authentication (fallback)
        const settings = readSettings();
        const wordpressAuth = settings.wordpressAuth;

        console.log('🔍 [Profile Handler] WordPress auth check:', {
          hasWordPressAuth: !!wordpressAuth,
          isAuthenticated: wordpressAuth?.isAuthenticated,
          wordpressUserEmail: wordpressAuth?.user?.email,
          wordpressUsername: wordpressAuth?.user?.username,
          wordpressDisplayName: wordpressAuth?.user?.display_name,
          wordpressUserId: wordpressAuth?.user?.id,
        });

        if (!wordpressAuth?.isAuthenticated || !wordpressAuth?.user) {
          throw new Error('User not authenticated. Please sign in to view profile.');
        }

        // Get email from WordPress user
        const userEmail = wordpressAuth.user.email;
        const wordpressUsername = wordpressAuth.user.username;
        const wordpressDisplayName = wordpressAuth.user.display_name;
        
        console.log('🔍 [Profile Handler] WordPress user data:', {
          email: userEmail,
          username: wordpressUsername,
          displayName: wordpressDisplayName,
          userId: wordpressAuth.user.id,
        });
        
        // Look up existing profile in Supabase by email or username
        // Since all WordPress users are already in Supabase, profile should exist
        // Try multiple lookup strategies to find the correct profile
        let profile = null;
        
        // Strategy 1: Try by email
        if (userEmail && userEmail !== 'unknown@example.com') {
          console.log('🔍 [Profile Handler] Strategy 1: Looking up profile by WordPress email:', userEmail);
          profile = await auth.getProfileByEmailOrUsername(userEmail);
        }
        
        // Strategy 2: Try by display name (often matches the actual username in database)
        if (!profile && wordpressDisplayName) {
          console.log('🔍 [Profile Handler] Strategy 2: Looking up profile by WordPress display_name:', wordpressDisplayName);
          profile = await auth.getProfileByEmailOrUsername(wordpressDisplayName);
        }
        
        // Strategy 3: Try by username
        if (!profile && wordpressUsername) {
          logger.info('Profile not found by email/display_name, trying WordPress username:', wordpressUsername);
          console.log('🔍 [Profile Handler] Strategy 3: Looking up profile by WordPress username:', wordpressUsername);
          profile = await auth.getProfileByEmailOrUsername(wordpressUsername);
        }
        
        // Strategy 4: Try direct lookup by wordpress_user_id if we have it
        if (!profile && wordpressAuth.user.id) {
          console.log('🔍 [Profile Handler] Strategy 4: Looking up profile by wordpress_user_id:', wordpressAuth.user.id);
          const adminClient = getSupabaseAdminClient();
          const { data: profileById, error: idError } = await adminClient
            .from('profiles')
            .select('*')
            .eq('wordpress_user_id', wordpressAuth.user.id)
            .maybeSingle();
          
          if (profileById && !idError) {
            console.log('✅ [Profile Handler] Found profile by wordpress_user_id:', {
              profileId: profileById.id,
              profileEmail: profileById.email,
              wordpressUserId: profileById.wordpress_user_id,
            });
            profile = profileById;
          }
        }
        
        if (!profile) {
          logger.error('WordPress user profile not found in Supabase:', {
            email: userEmail,
            username: wordpressAuth.user.username,
          });
          throw new Error('User profile not found in database. Please contact support.');
        }

        // Log what we found
        console.log('📧 [Profile Handler] Email comparison:', {
          supabaseProfileEmail: profile.email,
          wordpressEmail: userEmail,
          emailsMatch: profile.email === userEmail,
          isUnknownEmail: profile.email === 'unknown@example.com' || userEmail === 'unknown@example.com',
        });

        // ALWAYS use email from Supabase profile - it's the source of truth
        // Only log if there's a mismatch (for debugging)
        if (profile.email && profile.email !== userEmail && profile.email !== 'unknown@example.com') {
          logger.info('Using email from Supabase profile (different from WordPress email):', {
            supabaseEmail: profile.email,
            wordpressEmail: userEmail,
          });
        }

        // Only use WordPress email as fallback if profile email is truly missing or invalid
        // BUT if both are 'unknown@example.com', keep the Supabase one (don't overwrite)
        if ((!profile.email || profile.email === 'unknown@example.com') && userEmail && userEmail !== 'unknown@example.com') {
          logger.warn('Profile email missing or invalid in Supabase, using WordPress email as fallback:', {
            profileEmail: profile.email,
            wordpressEmail: userEmail,
          });
          profile.email = userEmail;
        } else if (profile.email === 'unknown@example.com' && userEmail === 'unknown@example.com') {
          logger.warn('Both Supabase and WordPress have unknown@example.com - email needs to be updated in database:', {
            profileId: profile.id,
            wordpressUserId: wordpressAuth.user.id,
          });
          console.warn('⚠️ [Profile Handler] Email issue: Both sources have unknown@example.com. Please update email in Supabase profiles table.');
        }

        logger.info('Profile retrieved successfully for WordPress user:', {
          id: profile.id,
          email: profile.email,
          source: profile.email === userEmail ? 'WordPress (fallback)' : 'Supabase profile',
        });

        console.log('✅ [Profile Handler] Profile from WordPress auth:', {
          profileId: profile.id,
          profileEmail: profile.email,
          profileFullName: profile.full_name,
          profileSubscriptionTier: profile.subscription_tier,
          wordpressUsername: profile.wordpress_username,
          wordpressUserId: profile.wordpress_user_id,
          source: 'WordPress Authentication -> Supabase Profile',
          emailSource: profile.email === userEmail ? 'WordPress (fallback)' : 'Supabase profile',
        });

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
    first_name?: string;
    last_name?: string;
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
        // If first_name or last_name are provided, also update full_name as concatenation
        const updateData: any = {
          ...updates,
          updated_at: new Date().toISOString(),
        };
        
        // If first_name or last_name are being updated, update full_name too
        if (updates.first_name !== undefined || updates.last_name !== undefined) {
          // We need to get current values first to build full_name
          const { data: currentProfile } = await adminClient
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', profile.id)
            .single();
          
          const firstName = updates.first_name !== undefined ? updates.first_name : (currentProfile?.first_name || '');
          const lastName = updates.last_name !== undefined ? updates.last_name : (currentProfile?.last_name || '');
          
          // Build full_name from first_name and last_name
          if (firstName || lastName) {
            updateData.full_name = [firstName, lastName].filter(Boolean).join(' ').trim() || null;
          }
        }
        
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
        
        // If first_name or last_name are provided, also update full_name as concatenation
        const updateData: any = {
          ...updates,
          updated_at: new Date().toISOString(),
        };
        
        // If first_name or last_name are being updated, update full_name too
        if (updates.first_name !== undefined || updates.last_name !== undefined) {
          // We need to get current values first to build full_name
          const { data: currentProfile } = await adminClient
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', profile.id)
            .single();
          
          const firstName = updates.first_name !== undefined ? updates.first_name : (currentProfile?.first_name || '');
          const lastName = updates.last_name !== undefined ? updates.last_name : (currentProfile?.last_name || '');
          
          // Build full_name from first_name and last_name
          if (firstName || lastName) {
            updateData.full_name = [firstName, lastName].filter(Boolean).join(' ').trim() || null;
          }
        }
        
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
