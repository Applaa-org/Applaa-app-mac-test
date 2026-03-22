import React, { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import {
  BookOpen,
  Code2,
  FolderKanban,
  ArrowRight,
  Trophy,
  Sparkles,
  Flame,
  Target,
  CalendarDays,
} from "lucide-react";
import { ACADEMY_LESSONS, type AcademyTrack } from "@/data/academyLessons";
import { ACADEMY_CHALLENGES } from "@/data/academyChallenges";
import { ACADEMY_PROJECT_TEMPLATES } from "@/data/academyProjects";
import { ACADEMY_MEDALS, getUnlockedMedals } from "@/data/academyMedals";
import {
  getAcademyStreakStats,
  getAcademyActivityDates,
  getLessonCompletionsCountForDate,
  getLessonBreakdownForDate,
  getLessonCompletionDetailsForDate,
  formatActivityDayHeading,
} from "@/lib/academyStreak";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { lessonProgressFillClass } from "@/lib/academyProgressColor";
import { getCompletedChallengeIds } from "@/lib/academyChallengeProgress";
import {
  getCompletedLessonIdsForTrack,
  totalLessonsIncludingBasics,
  totalCompletedLessonsIncludingBasics,
} from "@/lib/academyProgressMerge";
import { basicsCompletedCount, basicsTotalCount } from "@/lib/academyBasicsProgress";
import {
  getNextLearnSearch,
  getNextLessonForTrack,
  getNextBasicsLessonSearch,
  motivationForProgress,
} from "@/lib/academyLearnNavigation";
import { buildAcademyMedalStats } from "@/lib/buildAcademyMedalStats";

const TRACKS: { id: keyof typeof ACADEMY_LESSONS; label: string; emoji: string; color: string }[] = [
  { id: "html", label: "Web (HTML/CSS)", emoji: "📄", color: "bg-sky-500" },
  { id: "python", label: "Python", emoji: "🐍", color: "bg-amber-500" },
  { id: "javascript", label: "JavaScript", emoji: "🟨", color: "bg-yellow-500" },
  { id: "react", label: "React JS", emoji: "⚛️", color: "bg-cyan-500" },
  { id: "typescript", label: "TypeScript", emoji: "📘", color: "bg-blue-500" },
  { id: "ai", label: "AI", emoji: "🤖", color: "bg-violet-500" },
];

const DASHBOARD_TRACK_CARDS: Array<
  | { kind: "basics"; label: string; emoji: string; color: string }
  | { kind: "code"; id: keyof typeof ACADEMY_LESSONS; label: string; emoji: string; color: string }
> = [
  { kind: "basics", label: "Basics", emoji: "🌟", color: "bg-rose-500" },
  ...TRACKS.map((t) => ({ kind: "code" as const, ...t })),
];

function LearningActivityDayHoverContent({ isoDate }: { isoDate: string }) {
  const details = getLessonCompletionDetailsForDate(isoDate);
  const breakdown = getLessonBreakdownForDate(isoDate);
  const total = getLessonCompletionsCountForDate(isoDate);
  const activity = getAcademyActivityDates().has(isoDate);
  const heading = formatActivityDayHeading(isoDate);
  return (
    <div className="space-y-2 max-w-[min(22rem,calc(100vw-2rem))]">
      <p className="font-semibold text-gray-100 text-sm">{heading}</p>
      {details.length > 0 ? (
        <ul className="list-none space-y-1.5 text-[11px] leading-snug text-gray-200 border-t border-gray-700/80 pt-2">
          {details.map((d, i) => (
            <li key={`${d.trackLabel}-${i}`}>
              <span className="text-indigo-300 font-medium">{d.trackLabel}</span>
              <span className="text-gray-500"> — </span>
              <span>{d.title}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {breakdown.length > 0 ? (
        <p className="text-[11px] text-gray-300 leading-snug">
          By track: {breakdown.map((b) => `${b.label} ${b.count}`).join(" · ")}
        </p>
      ) : null}
      <p className="text-[11px] text-gray-400 border-t border-gray-700/80 pt-2">
        Total: {total} lesson{total === 1 ? "" : "s"}
        {activity && total === 0 ? " · Other activity recorded (no lesson rows logged)." : ""}
      </p>
      {details.length === 0 && breakdown.length === 0 && total === 0 && activity ? (
        <p className="text-[11px] text-gray-400">Other activity recorded; expand tracks above after new completions for names.</p>
      ) : null}
      {details.length === 0 && breakdown.length === 0 && total === 0 && !activity ? (
        <p className="text-[11px] text-gray-400">No activity on this day.</p>
      ) : null}
    </div>
  );
}

function LearningActivityDayCell({
  isoDate,
  className,
  children,
}: {
  isoDate: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`${className} cursor-default outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg`}>
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="!bg-gray-900 !text-gray-100 dark:!bg-gray-950 border border-gray-700 shadow-lg px-3 py-2.5 text-xs font-normal text-left z-[100]"
      >
        <LearningActivityDayHoverContent isoDate={isoDate} />
      </TooltipContent>
    </Tooltip>
  );
}

function WeekCalendarStrip() {
  const activity = getAcademyActivityDates();
  const start = new Date();
  const dow = start.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(start);
  monday.setDate(start.getDate() + mondayOffset);
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="flex flex-wrap gap-2 justify-between">
      {labels.map((label, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const iso = d.toISOString().slice(0, 10);
        const active = activity.has(iso);
        const lessonCount = getLessonCompletionsCountForDate(iso);
        return (
          <div key={iso} className="flex flex-col items-center gap-1 min-w-[3rem] flex-1">
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{label}</span>
            <LearningActivityDayCell
              isoDate={iso}
              className={`w-full max-w-[3rem] aspect-square rounded-lg flex items-center justify-center text-sm font-semibold border-2 mx-auto ${
                active || lessonCount > 0
                  ? "bg-green-100 dark:bg-green-900/40 border-green-500 text-green-800 dark:text-green-200"
                  : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400"
              }`}
            >
              {lessonCount > 0 ? (lessonCount > 9 ? "9+" : lessonCount) : active ? "✓" : ""}
            </LearningActivityDayCell>
          </div>
        );
      })}
    </div>
  );
}

function LastSevenDaysStrip() {
  const activity = getAcademyActivityDates();
  const days: { iso: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    days.push({ iso, label });
  }
  return (
    <div className="flex gap-1 sm:gap-2 flex-wrap justify-between">
      {days.map(({ iso, label }) => {
        const active = activity.has(iso);
        const lessonCount = getLessonCompletionsCountForDate(iso);
        return (
          <div key={iso} className="flex flex-col items-center gap-0.5 flex-1 min-w-[2.25rem]">
            <span className="text-[9px] text-gray-500">{label}</span>
            <LearningActivityDayCell
              isoDate={iso}
              className={`w-full h-7 rounded border flex items-center justify-center text-xs ${
                active || lessonCount > 0
                  ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500 text-emerald-800 dark:text-emerald-200"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600"
              }`}
            >
              {lessonCount > 0 ? (lessonCount > 9 ? "9+" : lessonCount) : active ? "✓" : ""}
            </LearningActivityDayCell>
          </div>
        );
      })}
    </div>
  );
}

export function AcademyDashboard() {
  const ipc = IpcClient.getInstance();
  const [basicsTick, setBasicsTick] = useState(0);

  useEffect(() => {
    const h = () => setBasicsTick((x) => x + 1);
    window.addEventListener("academy:basics-updated", h);
    return () => window.removeEventListener("academy:basics-updated", h);
  }, []);

  const { data: progress } = useQuery({
    queryKey: ["academy-progress"],
    queryFn: () => ipc.academyGetProgress(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["academy-projects"],
    queryFn: () => ipc.academyListProjects(),
  });

  const lessonsTotalAll = totalLessonsIncludingBasics();
  const lessonsDoneAll = totalCompletedLessonsIncludingBasics(progress);
  const nextLearn = useMemo(
    () => getNextLearnSearch(progress),
    [progress, basicsTick],
  );
  const projectTemplatesTotal = ACADEMY_PROJECT_TEMPLATES.length;
  const projectTemplatesWithWork = useMemo(
    () => new Set(projects.map((p) => p.projectType)).size,
    [projects],
  );
  const bestProjectGrade = useMemo(() => {
    const scores = projects
      .map((p) => p.lastGradeScore)
      .filter((s): s is number => typeof s === "number");
    if (scores.length === 0) return null;
    return Math.max(...scores);
  }, [projects]);
  const streakStats = getAcademyStreakStats();

  const challengeCompleted = getCompletedChallengeIds().size;
  const challengeTotal = ACADEMY_CHALLENGES.length;

  const medalStats = useMemo(
    () => buildAcademyMedalStats(progress, projects),
    [progress, projects],
  );
  const unlockedMedals = getUnlockedMedals(medalStats);

  const getDone = (track: keyof typeof ACADEMY_LESSONS) =>
    getCompletedLessonIdsForTrack(track as AcademyTrack, progress).length;
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

      {/* Medals first — show every medal; locked items stay visible */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 p-4 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Your medals
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ACADEMY_MEDALS.map((m) => {
            const unlocked = unlockedMedals.some((u) => u.id === m.id);
            return (
              <div
                key={m.id}
                className={`flex flex-col gap-1.5 px-3 py-3 rounded-xl border min-h-[7.5rem] ${
                  unlocked
                    ? "bg-white dark:bg-gray-800 border-amber-300 dark:border-amber-700 shadow-sm"
                    : "bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-70"
                }`}
                title={m.description}
              >
                <span className="text-2xl shrink-0">{unlocked ? m.emoji : "🔒"}</span>
                <div className="min-w-0 flex-1 flex flex-col">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 leading-tight">{m.name}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug mt-1">{m.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily activity — this week + last 7 days (streaks use lesson/challenge activity) */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm mb-8">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-indigo-500" />
          Learning activity
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          A number is how many lessons you marked complete that day. <strong>Hover a cell</strong> for the date,
          each lesson name and track, and per-track counts. A tick means other activity that day. Streak badges use
          your best run (4-day, 7-day, and 30-day).
        </p>
        <TooltipProvider delayDuration={200}>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">This week</p>
          <WeekCalendarStrip />
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-4 mb-2">Last 7 days</p>
          <LastSevenDaysStrip />
        </TooltipProvider>
        {(streakStats.current > 0 || streakStats.best > 0) && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200 border-t border-gray-100 dark:border-gray-800 pt-3">
            <Flame className="h-5 w-5 text-orange-500 shrink-0" />
            <span>
              Current streak: <strong>{streakStats.current}</strong> day
              {streakStats.current === 1 ? "" : "s"} · Best: <strong>{streakStats.best}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Link
          to="/academy/learn"
          search={nextLearn}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm hover:border-amber-300 dark:hover:border-amber-700 transition-colors block"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            Lessons progress
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {lessonsDoneAll} / {lessonsTotalAll}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Basics + all code lessons completed</p>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all ${lessonProgressFillClass(lessonsDoneAll, lessonsTotalAll)}`}
              style={{
                width: `${lessonsTotalAll ? Math.round((lessonsDoneAll / lessonsTotalAll) * 100) : 0}%`,
              }}
            />
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-2 inline-flex items-center gap-1">
            Continue learning <ArrowRight className="h-3.5 w-3.5" />
          </p>
        </Link>
        <Link
          to="/academy/challenges"
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors block"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <Target className="h-3.5 w-3.5" />
            Challenges
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {challengeCompleted} / {challengeTotal}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Completed / total</p>
          <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-2 inline-flex items-center gap-1">
            Open challenges <ArrowRight className="h-3.5 w-3.5" />
          </p>
        </Link>
        <Link
          to="/academy/projects"
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors block"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <FolderKanban className="h-3.5 w-3.5" />
            Projects
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <span>
              {projectTemplatesWithWork} / {projectTemplatesTotal}
            </span>
            {bestProjectGrade != null ? (
              <span className="text-base font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                · {bestProjectGrade}/100 best
              </span>
            ) : null}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Templates with a saved project / all templates
          </p>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{
                width: `${projectTemplatesTotal ? Math.round((projectTemplatesWithWork / projectTemplatesTotal) * 100) : 0}%`,
              }}
            />
          </div>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2 inline-flex items-center gap-1">
            Open projects <ArrowRight className="h-3.5 w-3.5" />
          </p>
        </Link>
      </div>

      {/* Basics + tracks: progress, motivation, and deep-link to next lesson */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm mb-8">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-amber-600" />
          Learning tracks & progress
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Totals are in the summary card above. Use <strong>Continue</strong> on each track to jump to your next
          unfinished lesson.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DASHBOARD_TRACK_CARDS.map((row) => {
            if (row.kind === "basics") {
              const done = basicsCompletedCount();
              const total = basicsTotalCount();
              const pct = total ? Math.round((done / total) * 100) : 0;
              const search = getNextBasicsLessonSearch();
              return (
                <div
                  key="basics"
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm flex flex-col"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{row.emoji}</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{row.label}</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${lessonProgressFillClass(done, total)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {done} / {total} lessons
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 flex-1">
                    {motivationForProgress("Basics", done, total)}
                  </p>
                  <Link
                    to="/academy/learn"
                    search={search}
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-3"
                  >
                    Continue <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            }
            const id = row.id;
            const total = getTotal(id);
            const done = getDone(id);
            const pct = total ? Math.round((done / total) * 100) : 0;
            const search = getNextLessonForTrack(id as AcademyTrack, progress);
            return (
              <div
                key={id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm flex flex-col"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{row.emoji}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{row.label}</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${lessonProgressFillClass(done, total)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {done} / {total} lessons
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 flex-1">
                  {motivationForProgress(row.label, done, total)}
                </p>
                <Link
                  to="/academy/learn"
                  search={search}
                  className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-3"
                >
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
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
