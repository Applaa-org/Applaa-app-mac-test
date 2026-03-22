import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { AcademyCodeEditor } from "@/components/academy/AcademyCodeEditor";
import { ACADEMY_LESSONS, type AcademyTrack } from "@/data/academyLessons";
import { ACADEMY_CHALLENGES, getChallengesByTrack, getChallengeExpectedDisplay } from "@/data/academyChallenges";
import { ArrowLeft, ArrowRight, Target, Sparkles, Filter, CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";
import { gradeChallengeOutput, challengeHasAutoCheck } from "@/lib/academyChallengeGrade";
import {
  getCompletedChallengeIds,
  setChallengeCompleted,
} from "@/lib/academyChallengeProgress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAcademyTutorEditor } from "@/contexts/AcademyTutorEditorContext";

const TRACKS: { id: AcademyTrack | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "html", label: "Web (HTML)" },
  { id: "react", label: "React" },
  { id: "typescript", label: "TypeScript" },
  { id: "ai", label: "AI" },
];

const TRACKS_WITH_STATS = TRACKS.filter((t): t is { id: AcademyTrack; label: string } => t.id !== "all");

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
  /** Per-challenge drafts so switching challenges never shows the previous tab's code on first paint. */
  const [draftById, setDraftById] = useState<Record<string, string>>({});
  const [lastOutput, setLastOutput] = useState("");
  const [verifyResult, setVerifyResult] = useState<{
    pass: boolean;
    score: number;
    message: string;
  } | null>(null);
  const [completedIds, setCompletedIds] = useState(() => getCompletedChallengeIds());
  const { setPayload: setTutorPayload } = useAcademyTutorEditor();

  // When opened from a lesson link, match the track filter so level filters apply to that lesson.
  React.useEffect(() => {
    if (search.track && search.lessonId) {
      setTrackFilter(search.track as AcademyTrack | "all");
    }
  }, [search.track, search.lessonId]);

  const filtered = useMemo(() => {
    // Lesson deep-link: only while track filter still matches that lesson's track (or "all").
    const lessonScoped =
      Boolean(search.lessonId && search.track) &&
      (trackFilter === "all" || trackFilter === search.track);

    if (lessonScoped && search.track && search.lessonId) {
      let list = ACADEMY_CHALLENGES.filter(
        (c) => c.track === search.track && c.lessonId === search.lessonId,
      );
      if (levelFilter !== "all") {
        list = list.filter((c) => difficultyToLevel(c.difficulty) === levelFilter);
      }
      return list;
    }

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
    filtered.length === 0
      ? 0
      : selectedFromSearch >= 0
        ? selectedFromSearch
        : Math.min(selectedIndex, filtered.length - 1);

  const challenge = filtered.length ? filtered[challengeIndex] ?? filtered[0] : undefined;
  const safeChallenge = challenge ?? ACADEMY_CHALLENGES[0];

  const code = useMemo(
    () => draftById[safeChallenge.id] ?? safeChallenge.starter,
    [draftById, safeChallenge.id, safeChallenge.starter],
  );

  const setCode = useCallback((v: string) => {
    setDraftById((prev) => ({ ...prev, [safeChallenge.id]: v }));
  }, [safeChallenge.id]);

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    setVerifyResult(null);
    setLastOutput("");
  };

  const markComplete = useCallback((id: string, done: boolean) => {
    setChallengeCompleted(id, done);
    setCompletedIds(getCompletedChallengeIds());
  }, []);

  const handleVerify = useCallback(() => {
    const g = gradeChallengeOutput(lastOutput, safeChallenge);
    setVerifyResult(g);
    if (g.pass) {
      markComplete(safeChallenge.id, true);
    }
  }, [lastOutput, safeChallenge, markComplete]);

  // Keep selected index in sync when opening via URL or when filters change.
  React.useEffect(() => {
    const nextIndex =
      selectedFromSearch >= 0 ? selectedFromSearch : 0;
    const first = filtered[nextIndex] ?? filtered[0];
    if (!first) return;
    setSelectedIndex(nextIndex);
    setVerifyResult(null);
    setLastOutput("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selectedFromSearch]);

  const autoCheck = challengeHasAutoCheck(safeChallenge);

  const challengeTotalsByTrack = useMemo(() => {
    const m = new Map<AcademyTrack, number>();
    for (const c of ACADEMY_CHALLENGES) {
      m.set(c.track, (m.get(c.track) ?? 0) + 1);
    }
    return m;
  }, []);

  const completedCountAll = useMemo(() => {
    let n = 0;
    for (const c of ACADEMY_CHALLENGES) {
      if (completedIds.has(c.id)) n += 1;
    }
    return n;
  }, [completedIds]);

  const completedByTrack = useMemo(() => {
    const m = new Map<AcademyTrack, number>();
    for (const c of ACADEMY_CHALLENGES) {
      if (completedIds.has(c.id)) {
        m.set(c.track, (m.get(c.track) ?? 0) + 1);
      }
    }
    return m;
  }, [completedIds]);

  const expectedOutputText = useMemo(
    () => getChallengeExpectedDisplay(safeChallenge),
    [safeChallenge],
  );

  const completedInFilter = useMemo(
    () => filtered.filter((c) => completedIds.has(c.id)).length,
    [filtered, completedIds],
  );

  const lessonTitle =
    ACADEMY_LESSONS[safeChallenge.track]?.find((l) => l.id === safeChallenge.lessonId)?.title ?? "";
  const safeTrackLabel =
    TRACKS.find((t) => t.id === safeChallenge.track)?.label ?? safeChallenge.track;

  useEffect(() => {
    const summary = [
      safeChallenge.task,
      lessonTitle && `Related lesson: ${lessonTitle}`,
      `Track: ${safeTrackLabel}`,
    ]
      .filter(Boolean)
      .join("\n");
    setTutorPayload({
      kind: "challenge",
      title: safeChallenge.title,
      summary,
      code,
    });
    return () => setTutorPayload(null);
  }, [safeChallenge, code, lessonTitle, safeTrackLabel, setTutorPayload]);

  if (filtered.length === 0) {
    return (
      <div className="p-6 w-full max-w-[1600px] mx-auto">
        <Link
          to="/academy/challenges"
          search={{}}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Clear filters
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <Target className="h-7 w-7 text-indigo-500" />
          Coding challenges
        </h1>
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/60 dark:bg-indigo-950/30 px-4 py-3 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-200 mb-2">
            Completed challenges
          </p>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 text-sm">
            <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
              All: {completedCountAll}/{ACADEMY_CHALLENGES.length}
            </span>
            <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">|</span>
            {TRACKS_WITH_STATS.map(({ id, label }) => {
              const total = challengeTotalsByTrack.get(id) ?? 0;
              const done = completedByTrack.get(id) ?? 0;
              return (
                <span key={id} className="text-gray-800 dark:text-gray-200 tabular-nums">
                  <span className="text-gray-500 dark:text-gray-400">{label}</span>{" "}
                  <span className="font-medium text-indigo-800 dark:text-indigo-200">
                    {done}/{total}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          No challenges match this level and track. Try <strong>All levels</strong> or another track
          (e.g. switch away from a lesson-only view by picking a different language).
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-[1600px] mx-auto h-full flex flex-col">
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
      <p className="text-gray-600 dark:text-gray-400 mb-3">
        Pick a level and track, choose a challenge, then Run. Use Verify output when available, or mark
        complete yourself. A green tick shows finished challenges (saved on this device).
      </p>

      <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/60 dark:bg-indigo-950/30 px-4 py-3 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-200 mb-2">
          Completed challenges
        </p>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 text-sm">
          <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
            All: {completedCountAll}/{ACADEMY_CHALLENGES.length}
          </span>
          <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">|</span>
          {TRACKS_WITH_STATS.map(({ id, label }) => {
            const total = challengeTotalsByTrack.get(id) ?? 0;
            const done = completedByTrack.get(id) ?? 0;
            return (
              <span
                key={id}
                className="text-gray-800 dark:text-gray-200 tabular-nums"
                title={`${label}: ${done} of ${total} challenges marked complete`}
              >
                <span className="text-gray-500 dark:text-gray-400">{label}</span>{" "}
                <span className="font-medium text-indigo-800 dark:text-indigo-200">
                  {done}/{total}
                </span>
              </span>
            );
          })}
        </div>
      </div>

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
            <span className="text-green-600 dark:text-green-400 font-semibold tabular-nums">
              {" "}
              · {completedInFilter}/{filtered.length} done
            </span>
          </p>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-2 border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-gray-50 dark:bg-gray-900/50">
            {filtered.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  challengeIndex === i
                    ? "bg-indigo-600 text-white"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  {completedIds.has(c.id) ? (
                    <CheckCircle2
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        challengeIndex === i ? "text-green-200" : "text-green-600 dark:text-green-400",
                      )}
                    />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  )}
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

          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="shrink-0">
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                    >
                      <ArrowLeft className="h-4 w-4 shrink-0" />
                      Previous
                    </Link>
                  );
                })()
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 cursor-not-allowed">
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </span>
              )}
            </div>
            <div className="shrink-0">
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                    >
                      Next
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </Link>
                  );
                })()
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 cursor-not-allowed">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            {autoCheck && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-2"
                onClick={handleVerify}
              >
                <ClipboardCheck className="h-4 w-4" />
                Verify output
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant={completedIds.has(safeChallenge.id) ? "outline" : "default"}
              className="gap-2"
              onClick={() => markComplete(safeChallenge.id, !completedIds.has(safeChallenge.id))}
            >
              {completedIds.has(safeChallenge.id) ? "Unmark complete" : "Mark complete"}
            </Button>
            {!autoCheck && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                No auto-check — run your code, then mark complete when satisfied. See expected output below.
              </span>
            )}
          </div>
          <AcademyCodeEditor
            key={safeChallenge.id}
            value={code}
            onChange={setCode}
            language={safeChallenge.track === "ai" ? "python" : safeChallenge.track}
            height={340}
            showRunButton={true}
            onRun={setLastOutput}
            onReset={() => {
              setDraftById((prev) => {
                const next = { ...prev };
                delete next[safeChallenge.id];
                return next;
              });
            }}
          />

          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                Score
              </p>
              {verifyResult ? (
                <div
                  className={cn(
                    "rounded-lg border-2 p-3 -m-1",
                    verifyResult.pass
                      ? "border-green-500 bg-green-50 dark:bg-green-950/40 dark:border-green-600"
                      : "border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-600",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {verifyResult.pass ? (
                      <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-6 w-6 shrink-0 text-amber-700 dark:text-amber-400" />
                    )}
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {verifyResult.pass ? "Correct" : "Incorrect"}
                    </span>
                    <span
                      className={cn(
                        "text-lg font-semibold tabular-nums px-2 py-0.5 rounded-md",
                        verifyResult.pass
                          ? "bg-green-200/80 text-green-900 dark:bg-green-900/60 dark:text-green-100"
                          : "bg-amber-200/80 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100",
                      )}
                    >
                      {verifyResult.score}/100
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{verifyResult.message}</p>
                </div>
              ) : autoCheck ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Run your code, then click <strong>Verify output</strong> to see <strong>Correct</strong> or{" "}
                  <strong>Incorrect</strong> and a score out of 100.
                </p>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  No automatic score for this task. Compare your run to the expected output below, then use{" "}
                  <strong>Mark complete</strong> when it matches.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2">
                Expected output — compare with your run
              </p>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                {expectedOutputText}
              </p>
              {safeChallenge.referenceCode?.trim() ? (
                <details className="mt-3 group">
                  <summary className="cursor-pointer text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline list-none flex items-center gap-2">
                    <span>Show sample solution</span>
                    <span className="text-xs font-normal text-gray-500">(spoiler)</span>
                  </summary>
                  <pre className="mt-2 text-xs p-3 rounded-lg bg-gray-900 text-gray-100 overflow-x-auto border border-gray-700">
                    {safeChallenge.referenceCode.trim()}
                  </pre>
                </details>
              ) : null}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
            <Link
              to="/academy/learn"
              search={{ track: safeChallenge.track }}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              ← Back to {safeTrackLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
