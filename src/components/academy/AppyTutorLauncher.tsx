import React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Simple friendly “Appy” face for kids — works in light/dark. */
export function AppyMascotIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <circle cx="20" cy="20" r="18" className="fill-indigo-500 dark:fill-indigo-400" />
      <circle cx="14" cy="17" r="3" className="fill-white" />
      <circle cx="26" cy="17" r="3" className="fill-white" />
      <circle cx="14.5" cy="16.5" r="1.2" className="fill-indigo-900" />
      <circle cx="26.5" cy="16.5" r="1.2" className="fill-indigo-900" />
      <path
        d="M14 25c2 3 10 3 12 0"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 12l3-2M32 12l-3-2"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

export function AppyMascotTeal({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <circle cx="20" cy="20" r="18" className="fill-teal-500 dark:fill-teal-400" />
      <circle cx="14" cy="17" r="3" className="fill-white" />
      <circle cx="26" cy="17" r="3" className="fill-white" />
      <circle cx="14.5" cy="16.5" r="1.2" className="fill-teal-900" />
      <circle cx="26.5" cy="16.5" r="1.2" className="fill-teal-900" />
      <path
        d="M14 25c2 3 10 3 12 0"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Fixed top-right entry so learners don’t miss the tutor when the side column is closed.
 * `top-*` aligns with the first content row (e.g. “Back to …”) in the academy main pane.
 */
export function AppyTutorFloatingLauncher({
  variant,
  onOpen,
}: {
  variant: "indigo" | "teal";
  onOpen: () => void;
}) {
  const isIndigo = variant === "indigo";
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "fixed z-[150] flex items-center gap-2 rounded-2xl border-2 px-3 py-2 shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]",
        "right-4 top-14 max-sm:right-2 max-sm:top-12",
        isIndigo
          ? "border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-900 dark:border-indigo-600 dark:from-indigo-950/90 dark:to-purple-950/80 dark:text-indigo-100"
          : "border-teal-300 bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-900 dark:border-teal-600 dark:from-teal-950/90 dark:to-emerald-950/80 dark:text-teal-100",
      )}
      title="Open Appy Buddy — ask questions anytime"
      aria-label="Open Appy Buddy"
    >
      {isIndigo ? (
        <AppyMascotIcon className="h-10 w-10" />
      ) : (
        <AppyMascotTeal className="h-10 w-10" />
      )}
      <span className="flex flex-col items-start text-left leading-tight">
        <span className="text-sm font-bold tracking-tight">Appy</span>
        <span className="text-[11px] font-medium opacity-90">
          Tap for help
        </span>
      </span>
      <Sparkles
        className={cn(
          "h-4 w-4 shrink-0 opacity-80",
          isIndigo ? "text-amber-500" : "text-amber-400",
        )}
      />
    </button>
  );
}
