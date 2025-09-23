import { useState, useCallback, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { IpcClient } from "@/ipc/ipc_client";
import { detectAppCategory, type AppCategory } from "@/utils/appTypeDetection";
import {
  AlertTriangle,
  XCircle,
  FileText,
  Wrench,
  RefreshCw,
  Check,
  Loader2,
} from "lucide-react";
import { Problem, ProblemReport } from "@/ipc/ipc_types";
import { Button } from "@/components/ui/button";

import { useStreamChat } from "@/hooks/useStreamChat";
import { useCheckProblems } from "@/hooks/useCheckProblems";
import { useChats } from "@/hooks/useChats";
import { createProblemFixPrompt } from "@/shared/problem_prompt";
import { showError } from "@/lib/toast";

interface ProblemItemProps {
  problem: Problem;
}

const ProblemItem = ({ problem }: ProblemItemProps) => {
  return (
    <div className="flex items-start gap-3 p-3 border-b border-border hover:bg-[var(--background-darkest)] transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        <XCircle size={16} className="text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={14} className="text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate">{problem.file}</span>

          <span className="text-xs text-muted-foreground">
            {problem.line}:{problem.column}
          </span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">
          {problem.message}
        </p>
      </div>
    </div>
  );
};

interface RecheckButtonProps {
  appId: number;
  size?: "sm" | "default" | "lg";
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  className?: string;
}

const RecheckButton = ({
  appId,
  size = "sm",
  variant = "outline",
  className = "h-7 px-3 text-xs",
}: RecheckButtonProps) => {
  const { checkProblems, isChecking } = useCheckProblems(appId);
  const [showingFeedback, setShowingFeedback] = useState(false);

  const handleRecheck = async () => {
    setShowingFeedback(true);

    const res = await checkProblems();

    setShowingFeedback(false);

    if (res.error) {
      showError(res.error);
    }
  };

  const isShowingChecking = isChecking || showingFeedback;

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleRecheck}
      disabled={isShowingChecking}
      className={className}
      data-testid="recheck-button"
    >
      <RefreshCw
        size={14}
        className={`mr-1 ${isShowingChecking ? "animate-spin" : ""}`}
      />
      {isShowingChecking ? "Checking..." : "Run checks"}
    </Button>
  );
};

interface ProblemsSummaryProps {
  problemReport: ProblemReport;
  appId: number;
}

const ProblemsSummary = ({ problemReport, appId }: ProblemsSummaryProps) => {
  const { streamMessage, isStreaming } = useStreamChat();
  const { problems } = problemReport;
  const totalErrors = problems.length;
  const [isFixingAll, setIsFixingAll] = useState(false);
  const [appCategory, setAppCategory] = useState<AppCategory>('web');

  // Detect app category for framework-aware prompts
  useEffect(() => {
    let isCancelled = false;
    (async () => {
      try {
        if (!appId) return;
        const ipc = IpcClient.getInstance();
        const app = await ipc.getApp(appId);
        // Try to enrich with file list for detection
        try {
          const files = await ipc.getAppFiles(appId);
          (app as any).files = files;
        } catch {}
        const category = detectAppCategory(app as any);
        if (!isCancelled) setAppCategory(category);
      } catch {
        if (!isCancelled) setAppCategory('web');
      }
    })();
    return () => { isCancelled = true; };
  }, [appId]);
  
  // 🚨 CRITICAL FIX: Get chatId from the current app's chat instead of global atom
  const { chats } = useChats(appId);
  const currentChat = chats?.[0]; // Get the first (main) chat for this app
  const chatId = currentChat?.id;

  const handleFixAll = useCallback(async () => {
    if (!chatId) {
      console.error("No chat found for Fix All - appId:", appId, "chats:", chats);
      return;
    }
    if (isFixingAll || isStreaming) {
      console.log("Fix All already in progress, ignoring duplicate click");
      return;
    }
    
    console.log(`Fix All clicked for appId: ${appId}, chatId: ${chatId}`);
    setIsFixingAll(true);
    
    try {
      // Use the standard chat stream hook so the chat UI updates live
      const prompt = createProblemFixPrompt(problemReport, appCategory);
      await streamMessage({
        prompt,
        chatId,
        redo: false,
        attachments: [],
        selectedComponent: null,
      });
      console.log("Fix All stream initiated via chat hook");
      
      // Wait a bit for the fix to complete, then re-check problems
      setTimeout(async () => {
        try {
          console.log("Re-checking problems after Fix All...");
          const IpcClient = (await import("@/ipc/ipc_client")).IpcClient;
          await IpcClient.getInstance().checkProblems({ appId });
        } catch (error) {
          console.error("Failed to re-check problems:", error);
        }
        setIsFixingAll(false);
      }, 3000);
      
    } catch (error) {
      console.error("Fix All failed to start:", error);
      setIsFixingAll(false);
      // Show error to user
      const { showError } = await import("@/lib/toast");
      showError(`Failed to start Fix All: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [chatId, appId, chats, isFixingAll, isStreaming, streamMessage, problemReport]);

  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center">
        <p className="mt-6 text-sm font-medium text-muted-foreground mb-3">
          No problems found
        </p>
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-3">
          <Check size={20} className="text-green-600 dark:text-green-400" />
        </div>

        <RecheckButton appId={appId} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[var(--background-darkest)] border-b border-border">
      <div className="flex items-center gap-4">
        {totalErrors > 0 && (
          <div className="flex items-center gap-2">
            <XCircle size={16} className="text-red-500" />
            <span className="text-sm font-medium">
              {totalErrors} {totalErrors === 1 ? "error" : "errors"}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <RecheckButton appId={appId} />
        <Button
          size="sm"
          variant="default"
          onClick={handleFixAll}
          disabled={isFixingAll || isStreaming || !chatId}
          className="h-7 px-3 text-xs"
          data-testid="fix-all-button"
        >
          {isFixingAll || isStreaming ? (
            <Loader2 size={14} className="mr-1 animate-spin" />
          ) : (
            <Wrench size={14} className="mr-1" />
          )}
          {isFixingAll || isStreaming ? "Fixing..." : "Fix All"}
        </Button>
      </div>
    </div>
  );
};

export function Problems() {
  return (
    <div data-testid="problems-pane">
      <_Problems />
    </div>
  );
}

export function _Problems() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const { problemReport } = useCheckProblems(selectedAppId);

  if (!selectedAppId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-full bg-[var(--background-darkest)] flex items-center justify-center mb-4">
          <AlertTriangle size={24} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No App Selected</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Select an app to view TypeScript problems and diagnostic information.
        </p>
      </div>
    );
  }

  if (!problemReport) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-full bg-[var(--background-darkest)] flex items-center justify-center mb-4">
          <AlertTriangle size={24} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Problems Report</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          Run checks to scan your app for TypeScript errors and other problems.
        </p>
        <RecheckButton appId={selectedAppId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ProblemsSummary problemReport={problemReport} appId={selectedAppId} />
      <div className="flex-1 overflow-y-auto">
        {problemReport.problems.map((problem, index) => (
          <ProblemItem
            key={`${problem.file}-${problem.line}-${problem.column}-${index}`}
            problem={problem}
          />
        ))}
      </div>
    </div>
  );
}
