/**
 * Basics track completion (localStorage only).
 */

import { ACADEMY_BASICS } from "@/data/academyBasics";

const STORAGE_KEY = "academy-basics-done:v1";

export function getBasicsCompletedIds(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function addBasicsLessonCompleted(lessonId: string): void {
  if (typeof localStorage === "undefined") return;
  const s = new Set(getBasicsCompletedIds());
  s.add(lessonId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
  window.dispatchEvent(new CustomEvent("academy:basics-updated"));
}

export function basicsTotalCount(): number {
  return ACADEMY_BASICS.length;
}

export function basicsCompletedCount(): number {
  return getBasicsCompletedIds().length;
}
