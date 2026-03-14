import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AcademyCodeEditor } from "@/components/academy/AcademyCodeEditor";
import { ACADEMY_LESSONS, type AcademyTrack } from "@/data/academyLessons";

const CHALLENGES: { track: AcademyTrack; lessonId: string; title: string; task: string; starter: string }[] = [
  { track: "python", lessonId: "lists", title: "Largest number", task: "Write a function that takes a list of numbers and returns the largest number.", starter: "def largest(nums):\n    # your code here\n    pass\n\nprint(largest([1, 5, 3, 9, 2]))  # should print 9\n" },
  { track: "javascript", lessonId: "arrays", title: "Reverse a string", task: "Write a function that takes a string and returns it reversed.", starter: "function reverse(str) {\n  // your code here\n}\n\nconsole.log(reverse(\"hello\"));  // should print olleh\n" },
  { track: "python", lessonId: "functions", title: "Sum of list", task: "Write a function sum_list(nums) that returns the sum of all numbers in the list.", starter: "def sum_list(nums):\n    pass\n\nprint(sum_list([1, 2, 3, 4]))  # 10\n" },
  { track: "javascript", lessonId: "functions", title: "Double the number", task: "Write a function double(n) that returns n * 2.", starter: "function double(n) {\n  // your code\n}\n\nconsole.log(double(5));  // 10\n" },
];

export function AcademyChallenges() {
  const [code, setCode] = useState(CHALLENGES[0].starter);
  const [selected, setSelected] = useState(0);
  const challenge = CHALLENGES[selected];

  const handleSelect = (index: number) => {
    setSelected(index);
    setCode(CHALLENGES[index].starter);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Coding challenges
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Solve small challenges. Run your code and check the output.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {CHALLENGES.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSelect(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              selected === i
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>
      <p className="text-gray-700 dark:text-gray-300 mb-2">
        <strong>Task:</strong> {challenge.task}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        Related lesson:{" "}
        <Link
          to="/academy/learn"
          search={{ track: challenge.track, lessonId: challenge.lessonId }}
          className="text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {ACADEMY_LESSONS[challenge.track].find((l) => l.id === challenge.lessonId)?.title}
        </Link>
      </p>
      <AcademyCodeEditor
        value={code}
        onChange={setCode}
        language={challenge.track}
        height={320}
        showRunButton={true}
      />
    </div>
  );
}
