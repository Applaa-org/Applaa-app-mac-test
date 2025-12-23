# Applaa Automation System

This document describes the Applaa Automation system that allows AI-powered control of the Applaa Electron application itself.

## Overview

The Applaa Automation system enables users to control the Applaa app through natural language commands, similar to Comet or browser-use, but for the Applaa application itself. Users can execute tasks like "Create a new React app" or "Show me all my apps" using simple language.

## Architecture

The system consists of three main components:

### 1. ApplaaAutomationService
Handles IPC-based actions (app operations like creating apps, running apps, etc.)

**Location**: `src/services/applaa-automation-service.ts`

### 2. ApplaaDOMAutomation
Handles DOM-based actions (UI interactions like clicking buttons, filling forms, navigating)

**Location**: `src/services/applaa-dom-automation.ts`

### 3. ApplaaAIAutomation
Combines both IPC and DOM automation, using AI to plan and execute user tasks

**Location**: `src/services/applaa-ai-automation.ts`

## How It Works

1. **User provides a task** in natural language (e.g., "Create a new React web app called 'MyApp'")
2. **AI planning**: The system uses your configured LLM to break down the task into a sequence of actions
3. **Action execution**: Actions are executed either via:
   - **IPC commands**: For app-level operations (createApp, runApp, etc.)
   - **DOM manipulation**: For UI interactions (click button, fill input, navigate)
4. **Results**: The system returns a summary of executed actions

## Available Actions

### IPC Actions (App Operations)
- `createApp`: Create a new app
  ```typescript
  { type: 'ipc', method: 'createApp', params: { name: 'MyApp', appType: 'web', framework: 'react' } }
  ```
- `runApp`: Run an app
- `stopApp`: Stop a running app
- `editFile`: Edit a file in an app
- `listApps`: List all apps
- `getApp`: Get app details
- `createChat`: Create a new chat for an app
- `deleteApp`: Delete an app
- `renameApp`: Rename an app

### DOM Actions (UI Interactions)
- `clickButton`: Click a button by CSS selector
- `fillInput`: Fill an input field
- `navigate`: Navigate to a route
- `extractText`: Extract text from an element
- `waitForElement`: Wait for an element to appear

## Usage

### From React Components

```typescript
import { useApplaaAutomation } from '@/hooks/useApplaaAutomation';

function MyComponent() {
  const { executeTask, isExecuting, taskResult } = useApplaaAutomation();

  const handleCreateApp = async () => {
    const result = await executeTask("Create a new React web app called 'TodoApp'");
    console.log('Result:', result);
  };

  return (
    <button onClick={handleCreateApp} disabled={isExecuting}>
      {isExecuting ? 'Creating...' : 'Create App'}
    </button>
  );
}
```

### From IPC Handlers

The automation is already integrated via IPC handlers:

```typescript
// In your IPC handler
ipcMain.handle("my-handler", async (event, params) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const automation = new ApplaaAIAutomation(window);
  const result = await automation.executeTask("Create a new app");
  return result;
});
```

## Example Tasks

### Simple Tasks
- "Create a new React web app called 'MyTodoApp'"
- "List all my apps"
- "Show me my first app"

### Complex Tasks
- "Create a new React app, run it, and open the chat"
- "List all my apps and show me details of the first one"
- "Create a new app, navigate to it, and create a chat"

## Integration with Chat System

The automation can be integrated into the chat system to automatically detect and execute automation tasks. For example, users could say:

> "Create a new React app called 'MyApp'"

And the system would automatically:
1. Detect this as an automation task
2. Execute the automation
3. Show results in the chat

## Configuration

The automation uses your configured LLM settings (from `readSettings()`) to plan tasks. Make sure you have:
1. A valid LLM provider configured
2. API keys set up
3. A model selected

## Error Handling

The system includes comprehensive error handling:
- Individual action failures are captured and reported
- The system continues executing remaining actions even if one fails
- Errors are logged and returned to the user

## Future Enhancements

Potential improvements:
1. **Visual feedback**: Show automation progress in the UI
2. **Undo/redo**: Support for undoing automation actions
3. **Task templates**: Predefined common automation tasks
4. **Multi-step workflows**: Support for complex multi-app workflows
5. **Integration with chat**: Automatic detection of automation tasks in chat

