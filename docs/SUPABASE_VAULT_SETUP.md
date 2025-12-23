# Supabase Vault Setup Guide

This guide explains how to set up Supabase Vault for storing environment variables in Applaa.

## Overview

Supabase Vault is a PostgreSQL extension that provides encrypted storage for secrets. Applaa can load environment variables from Vault at startup, supplementing your `.env` file.

## Prerequisites

1. **Bootstrap Credentials in `.env`**: You must have these in your `.env` file:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Enable Vault Extension**: Vault must be enabled in your Supabase project.

## Step 1: Enable Vault Extension

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Extensions**
3. Search for `supabase_vault` or `vault`
4. Click **Enable** to activate the extension

Alternatively, run this SQL in the SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS supabase_vault;
```

## Step 2: Create Helper RPC Functions

To access Vault secrets from Applaa, you need to create helper RPC functions in your Supabase database. These functions wrap the Vault SQL functions and make them accessible via the Supabase API.

Run these SQL commands in your Supabase SQL Editor:

### Get a Single Secret

```sql
CREATE OR REPLACE FUNCTION get_vault_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN vault.get_secret(secret_name);
END;
$$;
```

### Get All Secrets

```sql
CREATE OR REPLACE FUNCTION get_all_vault_secrets()
RETURNS TABLE(name text, value text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.name, vault.get_secret(s.name) as value
  FROM vault.secrets s;
END;
$$;
```

### Set/Create a Secret

```sql
CREATE OR REPLACE FUNCTION set_vault_secret(secret_name text, secret_value text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM vault.secrets WHERE name = secret_name) THEN
    PERFORM vault.update_secret(secret_name, secret_value);
  ELSE
    PERFORM vault.create_secret(secret_name, secret_value);
  END IF;
  RETURN true;
END;
$$;
```

### Delete a Secret

```sql
CREATE OR REPLACE FUNCTION delete_vault_secret(secret_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM vault.delete_secret(secret_name);
  RETURN true;
END;
$$;
```

## Step 3: Store Secrets in Vault

You can store secrets in Vault using the Supabase dashboard or via SQL:

### Via Supabase Dashboard

1. Go to **Project Settings** → **Vault**
2. Click **Add Secret**
3. Enter the secret name and value
4. Click **Save**

### Via SQL

```sql
SELECT vault.create_secret('MY_API_KEY', 'your-secret-value-here');
```

## Step 4: How Applaa Loads Secrets

When Applaa starts:

1. **First**: Loads `.env` file (bootstrap credentials)
2. **Then**: Connects to Supabase using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
3. **Finally**: Loads all secrets from Vault and adds them to `process.env`

**Important**: Secrets from `.env` take precedence. If a variable exists in both `.env` and Vault, the `.env` value is used.

## Usage Examples

### Storing Environment Variables

Instead of storing all variables in `.env`, you can store non-bootstrap variables in Vault:

**`.env` file** (bootstrap only):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Vault secrets** (everything else):
- `AZURE_API_KEY`
- `BACKEND_API_URL`
- `SENTRY_DSN`
- `GA4_MEASUREMENT_ID`
- etc.

### Accessing Secrets in Code

Once loaded, Vault secrets are available as regular environment variables:

```typescript
// These will be loaded from Vault at startup
const apiKey = process.env.AZURE_API_KEY;
const backendUrl = process.env.BACKEND_API_URL;
```

### Managing Secrets via IPC

You can also manage Vault secrets programmatically:

```typescript
import { IpcClient } from '@/ipc/ipc_client';

const ipcClient = IpcClient.getInstance();

// Get a secret
const secret = await ipcClient.getVaultSecret('MY_API_KEY');

// Set a secret
await ipcClient.setVaultSecret('MY_API_KEY', 'new-value');

// List all secrets
const secretNames = await ipcClient.listVaultSecrets();

// Get all secrets
const allSecrets = await ipcClient.getAllVaultSecrets();
```

## Security Considerations

1. **Service Role Key**: The service role key has full database access. Keep it secure in your `.env` file and never commit it to version control.

2. **Vault Encryption**: Secrets in Vault are encrypted at rest. Only users with the service role key can decrypt them.

3. **RLS Policies**: The helper RPC functions use `SECURITY DEFINER`, which means they run with the privileges of the function creator (typically a superuser). This is necessary to access Vault functions.

4. **Bootstrap Credentials**: Always keep `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env` - these are required to access Vault.

## Troubleshooting

### "Vault extension not enabled"

- Check that the `supabase_vault` extension is enabled in your Supabase project
- Run: `SELECT * FROM pg_extension WHERE extname = 'supabase_vault';`

### "RPC function not found"

- Make sure you've created all the helper RPC functions listed in Step 2
- Check function names match exactly: `get_vault_secret`, `get_all_vault_secrets`, etc.

### "Failed to connect to Supabase"

- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct in your `.env` file
- Check your network connection

### Secrets not loading

- Check the Applaa console logs for Vault-related messages
- Verify secrets exist in Vault: `SELECT name FROM vault.secrets;`
- Ensure RPC functions are created and accessible

## Benefits of Using Vault

1. **Centralized Management**: All secrets in one place (Supabase dashboard)
2. **Encryption**: Secrets are encrypted at rest
3. **Version Control**: `.env` file only contains bootstrap credentials
4. **Team Collaboration**: Multiple team members can access secrets via Supabase dashboard
5. **Audit Trail**: Supabase can track who accessed/modified secrets

## Limitations

- Requires Supabase project setup
- Needs helper RPC functions to be created
- Network dependency at startup (Vault must be accessible)
- `.env` file still needed for bootstrap credentials

