# Godot Engine Integration in Applaa

This document describes the Godot Engine integration that allows Applaa to create and manage Godot game projects.

## Overview

The integration enables:
1. **AI-powered game generation**: Users describe a game idea, and Applaa generates a complete Game Specification JSON
2. **Automatic Godot project creation**: Applaa creates and manages Godot project files (scenes, scripts, assets)
3. **Dynamic game building**: Godot reads the JSON specification and builds the entire game automatically
4. **Web export support**: Games can be exported to web format for preview in Applaa

## Architecture

### Components

1. **Database Schema** (`src/db/schema.ts`)
   - Added `"godot"` as a new app type alongside `"web"` and `"mobile"`

2. **IPC Handlers** (`src/ipc/handlers/godot_handlers.ts`)
   - `godot:generate-game-spec`: Generates Game Specification JSON from user prompt
   - `godot:build-from-spec`: Builds Godot game from specification
   - `godot:create-project`: Creates basic Godot project structure
   - `godot:export-web`: Exports Godot project to web format
   - `godot:get-project-status`: Gets project status and paths

3. **Game Specification Generator** (`src/godot/game_spec_generator.ts`)
   - Uses AI to convert user prompts into structured Game Specification JSON
   - Includes game metadata, player, enemies, levels, assets, and logic

4. **Godot Builder** (`src/godot/godot_builder.ts`)
   - Generates Godot scene files (.tscn) from specification
   - Creates GDScript files for player, enemies, levels, and game manager
   - Sets up project structure with proper directories

5. **Workspace Support** (`src/paths/workspace.ts`)
   - Added `"godot"` as a valid app kind
   - Creates `apps/godot/` directory structure

## Game Specification JSON Structure

```json
{
  "game": {
    "name": "Game Name",
    "description": "Game description",
    "genre": "action|platformer|shooter|puzzle|rpg|strategy",
    "version": "1.0.0"
  },
  "player": {
    "name": "Player",
    "type": "character|vehicle|spaceship|custom",
    "health": 100,
    "speed": 200,
    "abilities": ["jump", "shoot"]
  },
  "enemies": [
    {
      "name": "Enemy Name",
      "type": "basic|boss|flying|ground",
      "health": 50,
      "speed": 100,
      "damage": 10,
      "behavior": "patrol|chase|shoot|custom"
    }
  ],
  "levels": [
    {
      "name": "Level 1",
      "background": "forest|desert|space|city|custom",
      "obstacles": [
        {
          "type": "platform|spike|wall",
          "position": {"x": 100, "y": 200}
        }
      ],
      "spawnPoints": [
        {"x": 50, "y": 300}
      ]
    }
  ],
  "assets": {
    "sprites": [],
    "sounds": [],
    "music": []
  },
  "logic": {
    "winCondition": "defeat_all_enemies|reach_goal|collect_items",
    "loseCondition": "health_zero|time_out",
    "scoring": {
      "pointsPerKill": 100,
      "pointsPerLevel": 500
    }
  }
}
```

## Usage Flow

1. **User creates a Godot app** in Applaa
2. **User describes their game idea** in the chat
3. **Applaa AI generates Game Specification JSON** using `godot:generate-game-spec`
4. **Applaa creates Godot project structure** using `godot:create-project`
5. **Applaa builds the game** from specification using `godot:build-from-spec`
6. **Game files are generated**:
   - `project.godot`: Project configuration
   - `scenes/`: Scene files (.tscn)
   - `scripts/`: GDScript files (.gd)
   - `assets/`: Sprites, sounds, music
   - `game_spec.json`: Original specification

## Generated Files

### Project Structure
```
godot-project/
├── project.godot          # Godot project configuration
├── game_spec.json         # Game specification
├── scenes/
│   ├── Main.tscn          # Main scene
│   ├── Player.tscn        # Player scene
│   ├── EnemyName.tscn     # Enemy scenes
│   └── LevelName.tscn     # Level scenes
├── scripts/
│   ├── Main.gd            # Main script
│   ├── Player.gd          # Player controller
│   ├── EnemyName.gd       # Enemy AI scripts
│   ├── LevelName.gd       # Level scripts
│   └── GameManager.gd     # Game logic manager
└── assets/
    ├── sprites/
    ├── sounds/
    └── music/
```

## Future Enhancements

1. **WebView Integration**: Embed Godot Web export in Applaa preview panel
2. **Native Runtime**: Support for native Godot engine embedding (desktop/mobile)
3. **Asset Generation**: AI-generated sprites and sounds
4. **Advanced Behaviors**: More complex enemy AI and game mechanics
5. **Multiplayer Support**: Network game capabilities
6. **Export Templates**: Support for exporting to various platforms

## IPC Client Methods

```typescript
// Generate game specification from prompt
await ipcClient.generateGameSpec({ prompt: "...", appId: 1 });

// Build game from specification
await ipcClient.buildGodotGameFromSpec({ appId: 1, spec: gameSpec });

// Create Godot project
await ipcClient.createGodotProject({ appId: 1, projectName: "MyGame" });

// Export to web
await ipcClient.exportGodotWeb({ appId: 1 });

// Get project status
await ipcClient.getGodotProjectStatus({ appId: 1 });
```

## Notes

- The current implementation generates basic Godot projects with placeholder assets
- Full WebView integration requires Godot export templates to be available
- The builder creates functional GDScript code that follows Godot best practices
- All generated code is compatible with Godot 4.2+

