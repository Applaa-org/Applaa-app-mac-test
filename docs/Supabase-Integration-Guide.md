# 🚀 Complete Supabase Integration Guide for Applaa

This guide covers setting up Supabase integration at both the **Applaa project level** and **individual app level** for web and Expo apps.

## 📋 Overview

Supabase integration in Applaa works on two levels:
1. **Applaa Project Level** - Connect Applaa to your Supabase account for project management
2. **App Level** - Add Supabase database, auth, and storage to your generated apps

## 🏗️ Part 1: Applaa Project Level Setup

### Step 1: Enable Supabase Handlers

✅ **Already Done!** Supabase handlers are now enabled in Applaa.

### Step 2: Configure Supabase in Applaa Settings

1. **Get Supabase Credentials:**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project or use existing one
   - Go to Settings → API
   - Copy your **Project URL** and **anon public key**

2. **Add to Applaa Settings:**
   - Open Applaa Settings
   - Navigate to **Integrations** → **Supabase**
   - Enter your Supabase URL and API keys
   - Click **Save**

### Step 3: Connect Supabase Projects

1. **In your app's settings page:**
   - Click **"Connect Supabase"**
   - Select your Supabase project from the list
   - Applaa will now manage database schemas and deployments

## 📱 Part 2: App Level Integration

### For Web Apps (React/Vite)

#### 1. Install Supabase Dependencies

```bash
npm install @supabase/supabase-js
```

#### 2. Initialize Supabase

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

#### 3. Add Environment Variables

Create `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 4. Use in Components

```typescript
import { supabase } from './lib/supabase'

// Authentication
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password'
})

// Database
const { data, error } = await supabase
  .from('your_table')
  .select('*')
```

### For Expo Apps

#### 1. Dependencies Already Included

✅ **Already Done!** Our Expo template includes:
- `@supabase/supabase-js`
- `react-native-url-polyfill`
- `@react-native-async-storage/async-storage`

#### 2. Use the Built-in Supabase Utility

The Expo template includes a comprehensive Supabase utility at `utils/supabase.ts`.

#### 3. Initialize in App.tsx

```typescript
import { initializeSupabase } from './utils/supabase';

const supabaseConfig = {
  url: 'YOUR_SUPABASE_URL',
  anonKey: 'YOUR_SUPABASE_ANON_KEY',
};

// Initialize once when app starts
initializeSupabase(supabaseConfig);
```

#### 4. Use in Components

```typescript
import { useSupabase, useSupabaseAuth } from './utils/supabase';

export function MyComponent() {
  const { database, storage } = useSupabase();
  const { signIn, signOut, getCurrentUser } = useSupabaseAuth();
  
  // Authentication
  const handleSignIn = async () => {
    await signIn('user@example.com', 'password');
  };
  
  // Database
  const fetchData = async () => {
    const { data, error } = await database
      .table('your_table')
      .select('*');
  };
  
  // Storage
  const uploadFile = async (file: File) => {
    await storage.upload('bucket', 'path/file.jpg', file);
  };
}
```

## 🗄️ Part 3: Database Schema Setup

### Recommended Tables for Applaa Apps

```sql
-- Users profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 🔐 Part 4: Authentication Setup

### Enable Authentication Providers

In your Supabase dashboard:

1. **Go to Authentication → Providers**
2. **Enable desired providers:**
   - Email (enabled by default)
   - Google OAuth
   - GitHub OAuth
   - Apple OAuth (for iOS)

### Configure OAuth Redirects

For Expo apps, add these redirect URLs:
```
exp://localhost:19000/--/auth/callback
your-app-scheme://auth/callback
```

For web apps:
```
http://localhost:5173/auth/callback
https://your-domain.com/auth/callback
```

## 📦 Part 5: Storage Setup

### Create Storage Buckets

```sql
-- Create a bucket for user avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);

-- Create a bucket for app assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assets', 'assets', true);

-- Storage policies
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 🚀 Part 6: Real-time Features

### Enable Real-time

```typescript
// Subscribe to database changes
const { useSupabase } = require('./utils/supabase');
const { database } = useSupabase();

const subscription = database.subscribe('your_table', (payload) => {
  console.log('Change received!', payload);
});

// Unsubscribe when done
subscription.unsubscribe();
```

## 🔧 Part 7: Environment Configuration

### Development vs Production

#### Development (.env.local)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Production
- Use environment variables in your hosting platform
- For Expo: Use EAS Build secrets
- For Vercel: Add in project settings

## 📱 Part 8: Mobile-Specific Considerations

### Deep Linking for OAuth

Add to `app.json`:
```json
{
  "expo": {
    "scheme": "your-app-name",
    "web": {
      "bundler": "metro"
    }
  }
}
```

### Offline Support

The Supabase utility includes automatic offline support with AsyncStorage for:
- Authentication tokens
- Session persistence
- Cached data

## 🧪 Part 9: Testing

### Test Authentication Flow

```typescript
// Test sign up
const testSignUp = async () => {
  const { signUp } = useSupabaseAuth();
  const result = await signUp('test@example.com', 'password123', {
    full_name: 'Test User'
  });
  console.log('Sign up result:', result);
};

// Test database operations
const testDatabase = async () => {
  const { database } = useSupabase();
  const { data, error } = await database
    .table('profiles')
    .select('*')
    .limit(10);
  console.log('Database result:', data, error);
};
```

## 🚨 Security Best Practices

### 1. Row Level Security (RLS)
- Always enable RLS on tables with user data
- Create specific policies for each operation

### 2. API Keys
- Never expose service role key in client code
- Use environment variables for all keys
- Rotate keys regularly

### 3. Validation
- Validate all inputs on both client and server
- Use Supabase's built-in validation features

### 4. HTTPS Only
- Always use HTTPS in production
- Configure proper CORS settings

## 🎯 Quick Start Checklist

### Applaa Project Level:
- [ ] Enable Supabase handlers (✅ Done)
- [ ] Add Supabase credentials to Applaa settings
- [ ] Connect Supabase project to your app

### App Level (Web):
- [ ] Install `@supabase/supabase-js`
- [ ] Create Supabase client configuration
- [ ] Add environment variables
- [ ] Implement auth and database logic

### App Level (Expo):
- [ ] Use built-in Supabase utility (✅ Already included)
- [ ] Initialize Supabase in App.tsx
- [ ] Configure authentication providers
- [ ] Set up deep linking for OAuth

### Database:
- [ ] Create necessary tables
- [ ] Enable Row Level Security
- [ ] Set up authentication triggers
- [ ] Create storage buckets and policies

## 🆘 Troubleshooting

### Common Issues:

1. **"No handler registered for 'supabase:list-projects'"**
   - ✅ **Fixed!** Handlers are now enabled

2. **Authentication not persisting in Expo**
   - Ensure AsyncStorage is properly configured
   - Check that URL polyfill is imported

3. **CORS errors in web app**
   - Add your domain to Supabase CORS settings
   - Check that URLs match exactly

4. **OAuth not working in Expo**
   - Verify redirect URLs in Supabase dashboard
   - Ensure app scheme is configured correctly

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Expo Authentication Guide](https://docs.expo.dev/guides/authentication/)

---

🎉 **You're all set!** Your Applaa apps now have full Supabase integration for authentication, database, storage, and real-time features.






