import React, { useState, useEffect, useMemo } from "react";
import { Link, useParams, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { AcademyCodeEditor } from "@/components/academy/AcademyCodeEditor";
import { Button } from "@/components/ui/button";
import {
  getProjectTemplate,
  getStarterCodeForLanguage,
  getScaffoldCodeForLanguage,
  getEnhanceSampleForLanguage,
  type ProjectLanguage,
} from "@/data/academyProjects";
import { useAcademyTutorEditor } from "@/contexts/AcademyTutorEditorContext";
import { CopyableCodeBlock } from "@/components/academy/CopyableCodeBlock";
import {
  Save,
  ExternalLink,
  ArrowLeft,
  BookOpen,
  Eye,
  ClipboardCheck,
  Lightbulb,
  Loader2,
  Wrench,
} from "lucide-react";
import { showError, showSuccess } from "@/lib/toast";
import { runAcademySandboxCode } from "@/lib/academySandbox";
import { gradeProjectOutput } from "@/lib/academyProjectGrade";

export function AcademyProjectDetail() {
  const { projectId } = useParams({ from: "/academy/projects/$projectId" });
  const id = Number(projectId);
  const queryClient = useQueryClient();
  const ipc = IpcClient.getInstance();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const router = useRouter();
  const [gradeScore, setGradeScore] = useState<number | null>(null);
  const [gradeMessage, setGradeMessage] = useState<string | null>(null);
  const [grading, setGrading] = useState(false);
  const [showSolutionAnyway, setShowSolutionAnyway] = useState(false);
  const [offlineTip, setOfflineTip] = useState<string | null>(null);
  const [offlineTipLoading, setOfflineTipLoading] = useState(false);
  const [lastRunOutput, setLastRunOutput] = useState("");
  const [offlineFix, setOfflineFix] = useState<string | null>(null);
  const [offlineFixLoading, setOfflineFixLoading] = useState(false);
  const { setPayload: setTutorPayload } = useAcademyTutorEditor();

  const { data: project, isLoading } = useQuery({
    queryKey: ["academy-project", id],
    queryFn: () => ipc.academyGetProject({ id }),
    enabled: !Number.isNaN(id) && id > 0,
  });

  const template = project ? getProjectTemplate(project.projectType) : null;

  const lang = (project?.language ?? "javascript") as ProjectLanguage;
  const editorLang = useMemo(() => {
    if (lang === "react" || lang === "typescript") return lang;
    return lang as "python" | "javascript" | "html" | "react" | "typescript";
  }, [lang]);

  useEffect(() => {
    setCode("");
    setName("");
    setGradeScore(null);
    setGradeMessage(null);
    setLastRunOutput("");
    setOfflineTip(null);
    setOfflineFix(null);
  }, [id]);

  useEffect(() => {
    if (project && project.id === id) {
      setCode(project.code);
      setName(project.name);
      if (typeof project.lastGradeScore === "number") {
        setGradeScore(project.lastGradeScore);
      }
    }
  }, [project, id]);

  useEffect(() => {
    if (!template || !project) {
      setTutorPayload(null);
      return;
    }
    const summary = [template.instructions, template.explanation].filter(Boolean).join("\n\n");
    setTutorPayload({
      kind: "project",
      title: `${template.name} (${name || project.name})`,
      summary,
      code,
    });
    return () => setTutorPayload(null);
  }, [template, project, name, code, setTutorPayload]);

  const solutionCode = useMemo(() => {
    if (!template) return "";
    return getStarterCodeForLanguage(template, lang);
  }, [template, lang]);

  const scaffoldCode = useMemo(() => {
    if (!template) return "";
    return getScaffoldCodeForLanguage(template, lang);
  }, [template, lang]);

  const canAutoGrade =
    template?.gradeCheck?.outputIncludes &&
    template.gradeCheck.outputIncludes.length > 0 &&
    (lang === "python" || lang === "javascript" || lang === "typescript");

  const unlockSolution =
    showSolutionAnyway || (gradeScore !== null && gradeScore >= 70);

  const saveMutation = useMutation({
    mutationFn: () =>
      ipc.academySaveProject({
        id,
        name,
        projectType: project?.projectType ?? "calculator",
        code,
        language: project?.language ?? "javascript",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academy-projects"] });
      queryClient.invalidateQueries({ queryKey: ["academy-project", id] });
      queryClient.invalidateQueries({ queryKey: ["academy-progress"] });
      showSuccess("Project saved! 🎉 Check your dashboard for medals!");
    },
    onError: (e) => showError(e as Error),
  });

  const handleSubmitGrade = async () => {
    if (!template) return;
    if (!canAutoGrade) {
      setGradeScore(null);
      setGradeMessage(
        "This template has no keyword checks yet. Run your code to verify behavior, then Save. More templates will get automatic checks over time.",
      );
      return;
    }
    setGrading(true);
    setGradeMessage(null);
    try {
      const out = await runAcademySandboxCode(code, lang as "python" | "javascript" | "typescript");
      const g = gradeProjectOutput(out, template.gradeCheck);
      setGradeScore(g.score);
      try {
        await ipc.academySaveProject({
          id,
          name,
          projectType: project?.projectType ?? "calculator",
          code,
          language: project?.language ?? "javascript",
          lastGradeScore: g.score,
        });
        queryClient.invalidateQueries({ queryKey: ["academy-projects"] });
        queryClient.invalidateQueries({ queryKey: ["academy-project", id] });
      } catch {
        /* score shown in UI even if persist fails */
      }
      if (g.pass) {
        setGradeMessage("Great — output matches the criteria.");
        showSuccess(`Score: ${g.score}/100`);
      } else {
        setGradeMessage(
          `Score: ${g.score}/100. Missing in output: ${g.missing.join(", ") || "(see Run output)"}`,
        );
      }
    } catch (e) {
      showError(e as Error);
      setGradeScore(null);
    } finally {
      setGrading(false);
    }
  };

  const loadOfflineTip = async () => {
    if (!template) return;
    setOfflineTipLoading(true);
    setOfflineTip(null);
    try {
      const { answer } = await ipc.academyAiTutor({
        question:
          "Give 3 short bullet tips for what to do first in this project. Practical steps only—no long essay.",
        code: `${template.name}\n${template.instructions}\n\n---\n${code.slice(0, 4000)}`,
      });
      setOfflineTip(answer);
    } catch (e) {
      setOfflineTip(e instanceof Error ? e.message : String(e));
    } finally {
      setOfflineTipLoading(false);
    }
  };

  if (Number.isNaN(id) || id <= 0) {
    return (
      <div className="p-6">
        <p className="text-red-600">Invalid project.</p>
        <button
          type="button"
          onClick={() => router.history.back()}
          className="text-indigo-600 hover:underline"
        >
          Back
        </button>
      </div>
    );
  }

  if (isLoading || !project) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-[1600px] mx-auto">
      <button
        type="button"
        onClick={() => router.history.back()}
        className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {name}
        </h1>
        {template?.level && (
          <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200">
            {template.level}
          </span>
        )}
      </div>
      {template && (
        <div className="mb-4 space-y-4">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 p-4">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Real project
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
              {template.instructions}
            </p>
            {template.explanation && (
              <p className="text-gray-600 dark:text-gray-400 text-sm italic border-l-2 border-indigo-300 dark:border-indigo-600 pl-3">
                {template.explanation}
              </p>
            )}
          </div>
          {template.referenceHints && template.referenceHints.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-slate-500" />
                Code references (hints)
              </h2>
              <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">
                {template.referenceHints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-3">
                In the editor, lines with <span className="font-mono text-slate-600 dark:text-slate-400">░</span>{" "}
                or <span className="font-mono">TODO</span> are blanks — fill those first.
              </p>
            </div>
          )}
          {template.enhanceOptions && template.enhanceOptions.length > 0 && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4">
              <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                Enhance it to learn
              </h2>
              <p className="text-xs text-amber-800 dark:text-amber-200 mb-3">
                Try one or more of these to practice and level up:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                {template.enhanceOptions.map((opt, i) => (
                  <li key={i}>{opt}</li>
                ))}
              </ul>
              {(() => {
                const sample = getEnhanceSampleForLanguage(template, lang);
                if (!sample?.trim()) return null;
                return (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                      Sample approach (adapt into your file):
                    </p>
                    <CopyableCodeBlock
                      code={sample}
                      language={lang === "python" ? "python" : "javascript"}
                      title="Enhance — sample snippet"
                    />
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {template && (
        <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/30 p-3 mb-4 text-sm">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            <strong>Appy Buddy:</strong> use <strong>Quick offline tip</strong> for built-in answers —{" "}
            <span className="text-indigo-800 dark:text-indigo-200">no cloud tokens</span>. Open the Appy panel on
            the right when you want a full conversation with your code.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={offlineTipLoading}
            onClick={() => void loadOfflineTip()}
          >
            {offlineTipLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lightbulb className="h-4 w-4" />
            )}
            Quick offline tip
          </Button>
          {offlineTip && (
            <p className="mt-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{offlineTip}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 border-2 border-green-600 bg-white text-green-800 hover:bg-green-50 dark:bg-gray-900 dark:text-green-300 dark:border-green-500 dark:hover:bg-green-950/40"
            disabled={grading}
            onClick={() => void handleSubmitGrade()}
          >
            <ClipboardCheck className="h-4 w-4" />
            {grading ? "Checking…" : "Submit & grade"}
          </Button>
          {gradeScore !== null && (
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              Last score: {gradeScore}/100
            </span>
          )}
          {gradeMessage && (
            <span className="text-sm text-gray-600 dark:text-gray-400 max-w-xl">{gradeMessage}</span>
          )}
        </div>
        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2 shrink-0"
        >
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>
      {canAutoGrade && template?.gradeCheck?.outputIncludes?.length ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 max-w-2xl">
          Submit runs your code and checks that the output contains:{" "}
          <span className="font-mono text-gray-700 dark:text-gray-300">
            {template.gradeCheck.outputIncludes.join(" · ")}
          </span>
          . Run once first so output is up to date.
        </p>
      ) : null}

      <AcademyCodeEditor
        key={id}
        value={code}
        onChange={setCode}
        language={editorLang}
        height="420px"
        showRunButton={true}
        onReset={() => setCode(scaffoldCode)}
      />

      {template && solutionCode && (
        <details className="mt-4 group">
          <summary className="cursor-pointer list-none inline-flex">
            <span className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Eye className="h-4 w-4" />
              Full reference solution
            </span>
          </summary>
          <div className="mt-3 space-y-3 pl-1">
            {!unlockSolution ? (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 p-4 text-sm text-amber-950 dark:text-amber-100">
                <p className="mb-2">
                  Try the task yourself first. You can unlock the solution after{" "}
                  <strong>70% or higher</strong> on Submit & grade, or below if you really need it.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowSolutionAnyway(true)}
                >
                  Show solution anyway
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <pre className="text-xs p-4 overflow-x-auto bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 max-h-96 overflow-y-auto">
                  {solutionCode}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}

      <div className="mt-4 flex gap-3">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            showSuccess(
              "Export to Applaa will open in a future update. Your project is saved!"
            );
          }}
        >
          <ExternalLink className="h-4 w-4" />
          Export to Applaa
        </Button>
      </div>
    </div>
  );
}
