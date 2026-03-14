import React, { useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { ACADEMY_LESSONS, getLesson, type AcademyTrack } from "@/data/academyLessons";
import { AcademyCodeEditor } from "@/components/academy/AcademyCodeEditor";
import { AcademyAiTutor } from "@/components/academy/AcademyAiTutor";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const TRACKS: { id: AcademyTrack; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
];

export function AcademyLearn() {
  const search = useSearch({ from: "/academy/learn" }) as { track?: string; lessonId?: string };
  const track = (search.track === "javascript" ? "javascript" : "python") as AcademyTrack;
  const lessonId = search.lessonId;
  const [challengeCode, setChallengeCode] = useState<Record<string, string>>({});
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

  const lessons = ACADEMY_LESSONS[track];
  const completedSet = new Set(
    track === "python" ? progress?.pythonCompleted : progress?.javascriptCompleted
  );
  const lesson = lessonId ? getLesson(track, lessonId) : null;

  const handleMarkComplete = (lid: string) => {
    completeLesson.mutate({ track, lessonId: lid });
  };

  if (lesson) {
    const starter = lesson.challengeStarterCode ?? lesson.exampleCode;
    const code = challengeCode[lesson.id] ?? starter;
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link
          to="/academy/learn"
          search={{ track }}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4 inline-block"
        >
          ← Back to {track === "python" ? "Python" : "JavaScript"} lessons
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {lesson.title}
        </h1>
        <div className="prose dark:prose-invert max-w-none mb-6">
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {lesson.explanation}
          </p>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Example
        </h2>
        <div className="mb-6">
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto">
            <code>{lesson.exampleCode}</code>
          </pre>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Mini challenge
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-3">{lesson.miniChallenge}</p>
        <div className="flex gap-2 mb-2">
          <AcademyAiTutor code={code} language={track} />
        </div>
        <div className="mb-6">
          <AcademyCodeEditor
            value={code}
            onChange={(v) => setChallengeCode((c) => ({ ...c, [lesson.id]: v }))}
            language={track}
            height={220}
            showRunButton={true}
          />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Quiz
        </h2>
        <ul className="space-y-2 mb-6">
          {lesson.quiz.map((q, i) => (
            <li key={i} className="text-gray-700 dark:text-gray-300">
              <strong>Q: {q.question}</strong>
              <ul className="list-disc list-inside ml-2 text-sm">
                {q.options.map((opt, j) => (
                  <li key={j}>{opt}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
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
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Learning modules
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Choose a track and a lesson. Each lesson has an explanation, example, challenge, and quiz.
      </p>
      <div className="flex gap-2 mb-6">
        {TRACKS.map((t) => (
          <Link
            key={t.id}
            to="/academy/learn"
            search={{ track: t.id }}
            className={`px-4 py-2 rounded-lg font-medium ${
              track === t.id
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <ul className="space-y-2">
        {lessons.map((l) => {
          const done = completedSet.has(l.id);
          return (
            <li key={l.id}>
              <Link
                to="/academy/learn"
                search={{ track, lessonId: l.id }}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
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
