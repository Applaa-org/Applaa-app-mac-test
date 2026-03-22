/**
 * Daily learning streak for AI Academy (renderer). Uses localStorage only.
 */

const STORAGE_KEY = "applaa-academy-streak:v1";
const ACTIVITY_DATES_KEY = "applaa-academy-activity-dates:v1";
/** ISO date → number of lessons marked complete that day (for activity hover). */
const ACTIVITY_LESSON_COUNTS_KEY = "applaa-academy-activity-lesson-counts:v1";
/** ISO date → { trackKey → count } for hover breakdown (Python, JS, …). */
const ACTIVITY_LESSON_BY_TRACK_KEY = "applaa-academy-lesson-by-track:v1";
/** ISO date → list of { track, lesson title } for rich hover (order = completion order). */
const ACTIVITY_LESSON_DETAILS_KEY = "applaa-academy-activity-lesson-details:v1";
const MAX_LESSON_ROWS_PER_DAY = 48;

const TRACK_BREAKDOWN_LABELS: Record<string, string> = {
  basics: "Basics",
  html: "Web (HTML)",
  python: "Python",
  javascript: "JavaScript",
  react: "React",
  typescript: "TypeScript",
  ai: "AI",
  cpp: "C++",
};

type StreakState = {
  lastDate: string;
  streak: number;
  maxStreak: number;
};

function read(): StreakState {
  if (typeof window === "undefined") {
    return { lastDate: "", streak: 0, maxStreak: 0 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lastDate: "", streak: 0, maxStreak: 0 };
    const p = JSON.parse(raw) as Partial<StreakState>;
    return {
      lastDate: typeof p.lastDate === "string" ? p.lastDate : "",
      streak: typeof p.streak === "number" ? p.streak : 0,
      maxStreak: typeof p.maxStreak === "number" ? p.maxStreak : 0,
    };
  } catch {
    return { lastDate: "", streak: 0, maxStreak: 0 };
  }
}

function write(s: StreakState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/** Record that the learner was active today (lesson, challenge, etc.) — for calendar ticks. */
export function recordAcademyActivityDay(): void {
  if (typeof localStorage === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(ACTIVITY_DATES_KEY);
    const arr: string[] = raw ? (JSON.parse(raw) as string[]).filter((x) => typeof x === "string") : [];
    if (!arr.includes(today)) {
      arr.push(today);
      arr.sort();
      const trimmed = arr.slice(-120);
      localStorage.setItem(ACTIVITY_DATES_KEY, JSON.stringify(trimmed));
    }
  } catch {
    localStorage.setItem(ACTIVITY_DATES_KEY, JSON.stringify([today]));
  }
}

export function getAcademyActivityDates(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(ACTIVITY_DATES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

/** Increment lesson completions for today (dashboard activity hover). */
export function recordLessonMarkedCompleteForDay(): void {
  if (typeof localStorage === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(ACTIVITY_LESSON_COUNTS_KEY);
    const map: Record<string, number> =
      raw && typeof raw === "string" ? (JSON.parse(raw) as Record<string, number>) : {};
    map[today] = (map[today] ?? 0) + 1;
    const keys = Object.keys(map).sort();
    const trimmed = keys.slice(-120).reduce(
      (acc, k) => {
        acc[k] = map[k] ?? 0;
        return acc;
      },
      {} as Record<string, number>,
    );
    localStorage.setItem(ACTIVITY_LESSON_COUNTS_KEY, JSON.stringify(trimmed));
  } catch {
    localStorage.setItem(ACTIVITY_LESSON_COUNTS_KEY, JSON.stringify({ [today]: 1 }));
  }
}

export function getLessonCompletionsCountForDate(isoDate: string): number {
  if (typeof localStorage === "undefined") return 0;
  try {
    const raw = localStorage.getItem(ACTIVITY_LESSON_COUNTS_KEY);
    if (!raw) return 0;
    const map = JSON.parse(raw) as Record<string, number>;
    return typeof map[isoDate] === "number" ? map[isoDate] : 0;
  } catch {
    return 0;
  }
}

/** Call when a lesson is marked complete (after recordAcademyLessonComplete). trackKey: basics | html | python | … */
export function recordLessonCompletionByTrack(trackKey: string): void {
  if (typeof localStorage === "undefined" || !trackKey.trim()) return;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(ACTIVITY_LESSON_BY_TRACK_KEY);
    type Outer = Record<string, Record<string, number>>;
    const outer: Outer = raw && typeof raw === "string" ? (JSON.parse(raw) as Outer) : {};
    if (!outer[today]) outer[today] = {};
    outer[today][trackKey] = (outer[today][trackKey] ?? 0) + 1;
    const keys = Object.keys(outer).sort();
    const trimmed = keys.slice(-120).reduce((acc, k) => {
      acc[k] = outer[k] ?? {};
      return acc;
    }, {} as Outer);
    localStorage.setItem(ACTIVITY_LESSON_BY_TRACK_KEY, JSON.stringify(trimmed));
  } catch {
    localStorage.setItem(
      ACTIVITY_LESSON_BY_TRACK_KEY,
      JSON.stringify({ [today]: { [trackKey]: 1 } }),
    );
  }
}

export function getLessonBreakdownForDate(isoDate: string): { label: string; count: number }[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_LESSON_BY_TRACK_KEY);
    if (!raw) return [];
    const outer = JSON.parse(raw) as Record<string, Record<string, number>>;
    const day = outer[isoDate];
    if (!day || typeof day !== "object") return [];
    return Object.entries(day)
      .filter(([, n]) => typeof n === "number" && n > 0)
      .map(([k, n]) => ({
        label: TRACK_BREAKDOWN_LABELS[k] ?? k,
        count: n as number,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    return [];
  }
}

/** Append one lesson title for today (call when marking a lesson complete). */
export function recordLessonCompletionDetail(trackKey: string, lessonTitle: string): void {
  if (typeof localStorage === "undefined" || !trackKey.trim()) return;
  const today = new Date().toISOString().slice(0, 10);
  const title = (lessonTitle || "Lesson").trim().slice(0, 220);
  type Row = { t: string; title: string };
  type Outer = Record<string, Row[]>;
  try {
    const raw = localStorage.getItem(ACTIVITY_LESSON_DETAILS_KEY);
    const outer: Outer = raw && typeof raw === "string" ? (JSON.parse(raw) as Outer) : {};
    if (!outer[today]) outer[today] = [];
    outer[today].push({ t: trackKey, title });
    if (outer[today].length > MAX_LESSON_ROWS_PER_DAY) {
      outer[today] = outer[today].slice(-MAX_LESSON_ROWS_PER_DAY);
    }
    const keys = Object.keys(outer).sort();
    const trimmed = keys.slice(-120).reduce((acc, k) => {
      acc[k] = outer[k] ?? [];
      return acc;
    }, {} as Outer);
    localStorage.setItem(ACTIVITY_LESSON_DETAILS_KEY, JSON.stringify(trimmed));
  } catch {
    localStorage.setItem(
      ACTIVITY_LESSON_DETAILS_KEY,
      JSON.stringify({ [today]: [{ t: trackKey, title }] }),
    );
  }
}

export function getLessonCompletionDetailsForDate(isoDate: string): { trackLabel: string; title: string }[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_LESSON_DETAILS_KEY);
    if (!raw) return [];
    const outer = JSON.parse(raw) as Record<string, { t: string; title: string }[]>;
    const rows = outer[isoDate];
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((r) => r && typeof r.t === "string" && typeof r.title === "string")
      .map((r) => ({
        trackLabel: TRACK_BREAKDOWN_LABELS[r.t] ?? r.t,
        title: r.title,
      }));
  } catch {
    return [];
  }
}

/** Human-readable date for tooltips (local timezone). */
export function formatActivityDayHeading(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Tooltip for calendar cells: per-language counts + total. */
export function formatActivityDayTooltip(isoDate: string): string {
  const total = getLessonCompletionsCountForDate(isoDate);
  const breakdown = getLessonBreakdownForDate(isoDate);
  const details = getLessonCompletionDetailsForDate(isoDate);
  const activity = getAcademyActivityDates().has(isoDate);
  const head = formatActivityDayHeading(isoDate);
  const detailBlock =
    details.length > 0
      ? `\n${details.map((x) => `• ${x.trackLabel}: ${x.title}`).join("\n")}\n`
      : "";
  const lines = breakdown.map((x) => `${x.label}: ${x.count}`).join("\n");
  if (details.length > 0) {
    return `${head}${detailBlock}\n—\n${lines}\n—\nTotal: ${total} lesson(s)${
      activity && total === 0 ? "\n(Other activity that day.)" : ""
    }`;
  }
  if (breakdown.length > 0) {
    return `${head}\n${lines}\n—\nTotal: ${total} lesson(s)${
      activity && total === 0 ? "\n(Other activity that day.)" : ""
    }`;
  }
  if (total > 0) return `${head}\nTotal: ${total} lesson(s)`;
  if (activity) return `${head}\nNo lesson completions logged\n(Other activity recorded.)`;
  return `${head}\nNo activity`;
}

/** Call when the learner marks a lesson complete (once per calendar day updates streak). */
export function recordAcademyLessonComplete(): { current: number; best: number } {
  recordAcademyActivityDay();
  recordLessonMarkedCompleteForDay();
  const today = new Date().toISOString().slice(0, 10);
  const prev = read();

  if (prev.lastDate === today) {
    return {
      current: prev.streak,
      best: Math.max(prev.maxStreak, prev.streak),
    };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);

  let streak: number;
  if (prev.lastDate === "") {
    streak = 1;
  } else if (prev.lastDate === yStr) {
    streak = prev.streak + 1;
  } else {
    streak = 1;
  }

  const maxStreak = Math.max(prev.maxStreak, streak);
  const next = { lastDate: today, streak, maxStreak };
  write(next);
  return { current: streak, best: maxStreak };
}

export function getAcademyStreakStats(): { current: number; best: number } {
  const s = read();
  return {
    current: s.streak,
    best: Math.max(s.maxStreak, s.streak),
  };
}
