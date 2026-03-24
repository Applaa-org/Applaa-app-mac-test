// Centralized Supabase runtime credentials used by the desktop app.
// This removes the app's runtime dependency on .env for core Supabase auth/data access.
export const SUPABASE_CONFIG = {
  URL: "https://pzprgvlutyfqfwmllufm.supabase.co",
  ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cHJndmx1dHlmcWZ3bWxsdWZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODg1MTksImV4cCI6MjA3MjY2NDUxOX0.yKKIL4a6pNwMqKT1iYsmfRXecyR8_4ksyGH-8kxoBWM",
  SERVICE_ROLE_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cHJndmx1dHlmcWZ3bWxsdWZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODUxOSwiZXhwIjoyMDcyNjY0NTE5fQ.0SfO6KTBztQUMZuZVQkCATZd0B8w2nnAUQcG4c1hMIs",
} as const;

export function getSupabaseRuntimeConfig() {
  return {
    url: SUPABASE_CONFIG.URL,
    anonKey: SUPABASE_CONFIG.ANON_KEY,
    serviceRoleKey: SUPABASE_CONFIG.SERVICE_ROLE_KEY,
  };
}

