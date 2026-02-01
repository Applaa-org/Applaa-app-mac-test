---
name: godot-games
description: Work with Godot game development in Applaa. Use when creating games from prompts, working with GameSpecification, debugging Godot project generation, or handling HTML5 export and preview. Also use for test game generation when Godot engine is not available.
---

# Godot Games

AI-powered game development with Godot engine or HTML5 canvas fallback.

## Architecture

```
User Prompt → GameSpecification → Godot Project Generator → Export → Preview
```

**Key Files:**
- `src/ipc/handlers/godot_handlers.ts` - IPC handlers
- `src/godot/game_spec_generator.ts` - AI spec generation
- `src/godot/godot_project_generator.ts` - Project generation
- `src/godot/godot_exporter.ts` - HTML5 export

## Project Structure

```
apps/{appName}/
├── godot-project/
│   ├── project.godot          # Godot project config
│   ├── game_spec.json         # AI-generated specification
│   ├── Loader.tscn            # Entry scene
│   ├── Loader.gd              # Dynamic loader script
│   ├── scenes/                # Scene files (.tscn)
│   ├── scripts/               # GDScript files (.gd)
│   └── assets/                # Sprites, sounds
└── godot-web-export/          # HTML5 export
    ├── index.html
    ├── game.js
    └── game.wasm (if Godot available)
```

## GameSpecification Schema

AI generates this spec from user prompts:

```typescript
interface GameSpecification {
  game: {
    name: string;
    description: string;
    genre: "platformer" | "puzzle" | "shooter" | "racing" | etc;
    version: string;
  };
  player: {
    name: string;
    type: "character" | "vehicle" | "abstract";
    health: number;
    speed: number;
    abilities: string[];
  };
  enemies: Array<{
    name: string;
    type: string;
    health: number;
    speed: number;
    damage: number;
    behavior: "patrol" | "chase" | "stationary";
  }>;
  levels: Array<{
    name: string;
    background: string;
    obstacles: string[];
    spawnPoints: { x: number; y: number }[];
  }>;
  assets: {
    sprites: string[];
    sounds: string[];
    music: string[];
  };
  logic: {
    winCondition: string;
    loseCondition: string;
    scoring: string;
  };
}
```

## IPC Handlers

```typescript
// Generate game spec from prompt
"godot:generate-game-spec" → GameSpecification

// Build Godot project from spec
"godot:build-from-spec" → { success, projectPath }

// Create basic project structure
"godot:create-project" → { success, path }

// Export to HTML5
"godot:export-web" → { success, exportPath }

// Get preview URL (starts HTTP server)
"godot:get-web-export-url" → { url: "http://localhost:9xxx" }

// Check if Godot engine installed
"godot:check-engine" → { installed: boolean, path?: string }
```

## Test Game Generator

When Godot engine isn't available, generates HTML5 canvas games:

**Supported Types:**
- platformer, maze, pong, shooter
- puzzle, racing, zombie, space

```typescript
// src/ipc/handlers/godot_test_game_generator.ts
generateTestGame(spec: GameSpecification): string  // Returns HTML
```

## Loader Pattern

`Loader.gd` reads `game_spec.json` at runtime for dynamic game construction:

```gdscript
# Loader.gd
extends Node2D

func _ready():
    var file = FileAccess.open("res://game_spec.json", FileAccess.READ)
    var spec = JSON.parse_string(file.get_as_text())
    build_game_from_spec(spec)
```

## Export Configuration

**HTML5 Export:**
- Uses Godot's HTML5 export template
- Creates `vercel.json` for deployment
- Injects Applaa storage helper for scores
- Fallback to canvas if no Godot engine

**Port Range:** 9000-9100 for preview server

## Preview Integration

```typescript
// src/hooks/useGodotExport.ts
const { exportUrl, isExporting, error } = useGodotExport(appId);

// src/hooks/useGodotProjectStatus.ts
const { status, isBuilding } = useGodotProjectStatus(appId);
// Status: 'building' | 'ready' | 'error'
```

## Common Game Genres

| Genre | Key Features |
|-------|--------------|
| Platformer | Jumping, gravity, platforms |
| Puzzle | Logic, matching, solving |
| Shooter | Projectiles, enemies, waves |
| Racing | Speed, track, obstacles |
| Maze | Navigation, exploration |

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| No preview | Godot not installed | Uses test game fallback |
| Export fails | Missing export template | Install Godot export template |
| Game blank | Spec invalid | Check game_spec.json |
| Port conflict | Server already running | Stop previous server |
| Assets missing | Spec references unavailable | Use placeholder assets |
