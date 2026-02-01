---
name: expo-mobile-apps
description: Work with Expo React Native mobile apps in Applaa. Use when creating mobile apps, debugging Expo preview/sandbox issues, working with pre-installed dependencies, or handling Metro bundler. Critical for avoiding AsyncStorage and web pattern mistakes.
---

# Expo Mobile Apps

React Native mobile development with Expo sandbox.

## Architecture

```
Template → Feature Selection → Expo App → Metro Bundler → Web Preview (sandbox)
```

**Key Files:**
- `src/ipc/handlers/expo_handlers.ts` - Dev server management
- `src/ipc/handlers/sandbox_metro_handlers.ts` - Sandbox preview
- `src/prompts/expo_system_prompt.ts` - LLM guidance
- `expo-templates/` - Base templates and features

## CRITICAL: Pre-installed Packages Only

**Allowed (pre-installed):**
```
expo, expo-router, react, react-native
@expo/vector-icons, expo-status-bar
react-native-safe-area-context, react-native-screens
```

**FORBIDDEN by default (not installed):**
```
❌ @react-native-async-storage/async-storage
❌ utils/storage.ts (don't create this!)
❌ Any web patterns (div, className, onClick)
```

## App Structure

```
apps/{appName}/
├── app/                    # Expo Router pages
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Home screen
│   └── +not-found.tsx      # 404 page
├── components/
├── hooks/
├── package.json
├── app.json                # Expo config
├── metro.config.js
└── tsconfig.json
```

## Template System

**Base Template:** `expo-templates/base-router/`
- Expo SDK 54
- Expo Router
- TypeScript

**Features:** `expo-templates/features/`
| Feature | What it adds |
|---------|-------------|
| auth | Authentication flow |
| camera | Camera access |
| location | GPS/location |
| notifications | Push notifications |
| offline-storage | AsyncStorage (when explicitly requested) |
| supabase | Supabase client |
| superdesign-ui | UI components |

## IPC Handlers

```typescript
// Start Expo dev server
"expo:start" → { url, webUrl, status }

// Stop server
"expo:stop" → { success }

// Health check
"expo:health-check" → { healthy, bundlerReady }

// Trigger hot reload
"expo:trigger-reload" → { success }

// Reset stuck state
"expo:reset" → { success }
```

**Sandbox Metro:**
```typescript
// OS-independent preview
"sandbox-metro:start" → { url, port }
```

## Preview System

**Expo CLI Preview:**
- Uses `npx expo start --web --lan`
- Web URL for iframe preview
- LAN URL for QR codes (physical devices)
- Ports: 8081-8200

**Pre-Preview Validation:**
- Package.json exists
- Dependencies installed
- TypeScript compiles
- No syntax errors

## System Prompt Rules

When AI generates Expo code:

1. **Always replace `app/index.tsx` first** - Remove template content
2. **Never use AsyncStorage** unless explicitly requested
3. **No web patterns** - Use React Native components only
4. **Mobile-first UI** - Touch targets, safe areas
5. **Platform checks** - `Platform.OS === 'web'` for web-safe code

## React Native vs Web Patterns

| Web (Wrong) | React Native (Correct) |
|-------------|----------------------|
| `<div>` | `<View>` |
| `<span>` | `<Text>` |
| `<img>` | `<Image>` |
| `className=""` | `style={}` |
| `onClick` | `onPress` |
| `onChange` | `onChangeText` |

## Common Components

```tsx
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Safe area wrapper
<SafeAreaView style={{ flex: 1 }}>
  <ScrollView>
    <Text>Hello Mobile</Text>
  </ScrollView>
</SafeAreaView>

// Navigation
<Link href="/details">Go to Details</Link>

// Icons
<Ionicons name="home" size={24} color="black" />
```

## Expo Router Navigation

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="details" options={{ title: 'Details' }} />
    </Stack>
  );
}

// app/index.tsx
import { Link } from 'expo-router';

export default function Home() {
  return (
    <View>
      <Link href="/details">Go to Details</Link>
    </View>
  );
}
```

## Dependency Installation

When new packages needed:

```typescript
// ExpoDependencyManager.ts handles:
1. Use `expo install` for Expo packages
2. Fall back to `npm install --legacy-peer-deps`
3. Validate Expo compatibility
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "Cannot find module" | Package not installed | Add to feature or install |
| AsyncStorage error | Not pre-installed | Request `offline-storage` feature |
| Preview blank | Metro not bundling | Check terminal for errors |
| Web patterns used | Wrong components | Use RN components only |
| Hot reload broken | Metro cache | `expo:reset` or restart |
| Port conflict | Previous server | `expo:stop` first |

## App Repair

`ExpoAppRepairer.ts` auto-fixes:
- Missing metro.config.js
- Dependency issues
- Structure problems

## Platform-Specific Code

```tsx
import { Platform } from 'react-native';

// Web-safe pattern
const styles = StyleSheet.create({
  container: {
    padding: Platform.OS === 'web' ? 20 : 16,
  },
});

// Platform-specific components
{Platform.OS !== 'web' && <NativeOnlyComponent />}
```
