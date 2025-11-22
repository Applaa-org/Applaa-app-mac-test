# WordPress to Supabase User Profile Sync

This document explains how WordPress user authentication data is synced to Supabase profiles table.

## Overview

When a user logs in via WordPress authentication, their profile data is automatically synced to Supabase. This allows you to:
- Store user profile data in Supabase (cloud database)
- Access user data across devices
- Maintain user data even if local SQLite database is cleared

## Where App Data is Stored

### Local SQLite Database
All app-related data (apps, chats, messages, versions) is stored in **local SQLite database**:

**Location**: `{userDataPath}/applaa.db`

**Tables**:
- `apps` - Contains app data including:
  - `id`, `name`, `path`
  - `vercelProjectId`, `vercelProjectName`, `vercelTeamId`, `vercelDeploymentUrl`
  - `githubOrg`, `githubRepo`, `githubBranch`, `githubRepoUrl`
  - `supabaseProjectId`, `neonProjectId`
  - `easBuildUrl`, `easDeploymentUrl`, `easProjectId`
  - `deploymentStatus`, `lastDeploymentAt`
  - And more...

- `chats` - Chat sessions for each app
- `messages` - Messages in each chat
- `versions` - App version history

### Supabase Database
User profile data is stored in **Supabase** (cloud database):

**Table**: `public.profiles`

**Fields**:
- `id` (UUID) - Primary key
- `email` (TEXT) - User email (unique, from WordPress)
- `full_name` (TEXT) - User's display name
- `avatar_url` (TEXT) - Profile picture URL
- `subscription_tier` (TEXT) - 'free' or 'pro'
- `wordpress_user_id` (INTEGER) - WordPress user ID
- `wordpress_username` (TEXT) - WordPress username
- `wordpress_display_name` (TEXT) - WordPress display name
- `wordpress_roles` (TEXT[]) - WordPress user roles array
- `created_at` (TIMESTAMP) - Profile creation time
- `updated_at` (TIMESTAMP) - Last update time

## Setup

### 1. Environment Variables

Make sure your `.env` file has:
```env
SUPABASE_URL=https://pzprgvlutyfqfwmllufm.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 2. Create Supabase Table

Run the SQL migration in your Supabase dashboard:

**File**: `supabase_migrations/create_profiles_table.sql`

This creates:
- The `profiles` table with all required fields
- Row Level Security (RLS) policies
- Indexes for performance
- Auto-update trigger for `updated_at`

## How It Works

### Automatic Sync on Login

When a user logs in via WordPress:

1. WordPress authentication happens (existing flow)
2. User data is saved to local settings (existing flow)
3. **NEW**: User data is automatically synced to Supabase:
   - If profile exists (by email): Updates existing profile
   - If profile doesn't exist: Creates new profile
   - Uses service role key for admin operations
   - Non-blocking: Login succeeds even if Supabase sync fails

### Manual Sync

You can also manually trigger a sync:

```typescript
const ipcClient = IpcClient.getInstance();
const result = await ipcClient.wordpressSyncToSupabase();
if (result.success) {
  console.log('Profile synced:', result.profile);
}
```

## Code Implementation

### Files Modified

1. **`src/lib/supabase.ts`**
   - Added `syncWordPressUser()` method to `SupabaseAuth` class
   - Added `getProfileByEmail()` method
   - Added standalone `syncWordPressUserToSupabase()` function
   - Updated `Database` interface to include WordPress fields

2. **`src/ipc/handlers/wordpress_auth_handlers.ts`**
   - Added automatic sync call after successful WordPress login
   - Added `wordpress:sync-to-supabase` IPC handler for manual sync

3. **`src/ipc/ipc_client.ts`**
   - Added `wordpressSyncToSupabase()` method

### New Files

1. **`supabase_migrations/create_profiles_table.sql`**
   - SQL migration to create profiles table with RLS

## Security

- **Row Level Security (RLS)** is enabled on the profiles table
- Service role key is used for WordPress sync (admin operations)
- Authenticated users can only read/update their own profiles (by email)
- WordPress user data is synced securely using service role credentials

## Error Handling

- Supabase sync is **non-blocking**: WordPress login succeeds even if sync fails
- Errors are logged but don't prevent user authentication
- Manual sync can be retried if automatic sync fails

## Future Enhancements

Potential improvements:
- Sync app data to Supabase per user
- Cloud backup of SQLite database
- Multi-device sync
- User preferences sync

