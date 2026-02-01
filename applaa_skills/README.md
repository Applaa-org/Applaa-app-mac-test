# Applaa Skills

This folder contains reusable skills for AI agents working on the Applaa codebase. Each skill provides domain-specific knowledge, patterns, and fixes for common tasks.

---

## How It Works with AI Coding Tools (Read This First!)

> **Supported Tools:** Cursor, Antigravity, Windsurf, Claude, and other AI coding assistants.
> 
> **Note:** Configuration may vary by tool. Currently configured for Cursor (`.cursor/rules/skills.mdc`). 
> For other tools, add similar rules to their configuration system - see [Tool Configuration](#tool-configuration) below.

### Without Skills (Old Way - Wastes Tokens)

```
You: "Fix this error: sqlite-vec not found"

AI does:
1. Searches codebase for "sqlite-vec" (reads 20+ files) ← tokens
2. Tries installing package (wrong fix) ← tokens
3. Creates new config file (unnecessary) ← tokens
4. Searches more (still broken) ← tokens
5. Eventually finds the right fix ← more tokens
```

**Result:** 5000+ tokens, wrong files created, slow

---

### With Skills (New Way - Saves Tokens)

```
You: "Fix this error: sqlite-vec not found"

AI does:
1. Reads troubleshooting/SKILL.md (200 tokens) ← rule tells it to
2. Finds: "Add to vite.main.config.mts externals"
3. Reads native-module-externals/SKILL.md (300 tokens)
4. Edits ONE file with the exact fix
```

**Result:** ~500 tokens, no wrong files, fast

---

### What You Need to Do

#### When Asking AI to Fix Errors

Just paste the error and say:

> "Check the skills and fix this error: [paste error]"

or simply:

> "Fix this: [paste error]"

The tool's rule/config automatically tells AI to check skills first.

#### Alternatively, Be Explicit (Works with Any Tool)

> "Read applaa_skills/troubleshooting/SKILL.md and find the fix for this error: [paste error]"

This explicit approach works with **any AI coding tool** even without configuration.

---

### How It Prevents Bad Behavior

| Bad AI Behavior | How Skills Prevent It |
|-----------------|----------------------|
| Creating random new files | Skills say exactly which file to edit |
| Making assumptions | Skills provide proven, specific fixes |
| Searching entire codebase | Skills give direct path to solution |
| Trial-and-error fixes | Skills give the working fix first time |

---

### Summary

1. **Rule/Config tells AI** to check skills first (see [Tool Configuration](#tool-configuration))
2. **When error occurs** - AI reads troubleshooting skill → finds fix → applies it
3. **Saves tokens** - ~500 tokens vs ~5000+ tokens
4. **No bad files** - AI only edits what the skill says

---

## 🚨 MAIN GUIDE : Got an Error? Start Here!

**[troubleshooting](./troubleshooting/SKILL.md)** - ALWAYS check this skill first when any error occurs.

### For AI Agents (Cursor, Claude, etc.)
- Saves tokens by providing direct fixes
- No need to search codebase first
- Proven solutions, not trial-and-error

### For Human Developers
- Faster than Stack Overflow
- Specific to Applaa codebase
- Searchable with Ctrl+F

```
Error occurs → Open troubleshooting skill → Find error pattern → Follow linked skill → Apply fix
```

---

## Quick Reference

| Skill | Use When... |
|-------|-------------|
| [troubleshooting](#troubleshooting) | **ANY error occurs** (start here first!) |
| [native-module-externals](#native-module-externals) | Native module errors (sharp, sqlite-vec, better-sqlite3) |
| [ipc-handler-creation](#ipc-handler-creation) | Creating new IPC handlers |
| [react-hook-patterns](#react-hook-patterns) | Creating React hooks with TanStack Query |
| [database-schema](#database-schema) | Adding database tables or columns |
| [electron-packaging](#electron-packaging) | Build/packaging issues with Electron Forge |
| [blocklaa-apps](#blocklaa-apps) | Working with visual block-based apps |
| [minecraft-apps](#minecraft-apps) | Working with Minecraft Bedrock packs |
| [godot-games](#godot-games) | Working with Godot game projects |
| [webapp-apps](#webapp-apps) | Working with React/Next.js web apps |
| [expo-mobile-apps](#expo-mobile-apps) | Working with Expo React Native apps |

---

## Error Resolution (Start Here)

### troubleshooting
**The entry point for ALL errors.**

Use when:
- Any error message appears
- Something isn't working as expected
- You're not sure which skill to use

**What it does:**
- Maps error patterns to the correct skill
- Provides quick lookup tables by error type
- Links directly to the relevant fix

**Workflow:**
1. Error occurs
2. Open troubleshooting skill
3. Find matching error pattern in the tables
4. Click the linked skill
5. Follow the fix instructions

---

## Core Development Skills

### native-module-externals
**The most common recurring fix in Applaa.**

Use when encountering:
- "Native addon not found" errors
- "Extension not found" for sqlite-vec
- Module resolution errors for sharp, better-sqlite3, keytar, etc.
- Adding any new native Node.js module to the project

**What it covers:**
- Adding modules to `vite.main.config.mts` externals
- Adding modules to `forge.config.ts` asarUnpack
- Adding modules to the ignore function for packaging

---

### ipc-handler-creation
**Pattern for Electron IPC communication.**

Use when:
- Creating new backend functionality accessible from React
- Adding main-to-renderer communication
- Implementing features that need file system, database, or shell access

**What it covers:**
- Handler file structure (`src/ipc/handlers/`)
- Registration in `ipc_host.ts`
- Client methods in `ipc_client.ts`
- Preload allowlist in `preload.ts`
- Error handling with `throw new Error()` pattern
- Concurrency with `withLock()`

---

### react-hook-patterns
**TanStack Query integration for React hooks.**

Use when:
- Building UI features that fetch data from main process
- Implementing CRUD operations
- Managing loading/error states
- Creating reusable data-fetching logic

**What it covers:**
- `useQuery` for reads
- `useMutation` for writes
- Query invalidation patterns
- Jotai integration for global state
- Optimistic updates

---

### database-schema
**Drizzle ORM schema patterns.**

Use when:
- Adding new database tables
- Adding columns to existing tables
- Creating migrations
- Fixing "no such table" or "no such column" errors

**What it covers:**
- Schema definitions in `src/db/schema.ts`
- Migration generation with `drizzle-kit`
- Fallback schema in `ensureCoreTables()`
- Common column types and query patterns

---

### electron-packaging
**Electron Forge configuration and fixes.**

Use when:
- Build/packaging fails
- Packaged app crashes
- Files missing from production build
- Native modules don't work after packaging
- Code signing issues (macOS)

**What it covers:**
- `forge.config.ts` structure
- The `ignore()` function for including files
- `asarUnpack` for native modules
- macOS signing and notarization
- Symlink fixes for native modules

---

## App Type Skills

### blocklaa-apps
**Visual block-based programming (Google Blockly).**

Use when working with:
- The Blockly editor component
- Custom block definitions (K-5, K-7, K-9 blocks)
- Code generation (JavaScript, Python, etc.)
- The Appy AI assistant
- Workspace saving/loading

**Key files:**
- `src/components/blockly/BlocklyEditor.tsx`
- `src/components/blockly/blocks/`
- `src/ipc/handlers/blockly_handlers.ts`

---

### minecraft-apps
**Minecraft Bedrock Edition behavior packs.**

Use when working with:
- `.mcfunction` files
- Behavior pack structure
- The MinecraftModuleSpec system
- 3D preview rendering
- Template library

**Key files:**
- `minecraft-bedrock-templates/`
- `src/lib/minecraft/bedrock-pack-builder.ts`
- `src/ipc/handlers/minecraft_handlers.ts`

---

### godot-games
**Godot game development with AI.**

Use when working with:
- GameSpecification generation from prompts
- Godot project structure
- HTML5 export and preview
- Test game fallback (when Godot engine not available)

**Key files:**
- `src/godot/game_spec_generator.ts`
- `src/godot/godot_project_generator.ts`
- `src/ipc/handlers/godot_handlers.ts`

---

### webapp-apps
**React and Next.js web applications.**

Use when working with:
- Webapp templates (React/Vite, Next.js)
- Shadcn UI components
- TanStack Router (React) or App Router (Next.js)
- Unified preview system
- Build and deployment

**Key files:**
- `webapp-templates/react/`
- `webapp-templates/nextjs/`
- `src/preview/UnifiedPreviewManager.ts`

---

### expo-mobile-apps
**Expo React Native mobile applications.**

Use when working with:
- Expo Router navigation
- Mobile app preview/sandbox
- Metro bundler issues
- Pre-installed dependencies

**Critical warnings:**
- ❌ **Never use AsyncStorage** unless explicitly requested (not pre-installed)
- ❌ **No web patterns** (div, className, onClick)
- ✅ Use only pre-installed packages
- ✅ Use React Native components (View, Text, TouchableOpacity)

**Key files:**
- `expo-templates/base-router/`
- `src/ipc/handlers/expo_handlers.ts`
- `src/prompts/expo_system_prompt.ts`

---

## Utility

### skill-creator
**Tool for creating new skills.**

Use when:
- Creating a new skill
- Understanding skill structure
- Packaging skills for distribution

Contains scripts: `init_skill.py`, `package_skill.py`, `quick_validate.py`

---

## How to Use Skills

1. **Read the skill** when starting a relevant task
2. **Follow the patterns** and checklists provided
3. **Check common issues** tables for troubleshooting

Skills are designed to be read by AI agents but are also useful as human reference documentation.

---

## Tool Configuration

Configuration files that tell AI tools to check skills first.

### Cursor ✅ (Configured)

**File:** `.cursor/rules/skills.mdc`

Already set up. Cursor will automatically check skills when errors occur.

---

### Antigravity 🔜 (Placeholder)

**File:** `TBD - add when Antigravity rules system is known`

```
# Placeholder - update when Antigravity configuration is available
# Should instruct AI to read applaa_skills/troubleshooting/SKILL.md first
```

---

### Windsurf 🔜 (Placeholder)

**File:** `TBD - add when Windsurf rules system is known`

```
# Placeholder - update when Windsurf configuration is available
# Should instruct AI to read applaa_skills/troubleshooting/SKILL.md first
```

---

### Other AI Tools (Manual)

For any AI coding tool without a rules system, just be explicit in your prompt:

> "First read applaa_skills/troubleshooting/SKILL.md, find the error pattern, then follow the linked skill to fix: [paste error]"

---

### Adding New Tool Configuration

When adding support for a new AI tool:

1. Find the tool's rules/config file location
2. Add instruction to check `applaa_skills/troubleshooting/SKILL.md` first on errors
3. Add instruction to follow linked skills for fixes
4. Update this section with the configuration
