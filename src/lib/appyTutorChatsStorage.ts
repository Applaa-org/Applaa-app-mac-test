export type AcademyKind = "ai" | "learning";

export type TutorMessageStored = {
  role: "user" | "assistant";
  content: string;
  source?: "local" | "cloud";
};

export type SavedTutorChat = {
  id: string;
  title: string;
  messages: TutorMessageStored[];
  updatedAt: number;
};

type StoredShape = {
  chats: SavedTutorChat[];
  activeChatId: string | null;
};

const STORAGE_PREFIX = "appy-tutor-chats:v1:";

function key(academy: AcademyKind) {
  return `${STORAGE_PREFIX}${academy}`;
}

export function loadTutorChats(academy: AcademyKind): StoredShape {
  try {
    const raw = localStorage.getItem(key(academy));
    if (!raw) return { chats: [], activeChatId: null };
    const parsed = JSON.parse(raw) as StoredShape;
    if (!parsed || !Array.isArray(parsed.chats)) {
      return { chats: [], activeChatId: null };
    }
    return {
      chats: parsed.chats.filter(
        (c) =>
          c &&
          typeof c.id === "string" &&
          Array.isArray(c.messages) &&
          typeof c.title === "string",
      ),
      activeChatId:
        typeof parsed.activeChatId === "string" ? parsed.activeChatId : null,
    };
  } catch {
    return { chats: [], activeChatId: null };
  }
}

export function saveTutorChats(academy: AcademyKind, data: StoredShape): void {
  try {
    localStorage.setItem(key(academy), JSON.stringify(data));
  } catch {
    // ignore quota / private mode
  }
}

export function makeChatTitleFromMessage(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "New chat";
  return t.length > 48 ? `${t.slice(0, 45)}…` : t;
}

export function newChatId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
