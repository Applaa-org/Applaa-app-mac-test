import React, { useEffect, useState } from "react";
import {
  addAppyTutorUsage,
  loadAppyTutorUsageTotals,
  type AppyTutorUsageTotals,
} from "@/lib/appyTutorUsageStorage";
import { AppyTutorTokensBadge } from "@/components/academy/AppyTutorTokensBadge";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { Bot, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VanillaMarkdownParser } from "@/components/chat/DyadMarkdownParser";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";
import { AppyTutorModelPicker } from "@/components/academy/AppyTutorModelPicker";
import { getAppyTutorPrimaryModel } from "@/lib/appyTutorModels";

interface AcademyAiTutorProps {
  code: string;
  language: string;
}

export function AcademyAiTutor({ code, language }: AcademyAiTutorProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { settings } = useSettings();
  const ipc = IpcClient.getInstance();
  const tutorModel = getAppyTutorPrimaryModel(settings ?? {});
  const [usageTotals, setUsageTotals] = useState<AppyTutorUsageTotals>(() =>
    loadAppyTutorUsageTotals("ai"),
  );

  const tutorMutation = useMutation({
    mutationFn: () =>
      ipc.academyAppyTutor({
        question,
        code: `Language/context: ${language}\n\n${code}`,
        pageContext: pathname,
        academy: "ai",
        model: tutorModel,
      }),
    onSuccess: (data) => {
      if (data.source === "cloud" && data.usage) {
        setUsageTotals(addAppyTutorUsage(data.usage, "ai"));
      }
    },
  });

  useEffect(() => {
    const sync = () => setUsageTotals(loadAppyTutorUsageTotals("ai"));
    window.addEventListener("appy-tutor-usage-changed", sync);
    return () => window.removeEventListener("appy-tutor-usage-changed", sync);
  }, []);

  useEffect(() => {
    if (open) setUsageTotals(loadAppyTutorUsageTotals("ai"));
  }, [open]);

  const handleAsk = () => {
    if (!question.trim()) return;
    tutorMutation.mutate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bot className="h-4 w-4" />
          Ask Appy Buddy
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Appy Buddy
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your editor code is included with each question. You can also chat
            with Appy Buddy in the right panel anytime.
          </p>
          <div className="flex items-center gap-2 w-full min-w-0">
            <div className="min-w-0 flex-1">
              <AppyTutorModelPicker fullWidth />
            </div>
            <AppyTutorTokensBadge totals={usageTotals} academyKind="ai" />
          </div>
        </div>
        <textarea
          className="w-full min-h-[80px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm resize-y"
          placeholder="Your question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button
          onClick={handleAsk}
          disabled={!question.trim() || tutorMutation.isPending}
          className="gap-2"
        >
          {tutorMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
          Ask
        </Button>
        {tutorMutation.data && (
          <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-3 text-sm text-gray-800 dark:text-gray-200 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 space-y-2">
            <span
              className={cn(
                "inline-block text-[10px] font-medium px-1.5 py-0.5 rounded",
                tutorMutation.data.source === "local"
                  ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200"
                  : "bg-indigo-200/80 text-indigo-900 dark:bg-indigo-800/80 dark:text-indigo-100"
              )}
            >
              {tutorMutation.data.source === "local"
                ? "Offline tip"
                : "Appy Buddy"}
            </span>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <VanillaMarkdownParser content={tutorMutation.data.answer} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
