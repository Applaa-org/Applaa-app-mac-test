import type React from "react";
import type { ReactNode } from "react";
import { FolderPlus } from "lucide-react";

interface DyadMkdirProps {
  children?: ReactNode;
  node?: any;
  path?: string;
}

export const DyadMkdir: React.FC<DyadMkdirProps> = ({
  children,
  node,
  path: pathProp,
}) => {
  // Use props directly if provided, otherwise extract from node
  const path = pathProp || node?.properties?.path || "";

  // Extract directory name from path
  const dirName = path ? path.split("/").pop() : "";

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-2 border border-blue-300 dark:border-blue-700 my-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderPlus size={16} className="text-blue-500" />
          {dirName && (
            <span className="text-gray-700 dark:text-gray-300 font-medium text-sm">
              {dirName}
            </span>
          )}
          <div className="text-xs text-blue-500 font-medium">Create Directory</div>
        </div>
      </div>
      {path && (
        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
          {path}
        </div>
      )}
      <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
        {children}
      </div>
    </div>
  );
};
