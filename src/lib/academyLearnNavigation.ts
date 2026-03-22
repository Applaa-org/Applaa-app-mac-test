import { ACADEMY_BASICS } from "@/data/academyBasics";
import { ACADEMY_LESSONS, type AcademyTrack } from "@/data/academyLessons";
import { getBasicsCompletedIds } from "@/lib/academyBasicsProgress";
import {
  getCompletedLessonIdsForTrack,
  type AcademyProgressPayload,
} from "@/lib/academyProgressMerge";

export type LearnSearch = { track: string; lessonId?: string; subTopicId?: string };

const CODE_ORDER: AcademyTrack[] = ["html", "python", "javascript", "react", "typescript", "ai"];

/** Next place to continue: unfinished basics first, then first incomplete lesson per track in curriculum order. */
export function getNextLearnSearch(progress: AcademyProgressPayload | undefined): LearnSearch {
  const basicsDone = new Set(getBasicsCompletedIds());
  const nextBasic = ACADEMY_BASICS.find((b) => !basicsDone.has(b.id));
  if (nextBasic) {
    return { track: "basics", lessonId: nextBasic.id };
  }

  for (const t of CODE_ORDER) {
    const lessons = ACADEMY_LESSONS[t];
    if (!lessons?.length) continue;
    const done = new Set(getCompletedLessonIdsForTrack(t, progress));
    const next = lessons.find((l) => !done.has(l.id));
    if (next) return { track: t, lessonId: next.id };
  }

  const first = ACADEMY_LESSONS.html[0];
  return first ? { track: "html", lessonId: first.id } : { track: "basics" };
}

export function getNextLessonForTrack(
  track: AcademyTrack,
  progress: AcademyProgressPayload | undefined,
): LearnSearch {
  const lessons = ACADEMY_LESSONS[track];
  if (!lessons?.length) return { track };
  const done = new Set(getCompletedLessonIdsForTrack(track, progress));
  const next = lessons.find((l) => !done.has(l.id));
  if (next) return { track, lessonId: next.id };
  return { track, lessonId: lessons[0].id };
}

export function getNextBasicsLessonSearch(): LearnSearch {
  const basicsDone = new Set(getBasicsCompletedIds());
  const next = ACADEMY_BASICS.find((b) => !basicsDone.has(b.id));
  if (next) return { track: "basics", lessonId: next.id };
  const first = ACADEMY_LESSONS.html[0];
  return first ? { track: "html", lessonId: first.id } : { track: "basics" };
}

export function motivationForProgress(label: string, done: number, total: number): string {
  if (total <= 0) return `Open ${label} when you're ready.`;
  if (done === 0) return `Start your first ${label} lesson.`;
  if (done >= total) {
    return `All ${label} lessons complete — review or choose another track.`;
  }
  if (done < Math.ceil(total / 2)) {
    return `${label}: ${done}/${total} — good progress. Continue on the next topic.`;
  }
  return `Strong progress in ${label} — ${done}/${total}. Go to the next lesson.`;
}
