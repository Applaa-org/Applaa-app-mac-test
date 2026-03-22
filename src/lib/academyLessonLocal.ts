/**
 * Lesson completion for tracks not stored in SQLite (html, react, typescript, ai).
 * Python and JavaScript use IPC / academyGetProgress.
 */

import type { AcademyTrack } from "@/data/academyLessons";

const key = (track: string) => `academy-lesson-done:${track}`;

export function getLocalLessonIds(track: AcademyTrack): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(track));
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function addLocalLessonCompleted(track: AcademyTrack, lessonId: string): void {
  if (typeof localStorage === "undefined") return;
  const s = new Set(getLocalLessonIds(track));
  s.add(lessonId);
  localStorage.setItem(key(track), JSON.stringify([...s]));
  window.dispatchEvent(new CustomEvent("academy:lesson-local-updated", { detail: { track } }));
}
