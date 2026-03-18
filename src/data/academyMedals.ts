/**
 * Medals / achievements for kids – fun goals to unlock.
 */

export interface AcademyMedal {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Unlocked when this condition is true */
  check: (stats: { pythonCompleted: number; javascriptCompleted: number; projectCount: number; pythonTotal: number; jsTotal: number }) => boolean;
}

export const ACADEMY_MEDALS: AcademyMedal[] = [
  {
    id: "first-lesson",
    name: "First Steps",
    emoji: "🌟",
    description: "Complete your first lesson",
    check: (s) => s.pythonCompleted + s.javascriptCompleted >= 1,
  },
  {
    id: "five-lessons",
    name: "Star Learner",
    emoji: "⭐",
    description: "Complete 5 lessons",
    check: (s) => s.pythonCompleted + s.javascriptCompleted >= 5,
  },
  {
    id: "ten-lessons",
    name: "Super Coder",
    emoji: "🚀",
    description: "Complete 10 lessons",
    check: (s) => s.pythonCompleted + s.javascriptCompleted >= 10,
  },
  {
    id: "python-pro",
    name: "Python Pro",
    emoji: "🐍",
    description: "Finish all Python lessons",
    check: (s) => s.pythonTotal > 0 && s.pythonCompleted >= s.pythonTotal,
  },
  {
    id: "js-pro",
    name: "JavaScript Hero",
    emoji: "🟨",
    description: "Finish all JavaScript lessons",
    check: (s) => s.jsTotal > 0 && s.javascriptCompleted >= s.jsTotal,
  },
  {
    id: "first-project",
    name: "First Project",
    emoji: "🏆",
    description: "Build your first project",
    check: (s) => s.projectCount >= 1,
  },
  {
    id: "three-projects",
    name: "Builder",
    emoji: "🔨",
    description: "Build 3 projects",
    check: (s) => s.projectCount >= 3,
  },
  {
    id: "five-projects",
    name: "Creator",
    emoji: "🎨",
    description: "Build 5 projects",
    check: (s) => s.projectCount >= 5,
  },
];

export function getUnlockedMedals(stats: {
  pythonCompleted: number;
  javascriptCompleted: number;
  projectCount: number;
  pythonTotal: number;
  jsTotal: number;
}) {
  return ACADEMY_MEDALS.filter((m) => m.check(stats));
}
