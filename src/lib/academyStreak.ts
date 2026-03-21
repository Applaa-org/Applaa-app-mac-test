/**
 * Daily learning streak for AI Academy (renderer). Uses localStorage only.
 */

const STORAGE_KEY = "applaa-academy-streak:v1";

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

/** Call when the learner marks a lesson complete (once per calendar day updates streak). */
export function recordAcademyLessonComplete(): { current: number; best: number } {
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
