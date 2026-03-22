/**
 * Lesson progress bar colors: yellow (not started) → blue (in progress) → green (complete).
 * Avoid red for progress.
 */

export function lessonProgressFillClass(done: number, total: number): string {
  if (total <= 0) return "bg-amber-300 dark:bg-amber-500/90";
  if (done >= total) return "bg-emerald-500 dark:bg-emerald-400";
  if (done <= 0) return "bg-amber-300 dark:bg-amber-500/90";
  return "bg-blue-500 dark:bg-blue-400";
}

export function lessonProgressCountClass(done: number, total: number): string {
  if (total <= 0) return "text-amber-700 dark:text-amber-300";
  if (done >= total) return "text-emerald-700 dark:text-emerald-300";
  if (done <= 0) return "text-amber-700 dark:text-amber-300";
  return "text-blue-700 dark:text-blue-300";
}
