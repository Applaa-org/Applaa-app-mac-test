# Godot Engine Integration - Complete Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the complete Godot Engine game previewing system in Applaa.

## Architecture Summary

```
User Prompt → AI → game_spec.json → Godot Project Generator → Godot Project
                                                                    ↓
                                                          Godot HTML5 Export
                                                                    ↓
                                                          HTTP Server (localhost)
                                                                    ↓
                                                          Electron Preview (iframe)
```

## Implementation Steps

### 1. Game Specification Generation

When a user enters a prompt, the AI generates a `game_spec.json` file:

```typescript
// Example: User prompt "Create a 2D platformer game"
const spec: GameSpecification = {
  game: {
    name: "My Platformer",
    type: "2D",
    description: "A 2D platformer game"
  },
  settings: {
    window: { width: 1280, height: 720 },
    physics: { enabled: true, gravity: { x: 0, y: 980 } }
  },
  scenes: [...],
  assets: {...}
};
```

### 2. Project Generation Workflow

```typescript
// In godot_handlers.ts
await generateGodotProject({
  appPath: "/path/to/app",
  spec: gameSpec,
  regenerateAssets: false
});
```

This creates:
- `project.godot` - Project configuration
- `Loader.tscn` - Entry scene
- `Loader.gd` - Dynamic game loader script
- `scenes/*.tscn` - All game scenes
- `scripts/*.gd` - All GDScript files
- `assets/**/*` - All game assets

### 3. Export Workflow

```typescript
// Export to HTML5
const result = await exportGodotToHTML5({
  projectPath: "/path/to/godot-project",
  exportPath: "/path/to/godot-web-export",
  projectName: "My Game",
  debug: false
});
```

This generates:
- `index.html` - Main HTML file
- `game.js` - JavaScript runtime
- `game.wasm` - WebAssembly binary
- `game.pck` - Game resources package

### 4. Preview Integration

The HTTP server serves the export files:

```typescript
// Server starts on localhost:9000+
const server = http.createServer((req, res) => {
  // Serve files with CORS headers
  // Handle .wasm, .js, .pck files
});
```

The preview panel loads the game:

```tsx
<iframe 
  src="http://localhost:9000/index.html"
  allow="fullscreen"
/>
```

## File Structure

```
applaa-app/
├── src/
│   ├── godot/
│   │   ├── game_spec_schema.ts          # TypeScript types
│   │   ├── game_spec_generator.ts       # AI → JSON
│   │   ├── godot_project_generator.ts   # JSON → Project
│   │   ├── godot_exporter.ts            # Project → HTML5
│   │   ├── godot_loader_template.ts     # Loader generator
│   │   └── scene_generators/
│   │       ├── scene_2d_generator.ts
│   │       └── scene_3d_generator.ts
│   └── ipc/
│       └── handlers/
│           └── godot_handlers.ts        # IPC handlers
│
└── apps/
    └── {app-id}/
        ├── godot-project/               # Generated project
        │   ├── project.godot
        │   ├── Loader.tscn
        │   ├── Loader.gd
        │   ├── game_spec.json
        │   ├── scenes/
        │   ├── scripts/
        │   └── assets/
        └── godot-web-export/            # HTML5 export
            ├── index.html
            ├── game.js
            ├── game.wasm
            └── game.pck
```

## Key Components

### Loader.gd Script

The `Loader.gd` script is the entry point that:

1. **Reads game_spec.json** at runtime
2. **Dynamically constructs** the game from the spec
3. **Handles scene loading** and instantiation
4. **Applies game settings** (window, physics, etc.)

```gdscript
func _ready():
    load_game_spec()
    construct_game()

func construct_game():
    # Load scenes from spec
    # Instantiate nodes
    # Apply settings
```

### Scene Generation

Scenes are generated as `.tscn` files:

```gdscript
[gd_scene load_steps=3 format=3]
[ext_resource type="Script" path="res://Loader.gd" id="1"]
[node name="Main" type="Node2D"]
    [node name="Player" type="CharacterBody2D" parent="."]
        position = Vector2(100, 300)
        script = ExtResource("1")
```

### Export Process

1. **Detect Godot Engine** - Check PATH or common locations
2. **Create Export Preset** - Add to `project.godot` if needed
3. **Run Export Command** - `godot --headless --export-release Web`
4. **Verify Output** - Check for required files
5. **Cache Result** - Store export for reuse

## Regeneration Workflow

When a user enters a new prompt:

1. **Generate new spec** - AI creates updated `game_spec.json`
2. **Check for changes** - Compare with existing spec
3. **Regenerate project** - Update only changed files
4. **Re-export** - Export if project changed
5. **Reload preview** - Update iframe src to trigger reload

```typescript
// Check if regeneration needed
const specChanged = await compareSpecs(oldSpec, newSpec);
if (specChanged) {
  await generateGodotProject({ ... });
  await exportGodotToHTML5({ ... });
  // Preview auto-reloads via polling
}
```

## Error Handling

### Godot Not Found
- Show clear error message
- Fallback to test HTML5 game
- Provide installation instructions

### Export Failures
- Log detailed error messages
- Fallback to test game
- Cache last successful export

### Missing Assets
- Generate placeholder assets
- Use default textures/meshes
- Log warnings

### Port Conflicts
- Auto-find available port (9000-9100)
- Handle EADDRINUSE errors
- Clean up old servers

## Caching Strategy

1. **Spec Caching** - Store `game_spec.json` with timestamp
2. **Export Caching** - Only re-export if spec changed
3. **File Watching** - Watch for spec changes
4. **Incremental Builds** - Only rebuild changed scenes

```typescript
// Check if export is up to date
const upToDate = isExportUpToDate(projectPath, exportPath, specPath);
if (!upToDate) {
  await exportGodotToHTML5({ ... });
}
```

## Performance Optimizations

### WebAssembly Loading
- Preload `.wasm` file
- Use streaming compilation
- Cache compiled module

### Asset Optimization
- Compress textures before export
- Minimize mesh complexity
- Use efficient formats

### Memory Management
- Clean up old exports
- Limit concurrent servers
- Monitor memory usage

## Security Considerations

### Sandboxing
- iframe sandbox attributes
- CSP headers
- Isolated execution

### Path Validation
- Validate all file paths
- Prevent directory traversal
- Sanitize user input

### Resource Limits
- Limit export size
- Timeout long operations
- Memory limits

## Testing

### Unit Tests
- Test spec generation
- Test project generation
- Test export process

### Integration Tests
- Test full workflow
- Test error handling
- Test caching

### Manual Testing
1. Create a new Godot app
2. Enter a game prompt
3. Verify project generation
4. Verify export
5. Verify preview

## Troubleshooting

### White Screen
- Check browser console
- Verify HTTP server running
- Check CORS headers
- Verify files exist

### Export Fails
- Check Godot installation
- Verify export templates
- Check project.godot
- Review logs

### Preview Not Loading
- Check port availability
- Verify iframe src
- Check network tab
- Review server logs

## Next Steps

1. **Implement AI Spec Generator** - Connect to LLM
2. **Add Asset Generation** - Create sprites/models
3. **Enhance Scene Templates** - More scene types
4. **Add Debug Tools** - Inspector, console
5. **Optimize Performance** - Faster exports, smaller files

