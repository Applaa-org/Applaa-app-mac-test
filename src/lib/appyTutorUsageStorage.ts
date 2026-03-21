/**
 * Cumulative Appy Buddy token usage (renderer) for pricing / plan UI.
 * Only cloud replies increment totals (local/offline answers do not).
 * Totals are **separate** per academy (AI Academy vs Learning Academy).
 */

const LEGACY_KEY = "appy-tutor-token-usage:v1";

export type AppyTutorAcademyKind = "ai" | "learning";

export type AppyTutorUsageTotals = {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
};

function storageKey(academy: AppyTutorAcademyKind): string {
  return `appy-tutor-token-usage:v2:${academy}`;
}

function defaultTotals(): AppyTutorUsageTotals {
  return { totalTokens: 0, promptTokens: 0, completionTokens: 0 };
}

/** One-time migration: legacy combined v1 bucket → AI Academy only. */
function migrateLegacyIfNeeded(): void {
  if (typeof window === "undefined") return;
  try {
    const hasV2 =
      localStorage.getItem(storageKey("ai")) != null ||
      localStorage.getItem(storageKey("learning")) != null;
    if (hasV2) return;
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const p = JSON.parse(raw) as Partial<AppyTutorUsageTotals>;
    const migrated: AppyTutorUsageTotals = {
      totalTokens: typeof p.totalTokens === "number" ? p.totalTokens : 0,
      promptTokens: typeof p.promptTokens === "number" ? p.promptTokens : 0,
      completionTokens:
        typeof p.completionTokens === "number" ? p.completionTokens : 0,
    };
    localStorage.setItem(storageKey("ai"), JSON.stringify(migrated));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

export function loadAppyTutorUsageTotals(
  academy: AppyTutorAcademyKind,
): AppyTutorUsageTotals {
  if (typeof window === "undefined") return defaultTotals();
  migrateLegacyIfNeeded();
  try {
    const raw = localStorage.getItem(storageKey(academy));
    if (!raw) return defaultTotals();
    const p = JSON.parse(raw) as Partial<AppyTutorUsageTotals>;
    return {
      totalTokens: typeof p.totalTokens === "number" ? p.totalTokens : 0,
      promptTokens: typeof p.promptTokens === "number" ? p.promptTokens : 0,
      completionTokens:
        typeof p.completionTokens === "number" ? p.completionTokens : 0,
    };
  } catch {
    return defaultTotals();
  }
}

export function addAppyTutorUsage(
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  },
  academy: AppyTutorAcademyKind,
): AppyTutorUsageTotals {
  const pt = Math.max(0, Math.round(usage.promptTokens || 0));
  const ct = Math.max(0, Math.round(usage.completionTokens || 0));
  let tt = Math.max(0, Math.round(usage.totalTokens || 0));
  if (tt <= 0 && pt + ct > 0) {
    tt = pt + ct;
  }
  if (tt <= 0 && pt <= 0 && ct <= 0) {
    return loadAppyTutorUsageTotals(academy);
  }
  const prev = loadAppyTutorUsageTotals(academy);
  const next: AppyTutorUsageTotals = {
    totalTokens: prev.totalTokens + tt,
    promptTokens: prev.promptTokens + pt,
    completionTokens: prev.completionTokens + ct,
  };
  try {
    localStorage.setItem(storageKey(academy), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("appy-tutor-usage-changed"));
  } catch {
    /* ignore */
  }
  return next;
}

/** Short label for token totals: 247, 1.2k, 1.2M */
export function formatCompactTokenCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n < 1000) return String(Math.round(n));
  const s = new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: n >= 1_000_000 ? 2 : 1,
  }).format(n);
  return s.replace(/K\b/, "k");
}
