import React, { useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { ACADEMY_LESSONS, getLesson, type AcademyTrack } from "@/data/academyLessons";
import { ACADEMY_BASICS } from "@/data/academyBasics";
import { AcademyCodeEditor } from "@/components/academy/AcademyCodeEditor";
import { AcademyAiTutor } from "@/components/academy/AcademyAiTutor";
import { CopyableCodeBlock } from "@/components/academy/CopyableCodeBlock";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, Lock, BookOpen, Code2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const TRACKS: { id: AcademyTrack | "basics"; label: string }[] = [
  { id: "basics", label: "🌟 Basics" },
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
];

export function AcademyLearn() {
  const search = useSearch({ from: "/academy/learn" }) as { track?: string; lessonId?: string };
  const trackRaw = search.track ?? "basics";
  const track = (trackRaw === "javascript" ? "javascript" : trackRaw === "python" ? "python" : "basics") as AcademyTrack | "basics";
  const lessonId = search.lessonId;
  const [challengeCode, setChallengeCode] = useState<Record<string, string>>({});
  const [showMoreExamples, setShowMoreExamples] = useState(false);
  const queryClient = useQueryClient();
  const ipc = IpcClient.getInstance();

  const { data: progress } = useQuery({
    queryKey: ["academy-progress"],
    queryFn: () => ipc.academyGetProgress(),
  });

  const completeLesson = useMutation({
    mutationFn: (params: { track: AcademyTrack; lessonId: string }) =>
      ipc.academyCompleteLesson(params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["academy-progress"] }),
  });

  const isBasics = track === "basics";
  const lessons = isBasics ? ACADEMY_BASICS : ACADEMY_LESSONS[track as AcademyTrack];
  const completedSet = new Set(
    track === "python" ? progress?.pythonCompleted : track === "javascript" ? progress?.javascriptCompleted : []
  );
  const lesson = lessonId && !isBasics ? getLesson(track as AcademyTrack, lessonId) : null;
  const basicsLesson = lessonId && isBasics ? ACADEMY_BASICS.find((b) => b.id === lessonId) : null;

  const handleMarkComplete = (lid: string) => {
    completeLesson.mutate({ track: track as AcademyTrack, lessonId: lid });
  };

  if (basicsLesson) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Link
          to="/academy/learn"
          search={{ track: "basics" }}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-block"
        >
          ← Back to Basics
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{basicsLesson.emoji}</span>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {basicsLesson.title}
          </h1>
        </div>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-lg">
            {basicsLesson.explanation}
          </p>
        </div>
        {basicsLesson.exampleCode && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Example
            </h2>
            <CopyableCodeBlock
              code={basicsLesson.exampleCode}
              language="javascript"
              title={basicsLesson.exampleLabel ?? "Example"}
            />
          </div>
        )}
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
            🎯 Fun fact
          </p>
          <p className="text-amber-900 dark:text-amber-100">{basicsLesson.funFact}</p>
        </div>
      </div>
    );
  }

  if (lesson) {
    const starter = lesson.challengeStarterCode ?? lesson.exampleCode;
    const code = challengeCode[lesson.id] ?? starter;
    const hasExtraExamples = lesson.extraExamples && lesson.extraExamples.length > 0;
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <Link
          to="/academy/learn"
          search={{ track }}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-block"
        >
          ← Back to {track === "python" ? "Python" : "JavaScript"} lessons
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {lesson.title}
          </h1>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {lesson.explanation}
            </p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Code2 className="h-5 w-5 text-indigo-500" />
            Example – try it in the editor below
          </h2>
          <CopyableCodeBlock
            code={lesson.exampleCode}
            language={track}
            title="Main example"
          />
          {hasExtraExamples && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowMoreExamples((v) => !v)}
              >
                <BookOpen className="h-4 w-4" />
                {showMoreExamples ? "Hide" : "Show"} more examples ({lesson.extraExamples!.length})
              </Button>
              {showMoreExamples && (
                <div className="pt-3 space-y-3">
                  {lesson.extraExamples!.map((ex, i) => (
                    <CopyableCodeBlock
                      key={i}
                      code={ex.code}
                      language={track}
                      title={ex.title}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Mini challenge
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{lesson.miniChallenge}</p>
          <div className="flex flex-wrap items-center gap-2">
            <AcademyAiTutor code={code} language={track} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Ask the tutor if you’re stuck
            </span>
          </div>
          <div className="min-h-[320px]">
            <AcademyCodeEditor
              value={code}
              onChange={(v) => setChallengeCode((c) => ({ ...c, [lesson.id]: v }))}
              language={track}
              height={320}
              showRunButton={true}
            />
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Quiz
          </h2>
          <ul className="space-y-3">
            {lesson.quiz.map((q, i) => (
              <li key={i} className="text-gray-700 dark:text-gray-300">
                <strong>Q: {q.question}</strong>
                <ul className="list-disc list-inside ml-2 text-sm mt-1">
                  {q.options.map((opt, j) => (
                    <li key={j}>{opt}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex items-center gap-3 pt-2">
          {!completedSet.has(lesson.id) && (
            <Button
              onClick={() => handleMarkComplete(lesson.id)}
              disabled={completeLesson.isPending}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Mark as complete
            </Button>
          )}
          {completedSet.has(lesson.id) && (
            <p className="text-green-600 dark:text-green-400 flex items-center gap-2">
              <Check className="h-4 w-4" /> Completed
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
        <Sparkles className="h-7 w-7 text-amber-500" />
        Learning modules
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Start with <strong>Basics</strong> to learn what code, HTML, CSS, and databases are. Then try <strong>Python</strong> or <strong>JavaScript</strong>!
      </p>
      <div className="flex flex-wrap gap-2 mb-6">
        {TRACKS.map((t) => (
          <Link
            key={t.id}
            to="/academy/learn"
            search={{ track: t.id }}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              track === t.id
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <ul className="space-y-2">
        {isBasics
          ? (lessons as typeof ACADEMY_BASICS).map((l) => (
              <li key={l.id}>
                <Link
                  to="/academy/learn"
                  search={{ track: "basics", lessonId: l.id }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-indigo-200 dark:hover:border-indigo-800"
                >
                  <span className="text-2xl shrink-0">{l.emoji}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {l.title}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                </Link>
              </li>
            ))
          : (lessons as typeof ACADEMY_LESSONS.python).map((l) => {
              const done = completedSet.has(l.id);
              return (
                <li key={l.id}>
                  <Link
                    to="/academy/learn"
                    search={{ track: track as AcademyTrack, lessonId: l.id }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    {done ? (
                      <Check className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <Lock className="h-5 w-5 text-gray-400 shrink-0" />
                    )}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {l.title}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                  </Link>
                </li>
              );
            })}
      </ul>
    </div>
  );
}
