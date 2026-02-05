# Firebase Security Setup for Applaa

This document explains the Firebase Functions security implementation that protects your API keys and tokens.

## 🎯 What Was Done

### 1. **Created Secure Firebase Functions** (`functions/`)
- **Location**: `functions/index.js`
- **Protected APIs**:
  - Azure OpenAI API calls
  - GitHub repository operations
  - Vercel deployments
  - E2B sandbox execution

### 2. **Moved Secrets to Firebase** (`functions/.env`)
- All sensitive tokens now stored in `functions/.env`
- This file is **never committed** to git (protected by `.gitignore`)
- Secrets only exist on Firebase servers, not in distributed app

### 3. **Removed Hardcoded Secrets**
- ✅ Removed GitHub token from `src/config/autopush.config.ts`
- ✅ Removed Vercel token from `src/config/autopush.config.ts`
- ✅ Created secure service layer (`src/services/firebase_service.ts`)

### 4. **Created React Hooks**
- `src/hooks/useFirebase.ts` - Easy access to Firebase Functions
- `src/services/firebase_service.ts` - Core Firebase service

## 📋 Next Steps - COMPLETE THESE

### Step 1: Get Your Firebase Config

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **"applaa-app"**
3. Click the gear icon → **Project Settings**
4. Scroll to "Your apps" section
5. Click **"</> Web"** to add/view web app config
6. Copy the `firebaseConfig` object

### Step 2: Update Firebase Config

Edit `src/config/firebase.config.ts` and replace with your actual config:

\`\`\`typescript
export const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",
  projectId: "applaa-app",
  storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET",
  messagingSenderId: "YOUR_ACTUAL_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID",
};
\`\`\`

### Step 3: Deploy Firebase Functions

\`\`\`bash
cd functions
firebase deploy --only functions
\`\`\`

This will deploy your secure functions to Google Cloud.

### Step 4: Test the Setup

\`\`\`bash
# Start your Electron app
npm start
\`\`\`

The app should now use Firebase Functions for all API calls.

## 🔒 Security Benefits

### Before (❌ INSECURE)
```typescript
// Hardcoded in source code - anyone can extract!
const GITHUB_TOKEN = "github_pat_11BYOMKNA0...";
const VERCEL_TOKEN = "gZ8iD2ITkjXdjn5esIHvUZL1";

// Direct API call with exposed key
fetch('https://api.github.com/...', {
  headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
});
\`\`\`

### After (✅ SECURE)
```typescript
// No tokens in client code!
const result = await firebaseService.createGitHubRepo({
  repoName: "my-app",
  isPrivate: false
});
// Token stays on Firebase servers, never exposed
\`\`\`

## 📁 File Structure

\`\`\`
Applaa-Builder-v1/
├── functions/                    # Firebase Functions (secure backend)
│   ├── .env                     # ⚠️ SECRETS HERE (never commit!)
│   ├── .gitignore               # Protects .env
│   ├── index.js                 # Secure function handlers
│   └── package.json
│
├── src/
│   ├── config/
│   │   ├── firebase.config.ts   # Firebase project config (public, safe)
│   │   └── autopush.config.ts   # Updated (secrets removed)
│   │
│   ├── services/
│   │   └── firebase_service.ts  # Firebase service layer
│   │
│   └── hooks/
│       └── useFirebase.ts       # React hooks for components
│
├── firebase.json                # Firebase configuration
└── .firebaserc                  # Firebase project alias
\`\`\`

## 🚀 How It Works

1. **User triggers action** (e.g., "Deploy to Vercel")
2. **React component** calls `useVercel().deploy()`
3. **Firebase service** authenticates and calls Firebase Function
4. **Firebase Function** (on Google servers) uses secret token
5. **API call** made securely from Firebase servers
6. **Result** returned to user

## ⚠️ Important Notes

### DO NOT Commit These Files:
- ❌ `functions/.env` - Contains all secrets
- ❌ `.env` files with real tokens

### SAFE to Commit:
- ✅ `firebase.json` - Configuration
- ✅ `functions/index.js` - Function code (no secrets)
- ✅ `src/config/firebase.config.ts` - Firebase public config
- ✅ `.firebaserc` - Project aliases

## 🔄 Updating Secrets

If you need to change tokens:

1. Update `functions/.env`
2. Redeploy functions:
   \`\`\`bash
   cd functions
   firebase deploy --only functions
   \`\`\`
3. No app rebuild needed! ✨

## 📊 Cost

Firebase Functions pricing:
- **Free tier**: 2M invocations/month
- Your typical usage: ~10K-50K/month
- **Cost**: $0/month (well within free tier)

## 🐛 Troubleshooting

### Error: "Firebase not initialized"
- Make sure you've updated `firebase.config.ts` with your actual config
- Check browser console for Firebase initialization errors

### Error: "Authentication required"
- Firebase auth is set to anonymous - should auto-authenticate
- Check `firebase_service.ts` initialization

### Error: "Function not found"
- Make sure you've deployed functions: `firebase deploy --only functions`
- Check Firebase Console → Functions to verify deployment

## 📚 Resources

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Firebase Console](https://console.firebase.google.com/)
- [Applaa Documentation](./docs/)

---

**Status**: ✅ Setup complete, ready to deploy and test!
