import { createClient, SupabaseClient } from '@supabase/supabase-js';
import log from 'electron-log';

const logger = log.scope('vault');

/**
 * Supabase Vault utility for managing environment variables
 * 
 * Vault is a PostgreSQL extension that stores encrypted secrets.
 * We use the service role key to access vault secrets via SQL.
 */

interface VaultSecret {
  name: string;
  value: string;
}

/**
 * Get a Supabase client using service role key for Vault access
 */
function getVaultClient(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL || "https://pzprgvlutyfqfwmllufm.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cHJndmx1dHlmcWZ3bWxsdWZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODUxOSwiZXhwIjoyMDcyNjY0NTE5fQ.0SfO6KTBztQUMZuZVQkCATZd0B8w2nnAUQcG4c1hMIs";

  if (!supabaseUrl || !serviceRoleKey) {
    logger.warn('Supabase credentials not found. Cannot access Vault.');
    return null;
  }

  try {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (error) {
    logger.error('Failed to create Vault client:', error);
    return null;
  }
}

/**
 * Check if Vault extension is enabled in the database
 * Tries to query vault.secrets table - if it exists, Vault is enabled
 */
export async function isVaultEnabled(): Promise<boolean> {
  const client = getVaultClient();
  if (!client) return false;

  try {
    // Try to query vault.secrets - if the table exists, Vault is enabled
    const { error } = await client
      .from('vault.secrets')
      .select('name')
      .limit(1);

    // If we can query the table (even if empty), Vault is enabled
    // Error might indicate table doesn't exist or RLS blocking access
    if (error) {
      // Check if it's a "relation does not exist" error
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        logger.debug('Vault extension not enabled: vault.secrets table does not exist');
        return false;
      }
      // Other errors (like RLS) might still mean Vault is enabled
      // Try a simpler check - just see if we can access the schema
      logger.debug('Vault check returned error (may be RLS):', error.message);
      // Assume enabled if we get a non-existence error (RLS might block but table exists)
      return true;
    }

    return true;
  } catch (error) {
    logger.debug('Vault extension check error:', error);
    return false;
  }
}

/**
 * Get a secret from Vault by name
 * Uses SQL function: SELECT vault.get_secret('secret_name')
 * 
 * Note: This requires a helper RPC function in Supabase:
 * CREATE OR REPLACE FUNCTION get_vault_secret(secret_name text)
 * RETURNS text
 * LANGUAGE plpgsql
 * SECURITY DEFINER
 * AS $$
 * BEGIN
 *   RETURN vault.get_secret(secret_name);
 * END;
 * $$;
 */
export async function getVaultSecret(secretName: string): Promise<string | null> {
  const client = getVaultClient();
  if (!client) {
    logger.warn('Cannot get vault secret: client not available');
    return null;
  }

  try {
    // Try using a helper RPC function (user needs to create this)
    const { data, error } = await client.rpc('get_vault_secret', {
      secret_name: secretName,
    });

    if (error) {
      logger.debug('RPC get_vault_secret failed, Vault RPC function may not be set up:', error);
      // Return null - user needs to set up the RPC function
      return null;
    }

    return data || null;
  } catch (error) {
    logger.error(`Error getting vault secret "${secretName}":`, error);
    return null;
  }
}

/**
 * Get all secrets from Vault
 * Returns a map of secret names to values
 * 
 * Note: This requires a helper RPC function in Supabase:
 * CREATE OR REPLACE FUNCTION get_all_vault_secrets()
 * RETURNS TABLE(name text, value text)
 * LANGUAGE plpgsql
 * SECURITY DEFINER
 * AS $$
 * BEGIN
 *   RETURN QUERY
 *   SELECT s.name, vault.get_secret(s.name) as value
 *   FROM vault.secrets s;
 * END;
 * $$;
 */
export async function getAllVaultSecrets(): Promise<Record<string, string>> {
  const client = getVaultClient();
  if (!client) {
    logger.warn('Cannot get vault secrets: client not available');
    return {};
  }

  try {
    // Try using a helper RPC function
    const { data, error } = await client.rpc('get_all_vault_secrets', {});

    if (error) {
      logger.debug('RPC get_all_vault_secrets failed, Vault RPC function may not be set up:', error);
      return {};
    }

    const secrets: Record<string, string> = {};
    if (data && Array.isArray(data)) {
      for (const row of data) {
        if (row.name && row.value) {
          secrets[row.name] = row.value;
        }
      }
    }
    return secrets;
  } catch (error) {
    logger.error('Error getting all vault secrets:', error);
    return {};
  }
}

/**
 * Set a secret in Vault
 * 
 * Note: This requires a helper RPC function in Supabase:
 * CREATE OR REPLACE FUNCTION set_vault_secret(secret_name text, secret_value text)
 * RETURNS boolean
 * LANGUAGE plpgsql
 * SECURITY DEFINER
 * AS $$
 * BEGIN
 *   IF EXISTS (SELECT 1 FROM vault.secrets WHERE name = secret_name) THEN
 *     PERFORM vault.update_secret(secret_name, secret_value);
 *   ELSE
 *     PERFORM vault.create_secret(secret_name, secret_value);
 *   END IF;
 *   RETURN true;
 * END;
 * $$;
 */
export async function setVaultSecret(
  secretName: string,
  secretValue: string,
): Promise<boolean> {
  const client = getVaultClient();
  if (!client) {
    logger.warn('Cannot set vault secret: client not available');
    return false;
  }

  try {
    const { data, error } = await client.rpc('set_vault_secret', {
      secret_name: secretName,
      secret_value: secretValue,
    });

    if (error) {
      logger.error(`Failed to set vault secret "${secretName}":`, error);
      logger.info('Note: You may need to create the set_vault_secret RPC function in Supabase');
      return false;
    }

    logger.info(`Successfully set vault secret: ${secretName}`);
    return true;
  } catch (error) {
    logger.error(`Error setting vault secret "${secretName}":`, error);
    return false;
  }
}

/**
 * Delete a secret from Vault
 * 
 * Note: This requires a helper RPC function in Supabase:
 * CREATE OR REPLACE FUNCTION delete_vault_secret(secret_name text)
 * RETURNS boolean
 * LANGUAGE plpgsql
 * SECURITY DEFINER
 * AS $$
 * BEGIN
 *   PERFORM vault.delete_secret(secret_name);
 *   RETURN true;
 * END;
 * $$;
 */
export async function deleteVaultSecret(secretName: string): Promise<boolean> {
  const client = getVaultClient();
  if (!client) {
    logger.warn('Cannot delete vault secret: client not available');
    return false;
  }

  try {
    const { data, error } = await client.rpc('delete_vault_secret', {
      secret_name: secretName,
    });

    if (error) {
      logger.error(`Failed to delete vault secret "${secretName}":`, error);
      logger.info('Note: You may need to create the delete_vault_secret RPC function in Supabase');
      return false;
    }

    logger.info(`Successfully deleted vault secret: ${secretName}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting vault secret "${secretName}":`, error);
    return false;
  }
}

/**
 * List all secret names in Vault
 * 
 * Note: This tries to query vault.secrets directly.
 * If RLS is enabled, you may need a helper RPC function.
 */
export async function listVaultSecrets(): Promise<string[]> {
  const client = getVaultClient();
  if (!client) {
    logger.warn('Cannot list vault secrets: client not available');
    return [];
  }

  try {
    // Try direct query first (may work with service role key)
    const { data, error } = await client
      .from('vault.secrets')
      .select('name')
      .order('name');

    if (error) {
      logger.debug('Direct query failed, trying RPC function:', error);
      // Try RPC function if direct query doesn't work
      const { data: rpcData, error: rpcError } = await client.rpc('list_vault_secrets', {});
      
      if (rpcError) {
        logger.error('Failed to list vault secrets:', rpcError);
        return [];
      }

      return rpcData?.map((row: any) => row.name) || [];
    }

    return data?.map((s: any) => s.name) || [];
  } catch (error) {
    logger.error('Error listing vault secrets:', error);
    return [];
  }
}

/**
 * Load all secrets from Vault into process.env
 * This is called during app startup after .env is loaded
 */
export async function loadVaultSecretsIntoEnv(): Promise<void> {
  // Only load if we have the bootstrap credentials
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.debug('Skipping Vault load: bootstrap credentials not available');
    return;
  }

  // Check if Vault is enabled
  const vaultEnabled = await isVaultEnabled();
  if (!vaultEnabled) {
    logger.debug('Vault extension not enabled, skipping Vault secrets load');
    return;
  }

  try {
    const secrets = await getAllVaultSecrets();
    let loadedCount = 0;

    for (const [name, value] of Object.entries(secrets)) {
      // Don't override existing env vars (from .env file)
      // This allows .env to take precedence
      if (!process.env[name]) {
        process.env[name] = value;
        loadedCount++;
        logger.debug(`Loaded Vault secret into env: ${name}`);
      } else {
        logger.debug(`Skipped Vault secret ${name} (already in env)`);
      }
    }

    logger.info(`✅ Loaded ${loadedCount} secrets from Supabase Vault`);
  } catch (error) {
    logger.error('Failed to load secrets from Vault:', error);
    // Don't throw - allow app to continue with .env only
  }
}

