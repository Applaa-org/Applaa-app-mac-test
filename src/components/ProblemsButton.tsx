import { useState, useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { selectedAppIdAtom, previewModeAtom } from "@/atoms/appAtoms";
import { AlertTriangle } from "lucide-react";
import { detectAppCategory, type AppCategory } from "@/utils/appTypeDetection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCheckProblems } from "@/hooks/useCheckProblems";
import { IpcClient } from "@/ipc/ipc_client";

export function ProblemsButton() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const { problemReport, checkProblems, isChecking } = useCheckProblems(selectedAppId);
  const setPreviewMode = useSetAtom(previewModeAtom);
  const [appCategory, setAppCategory] = useState<AppCategory>('web');

  // Detect app category for framework-aware prompts
  useEffect(() => {
    let isCancelled = false;
    (async () => {
      try {
        if (!selectedAppId) return;
        const ipc = IpcClient.getInstance();
        const app = await ipc.getApp(selectedAppId);
        // Try to enrich with file list for detection
        try {
          const files = await ipc.getAppFiles(selectedAppId);
          (app as any).files = files;
        } catch {}
        const category = detectAppCategory(app as any);
        if (!isCancelled) setAppCategory(category);
      } catch {
        if (!isCancelled) setAppCategory('web');
      }
    })();
    return () => { isCancelled = true; };
  }, [selectedAppId]);

  // Don't show button if no app selected or no problems
  if (!selectedAppId || !problemReport?.problems?.length) {
    return null;
  }

  const problemCount = problemReport.problems.length;

  const handleNavigateToProblems = () => {
    // 🎯 Direct navigation to Problems tab - cleaner UX matching Dyad's approach
    setPreviewMode("problems");
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      className="relative animate-pulse hover:animate-none"
      onClick={handleNavigateToProblems}
    >
      <AlertTriangle size={16} className="mr-2" />
      {problemCount} Problem{problemCount !== 1 ? 's' : ''}
      <Badge
        variant="secondary"
        className="ml-2 bg-white text-red-600 hover:bg-white"
      >
        {problemCount}
      </Badge>
    </Button>
  );
}
