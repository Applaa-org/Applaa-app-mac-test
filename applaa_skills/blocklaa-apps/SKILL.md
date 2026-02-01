---
name: blocklaa-apps
description: Work with Blocklaa visual block-based programming apps. Use when creating, editing, or debugging Blocklaa apps, working with custom blocks, code generation, or the Blockly editor component. Also use for K-5/K-7/K-9 educational blocks or AI assistant (Appy) integration.
---

# Blocklaa Apps

Visual block-based programming built on Google Blockly.

## Architecture

```
BlocklyEditor.tsx → workspace.json → Code Generators → HTML/JS/Python
```

**Key Files:**
- `src/components/blockly/BlocklyEditor.tsx` - Main editor (1600+ lines)
- `src/pages/blockly.tsx` - Page component
- `src/ipc/handlers/blockly_handlers.ts` - Save/load handlers
- `src/components/blockly/blocks/` - Custom block definitions

## App Structure

```
apps/blockly/{appName}/
├── workspace.json          # Blockly workspace serialization
├── index.html              # Standalone HTML preview
└── generated/
    ├── code.js             # JavaScript output
    ├── code.py             # Python output
    ├── code.php            # PHP output
    ├── code.lua            # Lua output
    └── code.dart           # Dart output
```

## Custom Block Categories

| Category | File | Example Blocks |
|----------|------|----------------|
| K-5 Starter | `k5-starter-blocks.ts` | game_start, show_character, play_sound |
| Story Time | `k7-story-blocks.ts` | start_story, add_character, character_says |
| Arcade Maker | `k9-game-blocks.ts` | create_sprite, move_sprite, on_key_press |
| STEM | `stem-blocks.ts` | plant_seed, read_sensor |

## Creating Custom Blocks

```typescript
// src/components/blockly/blocks/my-blocks.ts
import Blockly from "blockly";

Blockly.Blocks["my_custom_block"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Do something");
    this.appendValueInput("VALUE")
      .setCheck("Number")
      .appendField("with");
    this.setOutput(true, "String");
    this.setColour(230);
    this.setTooltip("My custom block");
  },
};

// Code generator
Blockly.JavaScript.forBlock["my_custom_block"] = function (block, generator) {
  const value = generator.valueToCode(block, "VALUE", Blockly.JavaScript.ORDER_ATOMIC);
  return [`doSomething(${value})`, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};
```

## IPC Handlers

```typescript
// Save workspace
handle("blockly:save-workspace", async (_event, { appId, workspace, code }) => {
  const appPath = getAppPath(appId);
  await fs.writeFile(path.join(appPath, "workspace.json"), JSON.stringify(workspace));
  await fs.writeFile(path.join(appPath, "generated/code.js"), code.javascript);
  // ... other languages
});
```

## Editor Integration Points

**Auto-save:**
- Debounced (1 second)
- Saves to `workspace.json`
- Backup to localStorage

**Preview:**
- Generates standalone HTML
- Executes in sandbox iframe
- Shows visual stage output

**AI Integration (Appy):**
- `src/components/blockly/appy/AppyCore.ts` - Core AI logic
- `src/components/blockly/appy/AppyLLMIntegration.ts` - LLM calls
- Can suggest blocks, explain code, help debug

## Framework Registry Entry

```typescript
// src/lib/universal/framework-registry.ts
{
  id: 'blockly',
  name: 'Blocklaa',
  category: 'visual-blocks',
  // Creates workspace.json and index.html
}
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Blocks not loading | Custom blocks not registered | Register in `CustomBlocks.ts` |
| Code not generating | Missing generator | Add `Blockly.JavaScript.forBlock` |
| Workspace not saving | IPC error | Check `blockly_handlers.ts` |
| Preview blank | Sandbox blocked | Check iframe permissions |

## LLM Code Generation

When AI generates Blocklaa code, output format:

```json
{
  "workspaceJson": { /* Blockly serialization */ },
  "generatedCode": {
    "javascript": "// Generated JS",
    "python": "# Generated Python"
  }
}
```
