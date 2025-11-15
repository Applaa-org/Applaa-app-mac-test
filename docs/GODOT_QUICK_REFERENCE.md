# Godot Integration - Quick Reference

## Export Commands

### Manual Export (for testing)
```bash
# Windows
godot --headless --path "C:\path\to\project" --export-release "Web" "C:\path\to\export\index.html"

# macOS/Linux
godot --headless --path "/path/to/project" --export-release "Web" "/path/to/export/index.html"
```

### Debug Export
```bash
godot --headless --path "/path/to/project" --export-debug "Web" "/path/to/export/index.html"
```

## File Paths

### Project Structure
```
apps/{app-id}/
├── godot-project/          # Generated Godot project
│   ├── project.godot       # Project config
│   ├── Loader.tscn         # Entry scene
│   ├── Loader.gd           # Loader script
│   ├── game_spec.json      # Game specification
│   ├── scenes/             # Scene files
│   ├── scripts/            # GDScript files
│   └── assets/             # Game assets
└── godot-web-export/       # HTML5 export
    ├── index.html
    ├── game.js
    ├── game.wasm
    └── game.pck
```

## IPC Handlers

### Generate Game Spec
```typescript
await ipcClient.invoke("godot:generate-game-spec", {
  prompt: "Create a 2D platformer",
  appId: 123
});
```

### Build from Spec
```typescript
await ipcClient.invoke("godot:build-from-spec", {
  appId: 123,
  spec: gameSpec
});
```

### Get Export URL
```typescript
const result = await ipcClient.invoke("godot:get-web-export-url", {
  appId: 123
});
// Returns: { hasExport: true, exportUrl: "http://127.0.0.1:9000/" }
```

### Check Godot Engine
```typescript
const engine = await ipcClient.invoke("godot:check-engine");
// Returns: { installed: true, path: "godot", version: "4.2.1" }
```

## Game Specification Example

```json
{
  "game": {
    "name": "My Game",
    "type": "2D",
    "description": "A simple platformer"
  },
  "settings": {
    "window": {
      "width": 1280,
      "height": 720,
      "resizable": true
    },
    "physics": {
      "enabled": true,
      "gravity": { "x": 0, "y": 980 }
    }
  },
  "scenes": [
    {
      "name": "Main",
      "type": "2D",
      "path": "res://scenes/Main.tscn",
      "nodes": [
        {
          "name": "Player",
          "type": "CharacterBody2D",
          "position": { "x": 100, "y": 300 },
          "script": "res://scripts/Player.gd"
        }
      ]
    }
  ]
}
```

## Common Issues

### Godot Not Found
- Install Godot 4.x from https://godotengine.org
- Add to PATH or use full path
- Check with: `godot --version`

### Export Fails
- Ensure export templates are installed
- Check project.godot has export preset
- Verify project path is correct

### White Screen
- Check HTTP server is running
- Verify index.html exists
- Check browser console for errors
- Verify CORS headers

### Port Already in Use
- Server auto-finds available port (9000-9100)
- Check for other instances
- Restart Applaa if needed

## Performance Tips

1. **Cache Exports** - Only re-export when spec changes
2. **Incremental Builds** - Only rebuild changed scenes
3. **Asset Optimization** - Compress before export
4. **WASM Loading** - Preload and cache compiled module

## Security Notes

- All file paths are validated
- CORS headers are properly set
- iframe sandbox is configured
- Resource limits are enforced

