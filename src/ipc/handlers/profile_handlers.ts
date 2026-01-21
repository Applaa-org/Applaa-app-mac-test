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

// Helper function to safely select profile columns, handling missing columns gracefully
// Uses select('*') which automatically returns only columns that exist
async function getProfileWithFallback(
  adminClient: any,
  userId: string
): Promise<any> {
  try {
    const { data, error } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    // Add default values for any missing columns to ensure consistent response
    if (data) {
      return {
        ...data,
        first_name: data.first_name ?? null,
        last_name: data.last_name ?? null,
        monthly_credits: data.monthly_credits ?? 50,
        remaining_credits: data.remaining_credits ?? 50,
        credits_last_reset: data.credits_last_reset ?? null,
        total_credits_used: data.total_credits_used ?? 0,
        total_tokens_used: data.total_tokens_used ?? 0,
        username: data.username ?? null,
      };
    }
    
    return null;
  } catch (error: any) {
    logger.error('Error getting profile:', error);
    throw error;
  }
}

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
        
        // Try to get profile by Supabase user ID first (with fallback for missing columns)
        let profile = await getProfileWithFallback(adminClient, supabaseUser.id);

        // If not found by ID, try by email or username
        if (!profile) {
          const identifier = supabaseUser.email || supabaseUser.user_metadata?.username || supabaseUser.user_metadata?.preferred_username;
          
          if (identifier) {
            profile = await auth.getProfileByEmailOrUsername(identifier);
          }
        }

        // ✅ FIX: Auto-create profile if it doesn't exist
        if (!profile) {
          logger.warn('Profile not found, creating new profile for user:', {
            userId: supabaseUser.id,
            email: supabaseUser.email,
          });
          
          try {
            // Try to insert with all columns, but handle missing columns gracefully
            const insertData: any = {
              id: supabaseUser.id,
              email: supabaseUser.email || 'unknown@example.com',
              full_name: supabaseUser.user_metadata?.full_name || 
                        supabaseUser.user_metadata?.name ||
                        null,
              subscription_tier: 'free',
            };
            
            // Only include optional columns if they might exist
            // We'll try with them first, and fall back if needed
            try {
              insertData.first_name = supabaseUser.user_metadata?.first_name || null;
              insertData.last_name = supabaseUser.user_metadata?.last_name || null;
              insertData.monthly_credits = 50;
              insertData.remaining_credits = 50;
              insertData.total_credits_used = 0;
              insertData.total_tokens_used = 0;
            } catch (e) {
              // Ignore - these columns might not exist
            }
            
            const { data: newProfile, error: createError } = await adminClient
              .from('profiles')
              .insert(insertData)
              .select('*')
              .single();
            
            if (createError) {
              // If error is about missing columns, try without them
              if (createError.message?.includes('does not exist') || createError.code === '42703') {
                logger.warn('Some columns missing during insert, retrying with base columns only');
                const baseInsertData = {
                  id: supabaseUser.id,
                  email: supabaseUser.email || 'unknown@example.com',
                  full_name: supabaseUser.user_metadata?.full_name || 
                            supabaseUser.user_metadata?.name ||
                            null,
                  subscription_tier: 'free',
                };
                
                const { data: fallbackProfile, error: fallbackError } = await adminClient
                  .from('profiles')
                  .insert(baseInsertData)
                  .select('*')
                  .single();
                
                if (fallbackError) {
                  logger.error('Failed to create profile with fallback:', fallbackError);
                  throw new Error(`Failed to create user profile: ${fallbackError.message}`);
                }
                
                profile = {
                  ...fallbackProfile,
                  first_name: null,
                  last_name: null,
                  monthly_credits: 50,
                  remaining_credits: 50,
                  credits_last_reset: null,
                  total_credits_used: 0,
                  total_tokens_used: 0,
                };
              } else {
                logger.error('Failed to create profile:', createError);
                throw new Error(`Failed to create user profile: ${createError.message}`);
              }
            } else {
              profile = newProfile;
            }
            logger.info('✅ Successfully created missing profile for user:', {
              userId: supabaseUser.id,
              email: profile.email,
            });
          } catch (createError: any) {
            logger.error('Error creating profile:', createError);
            throw new Error(`Failed to create user profile: ${createError.message}`);
          }
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
          try {
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
          } catch (error: any) {
            // If error is about missing columns, try with base columns
            if (error.message?.includes('does not exist') || error.code === '42703') {
              logger.warn('Column error, trying base columns');
                const { data: profileById, error: idError } = await adminClient
                .from('profiles')
                .select('*')
                .eq('wordpress_user_id', wordpressAuth.user.id)
                .maybeSingle();
              
              if (profileById && !idError) {
                profile = {
                  ...profileById,
                  first_name: null,
                  last_name: null,
                  monthly_credits: 50,
                  remaining_credits: 50,
                  credits_last_reset: null,
                  total_credits_used: 0,
                  total_tokens_used: 0,
                };
              }
            }
          }
        }
        
        // ✅ FIX: Auto-create profile if it doesn't exist for WordPress users
        if (!profile) {
          logger.warn('WordPress user profile not found in Supabase, creating new profile:', {
            email: userEmail,
            username: wordpressAuth.user.username,
            wordpressUserId: wordpressAuth.user.id,
          });
          
          try {
            const adminClient = getSupabaseAdminClient();
            // Try to insert with all columns, but handle missing columns gracefully
            const insertData: any = {
              email: userEmail || 'unknown@example.com',
              full_name: wordpressDisplayName || null,
              wordpress_user_id: wordpressAuth.user.id || null,
              wordpress_username: wordpressUsername || null,
              wordpress_display_name: wordpressDisplayName || null,
              subscription_tier: 'free',
            };
            
            // Only include optional columns if they might exist
            try {
              insertData.monthly_credits = 50;
              insertData.remaining_credits = 50;
              insertData.total_credits_used = 0;
              insertData.total_tokens_used = 0;
            } catch (e) {
              // Ignore - these columns might not exist
            }
            
            const { data: newProfile, error: createError } = await adminClient
              .from('profiles')
              .insert(insertData)
              .select('*')
              .single();
            
            if (createError) {
              // If error is about missing columns, try without them
              if (createError.message?.includes('does not exist') || createError.code === '42703') {
                logger.warn('Some columns missing during WordPress profile insert, retrying with base columns only');
                const baseInsertData = {
                  email: userEmail || 'unknown@example.com',
                  full_name: wordpressDisplayName || null,
                  wordpress_user_id: wordpressAuth.user.id || null,
                  wordpress_username: wordpressUsername || null,
                  wordpress_display_name: wordpressDisplayName || null,
                  subscription_tier: 'free',
                };
                
                const { data: fallbackProfile, error: fallbackError } = await adminClient
                  .from('profiles')
                  .insert(baseInsertData)
                  .select('*')
                  .single();
                
                if (fallbackError) {
                  logger.error('Failed to create WordPress profile with fallback:', fallbackError);
                  throw new Error(`Failed to create user profile: ${fallbackError.message}`);
                }
                
                profile = {
                  ...fallbackProfile,
                  first_name: null,
                  last_name: null,
                  monthly_credits: 50,
                  remaining_credits: 50,
                  credits_last_reset: null,
                  total_credits_used: 0,
                  total_tokens_used: 0,
                };
              } else {
                logger.error('Failed to create profile for WordPress user:', createError);
                throw new Error(`Failed to create user profile: ${createError.message}`);
              }
            } else {
              profile = newProfile;
            }
            logger.info('✅ Successfully created missing profile for WordPress user:', {
              profileId: profile.id,
              email: profile.email,
              wordpressUserId: wordpressAuth.user.id,
            });
          } catch (createError: any) {
            logger.error('Error creating profile for WordPress user:', createError);
            throw new Error(`Failed to create user profile: ${createError.message}`);
          }
        }

        // Log what we found
        console.log('📧 [Profile Handler] Email comparison:', {
          supabaseProfileEmail: profile.email,
          wordpressEmail: userEmail,
          emailsMatch: profile.email === userEmail,
          isUnknownEmail: profile.email === 'unknown@example.com' || userEmail === 'unknown@example.com',
        });

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
          console.warn('⚠️ [Profile Handler] Email issue: Both sources have unknown@example.com. Please update email in Supabase profiles table.');
          // Keep the Supabase one (don't change to WordPress if it's also invalid)
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
            .select('*')
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
            .select('*')
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
