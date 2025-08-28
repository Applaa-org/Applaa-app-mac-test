# 🍊 Applaa Merge Master Documentation

## Overview
This document tracks all customizations made to the Dyad codebase to create Applaa. Use this guide when merging upstream updates from the original Dyad repository.

## 📁 Folder Structure
```
merge-applaa/
├── src/           # Customized source files
├── assets/        # Applaa-specific assets (logos, icons)
├── expo-templates/ # Expo mobile app templates
└── docs/          # This documentation
```

## 🎯 Core Customizations

### 1. **BRANDING CHANGES**

#### `package.json`
- **Change**: Rebranded from "dyad" to "applaa"
- **Details**:
  - `name`: "dyad" → "applaa"
  - `productName`: "Dyad" → "Applaa"
  - `version`: "1.0.0"
  - `description`: "Applaa - Your local AI app builder with beautiful orange and green design"
  - `repository.url`: Updated to Applaa GitHub repo

#### `src/app/TitleBar.tsx`
- **Change**: Logo and branding updates
- **Details**:
  - Logo import: `../../assets/applaa-logo.svg`
  - Added "Applaa" text next to logo
  - Alt text: "Dyad Logo" → "Applaa Logo"

#### `assets/`
- **Change**: Replaced all Dyad branding assets
- **Files**:
  - `applaa-logo.svg` - Main Applaa logo
  - `icon/logo.png` - Application icon
  - `icon/logo.ico` - Windows icon

### 2. **COLOR THEME CHANGES**

#### `src/styles/globals.css`
- **Change**: Applaa color scheme implementation
- **Details**:
  - `--primary`: Orange theme (oklch(0.65 0.18 45))
  - `--secondary-brand`: Green theme (oklch(0.55 0.15 140))
  - `--accent`: Green accent (oklch(0.55 0.15 140))

### 3. **UI TEXT UPDATES**

#### Multiple Components - "Dyad" → "Applaa" Text Replacements:
- `src/components/ContextFilesPicker.tsx`
  - Context usage messages
- `src/components/chat/LexicalChatInput.tsx`
  - Placeholder text: "Ask Dyad to build..." → "Ask Applaa to build..."
- `src/components/chat/ChatInput.tsx`
  - Main chat input branding
- `src/components/HelpDialog.tsx`
  - Help dialog title and URLs
- `src/components/ErrorBoundary.tsx`
  - Error messages and GitHub issue links
- `src/components/TelemetryBanner.tsx`
  - Telemetry consent text

### 4. **SPARK FEATURES REBRANDING**

#### `src/components/SparkModeSelector.tsx`
- **Change**: Unified Spark branding for efficiency features
- **Details**:
  - "Turbo Edits" → "Spark Edits"
  - "Smart Context" → "Spark Context"
  - Function names updated: `toggleSparkEdits`, `toggleSparkContext`
  - HTML IDs updated: `spark-edits`, `spark-context`

#### `src/components/ProModeSelector.tsx`
- **Change**: Pro mode Spark feature labels
- **Details**:
  - Updated labels to use "Spark Edits" and "Spark Context"
  - "Dyad Pro" → "Applaa Pro" references

#### `src/components/chat/PromoMessage.tsx`
- **Change**: Promotional message updates
- **Details**:
  - "Get Dyad Pro" → "Get Applaa Pro"
  - Feature names updated to Spark branding

### 5. **UI COMPONENT ENHANCEMENTS**

#### `src/components/ChatModeSelector.tsx`
- **Change**: Added gradient styling and icons
- **Details**:
  - Orange gradient for "build" mode
  - Green gradient for "ask" mode
  - Added Hammer and MessageCircleQuestion icons

#### `src/components/ModelPicker.tsx`
- **Change**: Visual enhancements and branding
- **Details**:
  - Blue gradient styling
  - Brain icon addition
  - "Dyad Pro" → "Applaa Pro" text

#### `src/components/ChatInputControls.tsx`
- **Change**: Layout reorganization and Pro mode hiding
- **Details**:
  - Hidden ProModeSelector for MVP
  - Added SparkModeSelector
  - Conditional rendering props

### 6. **NEW FEATURES ADDED**

#### Mobile App Support (Phase 2)
- **Files**:
  - `src/components/expo/MobilePreview.tsx` - Expo preview component
  - `src/ipc/handlers/expo_handlers.ts` - Expo server management
  - `src/components/PlatformSelector.tsx` - Web/Mobile selection
  - `src/components/AppTypeSelector.tsx` - App type selection UI
  - `src/lib/appTypeDetector.ts` - Smart app type detection

#### Expo Templates
- **Change**: Added Expo mobile app templates
- **Details**:
  - `expo-templates/expo-base-master/` - Base mobile app template
  - Updated `src/shared/templates.ts` to include Expo template
  - Template title: "Expo Mobile App" → "Mobile Template"
  - Fixed broken image URL with local SVG: `/assets/mobile-template-icon.svg`
  - Updated `src/ipc/handlers/createFromTemplate.ts` to handle local expo-base-master template

### 7. **SETTINGS & SCHEMAS**

#### `src/lib/schemas.ts`
- **Change**: Added Spark feature settings
- **Details**:
  - `enableSparkEditsMode: z.boolean().optional()`
  - `enableSparkContextMode: z.boolean().optional()`

#### `src/main/settings.ts`
- **Change**: Default Spark features enabled
- **Details**:
  - `enableSparkEditsMode: true`
  - `enableSparkContextMode: true`

### 8. **IPC SYSTEM UPDATES**

#### `src/ipc/ipc_client.ts`
- **Change**: Added Expo-related IPC methods
- **Details**:
  - `expoStart`, `expoStop`, `expoStatus` methods

#### `src/preload.ts`
- **Change**: Added Expo IPC channels
- **Details**:
  - "expo:start", "expo:stop", "expo:status"

### 9. **LATEST IMPROVEMENTS (January 2025)**

#### `src/prompts/expo_system_prompt.ts` - Major Enhancement
- **Change**: Added comprehensive error prevention and UI guidance
- **Details**:
  - **Icon Import Rules**: Fixed Lucide vs @expo/vector-icons type conflicts
  - **Type Safety Rules**: Prevent implicit-any errors in FlatList and tab icons
  - **Critical Routing Rules**: Prevent "Unmatched Route" errors with mandatory file structure checks
  - **Enhanced Design Guidelines**: Added stunning UI requirements with color psychology by app type
  - **Safe Tab Creation**: Step-by-step rules to avoid broken navigation

#### `src/components/expo/SimpleMobilePreview.tsx` - UI Improvements
- **Change**: Fixed preview sizing and enhanced user experience
- **Details**:
  - Increased device frame dimensions (420px width, 800px height for phones)
  - Added 60% zoom option, default 75% zoom
  - Improved iframe positioning with `absolute inset-0 w-full h-full`
  - Enhanced QR code panel and device selection controls

#### `src/components/chat/MessagesList.tsx` - Dyad Banner Removal
- **Change**: Hidden "Dyad Banners" as requested
- **Details**:
  - Commented out PromoMessage component import and rendering
  - Clean chat experience without promotional banners

#### `src/hooks/useStreamChat.ts` - Auto Preview Refresh
- **Change**: Automatic preview refresh after every LLM response
- **Details**:
  - Always calls `refreshAppIframe()` in onEnd handler
  - Users no longer need to manually refresh preview
  - Improves workflow efficiency significantly

## 🔄 **Merge Strategy**

### When Merging Upstream Updates:

1. **Backup Current State**:
   ```bash
   cp -r src/ merge-applaa/src-backup-$(date +%Y%m%d)/
   ```

2. **Apply Branding Changes**:
   - Run branding replacement script
   - Update color themes
   - Replace assets

3. **Merge New Features**:
   - Carefully merge mobile preview components
   - Update IPC handlers
   - Add Spark features

4. **Test Integration**:
   - Verify all Applaa features work
   - Test mobile preview functionality
   - Validate UI theming

### Files That Should NEVER Be Overwritten:
- `assets/applaa-logo.svg`
- `assets/icon/logo.png`
- `assets/icon/logo.ico`
- `expo-templates/expo-base-master/`
- `src/components/expo/`
- `src/components/SparkModeSelector.tsx`

### Files Requiring Careful Merge:
- `package.json` - Preserve Applaa metadata
- `src/styles/globals.css` - Preserve color themes
- `src/components/ChatInputControls.tsx` - Preserve layout changes
- `src/lib/schemas.ts` - Preserve Spark settings
- `src/main/settings.ts` - Preserve default Spark values

## 🛠️ **Automation Scripts**

### Planned Scripts:
1. `merge-branding.ps1` - Automated branding replacement
2. `merge-features.ps1` - Feature integration script
3. `validate-merge.ps1` - Post-merge validation
4. `backup-current.ps1` - Create backup before merge

---

**Last Updated**: January 17, 2025
**Applaa Version**: 1.1.0 
**Based on Dyad**: Latest upstream version at time of fork

## 🎯 **Recent Major Updates**
- **TypeScript Error Prevention**: Fixed 22+ common build errors before they happen
- **Routing Error Prevention**: Eliminated "Unmatched Route" errors with mandatory file structure rules  
- **Stunning UI Guidelines**: Enhanced design requirements for impressive, modern mobile apps
- **Auto-Preview Refresh**: No more manual refresh button clicks after LLM responses
- **UI Polish**: Fixed mobile preview sizing, hidden promotional banners
