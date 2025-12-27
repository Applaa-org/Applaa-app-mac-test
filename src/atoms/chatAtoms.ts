import type { Message } from "@/ipc/ipc_types";
import { atom } from "jotai";
import type { ChatSummary } from "@/lib/schemas";

// Atom to hold the chat history
export const chatMessagesAtom = atom<Message[]>([]);
export const chatErrorAtom = atom<string | null>(null);

// Atom to hold the currently selected chat ID
export const selectedChatIdAtom = atom<number | null>(null);

// 🚨 DYAD PATTERN: Simple writable streaming atom (not derived!)
// This is the PROVEN pattern from Dyad that we should NOT deviate from
export const isStreamingAtom = atom<boolean>(false);

// ✅ ADD: Track which app is currently streaming (for app list loader)
export const currentStreamingAppIdAtom = atom<number | null>(null);

export const chatInputValueAtom = atom<string>("");
export const homeChatInputValueAtom = atom<string>("");

// Atoms for chat list management
export const chatsAtom = atom<ChatSummary[]>([]);
export const chatsLoadingAtom = atom<boolean>(false);

// Used for scrolling to the bottom of the chat messages
export const chatStreamCountAtom = atom<number>(0);
