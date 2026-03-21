/** Persist chosen subjects across Curriculum and Year 11 Schedule (localStorage). */

const STORAGE_KEY = "learning-academy:selected-subject-ids:v1";

export function loadLearningAcademySubjectIds(
  allIds: string[],
): Set<string> {
  if (typeof window === "undefined" || allIds.length === 0) {
    return new Set(allIds);
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set(allIds);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return new Set(allIds);
    }
    const allowed = new Set(allIds);
    const next = new Set<string>();
    for (const id of parsed) {
      if (typeof id === "string" && allowed.has(id)) next.add(id);
    }
    return next.size > 0 ? next : new Set(allIds);
  } catch {
    return new Set(allIds);
  }
}

export function saveLearningAcademySubjectIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore quota / private mode */
  }
}
