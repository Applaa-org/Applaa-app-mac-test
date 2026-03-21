import React, { useEffect, useMemo, useState } from "react";
import type { QuizQuestion } from "@/data/academyLessons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PartyPopper, RotateCcw, Sparkles, Lightbulb } from "lucide-react";

const GENERIC_WRONG_HINT =
  "Think about what the lesson said — rule out answers that clearly do not match.";

type Variant = "indigo" | "teal";

const VARIANT: Record<
  Variant,
  {
    text: string;
    bar: string;
    hover: string;
    answerAccent: string;
    gradient: string;
  }
> = {
  indigo: {
    text: "text-indigo-700 dark:text-indigo-300",
    bar: "bg-indigo-500 dark:bg-indigo-400",
    hover:
      "border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30",
    answerAccent: "border-indigo-400 text-indigo-800 dark:text-indigo-200",
    gradient:
      "border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-amber-50 dark:from-indigo-950/50 dark:to-amber-950/30",
  },
  teal: {
    text: "text-teal-700 dark:text-teal-300",
    bar: "bg-teal-500 dark:bg-teal-400",
    hover:
      "border-gray-200 dark:border-gray-700 hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-950/30",
    answerAccent: "border-teal-400 text-teal-800 dark:text-teal-200",
    gradient:
      "border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-amber-50 dark:from-teal-950/50 dark:to-amber-950/30",
  },
};

export function AcademyLessonInteractiveQuiz({
  questions,
  variant = "indigo",
}: {
  questions: QuizQuestion[];
  variant?: Variant;
}) {
  const v = VARIANT[variant];
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[idx];
  const total = questions.length;

  const shuffled = useMemo(() => {
    if (!q) return [];
    const opts = q.options.map((text, i) => ({ text, originalIndex: i }));
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
  }, [q]);

  useEffect(() => {
    setPicked(null);
    setHintShown(false);
    setFinalized(false);
  }, [idx]);

  const resetAll = () => {
    setIdx(0);
    setPicked(null);
    setHintShown(false);
    setFinalized(false);
    setScore(0);
    setDone(false);
  };

  if (!q || total === 0) {
    return (
      <p className="text-sm text-muted-foreground">No quiz for this lesson yet.</p>
    );
  }

  if (done) {
    const perfect = score === total;
    return (
      <div
        className={cn(
          "rounded-2xl border-2 p-6 text-center space-y-3",
          v.gradient,
        )}
        role="status"
        aria-live="polite"
      >
        <PartyPopper className="h-10 w-10 mx-auto text-amber-500" />
        <p className="text-2xl" aria-hidden>
          {perfect ? "🌟" : "👍"}
        </p>
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {perfect ? "Perfect score!" : "Nice try!"}{" "}
          <span className={v.text}>{score} / {total}</span>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {perfect
            ? "You really know this topic. Try the challenge or next lesson!"
            : "Read the lesson again or use the mini challenge — then retry the quiz."}
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={resetAll}>
            <RotateCcw className="h-4 w-4" />
            Try quiz again
          </Button>
          <Button type="button" variant="secondary" size="sm" className="gap-2" asChild>
            <a href="#lesson-challenge">Back to challenge</a>
          </Button>
        </div>
      </div>
    );
  }

  const correct =
    picked !== null &&
    finalized &&
    shuffled[picked]?.originalIndex === q.correctIndex;
  const showFeedback = finalized;
  const correctAnswerText = q.options[q.correctIndex] ?? "";
  const progressPct = total > 0 ? Math.round(((idx + 1) / total) * 100) : 0;

  const waitingAfterFirstWrong = hintShown && picked !== null && !finalized;
  const optionsLocked = finalized || waitingAfterFirstWrong;

  const handlePick = (i: number) => {
    if (finalized) return;
    if (picked !== null && hintShown) return;

    setPicked(i);
    const isCorrectOpt = shuffled[i]?.originalIndex === q.correctIndex;
    if (isCorrectOpt) {
      setFinalized(true);
      setScore((s) => s + 1);
      return;
    }
    if (!hintShown) {
      setHintShown(true);
      return;
    }
    setFinalized(true);
  };

  const tryAgain = () => {
    setPicked(null);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className={cn("text-sm font-semibold", v.text)}>
            Question {idx + 1} of {total}
          </p>
          <span className="text-xs text-muted-foreground">Tap the best answer</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
          role="progressbar"
          aria-valuenow={idx + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={`Question ${idx + 1} of ${total}`}
        >
          <div
            className={cn("h-full rounded-full transition-all duration-300", v.bar)}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
      <p className="text-base font-medium text-gray-900 dark:text-gray-100">{q.question}</p>
      <div className="grid gap-3 sm:grid-cols-1" role="group" aria-label="Answer choices">
        {shuffled.map((opt, i) => {
          const isSel = picked === i;
          const isCorrectOpt = opt.originalIndex === q.correctIndex;
          return (
            <button
              key={`${idx}-${i}`}
              type="button"
              disabled={optionsLocked}
              onClick={() => handlePick(i)}
              className={cn(
                "min-h-[3rem] rounded-xl border-2 px-4 py-3.5 text-left text-sm font-medium transition-all active:scale-[0.99]",
                !optionsLocked && v.hover,
                showFeedback &&
                  isCorrectOpt &&
                  "border-green-500 bg-green-50 dark:bg-green-950/40 text-green-900 dark:text-green-100",
                showFeedback && isSel && !isCorrectOpt && "border-red-400 bg-red-50 dark:bg-red-950/30",
                showFeedback && !isSel && !isCorrectOpt && "opacity-60",
                waitingAfterFirstWrong &&
                  isSel &&
                  !isCorrectOpt &&
                  "border-amber-400 bg-amber-50 dark:bg-amber-950/30",
              )}
            >
              <span className="flex items-start gap-2">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-current text-[11px] font-bold opacity-70">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{opt.text}</span>
              </span>
            </button>
          );
        })}
      </div>

      {waitingAfterFirstWrong && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 space-y-2">
          <p className="font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 shrink-0" />
            Hint
          </p>
          <p>{q.hint?.trim() ? q.hint : GENERIC_WRONG_HINT}</p>
          <Button type="button" size="sm" variant="secondary" onClick={tryAgain}>
            Try another answer
          </Button>
        </div>
      )}

      {showFeedback && (
        <div className="space-y-3 pt-1">
          <div
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              correct
                ? "bg-green-100/80 text-green-900 dark:bg-green-950/50 dark:text-green-100"
                : "bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
            )}
            role="status"
            aria-live="polite"
          >
            {correct ? (
              <div className="space-y-2">
                <p className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  Nice work — that’s right!
                </p>
                {q.explanation?.trim() ? (
                  <p className="text-gray-700 dark:text-gray-300 border-t border-green-200/60 dark:border-green-800/50 pt-2">
                    {q.explanation}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-semibold">Here’s the right answer:</p>
                <p className={cn("font-medium border-l-2 pl-2", v.answerAccent)}>
                  {correctAnswerText}
                </p>
              </div>
            )}
            {!correct && q.explanation?.trim() ? (
              <p className="mt-2 text-gray-700 dark:text-gray-300 border-t border-amber-200/50 dark:border-amber-800/50 pt-2">
                {q.explanation}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Button
              type="button"
              size="sm"
              className="min-h-10 px-4"
              onClick={() => {
                if (idx + 1 >= total) {
                  setDone(true);
                } else {
                  setIdx((n) => n + 1);
                }
              }}
            >
              {idx + 1 >= total ? "See score" : "Next question"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
