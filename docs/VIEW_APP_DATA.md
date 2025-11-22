# How to View App Data in Browser Console

## Method 1: Using the Global Function (Easiest)

1. Open the app
2. Open DevTools (Cmd+Option+I on Mac, Ctrl+Shift+I on Windows/Linux)
3. In the browser console, type:

```javascript
viewAppData()
```

This will display all your app data in formatted tables.

## Method 2: Using Electron API Directly

If `viewAppData()` doesn't work, try this:

```javascript
window.electron.ipcRenderer.invoke("console-db-data").then(result => {
  console.log("📊 Summary:", result.summary);
  console.table(result.apps);
  console.table(result.chats);
  return result;
});
```

## Method 3: Using IpcClient (If you have access to it)

```javascript
// In a React component or if IpcClient is available
import { IpcClient } from '@/ipc/ipc_client';
const ipcClient = IpcClient.getInstance();
const data = await ipcClient.consoleDbData();
console.table(data.apps);
```

## What You'll See

- **Summary**: Total counts of apps, chats, messages, versions
- **Apps Table**: All apps with:
  - ID, Name, Path, Type, Status
  - Vercel URLs, GitHub URLs, EAS URLs
  - Supabase/Neon Project IDs
  - Deployment status
- **Chats Table**: All chat sessions
- **Versions Table**: All app versions
- **Message Counts**: Number of messages per chat

## Troubleshooting

If you see an error:
1. Make sure the app is running (not just the terminal)
2. Try restarting the app
3. Check the main process console (terminal) for errors
4. Use Method 2 as a fallback

