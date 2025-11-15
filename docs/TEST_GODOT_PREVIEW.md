# Testing Godot Game Preview

This document describes how to test the Godot game preview functionality in Applaa.

## Quick Test Steps

1. **Create a Godot App**
   - Open Applaa
   - Click "Create New App"
   - Select "Godot" as the app type
   - Enter a name (e.g., "Test Game")

2. **Verify Project Creation**
   - The system should automatically:
     - Generate the game project structure
     - Create `project.godot`
     - Create `Loader.tscn` and `Loader.gd`
     - Create `game_spec.json`
     - Generate a test web export

3. **Check Preview**
   - Open the Preview panel
   - You should see:
     - "Godot Game Project" header
     - Either the game preview (if export exists) or
     - "Creating export automatically..." message
   - After a few seconds, the preview should load

4. **Verify Export**
   - Check the `apps/godot/[app-name]/godot-web-export/` folder
   - Should contain `index.html`
   - The preview should show a playable game

## Expected Preview Content

The test export should show:
- A canvas-based game
- Player character (blue square)
- Platforms (gray rectangles)
- Collectibles (orange circles)
- Score counter
- Controls: Arrow keys/WASD to move, Space to jump

## Troubleshooting

### Preview shows "Invalid channel" error
- **Fix**: Restart the app to reload the preload script
- **Check**: Verify `src/preload.ts` includes all Godot channels

### Preview shows "No web export found"
- **Fix**: Click "Create/Refresh Export" button
- **Check**: Verify `godot-web-export` folder exists
- **Check**: Verify `index.html` exists in export folder

### Preview shows white screen
- **Check**: Open browser console for errors
- **Check**: Verify HTTP server is running (check logs)
- **Fix**: Try refreshing the preview

### Export creation fails
- **Check**: Check main process logs for errors
- **Check**: Verify Godot engine is installed (optional - test export should work without it)
- **Fix**: The system should fall back to test export automatically

## Manual Test Export

To manually test the export function:

1. Open the Preview panel
2. Click "Create/Refresh Export" button
3. Wait for export to complete
4. Preview should automatically refresh

## Test Game Specification

A minimal test game spec:

```json
{
  "game": {
    "name": "Test Game",
    "type": "2D",
    "description": "Test game for preview"
  },
  "settings": {
    "window": {
      "width": 800,
      "height": 600,
      "resizable": true
    },
    "physics": {
      "enabled": true
    }
  },
  "scenes": [],
  "assets": {},
  "scripts": []
}
```

## Verification Checklist

- [ ] App created successfully
- [ ] Project files generated
- [ ] Export created automatically
- [ ] Preview loads without errors
- [ ] Game is playable in preview
- [ ] HTTP server starts correctly
- [ ] Preview refreshes when export is updated
- [ ] Error messages display correctly if export fails
- [ ] Problems panel shows Godot errors if any

## Next Steps

After verifying the preview works:
1. Test with a more complex game specification
2. Test with Godot engine export (if installed)
3. Test error handling (missing files, invalid spec, etc.)
4. Test auto-fix functionality for export errors

