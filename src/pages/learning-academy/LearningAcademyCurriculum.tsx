import React, { useState, useMemo } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import {
  LEARNING_ACADEMY_SUBJECTS,
  UK_YEARS,
  GCSE_EXAM_PREP_LABEL,
  getTopicsForYear,
  getTopicsForGCSE,
  type UKYear,
} from "@/data/learningAcademyCurriculum";
import { BookOpen, ChevronRight, CheckSquare, Square } from "lucide-react";

const DEFAULT_SELECTED_SUBJECT_IDS = new Set(LEARNING_ACADEMY_SUBJECTS.map((s) => s.id));

export function LearningAcademyCurriculum() {
  const search = useSearch({ from: "/learning-academy/curriculum" }) as {
    subjectId?: string;
    year?: number;
  };

  const initialSubjectId =
    search.subjectId && LEARNING_ACADEMY_SUBJECTS.some((s) => s.id === search.subjectId)
      ? search.subjectId
      : undefined;

  const initialYear: UKYear | "all" | "gcse" =
    search.year && UK_YEARS.some((y) => y.value === search.year)
      ? (search.year as UKYear)
      : 9;

  const [selectedYear, setSelectedYear] = useState<UKYear | "all" | "gcse">(initialYear);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(initialSubjectId ?? null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(() =>
    initialSubjectId ? new Set([initialSubjectId]) : new Set(DEFAULT_SELECTED_SUBJECT_IDS)
  );

  const visibleSubjects = useMemo(
    () => LEARNING_ACADEMY_SUBJECTS.filter((s) => selectedSubjectIds.has(s.id)),
    [selectedSubjectIds]
  );

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllSubjects = () => setSelectedSubjectIds(new Set(LEARNING_ACADEMY_SUBJECTS.map((s) => s.id)));
  const clearAllSubjects = () => setSelectedSubjectIds(new Set());

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        UK Curriculum
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Year 7–11. Choose subjects and a year (or GCSE exam prep), then work through Explain, Lessons, Practice and Assessment. Every subject has practice questions.
      </p>

      {/* Choose subjects */}
      <div className="mb-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Choose subjects to show
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={selectAllSubjects}
            className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline"
          >
            All
          </button>
          <button
            type="button"
            onClick={clearAllSubjects}
            className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:underline"
          >
            None
          </button>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {LEARNING_ACADEMY_SUBJECTS.map((subject) => {
            const checked = selectedSubjectIds.has(subject.id);
            return (
              <label
                key={subject.id}
                className="inline-flex items-center gap-2 cursor-pointer select-none"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleSubject(subject.id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 hover:border-teal-400 dark:hover:border-teal-500 text-sm"
                >
                  {checked ? (
                    <CheckSquare className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-400 shrink-0" />
                  )}
                  <span className="text-gray-800 dark:text-gray-200">{subject.shortTitle}</span>
                </button>
              </label>
            );
          })}
        </div>
        {visibleSubjects.length === 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
            Select at least one subject to see topics.
          </p>
        )}
      </div>

      {/* Year filter */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Year group
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedYear("all")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedYear === "all"
                ? "bg-teal-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            All years
          </button>
          {UK_YEARS.map(({ value, label, ageRange }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedYear(value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedYear === value
                  ? "bg-teal-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {label} (age {ageRange})
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedYear("gcse")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedYear === "gcse"
                ? "bg-amber-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
            }`}
          >
            {GCSE_EXAM_PREP_LABEL}
          </button>
        </div>
        {selectedYear === "gcse" && (
          <p className="text-sm text-amber-800 dark:text-amber-200 mt-2">
            GCSE topics are shown only for the subjects you selected above. Toggle subjects in &quot;Choose subjects to show&quot; to include or exclude them from your prep.
          </p>
        )}
      </div>

      {/* Subjects and topics */}
      <div className="space-y-4">
        {visibleSubjects.map((subject) => {
          const topics =
            selectedYear === "all"
              ? subject.topics.sort((a, b) => a.order - b.order)
              : selectedYear === "gcse"
                ? getTopicsForGCSE(subject.id)
                : getTopicsForYear(subject.id, selectedYear as UKYear);
          const isExpanded = expandedSubject === subject.id;

          return (
            <div
              key={subject.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedSubject(isExpanded ? null : subject.id)
                }
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <span className="text-2xl">{subject.emoji}</span>
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                    {subject.title}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {subject.description}
                  </p>
                </div>
                <ChevronRight
                  className={`h-5 w-5 text-gray-400 transition-transform ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-800/30">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {selectedYear === "all"
                      ? `${subject.title} - Topics (all years)`
                      : selectedYear === "gcse"
                        ? `${subject.title} - Year 11 / GCSE topics – use Practice & Assessment to prepare`
                        : `${subject.title} - ${UK_YEARS.find((y) => y.value === selectedYear)?.label ?? `Year ${selectedYear}`}`}
                  </p>
                  <ul className="space-y-2">
                    {topics.map((topic) => (
                      <li key={topic.id}>
                        <Link
                          to="/learning-academy/curriculum/$subjectId/$topicId"
                          params={{ subjectId: subject.id, topicId: topic.id }}
                          className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 transition-colors group"
                        >
                          <BookOpen className="h-4 w-4 text-teal-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-teal-700 dark:group-hover:text-teal-300">
                              {topic.title}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {topic.description}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
