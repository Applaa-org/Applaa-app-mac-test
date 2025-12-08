# Postgres Integration - Complete Setup & Testing Guide

## Current Status

✅ Backend code: Fixed transaction issue
✅ Postgres prompt: Added explicit "DO NOT USE SUPABASE" warnings
✅ Detection logic: Checks `.env.local` for `DATABASE_URL`
✅ Priority: Postgres > Supabase > Neon

## Issue

The backend is NOT running, so database provisioning fails silently. Apps don't get `DATABASE_URL`, so the AI falls back to Supabase.

## Complete Fix

### 1. Start the Backend

```bash
cd backend
npm run dev
```

**Verify it's running:**
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","database":"connected"}
```

### 2. Create a New App

In your Electron app, create a new app. The backend will:
- Create a Postgres schema
- Write `DATABASE_URL` to `.env.local`

**Check the logs** for:
```
📦 Provisioning database for app...
✅ Database provisioned: app_X_name
✅ Created .env.local file with DATABASE_URL
```

### 3. Verify DATABASE_URL

Check the app's `.env.local` file:
```bash
cat apps/web/YOUR_APP_NAME/.env.local
```

Should contain:
```env
DATABASE_URL=postgresql://applaa_user:applaa_dev_password@localhost:5432/applaa?schema=app_X_name
POSTGRES_SCHEMA=app_X_name
```

### 4. Start a New Chat

Open a new chat for that app. Check logs for:
```
🔍 Checking for Postgres in app: YOUR_APP_NAME
✅ Postgres detected in .env.local
✅ Using Postgres database for app: YOUR_APP_NAME
```

### 5. Test with AI

Ask: "Create a todo app"

The AI should:
- NOT show "Set up Supabase" button
- Use `pg` package
- Create Postgres tables
- NOT create Supabase client files

## If It Still Shows Supabase

### Check 1: Is the backend running?
```bash
curl http://localhost:3000/health
```

If no response, start it:
```bash
cd backend && npm run dev
```

### Check 2: Does the app have DATABASE_URL?
```bash
find apps -name ".env.local" -exec grep -l "DATABASE_URL" {} \;
```

If empty, the app was created before the backend was running. Create a new app.

### Check 3: Are you using an old chat?
The system prompt is built when the chat starts. Start a NEW chat for the app.

### Check 4: Check the logs
Look for:
- `✅ Postgres detected` → Good
- `ℹ️ No DATABASE_URL found` → App doesn't have Postgres
- `⚠️ Failed to provision database` → Backend call failed

## Manual Test

Create an app manually with DATABASE_URL:

```bash
# 1. Create app folder
mkdir -p apps/web/test-postgres-manual

# 2. Create .env.local
cat > apps/web/test-postgres-manual/.env.local << 'EOF'
DATABASE_URL=postgresql://applaa_user:applaa_dev_password@localhost:5432/applaa?schema=app_999_test
POSTGRES_SCHEMA=app_999_test
EOF

# 3. Create the schema in Postgres
psql -U applaa_user -d applaa -h localhost << 'EOF'
CREATE SCHEMA IF NOT EXISTS app_999_test;
EOF

# 4. Open a chat for this app
```

The AI should detect Postgres and NOT show Supabase.

## Key Points

1. **Backend MUST be running** for new apps to get DATABASE_URL
2. **Existing apps** created before backend was running won't have DATABASE_URL
3. **New chats** are needed after adding DATABASE_URL (prompt is built at chat start)
4. **Logs** show exactly what's happening - check them

## Summary

The code is correct. The issue is:
- Backend wasn't running when apps were created
- Apps don't have `DATABASE_URL` in `.env.local`
- Without `DATABASE_URL`, AI falls back to Supabase

**Solution**: Start backend, create a NEW app, start a NEW chat.

