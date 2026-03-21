import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  PanelRightClose,
  Columns2,
  Square,
  X,
} from "lucide-react";
import { IpcClient } from "@/ipc/ipc_client";
import { VanillaMarkdownParser } from "@/components/chat/DyadMarkdownParser";
import { showError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppyTutorModelPicker } from "./AppyTutorModelPicker";
import { getAppyTutorPrimaryModel } from "@/lib/appyTutorModels";
import { AppyTutorTokensBadge } from "./AppyTutorTokensBadge";
import { AppyTutorChatsPicker } from "./AppyTutorChatsPicker";
import { AppyMascotIcon, AppyMascotTeal } from "./AppyTutorLauncher";
import { useSettings } from "@/hooks/useSettings";
import type { LargeLanguageModel } from "@/lib/schemas";
import {
  loadTutorChats,
  saveTutorChats,
  newChatId,
  makeChatTitleFromMessage,
  type AcademyKind,
  type SavedTutorChat,
  type TutorMessageStored,
} from "@/lib/appyTutorChatsStorage";
import {
  addAppyTutorUsage,
  loadAppyTutorUsageTotals,
  type AppyTutorUsageTotals,
} from "@/lib/appyTutorUsageStorage";

const APPY_TUTOR_PANEL_OPEN_KEY: Record<AcademyKind, string> = {
  ai: "appy-tutor-panel-open:ai",
  learning: "appy-tutor-panel-open:learning",
};

/** Persisted default: panel open; closing saves `false` so the main area can use full width. */
export function useAppyTutorPanelVisibility(academy: AcademyKind) {
  const key = APPY_TUTOR_PANEL_OPEN_KEY[academy];
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return true;
      return raw === "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, String(open));
    } catch {
      /* ignore */
    }
  }, [key, open]);

  return [open, setOpen] as const;
}

/** Edge strip when the tutor column is hidden — extra visible vs a tiny sliver; use with floating launcher. */
export function AppyTutorOpenTab({
  variant,
  onOpen,
}: {
  variant: "indigo" | "teal";
  onOpen: () => void;
}) {
  const tab =
    variant === "indigo"
      ? "border-indigo-200 dark:border-indigo-800 bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-950/60"
      : "border-teal-200 dark:border-teal-800 bg-teal-50/90 dark:bg-teal-950/40 text-teal-700 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-950/60";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "shrink-0 min-w-[3.25rem] flex flex-col items-center justify-center gap-1.5 py-3 px-1 border-l shadow-md transition-colors",
        tab,
      )}
      title="Open Appy Buddy — or tap Appy at the top"
      aria-label="Open Appy Buddy"
    >
      {variant === "indigo" ? (
        <AppyMascotIcon className="h-8 w-8" />
      ) : (
        <AppyMascotTeal className="h-8 w-8" />
      )}
      <span className="text-[9px] font-bold uppercase tracking-wide leading-none text-center max-w-[2.75rem]">
        Appy Buddy
      </span>
    </button>
  );
}

type TutorMessage = {
  role: "user" | "assistant";
  content: string;
  source?: "local" | "cloud";
  retryable?: boolean;
};

function toStored(m: TutorMessage): TutorMessageStored {
  return {
    role: m.role,
    content: m.content,
    source: m.source,
    retryable: m.retryable,
  };
}

function fromStored(m: TutorMessageStored): TutorMessage {
  return {
    role: m.role,
    content: m.content,
    source: m.source,
    retryable: m.retryable,
  };
}

function isTutorRetryableAssistant(m: TutorMessage | undefined): boolean {
  if (!m || m.role !== "assistant") return false;
  if (m.retryable === true) return true;
  if (m.retryable === false) return false;
  const c = m.content;
  return (
    c.startsWith("Something went wrong") ||
    c.startsWith("Request stopped") ||
    /reach the cloud/i.test(c) ||
    /last error:/i.test(c) ||
    /empty response from/i.test(c) ||
    /could not reach|couldn\u2019t reach|couldn't reach/i.test(c)
  );
}

const themeStyles = {
  indigo: {
    border: "border-l-indigo-200 dark:border-l-indigo-800",
    headerBg: "bg-indigo-50 dark:bg-indigo-950/40",
    title: "text-indigo-900 dark:text-indigo-100",
    badgeLocal:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200",
    badgeAppy:
      "bg-indigo-200/80 text-indigo-900 dark:bg-indigo-800/80 dark:text-indigo-100",
    send: "bg-indigo-600 hover:bg-indigo-700 text-white",
    userBubble: "bg-indigo-600 text-white",
    iconBtn:
      "text-indigo-800 hover:bg-indigo-100 dark:text-indigo-200 dark:hover:bg-indigo-950/50",
  },
  teal: {
    border: "border-l-teal-200 dark:border-l-teal-800",
    headerBg: "bg-teal-50 dark:bg-teal-950/40",
    title: "text-teal-900 dark:text-teal-100",
    badgeLocal:
      "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200",
    badgeAppy:
      "bg-teal-200/80 text-teal-900 dark:bg-teal-800/80 dark:text-teal-100",
    send: "bg-teal-600 hover:bg-teal-700 text-white",
    userBubble: "bg-teal-600 text-white",
    iconBtn:
      "text-teal-800 hover:bg-teal-100 dark:text-teal-200 dark:hover:bg-teal-950/50",
  },
} as const;

type ThemeKey = keyof typeof themeStyles;

/** Long assistant replies collapse so follow-ups stay easy to scan. */
const ASSISTANT_COLLAPSE_MIN_CHARS = 720;
const ASSISTANT_COLLAPSE_MIN_LINES = 14;
const ASSISTANT_COLLAPSED_MAX_PX = 220;

function CollapsibleAssistantMarkdown({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = content.split("\n").length;
  const long =
    content.length >= ASSISTANT_COLLAPSE_MIN_CHARS ||
    lines >= ASSISTANT_COLLAPSE_MIN_LINES;
  if (!long) {
    return <VanillaMarkdownParser content={content} />;
  }
  return (
    <div className="space-y-1.5 min-w-0">
      <div
        className={cn(
          "relative min-w-0 overflow-x-auto transition-[max-height] duration-200",
          expanded
            ? "max-h-[min(70vh,2400px)] overflow-y-auto"
            : "max-h-[var(--appy-collapse-h)] overflow-hidden",
        )}
        style={
          {
            "--appy-collapse-h": `${ASSISTANT_COLLAPSED_MAX_PX}px`,
          } as React.CSSProperties
        }
      >
        <VanillaMarkdownParser content={content} />
        {!expanded && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-100 via-gray-100/85 to-transparent dark:from-gray-800 dark:via-gray-800/85 dark:to-transparent"
            aria-hidden
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="text-xs font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white inline-flex items-center gap-1 rounded-md px-1 -ml-1 py-0.5 hover:bg-black/5 dark:hover:bg-white/10"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3.5 w-3.5 shrink-0" />
            Show less
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            Show full answer
          </>
        )}
      </button>
    </div>
  );
}

/** Stays visible above the composer while you scroll the thread. */
function TutorStopRetryStrip({
  loading,
  showRetry,
  onStop,
  onRetry,
}: {
  loading: boolean;
  showRetry: boolean;
  onStop: () => void;
  onRetry: () => void;
}) {
  if (!loading && !showRetry) return null;
  return (
    <div
      className={cn(
        "shrink-0 flex items-center justify-end gap-1.5 border-t border-gray-200 dark:border-gray-800",
        "px-2 py-1.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm",
      )}
    >
      {loading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={onStop}
          title="Stop generating"
        >
          <Square className="h-3.5 w-3.5 fill-current shrink-0" />
          Stop
        </Button>
      )}
      {showRetry && !loading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={onRetry}
          title="Retry the last question"
        >
          <RefreshCw className="h-3.5 w-3.5 shrink-0" />
          Retry
        </Button>
      )}
    </div>
  );
}

function MessageBubble({
  m,
  t,
  fullscreen,
}: {
  m: TutorMessage;
  t: (typeof themeStyles)[ThemeKey];
  fullscreen: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg text-sm break-words",
        fullscreen ? "px-2 py-1.5" : "px-2.5 py-2",
        m.role === "user"
          ? cn(
              fullscreen
                ? "w-full max-w-[min(100%,40rem)] ml-auto"
                : "ml-4",
              t.userBubble,
            )
          : cn(
              fullscreen ? "w-full" : "mr-2",
              "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
            ),
      )}
    >
      {m.role === "assistant" && (m.source || m.retryable) && (
        <span
          className={cn(
            "inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mb-1.5",
            m.retryable
              ? "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"
              : m.source === "local"
                ? t.badgeLocal
                : t.badgeAppy,
          )}
        >
          {m.retryable
            ? "Error"
            : m.source === "local"
              ? "Offline tip"
              : "Appy Buddy"}
        </span>
      )}
      <div
        className={cn(
          "prose prose-sm max-w-none dark:prose-invert",
          m.role === "user" && "prose-invert",
        )}
      >
        {m.role === "assistant" ? (
          <CollapsibleAssistantMarkdown content={m.content} />
        ) : (
          <VanillaMarkdownParser content={m.content} />
        )}
      </div>
    </div>
  );
}

/** Panel + chevron (expand affordance), similar to sidebar collapse icons */
function TutorFullscreenIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <line
        x1="9.25"
        y1="4.5"
        x2="9.25"
        y2="19.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M16 12h-3.5M14.5 10.5 16 12l-1.5 1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AppyTutorPanel({
  variant,
  academy,
  onDismiss,
}: {
  variant: "indigo" | "teal";
  academy: AcademyKind;
  /** Hide the docked column so main content can use full width (see `AppyTutorOpenTab`). */
  onDismiss?: () => void;
}) {
  const t = themeStyles[variant];
  const { settings } = useSettings();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [chats, setChats] = useState<SavedTutorChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  /** Docked width before opening fullscreen — restored on exit */
  const dockedWideRef = useRef(false);
  const [widePanel, setWidePanel] = useState(false);
  const [usageTotals, setUsageTotals] = useState<AppyTutorUsageTotals>(() =>
    loadAppyTutorUsageTotals(academy),
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  /** Latest active chat — avoids applying a finished request to the wrong thread after switch/new chat. */
  const activeChatIdRef = useRef<string | null>(null);

  const tutorModel: LargeLanguageModel = getAppyTutorPrimaryModel(
    settings ?? {},
  );

  /** Frameless macOS window: traffic lights sit top-left; fullscreen header must inset */
  const isMacClient = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Macintosh|Mac OS X|MacIntel/i.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    const { chats: loaded, activeChatId: active } = loadTutorChats(academy);
    if (loaded.length === 0) {
      const id = newChatId();
      const first: SavedTutorChat = {
        id,
        title: "New chat",
        messages: [],
        updatedAt: Date.now(),
      };
      saveTutorChats(academy, { chats: [first], activeChatId: id });
      setChats([first]);
      setActiveChatId(id);
      setMessages([]);
    } else {
      setChats(loaded);
      const resolved =
        active && loaded.some((c) => c.id === active) ? active : loaded[0].id;
      setActiveChatId(resolved);
      const cur = loaded.find((c) => c.id === resolved);
      setMessages((cur?.messages ?? []).map(fromStored));
    }
    hydratedRef.current = true;
  }, [academy]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const persistChats = useCallback(
    (nextChats: SavedTutorChat[], activeId: string | null) => {
      saveTutorChats(academy, { chats: nextChats, activeChatId: activeId });
    },
    [academy],
  );

  const commitActiveChat = useCallback(
    (msgs: TutorMessage[], chatId: string | null) => {
      if (!chatId || !hydratedRef.current) return;
      const stored = msgs.map(toStored);
      const firstUser = msgs.find((m) => m.role === "user");
      setChats((prev) => {
        const next = prev.map((ch) => {
          if (ch.id !== chatId) return ch;
          const title =
            firstUser != null
              ? makeChatTitleFromMessage(firstUser.content)
              : ch.title;
          return {
            ...ch,
            messages: stored,
            title: title || ch.title,
            updatedAt: Date.now(),
          };
        });
        persistChats(next, chatId);
        return next;
      });
    },
    [persistChats],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, fullscreen, widePanel]);

  /** Last docked column width; kept fresh while docked so fullscreen restore is reliable */
  useEffect(() => {
    if (!fullscreen) {
      dockedWideRef.current = widePanel;
    }
  }, [fullscreen, widePanel]);

  /** Keep badge in sync when usage updates elsewhere in the same tab (e.g. “Ask Appy” dialog). */
  useEffect(() => {
    const sync = () => setUsageTotals(loadAppyTutorUsageTotals(academy));
    window.addEventListener("appy-tutor-usage-changed", sync);
    return () => window.removeEventListener("appy-tutor-usage-changed", sync);
  }, [academy]);

  const enterFullscreen = useCallback(() => {
    dockedWideRef.current = widePanel;
    setFullscreen(true);
  }, [widePanel]);

  const exitFullscreen = useCallback(() => {
    const restoreWide = dockedWideRef.current;
    flushSync(() => {
      setFullscreen(false);
      setWidePanel(restoreWide);
    });
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, exitFullscreen]);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  const selectChat = useCallback(
    (id: string) => {
      if (id === activeChatId) return;
      activeChatIdRef.current = id;
      const stored = messages.map(toStored);
      const firstUser = messages.find((m) => m.role === "user");
      const next = chats.map((ch) =>
        ch.id === activeChatId
          ? {
              ...ch,
              messages: stored,
              title:
                firstUser != null
                  ? makeChatTitleFromMessage(firstUser.content)
                  : ch.title,
              updatedAt: Date.now(),
            }
          : ch,
      );
      const target = next.find((c) => c.id === id);
      persistChats(next, id);
      setChats(next);
      setMessages((target?.messages ?? []).map(fromStored));
      setActiveChatId(id);
    },
    [activeChatId, chats, messages, persistChats],
  );

  const startNewChat = useCallback(() => {
    const stored = messages.map(toStored);
    const firstUser = messages.find((m) => m.role === "user");
    const id = newChatId();
    activeChatIdRef.current = id;
    const newC: SavedTutorChat = {
      id,
      title: "New chat",
      messages: [],
      updatedAt: Date.now(),
    };
    setChats((prev) => {
      const flushed = prev.map((ch) =>
        ch.id === activeChatId
          ? {
              ...ch,
              messages: stored,
              title:
                firstUser != null
                  ? makeChatTitleFromMessage(firstUser.content)
                  : ch.title,
              updatedAt: Date.now(),
            }
          : ch,
      );
      const next = [newC, ...flushed];
      persistChats(next, id);
      return next;
    });
    setActiveChatId(id);
    setMessages([]);
    setInput("");
  }, [activeChatId, messages, persistChats]);

  const send = useCallback(
    async (opts?: { fromRetry?: boolean }) => {
      const requestChatId = activeChatIdRef.current;
      let q = input.trim();
      let afterUser: TutorMessage[];

      if (opts?.fromRetry) {
        const base = messages.slice(0, -1);
        const last = base[base.length - 1];
        if (!last || last.role !== "user") return;
        q = last.content.trim();
        if (!q || loading || !requestChatId) return;
        afterUser = base;
        setInput("");
      } else {
        if (!q || loading || !requestChatId) return;
        setInput("");
        const userMsg: TutorMessage = { role: "user", content: q };
        afterUser = [...messages, userMsg];
      }

      setMessages(afterUser);
      commitActiveChat(afterUser, requestChatId);
      setLoading(true);

      const historyForIpc = afterUser.map(({ role, content }) => ({
        role,
        content,
      }));
      try {
        const ipc = IpcClient.getInstance();
        const { answer, source, usage, retryable } = await ipc.academyAppyTutor({
          question: q,
          pageContext: pathname,
          academy,
          history: historyForIpc.slice(-12),
          model: tutorModel,
        });
        if (activeChatIdRef.current !== requestChatId) {
          return;
        }
        if (source === "cloud" && usage) {
          setUsageTotals(addAppyTutorUsage(usage, academy));
        }
        const assistantRetryable =
          retryable ??
          (source === "local" &&
            (answer.startsWith("Something went wrong") ||
              answer.startsWith("Request stopped") ||
              /reach the cloud/i.test(answer) ||
              /last error:/i.test(answer) ||
              /empty response from/i.test(answer) ||
              /could not reach|couldn\u2019t reach|couldn't reach/i.test(
                answer,
              )));
        const complete = [
          ...afterUser,
          {
            role: "assistant" as const,
            content: answer,
            source,
            ...(assistantRetryable ? { retryable: true as const } : {}),
          },
        ];
        setMessages(complete);
        commitActiveChat(complete, requestChatId);
      } catch (e) {
        if (activeChatIdRef.current !== requestChatId) {
          return;
        }
        const msg = e instanceof Error ? e.message : String(e);
        showError(msg);
        const errLine = [
          ...afterUser,
          {
            role: "assistant" as const,
            content: `Something went wrong: ${msg}`,
            source: "local" as const,
            retryable: true,
          },
        ];
        setMessages(errLine);
        commitActiveChat(errLine, requestChatId);
      } finally {
        setLoading(false);
      }
    },
    [
      academy,
      commitActiveChat,
      input,
      loading,
      messages,
      pathname,
      tutorModel,
    ],
  );

  const lastAssistantInThread = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i];
    }
    return undefined;
  }, [messages]);
  const tutorHasError = isTutorRetryableAssistant(lastAssistantInThread);

  const retryTutorAfterError = useCallback(() => {
    void send({ fromRetry: true });
  }, [send]);

  const stopTutor = useCallback(() => {
    void IpcClient.getInstance().academyAppyTutorAbort();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const shellBase =
    "bg-white dark:bg-gray-900 flex flex-col min-h-0 min-w-0 select-text border-gray-200 dark:border-gray-800";

  const dockedWidth = widePanel
    ? "w-[min(40rem,48%)] shrink-0 min-w-[18rem]"
    : "w-80 shrink-0";

  /** Fullscreen: traffic-light gutter + back column; main content column matches pickers */
  const fullscreenChromePad = isMacClient
    ? "pl-[3.5rem] pr-4 sm:pl-16 sm:pr-6"
    : "px-4 sm:px-6";
  const fullscreenBackCol = "w-8 shrink-0 flex justify-center";
  /** Fullscreen: one column fills the pane — do not use max-w-md (it left empty space on the right). */
  const fsMainCol = "flex-1 min-w-0 w-full flex flex-col gap-1";

  const panelChrome = (
    <>
      <div
        className={cn(
          "border-b border-gray-200 dark:border-gray-800 shrink-0 flex w-full min-w-0 flex-col",
          "sticky top-0 z-30 bg-white dark:bg-gray-900",
          !fullscreen && "gap-1.5 px-2 py-1.5",
          fullscreen && "shrink-0",
          t.headerBg,
        )}
      >
        {!fullscreen ? (
          <>
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 min-h-8">
                <Sparkles
                  className={cn(
                    "h-4 w-4 shrink-0",
                    variant === "indigo" ? "text-indigo-600" : "text-teal-600",
                  )}
                />
                <h2
                  className={cn(
                    "text-sm font-semibold leading-none tracking-tight flex items-baseline gap-1",
                    t.title,
                  )}
                >
                  <span className="opacity-80 font-medium">Appy</span>
                  <span className="font-bold">Buddy</span>
                </h2>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-lg",
                    t.iconBtn,
                    widePanel && "bg-black/5 dark:bg-white/10",
                  )}
                  onClick={() => setWidePanel((w) => !w)}
                  aria-label={
                    widePanel ? "Narrow Buddy panel" : "Wider Buddy panel"
                  }
                  title={widePanel ? "Narrow column" : "Wider column"}
                >
                  <Columns2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8 rounded-lg", t.iconBtn)}
                  onClick={enterFullscreen}
                  aria-label="Fullscreen Appy Buddy"
                  title="Fullscreen"
                >
                  <TutorFullscreenIcon className="h-4 w-4" />
                </Button>
                {onDismiss && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-gray-100",
                      t.iconBtn,
                    )}
                    onClick={onDismiss}
                    aria-label="Close Appy Buddy"
                    title="Close Buddy panel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1 w-full min-w-0">
              <AppyTutorChatsPicker
                chats={chats}
                activeChatId={activeChatId}
                onSelectChat={selectChat}
                onNewChat={startNewChat}
                fullWidth
              />
            </div>
          </>
        ) : (
          <div
            className={cn(
              "flex w-full min-w-0 gap-2 pb-1",
              isMacClient ? "pt-7" : "pt-2.5",
              fullscreenChromePad,
            )}
          >
            <div className={fullscreenBackCol}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 shrink-0 rounded-lg touch-manipulation",
                  t.iconBtn,
                )}
                onClick={exitFullscreen}
                aria-label="Back to docked Buddy panel"
                title="Back"
              >
                <PanelRightClose className="h-4 w-4" />
              </Button>
            </div>
            <div className={fsMainCol}>
              <div className="flex items-center justify-between gap-2 min-w-0 w-full">
                <div className="flex items-center gap-1.5 min-w-0 min-h-8">
                  <Sparkles
                    className={cn(
                      "h-4 w-4 shrink-0",
                      variant === "indigo"
                        ? "text-indigo-600"
                        : "text-teal-600",
                    )}
                  />
                  <h2
                    className={cn(
                      "text-sm font-semibold leading-none tracking-tight flex items-baseline gap-1",
                      t.title,
                    )}
                  >
                    <span className="opacity-80 font-medium">Appy</span>
                    <span className="font-bold">Buddy</span>
                  </h2>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-lg ring-2 ring-offset-0",
                      variant === "indigo"
                        ? "ring-indigo-400/60 text-indigo-700 dark:text-indigo-200"
                        : "ring-teal-400/60 text-teal-700 dark:text-teal-200",
                    )}
                    onClick={exitFullscreen}
                    aria-label="Exit fullscreen and restore panel size"
                    title="Exit fullscreen"
                  >
                    <TutorFullscreenIcon className="h-4 w-4" />
                  </Button>
                  {onDismiss && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-lg",
                        t.iconBtn,
                      )}
                      onClick={onDismiss}
                      aria-label="Close Appy Buddy"
                      title="Close Buddy panel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <AppyTutorChatsPicker
                chats={chats}
                activeChatId={activeChatId}
                onSelectChat={selectChat}
                onNewChat={startNewChat}
                fullWidth
              />
            </div>
          </div>
        )}
      </div>

      {!fullscreen ? (
        <>
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2.5 space-y-2"
          >
            {messages.length === 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-2">
                <MessageCircle className="h-4 w-4 shrink-0 mt-0.5 opacity-70" />
                <div className="space-y-2 min-w-0">
                  <p>
                    Ask a question or pick a chat above. Strong matches use{" "}
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      offline tips
                    </span>{" "}
                    first.
                  </p>
                  {academy === "learning" && (
                    <ul className="list-disc pl-3.5 space-y-1 text-[11px] leading-snug">
                      <li>
                        Try: “How do I remember what I read?” or “Plan 20 minutes
                        of practice for…”
                      </li>
                      <li>
                        Name a topic (e.g. Python basics) for a clearer study path.
                      </li>
                    </ul>
                  )}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <MessageBubble
                key={`${activeChatId}-${i}-${m.content.slice(0, 12)}`}
                m={m}
                t={t}
                fullscreen={false}
              />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-1">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                Thinking…
              </div>
            )}
          </div>
          <TutorStopRetryStrip
            loading={loading}
            showRetry={tutorHasError}
            onStop={stopTutor}
            onRetry={() => retryTutorAfterError()}
          />
        </>
      ) : (
        <div
          className={cn(
            "flex w-full min-w-0 flex-1 min-h-0 overflow-hidden gap-2",
            fullscreenChromePad,
          )}
        >
          <div className={fullscreenBackCol} aria-hidden />
          <div className="flex flex-1 min-w-0 min-h-0 flex-col">
            <div
              ref={scrollRef}
              className="flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden pt-1 pb-2 px-0 space-y-1.5"
            >
              {messages.length === 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-2">
                  <MessageCircle className="h-4 w-4 shrink-0 mt-0.5 opacity-70" />
                  <div className="space-y-2 min-w-0">
                    <p>
                      Ask a question or pick a chat above. Strong matches use{" "}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        offline tips
                      </span>{" "}
                      first.
                    </p>
                    {academy === "learning" && (
                      <ul className="list-disc pl-3.5 space-y-1 text-[11px] leading-snug">
                        <li>
                          Try: “How do I remember what I read?” or “Plan 20 minutes
                          of practice for…”
                        </li>
                        <li>
                          Name a topic (e.g. Python basics) for a clearer study
                          path.
                        </li>
                      </ul>
                    )}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <MessageBubble
                  key={`${activeChatId}-${i}-${m.content.slice(0, 12)}`}
                  m={m}
                  t={t}
                  fullscreen
                />
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-1">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Thinking…
                </div>
              )}
            </div>
            <TutorStopRetryStrip
              loading={loading}
              showRetry={tutorHasError}
              onStop={stopTutor}
              onRetry={() => retryTutorAfterError()}
            />
          </div>
        </div>
      )}

      {!fullscreen ? (
        <div
          className={cn(
            "border-t border-gray-200 dark:border-gray-800 shrink-0 space-y-2",
            "p-2",
          )}
        >
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/95 dark:bg-gray-900/70 p-2.5 space-y-2 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Buddy&apos;s model
            </div>
            <div className="flex items-center gap-2 w-full min-w-0">
              <div className="min-w-0 flex-1">
                <AppyTutorModelPicker fullWidth />
              </div>
              <AppyTutorTokensBadge totals={usageTotals} academyKind={academy} />
              <div className="flex shrink-0 items-center gap-0.5">
                {loading && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={stopTutor}
                    title="Stop"
                    aria-label="Stop"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </Button>
                )}
                {tutorHasError && !loading && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => retryTutorAfterError()}
                    title="Retry"
                    aria-label="Retry"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {tutorHasError && !loading && (
              <>
                <p className="text-[11px] text-gray-600 dark:text-gray-400">
                  Switch model if needed, then retry.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full gap-2 h-9"
                  onClick={() => retryTutorAfterError()}
                >
                  <RefreshCw className="h-4 w-4 shrink-0" />
                  Retry last question
                </Button>
              </>
            )}
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask Appy Buddy anything…"
            rows={widePanel ? 3 : 2}
            disabled={loading}
            className="text-sm resize-none min-h-[2.75rem] select-text"
          />
          <Button
            type="button"
            size="sm"
            className={cn("w-full gap-2", t.send)}
            disabled={loading || !input.trim()}
            onClick={() => void send()}
          >
            <Send className="h-4 w-4" />
            Send
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "border-t border-gray-200 dark:border-gray-800 shrink-0 flex w-full min-w-0 gap-2",
            fullscreenChromePad,
            "py-1.5",
          )}
        >
          <div className={fullscreenBackCol} aria-hidden />
          <div className="flex flex-1 min-w-0 w-full flex-col gap-2">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/95 dark:bg-gray-900/70 p-2.5 space-y-2 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Buddy&apos;s model
              </div>
              <div className="flex items-center gap-2 w-full min-w-0">
                <div className="min-w-0 flex-1">
                  <AppyTutorModelPicker fullWidth />
                </div>
                <AppyTutorTokensBadge totals={usageTotals} academyKind={academy} />
                <div className="flex shrink-0 items-center gap-0.5">
                  {loading && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={stopTutor}
                      title="Stop"
                      aria-label="Stop"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                    </Button>
                  )}
                  {tutorHasError && !loading && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => retryTutorAfterError()}
                      title="Retry"
                      aria-label="Retry"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {tutorHasError && !loading && (
                <>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400">
                    Switch model if needed, then retry.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full gap-2 h-9"
                    onClick={() => retryTutorAfterError()}
                  >
                    <RefreshCw className="h-4 w-4 shrink-0" />
                    Retry last question
                  </Button>
                </>
              )}
            </div>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask Appy Buddy anything…"
              rows={4}
              disabled={loading}
              className="text-sm resize-none min-h-[2.75rem] select-text w-full"
            />
            <Button
              type="button"
              size="sm"
              className={cn("w-full gap-2", t.send)}
              disabled={loading || !input.trim()}
              onClick={() => void send()}
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      )}
    </>
  );

  const fullscreenNode =
    fullscreen && typeof document !== "undefined" ? (
      createPortal(
        <div
          className={cn(
            shellBase,
            "fixed inset-0 z-[10000] flex min-h-0 h-dvh w-screen max-w-none flex-col border-0 bg-white shadow-2xl dark:bg-gray-900",
            "[-webkit-app-region:no-drag]",
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Appy Buddy fullscreen"
        >
          {panelChrome}
        </div>,
        document.body,
      )
    ) : null;

  return (
    <>
      {!fullscreen && (
        <aside
          className={cn(
            shellBase,
            "border-l",
            t.border,
            dockedWidth,
          )}
          aria-label="Appy Buddy"
        >
          {panelChrome}
        </aside>
      )}
      {fullscreenNode}
    </>
  );
}
