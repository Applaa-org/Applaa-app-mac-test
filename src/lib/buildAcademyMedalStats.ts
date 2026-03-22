import type { AcademyTrack } from "@/data/academyLessons";
import type { AcademyMedalStats } from "@/data/academyMedals";
import { getCompletedChallengeIds } from "@/lib/academyChallengeProgress";
import { getLocalLessonIds } from "@/lib/academyLessonLocal";
import type { AcademyProgressPayload } from "@/lib/academyProgressMerge";
import { getAcademyStreakStats } from "@/lib/academyStreak";

export function buildAcademyMedalStats(
  progress: AcademyProgressPayload | undefined,
  projects: Array<{ language: string }>,
): AcademyMedalStats {
  const projectsByLanguage = {
    python: 0,
    javascript: 0,
    react: 0,
    typescript: 0,
  };
  for (const p of projects) {
    const l = p.language as keyof typeof projectsByLanguage;
    if (l in projectsByLanguage) projectsByLanguage[l]++;
  }

  const lessonIdsByTrack: Record<AcademyTrack, string[]> = {
    html: getLocalLessonIds("html"),
    python: progress?.pythonCompleted ?? [],
    javascript: progress?.javascriptCompleted ?? [],
    react: getLocalLessonIds("react"),
    typescript: getLocalLessonIds("typescript"),
    ai: getLocalLessonIds("ai"),
  };

  return {
    streakBest: getAcademyStreakStats().best,
    projectCount: progress?.projectCount ?? 0,
    projectsByLanguage,
    challengeIdsDone: getCompletedChallengeIds(),
    lessonIdsByTrack,
  };
}
