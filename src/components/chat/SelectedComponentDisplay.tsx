import { selectedComponentPreviewAtom } from "@/atoms/previewAtoms";
import { useAtom } from "jotai";
import { Code2, X, Sparkles } from "lucide-react";

export function SelectedComponentDisplay() {
  const [selectedComponent, setSelectedComponent] = useAtom(
    selectedComponentPreviewAtom,
  );

  if (!selectedComponent) {
    return null;
  }

  return (
    <div className="p-2 pb-1 space-y-2" data-testid="selected-component-display">
      <div className="flex items-center justify-between rounded-md bg-indigo-600/10 px-2 py-1 text-sm">
        <div className="flex items-center gap-2 overflow-hidden">
          <Code2
            size={16}
            className="flex-shrink-0 text-indigo-600 dark:text-indigo-400"
          />
          <div className="flex flex-col overflow-hidden">
            <span
              className="truncate font-medium text-indigo-800 dark:text-indigo-300"
              title={selectedComponent.name}
            >
              {selectedComponent.name}
            </span>
            <span
              className="truncate text-xs text-indigo-600/80 dark:text-indigo-400/80"
              title={`${selectedComponent.relativePath}:${selectedComponent.lineNumber}`}
            >
              {selectedComponent.relativePath}:{selectedComponent.lineNumber}
            </span>
          </div>
        </div>
        <button
          onClick={() => setSelectedComponent(null)}
          className="ml-2 flex-shrink-0 rounded-full p-0.5 hover:bg-indigo-600/20"
          title="Deselect component"
        >
          <X size={18} className="text-indigo-600 dark:text-indigo-400" />
        </button>
      </div>
      
      {/* Helper prompt asking what user wants to change */}
      <div className="flex items-start gap-2 rounded-md bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 px-3 py-2">
        <Sparkles size={14} className="flex-shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
        <span className="text-sm text-indigo-800 dark:text-indigo-300 font-medium">
          What would you like to change?
        </span>
      </div>
    </div>
  );
}
