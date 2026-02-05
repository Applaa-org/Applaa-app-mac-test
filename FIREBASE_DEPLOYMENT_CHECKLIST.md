# 🚀 Firebase Deployment Checklist

## ✅ What's Already Done

- [x] Firebase Functions initialized
- [x] Secure functions created (`functions/index.js`)
- [x] Secrets moved to `functions/.env`
- [x] Hardcoded tokens removed from source code
- [x] Firebase service layer created
- [x] React hooks created
- [x] Dependencies installed

## 📝 What You Need to Do NOW

### 1. Get Firebase Web App Config (5 minutes)

1. Open: https://console.firebase.google.com/
2. Select project: **"applaa-app"**
3. Click ⚙️ (gear icon) → **Project Settings**
4. Scroll to "Your apps" section
5. Click **"</> Add app"** or view existing web app
6. Copy the entire `firebaseConfig` object

It looks like this:
\`\`\`javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "applaa-app.firebaseapp.com",
  projectId: "applaa-app",
  storageBucket: "applaa-app.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxxxxxxxxxx"
};
\`\`\`

### 2. Update Firebase Config File

Edit this file: `src/config/firebase.config.ts`

Replace the placeholder values with your actual config from step 1.

### 3. Deploy Firebase Functions

Open terminal and run:

\`\`\`bash
# Navigate to project root (if not already there)
cd /Users/macbook/Applaa/Applaa-Builder-v1

# Deploy functions to Firebase
firebase deploy --only functions
\`\`\`

This will:
- Upload your secure functions to Google Cloud
- Make them accessible to your Electron app
- Keep all secrets secure on Firebase servers

Expected output:
\`\`\`
✔ Deploy complete!

Functions:
  - callAzureOpenAI(us-central1)
  - createGitHubRepo(us-central1)
  - pushToGitHub(us-central1)
  - deployToVercel(us-central1)
  - getVercelDeploymentStatus(us-central1)
  - executeInE2B(us-central1)
\`\`\`

### 4. Test Your App

\`\`\`bash
# Start your Electron app
npm start
\`\`\`

### 5. Verify Security

Check that tokens are NOT in your source code:

\`\`\`bash
# This should return 0 results
grep -r "github_pat_" src/
grep -r "gZ8iD2ITkjXdjn5esIHvUZL1" src/
\`\`\`

✅ If no results = Secrets successfully removed!

## 🧪 Testing the Secure Setup

Try these features to verify everything works:

1. **Test GitHub Push**
   - Create a new app
   - Click "Auto Push to GitHub"
   - Should create repo using Firebase Function (secure)

2. **Test Vercel Deploy**
   - Enable "Deploy to Vercel"
   - Should deploy using Firebase Function (secure)

3. **Test Azure OpenAI**
   - Use AI features in the app
   - Should call Azure via Firebase Function (secure)

## 🔒 Security Verification

Your app is now secure when:
- ✅ No tokens in `src/config/autopush.config.ts`
- ✅ All tokens in `functions/.env` (never committed)
- ✅ Firebase Functions deployed
- ✅ App uses `firebaseService` for API calls

## 📊 Firebase Console Verification

Go to [Firebase Console](https://console.firebase.google.com/) → Functions

You should see 6 functions deployed:
1. `callAzureOpenAI`
2. `createGitHubRepo`
3. `pushToGitHub`
4. `deployToVercel`
5. `getVercelDeploymentStatus`
6. `executeInE2B`

## ⚠️ Common Issues

### Issue: "Firebase config not found"
**Solution**: Complete step 1 & 2 above

### Issue: "Function not found" error
**Solution**: Run `firebase deploy --only functions`

### Issue: "Authentication failed"
**Solution**: Check that anonymous auth is enabled in Firebase Console → Authentication

### Issue: Deploy fails
**Solution**: 
\`\`\`bash
# Check you're logged in
firebase login

# Check project is set
firebase use --list

# Should show: applaa-app (current)
\`\`\`

## 🎉 Success Criteria

You'll know it's working when:
1. ✅ App starts without errors
2. ✅ You can create GitHub repos
3. ✅ You can deploy to Vercel
4. ✅ AI features work
5. ✅ No tokens visible in browser DevTools

## 📞 Need Help?

Check these files for reference:
- `FIREBASE_SECURITY_SETUP.md` - Detailed setup guide
- `functions/index.js` - Function implementations
- `src/services/firebase_service.ts` - Service layer
- `src/hooks/useFirebase.ts` - React hooks

---

**Current Status**: Ready to deploy! 🚀

**Next Action**: Get Firebase config (step 1 above)
