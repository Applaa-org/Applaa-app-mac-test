# Enable Firebase Authentication

## Quick Setup (2 minutes)

### 1. Go to Firebase Console
https://console.firebase.google.com/project/applaa-app/authentication/providers

### 2. Enable Anonymous Authentication

1. Click on **"Get started"** (if first time) or **"Sign-in method"** tab
2. Find **"Anonymous"** in the list
3. Click on it
4. Toggle **"Enable"**
5. Click **"Save"**

That's it! ✅

### Why Anonymous Auth?

Your Electron desktop app uses anonymous authentication so users don't need to sign in. Firebase still authenticates the app to securely call your functions, but users don't see any login screens.

---

## ✅ You're Done!

Once anonymous auth is enabled, your app is ready to use secure Firebase Functions!

### Test It:

```bash
npm start
```

Then try:
- Creating a new app
- Auto Push to GitHub
- Deploy to Vercel

All API calls now go through secure Firebase Functions - no tokens exposed! 🔒
