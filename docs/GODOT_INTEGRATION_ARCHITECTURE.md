# Godot Engine Integration Architecture

## Overview

This document describes the complete architecture for integrating Godot Engine game previewing into Applaa.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         APPLAA ELECTRON APP                      │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   User Chat  │───▶│  AI Prompt   │───▶│ Game Spec    │      │
│  │   Interface  │    │  Processor   │    │  Generator   │      │
│  └──────────────┘    └──────────────┘    └──────┬───────┘      │
│                                                   │              │
│  ┌───────────────────────────────────────────────▼──────────┐   │
│  │         Godot Project Generator (Main Process)           │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ 1. Parse game_spec.json                          │   │   │
│  │  │ 2. Generate project.godot                        │   │   │
│  │  │ 3. Create scenes (.tscn files)                   │   │   │
│  │  │ 4. Generate GDScript files                       │   │   │
│  │  │ 5. Copy/Generate assets                          │   │   │
│  │  │ 6. Create Loader.tscn (entry point)              │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                   │              │
│  ┌───────────────────────────────────────────────▼──────────┐   │
│  │      Godot HTML5 Exporter (Main Process)                 │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ 1. Detect Godot engine                           │   │   │
│  │  │ 2. Run: godot --headless --export-release Web    │   │   │
│  │  │ 3. Output: index.html, .wasm, .js, .pck          │   │   │
│  │  │ 4. Cache export in godot-web-export/             │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                   │              │
│  ┌───────────────────────────────────────────────▼──────────┐   │
│  │      HTTP Server (Main Process)                          │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ 1. Serve godot-web-export/ on localhost:9000+    │   │   │
│  │  │ 2. Handle CORS headers                            │   │   │
│  │  │ 3. Serve .wasm, .js, .pck files                   │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                   │              │
│  ┌───────────────────────────────────────────────▼──────────┐   │
│  │      Preview Panel (Renderer Process)                    │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ <iframe src="http://localhost:9000/index.html">  │   │   │
│  │  │   └─▶ Godot HTML5 Game (WebAssembly)             │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **User Input** → AI processes prompt → Generates `game_spec.json`
2. **Game Spec** → Godot Project Generator → Creates full Godot project
3. **Godot Project** → Godot CLI Export → HTML5 build files
4. **HTML5 Build** → HTTP Server → Served on localhost
5. **Preview Panel** → iframe loads → Game runs in Electron

## Directory Structure

```
applaa-app/
├── src/
│   ├── godot/
│   │   ├── game_spec_generator.ts          # AI → JSON converter
│   │   ├── godot_project_generator.ts      # JSON → Godot project
│   │   ├── godot_exporter.ts               # Project → HTML5 export
│   │   ├── godot_loader_template.ts        # Loader.tscn generator
│   │   ├── scene_generators/
│   │   │   ├── scene_2d_generator.ts       # 2D scene generation
│   │   │   ├── scene_3d_generator.ts       # 3D scene generation
│   │   │   └── asset_generator.ts          # Asset generation
│   │   └── templates/
│   │       ├── project.godot.template      # Godot project template
│   │       ├── loader.gd.template          # Loader script template
│   │       └── scene_templates/            # Scene templates
│   ├── ipc/
│   │   └── handlers/
│   │       └── godot_handlers.ts           # IPC handlers (enhanced)
│   └── components/
│       └── preview_panel/
│           └── PreviewPanel.tsx            # Preview UI (enhanced)
│
└── apps/
    └── {app-id}/
        ├── godot-project/                  # Generated Godot project
        │   ├── project.godot
        │   ├── game_spec.json
        │   ├── Loader.tscn                 # Entry scene
        │   ├── Loader.gd                   # Loader script
        │   ├── scenes/                     # Generated scenes
        │   │   ├── Main2D.tscn
        │   │   ├── Main3D.tscn
        │   │   └── ...
        │   ├── scripts/                    # Generated scripts
        │   │   ├── Player.gd
        │   │   ├── Enemy.gd
        │   │   └── ...
        │   └── assets/                     # Assets
        │       ├── sprites/
        │       ├── models/
        │       └── audio/
        └── godot-web-export/               # HTML5 export output
            ├── index.html
            ├── game.wasm
            ├── game.js
            └── game.pck
```

## Key Components

### 1. Game Specification JSON Schema

The `game_spec.json` defines the complete game structure:

```json
{
  "game": {
    "name": "My Game",
    "type": "2D" | "3D",
    "description": "..."
  },
  "scenes": [
    {
      "name": "Main",
      "type": "2D" | "3D",
      "nodes": [...],
      "scripts": [...],
      "physics": {...}
    }
  ],
  "assets": {
    "sprites": [...],
    "models": [...],
    "audio": [...]
  },
  "settings": {
    "window": {...},
    "physics": {...},
    "rendering": {...}
  }
}
```

### 2. Godot Project Generator

Converts JSON spec into a complete Godot project:
- Generates `project.godot` with all settings
- Creates scene files (`.tscn`) from JSON
- Generates GDScript files
- Handles asset placement

### 3. Godot Loader System

A special `Loader.tscn` scene that:
- Reads `game_spec.json` at runtime
- Dynamically constructs the game
- Handles scene instantiation
- Manages game state

### 4. Export Automation

Automated HTML5 export using Godot CLI:
- Detects Godot engine
- Runs headless export
- Handles export templates
- Caches exports

### 5. Preview Integration

Electron preview system:
- HTTP server for local files
- iframe loading
- CORS handling
- Auto-reload on changes

## Security Considerations

1. **Sandboxing**: iframe sandbox attributes
2. **CORS**: Proper headers for local files
3. **Path Traversal**: Validate all file paths
4. **Resource Limits**: Memory/CPU limits for exports
5. **User Data**: Isolate game data from app data

## Performance Optimizations

1. **Caching**: Cache exports until spec changes
2. **Incremental Builds**: Only rebuild changed scenes
3. **Asset Optimization**: Compress assets before export
4. **WASM Loading**: Optimize WebAssembly loading
5. **Memory Management**: Clean up old exports

## Error Handling

1. **Export Failures**: Fallback to test game
2. **Missing Assets**: Generate placeholder assets
3. **Invalid Spec**: Validate and provide errors
4. **Godot Not Found**: Clear error messages
5. **Port Conflicts**: Auto-find available ports

