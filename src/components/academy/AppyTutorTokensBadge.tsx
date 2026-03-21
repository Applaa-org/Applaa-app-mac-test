import { Hash } from "lucide-react";
import {
  formatCompactTokenCount,
  type AppyTutorAcademyKind,
  type AppyTutorUsageTotals,
} from "@/lib/appyTutorUsageStorage";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Cumulative cloud token total for Appy Buddy (pricing / plan awareness). */
export function AppyTutorTokensBadge({
  totals,
  academyKind,
}: {
  totals: AppyTutorUsageTotals;
  /** Which academy this total is for (AI vs Learning — separate totals). */
  academyKind: AppyTutorAcademyKind;
}) {
  const label = formatCompactTokenCount(totals.totalTokens);
  const detail = `${totals.totalTokens.toLocaleString()} total (${totals.promptTokens.toLocaleString()} prompt + ${totals.completionTokens.toLocaleString()} completion)`;
  const scope =
    academyKind === "learning"
      ? "Learning Academy"
      : "AI Academy";
  const titleFallback = `${scope} Appy Buddy · ${detail}. Only cloud model replies count; offline tips use no tokens.`;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 tabular-nums min-h-8 cursor-help hover:bg-gray-100 dark:hover:bg-gray-800"
            title={titleFallback}
            aria-label={titleFallback}
          >
            <Hash className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            {label}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[19rem] text-left leading-snug px-3 py-2.5 z-[500]"
        >
          <p className="font-semibold text-primary-foreground mb-1.5">
            Token count (#)
          </p>
          <p className="text-primary-foreground/95 text-[11px]">
            Running total for <span className="font-medium">{scope}</span> Appy
            Buddy — <strong>only messages answered by a cloud model</strong> add
            to this. Local / offline tips do not use API tokens.
          </p>
          <p className="mt-2 text-[11px] text-primary-foreground/90 border-t border-primary-foreground/20 pt-2">
            {detail}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
