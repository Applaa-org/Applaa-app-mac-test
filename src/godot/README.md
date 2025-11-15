# Godot Engine Integration

Complete system for generating, building, and previewing Godot games in Applaa.

## Quick Start

```typescript
// 1. Generate game spec from prompt
const spec = await generateGameSpecification("Create a 2D platformer");

// 2. Generate Godot project
await generateGodotProject({
  appPath: "/path/to/app",
  spec,
  regenerateAssets: false
});

// 3. Export to HTML5
const result = await exportGodotToHTML5({
  projectPath: "/path/to/godot-project",
  exportPath: "/path/to/godot-web-export",
  projectName: "My Game"
});

// 4. Preview in Electron iframe
// Server auto-starts on localhost:9000+
```

## Components

### `game_spec_schema.ts`
TypeScript types for game specifications. Defines the structure of `game_spec.json`.

### `godot_project_generator.ts`
Converts `game_spec.json` into a complete Godot project:
- Generates `project.godot`
- Creates scene files (`.tscn`)
- Generates GDScript files
- Handles assets

### `godot_exporter.ts`
Exports Godot projects to HTML5/WebAssembly:
- Detects Godot engine
- Creates export presets
- Runs export commands
- Verifies output

### `godot_loader_template.ts`
Generates the Loader system:
- `Loader.tscn` - Entry scene
- `Loader.gd` - Dynamic game constructor

### `scene_generators/`
Utilities for generating 2D and 3D scenes:
- `scene_2d_generator.ts` - 2D scene helpers
- `scene_3d_generator.ts` - 3D scene helpers

## File Structure

```
godot/
├── game_spec_schema.ts          # Type definitions
├── game_spec_generator.ts       # AI → JSON (existing)
├── godot_project_generator.ts   # JSON → Project
├── godot_exporter.ts            # Project → HTML5
├── godot_loader_template.ts     # Loader generator
├── godot_builder.ts             # Legacy builder (existing)
└── scene_generators/
    ├── scene_2d_generator.ts
    └── scene_3d_generator.ts
```

## Usage

See the main documentation:
- `docs/GODOT_INTEGRATION_ARCHITECTURE.md` - Architecture overview
- `docs/GODOT_INTEGRATION_GUIDE.md` - Implementation guide
- `docs/GODOT_QUICK_REFERENCE.md` - Quick reference
- `docs/GODOT_IMPLEMENTATION_SUMMARY.md` - Complete summary

## Requirements

- Godot 4.x (optional - falls back to test game if not found)
- Node.js 18+
- Electron (for preview)

## Notes

- Works with or without Godot installed
- Exports are cached for performance
- Supports 2D and 3D games
- Dynamic game construction via Loader system

