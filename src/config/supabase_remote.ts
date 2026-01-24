/**
 * Supabase Configuration from Firebase Remote Config
 * 
 * This module provides access to Supabase configuration that's fetched
 * from Firebase Remote Config at runtime.
 */

import { firebaseService } from "../services/firebase_service";
import log from "electron-log";

const logger = log.scope("supabase_remote");

/**
 * Get Supabase URL from Remote Config
 * Falls back to default if not available
 */
export function getSupabaseUrl(): string {
  const config = firebaseService.getSupabaseConfig();
  
  if (config?.supabaseUrl) {
    return config.supabaseUrl;
  }

  // Fallback to environment variable or default
  const fallback = process.env.SUPABASE_URL || "https://pzprgvlutyfqfwmllufm.supabase.co";
  logger.warn(`Using fallback Supabase URL: ${fallback}`);
  return fallback;
}

/**
 * Get Supabase Anonymous Key from Remote Config
 * Falls back to default if not available
 */
export function getSupabaseAnonKey(): string {
  const config = firebaseService.getSupabaseConfig();
  
  if (config?.supabaseAnonKey) {
    return config.supabaseAnonKey;
  }

  // Fallback to environment variable or default
  const fallback = process.env.SUPABASE_ANON_KEY || 
    process.env.AUTH_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cHJndmx1dHlmcWZ3bWxsdWZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODg1MTksImV4cCI6MjA3MjY2NDUxOX0.yKKIL4a6pNwMqKT1iYsmfRXecyR8_4ksyGH-8kxoBWM";
  
  logger.warn("Using fallback Supabase anon key");
  return fallback;
}

/**
 * Get complete Supabase configuration
 */
export function getSupabaseConfig() {
  return {
    url: getSupabaseUrl(),
    anonKey: getSupabaseAnonKey()
  };
}

/**
 * Refresh Supabase configuration from Remote Config
 */
export async function refreshSupabaseConfig(): Promise<void> {
  try {
    await firebaseService.refreshRemoteConfig();
    logger.info("Supabase configuration refreshed");
  } catch (error) {
    logger.error("Failed to refresh Supabase configuration:", error);
  }
}
