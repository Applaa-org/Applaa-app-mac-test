import type React from "react";
import type { ReactNode } from "react";

import { IpcClient } from "../../ipc/ipc_client";

import { Package } from "lucide-react";

interface DyadAddDependencyProps {
  children?: ReactNode;
  node?: any;
  packages?: string;
}

export const DyadAddDependency: React.FC<DyadAddDependencyProps> = ({
  // We intentionally ignore children to avoid rendering raw dyad/applaa tags
  node,
}) => {
  // Extract package attribute from the node if available
  const packages = node?.properties?.packages?.split(" ") || "";

  return (
    <div
      className={
        "bg-(--background-lightest) dark:bg-gray-900 rounded-lg px-4 py-3 border my-2 border-border"
      }
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-gray-600 dark:text-gray-400" />
          {packages.length > 0 && (
            <div className="text-gray-800 dark:text-gray-200 font-semibold text-base">
              <div className="font-normal">Applaa is installing these dependencies:</div>{" "}
              <div className="flex flex-wrap gap-2 mt-2">
                {packages.map((p: string) => (
                  <span
                    className="cursor-pointer text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    key={p}
                    onClick={() => {
                      IpcClient.getInstance().openExternalUrl(
                        `https://www.npmjs.com/package/${p}`,
                      );
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {packages.length > 0 && (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          This step runs automatically. You don’t need to do anything.
        </div>
      )}
    </div>
  );
};
