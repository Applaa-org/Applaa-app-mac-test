import React, { useState } from "react";
import { AcademyCodeEditor } from "@/components/academy/AcademyCodeEditor";

const DEFAULT_PYTHON = `# Write Python code here
name = "Applaa"
print("Hello,", name)
`;

const DEFAULT_JS = `// Write JavaScript here
const name = "Applaa";
console.log("Hello,", name);
`;

export function AcademyPlayground() {
  const [language, setLanguage] = useState<"python" | "javascript">("javascript");
  const [code, setCode] = useState(DEFAULT_JS);

  const switchLanguage = (lang: "python" | "javascript") => {
    setLanguage(lang);
    setCode(lang === "python" ? DEFAULT_PYTHON : DEFAULT_JS);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Coding Playground
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Practice Python or JavaScript. Click Run to execute your code in the browser.
      </p>
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => switchLanguage("javascript")}
          className={`px-4 py-2 rounded-lg font-medium ${
            language === "javascript"
              ? "bg-yellow-500 text-black"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          JavaScript
        </button>
        <button
          type="button"
          onClick={() => switchLanguage("python")}
          className={`px-4 py-2 rounded-lg font-medium ${
            language === "python"
              ? "bg-amber-500 text-black"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          Python
        </button>
      </div>
      <AcademyCodeEditor
        value={code}
        onChange={setCode}
        language={language}
        height="400px"
        showRunButton={true}
      />
    </div>
  );
}
