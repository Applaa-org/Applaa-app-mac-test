---
name: minecraft-apps
description: Work with Minecraft Bedrock behavior packs in Applaa. Use when creating mcfunction files, building behavior packs, working with Minecraft templates, debugging pack structure, or using the 3D preview system. Supports Bedrock Edition addons.
---

# Minecraft Apps

Minecraft Bedrock Edition behavior pack development.

## Architecture

```
User Prompt → MinecraftModuleSpec → BedrockPackBuilder → Behavior Pack → Preview
```

**Key Files:**
- `src/ipc/handlers/minecraft_handlers.ts` - Main IPC handlers
- `src/lib/minecraft/bedrock-pack-builder.ts` - Pack compiler
- `src/lib/minecraft/minecraft-module-spec.ts` - Spec types
- `minecraft-bedrock-templates/` - 500+ template library

## Behavior Pack Structure

```
apps/{appName}/behavior_pack/
├── manifest.json           # Pack metadata with UUIDs
├── pack_icon.png           # 256x256 icon
├── functions/
│   ├── main.mcfunction     # Entry function
│   ├── tick.json           # Auto-run config
│   └── *.mcfunction        # Other functions
├── applaa.preview.json     # 3D preview contract
└── README.md               # Documentation
```

## manifest.json Format

```json
{
  "format_version": 2,
  "header": {
    "name": "My Pack",
    "description": "Created with Applaa",
    "uuid": "auto-generated",
    "version": [1, 0, 0],
    "min_engine_version": [1, 20, 0]
  },
  "modules": [{
    "type": "data",
    "uuid": "auto-generated",
    "version": [1, 0, 0]
  }]
}
```

## mcfunction Syntax

```mcfunction
# Comments start with #
say Hello World                           # Chat message
setblock ~0 ~1 ~0 minecraft:stone        # Place block
fill ~0 ~0 ~0 ~5 ~5 ~5 minecraft:brick   # Fill area
give @p diamond_sword 1                   # Give item
tp @p ~0 ~10 ~0                          # Teleport
execute as @a run say Hi                  # Execute as all
```

**Coordinate Reference:**
- `~` - Relative to execution point
- `^` - Relative to facing direction
- Absolute numbers for world coordinates

## MinecraftModuleSpec

AI generates this spec, then `BedrockPackBuilder` compiles it:

```typescript
interface MinecraftModuleSpec {
  moduleType: "behavior_pack";
  name: string;
  description: string;
  version: string;
  entryFunction: string;
  files: Array<{
    path: string;      // e.g., "functions/build.mcfunction"
    content: string;   // File contents
  }>;
  preview: {
    bounds: { min: [x,y,z], max: [x,y,z] };
    cameraPosition: [x,y,z];
  };
}
```

## IPC Handlers

```typescript
// Generate spec from prompt
"generate-module-spec" → MinecraftModuleSpec

// Build pack from spec
"build-bedrock-pack" → { success, path, files }

// Save pack files
"save-pack-files" → { success }

// Generate 3D preview
"generate-preview" → { previewData }
```

## Template Library

Templates in `minecraft-bedrock-templates/`:

| Category | Examples |
|----------|----------|
| Starter | hello_world, quick_shelter |
| Buildings | castles/, houses/ |
| Gameplay | parkour/, powers/ |
| Creatures | mobs/, farming/ |

Each template: `.mcfunction` + `_manifest.json` + `_tick.json`

## 3D Preview System

`MinecraftPreviewEngine.ts` parses mcfunction → renders blocks in Three.js

**Preview Contract** (`applaa.preview.json`):
```json
{
  "bounds": {
    "min": [-5, 0, -5],
    "max": [5, 10, 5]
  },
  "cameraPosition": [10, 15, 10]
}
```

## Common Commands

```mcfunction
# Building
setblock ~X ~Y ~Z minecraft:BLOCK
fill ~X1 ~Y1 ~Z1 ~X2 ~Y2 ~Z2 minecraft:BLOCK

# Players
give @p ITEM COUNT
effect @p EFFECT DURATION LEVEL
tp @p X Y Z

# Messages
say MESSAGE
tellraw @a {"rawtext":[{"text":"MESSAGE"}]}

# Execution
execute as @SELECTOR run COMMAND
execute at @SELECTOR run COMMAND
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Pack not loading | Invalid manifest.json | Check UUIDs are unique |
| Functions not running | Missing tick.json | Add to functions/tick.json |
| Preview blank | Invalid coordinates | Check bounds in preview contract |
| Blocks not placing | Wrong block ID | Use `minecraft:` prefix |
