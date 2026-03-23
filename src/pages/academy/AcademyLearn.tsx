import React, { useState, useEffect, useMemo } from "react";
import { Link, useRouter, useSearch } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { ACADEMY_LESSONS, getLesson, type AcademyTrack, type AcademyLesson } from "@/data/academyLessons";
import { ACADEMY_BASICS } from "@/data/academyBasics";
import { ACADEMY_CHALLENGES } from "@/data/academyChallenges";
import {
  ACADEMY_CONCEPT_BLOCKS,
  getConceptBlock,
  getBlockSubTopic,
  CONCEPT_ONLY_BLOCK_IDS,
  type ConceptBlockId,
  type BlockSection,
} from "@/data/academyBlocks";
import { AcademyCodeEditor } from "@/components/academy/AcademyCodeEditor";
import { AcademyAiTutor } from "@/components/academy/AcademyAiTutor";
import { AcademyLessonInteractiveQuiz } from "@/components/academy/AcademyLessonInteractiveQuiz";
import { CopyableCodeBlock } from "@/components/academy/CopyableCodeBlock";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Lock,
  BookOpen,
  Code2,
  Sparkles,
  Lightbulb,
  ClipboardCheck,
  GraduationCap,
  Printer,
  RotateCcw,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  recordAcademyLessonComplete,
  recordLessonCompletionByTrack,
  recordLessonCompletionDetail,
  getAcademyStreakStats,
} from "@/lib/academyStreak";
import { getCompletedLessonIdsForTrack } from "@/lib/academyProgressMerge";
import { addLocalLessonCompleted } from "@/lib/academyLessonLocal";
import { isLessonVisited, markLessonVisited } from "@/lib/academyLessonVisit";
import { printAcademyRevisionSheet } from "@/lib/academyRevisionPrint";
import { addBasicsLessonCompleted, getBasicsCompletedIds } from "@/lib/academyBasicsProgress";
import {
  AcademyScheduleDialog,
  type AcademyScheduleContext,
} from "@/components/academy/AcademyScheduleDialog";
import { useAcademyTutorEditor } from "@/contexts/AcademyTutorEditorContext";

type LearnTrack = AcademyTrack | "basics" | ConceptBlockId;

/** Match Learning Academy topic pages: use horizontal space in the main pane (not a narrow centered column). */
const ACADEMY_MAIN_MAX =
  "w-full max-w-[1600px] mx-auto";

// Order: Web first, then Python, JS, React, TypeScript, C++ (basics to expert). No duplication – single source in Learn.
const TRACKS: { id: LearnTrack; label: string }[] = [
  { id: "basics", label: "🌟 Basics" },
  { id: "html", label: "📄 Web (HTML/CSS)" },
  { id: "python", label: "🐍 Python" },
  { id: "javascript", label: "🟨 JavaScript" },
  { id: "react", label: "⚛️ React JS" },
  { id: "typescript", label: "📘 TypeScript" },
  { id: "cpp", label: "⚡ C++" },
  { id: "ai", label: "🤖 AI" },
];

/** Editor language for each track when showing code lessons */
const TRACK_EDITOR_LANG: Record<string, "python" | "javascript" | "html"> = {
  python: "python",
  javascript: "javascript",
  html: "html",
  react: "javascript",
  typescript: "javascript",
  ai: "python",
};

function BlockSubTopicDetail({
  blockId,
  subTopicId,
  blockLabel,
}: {
  blockId: ConceptBlockId;
  subTopicId: string;
  blockLabel: string;
}) {
  const router = useRouter();
  const sub = getBlockSubTopic(blockId, subTopicId);
  if (!sub) return null;

  const conceptBlock = getConceptBlock(blockId);
  const idx = conceptBlock?.subTopics.findIndex((st) => st.id === subTopicId) ?? -1;
  const prevSub = idx > 0 ? conceptBlock!.subTopics[idx - 1] : null;
  const nextSub = conceptBlock && idx >= 0 && idx < conceptBlock.subTopics.length - 1 ? conceptBlock.subTopics[idx + 1] : null;

  return (
    <div className={cn("p-6 space-y-8", ACADEMY_MAIN_MAX)}>
      <button
        type="button"
        onClick={() =>
          router.navigate({
            to: "/academy/learn",
            // Return to the concept block list for this track (not browser history).
            search: { track: blockId as any },
          })
        }
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {blockLabel}
      </button>
      <div className="flex items-center gap-3">
        {sub.emoji && <span className="text-4xl">{sub.emoji}</span>}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{sub.title}</h1>
      </div>
      <div className="space-y-8">
        {sub.sections.map((sec, i) => (
          <BlockSectionView key={i} section={sec} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        {prevSub ? (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/academy/learn" search={{ track: blockId, subTopicId: prevSub.id }}>
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/academy/learn" search={{ track: blockId }}>
              <ArrowLeft className="h-4 w-4" />
              Back to {blockLabel}
            </Link>
          </Button>
        )}

        {nextSub ? (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/academy/learn" search={{ track: blockId, subTopicId: nextSub.id }}>
              Next
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2" disabled>
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function BlockSectionView({ section }: { section: BlockSection }) {
  const lang = (section.codeLanguage ?? "text") as "javascript" | "typescript" | "jsx" | "cpp" | "python" | "text";
  return (
    <section className="space-y-3">
      {section.heading && (
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{section.heading}</h2>
      )}
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{section.body}</p>
      {section.bullets && section.bullets.length > 0 && (
        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1 ml-2">
          {section.bullets.map((b, j) => (
            <li key={j}>{b}</li>
          ))}
        </ul>
      )}
      {section.realLifeExample && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 p-4">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-1 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Real-life example
          </p>
          <p className="text-emerald-900 dark:text-emerald-100">{section.realLifeExample}</p>
        </div>
      )}
      {section.codeExample && (
        <div>
          <CopyableCodeBlock code={section.codeExample} language={lang} title="Code example" />
        </div>
      )}
    </section>
  );
}

const TRACK_LABELS: Record<LearnTrack, string> = {
  basics: "Basics",
  python: "Python",
  javascript: "JavaScript",
  html: "Web (HTML/CSS)",
  react: "React JS",
  typescript: "TypeScript",
  cpp: "C++",
  ai: "AI",
};

export function AcademyLearn() {
  const search = useSearch({ from: "/academy/learn" }) as {
    track?: string;
    lessonId?: string;
    subTopicId?: string;
  };
  const router = useRouter();
  const trackRaw = search.track ?? "basics";
  const track = (
    ["basics", "python", "javascript", "html", "react", "typescript", "cpp", "ai"].includes(trackRaw)
      ? trackRaw
      : "basics"
  ) as LearnTrack;
  const lessonId = search.lessonId;
  const subTopicId = search.subTopicId;
  const [challengeCode, setChallengeCode] = useState<Record<string, string>>({});
  const [showMoreExamples, setShowMoreExamples] = useState(false);
  const [streakDays, setStreakDays] = useState(() => getAcademyStreakStats().current);
  const [localLessonVersion, setLocalLessonVersion] = useState(0);
  const [visitVersion, setVisitVersion] = useState(0);
  const [basicsVersion, setBasicsVersion] = useState(0);
  const queryClient = useQueryClient();
  const ipc = IpcClient.getInstance();
  const { setLearningContext } = useAcademyTutorEditor();

  const { data: progress } = useQuery({
    queryKey: ["academy-progress"],
    queryFn: () => ipc.academyGetProgress(),
  });

  const completeLesson = useMutation({
    mutationFn: (params: { track: "python" | "javascript"; lessonId: string }) =>
      ipc.academyCompleteLesson(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["academy-progress"] });
      recordAcademyLessonComplete();
      recordLessonCompletionByTrack(variables.track);
      const done = getLesson(variables.track, variables.lessonId);
      recordLessonCompletionDetail(variables.track, done?.title ?? variables.lessonId);
      setStreakDays(getAcademyStreakStats().current);
    },
  });

  useEffect(() => {
    const onLocal = () => setLocalLessonVersion((v) => v + 1);
    window.addEventListener("academy:lesson-local-updated", onLocal);
    return () => window.removeEventListener("academy:lesson-local-updated", onLocal);
  }, []);

  useEffect(() => {
    const onVisit = () => setVisitVersion((v) => v + 1);
    window.addEventListener("academy:lesson-visit-updated", onVisit);
    return () => window.removeEventListener("academy:lesson-visit-updated", onVisit);
  }, []);

  useEffect(() => {
    const onBasics = () => setBasicsVersion((v) => v + 1);
    window.addEventListener("academy:basics-updated", onBasics);
    return () => window.removeEventListener("academy:basics-updated", onBasics);
  }, []);

  const basicsCompletedSet = useMemo(
    () => new Set(getBasicsCompletedIds()),
    [basicsVersion],
  );

  const isBasics = track === "basics";
  const isConceptBlock = (["react", "typescript", "cpp", "ai", "python", "javascript"] as const).includes(track);
  const conceptBlock = isConceptBlock ? getConceptBlock(track as ConceptBlockId) : null;
  const hasCodeLessons = (["python", "javascript", "html", "react", "typescript", "ai"] as const).includes(track);
  const lessons = isBasics ? ACADEMY_BASICS : hasCodeLessons ? ACADEMY_LESSONS[track as AcademyTrack] : [];
  const completedSet = useMemo(
    () =>
      new Set(
        hasCodeLessons
          ? getCompletedLessonIdsForTrack(track as AcademyTrack, progress)
          : [],
      ),
    [hasCodeLessons, track, progress, localLessonVersion],
  );
  const lesson = lessonId && hasCodeLessons ? getLesson(track as AcademyTrack, lessonId) : null;
  const activeSubTopic =
    isConceptBlock && subTopicId ? getBlockSubTopic(track as ConceptBlockId, subTopicId) : null;
  const editorLang = TRACK_EDITOR_LANG[track] ?? "javascript";

  useEffect(() => {
    if (lesson && hasCodeLessons) {
      markLessonVisited(track as AcademyTrack, lesson.id);
    }
  }, [lesson?.id, track, hasCodeLessons, lesson]);

  const lessonMarkedRead = useMemo(() => {
    if (!lesson || !hasCodeLessons) return false;
    return isLessonVisited(track as AcademyTrack, lesson.id);
  }, [lesson, hasCodeLessons, track, visitVersion]);

  const getLessonVisitForList = (lid: string) => {
    void visitVersion;
    return hasCodeLessons && isLessonVisited(track as AcademyTrack, lid);
  };

  const basicsLesson =
    lessonId && isBasics ? ACADEMY_BASICS.find((b) => b.id === lessonId) : null;

  const appyContext = useMemo(() => {
    if (basicsLesson) {
      const parts = [
        "AI Academy lesson context:",
        `- Track: Basics`,
        `- Lesson: ${basicsLesson.title}`,
        "",
        "Explanation:",
        basicsLesson.explanation,
        "",
        basicsLesson.exampleCode ? "Example code:" : undefined,
        basicsLesson.exampleCode ? basicsLesson.exampleCode : undefined,
        "",
        "Fun fact:",
        basicsLesson.funFact,
        "",
        "Instruction for assistant:",
        "- Prefer this lesson context when the user asks about 'this chapter' or 'this lesson'.",
        "- If the question is outside this lesson, say so and then answer generally.",
      ];
      return parts.filter(Boolean).join("\n");
    }

    if (lesson) {
      const extraExamples =
        lesson.extraExamples && lesson.extraExamples.length > 0
          ? lesson.extraExamples
              .slice(0, 2)
              .map((ex, i) => `Example ${i + 2} (${ex.title}):\n${ex.code}`)
              .join("\n\n")
          : "";
      const quizHints = lesson.quiz
        .slice(0, 3)
        .map((q, i) => `Q${i + 1}: ${q.question}`)
        .join("\n");
      const parts = [
        "AI Academy lesson context:",
        `- Track: ${TRACK_LABELS[track] ?? track}`,
        `- Lesson: ${lesson.title}`,
        "",
        "Explanation:",
        lesson.explanation,
        "",
        "Main example code:",
        lesson.exampleCode,
        "",
        "Mini challenge:",
        lesson.miniChallenge,
        "",
        quizHints ? "Quiz focus points:" : undefined,
        quizHints || undefined,
        "",
        extraExamples ? "Additional examples:" : undefined,
        extraExamples || undefined,
        "",
        "Instruction for assistant:",
        "- Prefer this lesson context when the user asks about 'this chapter' or 'this lesson'.",
        "- If the question is outside this lesson, say so and then answer generally.",
      ];
      return parts.filter(Boolean).join("\n");
    }

    if (activeSubTopic && conceptBlock) {
      const sectionPreview = activeSubTopic.sections
        .slice(0, 3)
        .map((s, i) => `${i + 1}. ${s.heading ?? "Section"} — ${s.body}`)
        .join("\n");
      const parts = [
        "AI Academy concept context:",
        `- Module: ${conceptBlock.title}`,
        `- Sub-topic: ${activeSubTopic.title}`,
        "",
        "Section preview:",
        sectionPreview,
        "",
        "Instruction for assistant:",
        "- Prefer this sub-topic context when the user asks about 'this chapter' or 'this lesson'.",
        "- If the question is outside this sub-topic, say so and then answer generally.",
      ];
      return parts.filter(Boolean).join("\n");
    }

    return null;
  }, [activeSubTopic, basicsLesson, conceptBlock, lesson, track]);

  useEffect(() => {
    setLearningContext(appyContext);
  }, [appyContext, setLearningContext]);

  useEffect(() => {
    return () => {
      setLearningContext(null);
    };
  }, [setLearningContext]);

  const canMarkComplete = hasCodeLessons;
  const showingBlockSubTopic = isConceptBlock && subTopicId && getBlockSubTopic(track as ConceptBlockId, subTopicId);

  const handleMarkComplete = (lid: string) => {
    if (!hasCodeLessons) return;
    if (track === "python" || track === "javascript") {
      completeLesson.mutate({ track, lessonId: lid });
      return;
    }
    addLocalLessonCompleted(track as AcademyTrack, lid);
    recordAcademyLessonComplete();
    recordLessonCompletionByTrack(track as string);
    const doneLesson = getLesson(track as AcademyTrack, lid);
    recordLessonCompletionDetail(track as string, doneLesson?.title ?? lid);
    setStreakDays(getAcademyStreakStats().current);
    setLocalLessonVersion((v) => v + 1);
    queryClient.invalidateQueries({ queryKey: ["academy-progress"] });
  };

  if (showingBlockSubTopic && conceptBlock) {
    return (
      <BlockSubTopicDetail
        blockId={track as ConceptBlockId}
        subTopicId={subTopicId!}
        blockLabel={conceptBlock.title}
      />
    );
  }

  if (basicsLesson) {
    const idx = ACADEMY_BASICS.findIndex((b) => b.id === basicsLesson.id);
    const prevLesson = idx > 0 ? ACADEMY_BASICS[idx - 1] : null;
    const nextLesson =
      idx >= 0 && idx < ACADEMY_BASICS.length - 1 ? ACADEMY_BASICS[idx + 1] : null;

    return (
      <div className={cn("p-6 space-y-6", ACADEMY_MAIN_MAX)}>
        <button
          type="button"
          onClick={() =>
            router.navigate({
              to: "/academy/learn",
              search: { track: "basics" as any },
            })
          }
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Basics
        </button>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{basicsLesson.emoji}</span>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {basicsLesson.title}
          </h1>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-2">
          <span>Next lesson:</span>
          {nextLesson ? (
            <Link
              to="/academy/learn"
              search={{ track: "basics", lessonId: nextLesson.id }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              {nextLesson.title}
            </Link>
          ) : (
            <span className="font-medium">Last lesson</span>
          )}
        </div>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-lg">
            {basicsLesson.explanation}
          </p>
        </div>
        {basicsLesson.exampleCode && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Example
            </h2>
            <CopyableCodeBlock
              code={basicsLesson.exampleCode}
              language="javascript"
              title={basicsLesson.exampleLabel ?? "Example"}
            />
          </div>
        )}
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
            🎯 Fun fact
          </p>
          <p className="text-amber-900 dark:text-amber-100">{basicsLesson.funFact}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {!basicsCompletedSet.has(basicsLesson.id) ? (
            <Button
              type="button"
              onClick={() => {
                addBasicsLessonCompleted(basicsLesson.id);
                recordAcademyLessonComplete();
                recordLessonCompletionByTrack("basics");
                recordLessonCompletionDetail("basics", basicsLesson.title);
                setStreakDays(getAcademyStreakStats().current);
                setBasicsVersion((v) => v + 1);
              }}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Mark as complete
            </Button>
          ) : (
            <p className="text-green-600 dark:text-green-400 flex items-center gap-2 text-sm font-medium">
              <Check className="h-4 w-4" /> Completed
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          {prevLesson ? (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/academy/learn" search={{ track: "basics", lessonId: prevLesson.id }}>
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/academy/learn" search={{ track: "basics" }}>
                <ArrowLeft className="h-4 w-4" />
                Back to Basics
              </Link>
            </Button>
          )}

          {nextLesson ? (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/academy/learn" search={{ track: "basics", lessonId: nextLesson.id }}>
                Next
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="gap-2" disabled>
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (lesson) {
    const trackLessons = lessons as AcademyLesson[];
    const idx = trackLessons.findIndex((l) => l.id === lesson.id);
    const prevLesson = idx > 0 ? trackLessons[idx - 1] : null;
    const nextLesson = idx >= 0 && idx < trackLessons.length - 1 ? trackLessons[idx + 1] : null;

    const starter = lesson.challengeStarterCode ?? lesson.exampleCode;
    const codeKey = `${track}:${lesson.id}`;
    const code = challengeCode[codeKey] ?? starter;
    const hasExtraExamples = lesson.extraExamples && lesson.extraExamples.length > 0;
    return (
      <div className={cn("p-6 space-y-8", ACADEMY_MAIN_MAX)}>
        <button
          type="button"
          onClick={() =>
            router.navigate({
              to: "/academy/learn",
              search: { track: track as any },
            })
          }
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {TRACK_LABELS[track]}
        </button>

        <div>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {lesson.title}
            </h1>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              title="Prints the full lesson revision: summary, all code examples, mini challenge (and starter if any), and quiz with answers. Long lessons print on multiple pages."
              onClick={() =>
                printAcademyRevisionSheet({
                  lessonTitle: lesson.title,
                  trackLabel: TRACK_LABELS[track],
                  explanation: lesson.explanation,
                  miniChallenge: lesson.miniChallenge,
                  quiz: lesson.quiz,
                  exampleCode: lesson.exampleCode,
                  extraExamples: lesson.extraExamples,
                  challengeStarterCode: lesson.challengeStarterCode,
                })
              }
            >
              <Printer className="h-4 w-4" />
              Print lesson sheet
            </Button>
          </div>
          {canMarkComplete && streakDays > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
              Learning streak: {streakDays} day{streakDays === 1 ? "" : "s"}
            </p>
          )}
          {canMarkComplete && lesson && lessonMarkedRead && !completedSet.has(lesson.id) && (
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              Marked as read — use <strong>Mark as complete</strong> when you have finished the lesson.
            </p>
          )}
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {lesson.explanation}
            </p>
          </div>
        </div>

        <nav
          className={cn(
            "sticky top-0 z-20 mb-4 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 shadow-sm backdrop-blur",
            "border-indigo-200 bg-white/95 dark:border-indigo-900/50 dark:bg-gray-950/90",
          )}
          aria-label="Jump to lesson sections"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mr-1">
            Jump to
          </span>
          {[
            { href: "#lesson-example", label: "Example", icon: Code2 },
            { href: "#lesson-challenge", label: "Challenge", icon: Sparkles },
            { href: "#lesson-quiz", label: "Quiz", icon: ClipboardCheck },
            { href: "#lesson-revision", label: "Revision", icon: GraduationCap },
          ].map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-100 px-2.5 py-1.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-100 dark:hover:bg-indigo-800/80"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </a>
          ))}
        </nav>

        <section
          id="lesson-revision"
          className="scroll-mt-28 rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-800/40 dark:from-amber-950/35 dark:to-orange-950/25"
        >
          <h2 className="text-sm font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            How to learn this lesson (for kids)
          </h2>
          <ul className="text-sm text-amber-950/90 dark:text-amber-100/90 space-y-1.5 list-disc pl-5">
            <li>Read the lesson once, then try the example in your head.</li>
            <li>Type the code yourself in the challenge — it sticks better than only reading.</li>
            <li>Take the quiz at the end to check what you remember.</li>
            <li>
              Stuck? Tap <strong>Appy</strong> at the top-right (or the tutor tab on the edge) and ask a question.
            </li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="#lesson-example"
              className="inline-flex items-center rounded-lg bg-white/80 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200 hover:bg-white dark:bg-gray-900/80 dark:text-amber-100 dark:ring-amber-800"
            >
              Jump to example
            </a>
            <a
              href="#lesson-challenge"
              className="inline-flex items-center rounded-lg bg-white/80 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200 hover:bg-white dark:bg-gray-900/80 dark:text-amber-100 dark:ring-amber-800"
            >
              Jump to code challenge
            </a>
            <a
              href="#lesson-quiz"
              className="inline-flex items-center rounded-lg bg-white/80 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200 hover:bg-white dark:bg-gray-900/80 dark:text-amber-100 dark:ring-amber-800"
            >
              Jump to quiz
            </a>
          </div>
        </section>

        <div className="flex flex-col gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-2">
            <span>Next lesson:</span>
            {nextLesson ? (
              <Link
                to="/academy/learn"
                search={{ track, lessonId: nextLesson.id }}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                {nextLesson.title}
              </Link>
            ) : (
              <span className="font-medium">Last lesson</span>
            )}
          </div>

          <details className="bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-indigo-700 dark:text-indigo-300 select-none">
              Browse all {TRACK_LABELS[track]} lessons
            </summary>
            <ul className="mt-3 space-y-1 max-h-56 overflow-y-auto pr-1">
              {trackLessons.map((l) => {
                const done = canMarkComplete && completedSet.has(l.id);
                const visited = getLessonVisitForList(l.id);
                const isCurrent = l.id === lesson.id;
                return (
                  <li key={l.id}>
                    <Link
                      to="/academy/learn"
                      search={{ track, lessonId: l.id }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                        isCurrent
                          ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700"
                          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                      }`}
                    >
                      {done ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" title="Completed" />
                      ) : visited ? (
                        <BookOpen className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" title="Read" />
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600 shrink-0">•</span>
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {l.title}
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-gray-400 shrink-0" aria-hidden>
                        {done ? "Done" : visited ? "Read" : ""}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        </div>

        <section id="lesson-example" className="space-y-3 scroll-mt-28">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Code2 className="h-5 w-5 text-indigo-500" />
            Example – try it in the editor below
          </h2>
          <CopyableCodeBlock
            code={lesson.exampleCode}
            language={track === "html" ? "html" : track === "react" || track === "typescript" ? "javascript" : (track as "python" | "javascript")}
            title="Main example"
          />
          {hasExtraExamples && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowMoreExamples((v) => !v)}
              >
                <BookOpen className="h-4 w-4" />
                {showMoreExamples ? "Hide" : "Show"} more examples ({lesson.extraExamples!.length})
              </Button>
              {showMoreExamples && (
                <div className="pt-3 space-y-3">
                  {lesson.extraExamples!.map((ex, i) => (
                    <CopyableCodeBlock
                      key={i}
                      code={ex.code}
                      language={editorLang}
                      title={ex.title}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <section id="lesson-challenge" className="space-y-3 scroll-mt-28">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Mini challenge
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{lesson.miniChallenge}</p>
          <div className="flex flex-wrap items-center gap-2">
            <AcademyAiTutor code={code} language={track} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Ask the tutor if you're stuck
            </span>
          </div>
          <div className="min-h-[320px]">
            <AcademyCodeEditor
              key={codeKey}
              value={code}
              onChange={(v) => setChallengeCode((c) => ({ ...c, [codeKey]: v }))}
              language={editorLang}
              height={320}
              showRunButton={true}
              onReset={challengeCode[codeKey] !== undefined ? () =>
                setChallengeCode((c) => {
                  const next = { ...c };
                  delete next[codeKey];
                  return next;
                })
              : undefined}
            />
          </div>
        </section>

        <section
          id="lesson-quiz"
          className="scroll-mt-28 rounded-xl border-2 border-indigo-200 dark:border-indigo-800/60 bg-gray-50 dark:bg-gray-900/50 p-4 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-indigo-500" />
            Quiz — tap the right answer
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No pressure — you can try again. Green shows the correct answer.
          </p>
          <AcademyLessonInteractiveQuiz questions={lesson.quiz} />
        </section>

        {canMarkComplete && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {!completedSet.has(lesson.id) && (
              <Button
                onClick={() => handleMarkComplete(lesson.id)}
                disabled={completeLesson.isPending}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Mark as complete
              </Button>
            )}
            {completedSet.has(lesson.id) && (
              <>
                <p className="text-green-600 dark:text-green-400 flex items-center gap-2">
                  <Check className="h-4 w-4" /> Completed — you can review anytime.
                </p>
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <a href="#lesson-example">
                    <RotateCcw className="h-4 w-4" />
                    Review again
                  </a>
                </Button>
              </>
            )}
          </div>
        )}

        {(() => {
          const challengeTrack = track as AcademyTrack;
          const firstChallenge = ACADEMY_CHALLENGES.find(
            (c) => c.track === challengeTrack && c.lessonId === lesson.id
          );
          if (!firstChallenge) return null;

          return (
            <div className="flex items-center gap-3 pt-4 flex-wrap">
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link
                  to="/academy/challenges"
                  search={{
                    track: challengeTrack,
                    lessonId: lesson.id,
                    challengeId: firstChallenge.id,
                  }}
                >
                  Go to assignment (challenge)
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to="/academy/projects">Go to projects</Link>
              </Button>
            </div>
          );
        })()}

        <div className="flex items-center justify-between gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          {prevLesson ? (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link
                to="/academy/learn"
                search={{ track, lessonId: prevLesson.id }}
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/academy/learn" search={{ track }}>
                <ArrowLeft className="h-4 w-4" />
                Back to {TRACK_LABELS[track]}
              </Link>
            </Button>
          )}

          {nextLesson ? (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link
                to="/academy/learn"
                search={{ track, lessonId: nextLesson.id }}
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="gap-2" disabled>
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-6", ACADEMY_MAIN_MAX)}>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
        <Sparkles className="h-7 w-7 text-amber-500" />
        Learning modules
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-3">
        Start with <strong>Basics</strong>, then <strong>Web</strong> (HTML/CSS), then <strong>Python</strong>, <strong>JavaScript</strong>, <strong>React</strong>, <strong>TypeScript</strong>, and <strong>C++</strong> – from basics to expert. One place for all lessons; no duplication.
      </p>
      <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-gray-500 dark:text-gray-400">
        <AcademyScheduleDialog
          context={
            [
              "basics",
              "html",
              "python",
              "javascript",
              "react",
              "typescript",
              "ai",
              "cpp",
            ].includes(track)
              ? (track as AcademyScheduleContext)
              : "all"
          }
        />
        {track === "basics" && (
          <span>Basics: target ~2–3 days (short reads).</span>
        )}
        {hasCodeLessons && !conceptBlock && (
          <span>
            {TRACK_LABELS[track]} code: ~1 week at <strong>3 lessons/day</strong>.
          </span>
        )}
        {conceptBlock && !hasCodeLessons && (
          <span>Concepts: ~2 days per module to read sub-topics.</span>
        )}
        {conceptBlock && hasCodeLessons && (
          <span>Concepts ~2 days; code lessons ~1 week at 3/day.</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {TRACKS.map((t) => (
          <Link
            key={t.id}
            to="/academy/learn"
            search={{ track: t.id }}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              track === t.id
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {isBasics && (
        <ul className="space-y-2">
          {(lessons as typeof ACADEMY_BASICS).map((l) => {
            const done = basicsCompletedSet.has(l.id);
            return (
              <li key={l.id}>
                <Link
                  to="/academy/learn"
                  search={{ track: "basics", lessonId: l.id }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-indigo-200 dark:hover:border-indigo-800"
                >
                  {done ? (
                    <Check className="h-5 w-5 text-green-600 shrink-0" title="Completed" />
                  ) : (
                    <span className="text-2xl shrink-0">{l.emoji}</span>
                  )}
                  <span className="font-medium text-gray-900 dark:text-gray-100 flex-1 min-w-0">{l.title}</span>
                  {done && (
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
                      Complete
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {hasCodeLessons && !conceptBlock && (
        <ul className="space-y-2">
          {(lessons as AcademyLesson[]).map((l) => {
            const done = canMarkComplete && completedSet.has(l.id);
            const visited = getLessonVisitForList(l.id);
            return (
              <li key={l.id}>
                <Link
                  to="/academy/learn"
                  search={{ track: track as AcademyTrack, lessonId: l.id }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-indigo-200 dark:hover:border-indigo-800"
                >
                  {done ? (
                    <Check className="h-5 w-5 text-green-600 shrink-0" title="Completed" />
                  ) : visited ? (
                    <BookOpen className="h-5 w-5 text-indigo-500 shrink-0" title="Read" />
                  ) : (
                    <span className="text-2xl shrink-0">📄</span>
                  )}
                  <span className="font-medium text-gray-900 dark:text-gray-100 flex-1 min-w-0">{l.title}</span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
                    {done ? "Complete" : visited ? "Read" : ""}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {conceptBlock && (CONCEPT_ONLY_BLOCK_IDS.includes(track as ConceptBlockId) || hasCodeLessons) && (
        <>
          {hasCodeLessons && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-2 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-500" />
              Concepts (detailed sub-topics)
            </h2>
          )}
          <ul className="space-y-2">
            {conceptBlock.subTopics.map((st) => (
              <li key={st.id}>
                <Link
                  to="/academy/learn"
                  search={{ track, subTopicId: st.id }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-indigo-200 dark:hover:border-indigo-800"
                >
                  {st.emoji && <span className="text-2xl shrink-0">{st.emoji}</span>}
                  <span className="font-medium text-gray-900 dark:text-gray-100">{st.title}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                </Link>
              </li>
            ))}
          </ul>
          {hasCodeLessons && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-2 flex items-center gap-2">
                <Code2 className="h-5 w-5 text-green-600" />
                Code lessons (practice with the editor)
              </h2>
              <ul className="space-y-2">
                {(lessons as AcademyLesson[]).map((l) => {
                  const done = canMarkComplete && completedSet.has(l.id);
                  const visited = getLessonVisitForList(l.id);
                  return (
                    <li key={l.id}>
                      <Link
                        to="/academy/learn"
                        search={{ track: track as AcademyTrack, lessonId: l.id }}
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        {done ? (
                          <Check className="h-5 w-5 text-green-600 shrink-0" title="Completed" />
                        ) : visited ? (
                          <BookOpen className="h-5 w-5 text-indigo-500 shrink-0" title="Read" />
                        ) : canMarkComplete ? (
                          <Lock className="h-5 w-5 text-gray-400 shrink-0" title="Not started" />
                        ) : (
                          <BookOpen className="h-5 w-5 text-indigo-500 shrink-0" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-gray-100 flex-1 min-w-0">{l.title}</span>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
                          {done ? "Complete" : visited ? "Read" : ""}
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
