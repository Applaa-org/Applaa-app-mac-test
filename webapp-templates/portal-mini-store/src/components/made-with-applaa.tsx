import { Sparkles } from "lucide-react";

export const MadeWithApplaa = () => {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full border border-purple-200 dark:border-purple-700">
      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Made with{" "}
        <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
          Applaa
        </span>
      </span>
    </div>
  );
};

