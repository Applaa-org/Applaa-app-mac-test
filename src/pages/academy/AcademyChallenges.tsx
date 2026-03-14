import React, { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { AcademyCodeEditor } from "@/components/academy/AcademyCodeEditor";
import { ACADEMY_LESSONS, type AcademyTrack } from "@/data/academyLessons";
import { ACADEMY_CHALLENGES, getChallengesByTrack } from "@/data/academyChallenges";
import { Target, Sparkles, Filter } from "lucide-react";

const TRACKS: { id: AcademyTrack | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
];

const DIFF_COLORS = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  hard: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

export function AcademyChallenges() {
  const [trackFilter, setTrackFilter] = useState<AcademyTrack | "all">("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [code, setCode] = useState(ACADEMY_CHALLENGES[0].starter);

  const filtered = useMemo(() => {
    if (trackFilter === "all") return ACADEMY_CHALLENGES;
    return getChallengesByTrack(trackFilter);
  }, [trackFilter]);

  const challenge = filtered[Math.min(selectedIndex, filtered.length - 1)] ?? filtered[0];
  const safeChallenge = challenge ?? ACADEMY_CHALLENGES[0];

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    const c = filtered[index];
    if (c) setCode(c.starter);
  };

  // When filter changes, reset selection and code
  React.useEffect(() => {
    setSelectedIndex(0);
    const first = filtered[0];
    if (first) setCode(first.starter);
  }, [trackFilter]);

  const lessonTitle =
    ACADEMY_LESSONS[safeChallenge.track]?.find((l) => l.id === safeChallenge.lessonId)?.title ?? "";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
        <Target className="h-7 w-7 text-indigo-500" />
        Coding challenges
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Over 50 fun challenges! Pick one, write your code, and click Run. Start easy and level up.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-gray-500" />
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

      <div className="flex gap-4 flex-col lg:flex-row">
        <div className="lg:w-72 shrink-0">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Choose a challenge ({filtered.length})
          </p>
          <div className="max-h-[320px] overflow-y-auto space-y-1 pr-2 border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-gray-50 dark:bg-gray-900/50">
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
                >
                  {c.difficulty}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
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
            language={safeChallenge.track}
            height={340}
            showRunButton={true}
          />
        </div>
      </div>
    </div>
  );
}
