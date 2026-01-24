# 🗂️ Configuration Management Summary

Complete overview of where all your configuration and secrets are stored.

---

## 📊 Configuration Locations

### 1. 🌐 **Firebase Remote Config** (Public, Client-Accessible)

**Location**: https://console.firebase.google.com/project/applaa-app/config

**What's There:**
- ✅ `supabase_url` - Supabase project URL
- ✅ `supabase_anon_key` - Supabase anonymous/public key

**Purpose**: 
- Fetched by your Electron app at startup
- Can be updated without rebuilding app
- Safe to be public (protected by Supabase RLS)

**Update**: Edit in Firebase Console → Publish → Users get it next app launch

---

### 2. 🔒 **Firebase Functions `.env`** (Secret, Server-Only)

**Location**: `functions/.env` (deployed to Firebase servers)

**What's There:**
```
AZURE_API_KEY                  - Azure OpenAI API key
AZURE_RESOURCE_NAME            - Azure resource name
AZURE_DEPLOYMENT_NAME          - Azure deployment name
AZURE_API_VERSION              - Azure API version
AZURE_ENDPOINT                 - Azure endpoint URL

GITHUB_TOKEN                   - GitHub access token
GITHUB_USERNAME                - GitHub organization name

VERCEL_TOKEN                   - Vercel deployment token

SUPABASE_URL                   - Supabase project URL
SUPABASE_SERVICE_ROLE_KEY      - Supabase admin key (SECRET!)

E2B_API_KEY                    - E2B sandbox API key
```

**Purpose**:
- Used by Firebase Cloud Functions (server-side)
- NEVER exposed to client apps
- Handles admin/privileged operations

**Update**: Edit `functions/.env` → Run `firebase deploy --only functions`

---

### 3. 📝 **Root `.env`** (Local Development, Kept Minimal)

**Location**: `.env` (in project root)

**What's Left:**
```
AZURE_API_KEY                  - For local Azure OpenAI calls
AZURE_RESOURCE_NAME
AZURE_DEPLOYMENT_NAME
AZURE_API_VERSION
AZURE_ENDPOINT

CLOUDFLARE_R2_*               - Cloudflare R2 configuration (placeholder)
GA4_MEASUREMENT_ID            - Google Analytics (public)
SENTRY_DSN                    - Sentry error tracking (public)

ENABLE_CLOUD_SYNC             - Feature flags
ENABLE_ANALYTICS
ENABLE_CRASH_REPORTING

NODE_ENV                      - Environment setting
LOG_LEVEL                     - Logging level

VITE_VERCEL_TOKEN            - Vercel token (for builds)
VITE_GITHUB_TOKEN            - GitHub token (for builds)

E2B_API_KEY                   - E2B API key

APPLE_ID                      - Apple notarization (build-time)
APPLE_PASSWORD
APPLE_TEAM_ID
MAC_NOTARIZE
```

**Note**: Supabase configuration **removed** (now in Firebase!)

**Purpose**:
- Local development
- Build-time configuration
- Non-sensitive public values
- Fallback values

---

### 4. 🔧 **Hardcoded Config** (Temporarily)

**Location**: `src/config/autopush.config.ts`

**What's There:**
```typescript
GITHUB_TOKEN: "github_pat_..."  - Temporarily until migration complete
VERCEL_TOKEN: "gZ8iD2IT..."     - Temporarily until migration complete
GITHUB_USERNAME: "Applaa-org"   - Public, OK to keep
```

**Status**: ⚠️ Temporary - Will be removed after full Firebase migration

---

## 🔐 Security Classification

### ✅ Public (Safe to Distribute)
- Supabase URL
- Supabase Anon Key
- Firebase config (`firebase.config.ts`)
- GA4 Measurement ID
- Sentry DSN
- Feature flags

### 🔒 Secret (Must Protect)
- **SUPABASE_SERVICE_ROLE_KEY** ← Most critical!
- GitHub tokens
- Vercel tokens
- Azure API keys
- E2B API keys

### 📦 Build-Time Only
- Apple notarization credentials
- Build-time environment variables

---

## 📍 Where Each Secret Lives

| Secret | Root .env | functions/.env | Remote Config | autopush.config.ts |
|--------|-----------|----------------|---------------|-------------------|
| **Supabase URL** | ❌ Removed | ✅ Yes | ✅ Yes | - |
| **Supabase Anon Key** | ❌ Removed | - | ✅ Yes | - |
| **Supabase Service Key** | ❌ Removed | ✅ Yes (secure) | ❌ Never! | - |
| **GitHub Token** | ✅ Temp | ✅ Yes | - | ⚠️ Temp |
| **Vercel Token** | ✅ Temp | ✅ Yes | - | ⚠️ Temp |
| **Azure API Key** | ✅ Yes | ✅ Yes | - | - |
| **E2B API Key** | ✅ Yes | ✅ Yes | - | - |

---

## 🎯 Current State vs Ideal State

### Current State
```
Root .env          → Still has some secrets (Azure, E2B, etc.)
functions/.env     → Has all secrets (secure) ✅
Remote Config      → Has Supabase public config ✅
autopush.config.ts → Has GitHub/Vercel tokens ⚠️
```

### Ideal State (After Full Migration)
```
Root .env          → Only public values & feature flags
functions/.env     → All secrets (secure) ✅
Remote Config      → All public configs ✅
autopush.config.ts → No secrets, only settings ✅
```

---

## 🚀 Migration Status

### ✅ Complete
1. Firebase Functions deployed
2. Firebase Remote Config for Supabase
3. Anonymous authentication enabled
4. Service layer created

### ⏸️ Pending
1. Migrate GitHub/Vercel operations to use Firebase Functions
2. Remove tokens from `autopush.config.ts`
3. Optional: Move more public configs to Remote Config

---

## 🔄 How to Update Each Type

### Update Supabase Config
1. Go to: https://console.firebase.google.com/project/applaa-app/config
2. Edit `supabase_url` or `supabase_anon_key`
3. Publish changes
4. **Done!** Users get it next app launch

### Update Secret Keys (GitHub, Vercel, etc.)
1. Edit `functions/.env`
2. Run: `firebase deploy --only functions`
3. **Done!** Takes effect immediately

### Update Local Development Config
1. Edit root `.env`
2. Restart app
3. **Done!** Local only

### Update Build-Time Config
1. Edit root `.env`
2. Rebuild app
3. **Done!** New build uses new values

---

## 📖 Quick Reference

**Firebase Console**: https://console.firebase.google.com/project/applaa-app

**Remote Config**: `.../config`
**Functions**: `.../functions`
**Authentication**: `.../authentication`

---

## ✅ Summary

**Supabase Configuration**: ✅ Fully migrated to Firebase!
- Public values (URL, anon key) → Firebase Remote Config
- Secret value (service role key) → Firebase Functions .env
- Root .env → Cleaned up

**Security**: ✅ Improved!
- Service role key no longer in distributed app
- Public keys managed centrally
- Can update without rebuilding

**Next**: Complete GitHub/Vercel migration when ready 🚀
