import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type AcademyTutorEditorPayload = {
  kind: "project" | "challenge";
  title: string;
  summary: string;
  code: string;
};

type Ctx = {
  payload: AcademyTutorEditorPayload | null;
  setPayload: (p: AcademyTutorEditorPayload | null) => void;
  /** Learning Academy chapter/lesson context injected into Appy Buddy prompts. */
  learningContext: string | null;
  setLearningContext: (value: string | null) => void;
};

const AcademyTutorEditorContext = createContext<Ctx | null>(null);

export function AcademyTutorEditorProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayloadState] = useState<AcademyTutorEditorPayload | null>(null);
  const [learningContext, setLearningContextState] = useState<string | null>(null);
  const setPayload = useCallback((p: AcademyTutorEditorPayload | null) => {
    setPayloadState(p);
  }, []);
  const setLearningContext = useCallback((value: string | null) => {
    setLearningContextState(value && value.trim() ? value : null);
  }, []);
  const value = useMemo(
    () => ({ payload, setPayload, learningContext, setLearningContext }),
    [payload, setPayload, learningContext, setLearningContext],
  );
  return (
    <AcademyTutorEditorContext.Provider value={value}>{children}</AcademyTutorEditorContext.Provider>
  );
}

export function useAcademyTutorEditor(): Ctx {
  const ctx = useContext(AcademyTutorEditorContext);
  if (!ctx) {
    return {
      payload: null,
      setPayload: () => {},
      learningContext: null,
      setLearningContext: () => {},
    };
  }
  return ctx;
}
