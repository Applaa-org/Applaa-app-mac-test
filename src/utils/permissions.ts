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
    const settings = readSettings();
    const wordpressAuth = settings.wordpressAuth;

    if (!wordpressAuth?.isAuthenticated || !wordpressAuth?.user) {
      return false;
    }

    const displayName = wordpressAuth.user.display_name;
    const username = wordpressAuth.user.username;
    const userIdentifier = displayName || username;

    if (!userIdentifier) {
      return false;
    }

    const identifierLower = String(userIdentifier).trim().toLowerCase();
    const allowedUsernamesLower = ALLOWED_ADMIN_USERNAMES.map(name => String(name).trim().toLowerCase());
    return allowedUsernamesLower.includes(identifierLower);
  } catch (error) {
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
      return null;
    }

    const username = wordpressAuth.user.username;
    return username || null;
  } catch (error) {
    log.error('[Permissions] Error getting current username:', error);
    return null;
  }
}

