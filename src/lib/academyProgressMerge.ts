import { ACADEMY_LESSONS, type AcademyTrack } from "@/data/academyLessons";
import { basicsCompletedCount, basicsTotalCount } from "@/lib/academyBasicsProgress";
import { getLocalLessonIds } from "@/lib/academyLessonLocal";

export type AcademyProgressPayload = {
  pythonCompleted: string[];
  javascriptCompleted: string[];
  projectCount: number;
};

const CODE_TRACKS: AcademyTrack[] = ["html", "python", "javascript", "react", "typescript", "ai"];

export function getCompletedLessonIdsForTrack(
  track: AcademyTrack,
  progress: AcademyProgressPayload | undefined,
): string[] {
  if (track === "python") return progress?.pythonCompleted ?? [];
  if (track === "javascript") return progress?.javascriptCompleted ?? [];
  return getLocalLessonIds(track);
}

export function totalLessonsAcrossAllTracks(): number {
  return CODE_TRACKS.reduce((sum, t) => sum + (ACADEMY_LESSONS[t]?.length ?? 0), 0);
}

export function totalCompletedLessonsAllTracks(
  progress: AcademyProgressPayload | undefined,
): number {
  return CODE_TRACKS.reduce(
    (sum, t) => sum + getCompletedLessonIdsForTrack(t, progress).length,
    0,
  );
}

export function totalLessonsIncludingBasics(): number {
  return totalLessonsAcrossAllTracks() + basicsTotalCount();
}

export function totalCompletedLessonsIncludingBasics(
  progress: AcademyProgressPayload | undefined,
): number {
  return totalCompletedLessonsAllTracks(progress) + basicsCompletedCount();
}
