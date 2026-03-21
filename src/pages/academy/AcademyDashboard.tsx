import React from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { BookOpen, Code2, FolderKanban, ArrowRight, Trophy, Sparkles, Flame } from "lucide-react";
import { ACADEMY_LESSONS } from "@/data/academyLessons";
import { ACADEMY_MEDALS, getUnlockedMedals } from "@/data/academyMedals";
import { getAcademyStreakStats } from "@/lib/academyStreak";

// Order: Web, Python, JS, React, TypeScript, AI (next after TypeScript). Single source: lessons in Learn only.
const TRACKS: { id: keyof typeof ACADEMY_LESSONS; label: string; emoji: string; color: string }[] = [
  { id: "html", label: "Web (HTML/CSS)", emoji: "📄", color: "bg-sky-500" },
  { id: "python", label: "Python", emoji: "🐍", color: "bg-amber-500" },
  { id: "javascript", label: "JavaScript", emoji: "🟨", color: "bg-yellow-500" },
  { id: "react", label: "React JS", emoji: "⚛️", color: "bg-cyan-500" },
  { id: "typescript", label: "TypeScript", emoji: "📘", color: "bg-blue-500" },
  { id: "ai", label: "AI", emoji: "🤖", color: "bg-violet-500" },
];

export function AcademyDashboard() {
  const ipc = IpcClient.getInstance();
  const { data: progress } = useQuery({
    queryKey: ["academy-progress"],
    queryFn: () => ipc.academyGetProgress(),
  });

  const pythonTotal = ACADEMY_LESSONS.python.length;
  const jsTotal = ACADEMY_LESSONS.javascript.length;
  const pythonDone = progress?.pythonCompleted?.length ?? 0;
  const jsDone = progress?.javascriptCompleted?.length ?? 0;
  const projectCount = progress?.projectCount ?? 0;
  const streakStats = getAcademyStreakStats();

  const stats = {
    pythonCompleted: pythonDone,
    javascriptCompleted: jsDone,
    projectCount,
    pythonTotal,
    jsTotal,
    streakBest: streakStats.best,
  };
  const unlockedMedals = getUnlockedMedals(stats);

  const getDone = (track: keyof typeof ACADEMY_LESSONS) => {
    if (track === "python") return pythonDone;
    if (track === "javascript") return jsDone;
    return 0;
  };
  const getTotal = (track: keyof typeof ACADEMY_LESSONS) => ACADEMY_LESSONS[track]?.length ?? 0;

  return (
    <div className="p-6 w-full max-w-[1600px] mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
        <Sparkles className="h-7 w-7 text-amber-500" />
        Your Progress
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Start with Web, then Python, JavaScript, React, and TypeScript. Basics to expert – all lessons live in Learn (no duplication).
      </p>

      {(streakStats.current > 0 || streakStats.best > 0) && (
        <div className="rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50/80 dark:bg-orange-950/25 px-4 py-3 mb-6 flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
          <Flame className="h-5 w-5 text-orange-500 shrink-0" />
          <span>
            Learning streak: <strong>{streakStats.current}</strong> day
            {streakStats.current === 1 ? "" : "s"} (best: {streakStats.best})
          </span>
        </div>
      )}

      {unlockedMedals.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 p-4 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Your medals
          </h2>
          <div className="flex flex-wrap gap-3">
            {ACADEMY_MEDALS.map((m) => {
              const unlocked = unlockedMedals.some((u) => u.id === m.id);
              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                    unlocked
                      ? "bg-white dark:bg-gray-800 border-amber-300 dark:border-amber-700 shadow-sm"
                      : "bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60"
                  }`}
                  title={m.description}
                >
                  <span className="text-2xl">{unlocked ? m.emoji : "🔒"}</span>
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{m.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{m.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Learning tracks (lessons in Learn)
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {TRACKS.map(({ id, label, emoji, color }) => {
          const total = getTotal(id);
          const done = getDone(id);
          const pct = total ? Math.round((done / total) * 100) : 0;
          return (
            <div
              key={id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{emoji}</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{label}</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {done} / {total} lessons
              </p>
              <Link
                to="/academy/learn"
                search={{ track: id }}
                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-2"
              >
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm mb-8">
        <div className="flex items-center gap-2 mb-3">
          <FolderKanban className="h-5 w-5 text-emerald-500" />
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            Projects built
          </span>
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {projectCount}
        </p>
        <Link
          to="/academy/projects"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-2"
        >
          View projects <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/academy/learn"
          search={{ track: "basics" }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-md"
        >
          <BookOpen className="h-4 w-4" />
          Start with Basics
        </Link>
        <Link
          to="/academy/learn"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 shadow-md"
        >
          <Sparkles className="h-4 w-4" />
          All lessons (Web → Python → JS → React → TS)
        </Link>
        <Link
          to="/academy/playground"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <Code2 className="h-4 w-4" />
          Playground
        </Link>
      </div>
    </div>
  );
}
