import { recordAcademyActivityDay } from "@/lib/academyStreak";

const STORAGE_KEY = "academy-challenges-completed";

export function getCompletedChallengeIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x) => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function setChallengeCompleted(id: string, completed: boolean): void {
  const s = getCompletedChallengeIds();
  if (completed) {
    s.add(id);
    recordAcademyActivityDay();
  } else s.delete(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
}

export function isChallengeCompleted(id: string): boolean {
  return getCompletedChallengeIds().has(id);
}
