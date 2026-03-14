import React, { useState, useRef, useCallback } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import "@/components/chat/monaco";
import { useTheme } from "@/contexts/ThemeContext";

type Lang = "python" | "javascript";

declare global {
  interface Window {
    loadPyodide?: () => Promise<{ runPython: (code: string) => string }>;
    __pyodidePromise?: Promise<{ runPython: (code: string) => string }>;
  }
}

async function runPython(code: string): Promise<string> {
  try {
    if (!window.loadPyodide) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";
      script.async = true;
      document.head.appendChild(script);
      await new Promise<void>((res, rej) => {
        script.onload = () => res();
        script.onerror = () => rej(new Error("Failed to load Pyodide"));
      });
    }
    const getPyodide = (window as any).loadPyodide;
    if (!getPyodide) return "Pyodide not loaded.";
    if (!window.__pyodidePromise) window.__pyodidePromise = getPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/" });
    const pyodide = await window.__pyodidePromise;
    const result = pyodide.runPython(code);
    return result != null ? String(result) : "";
  } catch (e: any) {
    return `Error: ${e?.message ?? e}`;
  }
}

function runJavaScript(code: string): string {
  const lines: string[] = [];
  const customConsole = {
    log: (...args: unknown[]) => {
      lines.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
    },
    warn: (...args: unknown[]) => {
      lines.push("warn: " + args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
    },
    error: (...args: unknown[]) => {
      lines.push("error: " + args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
    },
  };
  try {
    const fn = new Function("console", code);
    fn(customConsole);
  } catch (e: any) {
    lines.push(`Error: ${e?.message ?? e}`);
  }
  return lines.join("\n") || "(no output)";
}

interface AcademyCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: Lang;
  height?: string | number;
  readOnly?: boolean;
  onRun?: (output: string) => void;
  showRunButton?: boolean;
}

export function AcademyCodeEditor({
  value,
  onChange,
  language,
  height = 280,
  readOnly = false,
  onRun,
  showRunButton = true,
}: AcademyCodeEditorProps) {
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const runCode = useCallback(async () => {
    setRunning(true);
    setOutput("Running...");
    try {
      if (language === "javascript") {
        const out = runJavaScript(value);
        setOutput(out || "(no output)");
        onRun?.(out);
      } else {
        const out = await runPython(value);
        setOutput(out || "(no output)");
        onRun?.(out);
      }
    } catch (e: any) {
      setOutput(`Error: ${e?.message ?? e}`);
      onRun?.(`Error: ${e?.message ?? e}`);
    } finally {
      setRunning(false);
    }
  }, [value, language, onRun]);

  const editorTheme = isDark ? "vs-dark" : "vs";

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {language === "python" ? "Python" : "JavaScript"}
        </span>
        {showRunButton && (
          <Button size="sm" onClick={runCode} disabled={running} className="gap-1.5">
            {running ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Run
          </Button>
        )}
      </div>
      <Editor
        height={typeof height === "number" ? height : height}
        language={language}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        theme={editorTheme}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
        }}
      />
      {showRunButton && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-900 text-gray-100 p-3 font-mono text-sm overflow-auto max-h-40">
          <pre className="whitespace-pre-wrap break-words m-0">Output:\n{output || " (click Run)"}</pre>
        </div>
      )}
    </div>
  );
}
