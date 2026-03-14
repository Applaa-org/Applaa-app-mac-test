import React, { useState, useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { AcademyCodeEditor } from "@/components/academy/AcademyCodeEditor";
import { Button } from "@/components/ui/button";
import { getProjectTemplate } from "@/data/academyProjects";
import { Save, ExternalLink, ArrowLeft } from "lucide-react";
import { showError, showSuccess } from "@/lib/toast";

export function AcademyProjectDetail() {
  const { projectId } = useParams({ from: "/academy/projects/$projectId" });
  const id = Number(projectId);
  const queryClient = useQueryClient();
  const ipc = IpcClient.getInstance();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const { data: project, isLoading } = useQuery({
    queryKey: ["academy-project", id],
    queryFn: () => ipc.academyGetProject({ id }),
    enabled: !Number.isNaN(id) && id > 0,
  });

  useEffect(() => {
    if (project) {
      setCode(project.code);
      setName(project.name);
    }
  }, [project]);

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
      showSuccess("Project saved");
    },
    onError: (e) => showError(e as Error),
  });

  const template = project ? getProjectTemplate(project.projectType) : null;

  if (Number.isNaN(id) || id <= 0) {
    return (
      <div className="p-6">
        <p className="text-red-600">Invalid project.</p>
        <Link to="/academy/projects" className="text-indigo-600 hover:underline">
          Back to projects
        </Link>
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

  const lang = project.language as "python" | "javascript";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link
        to="/academy/projects"
        className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {name}
        </h1>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>
      {template && (
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
          {template.instructions}
        </p>
      )}
      <AcademyCodeEditor
        value={code}
        onChange={setCode}
        language={lang}
        height="420px"
        showRunButton={true}
      />
      <div className="mt-4 flex gap-3">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            // Export to Applaa: later create a web app from this code
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
