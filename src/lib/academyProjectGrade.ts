/** Collapse whitespace so "Total:  50" still matches "Total:" and "50". */
function normalizeGradeText(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

export function gradeProjectOutput(
  rawOutput: string,
  check?: { outputIncludes: string[] },
): { score: number; pass: boolean; missing: string[] } {
  if (!check?.outputIncludes?.length) {
    return { score: 100, pass: true, missing: [] };
  }
  const rawLower = normalizeGradeText(rawOutput).toLowerCase();
  if (
    rawOutput.startsWith("Error:") ||
    rawOutput.startsWith("error:") ||
    rawLower.includes("traceback") ||
    rawLower.includes("oserror") ||
    rawLower.includes("ioerror") ||
    rawLower.includes("syntaxerror")
  ) {
    return { score: 0, pass: false, missing: check.outputIncludes };
  }
  const hay = rawLower;
  const missing = check.outputIncludes.filter((m) => !hay.includes(m.trim().toLowerCase()));
  const hit = check.outputIncludes.length - missing.length;
  const score = Math.round((hit / check.outputIncludes.length) * 100);
  return { score, pass: missing.length === 0, missing };
}
