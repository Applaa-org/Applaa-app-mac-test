import React, { useState } from "react";
import { AcademyCodeEditor } from "@/components/academy/AcademyCodeEditor";

type PlaygroundLang = "html" | "python" | "javascript" | "react" | "typescript";

const SAMPLES: Record<PlaygroundLang, string> = {
  html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    h1 { color: #2563eb; }
    .card { background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>My Page</h1>
  <div class="card">
    <p>Edit this HTML and click Run to see the preview.</p>
  </div>
</body>
</html>`,
  python: `# Write Python code here
name = "Applaa"
print("Hello,", name)
for i in range(3):
    print("Count:", i)
`,
  javascript: `// Write JavaScript here
const name = "Applaa";
console.log("Hello,", name);
[1, 2, 3].forEach(n => console.log("Number:", n));
`,
  react: `// React: use root.render(React.createElement(...))
// You have React, ReactDOM, and root in scope.
root.render(
  React.createElement('div', null,
    React.createElement('h1', null, 'Hello from React!'),
    React.createElement('p', null, 'Edit this and click Run.')
  )
);
`,
  typescript: `// TypeScript (runs as JavaScript in the playground)
const greeting: string = "Hello, Applaa!";
const count: number = 42;
console.log(greeting);
console.log("Count:", count);
function add(a: number, b: number): number {
  return a + b;
}
console.log("2 + 3 =", add(2, 3));
`,
};

export function AcademyPlayground() {
  const [language, setLanguage] = useState<PlaygroundLang>("javascript");
  const [code, setCode] = useState(SAMPLES.javascript);

  const switchLanguage = (lang: PlaygroundLang) => {
    setLanguage(lang);
    setCode(SAMPLES[lang]);
  };

  const tabs: { id: PlaygroundLang; label: string }[] = [
    { id: "html", label: "Web (HTML)" },
    { id: "python", label: "Python" },
    { id: "javascript", label: "JavaScript" },
    { id: "react", label: "React" },
    { id: "typescript", label: "TypeScript" },
  ];

  return (
    <div className="p-6 w-full max-w-[1600px] mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Coding Playground
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Practice Web (HTML), Python, JavaScript, React, or TypeScript. Click Run to execute. React renders in the preview below.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchLanguage(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              language === tab.id
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <AcademyCodeEditor
        key={language}
        value={code}
        onChange={setCode}
        language={language}
        height="400px"
        showRunButton={true}
        onReset={() => setCode(SAMPLES[language])}
      />
    </div>
  );
}
