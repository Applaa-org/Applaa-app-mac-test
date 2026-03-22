/**
 * Medals / achievements — goals unlock from lesson progress, challenges, projects, and streaks.
 */

import { ACADEMY_LESSONS, type AcademyTrack } from "./academyLessons";
import { ACADEMY_CHALLENGES } from "./academyChallenges";
import { basicsCompletedCount } from "@/lib/academyBasicsProgress";

const CODE_TRACKS: AcademyTrack[] = ["html", "python", "javascript", "react", "typescript", "ai"];

export interface AcademyMedalStats {
  streakBest: number;
  projectCount: number;
  projectsByLanguage: {
    python: number;
    javascript: number;
    react: number;
    typescript: number;
  };
  challengeIdsDone: Set<string>;
  /** Completed lesson IDs per track (merge server + local). */
  lessonIdsByTrack: Record<AcademyTrack, string[]>;
}

function allLessonsCompleteInTrack(track: AcademyTrack, completedIds: string[]): boolean {
  const lessons = ACADEMY_LESSONS[track];
  if (!lessons?.length) return false;
  const set = new Set(completedIds);
  return lessons.every((l) => set.has(l.id));
}

function allLessonsCompleteAllTracks(s: AcademyMedalStats): boolean {
  return CODE_TRACKS.every((t) => allLessonsCompleteInTrack(t, s.lessonIdsByTrack[t] ?? []));
}

function allChallengesDone(s: AcademyMedalStats): boolean {
  return ACADEMY_CHALLENGES.every((c) => s.challengeIdsDone.has(c.id));
}

function totalLessonsCompletedCount(s: AcademyMedalStats): number {
  const code = CODE_TRACKS.reduce((sum, t) => sum + (s.lessonIdsByTrack[t]?.length ?? 0), 0);
  return code + basicsCompletedCount();
}

function challengesDoneForTrack(track: AcademyTrack, s: AcademyMedalStats): boolean {
  return ACADEMY_CHALLENGES.filter((c) => c.track === track).every((c) => s.challengeIdsDone.has(c.id));
}

export interface AcademyMedal {
  id: string;
  name: string;
  emoji: string;
  description: string;
  check: (stats: AcademyMedalStats) => boolean;
}

export const ACADEMY_MEDALS: AcademyMedal[] = [
  {
    id: "learner-5",
    name: "Learner",
    emoji: "📚",
    description: "Complete 5 lessons (any language)",
    check: (s) => totalLessonsCompletedCount(s) >= 5,
  },
  {
    id: "star-learner",
    name: "Star Learner",
    emoji: "⭐",
    description: "Complete every lesson in all tracks (Web, Python, JavaScript, React, TypeScript, AI)",
    check: (s) => allLessonsCompleteAllTracks(s),
  },
  {
    id: "super-coder",
    name: "Super Coder",
    emoji: "🚀",
    description: "Complete all lessons and every coding challenge",
    check: (s) => allLessonsCompleteAllTracks(s) && allChallengesDone(s),
  },
  {
    id: "python-hero",
    name: "Python Hero",
    emoji: "🐍",
    description: "Finish all Python lessons, all Python challenges, and build 10 Python projects",
    check: (s) =>
      allLessonsCompleteInTrack("python", s.lessonIdsByTrack.python ?? []) &&
      challengesDoneForTrack("python", s) &&
      s.projectsByLanguage.python >= 10,
  },
  {
    id: "javascript-hero",
    name: "JavaScript Hero",
    emoji: "🟨",
    description: "Finish all JavaScript lessons, all JS challenges, and build 10 JavaScript projects",
    check: (s) =>
      allLessonsCompleteInTrack("javascript", s.lessonIdsByTrack.javascript ?? []) &&
      challengesDoneForTrack("javascript", s) &&
      s.projectsByLanguage.javascript >= 10,
  },
  {
    id: "react-hero",
    name: "React JS Hero",
    emoji: "⚛️",
    description: "Finish all React lessons, all React challenges, and build 10 React projects",
    check: (s) =>
      allLessonsCompleteInTrack("react", s.lessonIdsByTrack.react ?? []) &&
      challengesDoneForTrack("react", s) &&
      s.projectsByLanguage.react >= 10,
  },
  {
    id: "typescript-hero",
    name: "TypeScript Hero",
    emoji: "📘",
    description: "Finish all TypeScript lessons, all TypeScript challenges, and build 10 TypeScript projects",
    check: (s) =>
      allLessonsCompleteInTrack("typescript", s.lessonIdsByTrack.typescript ?? []) &&
      challengesDoneForTrack("typescript", s) &&
      s.projectsByLanguage.typescript >= 10,
  },
  {
    id: "first-project",
    name: "First Project",
    emoji: "🏆",
    description: "Build your first project",
    check: (s) => s.projectCount >= 1,
  },
  {
    id: "creator-10",
    name: "Creator",
    emoji: "🎨",
    description: "Complete 10 projects (any language)",
    check: (s) => s.projectCount >= 10,
  },
  {
    id: "streak-4",
    name: "On a Roll",
    emoji: "🔥",
    description: "Reach a 4-day learning streak",
    check: (s) => s.streakBest >= 4,
  },
  {
    id: "streak-7",
    name: "Week Warrior",
    emoji: "📅",
    description: "Reach a 7-day learning streak",
    check: (s) => s.streakBest >= 7,
  },
  {
    id: "month-warrior",
    name: "Month Warrior",
    emoji: "🗓️",
    description: "Reach a 30-day learning streak",
    check: (s) => s.streakBest >= 30,
  },
];

export function getUnlockedMedals(stats: AcademyMedalStats): AcademyMedal[] {
  return ACADEMY_MEDALS.filter((m) => m.check(stats));
}
