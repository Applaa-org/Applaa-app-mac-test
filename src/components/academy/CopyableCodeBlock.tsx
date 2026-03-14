import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

interface CopyableCodeBlockProps {
  code: string;
  language: "python" | "javascript";
  title?: string;
  className?: string;
}

export function CopyableCodeBlock({ code, language, title, className = "" }: CopyableCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-900 ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/80">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {title ?? (language === "python" ? "Python" : "JavaScript")}
        </span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 h-7 text-xs">
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <pre className="p-4 text-sm overflow-x-auto m-0">
        <code className="text-gray-800 dark:text-gray-200 font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}
