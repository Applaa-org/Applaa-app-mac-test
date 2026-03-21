import type { CodeExample, QuizQuestion } from "@/data/academyLessons";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Opens the system print dialog; content flows across as many pages as needed. */
export function printAcademyRevisionSheet(opts: {
  lessonTitle: string;
  trackLabel: string;
  explanation: string;
  miniChallenge: string;
  quiz: QuizQuestion[];
  /** Primary example from the lesson (shown in Learn). */
  exampleCode: string;
  /** Optional “Show more examples” blocks. */
  extraExamples?: CodeExample[];
  /** Optional challenge starter snippet. */
  challengeStarterCode?: string;
}): void {
  const quizHtml = opts.quiz
    .map(
      (q, i) => `
    <div class="q">
      <p><strong>${i + 1}.</strong> ${escapeHtml(q.question)}</p>
      <ol type="A" class="opts">${q.options.map((o) => `<li>${escapeHtml(o)}</li>`).join("")}</ol>
      <p class="answer">Correct: ${escapeHtml(q.options[q.correctIndex] ?? "")}</p>
    </div>`,
    )
    .join("");

  const exampleBlocks: string[] = [];
  if (opts.exampleCode.trim()) {
    exampleBlocks.push(`
    <div class="example-block">
      <h3>Main example</h3>
      <pre class="code"><code>${escapeHtml(opts.exampleCode)}</code></pre>
    </div>`);
  }
  if (opts.extraExamples?.length) {
    for (const ex of opts.extraExamples) {
      exampleBlocks.push(`
    <div class="example-block">
      <h3>${escapeHtml(ex.title)}</h3>
      <pre class="code"><code>${escapeHtml(ex.code)}</code></pre>
    </div>`);
    }
  }

  const examplesSection =
    exampleBlocks.length > 0
      ? `<div class="section examples">
  <h2>Code examples</h2>
  ${exampleBlocks.join("\n")}
</div>`
      : "";

  const starter =
    opts.challengeStarterCode?.trim() ?
      `<p class="label">Starter code (optional)</p>
      <pre class="code code-sm"><code>${escapeHtml(opts.challengeStarterCode.trim())}</code></pre>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>${escapeHtml(opts.lessonTitle)} — revision</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 900px;
    margin: 0 auto;
    padding: 16px;
    color: #111;
    line-height: 1.45;
  }
  h1 { font-size: 1.35rem; margin: 0 0 0.5rem; }
  h2 {
    font-size: 1.05rem;
    margin: 0 0 0.5rem;
    break-after: avoid-page;
    page-break-after: avoid;
  }
  h3 { font-size: 0.95rem; margin: 0.75rem 0 0.35rem; font-weight: 600; }
  .meta { color: #555; font-size: 0.9rem; margin-bottom: 1rem; }
  .section {
    margin-top: 1.25rem;
    break-inside: auto;
    page-break-inside: auto;
  }
  .examples .example-block {
    margin-bottom: 1rem;
    break-inside: auto;
    page-break-inside: auto;
  }
  .q {
    margin-bottom: 1rem;
    break-inside: auto;
    page-break-inside: auto;
  }
  .opts { margin: 0.35rem 0 0.5rem 1.25rem; }
  .answer { font-size: 0.85rem; color: #1b4332; margin: 0.25rem 0 0; }
  .label { font-size: 0.8rem; font-weight: 600; color: #444; margin: 0.75rem 0 0.25rem; }
  pre.code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.78rem;
    line-height: 1.4;
    margin: 0.35rem 0 0;
    padding: 0.65rem 0.75rem;
    background: #f4f4f5;
    border: 1px solid #d4d4d8;
    border-radius: 6px;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow: visible;
    break-inside: auto;
    page-break-inside: auto;
  }
  pre.code-sm { font-size: 0.72rem; }
  .footer-tip { margin-top: 1.5rem; font-size: 0.8rem; color: #666; }
  @media print {
    @page {
      size: auto;
      margin: 12mm;
    }
    body {
      max-width: none;
      margin: 0;
      padding: 0;
    }
    pre.code {
      background: #f8f8f8;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
</style></head>
<body>
  <h1>${escapeHtml(opts.lessonTitle)}</h1>
  <p class="meta">${escapeHtml(opts.trackLabel)} · Applaa AI Academy — revision</p>
  <div class="section"><h2>What this lesson covers</h2><p>${escapeHtml(opts.explanation).replace(/\n/g, "<br/>")}</p></div>
  ${examplesSection}
  <div class="section"><h2>Mini challenge</h2><p>${escapeHtml(opts.miniChallenge)}</p>${starter}</div>
  <div class="section"><h2>Quiz (with answers for checking)</h2>${quizHtml}</div>
  <p class="footer-tip">Tip: cover the “Correct” lines and try the quiz again from memory.</p>
</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Revision sheet print preview");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";

  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    iframe.remove();
  };

  const runPrint = () => {
    const fallback = window.setTimeout(cleanup, 60_000);
    const onAfterPrint = () => {
      window.clearTimeout(fallback);
      cleanup();
    };
    win.addEventListener("afterprint", onAfterPrint, { once: true });
    try {
      win.focus();
      win.print();
    } catch {
      window.clearTimeout(fallback);
      cleanup();
    }
  };

  window.setTimeout(runPrint, 100);
}
