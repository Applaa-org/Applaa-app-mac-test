/**
 * Tracks which lessons were opened (read) — localStorage only.
 * Separate from "Mark as complete" (full completion).
 */

import type { AcademyTrack } from "@/data/academyLessons";

const STORAGE_KEY = "academy-lesson-visited:v1";

type Store = Partial<Record<AcademyTrack, string[]>>;

function readAll(): Store {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

function writeAll(store: Store) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Call when the learner opens a lesson page. */
export function markLessonVisited(track: AcademyTrack, lessonId: string): void {
  const all = readAll();
  const set = new Set(all[track] ?? []);
  if (set.has(lessonId)) return;
  set.add(lessonId);
  writeAll({ ...all, [track]: [...set] });
  window.dispatchEvent(new CustomEvent("academy:lesson-visit-updated", { detail: { track, lessonId } }));
}

export function isLessonVisited(track: AcademyTrack, lessonId: string): boolean {
  return (readAll()[track] ?? []).includes(lessonId);
}
