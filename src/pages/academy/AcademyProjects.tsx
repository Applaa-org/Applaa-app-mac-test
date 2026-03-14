import React, { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { ACADEMY_PROJECT_TEMPLATES, getProjectTemplate, getStarterCodeForLanguage, type ProjectLanguage } from "@/data/academyProjects";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban, Sparkles, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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

  const { data: projects = [], refetch } = useQuery({
    queryKey: ["academy-projects"],
    queryFn: () => ipc.academyListProjects(),
  });

  const filteredTemplates = useMemo(() => {
    if (levelFilter === "all") return ACADEMY_PROJECT_TEMPLATES;
    return ACADEMY_PROJECT_TEMPLATES.filter((t) => t.level === levelFilter);
  }, [levelFilter]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const t = ACADEMY_PROJECT_TEMPLATES.find((x) => x.type === newType);
    const code = t ? getStarterCodeForLanguage(t, newLang) : "// Start coding";
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Projects
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        The best way to learn: pick a level, choose a project, run it, then enhance it.
      </p>

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
      </div>

      {/* Sample projects – see them, then start & enhance */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Sample projects ({filteredTemplates.length})
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Click &quot;Start this project&quot; to copy the code and run it. Then use the enhance ideas to practice.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm flex flex-col"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{t.name}</span>
                <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLORS[t.level] ?? "bg-gray-100 text-gray-800"}`}>
                  {t.level}
                </span>
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
                      <li key={i} className="line-clamp-1">{opt}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-auto gap-1 w-full"
                onClick={() => openCreateWithTemplate(t.type, t.name)}
              >
                Start this project
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* My projects */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-indigo-500" />
          My projects
        </h2>
        <Button onClick={() => setCreateOpen(true)} variant="outline" size="sm" className="gap-2 mb-4">
          <Plus className="h-4 w-4" />
          New project
        </Button>
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center text-gray-500 dark:text-gray-400">
            <FolderKanban className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No projects yet. Pick a sample above and click &quot;Start this project&quot;.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => {
              const template = getProjectTemplate(p.projectType);
              return (
                <li key={p.id}>
                  <Link
                    to="/academy/projects/$projectId"
                    params={{ projectId: String(p.id) }}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <FolderKanban className="h-5 w-5 text-indigo-500 shrink-0" />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {p.name}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        {p.projectType}
                        {template?.level ? ` · ${template.level}` : ""} · {p.language}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
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
