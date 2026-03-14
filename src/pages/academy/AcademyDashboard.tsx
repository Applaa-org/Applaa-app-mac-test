import React from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { BookOpen, Code2, FolderKanban, ArrowRight } from "lucide-react";
import { ACADEMY_LESSONS } from "@/data/academyLessons";

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
  const pythonPct = pythonTotal ? Math.round((pythonDone / pythonTotal) * 100) : 0;
  const jsPct = jsTotal ? Math.round((jsDone / jsTotal) * 100) : 0;
  const projectCount = progress?.projectCount ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Your Progress
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Track your learning and projects in Applaa AI Academy.
      </p>

      <div className="grid gap-6 sm:grid-cols-2 mb-8">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="h-5 w-5 text-amber-500" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              Python
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${pythonPct}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {pythonDone} / {pythonTotal} lessons
          </p>
          <Link
            to="/academy/learn"
            search={{ track: "python" }}
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-2"
          >
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              JavaScript
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 rounded-full transition-all"
              style={{ width: `${jsPct}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {jsDone} / {jsTotal} lessons
          </p>
          <Link
            to="/academy/learn"
            search={{ track: "javascript" }}
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-2"
          >
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
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
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          <BookOpen className="h-4 w-4" />
          Start learning
        </Link>
        <Link
          to="/academy/playground"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <Code2 className="h-4 w-4" />
          Coding Playground
        </Link>
      </div>
    </div>
  );
}
