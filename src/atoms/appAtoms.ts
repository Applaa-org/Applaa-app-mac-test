import { atom } from "jotai";
import type { App, AppOutput, Version } from "@/ipc/ipc_types";
import type { UserSettings } from "@/lib/schemas";

export const currentAppAtom = atom<App | null>(null);
export const selectedAppIdAtom = atom<number | null>(null);
export const appsListAtom = atom<App[]>([]);
export const appBasePathAtom = atom<string>("");
export const versionsListAtom = atom<Version[]>([]);
export const previewModeAtom = atom<
  "preview" | "code" | "problems" | "publish" | "testing"
>("preview");
export const showConfigurePanelAtom = atom<boolean>(false);
export const selectedVersionIdAtom = atom<string | null>(null);
export const appOutputAtom = atom<AppOutput[]>([]);
export const appUrlAtom = atom<
  | { appUrl: string; appId: number; originalUrl: string }
  | { appUrl: null; appId: null; originalUrl: null }
>({ appUrl: null, appId: null, originalUrl: null });
export const userSettingsAtom = atom<UserSettings | null>(null);

// Global publish state for persistent upload progress
export const globalPublishStateAtom = atom<{
  isPushing: boolean;
  progressMessage: string;
  uploadProgress: { current: number; total: number };
  isUploading: boolean;
}>({
  isPushing: false,
  progressMessage: "",
  uploadProgress: { current: 0, total: 0 },
  isUploading: false
});

// Atom for storing allow-listed environment variables
export const envVarsAtom = atom<Record<string, string | undefined>>({});

export const previewPanelKeyAtom = atom<number>(0);

export const previewErrorMessageAtom = atom<string | undefined>(undefined);
