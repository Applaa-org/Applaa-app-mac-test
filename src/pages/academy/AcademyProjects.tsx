import React, { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import {
  ACADEMY_PROJECT_TEMPLATES,
  getProjectTemplate,
  getScaffoldCodeForLanguage,
  type ProjectLanguage,
} from "@/data/academyProjects";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban, Sparkles, ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const LEVEL_COLORS: Record<string, string> = {
  Starter: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  Intermediate: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Expert: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

type ProjectLevelFilter = "all" | "Starter" | "Intermediate" | "Expert";
const PROJECT_LEVEL_FILTERS: { id: ProjectLevelFilter; label: string }[] = [
  { id: "all", label: "All levels" },
  { id: "Starter", label: "Starter" },
  { id: "Intermediate", label: "Intermediate" },
  { id: "Expert", label: "Expert" },
];

export function AcademyProjects() {
  const ipc = IpcClient.getInstance();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState(ACADEMY_PROJECT_TEMPLATES[0].type);
  const [newLang, setNewLang] = useState<ProjectLanguage>("javascript");
  const [levelFilter, setLevelFilter] = useState<ProjectLevelFilter>("all");
  const [showAllProjects, setShowAllProjects] = useState(false);
  const MY_PROJECTS_PREVIEW = 3;

  const { data: projects = [], refetch } = useQuery({
    queryKey: ["academy-projects"],
    queryFn: () => ipc.academyListProjects(),
  });

  const filteredTemplates = useMemo(() => {
    if (levelFilter === "all") return ACADEMY_PROJECT_TEMPLATES;
    return ACADEMY_PROJECT_TEMPLATES.filter((t) => t.level === levelFilter);
  }, [levelFilter]);

  /** Template types the user has at least one saved project for */
  const startedTemplateTypes = useMemo(
    () => new Set(projects.map((p) => p.projectType)),
    [projects],
  );

  /** First saved project per template type (for Continue link) */
  const firstProjectByTemplateType = useMemo(() => {
    const m = new Map<string, (typeof projects)[0]>();
    for (const p of projects) {
      if (!m.has(p.projectType)) m.set(p.projectType, p);
    }
    return m;
  }, [projects]);

  const levelProgress = useMemo(() => {
    return (["Starter", "Intermediate", "Expert"] as const).map((level) => {
      const templates = ACADEMY_PROJECT_TEMPLATES.filter((t) => t.level === level);
      const started = templates.filter((t) => startedTemplateTypes.has(t.type)).length;
      return { level, total: templates.length, started, notStarted: templates.length - started };
    });
  }, [startedTemplateTypes]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const t = ACADEMY_PROJECT_TEMPLATES.find((x) => x.type === newType);
    const code = t ? getScaffoldCodeForLanguage(t, newLang) : "// Start coding";
    try {
      await ipc.academySaveProject({
        name: newName.trim(),
        projectType: newType,
        code,
        language: newLang,
      });
      refetch();
      setCreateOpen(false);
      setNewName("");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to create project");
    }
  };

  const openCreateWithTemplate = (type: string, suggestedName: string) => {
    setNewType(type);
    setNewName(suggestedName.trim() ? suggestedName : "");
    setCreateOpen(true);
  };

  const visibleProjects = showAllProjects ? projects : projects.slice(0, MY_PROJECTS_PREVIEW);

  return (
    <div className="p-6 w-full max-w-[1600px] mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Projects
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        The best way to learn: pick a level, choose a project, run it, then enhance it.
      </p>

      {/* My projects first so new work is visible */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-indigo-500" />
          My projects
        </h2>
        <Button onClick={() => setCreateOpen(true)} variant="outline" size="sm" className="gap-2 mb-4">
          <Plus className="h-4 w-4" />
          New project
        </Button>
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center text-gray-500 dark:text-gray-400 mb-6">
            <FolderKanban className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No projects yet. Scroll down to pick a sample template and start.</p>
          </div>
        ) : (
          <>
            <ul className="space-y-2 mb-3">
              {visibleProjects.map((p) => {
                const template = getProjectTemplate(p.projectType);
                return (
                  <li key={p.id}>
                    <Link
                      to="/academy/projects/$projectId"
                      params={{ projectId: String(p.id) }}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 w-full"
                    >
                      <FolderKanban className="h-5 w-5 text-indigo-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {p.name}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                          {p.projectType}
                          {template?.level ? ` · ${template.level}` : ""} · {p.language}
                        </span>
                      </div>
                      {p.lastGradeScore != null ? (
                        <span
                          className="shrink-0 text-xs font-semibold tabular-nums px-2 py-1 rounded-md bg-emerald-100 text-emerald-900 dark:bg-emerald-900/45 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-700/60"
                          title="Latest Submit & grade score"
                        >
                          {p.lastGradeScore}/100
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {projects.length > MY_PROJECTS_PREVIEW && (
              <button
                type="button"
                onClick={() => setShowAllProjects((v) => !v)}
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline mb-6"
              >
                {showAllProjects ? "Show less" : `Show more (${projects.length - MY_PROJECTS_PREVIEW} hidden)`}
              </button>
            )}
          </>
        )}
      </section>

      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Level</p>
        <div className="flex flex-wrap gap-2">
          {PROJECT_LEVEL_FILTERS.map((l) => (
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
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-2.5">
          {levelProgress.map(({ level, total, started, notStarted }) => (
            <div key={level} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className={`font-semibold px-1.5 py-0.5 rounded text-xs ${LEVEL_COLORS[level] ?? ""}`}>
                {level}
              </span>
              <span className="text-green-700 dark:text-green-400 tabular-nums">{started} started</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600 dark:text-gray-400 tabular-nums">{notStarted} not started</span>
              <span className="text-gray-400 text-xs">({total} total)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sample projects – see them, then start & enhance */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Sample projects ({filteredTemplates.length})
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Each card shows <strong className="text-gray-700 dark:text-gray-300">Started</strong> or{" "}
          <strong className="text-gray-700 dark:text-gray-300">Not started</strong>. Continue an existing project
          instead of starting the same template twice — or start another copy if you really want a fresh file.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((t) => {
            const isStarted = startedTemplateTypes.has(t.type);
            const existing = firstProjectByTemplateType.get(t.type);
            return (
              <div
                key={t.id}
                className={cn(
                  "rounded-xl border bg-white dark:bg-gray-900 p-4 shadow-sm flex flex-col",
                  isStarted
                    ? "border-green-300 dark:border-green-800/60 ring-1 ring-green-200/50 dark:ring-green-900/30"
                    : "border-gray-200 dark:border-gray-700",
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{t.name}</span>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLORS[t.level] ?? "bg-gray-100 text-gray-800"}`}
                  >
                    {t.level}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  {isStarted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                      <span className="text-xs font-semibold text-green-800 dark:text-green-300">Started</span>
                    </>
                  ) : (
                    <>
                      <CircleDashed className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Not started</span>
                    </>
                  )}
                </div>
                {t.explanation && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {t.explanation}
                  </p>
                )}
                {t.enhanceOptions && t.enhanceOptions.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <span className="font-medium text-amber-700 dark:text-amber-300">Enhance:</span>
                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                      {t.enhanceOptions.slice(0, 2).map((opt, i) => (
                        <li key={i} className="line-clamp-1">
                          {opt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-auto flex flex-col gap-2">
                  {existing ? (
                    <>
                      <Button size="sm" className="w-full gap-1 bg-indigo-600 hover:bg-indigo-700" asChild>
                        <Link to="/academy/projects/$projectId" params={{ projectId: String(existing.id) }}>
                          Continue project
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1 text-xs"
                        onClick={() => openCreateWithTemplate(t.type, `${t.name} (copy)`)}
                      >
                        Start another copy
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1"
                      onClick={() => openCreateWithTemplate(t.type, t.name)}
                    >
                      Start this project
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project name
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Calculator"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sample project template
              </label>
              <select
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              >
                {ACADEMY_PROJECT_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.type}>
                    {t.name} ({t.level})
                  </option>
                ))}
              </select>
              {(() => {
                const t = ACADEMY_PROJECT_TEMPLATES.find((x) => x.type === newType);
                if (!t) return null;
                return (
                  <div className="mt-1.5 space-y-1">
                    <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200">
                      {t.level}
                    </span>
                    {t.explanation && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t.explanation}</p>
                    )}
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language
              </label>
              <select
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={newLang}
                onChange={(e) => setNewLang(e.target.value as ProjectLanguage)}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="react">React</option>
                <option value="typescript">TypeScript</option>
              </select>
            </div>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
