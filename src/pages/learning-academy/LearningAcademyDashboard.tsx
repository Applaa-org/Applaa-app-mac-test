import React from "react";
import { Link } from "@tanstack/react-router";
import { BookMarked, ArrowRight } from "lucide-react";

export function LearningAcademyDashboard() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
        <BookMarked className="h-7 w-7 text-teal-500" />
        Learning Academy
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        UK curriculum Year 7–11. Math, Physics, Chemistry, Biology, Computer Science, and Business Studies. Work through Explain, Lessons, Practice and Assessment for each topic. Every subject has practice questions. End with GCSE exam prep.
      </p>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/learning-academy/curriculum"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 shadow-md"
        >
          Browse curriculum <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/learning-academy/schedule"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-teal-300 dark:border-teal-600 text-teal-700 dark:text-teal-300 font-medium hover:bg-teal-50 dark:hover:bg-teal-900/20"
        >
          Year 11 revision schedule (Sep–Apr)
        </Link>
      </div>
    </div>
  );
}
