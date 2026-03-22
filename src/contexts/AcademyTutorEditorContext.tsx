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
};

const AcademyTutorEditorContext = createContext<Ctx | null>(null);

export function AcademyTutorEditorProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayloadState] = useState<AcademyTutorEditorPayload | null>(null);
  const setPayload = useCallback((p: AcademyTutorEditorPayload | null) => {
    setPayloadState(p);
  }, []);
  const value = useMemo(() => ({ payload, setPayload }), [payload, setPayload]);
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
    };
  }
  return ctx;
}
