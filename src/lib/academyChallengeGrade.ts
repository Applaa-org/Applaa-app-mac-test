import {
  CHALLENGE_SUCCESS_MARKERS,
  type AcademyChallenge,
} from "@/data/academyChallenges";

function normalizeOutput(s: string): string {
  return s.replace(/\r\n/g, "\n").trim();
}

function outputIncludesMarker(output: string, marker: string): boolean {
  const m = marker.trim();
  if (!m) return true;
  return output.toLowerCase().includes(m.toLowerCase());
}

function markersForChallenge(challenge: AcademyChallenge): string[] | undefined {
  if (challenge.successMarkers && challenge.successMarkers.length > 0) {
    return challenge.successMarkers;
  }
  const fromMap = CHALLENGE_SUCCESS_MARKERS[challenge.id];
  return fromMap && fromMap.length > 0 ? fromMap : undefined;
}

/**
 * Grade challenge output. Markers from the challenge or CHALLENGE_SUCCESS_MARKERS.
 */
export function gradeChallengeOutput(
  rawOutput: string,
  challenge: AcademyChallenge,
): { pass: boolean; score: number; message: string } {
  const output = normalizeOutput(rawOutput);
  const lower = output.toLowerCase();
  if (
    output.startsWith("Error:") ||
    output.startsWith("error:") ||
    lower.includes("traceback") ||
    lower.includes("syntaxerror") ||
    lower.includes("referenceerror")
  ) {
    return { pass: false, score: 0, message: "Fix errors in the output first, then run again." };
  }

  if (challenge.exactOutput !== undefined) {
    const want = normalizeOutput(challenge.exactOutput);
    if (output === want) {
      return { pass: true, score: 100, message: "Perfect match." };
    }
    return {
      pass: false,
      score: 0,
      message: "Output does not match the expected result yet.",
    };
  }

  const markers = markersForChallenge(challenge);
  if (markers && markers.length > 0) {
    const missing = markers.filter((m) => !outputIncludesMarker(output, m));
    if (missing.length === 0) {
      return { pass: true, score: 100, message: "All checks passed." };
    }
    const hit = markers.length - missing.length;
    const score = Math.round((hit / markers.length) * 100);
    return {
      pass: false,
      score,
      message: `Missing ${missing.length} requirement(s). Check the task and your output.`,
    };
  }

  return {
    pass: false,
    score: 0,
    message: "This challenge uses manual completion — mark it when you are satisfied.",
  };
}

export function challengeHasAutoCheck(challenge: AcademyChallenge): boolean {
  if (challenge.exactOutput !== undefined) return true;
  const m = markersForChallenge(challenge);
  return m !== undefined && m.length > 0;
}
