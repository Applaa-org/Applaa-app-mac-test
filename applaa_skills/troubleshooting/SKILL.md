---
name: troubleshooting
description: ALWAYS check this skill FIRST when ANY error occurs. For AI agents - saves tokens by providing direct fixes instead of searching. For humans - quick reference to fix errors without Stack Overflow. Maps error patterns to specific skills with step-by-step solutions.
---

# Troubleshooting Guide

**Your first stop when any error occurs - for AI agents AND human developers.**

---

## For AI Agents (Cursor, Claude, etc.)

**WHEN AN ERROR OCCURS:**

1. **DO NOT** start searching the codebase immediately
2. **DO NOT** try random fixes
3. **FIRST** search this document for the error pattern
4. **THEN** read the linked skill for the exact fix
5. **APPLY** the fix directly

**WHY:** Saves tokens, avoids trial-and-error, provides proven fixes.

---

## For Human Developers

**WHEN AN ERROR OCCURS:**

1. Open this file
2. Press `Ctrl+F` / `Cmd+F`
3. Search for keywords from your error
4. Click the linked skill
5. Follow the step-by-step fix

**WHY:** Faster than Stack Overflow, specific to Applaa codebase, proven fixes.

---

## Quick Lookup Process

```
ERROR MESSAGE → Search this doc → Find matching pattern → Read linked skill → Apply fix
```

**Example:**
- Error: `Loadable extension for sqlite-vec not found`
- Search: "sqlite-vec" in this document
- Find: Native Module Errors → native-module-externals
- Fix: Add `"sqlite-vec"` and `/^sqlite-vec-/` to `vite.main.config.mts` externals
- Done in 1 step, no searching needed

---

# Error Lookup Tables

## Native Module Errors → [native-module-externals](../native-module-externals/SKILL.md)

**When you see errors about native modules not loading:**

| Error Pattern | Cause | Quick Fix |
|---------------|-------|-----------|
| `Loadable extension for sqlite-vec not found` | sqlite-vec not in Vite externals | Add to `vite.main.config.mts` |
| `sharp: Cannot find module` | sharp not in Vite externals | Add to `vite.main.config.mts` |
| `better-sqlite3: Cannot find module` | better-sqlite3 not external | Add to externals |
| `Native addon not found` | Native module bundled incorrectly | Add to externals + asarUnpack |
| `Could not locate the bindings file` | Module path resolution broken | Add to externals |
| `Module did not self-register` | Architecture mismatch | Rebuild native modules |

---

## IPC Errors → [ipc-handler-creation](../ipc-handler-creation/SKILL.md)

**When React can't talk to the main process:**

| Error Pattern | Cause | Quick Fix |
|---------------|-------|-----------|
| `Error invoking remote method` | Channel not in preload | Add to `preload.ts` |
| `An object could not be cloned` | Non-serializable data | Return plain objects only |
| `No handler registered for` | Missing handler | Add to `ipc_host.ts` |
| `IpcClient is not defined` | Preload not loaded | Check preload setup |

---

## Database Errors → [database-schema](../database-schema/SKILL.md)

**When database queries fail:**

| Error Pattern | Cause | Quick Fix |
|---------------|-------|-----------|
| `no such table: tablename` | Table doesn't exist | Add to `schema.ts` + migrate |
| `no such column: columnname` | Column missing | Add column + migrate |
| `FOREIGN KEY constraint failed` | Parent doesn't exist | Check references |
| `UNIQUE constraint failed` | Duplicate value | Check uniqueness |
| `database is locked` | Concurrent writes | Use `withLock()` |

---

## Build/Packaging Errors → [electron-packaging](../electron-packaging/SKILL.md)

**When `npm run make` fails or packaged app crashes:**

| Error Pattern | Cause | Quick Fix |
|---------------|-------|-----------|
| `Cannot find module` (packaged) | File not included | Add to `forge.config.ts` ignore |
| `App is damaged` (macOS) | Signing issue | Check notarization |
| `ASAR: Cannot open` | Archive corrupted | Rebuild |
| Symlink errors | pnpm symlinks | Fix in prePackage hook |
| `forge make` hangs | Rebuild stuck | Check native modules |

---

## React/Hook Errors → [react-hook-patterns](../react-hook-patterns/SKILL.md)

**When UI components break:**

| Error Pattern | Cause | Quick Fix |
|---------------|-------|-----------|
| `Cannot read properties of undefined` | Data not loaded | Add loading state |
| `Too many re-renders` | Infinite loop | Check useEffect deps |
| `Invalid hook call` | Conditional hook | Move hook to top level |
| Stale data after mutation | No invalidation | Add `invalidateQueries()` |

---

## Expo/Mobile Errors → [expo-mobile-apps](../expo-mobile-apps/SKILL.md)

**When mobile preview fails:**

| Error Pattern | Cause | Quick Fix |
|---------------|-------|-----------|
| `Unable to resolve module` | Not installed | Install with `expo install` |
| `AsyncStorage is not defined` | Not pre-installed | **Don't use AsyncStorage!** |
| `className is not valid` | Web patterns | Use `style={}` not `className` |
| Metro bundler stuck | Cache issue | Run `expo:reset` |
| `Text strings must be wrapped` | Missing `<Text>` | Wrap text in `<Text>` |

---

## Webapp Preview Errors → [webapp-apps](../webapp-apps/SKILL.md)

**When web app preview doesn't work:**

| Error Pattern | Cause | Quick Fix |
|---------------|-------|-----------|
| Preview not starting | Port in use | Kill process on port 3000 |
| `ENOENT: package.json` | Wrong directory | Check app path |
| Hot reload broken | Vite cache | Delete `.vite` folder |
| TypeScript build fails | Type errors | Fix types |

---

## Minecraft Errors → [minecraft-apps](../minecraft-apps/SKILL.md)

| Error Pattern | Cause | Quick Fix |
|---------------|-------|-----------|
| Pack not loading | Invalid manifest | Check UUIDs are unique |
| Functions not running | Missing tick.json | Add to functions folder |
| 3D preview empty | Bad bounds | Check applaa.preview.json |

---

## Godot Errors → [godot-games](../godot-games/SKILL.md)

| Error Pattern | Cause | Quick Fix |
|---------------|-------|-----------|
| No preview | Godot not installed | Uses HTML5 fallback |
| Export fails | No template | Install Godot export |
| Game blank | Bad spec | Check game_spec.json |

---

## Blocklaa Errors → [blocklaa-apps](../blocklaa-apps/SKILL.md)

| Error Pattern | Cause | Quick Fix |
|---------------|-------|-----------|
| Blocks not showing | Not registered | Add to CustomBlocks.ts |
| No code generated | Missing generator | Add `Blockly.JavaScript.forBlock` |
| Won't save | IPC error | Check blockly_handlers.ts |

---

# Still Stuck?

## Identify the error source

| Error Location | Likely Category |
|----------------|-----------------|
| `src/main.ts`, `src/ipc/` | IPC or native module |
| `src/components/`, `src/pages/` | React hooks |
| `src/db/` | Database schema |
| `.vite/`, `out/` | Packaging |
| `apps/` folder | App type specific |

## Prevention Checklist

Before adding new features, check the relevant skill:

| Adding... | Check this skill first |
|-----------|----------------------|
| Native module (npm package with `.node` files) | native-module-externals |
| New IPC channel | ipc-handler-creation |
| Database table/column | database-schema |
| React hook | react-hook-patterns |
| App type feature | Relevant app type skill |
