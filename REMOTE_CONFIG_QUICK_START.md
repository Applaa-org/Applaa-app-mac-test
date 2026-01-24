# 🚀 Firebase Remote Config - Quick Start

Get your Supabase configuration from Firebase Remote Config in **5 minutes**.

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Add Parameters in Firebase Console (2 minutes)

1. Go to: https://console.firebase.google.com/project/applaa-app/config
2. Click **"Create configuration"** (if first time)
3. Click **"Add parameter"**

**Parameter 1:**
```
Parameter key:    supabase_url
Default value:    https://pzprgvlutyfqfwmllufm.supabase.co
```

**Parameter 2:**
```
Parameter key:    supabase_anon_key
Default value:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cHJndmx1dHlmcWZ3bWxsdWZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODg1MTksImV4cCI6MjA3MjY2NDUxOX0.yKKIL4a6pNwMqKT1iYsmfRXecyR8_4ksyGH-8kxoBWM
```

4. Click **"Publish changes"**

✅ Done!

---

### Step 2: Test Your App (1 minute)

```bash
npm start
```

Check console for:
```
✅ [firebase_service] Supabase configuration loaded from Remote Config
```

---

### Step 3: Use in Your Code (2 minutes)

Replace any hardcoded Supabase config with:

```typescript
import { getSupabaseConfig } from './config/supabase_remote';

// Get configuration
const config = getSupabaseConfig();
console.log('Supabase URL:', config.url);
console.log('Anon Key:', config.anonKey);
```

Or use individual getters:

```typescript
import { getSupabaseUrl, getSupabaseAnonKey } from './config/supabase_remote';

const url = getSupabaseUrl();
const key = getSupabaseAnonKey();
```

---

## ✅ What You Get

- ✅ **Update anytime** - Change URL/key in Firebase Console without rebuilding app
- ✅ **Works offline** - Configuration cached locally after first fetch  
- ✅ **Auto-refresh** - Checks for updates every hour
- ✅ **Fallback safe** - Uses defaults if fetch fails

---

## 🔄 To Update Configuration Later

1. Go to: https://console.firebase.google.com/project/applaa-app/config
2. Edit parameter value
3. Click "Publish changes"
4. **Users get update next time they open the app!** ⚡

No rebuild. No app update. Instant. 🎉

---

## 📖 Full Documentation

See `FIREBASE_REMOTE_CONFIG_SETUP.md` for:
- Advanced configuration
- Conditional values
- A/B testing
- Troubleshooting
- Security notes

---

**Ready to go!** 🚀

Next: Set up the parameters in Firebase Console (Step 1 above)
