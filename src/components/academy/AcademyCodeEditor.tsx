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

    // Capture print() and last expression: redirect stdout to StringIO, run code, get value
    const setup = `
import sys
from io import StringIO
__academy_buf__ = StringIO()
__academy_old_stdout__ = sys.stdout
sys.stdout = __academy_buf__
`;
    const teardown = `
sys.stdout = __academy_old_stdout__
__academy_out__ = __academy_buf__.getvalue()
`;
    try {
      pyodide.runPython(setup);
      pyodide.runPython(code);
    } finally {
      try {
        pyodide.runPython(teardown);
      } catch (_) {
        pyodide.runPython("sys.stdout = __academy_old_stdout__");
      }
    }
    const out = (pyodide.globals.get("__academy_out__") ?? "") as string;
    return out.trim() || "(no output)";
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
    if (running) return;
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
  }, [value, language, onRun, running]);

  const runCodeRef = useRef(runCode);
  runCodeRef.current = runCode;

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      if (!showRunButton) return;
      editor.addAction({
        id: "academy-run-code",
        label: "Run code",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: () => {
          runCodeRef.current();
        },
      });
    },
    [showRunButton]
  );

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (showRunButton) runCodeRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showRunButton]);

  const editorTheme = isDark ? "vs-dark" : "vs";

  return (
    <div className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/50 overflow-hidden bg-white dark:bg-gray-900 shadow-md">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50">
        <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
          {language === "python" ? "🐍 Python" : "🟨 JavaScript"}
        </span>
        {showRunButton && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
              Ctrl+Enter to run
            </span>
            <Button
              size="sm"
              onClick={runCode}
              disabled={running}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold shadow"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
              Run code
            </Button>
          </div>
        )}
      </div>
      <Editor
        onMount={handleEditorMount}
        height={typeof height === "number" ? height : height}
        language={language}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        theme={editorTheme}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 15,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          padding: { top: 14 },
          lineHeight: 22,
          cursorBlinking: "smooth",
        }}
      />
      {showRunButton && (
        <div className="border-t-2 border-indigo-100 dark:border-indigo-900/50 bg-slate-900 text-slate-100">
          <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-700">
            Output
          </div>
          <div className="p-4 font-mono text-sm overflow-auto min-h-[4.5rem] max-h-52">
            <pre className="whitespace-pre-wrap break-words m-0">
              {output || "Click “Run code” or press Ctrl+Enter to see output here! 👆"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
