# Firebase Remote Config Setup for Supabase Configuration

This guide shows you how to set up Firebase Remote Config to store and manage your Supabase configuration remotely.

---

## 🎯 What This Does

Instead of hardcoding Supabase URL and anon key in your app, they'll be:
- ✅ Stored in Firebase Remote Config
- ✅ Fetched at app startup
- ✅ Cached locally for offline use
- ✅ Updatable without rebuilding the app

---

## 📋 Step 1: Enable Remote Config in Firebase Console

### 1.1 Go to Remote Config

Visit: https://console.firebase.google.com/project/applaa-app/config

### 1.2 Click "Create configuration"

If this is your first time using Remote Config, click the **"Create configuration"** button.

---

## 📝 Step 2: Add Supabase Parameters

### 2.1 Add Supabase URL Parameter

1. Click **"Add parameter"**
2. Fill in the details:
   - **Parameter key**: `supabase_url`
   - **Data type**: String
   - **Default value**: `https://pzprgvlutyfqfwmllufm.supabase.co`
   - **Description**: Supabase project URL
3. Click **"Save"**

### 2.2 Add Supabase Anon Key Parameter

1. Click **"Add parameter"** again
2. Fill in the details:
   - **Parameter key**: `supabase_anon_key`
   - **Data type**: String
   - **Default value**: Your anon key (starts with `eyJhbGci...`)
   - **Description**: Supabase anonymous/public key (safe to distribute)
3. Click **"Save"**

### 2.3 Publish Changes

1. Click **"Publish changes"** at the top right
2. Add a description: "Initial Supabase configuration"
3. Click **"Publish"**

---

## ✅ Step 3: Verify Setup

Your Firebase Remote Config should now have:

```
Parameter Key          | Value
--------------------- | --------------------------------
supabase_url          | https://pzprgvlutyfqfwmllufm.supabase.co
supabase_anon_key     | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🚀 Step 4: Test in Your App

### 4.1 Start Your App

\`\`\`bash
npm start
\`\`\`

### 4.2 Check Logs

Look for these messages in the console:
```
[firebase_service] Firebase initialized successfully
[firebase_service] Fetching remote configuration...
[firebase_service] Remote config fetched and activated
[firebase_service] Supabase configuration loaded from Remote Config
```

### 4.3 Verify Configuration is Loaded

The app will:
1. Fetch config from Firebase on startup
2. Cache it locally (works offline after first fetch)
3. Check for updates every hour
4. Fall back to defaults if fetch fails

---

## 🔄 How It Works

### App Startup Flow:

\`\`\`
1. App starts
   ↓
2. Initialize Firebase
   ↓
3. Authenticate anonymously
   ↓
4. Fetch Remote Config from Firebase
   ↓
5. Cache Supabase URL & anon key
   ↓
6. App uses cached values
   ↓
7. Refresh every hour (automatic)
\`\`\`

### Using the Configuration in Your Code:

\`\`\`typescript
import { getSupabaseConfig } from './config/supabase_remote';

// Get current configuration
const config = getSupabaseConfig();
console.log('Supabase URL:', config.url);
console.log('Anon Key:', config.anonKey);

// Or get individual values
import { getSupabaseUrl, getSupabaseAnonKey } from './config/supabase_remote';
const url = getSupabaseUrl();
const key = getSupabaseAnonKey();
\`\`\`

---

## 🔄 Updating Configuration

### To Update Supabase URL or Anon Key:

1. Go to Firebase Console: https://console.firebase.google.com/project/applaa-app/config
2. Click on the parameter you want to update
3. Edit the **Default value**
4. Click **"Save"**
5. Click **"Publish changes"**

**Next time users open the app:**
- ✅ New configuration is automatically fetched
- ✅ No app rebuild needed
- ✅ No app update needed
- ⚡ Takes effect immediately

---

## 🎛️ Advanced: Conditional Configuration

You can create different values for different users:

### Example: Use Different Supabase Projects for Testing

1. In Remote Config, click on a parameter
2. Click **"Add value for condition"**
3. Create a condition (e.g., "Beta Testers")
4. Set different value for beta testers
5. Publish changes

This lets you:
- Test with a staging Supabase project
- Roll out changes gradually
- A/B test different configurations

---

## 📊 Remote Config Settings

### Fetch Interval

Currently set to **1 hour**. You can change this in `firebase_service.ts`:

\`\`\`typescript
// Change this line:
this.remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour

// To fetch more frequently (e.g., 5 minutes):
this.remoteConfig.settings.minimumFetchIntervalMillis = 300000; // 5 minutes
\`\`\`

### Manual Refresh

Force a config refresh from your app:

\`\`\`typescript
import { refreshSupabaseConfig } from './config/supabase_remote';

// Manually refresh configuration
await refreshSupabaseConfig();
\`\`\`

---

## 🔒 Security Notes

### What's Safe in Remote Config?

✅ **Safe (Public keys):**
- Supabase URL
- Supabase Anon Key

These are designed to be public and are protected by Row Level Security (RLS) policies.

❌ **NOT Safe (Secret keys):**
- Supabase Service Role Key
- GitHub Tokens
- Vercel Tokens
- Any admin/secret keys

**Secret keys should stay in `functions/.env` on Firebase servers!**

---

## 🐛 Troubleshooting

### Config Not Loading?

**Check:**
1. Remote Config is published in Firebase Console
2. App has internet connection (for first fetch)
3. Anonymous auth is enabled in Firebase

**View logs:**
\`\`\`bash
# Check browser console or Electron logs
# Look for: [firebase_service] messages
\`\`\`

### Using Fallback Values?

If you see "Using fallback" in logs:
- First time: Normal! Config will be fetched on first internet connection
- Repeatedly: Check Firebase Console to ensure config is published
- Check parameter keys match exactly: `supabase_url` and `supabase_anon_key`

### App Works Offline?

✅ **Yes!** After the first successful fetch:
- Config is cached locally
- App uses cached values when offline
- Refreshes when back online

---

## 📁 Files Modified

- ✅ `src/services/firebase_service.ts` - Added Remote Config support
- ✅ `src/config/supabase_remote.ts` - Helper functions (new file)
- ✅ `package.json` - Firebase SDK already includes Remote Config

---

## 🎯 Benefits

| Feature | Before | After |
|---------|--------|-------|
| **Update URL** | ❌ Rebuild app | ✅ Update in console |
| **Update Key** | ❌ Rebuild app | ✅ Update in console |
| **Migrate Supabase** | ❌ New release | ✅ Instant update |
| **A/B Testing** | ❌ Not possible | ✅ Easy |
| **Offline Support** | ✅ Yes | ✅ Yes (cached) |

---

## ✅ Next Steps

1. **Set up parameters** in Firebase Console (Step 1-2 above)
2. **Test your app** to verify config loads
3. **Optional**: Update existing Supabase initialization code to use `getSupabaseConfig()`
4. **Optional**: Remove Supabase values from root `.env` (after testing)

---

## 📞 Need Help?

Check Firebase Remote Config documentation:
- https://firebase.google.com/docs/remote-config

Or check logs in your app for detailed error messages.

---

**Status**: Setup complete, ready to configure in Firebase Console! 🎉
