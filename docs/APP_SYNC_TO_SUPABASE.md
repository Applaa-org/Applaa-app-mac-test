# App Data Sync to Supabase

This document explains how app data is automatically synced from local SQLite database to Supabase.

## Overview

When apps are created or updated in the local SQLite database, they are automatically synced to Supabase's `user_apps` table. This allows:
- Cloud backup of app data
- Access to app data across devices
- User-specific app data storage

## How It Works

### Automatic Sync

App data is automatically synced to Supabase when:

1. **App Creation**: When a new app is created via `create-app-background` or `create-app-instant`
2. **App Updates**: When app data is updated via:
   - Deployment URL updates (`url:save-deployment`)
   - Vercel project connections/updates
   - GitHub repo connections/updates
   - Neon project connections
   - App deployment status changes
   - And other app property updates

### User Association

Apps are associated with users by their **WordPress email address**:
- The system gets the current WordPress user email from settings
- Apps are stored in Supabase with `user_email` field
- Each user can only see their own apps (enforced by RLS policies)

## Setup

### 1. Run SQL Migration

Run the SQL migration in your Supabase dashboard:

**File**: `supabase_migrations/create_user_apps_table.sql`

This creates:
- The `user_apps` table with all app fields
- Row Level Security (RLS) policies
- Indexes for performance
- Auto-update trigger for `updated_at`

### 2. Environment Variables

Make sure your `.env` file has:
```env
SUPABASE_URL=https://pzprgvlutyfqfwmllufm.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 3. WordPress Login Required

Users must be logged in via WordPress for app sync to work. The system uses the WordPress user email to associate apps with users.

## Data Synced

The following app data is synced to Supabase:

- **Basic Info**: id, name, path, type, status
- **GitHub**: org, repo, branch, repo_url
- **Vercel**: project_id, project_name, team_id, deployment_url
- **Supabase**: project_id
- **Neon**: project_id, development_branch_id, preview_branch_id
- **EAS**: build_url, deployment_url, project_id, build_id
- **Local Builds**: apk/aab/ipa paths and build timestamps
- **Deployment**: status, last_deployment_at, deployment_notes

## Code Implementation

### Files

1. **`src/lib/supabase.ts`**
   - `syncAppToSupabase()` - Main sync function
   - `getWordPressUserEmail()` - Helper to get user email

2. **`src/lib/supabase_app_sync.ts`**
   - `syncAppByIdToSupabase()` - Helper to sync by app ID

3. **`src/ipc/handlers/app_handlers.ts`**
   - Sync on app creation

4. **`src/ipc/handlers/url_handlers.ts`**
   - Sync on deployment URL updates

5. **`src/ipc/handlers/vercel_handlers.ts`**
   - Sync on Vercel project updates

6. **`src/ipc/handlers/github_handlers.ts`**
   - Sync on GitHub repo updates

7. **`src/ipc/handlers/neon_handlers.ts`**
   - Sync on Neon project updates

## Error Handling

- Sync is **non-blocking**: App operations succeed even if Supabase sync fails
- Errors are logged but don't prevent app creation/updates
- Sync failures are silent to the user (logged in main process)

## Manual Sync

You can manually trigger sync for an app:

```typescript
import { syncAppByIdToSupabase } from '@/lib/supabase_app_sync';
await syncAppByIdToSupabase(appId);
```

## Future Enhancements

Potential improvements:
- Sync app files/content to cloud storage
- Multi-device app sync
- App sharing between users
- App templates from Supabase

