import React, { useState, useRef, useCallback } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import "@/components/chat/monaco";
import { useTheme } from "@/contexts/ThemeContext";

type Lang = "python" | "javascript" | "html" | "react" | "typescript";

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

const REACT_CDN =
  "https://unpkg.com/react@18/umd/react.development.js";
const REACT_DOM_CDN =
  "https://unpkg.com/react-dom@18/umd/react-dom.development.js";

function buildReactRunnerHtml(code: string): string {
  const escaped = code
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$")
    .replace(/<\/script/g, "<\\/script");
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <div id="root"></div>
  <script crossorigin src="${REACT_CDN}"></script>
  <script crossorigin src="${REACT_DOM_CDN}"></script>
  <script>
    (function() {
      try {
        var root = ReactDOM.createRoot(document.getElementById('root'));
        (function(React, ReactDOM, root) {
          ${escaped}
        })(window.React, window.ReactDOM, root);
      } catch (e) {
        document.body.innerHTML = '<pre style="color:red;padding:1rem;white-space:pre-wrap">' + (e.message || e) + '</pre>';
      }
    })();
  <\/script>
</body>
</html>`;
}

function runReactInIframe(
  code: string,
  onDone: (err: string | null) => void
): void {
  const html = buildReactRunnerHtml(code);
  const iframe = document.createElement("iframe");
  iframe.sandbox.add("allow-scripts");
  iframe.style.cssText = "width:100%;height:280px;border:0;background:white;";
  const container = document.getElementById("academy-react-preview");
  if (!container) {
    onDone("Preview container not found");
    return;
  }
  container.innerHTML = "";
  container.appendChild(iframe);
  iframe.srcdoc = html;
  iframe.onload = () => onDone(null);
  iframe.onerror = () => onDone("Failed to load React preview");
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
  const [htmlPreview, setHtmlPreview] = useState("");
  const [running, setRunning] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const runCode = useCallback(async () => {
    if (running && language !== "html" && language !== "react") return;
    if (language === "html") {
      setHtmlPreview(value || "<p>Write HTML above and click Run to see the preview.</p>");
      onRun?.("(HTML preview updated)");
      return;
    }
    if (language === "react") {
      setRunning(true);
      setOutput("Loading React...");
      try {
        await runReactInIframe(value, (err) => {
          setOutput(err ? `Error: ${err}` : "(React app rendered in preview)");
          onRun?.(err ?? "(rendered)");
          setRunning(false);
        });
      } catch (e: any) {
        setOutput(`Error: ${e?.message ?? e}`);
        onRun?.(`Error: ${e?.message ?? e}`);
        setRunning(false);
      }
      return;
    }
    if (language === "typescript") {
      setRunning(true);
      setOutput("Running...");
      try {
        const out = runJavaScript(value);
        setOutput(out || "(no output)");
        onRun?.(out);
      } catch (e: any) {
        setOutput(`Error: ${e?.message ?? e}`);
        onRun?.(`Error: ${e?.message ?? e}`);
      } finally {
        setRunning(false);
      }
      return;
    }
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
  const isError = output.startsWith("Error:") || output.startsWith("error:");

  return (
    <div className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/50 overflow-hidden bg-white dark:bg-gray-900 shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50">
        <span className="text-base font-semibold text-indigo-700 dark:text-indigo-300">
          {language === "python" ? "🐍 Python" : language === "html" ? "📄 HTML/CSS" : language === "react" ? "⚛️ React" : language === "typescript" ? "📘 TypeScript" : "🟨 JavaScript"}
        </span>
        {showRunButton && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
              ⌨️ Ctrl+Enter to run
            </span>
            <Button
              size="sm"
              onClick={runCode}
              disabled={running}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md px-4 py-2 h-9"
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
      <div className="bg-gray-50/50 dark:bg-gray-900/50">
      <Editor
        onMount={handleEditorMount}
        height={typeof height === "number" ? height : height}
        language={language === "react" ? "javascript" : language === "typescript" ? "typescript" : language}
          value={value}
          onChange={(v) => onChange(v ?? "")}
          theme={editorTheme}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 16,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            padding: { top: 16, bottom: 16 },
            lineHeight: 24,
            cursorBlinking: "smooth",
            fontFamily: "var(--font-mono, 'SF Mono', Monaco, monospace)",
            letterSpacing: 0.3,
            renderLineHighlight: "line",
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>
      {showRunButton && (
        <div className="border-t-2 border-indigo-100 dark:border-indigo-900/50 bg-slate-900 text-slate-100">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {language === "html" ? "Preview" : "Output"}
            </span>
            <span className="text-xs text-slate-500 hidden md:inline">Tip: change the code and run again to experiment!</span>
          </div>
          {language === "html" ? (
            <div className="min-h-[5rem] max-h-56 overflow-auto bg-white">
              <iframe
                title="HTML preview"
                srcDoc={htmlPreview || "<p>Write HTML above and click Run to see the preview.</p>"}
                className="w-full min-h-[12rem] border-0"
                sandbox="allow-scripts"
              />
            </div>
          ) : language === "react" ? (
            <div className="min-h-[5rem] max-h-56 overflow-auto bg-white">
              <div id="academy-react-preview" className="min-h-[12rem]" />
              {output && !output.startsWith("Error") && (
                <p className="text-xs text-slate-500 px-4 py-2">{output}</p>
              )}
            </div>
          ) : (
            <div
              className={`p-4 font-mono text-[15px] leading-relaxed overflow-auto min-h-[5rem] max-h-56 ${
                isError ? "text-red-300 bg-red-950/30" : ""
              }`}
            >
              <pre className="whitespace-pre-wrap break-words m-0">
                {output || "Click “Run code” or press Ctrl+Enter to see output here! 👆"}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
