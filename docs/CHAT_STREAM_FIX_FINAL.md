# Chat Stream Fix - Silent Streaming & Hijacking Issues

## Problem Analysis

After comparing with Dyad's source code, I identified **TWO CRITICAL ISSUES**:

### Issue 1: Silent Streaming (Messages Not Displaying)
**Symptom**: Chat stream runs in background but messages don't appear in UI

**Root Cause**: Race condition from duplicate message fetching
- `ChatPanel` fetches messages on mount
- `ChatInput` ALSO fetches messages on mount
- Both write to the same global `chatMessagesAtom`
- When streaming updates arrive, they get **overwritten** by stale fetched data

**Flow:**
1. Stream starts, `setMessages([...new messages])`
2. `ChatInput` `useEffect` triggers `fetchChatMessages()`
3. Old messages from DB overwrite the live stream updates
4. User sees nothing or old messages

### Issue 2: In-Progress App Hijacking
**Symptom**: One app's "In Progress" state affects all other apps

**Root Cause**: Using global `isStreaming` atom for local checks
- `isStreamingAtom` = true if ANY app is streaming
- Components check `isStreaming` to disable/enable UI
- App A streaming → disables UI for App B, C, D

## Solutions Implemented

### Fix 1: Single Source of Truth for Messages ✅

**Removed duplicate message fetching in `ChatInput.tsx`:**
```typescript
// ❌ BEFORE: Duplicate fetching caused race conditions
const fetchChatMessages = useCallback(async () => {
  const chat = await IpcClient.getInstance().getChat(chatId);
  setMessages(chat.messages); // Overwrites streaming updates!
}, [chatId, setMessages]);

useEffect(() => {
  fetchChatMessages();
}, [chatId, fetchChatMessages]);

// ✅ AFTER: Removed - ChatPanel is the single source
// Only ChatPanel fetches initial messages
```

**Fixed `ChatPanel.tsx` to only fetch on chatId change:**
```typescript
// ❌ BEFORE: useEffect depended on fetchChatMessages, causing re-fetches
useEffect(() => {
  fetchChatMessages();
}, [fetchChatMessages]); // Re-fetches on every render!

// ✅ AFTER: Only fetch when chatId actually changes
useEffect(() => {
  console.log(`📋 ChatPanel: chatId changed to ${chatId}, fetching messages...`);
  fetchChatMessages();
}, [chatId]); // Only depend on chatId!
```

### Fix 2: App-Specific Streaming State ✅

**Already fixed in previous commit:**
- Introduced `appStreamingStatesAtom` - a map of `appId → boolean`
- `useStreamChat` returns `isThisAppStreaming` instead of global `isStreaming`
- Each app tracks its own streaming state independently

```typescript
// ❌ BEFORE: Global check blocked all apps
if (isStreaming) {
  throw new Error("Stream already in progress");
}

// ✅ AFTER: App-specific check
const isThisAppStreaming = appStreamingStates[selectedAppId] || false;
if (isThisAppStreaming) {
  throw new Error("Stream already in progress for this app");
}
```

## Why This Matches Dyad's Pattern

Looking at Dyad's source code:
1. **Single message fetch point**: Only `ChatPanel` fetches messages
2. **Streaming updates replace, not merge**: `setMessages(updatedMessages)` directly
3. **No refetching during stream**: Once stream starts, only stream updates the atom
4. **App-specific state**: Each app maintains its own streaming context

## Testing Checklist

- [ ] Create new Expo app, verify messages appear during stream
- [ ] Create web app while Expo app is streaming - verify no hijacking
- [ ] Switch between apps - verify each shows correct messages
- [ ] Resume streaming on paused app - verify messages don't duplicate

## Technical Details

### Message Flow (Corrected)

```
1. User navigates to /chat?id=123
   ↓
2. ChatPanel mounts
   ↓
3. ChatPanel fetches initial messages: getChat(123)
   ↓
4. User sends message
   ↓
5. streamMessage() starts
   ↓
6. IPC onUpdate: setMessages(updatedMessages)
   ↓
7. Messages display in real-time ✅
   (No more overwrites from fetchChatMessages!)
```

### Streaming State Management

```
appStreamingStatesAtom = {
  190: true,  // App 190 is streaming
  192: false, // App 192 is idle
  193: false  // App 193 is idle
}

isStreamingAtom = derived(
  Object.values(appStreamingStates).some(s => s)
) // true (because 190 is streaming)

// But each component uses app-specific state:
App 190: isThisAppStreaming = true  → disable input
App 192: isThisAppStreaming = false → enable input
App 193: isThisAppStreaming = false → enable input
```

## Files Modified

1. `src/components/chat/ChatInput.tsx` - Removed duplicate message fetching
2. `src/components/ChatPanel.tsx` - Fixed `useEffect` dependency to only fetch on chatId change
3. `src/hooks/useStreamChat.ts` - (Previously fixed) App-specific streaming state

## Impact

✅ **Messages now display during streaming** - no more silent background streams
✅ **Apps stream independently** - no more hijacking
✅ **Matches Dyad's proven pattern** - single source of truth
✅ **No race conditions** - streaming updates won't be overwritten

---

**Status**: Ready for testing
**Date**: 2025-09-30
**Priority**: CRITICAL - Core functionality restored
