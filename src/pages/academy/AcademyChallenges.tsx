import React, { useState, useMemo } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { AcademyCodeEditor } from "@/components/academy/AcademyCodeEditor";
import { ACADEMY_LESSONS, type AcademyTrack } from "@/data/academyLessons";
import { ACADEMY_CHALLENGES, getChallengesByTrack } from "@/data/academyChallenges";
import { ArrowLeft, ArrowRight, Target, Sparkles, Filter } from "lucide-react";

const TRACKS: { id: AcademyTrack | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "html", label: "Web (HTML)" },
  { id: "react", label: "React" },
  { id: "typescript", label: "TypeScript" },
  { id: "ai", label: "AI" },
];

const DIFF_COLORS = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  hard: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

/** Map difficulty to display level (Starter / Intermediate / Expert) */
const DIFF_LABELS: Record<"easy" | "medium" | "hard", string> = {
  easy: "Starter",
  medium: "Intermediate",
  hard: "Expert",
};

type LevelFilter = "all" | "Starter" | "Intermediate" | "Expert";
const LEVEL_FILTERS: { id: LevelFilter; label: string }[] = [
  { id: "all", label: "All levels" },
  { id: "Starter", label: "Starter" },
  { id: "Intermediate", label: "Intermediate" },
  { id: "Expert", label: "Expert" },
];

function difficultyToLevel(d: "easy" | "medium" | "hard"): LevelFilter {
  return d === "easy" ? "Starter" : d === "medium" ? "Intermediate" : "Expert";
}

export function AcademyChallenges() {
  const search = useSearch({ from: "/academy/challenges" }) as {
    track?: AcademyTrack;
    lessonId?: string;
    challengeId?: string;
  };

  const [trackFilter, setTrackFilter] = useState<AcademyTrack | "all">("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [code, setCode] = useState(ACADEMY_CHALLENGES[0].starter);

  const filtered = useMemo(() => {
    // If we were opened from a specific lesson, show only its challenges.
    if (search.lessonId && search.track) {
      return ACADEMY_CHALLENGES.filter(
        (c) => c.track === search.track && c.lessonId === search.lessonId
      );
    }
    // If we were opened from a track (but not lesson), keep existing behavior.
    let list = trackFilter === "all" ? ACADEMY_CHALLENGES : getChallengesByTrack(trackFilter);
    if (levelFilter !== "all") {
      list = list.filter((c) => difficultyToLevel(c.difficulty) === levelFilter);
    }
    return list;
  }, [levelFilter, search.lessonId, search.track, trackFilter]);

  const selectedFromSearch = useMemo(() => {
    if (!search.challengeId) return -1;
    const idx = filtered.findIndex((c) => c.id === search.challengeId);
    return idx;
  }, [filtered, search.challengeId]);

  const challengeIndex =
    selectedFromSearch >= 0
      ? selectedFromSearch
      : Math.min(selectedIndex, filtered.length - 1);

  const challenge = filtered[challengeIndex] ?? filtered[0];
  const safeChallenge = challenge ?? ACADEMY_CHALLENGES[0];

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    const c = filtered[index];
    if (c) setCode(c.starter);
  };

  // Keep selected challenge + code in sync when opening via URL.
  React.useEffect(() => {
    const nextIndex =
      selectedFromSearch >= 0 ? selectedFromSearch : 0;
    const first = filtered[nextIndex] ?? filtered[0];
    if (!first) return;
    setSelectedIndex(nextIndex);
    setCode(first.starter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selectedFromSearch]);

  const lessonTitle =
    ACADEMY_LESSONS[safeChallenge.track]?.find((l) => l.id === safeChallenge.lessonId)?.title ?? "";
  const safeTrackLabel =
    TRACKS.find((t) => t.id === safeChallenge.track)?.label ?? safeChallenge.track;

  return (
    <div className="p-6 max-w-4xl mx-auto h-full flex flex-col">
      <div className="mb-4 flex items-center gap-3 justify-between">
        <Link
          to="/academy/learn"
          search={{ track: safeChallenge.track }}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {safeTrackLabel}
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
        <Target className="h-7 w-7 text-indigo-500" />
        Coding challenges
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Pick a level and track, then choose a challenge. Write your code and click Run.
      </p>

      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Level</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {LEVEL_FILTERS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLevelFilter(l.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                levelFilter === l.id
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Track:</span>
        {TRACKS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTrackFilter(t.id as AcademyTrack | "all")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              trackFilter === t.id
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex gap-4 flex-col lg:flex-row">
        <div className="lg:w-72 shrink-0 flex flex-col min-h-0">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Choose a challenge ({filtered.length})
          </p>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-2 border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-gray-50 dark:bg-gray-900/50">
            {filtered.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedIndex === i
                    ? "bg-indigo-600 text-white"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  {c.title}
                </span>
                <span
                  className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs ${DIFF_COLORS[c.difficulty]}`}
                  title={c.difficulty}
                >
                  {DIFF_LABELS[c.difficulty]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 min-h-0">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            <strong>Task:</strong> {safeChallenge.task}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Related lesson:{" "}
            <Link
              to="/academy/learn"
              search={{ track: safeChallenge.track, lessonId: safeChallenge.lessonId }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {lessonTitle}
            </Link>
          </p>
          <AcademyCodeEditor
            value={code}
            onChange={setCode}
            language={safeChallenge.track === "ai" ? "python" : safeChallenge.track}
            height={340}
            showRunButton={true}
          />
        </div>
      </div>

    <div className="flex items-center justify-between gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
      <div>
        <Link
          to="/academy/learn"
          search={{ track: safeChallenge.track }}
          className="text-sm text-gray-600 dark:text-gray-400 hover:underline inline-flex items-center gap-2"
        >
          ← Back to {safeTrackLabel}
        </Link>
      </div>
      <div className="flex items-center gap-3">
        {challengeIndex > 0 ? (
          (() => {
            const prev = filtered[challengeIndex - 1];
            if (!prev) return null;
            return (
              <Link
                to="/academy/challenges"
                search={{
                  track: prev.track,
                  lessonId: prev.lessonId,
                  challengeId: prev.id,
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-md"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Link>
            );
          })()
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold opacity-50 cursor-not-allowed shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
        )}

        {challengeIndex < filtered.length - 1 ? (
          (() => {
            const next = filtered[challengeIndex + 1];
            if (!next) return null;
            return (
              <Link
                to="/academy/challenges"
                search={{
                  track: next.track,
                  lessonId: next.lessonId,
                  challengeId: next.id,
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-md"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Link>
            );
          })()
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold opacity-50 cursor-not-allowed shadow-md"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
    </div>
  );
}
