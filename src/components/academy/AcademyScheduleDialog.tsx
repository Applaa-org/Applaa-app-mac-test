import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarRange } from "lucide-react";

/** Current Learn tab — schedule copy focuses on one language/track at a time. */
export type AcademyScheduleContext =
  | "all"
  | "basics"
  | "html"
  | "python"
  | "javascript"
  | "react"
  | "typescript"
  | "ai"
  | "cpp";

function FocusedSchedule({ ctx }: { ctx: Exclude<AcademyScheduleContext, "all"> }) {
  const langLabel =
    ctx === "html"
      ? "Web (HTML/CSS)"
      : ctx === "python"
        ? "Python"
        : ctx === "javascript"
          ? "JavaScript"
          : ctx === "react"
            ? "React"
            : ctx === "typescript"
              ? "TypeScript"
              : ctx === "ai"
                ? "AI"
                : ctx === "cpp"
                  ? "C++"
                  : "Basics";

  return (
    <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Focused plan for <strong>{langLabel}</strong> (this tab). Adjust to your pace.
      </p>
      <section className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 p-3">
        <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-1">Week 1 — {langLabel}</h3>
        <p className="mb-2">
          <strong>Target:</strong> ~3 lessons per day on <strong>{langLabel}</strong> (Mon–Sun) to move through
          this track steadily — about one week for many tracks at that pace.
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Each day: next lesson in order; mark complete when done.</li>
          <li>Revisit any lesson from the list anytime.</li>
        </ul>
      </section>
      {(ctx === "python" || ctx === "javascript" || ctx === "react" || ctx === "typescript") && (
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Concepts + code</h3>
          <p className="text-xs">
            If you see <strong>Concepts</strong> for this track, read sub-topics over ~2 days, then continue{" "}
            <strong>code lessons</strong> at ~3/day.
          </p>
        </section>
      )}
      {ctx === "cpp" && (
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">C++ concepts</h3>
          <p className="text-xs">~2 days per concept block (sub-topics), then practice.</p>
        </section>
      )}
      {ctx === "basics" && (
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Basics pace</h3>
          <p className="text-xs">Short reads — 1–2 per day until Basics is done, then open Web (HTML).</p>
        </section>
      )}
      <section className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3">
        <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">Week 2 — Revision & challenges</h3>
        <p className="text-xs">
          Revisit {langLabel} where needed, then <strong>Challenges</strong> filtered for this language.
        </p>
      </section>
      <section className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
        <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">Week 3 — Projects</h3>
        <p className="text-xs">
          <strong>Projects</strong> in this language — Submit & grade, then Enhance it to learn.
        </p>
      </section>
    </div>
  );
}

function GeneralSchedule() {
  return (
    <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Open a track tab (e.g. Python) to see a <strong>single-language</strong> schedule. Overview below.
      </p>
      <section>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Concepts (per module)</h3>
        <p className="text-xs">
          ~<strong>2 days</strong> per concept block (read sub-topics). Learn → track → Concepts.
        </p>
      </section>
      <section className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 p-3">
        <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-1">Week 1 — Lessons</h3>
        <p className="mb-2 text-xs">
          ~3 lessons/day on <strong>one track at a time</strong>: Basics → Web → Python → JS → React → TS → AI.
        </p>
      </section>
      <section className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3">
        <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">Week 2 — Revision & challenges</h3>
        <p className="text-xs">Review, then Challenges by track.</p>
      </section>
      <section className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
        <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">Week 3 — Projects</h3>
        <p className="text-xs">Templates, Submit & grade, Enhance.</p>
      </section>
    </div>
  );
}

export function AcademyScheduleDialog({
  context = "all",
}: {
  context?: AcademyScheduleContext;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-2 border-green-600 bg-white text-green-900 hover:bg-green-50 dark:bg-gray-900 dark:border-green-500 dark:text-green-200 dark:hover:bg-green-950/50"
        >
          <CalendarRange className="h-4 w-4" />
          Suggested schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suggested learning schedule</DialogTitle>
        </DialogHeader>
        {context === "all" ? <GeneralSchedule /> : <FocusedSchedule ctx={context} />}
      </DialogContent>
    </Dialog>
  );
}
