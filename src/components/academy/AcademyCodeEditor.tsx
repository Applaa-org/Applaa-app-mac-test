import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Editor, { OnMount } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Play, Loader2, Trash2, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { runJavaScriptInBrowser, runPythonInBrowser } from "@/lib/academySandbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import "@/components/chat/monaco";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

type Lang = "python" | "javascript" | "html" | "react" | "typescript";


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
  onDone: (err: string | null) => void,
  previewHeightPx = 280,
): void {
  const html = buildReactRunnerHtml(code);
  const iframe = document.createElement("iframe");
  iframe.sandbox.add("allow-scripts");
  iframe.style.cssText = `width:100%;height:${previewHeightPx}px;border:0;background:white;`;
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
  onReset?: () => void;
  /** Clear editor to empty string (shown when not read-only). */
  showClearButton?: boolean;
}

export function AcademyCodeEditor({
  value,
  onChange,
  language,
  height = 400,
  readOnly = false,
  onRun,
  showRunButton = true,
  onReset,
  showClearButton = true,
}: AcademyCodeEditorProps) {
  const [output, setOutput] = useState("");
  const [htmlPreview, setHtmlPreview] = useState("");
  const [running, setRunning] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenRef = useRef(false);
  fullscreenRef.current = fullscreen;
  const { theme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const isMacClient = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Macintosh|Mac OS X|MacIntel/i.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

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
        const previewH = fullscreenRef.current
          ? Math.min(Math.floor(window.innerHeight * 0.42), 560)
          : 280;
        runReactInIframe(
          value,
          (err) => {
            setOutput(err ? `Error: ${err}` : "(React app rendered in preview)");
            onRun?.(err ?? "(rendered)");
            setRunning(false);
          },
          previewH,
        );
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
        const out = runJavaScriptInBrowser(value);
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
        const out = runJavaScriptInBrowser(value);
        setOutput(out || "(no output)");
        onRun?.(out);
      } else {
        const out = await runPythonInBrowser(value);
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

  const embeddedEditorHeight =
    typeof height === "number" ? height : height;

  const rootClass = cn(
    "flex flex-col min-h-0 bg-white dark:bg-gray-900",
    fullscreen
      ? "fixed inset-0 z-[200] h-dvh w-full max-w-none rounded-none border-0 shadow-2xl [-webkit-app-region:no-drag]"
      : "rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/50 overflow-hidden shadow-lg",
  );

  const toolbarClass = cn(
    "flex items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 shrink-0",
    fullscreen && isMacClient
      ? "pt-7 pb-3 pl-[3.5rem] pr-3 sm:pl-16"
      : "px-4 py-3",
  );

  const editorWrapClass = cn(
    "bg-gray-50/50 dark:bg-gray-900/50",
    fullscreen && "flex-1 min-h-0 flex flex-col overflow-hidden",
  );

  const outputShellClass = cn(
    "border-t-2 border-indigo-100 dark:border-indigo-900/50 bg-slate-900 text-slate-100 flex flex-col min-h-0",
    fullscreen && "max-h-[38vh] shrink-0",
  );

  const previewScrollClass = cn(
    "overflow-auto bg-white",
    fullscreen ? "min-h-0 flex-1 max-h-[min(32vh,18rem)]" : "min-h-[5rem] max-h-56",
  );

  const textOutputClass = cn(
    "p-4 font-mono text-[15px] leading-relaxed overflow-auto min-h-[5rem]",
    fullscreen ? "max-h-[min(32vh,16rem)] flex-1" : "max-h-56",
    isError ? "text-red-300 bg-red-950/30" : "",
  );

  const tree = (
    <div className={rootClass}>
      <div className={toolbarClass}>
        <span className="text-base font-semibold text-indigo-700 dark:text-indigo-300">
          {language === "python"
            ? "🐍 Python"
            : language === "html"
              ? "📄 HTML/CSS"
              : language === "react"
                ? "⚛️ React"
                : language === "typescript"
                  ? "📘 TypeScript"
                  : "🟨 JavaScript"}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 w-9 p-0"
            onClick={() => setFullscreen((f) => !f)}
            aria-label={fullscreen ? "Exit fullscreen editor" : "Fullscreen editor"}
            title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
          >
            {fullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          {showClearButton && !readOnly && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 p-0"
                    onClick={() => onChange("")}
                    aria-label="Clear editor"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Clear editor
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {showRunButton && (
            <>
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                ⌨️ Ctrl+Enter to run
              </span>
              {onReset && (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={onReset}
                        className="h-9 w-9 p-0 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                        aria-label="Reset code to starter"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Reset to starter
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
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
            </>
          )}
        </div>
      </div>
      <div className={editorWrapClass}>
        <Editor
          onMount={handleEditorMount}
          height={fullscreen ? "100%" : embeddedEditorHeight}
          language={
            language === "react"
              ? "javascript"
              : language === "typescript"
                ? "typescript"
                : language
          }
          value={value}
          onChange={(v) => onChange(v ?? "")}
          theme={editorTheme}
          options={{
            readOnly,
            minimap: { enabled: fullscreen },
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
            automaticLayout: true,
          }}
        />
      </div>
      {showRunButton && (
        <div className={outputShellClass}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 gap-2 flex-wrap shrink-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {language === "html" ? "Preview" : "Output"}
            </span>
            <span className="text-xs text-slate-500 hidden md:inline">
              Tip: change the code and run again to experiment!
            </span>
          </div>
          {language === "html" ? (
            <div className={previewScrollClass}>
              <iframe
                title="HTML preview"
                srcDoc={
                  htmlPreview ||
                  "<p>Write HTML above and click Run to see the preview.</p>"
                }
                className={cn(
                  "w-full border-0",
                  fullscreen ? "min-h-[min(28vh,14rem)]" : "min-h-[12rem]",
                )}
                sandbox="allow-scripts"
              />
            </div>
          ) : language === "react" ? (
            <div className={previewScrollClass}>
              <div
                id="academy-react-preview"
                className={fullscreen ? "min-h-[min(28vh,14rem)]" : "min-h-[12rem]"}
              />
              {output && !output.startsWith("Error") && (
                <p className="text-xs text-slate-500 px-4 py-2">{output}</p>
              )}
            </div>
          ) : (
            <div className={textOutputClass}>
              <pre className="whitespace-pre-wrap break-words m-0">
                {output ||
                  "Click “Run code” or press Ctrl+Enter to see output here! 👆"}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return typeof document !== "undefined" && fullscreen
    ? createPortal(tree, document.body)
    : tree;
}
