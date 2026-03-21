import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  LEARNING_ACADEMY_SUBJECTS,
  getSubject,
  getTopic,
} from "@/data/learningAcademyCurriculum";
import { YEAR_11_SCHEDULE } from "@/data/year11RevisionSchedule";
import {
  loadLearningAcademySubjectIds,
  saveLearningAcademySubjectIds,
} from "@/lib/learningAcademySubjectSelection";
import { Calendar, BookOpen, ChevronRight, CheckSquare, Square } from "lucide-react";

export function LearningAcademySchedule() {
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(() =>
    loadLearningAcademySubjectIds(LEARNING_ACADEMY_SUBJECTS.map((s) => s.id)),
  );

  useEffect(() => {
    saveLearningAcademySubjectIds(selectedSubjectIds);
  }, [selectedSubjectIds]);

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
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
        <Calendar className="h-7 w-7 text-teal-500" />
        Year 11 revision schedule
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Personalised 8‑month plan from September to April. Choose which subjects to include, then follow the monthly revision topics and use Lessons, Practice and Assessment to prepare for GCSE.
      </p>

      {/* Choose subjects */}
      <div className="mb-8 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Choose subjects for your schedule
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
              <button
                key={subject.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggleSubject(subject.id)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 hover:border-teal-400 dark:hover:border-teal-500 text-sm transition-colors"
              >
                {checked ? (
                  <CheckSquare className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400 shrink-0" />
                )}
                <span className="text-gray-800 dark:text-gray-200">{subject.shortTitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        {YEAR_11_SCHEDULE.map((month) => {
          const subjectTopicLinks: { subjectId: string; topicId: string; subjectTitle: string; topicTitle: string }[] = [];
          month.topicsBySubject.forEach(({ subjectId, topicIds }) => {
            if (!selectedSubjectIds.has(subjectId)) return;
            const subject = getSubject(subjectId);
            if (!subject) return;
            topicIds.forEach((topicId) => {
              const topic = getTopic(subjectId, topicId);
              if (topic)
                subjectTopicLinks.push({
                  subjectId,
                  topicId,
                  subjectTitle: subject.shortTitle,
                  topicTitle: topic.title,
                });
            });
          });

          return (
            <div
              key={month.month}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold text-lg">
                    {month.month}
                  </span>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">{month.label}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{month.focus}</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Revision topics this month
                </p>
                {subjectTopicLinks.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No topics this month for your selected subjects. Add more subjects above to see them.
                  </p>
                ) : (
                <div className="flex flex-wrap gap-2">
                  {subjectTopicLinks.map(({ subjectId, topicId, subjectTitle, topicTitle }) => (
                    <Link
                      key={`${subjectId}-${topicId}`}
                      to="/learning-academy/curriculum/$subjectId/$topicId"
                      params={{ subjectId, topicId }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-teal-400 dark:hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 text-sm font-medium text-gray-800 dark:text-gray-200 transition-colors group"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                      <span>{subjectTitle}: {topicTitle}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-teal-500 shrink-0" />
                    </Link>
                  ))}
                </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <p className="text-sm text-amber-900 dark:text-amber-100">
          <strong>Tip:</strong> Use the Practice and Assessment tabs in each topic to check your understanding. In March and April, prioritise practice questions across all subjects.
        </p>
      </div>
    </div>
  );
}
