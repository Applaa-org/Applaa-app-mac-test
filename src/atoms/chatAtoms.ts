import type { Message } from "@/ipc/ipc_types";
import { atom } from "jotai";
import type { ChatSummary } from "@/lib/schemas";

// Atom to hold the chat history
export const chatMessagesAtom = atom<Message[]>([]);
export const chatErrorAtom = atom<string | null>(null);

// Atom to hold the currently selected chat ID
export const selectedChatIdAtom = atom<number | null>(null);

// 🚨 CRITICAL FIX: App-specific streaming state to prevent hijacking
// Map of appId -> isStreaming to track streaming state per app
export const appStreamingStatesAtom = atom<Record<number, boolean>>({});

// Legacy global streaming atom - kept for backward compatibility but derived from app-specific states
export const isStreamingAtom = atom<boolean>(
  (get) => {
    const appStates = get(appStreamingStatesAtom);
    return Object.values(appStates).some(isStreaming => isStreaming);
  }
);

// Helper function to create app-specific streaming atom (memoized to prevent infinite loops)
const appStreamingAtomCache = new Map<number, ReturnType<typeof atom<boolean>>>();

export const createAppStreamingAtom = (appId: number | null) => {
  if (!appId) {
    // Return a static atom for null appId
    return atom<boolean>(false);
  }
  
  // Check if we already have an atom for this appId
  if (appStreamingAtomCache.has(appId)) {
    return appStreamingAtomCache.get(appId)!;
  }
  
  // Create new atom and cache it
  const newAtom = atom<boolean>(
    (get) => {
      const appStates = get(appStreamingStatesAtom);
      return appStates[appId] || false;
    }
  );
  
  appStreamingAtomCache.set(appId, newAtom);
  return newAtom;
};

export const chatInputValueAtom = atom<string>("");
export const homeChatInputValueAtom = atom<string>("");

// Atoms for chat list management
export const chatsAtom = atom<ChatSummary[]>([]);
export const chatsLoadingAtom = atom<boolean>(false);

// Used for scrolling to the bottom of the chat messages
export const chatStreamCountAtom = atom<number>(0);
