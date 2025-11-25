/**
 * Permission utility functions
 * 
 * Manages access control for admin operations like adding/editing/deleting games and game templates
 */

import { readSettings } from '../main/settings';
import log from 'electron-log';

// List of usernames allowed to perform admin operations
const ALLOWED_ADMIN_USERNAMES = ['patidarmk', 'raj','Mithun Majumdar'];

/**
 * Check if the current WordPress user has admin permissions
 * @returns true if the user is in the allowed admin list, false otherwise
 */
export function hasAdminPermission(): boolean {
  try {
    console.log('🔐 [Permissions] Starting admin permission check...');
    
    const settings = readSettings();
    const wordpressAuth = settings.wordpressAuth;
    
    console.log('🔐 [Permissions] WordPress auth state:', {
      hasWordPressAuth: !!wordpressAuth,
      isAuthenticated: wordpressAuth?.isAuthenticated,
      hasUser: !!wordpressAuth?.user,
    });
    
    log.info('[Permissions] Checking admin permission...');
    log.info('[Permissions] WordPress auth state:', {
      hasWordPressAuth: !!wordpressAuth,
      isAuthenticated: wordpressAuth?.isAuthenticated,
      hasUser: !!wordpressAuth?.user,
    });
    
    if (!wordpressAuth?.isAuthenticated || !wordpressAuth?.user) {
      console.warn('🔐 [Permissions] ❌ User not authenticated or no user data');
      log.warn('[Permissions] User not authenticated or no user data');
      return false;
    }
    
    // Use display_name (same field used in publish/hub for Supabase sync)
    const displayName = wordpressAuth.user.display_name;
    const username = wordpressAuth.user.username; // Keep for fallback
    
    console.log('🔐 [Permissions] Raw username:', username);
    console.log('🔐 [Permissions] Raw display_name:', displayName);
    console.log('🔐 [Permissions] Username type:', typeof username);
    console.log('🔐 [Permissions] Display name type:', typeof displayName);
    console.log('🔐 [Permissions] Full user object:', JSON.stringify(wordpressAuth.user, null, 2));
    
    log.info('[Permissions] Current username (raw):', JSON.stringify(username));
    log.info('[Permissions] Current display_name (raw):', JSON.stringify(displayName));
    log.info('[Permissions] Username type:', typeof username);
    log.info('[Permissions] Display name type:', typeof displayName);
    
    // Use display_name as primary (same as used in app_handlers.ts for Supabase sync)
    // Fallback to username if display_name is not available
    let userIdentifier = displayName || username;
    
    if (!userIdentifier) {
      console.warn('🔐 [Permissions] ❌ Both display_name and username are empty or undefined');
      log.warn('[Permissions] Both display_name and username are empty or undefined');
      return false;
    }
    
    // Trim whitespace and convert to lowercase for comparison
    const identifierLower = String(userIdentifier).trim().toLowerCase();
    const isAllowed = ALLOWED_ADMIN_USERNAMES.includes(identifierLower);
    
    console.log('🔐 [Permissions] User identifier used (display_name preferred):', userIdentifier);
    console.log('🔐 [Permissions] Identifier (trimmed, lowercase):', identifierLower);
    console.log('🔐 [Permissions] Allowed usernames:', ALLOWED_ADMIN_USERNAMES);
    console.log('🔐 [Permissions] ✅ Has permission:', isAllowed);
    
    log.info('[Permissions] User identifier used (display_name preferred):', userIdentifier);
    log.info('[Permissions] Identifier (trimmed, lowercase):', identifierLower);
    log.info('[Permissions] Allowed usernames:', ALLOWED_ADMIN_USERNAMES);
    log.info('[Permissions] Has permission:', isAllowed);
    
    // Also log the full user object for debugging
    log.info('[Permissions] Full user object:', JSON.stringify(wordpressAuth.user, null, 2));
    
    return isAllowed;
  } catch (error) {
    console.error('🔐 [Permissions] ❌ Error checking admin permission:', error);
    log.error('[Permissions] Error checking admin permission:', error);
    return false;
  }
}

/**
 * Get the current WordPress username
 * @returns The username if authenticated, null otherwise
 */
export function getCurrentUsername(): string | null {
  try {
    const settings = readSettings();
    const wordpressAuth = settings.wordpressAuth;
    
    if (!wordpressAuth?.isAuthenticated || !wordpressAuth?.user) {
      log.warn('[Permissions] No authenticated user found when getting username');
      return null;
    }
    
    const username = wordpressAuth.user.username;
    log.info('[Permissions] Retrieved username:', username);
    return username || null;
  } catch (error) {
    log.error('[Permissions] Error getting current username:', error);
    return null;
  }
}

