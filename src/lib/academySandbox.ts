/**
 * Shared code execution for Academy challenges and projects (Python / JS in browser).
 */

export type AcademySandboxLang =
  | "python"
  | "javascript"
  | "html"
  | "react"
  | "typescript";

declare global {
  interface Window {
    loadPyodide?: () => Promise<{ runPython: (code: string) => string }>;
    __pyodidePromise?: Promise<{ runPython: (code: string) => string }>;
  }
}

export async function runPythonInBrowser(code: string): Promise<string> {
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
    const getPyodide = (window as unknown as { loadPyodide?: () => Promise<{ runPython: (c: string) => string }> })
      .loadPyodide;
    if (!getPyodide) return "Pyodide not loaded.";
    if (!window.__pyodidePromise) {
      window.__pyodidePromise = getPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
      });
    }
    const pyodide = await window.__pyodidePromise;

    const setup = `
import sys
from io import StringIO
__academy_buf__ = StringIO()
__academy_old_stdout__ = sys.stdout
sys.stdout = __academy_buf__
`;
    /** Pyodide has no real stdin — patch input() so pasted samples using input() / prompt don't crash. */
    const inputPatch = `
import builtins
__academy_in_i = [0]
__academy_in_vals = [50, 25, 37, 42, 43, 44, 45, 33, 66, 10, 20, 30, 40, 60, 70, 80, 90, 4, "Paris", "4", "jupiter", "yes", "no"]
def __academy_input(prompt=""):
    if __academy_in_i[0] < len(__academy_in_vals):
        v = __academy_in_vals[__academy_in_i[0]]
        __academy_in_i[0] += 1
        return str(v)
    return "50"
builtins.input = __academy_input
`;
    const teardown = `
sys.stdout = __academy_old_stdout__
__academy_out__ = __academy_buf__.getvalue()
`;
    try {
      pyodide.runPython(setup);
      pyodide.runPython(inputPatch);
      pyodide.runPython(code);
    } finally {
      try {
        pyodide.runPython(teardown);
      } catch {
        pyodide.runPython("sys.stdout = __academy_old_stdout__");
      }
    }
    const out = (pyodide.globals.get("__academy_out__") ?? "") as string;
    return out.trim() || "(no output)";
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return `Error: ${msg}`;
  }
}

export function runJavaScriptInBrowser(code: string): string {
  const lines: string[] = [];
  const customConsole = {
    log: (...args: unknown[]) => {
      lines.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
    },
    warn: (...args: unknown[]) => {
      lines.push(
        "warn: " + args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
      );
    },
    error: (...args: unknown[]) => {
      lines.push(
        "error: " + args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
      );
    },
  };
  try {
    const fn = new Function("console", code);
    fn(customConsole);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    lines.push(`Error: ${msg}`);
  }
  return lines.join("\n") || "(no output)";
}

export async function runAcademySandboxCode(
  code: string,
  language: AcademySandboxLang,
): Promise<string> {
  if (language === "html" || language === "react") {
    return "(preview-only: use Run in the editor)";
  }
  if (language === "typescript") {
    return runJavaScriptInBrowser(code);
  }
  if (language === "javascript") {
    return runJavaScriptInBrowser(code);
  }
  return runPythonInBrowser(code);
}
