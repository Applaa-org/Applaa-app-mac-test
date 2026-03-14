import React, { useState } from "react";
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

interface AcademyAiTutorProps {
  code: string;
  language: string;
}

export function AcademyAiTutor({ code, language }: AcademyAiTutorProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const ipc = IpcClient.getInstance();

  const tutorMutation = useMutation({
    mutationFn: () => ipc.academyAiTutor({ code, question }),
  });

  const handleAsk = () => {
    if (!question.trim()) return;
    tutorMutation.mutate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bot className="h-4 w-4" />
          Ask AI Tutor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Tutor (offline)
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          I know about variables, loops, functions, errors, and debugging. Ask e.g. &quot;Why is my code not working?&quot; or &quot;Explain this code.&quot; No internet needed.
        </p>
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
          <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700">
            {tutorMutation.data.answer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
