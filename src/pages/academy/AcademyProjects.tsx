import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { ACADEMY_PROJECT_TEMPLATES } from "@/data/academyProjects";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function AcademyProjects() {
  const ipc = IpcClient.getInstance();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState(ACADEMY_PROJECT_TEMPLATES[0].type);
  const [newLang, setNewLang] = useState<"python" | "javascript">("javascript");

  const { data: projects = [], refetch } = useQuery({
    queryKey: ["academy-projects"],
    queryFn: () => ipc.academyListProjects(),
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const t = ACADEMY_PROJECT_TEMPLATES.find((x) => x.type === newType);
    const code = t ? t.starterCode[newLang] : "// Start coding";
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Projects
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Build small projects and save them. Later you can export to Applaa.
      </p>
      <Button onClick={() => setCreateOpen(true)} className="gap-2 mb-6">
        <Plus className="h-4 w-4" />
        New project
      </Button>
      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center text-gray-500 dark:text-gray-400">
          <FolderKanban className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No projects yet. Create one to get started.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {projects.map((p) => (
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
                    {p.projectType} · {p.language}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

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
                Template
              </label>
              <select
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              >
                {ACADEMY_PROJECT_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.type}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language
              </label>
              <select
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={newLang}
                onChange={(e) => setNewLang(e.target.value as "python" | "javascript")}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
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
