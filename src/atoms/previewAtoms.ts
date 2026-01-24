import { ComponentSelection } from "@/ipc/ipc_types";
import { atom } from "jotai";

export const selectedComponentPreviewAtom = atom<ComponentSelection | null>(
  null,
);

// Visual Editing atoms
export interface VisualEditingElement {
  id: string;
  tagName: string;
  className?: string;
  elementId?: string;
  styles: Record<string, string>;
  selector?: string;
  file?: string;
  line?: number;
  textContent?: string;
}

export interface VisualEditingChange {
  property: string;
  value: string;
  file: string;
  selector: string;
  line?: number;
}

export const visualEditingEnabledAtom = atom<boolean>(false);
export const selectedVisualElementAtom = atom<VisualEditingElement | null>(null);
export const visualEditingChangesAtom = atom<Map<string, VisualEditingChange>>(new Map());
