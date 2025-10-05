import type React from "react";
import type { ReactNode } from "react";
import { useState, useCallback } from "react";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Pencil,
  Loader,
  CircleX,
} from "lucide-react";
import { CodeHighlight } from "./CodeHighlight";
import { CustomTagState } from "./stateTypes";
import { IpcClient } from "../../ipc/ipc_client";
import { useAtomValue } from "jotai";
import { selectedChatIdAtom } from "../../atoms/chatAtoms";

interface DyadWriteProps {
  children?: ReactNode;
  node?: { properties?: Record<string, unknown> };
  path?: string;
  description?: string;
}

export const DyadWrite: React.FC<DyadWriteProps> = ({
  children,
  node,
  path: pathProp,
  description: descriptionProp,
}) => {
  const [isContentVisible, setIsContentVisible] = useState(false);

  // Use props directly if provided, otherwise extract from node
  const path: string = (pathProp ?? (node?.properties?.path as string) ?? "");
  const description: string = (descriptionProp ?? (node?.properties?.description as string) ?? "");
  const state = node?.properties?.state as CustomTagState;
  const inProgress = state === "pending";
  const aborted = state === "aborted";

  // Extract filename from path
  const fileName = path ? String(path).split("/").pop() : "";

  const chatId = useAtomValue(selectedChatIdAtom);

  const handleContinue = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!chatId) return;
    try {
      const ipc = IpcClient.getInstance();
      const detect = await ipc.detectInterruptedStream(chatId);
      if (detect.interrupted && detect.messageId) {
        await ipc.resumeInterruptedStream({
          chatId,
          messageId: detect.messageId,
          continuePrompt: path
            ? `Please continue and complete the file at path: ${path}. Resume exactly where you stopped.`
            : undefined,
        });
      } else {
        // Nothing to resume; user can press Keep Going or send a continue prompt
      }
    } catch (err) {
      console.error("Failed to resume interrupted stream:", err);
    }
  }, [chatId, path]);

  return (
    <div
      className={`bg-(--background-lightest) hover:bg-(--background-lighter) rounded-lg px-4 py-2 border my-1 cursor-pointer ${
        inProgress
          ? "border-amber-500"
          : aborted
            ? "border-red-500"
            : "border-border"
      }`}
      onClick={() => setIsContentVisible(!isContentVisible)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pencil size={16} />
          {fileName && (
            <span className="text-gray-700 dark:text-gray-300 font-medium text-sm">
              {fileName}
            </span>
          )}
          {inProgress && (
            <div className="flex items-center text-amber-600 text-xs">
              <Loader size={14} className="mr-1 animate-spin" />
              <span>Writing...</span>
            </div>
          )}
          {aborted && (
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center text-red-600">
                <CircleX size={14} className="mr-1" />
                <span>Did not finish</span>
              </div>
              <button
                onClick={handleContinue}
                className="px-2 py-1 rounded bg-(--sidebar-accent) text-(--sidebar-accent-fg) hover:opacity-90"
              >
                Continue
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center">
          {isContentVisible ? (
            <ChevronsDownUp
              size={20}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            />
          ) : (
            <ChevronsUpDown
              size={20}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            />
          )}
        </div>
      </div>
      {path && (
        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
          {path}
        </div>
      )}
      {description && (
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium">Summary: </span>
          {description}
        </div>
      )}
      {isContentVisible && (
        <div
          className="text-xs cursor-text"
          onClick={(e) => e.stopPropagation()}
        >
          <CodeHighlight className="language-typescript">
            {children}
          </CodeHighlight>
        </div>
      )}
    </div>
  );
};
