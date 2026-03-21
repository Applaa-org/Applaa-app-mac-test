import React, { useEffect, useState } from "react";
import { Link, useParams, useRouter, useSearch } from "@tanstack/react-router";
import { getSubject, getTopic } from "@/data/learningAcademyCurriculum";
import {
  BookOpen,
  ListOrdered,
  PenLine,
  ClipboardCheck,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  PlayCircle,
  Trophy,
  RotateCcw,
} from "lucide-react";

type TabId = "explain" | "lessons" | "practice" | "assessment";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "explain", label: "Explain", icon: BookOpen },
  { id: "lessons", label: "Lessons", icon: ListOrdered },
  { id: "practice", label: "Practice", icon: PenLine },
  { id: "assessment", label: "Assessment", icon: ClipboardCheck },
];

/** Tier word shifts with the year filter so titles never look copy-pasted across levels. */
function getYearLessonTierWord(yearNum: number): string {
  if (yearNum <= 7) return "soft";
  if (yearNum === 8) return "growing";
  if (yearNum === 9) return "firm";
  if (yearNum === 10) return "sharp";
  if (yearNum === 11) return "peak";
  return "core";
}

/** Cycles per lesson index so adjacent lessons read distinct at the same tier. */
const LESSON_ANGLE_WORDS = ["spotlight", "deepening", "lab", "synthesis", "checkpoint"] as const;

function getLessonAngleWord(lessonIndex: number): string {
  return LESSON_ANGLE_WORDS[lessonIndex % LESSON_ANGLE_WORDS.length];
}

/**
 * Strip "Lesson N:" and trailing " · {tier} · {angle}" so matching logic and generic lesson copy
 * still use the curriculum phrase (e.g. "Place value (foundations)").
 */
function lessonTitleCorePhrase(lessonTitle: string): string {
  const withoutLesson = lessonTitle.replace(/^Lesson \d+:\s*/i, "").trim();
  const parts = withoutLesson.split(/\s·\s/);
  if (parts.length >= 3) return parts.slice(0, -2).join(" · ").trim();
  return withoutLesson;
}

/** Keyword-specific progression hint in the title (still no year number in the string). */
function getTopicPhraseTitleSuffix(pLower: string, yearNum: number): string {
  const y = yearNum;
  const pick = (a7: string, a8: string, a9: string, a10: string, a11: string) =>
    y <= 7 ? a7 : y === 8 ? a8 : y === 9 ? a9 : y === 10 ? a10 : a11;

  if (pLower.includes("place value")) {
    return pick(
      "(foundations)",
      "(compare bigger numbers)",
      "(multi-step number sense)",
      "(extended calculations)",
      "(formal accuracy focus)",
    );
  }
  if (pLower.includes("four operations") || (pLower.includes("operations") && !pLower.includes("transformation"))) {
    return pick("(core skills)", "(harder calculations)", "(multi-step problems)", "(formal methods & accuracy)", "(timed working practice)");
  }
  if (pLower.includes("fraction")) {
    return pick("(parts of a whole)", "(equivalent fractions)", "(fraction arithmetic)", "(advanced fraction skills)", "(fraction problem focus)");
  }
  if (pLower.includes("decimal")) {
    return pick("(tenths + hundredths)", "(ordering decimals)", "(decimals in calculations)", "(formal decimal methods)", "(decimal problem focus)");
  }
  if (pLower.includes("percentage") || pLower.includes("percent")) {
    return pick("(simple percentages)", "(discounts + scores)", "(percentage problems)", "(formal percentage methods)", "(percentage problem focus)");
  }
  if (pLower.includes("expression")) {
    return pick("(first symbols)", "(simplify & substitute)", "(mixed expressions)", "(formal notation)", "(precise manipulation)");
  }
  if (pLower.includes("equation")) {
    return pick("(balance idea)", "(two-step flows)", "(harder unknowns)", "(multi-step linear)", "(advanced rearranging)");
  }
  if (pLower.includes("sequence")) {
    return pick("(spot the pattern)", "(term rules)", "(nth-term intro)", "(nth-term fluency)", "(sequence problems)");
  }
  if (pLower.includes("formulae") || pLower.includes("formula")) {
    return pick("(rules in words)", "(substitute values)", "(rearrange intro)", "(rearrange fluency)", "(formulae in context)");
  }
  if (pLower.includes("shape")) {
    return pick("(name & sort)", "(properties)", "(compare shapes)", "(reason about properties)", "(proof-style reasoning)");
  }
  if (pLower.includes("angle")) {
    return pick("(meet angles)", "(measure & estimate)", "(angle rules)", "(multi-step angles)", "(angle chains)");
  }
  if (pLower.includes("area") || pLower.includes("perimeter")) {
    return pick("(count squares)", "(formulae intro)", "(compound shapes)", "(multi-step measure)", "(measure problems)");
  }
  if (pLower.includes("volume")) {
    return pick("(packing cubes)", "(cuboid rule)", "(capacity links)", "(complex solids)", "(volume problems)");
  }
  if (pLower.includes("unit") && pLower.includes("measure")) {
    return pick("(choose units)", "(convert intro)", "(convert fluency)", "(compound units)", "(accuracy focus)");
  }
  if (pLower.includes("average") || pLower.includes("chart") || pLower.includes("table")) {
    return pick("(read charts)", "(summarise data)", "(compare datasets)", "(interpret trends)", "(evaluate claims)");
  }
  if (pLower.includes("probability")) {
    return pick("(fair & unfair)", "(scale 0–1)", "(combined events intro)", "(tree & tables)", "(harder chance)");
  }
  if (pLower.includes("ratio") || pLower.includes("proportion") || pLower.includes("scale")) {
    return pick("(share fairly)", "(equivalent ratios)", "(unitary method)", "(direct proportion)", "(multi-step ratio)");
  }
  if (
    pLower.includes("trigonometry") ||
    pLower.includes("sin") ||
    pLower.includes("cos") ||
    pLower.includes("tan") ||
    pLower.includes("right-angled") ||
    pLower.includes("right angled")
  ) {
    return pick("(right-angle recap)", "(name sides)", "(ratio idea)", "(calculate lengths)", "(solve triangles)");
  }
  if (
    pLower.includes("gradient") ||
    pLower.includes("rate of change") ||
    pLower.includes("rates of change") ||
    pLower.includes("calculus")
  ) {
    return pick("(steepness stories)", "(from graph to meaning)", "(average change)", "(instant ideas)", "(interpret graphs)");
  }
  if (pLower.includes("force") || pLower.includes("push") || pLower.includes("pull")) {
    return pick("(feel forces)", "(name effects)", "(resultant intro)", "(free-body thinking)", "(quantify forces)");
  }
  if (pLower.includes("gravity")) {
    return pick("(things fall)", "(weight vs mass idea)", "(gravity daily)", "(gravity & motion)", "(gravity calculations)");
  }
  if (pLower.includes("friction")) {
    return pick("(grip & slide)", "(where friction helps)", "(speed & friction)", "(heat from friction)", "(friction in design)");
  }
  if (pLower.includes("light") || pLower.includes("shadow") || pLower.includes("reflection")) {
    return pick("(sources & shadows)", "(straight-line travel)", "(reflect & refract)", "(diagram skills)", "(explain phenomena)");
  }
  if (pLower.includes("sound") || pLower.includes("vibrat")) {
    return pick("(hear & feel)", "(pitch & volume)", "(sound travel)", "(waves idea)", "(sound applications)");
  }
  if (pLower.includes("circuit") || pLower.includes("electric") || pLower.includes("conductor") || pLower.includes("insulator")) {
    return pick("(make a loop)", "(components)", "(conductors vs insulators)", "(series ideas)", "(circuit reasoning)");
  }
  if (pLower.includes("energy") || pLower.includes("conservation")) {
    return pick("(energy stories)", "(stores & transfers)", "(pathways)", "(sankey thinking)", "(quantify transfers)");
  }
  if (pLower.includes("speed") || pLower.includes("distance") || pLower.includes("motion") || pLower.includes("graph")) {
    return pick("(fast vs slow)", "(measure motion)", "(speed calc)", "(graphs of motion)", "(interpret graphs)");
  }
  if (pLower.includes("solid") || pLower.includes("liquid") || pLower.includes("gas") || pLower.includes("particle")) {
    return pick("(observe states)", "(particle pictures)", "(changes of state)", "(model explanations)", "(predict behaviour)");
  }
  if (pLower.includes("rock") || pLower.includes("fossil") || pLower.includes("soil")) {
    return pick("(sort materials)", "(how rocks form)", "(evidence in rock)", "(soil & life)", "(Earth processes)");
  }
  if (pLower.includes("acid") || pLower.includes("alkali") || pLower.includes("indicator") || pLower.includes("reaction")) {
    return pick("(safe observations)", "(sort substances)", "(word equations)", "(symbol equations)", "(explain patterns)");
  }
  if (pLower.includes("plant") || pLower.includes("photosynthesis")) {
    return pick("(parts & jobs)", "(what plants need)", "(photosynthesis story)", "(factors & rate)", "(evaluate models)");
  }
  if (pLower.includes("living") || pLower.includes("habitat") || pLower.includes("classif")) {
    return pick("(life signs)", "(sort organisms)", "(adaptations)", "(food webs)", "(evaluate evidence)");
  }
  if (pLower.includes("evolution") || pLower.includes("inheritance") || pLower.includes("variation")) {
    return pick("(differences)", "(traits)", "(adaptation)", "(selection idea)", "(genetics link)");
  }
  if (pLower.includes("nutrition") || pLower.includes("exercise") || pLower.includes("health")) {
    return pick("(fuel for life)", "(balanced living)", "(body systems)", "(lifestyle & risk)", "(evaluate health claims)");
  }
  if (pLower.includes("algorithm") || pLower.includes("decomposition")) {
    return pick("(precise steps)", "(patterns)", "(debug logic)", "(efficiency idea)", "(compare approaches)");
  }
  if (pLower.includes("program") || pLower.includes("coding") || pLower.includes("loop")) {
    return pick("(first program)", "(variables)", "(branch & repeat)", "(structure code)", "(test & refactor)");
  }
  if (
    pLower.includes("comprehension") ||
    pLower.includes("inference") ||
    pLower.includes("reading") ||
    pLower.includes("writer") ||
    pLower.includes("analysis")
  ) {
    return pick("(literal meaning)", "(read between lines)", "(writer’s purpose)", "(compare texts)", "(evaluate craft)");
  }
  if (pLower.includes("writing") || pLower.includes("grammar") || pLower.includes("vocabulary")) {
    return pick("(clear sentences)", "(paragraph flow)", "(tone & audience)", "(structure pieces)", "(edit for impact)");
  }
  if (pLower.includes("presentation") || pLower.includes("spoken") || pLower.includes("discussion")) {
    return pick("(speak clearly)", "(listen well)", "(build arguments)", "(formal talk)", "(debate with respect)");
  }
  if (pLower.includes("poetry") || pLower.includes("drama") || pLower.includes("prose") || pLower.includes("literature")) {
    return pick("(enjoy the text)", "(key techniques)", "(compare extracts)", "(context & meaning)", "(timed analysis)");
  }
  if (pLower.includes("source") || pLower.includes("evidence") || pLower.includes("historical")) {
    return pick("(what is a source)", "(bias intro)", "(weigh evidence)", "(support a claim)", "(essay planning)");
  }
  if (pLower.includes("river") || pLower.includes("coast") || pLower.includes("weather") || pLower.includes("climate")) {
    return pick("(observe processes)", "(name features)", "(explain formation)", "(human interaction)", "(evaluate change)");
  }
  if (pLower.includes("population") || pLower.includes("urban") || pLower.includes("development")) {
    return pick("(where people live)", "(push & pull)", "(city growth)", "(development stories)", "(evaluate policies)");
  }
  if (pLower.includes("fieldwork")) {
    return pick("(observe safely)", "(record data)", "(simple graphs)", "(draw conclusions)", "(evaluate method)");
  }
  if (pLower.includes("belief") || pLower.includes("worship") || pLower.includes("religion")) {
    return pick("(respect & listen)", "(key ideas)", "(compare practices)", "(deep questions)", "(dialogue skills)");
  }
  if (pLower.includes("ethic") || pLower.includes("moral") || pLower.includes("philosophy")) {
    return pick("(fairness)", "(arguments)", "(counterpoints)", "(case studies)", "(balanced judgement)");
  }
  if (pLower.includes("listening") || pLower.includes("french") || pLower.includes("spanish") || pLower.includes("german")) {
    return pick("(key words)", "(short texts)", "(gist & detail)", "(opinions)", "(authentic speed)");
  }
  if (pLower.includes("budget") || pLower.includes("money") || pLower.includes("income")) {
    return pick("(needs vs wants)", "(simple budgets)", "(saving habit)", "(interest idea)", "(plan a project)");
  }
  if (pLower.includes("customer") || pLower.includes("market")) {
    return pick("(who buys)", "(value idea)", "(simple research)", "(position a product)", "(evaluate a pitch)");
  }
  return "";
}

/** Derive lesson titles from topic description (varies by year + lesson slot) */
function getLessonTitlesForTopic(
  topic: { title: string; description: string },
  year?: number,
): string[] {
  const parts = topic.description.split(/[,.]/).map((s) => s.trim()).filter(Boolean);
  const yearNum = year ?? 7;
  const tier = getYearLessonTierWord(yearNum);

  if (parts.length >= 2) {
    return parts.map((p, i) => {
      const pLower = p.toLowerCase();
      const kw = getTopicPhraseTitleSuffix(pLower, yearNum);
      const suffix = kw ? ` ${kw}` : "";
      const angle = getLessonAngleWord(i);
      return `Lesson ${i + 1}: ${p}${suffix} · ${tier} · ${angle}`;
    });
  }
  const a0 = getLessonAngleWord(0);
  const a1 = getLessonAngleWord(1);
  const a2 = getLessonAngleWord(2);
  return [
    `Lesson 1: Introduction to ${topic.title} · ${tier} · ${a0}`,
    `Lesson 2: Key concepts for ${topic.title} · ${tier} · ${a1}`,
    `Lesson 3: Applying ${topic.title} · ${tier} · ${a2}`,
  ];
}

/** Group years into three content tiers so lessons read clearly different (not just a one-line prefix). */
type LessonYearBand = "y7" | "y89" | "y1011";

function lessonYearBand(yearNum: number): LessonYearBand {
  if (yearNum <= 7) return "y7";
  if (yearNum <= 9) return "y89";
  return "y1011";
}

function pickLessonBand<T>(yearNum: number, byBand: { y7: T; y89: T; y1011: T }): T {
  return byBand[lessonYearBand(yearNum)];
}

/** Lesson detail: intro, optional learning objectives, core concepts, example, lesson summary */
function getLessonDetail(
  lessonTitle: string,
  topicTitle: string,
  year?: number,
): {
  intro: string;
  learningObjectives?: string[];
  coreConcepts: { name: string; explanation: string }[];
  example: string;
  lessonSummary: string;
} {
  const t = lessonTitle.toLowerCase();
  const topicLower = topicTitle.toLowerCase();
  const yearNum = year ?? 7;
  /** Intentionally empty: lesson difficulty still follows `yearNum` via banded bodies and examples, without naming a year in the text. */
  const yearLeadIn = "";
  if (t.includes("place value")) {
    const placeValueBody = pickLessonBand(yearNum, {
      y7: {
        intro:
          "Place value means each digit is worth a different amount depending on its position. You’ll work mostly with ones, tens and hundreds (and a little with thousands). The same digit can mean 3, 30 or 300 depending on where it sits — that idea is the heart of our number system.",
        objectives: [
          "Read and write 3- and 4-digit numbers using place value language.",
          "Say the value of any digit in a number up to thousands.",
          "See why 0 is needed as a placeholder (e.g. 305 vs 35).",
        ],
        core: [
          {
            name: "Ones, tens, hundreds",
            explanation:
              "Start from the right: the right-hand digit is ones (units), next is tens, next is hundreds. In 342, the 2 is 2 ones, the 4 is 4 tens (40), the 3 is 3 hundreds (300). Say it as ‘three hundred and forty-two’.",
          },
          {
            name: "Digit × place",
            explanation:
              "The value of a digit = digit × the value of its column. So in 507, the 5 is worth 500, the 0 is worth 0 tens, the 7 is worth 7. Writing 507 without the zero would give a completely different number.",
          },
          {
            name: "Comparing numbers",
            explanation:
              "To compare two whole numbers, look at the highest place first (hundreds before tens). If hundreds are equal, look at tens, then ones. Place value is why 419 is bigger than 391 even though both start with 4.",
          },
        ],
        summary:
          "You can now read small and medium numbers using place value, work out what each digit is worth, and explain why zero matters. Next you’ll use this for adding, subtracting and estimating.",
      },
      y89: {
        intro:
          "Place value extends to larger whole numbers and links directly to standard written methods. You’ll use powers of 10 (10, 100, 1000, …) fluently, compare and order big numbers, and see how regrouping in arithmetic depends on place value.",
        objectives: [
          "Work confidently with numbers into millions and use commas (or spacing) to group thousands.",
          "Multiply and divide whole numbers by 10, 100, 1000 by moving digits (not ‘adding zeros’ blindly).",
          "Use place value to estimate and to check whether an answer is sensible.",
        ],
        core: [
          {
            name: "Columns and powers of 10",
            explanation:
              "Each column to the left is worth 10 times more: … thousands, hundreds, tens, ones. Multiplying by 10 moves every digit one column left; dividing by 10 moves one column right. This is the same idea as ‘carrying’ and ‘borrowing’ in column addition and subtraction.",
          },
          {
            name: "Expanded form and partitioning",
            explanation:
              "Any whole number can be split: e.g. 28,406 = 20,000 + 8,000 + 400 + 6. Partitioning helps mental maths and helps you spot errors in written work.",
          },
          {
            name: "Ordering and rounding",
            explanation:
              "Order by comparing the largest place first. Rounding to the nearest 10, 100 or 1000 uses place value: look at the digit ‘next door’ to decide whether the digit you keep goes up or stays.",
          },
          {
            name: "Zero as placeholder",
            explanation:
              "In 2,507 the 0 holds the tens place so the 5 stays in the hundreds and the 7 in the ones. Without it, 257 is a different number. This becomes even more important with decimals in later lessons.",
          },
        ],
        summary:
          "You can now explain place value for large whole numbers, use ×10 / ÷10 reasoning, partition numbers, and compare or round with confidence. This supports all harder number work that follows.",
      },
      y1011: {
        intro:
          "At this stage, place value underpins standard form (scientific notation), accuracy, bounds and error intervals, and working with very large or very small numbers. You must show clear working and interpret questions that mix units (e.g. km vs m) using consistent place value.",
        objectives: [
          "Relate place value to standard form a × 10ⁿ and interpret n for large and small magnitudes.",
          "Use place value when converting units and when giving answers to a required degree of accuracy.",
          "Apply place-value reasoning to check multi-step calculations and challenging applied problems.",
        ],
        core: [
          {
            name: "Structure of the number system",
            explanation:
              "The pattern continues left and right of the decimal point: … thousands, hundreds, tens, ones, tenths, hundredths, … Each step is a factor of 10. Mis-aligning the decimal point in calculation is one of the most common mistakes — place value prevents that.",
          },
          {
            name: "Standard form link",
            explanation:
              "Writing 3.2 × 10⁶ means 3.2 × 1,000,000. The power tells you how many places the digits shift. Standard form is place value written compactly — essential for science and maths papers.",
          },
          {
            name: "Accuracy and bounds",
            explanation:
              "If a value is given ‘to the nearest 10’, place value tells you the upper and lower limits (bounds). Half the size of that place gives the error interval. This is pure place-value thinking applied to real measurements.",
          },
          {
            name: "Strong working habits",
            explanation:
              "Show each step: identify the place you are rounding to, line up decimals for addition, and state units. Always ask: ‘Does the magnitude make sense?’ — e.g. should the answer be in the hundreds or millions?",
          },
        ],
        summary:
          "You can now connect place value to advanced topics: large numbers, standard form, decimals, units and bounds. Use it to work accurately and to catch mistakes before you hand in your work.",
      },
    });
    return {
      intro: yearLeadIn + placeValueBody.intro,
      learningObjectives: placeValueBody.objectives,
      coreConcepts: placeValueBody.core,
      example:
        yearNum === 7
          ? "In 405: 4 hundreds (4 × 100 = 400), 0 tens (0 × 10 = 0), 5 ones (5 × 1 = 5). So 405 = 400 + 0 + 5."
          : yearNum === 8
            ? "In 2,407: 2 thousands (2 × 1000 = 2000), 4 hundreds (4 × 100 = 400), 0 tens (0 × 10 = 0), 7 ones (7 × 1 = 7). So 2,407 = 2000 + 400 + 0 + 7."
            : yearNum === 9
              ? "In 12,304: 1 ten-thousand (1 × 10,000 = 10,000), 2 thousands (2 × 1000 = 2000), 3 hundreds (3 × 100 = 300), 0 tens (0 × 10 = 0), 4 ones (4 × 1 = 4). So 12,304 = 10,000 + 2,000 + 300 + 4."
              : yearNum === 10
                ? "In 120,304: 1 hundred-thousand (1 × 100,000 = 100,000), 2 ten-thousands (2 × 10,000 = 20,000), 3 hundreds (3 × 100 = 300), 0 tens (0 × 10 = 0), 4 ones (4 × 1 = 4). So 120,304 = 100,000 + 20,000 + 300 + 4."
                : "In 1,203,045: 1 million (1 × 1,000,000 = 1,000,000), 2 hundred-thousands (2 × 100,000 = 200,000), 3 thousands (3 × 1000 = 3,000), 4 tens (4 × 10 = 40), 5 ones (5 × 1 = 5). So 1,203,045 = 1,000,000 + 200,000 + 3,000 + 40 + 5.",
      lessonSummary: yearLeadIn + placeValueBody.summary,
    };
  }
  if (t.includes("four operations") || t.includes("operations")) {
    const fourOpsBody = pickLessonBand(yearNum, {
      y7: {
        intro:
          "You’ll use adding, subtracting, multiplying and dividing with whole numbers in real contexts: shopping, sport scores, grouping objects and sharing fairly. The focus is on understanding what each operation means, not just pressing buttons on a calculator.",
        core: [
          {
            name: "Add and subtract (whole numbers)",
            explanation:
              "Addition puts parts together to make a total. Subtraction finds what is left after you take away, or how much more one number is than another. Draw a bar model or use objects if it helps — the story behind the numbers matters.",
          },
          {
            name: "Multiply as ‘groups of’",
            explanation:
              "3 × 4 means ‘3 groups of 4’ (or 4 + 4 + 4). It is faster than repeated adding. Link it to arrays and equal rows in real life (e.g. egg boxes, chairs in rows).",
          },
          {
            name: "Divide as sharing or grouping",
            explanation:
              "12 ÷ 3 can mean ‘share 12 into 3 equal piles’ (how many in each pile?) or ‘how many groups of 3 in 12?’. Both views help you see why division and multiplication are linked.",
          },
          {
            name: "Check it makes sense",
            explanation:
              "After any calculation, ask: is the answer roughly the right size? If you add two positive numbers, the total should be bigger; if you divide by a number bigger than 1, the result should be smaller than what you started with (for positive amounts).",
          },
        ],
        summary:
          "You can describe add, subtract, multiply and divide in words, use them in simple stories, and do a quick sanity-check on your answer. That prepares you for formal written methods next.",
      },
      y89: {
        intro:
          "You’ll combine the four operations with negative numbers, decimals and simple fractions in multi-step problems. Order of operations (BIDMAS/BODMAS) matters when a question mixes +, −, ×, ÷ and brackets. You’ll also interpret word problems and choose the correct operation.",
        core: [
          {
            name: "Operation sense + word problems",
            explanation:
              "Read the question twice: are you combining, comparing, scaling or splitting? Write a mini-plan before calculating. Estimating first (rounding) tells you if your final answer is in the right ballpark.",
          },
          {
            name: "BIDMAS / BODMAS",
            explanation:
              "Brackets first, then indices (if any), then divide and multiply (left to right), then add and subtract (left to right). A common mistake is doing addition before multiplication — always follow the order unless brackets say otherwise.",
          },
          {
            name: "Decimals and negatives",
            explanation:
              "Use a number line: adding a negative is moving left; subtracting a negative can increase the value. With decimals, line up place value columns — the same rules as whole numbers, just with a decimal point.",
          },
          {
            name: "Inverse operations",
            explanation:
              "Addition and subtraction undo each other; multiplication and division undo each other. This is how you check answers and how you’ll solve simple equations later (e.g. ‘what number times 3 gives 18?’).",
          },
        ],
        summary:
          "You can tackle multi-step calculations with correct order of operations, work with decimals and negatives carefully, and connect the four operations to problem-solving. Always show working so you can spot where a mistake happened.",
      },
      y1011: {
        intro:
          "You must execute mixed calculations accurately under timed conditions: fractions, decimals, percentages and standard form often appear in the same question. You will justify steps, use inverse operations to verify results, and interpret calculator output (including standard form and rounding).",
        core: [
          {
            name: "Formal, step-by-step calculation",
            explanation:
              "Write one clear step per line. State intermediate results if the question asks for working. Use brackets on paper the same way you would on a calculator. Never skip a step that changes the meaning (especially with negatives and fractions).",
          },
          {
            name: "Fractions, decimals and % in chains",
            explanation:
              "Convert to a single form when it makes the working clearer (e.g. change 25% to 0.25 or 1/4 before multiplying). For division by a fraction, multiply by its reciprocal — show that step explicitly in revision, then streamline in timed practice.",
          },
          {
            name: "Estimation and error spotting",
            explanation:
              "Before you finish, estimate using rounded values: if your exact answer is orders of magnitude wrong, recheck place value or BIDMAS. In science contexts, watch unit consistency (e.g. don’t mix m and km without converting).",
          },
          {
            name: "Using a calculator wisely",
            explanation:
              "Know when the syllabus expects an exact fractional answer vs a decimal. Understand how your calculator displays standard form and roots. Always rewrite the final answer in the form the question requests (surd, fraction, decimal to n d.p.).",
          },
        ],
        summary:
          "You can perform accurate multi-step arithmetic at an advanced level, explain your reasoning, convert between forms when needed, and use estimation and inverses to validate answers under time pressure.",
      },
    });
    return {
      intro: yearLeadIn + fourOpsBody.intro,
      coreConcepts: fourOpsBody.core,
      example:
        yearNum === 7
          ? "24 sweets shared among 6 friends: 24 ÷ 6 = 4 sweets each."
          : yearNum === 8
            ? "48 − 17 = 31, then 31 ÷ 7 = 4 remainder 3 (show the steps clearly)."
            : yearNum === 9
              ? "2.4 × 3 = 7.2 and 7.2 ÷ 0.6 = 12 (use place value and decimals carefully)."
              : yearNum === 10
                ? "Calculate carefully using BIDMAS: 4.8 × (7.2 − 3.6) = 4.8 × 3.6 = 17.28."
                : "Multi-step working: (12.5 + 7.5) × 3 − 10 = 50 (write your working).",
      lessonSummary: yearLeadIn + fourOpsBody.summary,
    };
  }
  if (t.includes("fraction")) {
    return {
      intro:
        yearLeadIn +
        "Fractions are how we describe parts of a whole: half a pizza, a quarter of an hour, three fifths of the class. In this lesson we learn what the top and bottom numbers mean, how to find equivalent fractions, and why we need the same denominator when we add or subtract. These ideas are used in measuring, sharing and later in percentages and algebra.",
      learningObjectives: [
        "Name and use the numerator and denominator correctly.",
        "Understand that a fraction is part of a whole split into equal parts.",
        "Find and use equivalent fractions (e.g. ½ = 2/4 = 3/6).",
        "Know why we need the same denominator to add or subtract fractions.",
      ],
      coreConcepts: [
        { name: "Numerator and denominator", explanation: "The top number is the numerator: it tells you how many parts you have. The bottom number is the denominator: it tells you how many equal parts the whole is split into. So ¾ means 3 parts out of 4 equal parts. Always read fractions with the denominator first when saying them aloud: 'three quarters' (4 parts, we have 3)." },
        { name: "Part of a whole", explanation: "A fraction always describes part of one whole (or more). The whole can be a shape (e.g. a circle cut into slices), a quantity (e.g. a litre of juice), or a set (e.g. 12 sweets). The key is that the whole is split into equal parts. If the parts are not equal, we cannot write a simple fraction for 'one part'." },
        { name: "Equivalent fractions", explanation: "Different fractions can represent the same amount. ½ = 2/4 = 3/6 = 4/8. We get equivalent fractions by multiplying or dividing the numerator and denominator by the same number (like simplifying or expanding). So 2/4 = ½ (divide top and bottom by 2). Equivalent fractions help us compare, add and subtract." },
        { name: "Same denominator", explanation: "To add or subtract fractions, we need the same denominator so we are comparing the same-sized parts. We can't add ½ and ⅓ directly until we write them with a common denominator (e.g. 3/6 + 2/6 = 5/6). Finding a common denominator is a key skill for fraction arithmetic." },
      ],
      example:
        yearNum === 7
          ? "A pizza is cut into 4 equal slices. You eat 2 slices: 2/4 of the pizza. 2/4 = 1/2, so you ate half the pizza."
          : yearNum === 8
            ? "Add fractions with the same denominator: 1/3 + 1/6 = 2/6 + 1/6 = 3/6 = 1/2."
            : yearNum === 9
              ? "Mixed number example: 1 1/2 + 2/3 = 3/2 + 2/3 = 9/6 + 4/6 = 13/6 = 2 1/6."
              : yearNum === 10
                ? "Advanced arithmetic: 3/4 − 5/6 = 9/12 − 10/12 = −1/12."
                : "Technique: link to percentages. 25% = 25/100 = 1/4.",
      lessonSummary:
        yearLeadIn +
        "You now know that the numerator is the number of parts we have and the denominator is the number of equal parts in the whole; that equivalent fractions represent the same amount; and that we need the same denominator to add or subtract fractions. Use this when sharing, measuring and in later topics like percentages.",
    };
  }
  if (t.includes("decimal")) {
    return {
      intro:
        yearLeadIn +
        "Decimals let us write numbers that are not whole: amounts between 0 and 1, or a mix of whole and parts (like 3.45). We use them for money (£3.45), measures (2.5 kg), and in almost every calculation. This lesson covers what the decimal point means, how tenths and hundredths work, and how to read, order and use decimals.",
      learningObjectives: [
        "Understand that the decimal point separates whole numbers from parts of one.",
        "Read and write tenths and hundredths (0.1, 0.01, 0.25, etc.).",
        "Use place value for decimals (each place is 10× the one to the right).",
        "Order decimals and use them in simple addition and subtraction.",
      ],
      coreConcepts: [
        { name: "Decimal point", explanation: "The dot (.) is the decimal point. Everything to the left is the whole number part; everything to the right is the part less than one (tenths, hundredths, thousandths). So 7.3 means 7 wholes and 3 tenths. We always line up decimal points when we add, subtract or compare decimals." },
        { name: "Tenths and hundredths", explanation: "0.1 is one tenth (1/10); 0.01 is one hundredth (1/100). So 0.5 = 5 tenths = ½, and 0.25 = 25 hundredths = ¼. Knowing these links to fractions helps with converting and with mental maths." },
        { name: "Place value", explanation: "Decimals follow the same place-value pattern as whole numbers: each place is 10 times the one to the right. So we have … tens, ones, tenths, hundredths, thousandths … The pattern continues to the right of the decimal point." },
        { name: "Ordering and calculating", explanation: "To compare decimals, compare the digits in the same place (tenths with tenths, etc.). To add or subtract, align the decimal points so we are adding tenths to tenths and hundredths to hundredths. This keeps the place value correct." },
      ],
      example:
        yearNum === 7
          ? "0.5 + 0.3 = 0.8 (line up tenths, then add)."
          : yearNum === 8
            ? "Order decimals: 0.4, 0.12, 0.23. The order is 0.12, 0.23, 0.4."
            : yearNum === 9
              ? "Calculate with decimals: 2.4 × 3 = 7.2 and 7.2 ÷ 0.6 = 12."
              : yearNum === 10
                ? "Show working: 3.25 + 1.8 = 5.05 (align decimal places, then add)."
                : "Show working: 0.06 ÷ 0.03 = 2 (show and then check).",
      lessonSummary:
        yearLeadIn +
        "You now know how the decimal point separates wholes from parts of one; how tenths and hundredths work and link to fractions; and how to read, order and use decimals in money and measures. Use this whenever you see numbers with a decimal point.",
    };
  }
  if (t.includes("percentage")) {
    return {
      intro:
        yearLeadIn +
        "Percentages are everywhere: in shops (25% off), in tests (you got 80%), and in the news (e.g. 30% of people said yes). In this lesson we learn what a percentage really is, how it links to fractions and decimals, and how to work out simple percentages so you can use them in real life.",
      learningObjectives: [
        "Understand that a percentage is a number out of 100 and what the % symbol means.",
        "Convert between percentages, fractions and decimals (e.g. 25% = ¼ = 0.25).",
        "Find 10% of an amount by dividing by 10, and use it to find 20%, 5%, etc.",
        "Use percentages in real situations like discounts and test scores.",
      ],
      coreConcepts: [
        { name: "Out of 100", explanation: "A percentage is always 'out of 100'. The symbol % means 'per hundred'. So 50% means 50 out of 100—the same as a half. 100% means the whole amount; 0% means none. Whenever you see a percentage, think: 'How many out of 100?'" },
        { name: "Fractions and decimals", explanation: "Percentages, fractions and decimals are different ways to write the same thing. 25% = 25/100 = ¼ = 0.25. So 25% of 20 is the same as ¼ of 20 or 0.25 × 20. Being able to switch between them makes mental maths and problem solving much easier." },
        { name: "Finding 10%", explanation: "To find 10% of any number, divide it by 10. So 10% of 80 is 8, and 10% of 350 is 35. Once you have 10%, you can find 20% (double it), 30% (treble it), 5% (half of 10%), and so on. This is a very useful shortcut." },
        { name: "Real-life use", explanation: "We use percentages for discounts (e.g. 25% off means you pay 75% of the price), test scores (e.g. 18 out of 20 = 90%), and statistics (e.g. 60% of the class likes football). Understanding percentages helps you compare offers and interpret numbers correctly." },
      ],
      example:
        yearNum === 7
          ? "Find 10%: 10% of £80 is £8. Then 25% is 2.5 × £8 = £20."
          : yearNum === 8
            ? "Discount: £30 is 20% off. 20% of 30 is 6, so you pay 30 − 6 = £24."
            : yearNum === 9
              ? "Increase: £50 increases by 15%. 15% of 50 is 7.50, so new price is £57.50."
              : yearNum === 10
                ? "Show working for a multi-step percent change (increase then decrease) and state the final price."
                : "Technique: reverse percentage. If a price becomes £72 after a 20% increase, divide by 1.2 to get the original.",
      lessonSummary:
        yearLeadIn +
        "You now know that a percentage is a number out of 100; how to convert between percentages, fractions and decimals; how to find 10% by dividing by 10 and use it to find other percentages; and how to use percentages in real situations like discounts and scores. Practise with the Practice and Assessment tabs.",
    };
  }
  // Algebra — individual lessons matched specifically (most specific first)
  if (t.includes("expression") && !t.includes("equation") && !t.includes("sequence") && !t.includes("formulae")) {
    return {
      intro: "An expression is a mathematical phrase written in symbols that contains numbers, letters (variables) and operations — but no equals sign. Expressions are one of the most important building blocks of algebra. Understanding them lets you describe situations using maths and opens the door to solving equations and writing formulae.",
      learningObjectives: [
        "Understand that a letter (variable) represents an unknown or changing number.",
        "Recognise and write algebraic expressions (e.g. 2n + 3, 4x − 7).",
        "Simplify expressions by collecting like terms (e.g. 3x + 2x = 5x).",
        "Substitute a value into an expression to work out its value.",
      ],
      coreConcepts: [
        { name: "Variables and terms", explanation: "A variable is a letter that stands for a number we don't know yet (e.g. x, n, y). A term is a single part of an expression: it can be a number (constant), a variable, or a number multiplied by a variable (e.g. 3x). In the expression 4x + 2y − 5, there are three terms: 4x, 2y, and −5." },
        { name: "Writing expressions", explanation: "We write expressions to describe situations. 'Three more than n' is n + 3. 'Five times a number x' is 5x. 'A number divided by 4 then subtract 2' is n ÷ 4 − 2. There is no equals sign — we are describing an amount, not stating that two things are equal." },
        { name: "Simplifying — collecting like terms", explanation: "Like terms have exactly the same variable (and power). We can add or subtract them: 3x + 2x = 5x, or 7y − 3y = 4y. Unlike terms (e.g. 3x and 2y) cannot be combined. Simplifying makes expressions shorter and easier to use. For example, 5x + 2y + 3x − y = 8x + y." },
        { name: "Substitution", explanation: "Substitution means replacing the variable with a given number to work out the value of the expression. If the expression is 2n + 3 and n = 4, then 2(4) + 3 = 8 + 3 = 11. Always follow the order of operations: brackets, then multiply or divide, then add or subtract (BODMAS)." },
      ],
      example: "Expression: 2n + 3. If n = 5: substitute to get 2 × 5 + 3 = 10 + 3 = 13. Simplify 4x + 3y + 2x − y: collect x terms → 4x + 2x = 6x; collect y terms → 3y − y = 2y; result: 6x + 2y.",
      lessonSummary: "You now know what a variable and a term are; how to write algebraic expressions to describe real situations; how to simplify by collecting like terms; and how to substitute a value to find the numerical result. These skills underpin all further algebra.",
    };
  }
  if (t.includes("equation") && !t.includes("expression") && !t.includes("sequence") && !t.includes("formulae")) {
    return {
      intro: "An equation is a mathematical statement that says two expressions are equal, shown by an equals sign (=). Solving an equation means finding the value of the unknown letter that makes the statement true. Equations appear throughout maths and science whenever we want to find an unknown value.",
      learningObjectives: [
        "Understand the difference between an expression (no equals sign) and an equation (with equals sign).",
        "Solve one-step equations using inverse operations (e.g. x + 5 = 12 → x = 7).",
        "Solve two-step equations by applying inverse operations in reverse order.",
        "Check solutions by substituting the answer back into the original equation.",
      ],
      coreConcepts: [
        { name: "Equation vs. expression", explanation: "An expression (e.g. 3x + 2) is a phrase; it has no answer by itself. An equation (e.g. 3x + 2 = 11) is a statement that two sides are equal. The equals sign is the key difference. We solve equations; we simplify or evaluate expressions." },
        { name: "Inverse operations", explanation: "To solve an equation we 'undo' the operations done to the unknown. Addition undoes subtraction and vice versa; multiplication undoes division and vice versa. We apply the inverse operation to both sides to keep the equation balanced. For example, x + 7 = 15 → subtract 7 from both sides → x = 8." },
        { name: "One-step and two-step equations", explanation: "A one-step equation needs one inverse operation: x + 5 = 12 → x = 7. A two-step equation needs two steps — work in reverse order of BODMAS: first undo addition/subtraction, then undo multiplication/division. For 2x + 3 = 11: subtract 3 from both sides → 2x = 8; then divide by 2 → x = 4." },
        { name: "Checking the solution", explanation: "Always check: substitute your answer back into the original equation. If both sides are equal, the solution is correct. For x = 4 in 2x + 3 = 11: 2(4) + 3 = 8 + 3 = 11 ✓. This habit catches arithmetic errors and builds confidence." },
      ],
      example:
        yearNum === 7
          ? "One-step equation: x + 5 = 12. Subtract 5 → x = 7. Check: 7 + 5 = 12 ✓."
          : yearNum === 8
            ? "Two-step equation: 2x + 3 = 11. Subtract 3 → 2x = 8. Divide by 2 → x = 4. Check ✓."
            : yearNum === 9
              ? "With decimals: 0.5x + 1 = 3. Subtract 1 → 0.5x = 2. Divide by 0.5 → x = 4. Check ✓."
              : yearNum === 10
                ? "Linear equation: 3x + 2 = 2x + 9. Subtract 2x → x + 2 = 9. Subtract 2 → x = 7. Check ✓."
                : "Full working: (x/2) + 3 = 7. Subtract 3 → x/2 = 4. Multiply by 2 → x = 8. Check ✓.",
      lessonSummary: "You now know what an equation is and how it differs from an expression; how to use inverse operations to isolate the unknown; how to solve one-step and two-step equations; and how to check by substituting back in. Practise with the Practice and Assessment tabs.",
    };
  }
  if (t.includes("sequence") && !t.includes("expression") && !t.includes("equation") && !t.includes("formulae")) {
    return {
      intro: "A sequence is an ordered list of numbers or shapes that follow a rule. Understanding sequences means being able to describe and continue patterns, find any term using an nth-term formula, and use sequences in real-life problems such as predicting costs or distances.",
      learningObjectives: [
        "Recognise and continue arithmetic sequences (add or subtract the same amount each time).",
        "Describe the term-to-term rule (common difference).",
        "Find and use an nth-term formula to generate any term in a sequence.",
        "Verify whether a given number is a term in a sequence.",
      ],
      coreConcepts: [
        { name: "Arithmetic sequence", explanation: "In an arithmetic sequence, the same amount is added (or subtracted) each time. This amount is called the common difference (d). For example, 5, 8, 11, 14, … has d = 3 (add 3 each time). If d is negative, the sequence decreases (e.g. 20, 17, 14, 11, … has d = −3)." },
        { name: "Term-to-term rule", explanation: "The term-to-term rule tells us what to do to one term to get the next. 'Add 3' is the term-to-term rule for 5, 8, 11, 14, … This is useful for continuing a sequence but requires all previous terms to find a later one." },
        { name: "nth-term formula", explanation: "The nth-term formula gives us the value of any term directly, using its position number n. For an arithmetic sequence: nth term = a + (n − 1)d, where a is the first term and d is the common difference. For 5, 8, 11, 14, …: nth term = 5 + (n − 1) × 3 = 3n + 2. Check: n=1 gives 5 ✓, n=2 gives 8 ✓." },
        { name: "Is a number in the sequence?", explanation: "To check, set the nth-term formula equal to the number and solve for n. If n is a positive whole number, it is in the sequence. Example: is 50 in 3n + 2? Set 3n + 2 = 50 → 3n = 48 → n = 16. Yes — it is the 16th term. Is 45 a term? 3n + 2 = 45 → n = 14.3. No, n is not a whole number, so 45 is not a term." },
      ],
      example:
        yearNum === 7
          ? "2, 5, 8, 11, …: common difference d = 3. 5th term = 2 + 4×3 = 14."
          : yearNum === 8
            ? "6, 10, 14, 18, …: d = 4. 4th term = 6 + 3×4 = 18."
            : yearNum === 9
              ? "Use nth-term to find a later term, then check your substitution into the rule."
              : yearNum === 10
                ? "Sequence working: if the first term is −2 and d = 5, find the 8th term from nth-term = −2 + (n − 1)d."
                : "Membership check: solve the nth-term equation and ensure n is a whole number.",
      lessonSummary: "You now know what an arithmetic sequence is and what the common difference means; how to describe the term-to-term rule; how to find and apply an nth-term formula; and how to check whether a number is in a sequence. Use this in pattern problems, predictions and formal assessments.",
    };
  }
  if (t.includes("formulae") || t.includes("formula")) {
    return {
      intro: "A formula is a rule written using letters (variables) that describes the relationship between quantities. Formulae save time by giving us a reliable method to calculate an unknown whenever we know the other values. They are used throughout maths, science, engineering and everyday life.",
      learningObjectives: [
        "Understand that a formula expresses a rule using letters.",
        "Substitute values into a formula to calculate an unknown quantity.",
        "Rearrange a simple formula to change the subject.",
        "Recognise and use common formulae (area, perimeter, speed, etc.).",
      ],
      coreConcepts: [
        { name: "What a formula is", explanation: "A formula is an equation that shows a rule connecting two or more quantities, all written using letters. For example, the area of a rectangle: A = l × w. Here A, l and w are variables. Once we know any two values we can find the third. A formula is always true for all allowed values — not just one specific case." },
        { name: "Substituting into a formula", explanation: "To use a formula, replace each letter with its known value and then calculate. For example, with A = l × w, if l = 6 cm and w = 4 cm, then A = 6 × 4 = 24 cm². Follow BODMAS when calculating. Always include units in your answer." },
        { name: "Rearranging a formula (changing the subject)", explanation: "The 'subject' of a formula is the letter on its own on one side. We can rearrange to make a different letter the subject using inverse operations, just as in solving equations. For speed = distance ÷ time (s = d ÷ t), rearranging to find distance: d = s × t." },
        { name: "Common formulae to know", explanation: "Important formulae include: Area of rectangle = length × width (A = lw); Perimeter of rectangle = 2(l + w); Area of triangle = ½ × base × height; Speed = distance ÷ time (s = d/t); Circumference of circle = 2πr; Area of circle = πr². Knowing these lets you tackle a wide range of problems in maths and science." },
      ],
      example:
        yearNum === 7
          ? "Area formula: A = lw. If l = 6 cm and w = 4 cm, then A = 24 cm²."
          : yearNum === 8
            ? "Speed formula: s = d/t. If d = 30 km and t = 2 h, then s = 15 km/h."
            : yearNum === 9
              ? "Rearrange a formula: A = ½bh. If A = 30 cm² and b = 10 cm, then h = 6 cm."
              : yearNum === 10
                ? "Substitution: show working, then quote the final answer with units."
                : "Technique: rearrange to make the subject, substitute carefully, and state a reasonable final answer.",
      lessonSummary: "You now know what a formula is and how it expresses a rule using letters; how to substitute values to calculate unknowns; how to rearrange a simple formula to change its subject; and several important common formulae. These skills are essential across maths, science and formal assessments.",
    };
  }
  if (t.includes("algebra")) {
    return {
      intro: "Algebra uses letters to stand for unknown numbers. We work with expressions (no equals sign), equations (with equals), sequences (ordered lists that follow a rule), and formulae (rules written using letters). This lesson introduces these ideas and how they link together.",
      coreConcepts: [
        { name: "Unknown and expression", explanation: "A letter (e.g. n or x) represents a number we don't know yet. An expression is a phrase in symbols, e.g. 2n + 3. It has no equals sign. We can simplify expressions or substitute a value for the letter to get a number." },
        { name: "Equation", explanation: "An equation has an equals sign and says two things are equal (e.g. 2n + 3 = 11). We solve it by doing the same thing to both sides (add, subtract, multiply, divide) until the letter is on its own. Always check by substituting your answer back in." },
        { name: "Sequences", explanation: "A number sequence is an ordered list that follows a rule (e.g. 2, 5, 8, 11, … add 3 each time). We can describe the rule in words or using the position number: the nth term might be 3n − 1. Finding the rule helps you predict the next term or any term." },
        { name: "Formulae", explanation: "A formula is a rule written using letters. For example, area of a rectangle A = l × w (length × width). We substitute known values into the formula to find the unknown. Formulae are used in science, geometry and real life (e.g. speed = distance ÷ time)." },
      ],
      example: "Sequence 2, 5, 8, 11, …: the rule is 'add 3'. The nth term could be 3n − 1 (check: n=1 gives 2, n=2 gives 5). Equation: if 2n + 3 = 11, then n = 4. Formula: if A = l × w and l = 5, w = 3, then A = 15.",
      lessonSummary: "You now know that letters represent unknowns; the difference between expressions and equations; how to solve simple equations and check your answer; what sequences are and how to describe the rule; and how formulae use letters to state rules. Use this in maths, science and everyday problems.",
    };
  }
  // Geometry — individual lessons (most specific first)
  if (t.includes("shape") && !t.includes("angle") && !t.includes("area") && !t.includes("perimeter") && !t.includes("volume") && !t.includes("unit")) {
    return {
      intro: "Shapes are the building blocks of geometry. Every flat (2D) shape and solid (3D) shape has properties we can describe: the number of sides, angles, parallel or perpendicular sides, and lines of symmetry. Knowing these properties helps us classify shapes, spot them in real life, and use their rules in calculations.",
      learningObjectives: [
        "Name and describe common 2D shapes (triangles, quadrilaterals, circles, polygons).",
        "Identify properties: number of sides, angles, equal sides, parallel sides, symmetry.",
        "Name and describe common 3D shapes (cube, cuboid, sphere, cylinder, cone, prism, pyramid).",
        "Classify shapes using their properties (e.g. regular vs irregular, types of triangle).",
      ],
      coreConcepts: [
        { name: "2D shapes", explanation: "2D (flat) shapes include triangles (3 sides), quadrilaterals (4 sides: squares, rectangles, parallelograms, rhombuses, trapezoids), pentagons (5 sides), hexagons (6 sides) and circles. A regular polygon has all sides equal and all angles equal (e.g. a regular hexagon). An irregular polygon has sides or angles of different sizes." },
        { name: "Properties of 2D shapes", explanation: "We describe shapes by: number of sides and vertices (corners); whether sides are equal in length; whether sides are parallel (never meet) or perpendicular (meet at 90°); number of lines of symmetry (a line you can fold along so both halves match); and the sizes of interior angles." },
        { name: "Types of triangle", explanation: "Triangles are classified by sides: equilateral (all 3 sides equal, all angles 60°), isosceles (2 sides equal, 2 base angles equal), scalene (no sides equal). By angles: acute (all angles < 90°), right-angled (one angle = 90°), obtuse (one angle > 90°). The three angles of any triangle always add to 180°." },
        { name: "3D shapes", explanation: "3D (solid) shapes have faces (flat surfaces), edges (where two faces meet), and vertices (corners). A cube has 6 square faces, 12 edges, 8 vertices. A cylinder has 2 circular faces and 1 curved surface. A prism has two identical parallel faces (the cross-section) and rectangular faces joining them. A pyramid has a polygon base and triangular faces meeting at a point." },
      ],
      example: "A rectangle: 4 sides, opposite sides equal and parallel, 4 right angles (90°), 2 lines of symmetry. A square is a special rectangle where all 4 sides are equal and it has 4 lines of symmetry. A cuboid is the 3D version: 6 rectangular faces, 12 edges, 8 vertices.",
      lessonSummary: "You now know how to name, describe and classify 2D and 3D shapes by their properties (sides, angles, parallel/perpendicular lines, symmetry, faces, edges, vertices). Use this to identify shapes in diagrams and real life, and as the foundation for area, perimeter and volume calculations.",
    };
  }
  if (t.includes("angle") && !t.includes("shape") && !t.includes("area") && !t.includes("perimeter") && !t.includes("volume") && !t.includes("unit")) {
    return {
      intro: "An angle is the amount of turn between two lines that meet at a point. We measure angles in degrees (°). Understanding angles is essential for describing shapes, reading maps, designing structures and solving many real-life problems.",
      learningObjectives: [
        "Understand what an angle is and how degrees measure the amount of turn.",
        "Identify and name types of angle: acute, right, obtuse, straight, reflex.",
        "Use angle rules: angles on a line (180°), angles at a point (360°), vertically opposite angles.",
        "Calculate missing angles in triangles and quadrilaterals.",
      ],
      coreConcepts: [
        { name: "Types of angle", explanation: "Angles are classified by size: acute (greater than 0° and less than 90°); right angle (exactly 90°, shown by a small square); obtuse (greater than 90° and less than 180°); straight angle (exactly 180°, a straight line); reflex (greater than 180° and less than 360°); full turn (360°). Being able to estimate and name the type first helps you check your calculations." },
        { name: "Angle rules", explanation: "Angles on a straight line add to 180°. Angles around a point add to 360°. Vertically opposite angles (formed when two lines cross) are equal. These rules let you find missing angles without measuring — just subtract from the known total. For example, if one angle on a line is 65°, the other is 180° − 65° = 115°." },
        { name: "Angles in triangles", explanation: "The three interior angles of any triangle add to 180°. So if two angles are known, subtract their sum from 180° to find the third. For example, if a triangle has angles 50° and 70°, the third is 180° − 50° − 70° = 60°. This works for every triangle, no matter its shape or size." },
        { name: "Angles in quadrilaterals", explanation: "The four interior angles of any quadrilateral (4-sided shape) add to 360°. For a rectangle all four are 90° (4 × 90° = 360°). For irregular quadrilaterals, add the three known angles and subtract from 360° to find the unknown. Parallel lines also create equal alternate angles and co-interior angles that add to 180°." },
      ],
      example: "Two angles are on a straight line. One is 120°. The other = 180° − 120° = 60°. In a triangle, two angles are 45° and 85°. Third angle = 180° − 45° − 85° = 50°. In a quadrilateral, three angles are 90°, 110° and 75°. Fourth = 360° − 90° − 110° − 75° = 85°.",
      lessonSummary: "You now know what an angle is; how to name types of angle; the rules for angles on a line, at a point, and in triangles and quadrilaterals; and how to calculate missing angles. These skills are used throughout geometry and in later courses.",
    };
  }
  if (t.includes("area") && !t.includes("perimeter") && !t.includes("volume")) {
    return {
      intro: "Area is the amount of flat space inside a 2D shape. We measure area in square units such as cm², m² or km². Knowing how to calculate area is vital for real life: flooring, painting walls, land measurement and design all depend on it.",
      learningObjectives: [
        "Understand that area measures the space inside a shape, in square units.",
        "Calculate the area of rectangles and squares using length × width.",
        "Calculate the area of triangles using ½ × base × height.",
        "Calculate the area of parallelograms and trapezoids.",
      ],
      coreConcepts: [
        { name: "Area of a rectangle", explanation: "Area = length × width (A = lw). A rectangle 8 cm long and 5 cm wide has area 8 × 5 = 40 cm². A square is a special rectangle: A = side². For example, a 6 cm square has area 36 cm². Always include the unit squared (cm², m²) in your answer." },
        { name: "Area of a triangle", explanation: "Area = ½ × base × height (A = ½bh). The height must be the perpendicular height — straight up from the base to the opposite vertex, not along a slanted side. For a triangle with base 10 cm and perpendicular height 6 cm: A = ½ × 10 × 6 = 30 cm²." },
        { name: "Area of a parallelogram", explanation: "A parallelogram has two pairs of parallel sides. Area = base × perpendicular height (A = bh). Note: the height is perpendicular to the base, not the slant side length. For example, base 9 cm, height 4 cm: A = 9 × 4 = 36 cm². A rectangle is a special parallelogram." },
        { name: "Area of a trapezoid", explanation: "A trapezoid has one pair of parallel sides (called a and b). Area = ½ × (a + b) × h, where h is the perpendicular height between the parallel sides. For example, parallel sides 6 cm and 10 cm, height 5 cm: A = ½ × (6 + 10) × 5 = ½ × 16 × 5 = 40 cm²." },
      ],
      example: "A room is L-shaped. Split it into two rectangles: one is 5 m × 3 m (area = 15 m²) and the other is 4 m × 2 m (area = 8 m²). Total area = 15 + 8 = 23 m². This is how we calculate how much flooring to buy.",
      lessonSummary: "You now know that area is the space inside a shape measured in square units; the formulas for rectangles (lw), triangles (½bh), parallelograms (bh) and trapezoids (½(a+b)h); and how to split compound shapes. Use these in real-life measurement problems.",
    };
  }
  if (t.includes("perimeter") && !t.includes("area") && !t.includes("volume")) {
    return {
      intro: "Perimeter is the total distance around the outside of a 2D shape. We measure it in length units such as cm, m or km. Perimeter is used whenever we need to know how far it is around something — fencing a garden, framing a picture, or running around a track.",
      learningObjectives: [
        "Understand that perimeter is the total length around the outside of a shape.",
        "Calculate the perimeter of rectangles using 2(l + w).",
        "Find the perimeter of any polygon by adding all its sides.",
        "Solve problems where some side lengths must be worked out first.",
      ],
      coreConcepts: [
        { name: "Perimeter of a rectangle", explanation: "A rectangle has two pairs of equal sides (length l and width w). Perimeter = l + w + l + w = 2l + 2w = 2(l + w). For example, a rectangle 7 cm long and 4 cm wide: P = 2(7 + 4) = 2 × 11 = 22 cm. A square with side s has P = 4s." },
        { name: "Perimeter of any polygon", explanation: "For any polygon, add all the side lengths together. For a triangle with sides 5 cm, 8 cm and 6 cm: P = 5 + 8 + 6 = 19 cm. For an irregular hexagon, measure or read off all six sides and add them. There is no 'formula shortcut' for irregular shapes — just add every side carefully." },
        { name: "Missing side lengths", explanation: "Sometimes a side length is not given directly. Look for clues: opposite sides of a rectangle are equal; the total width of a compound shape equals the sum of its parts. For example, a compound shape has a total width of 10 cm; one part is 4 cm, so the unknown part = 10 − 4 = 6 cm. Find all sides before adding." },
        { name: "Circumference of a circle", explanation: "The perimeter of a circle is called the circumference. C = 2πr = πd, where r is the radius and d is the diameter. Using π ≈ 3.14 or the π button on a calculator. For a circle with radius 5 cm: C = 2 × π × 5 ≈ 31.4 cm." },
      ],
      example: "A rectangular garden is 12 m long and 8 m wide. Perimeter = 2(12 + 8) = 2 × 20 = 40 m. If fencing costs £3 per metre, total cost = 40 × £3 = £120. This is exactly how fencing is planned in real life.",
      lessonSummary: "You now know that perimeter is the total distance around a shape; formulas for rectangles (2(l+w)) and squares (4s); how to add all sides of any polygon; how to find missing side lengths; and the circumference of a circle (2πr). Use this whenever you need to measure around the outside of a shape.",
    };
  }
  if (t.includes("volume") && !t.includes("area") && !t.includes("perimeter")) {
    return {
      intro: "Volume is the amount of 3D space inside a solid shape. We measure it in cubic units such as cm³, m³ or litres (1 litre = 1000 cm³). Volume is used in real life for filling containers, calculating capacity, and in science for density and pressure.",
      learningObjectives: [
        "Understand that volume measures the 3D space inside a solid.",
        "Calculate the volume of cubes and cuboids using length × width × height.",
        "Calculate the volume of prisms using cross-section area × length.",
        "Convert between cm³ and litres/ml.",
      ],
      coreConcepts: [
        { name: "Volume of a cuboid", explanation: "Volume = length × width × height (V = lwh). A cuboid 5 cm long, 3 cm wide and 4 cm tall: V = 5 × 3 × 4 = 60 cm³. A cube with side s has V = s³. For example, a 3 cm cube: V = 3 × 3 × 3 = 27 cm³. Always include the unit cubed (cm³, m³)." },
        { name: "Volume of a prism", explanation: "A prism is a 3D shape with a consistent cross-section along its length. Volume = area of cross-section × length (V = Al). So for a triangular prism with cross-section area 12 cm² and length 8 cm: V = 12 × 8 = 96 cm³. The cross-section is the shape you'd see if you cut straight across." },
        { name: "Volume of a cylinder", explanation: "A cylinder is a circular prism. Its cross-section is a circle, so the area = πr². Volume = πr² × h, where h is the height. For a cylinder with radius 4 cm and height 10 cm: V = π × 4² × 10 = π × 16 × 10 ≈ 502.7 cm³." },
        { name: "Units of volume and capacity", explanation: "1 cm³ = 1 millilitre (ml). 1000 cm³ = 1 litre. 1 m³ = 1000 litres. These conversions are used when filling containers (e.g. a 2-litre bottle = 2000 cm³) and in everyday life (e.g. medicine doses in ml, swimming pools in m³)." },
      ],
      example: "A fish tank is 60 cm long, 30 cm wide and 40 cm deep. Volume = 60 × 30 × 40 = 72,000 cm³ = 72 litres. If you fill it to ¾ full, you need ¾ × 72 = 54 litres of water.",
      lessonSummary: "You now know that volume is the 3D space inside a solid; formulas for cuboids (lwh), prisms (Al) and cylinders (πr²h); and how to convert between cm³ and litres. Use volume calculations whenever you need to know how much a container holds.",
    };
  }
  if (t.includes("unit") && !t.includes("area") && !t.includes("perimeter") && !t.includes("volume")) {
    return {
      intro: "Units of measurement let us describe length, mass, time, capacity, area and volume in a way everyone understands. Choosing the right unit and being able to convert between units are everyday skills used in cooking, science, travel and construction.",
      learningObjectives: [
        "Know common metric units for length, mass, capacity and time.",
        "Convert between related metric units (e.g. km ↔ m, kg ↔ g, litres ↔ ml).",
        "Know common imperial units and approximate metric equivalents (e.g. 1 inch ≈ 2.54 cm).",
        "Choose appropriate units for a given measurement.",
      ],
      coreConcepts: [
        { name: "Metric units of length", explanation: "The base unit is the metre (m). 1 km = 1000 m; 1 m = 100 cm; 1 cm = 10 mm. To convert from a larger unit to a smaller unit, multiply; to convert from smaller to larger, divide. For example: 3.5 km = 3.5 × 1000 = 3500 m; 250 cm = 250 ÷ 100 = 2.5 m." },
        { name: "Metric units of mass and capacity", explanation: "Mass: 1 kg = 1000 g; 1 tonne = 1000 kg. Capacity: 1 litre (l) = 1000 ml; 1 cl = 10 ml. These conversions are used in cooking (e.g. 250 ml of milk) and science (e.g. 2.5 kg of sand). Always check whether you need to multiply or divide, based on whether you are going to a smaller or larger unit." },
        { name: "Units of area and volume", explanation: "Area is measured in square units: 1 m² = 10,000 cm² (because 100 × 100 = 10,000). Volume is measured in cubic units: 1 m³ = 1,000,000 cm³ (100 × 100 × 100). Also: 1 cm³ = 1 ml, so 1 litre = 1000 cm³. These links between area, volume and capacity come up often in tests and real-life problems." },
        { name: "Imperial units and conversions", explanation: "Imperial units are still used in everyday life in the UK. Key approximate conversions: 1 inch ≈ 2.54 cm; 1 foot = 12 inches ≈ 30 cm; 1 mile ≈ 1.6 km (or 5 miles ≈ 8 km); 1 pound (lb) ≈ 454 g; 1 stone = 14 lb; 1 pint ≈ 568 ml; 1 gallon ≈ 4.5 litres. Approximate conversions are enough for most school and everyday problems." },
      ],
      example: "A recipe uses 0.75 litres of milk. In ml: 0.75 × 1000 = 750 ml. A road sign says 5 miles. In km: 5 × 1.6 = 8 km. A room is 4.5 m wide. In cm: 4.5 × 100 = 450 cm. These conversions are used every day.",
      lessonSummary: "You now know the key metric units for length, mass, capacity, area and volume; how to convert between them by multiplying or dividing; important imperial units and their metric equivalents; and how to choose the right unit. These skills run through all of maths, science and everyday life.",
    };
  }
  if (t.includes("statistics") || t.includes("data") || t.includes("chart")) {
    return {
      intro: "Statistics is about collecting, organising and interpreting data. We use tables and charts to show information clearly and find the mode, median and mean. This lesson introduces these ideas.",
      coreConcepts: [
        { name: "Data", explanation: "Data is information we collect (e.g. favourite colour, scores, heights). We organise it in tables so we can look for patterns and answer questions." },
        { name: "Charts", explanation: "Bar charts, pictograms and other graphs make it easier to see and compare data. We choose the right chart for the type of data we have." },
        { name: "Mode", explanation: "The mode is the value that appears most often. It is useful when we want to know the 'most common' or 'most popular' result." },
        { name: "Median and mean", explanation: "The median is the middle value when data is in order. The mean is the average (total ÷ number of values). Both summarise the 'typical' value in different ways." },
      ],
      example: "If 5 people have 2, 3, 3, 4, 5 sweets: mode = 3, median = 3 (middle), mean = (2+3+3+4+5)÷5 = 3.4.",
      lessonSummary: "You now know how to collect and organise data in tables; how charts help us see patterns; and how to find the mode (most common), median (middle) and mean (average) to summarise data.",
    };
  }
  if (t.includes("ratio") || t.includes("proportion")) {
    return {
      intro: "Ratio compares two or more amounts. We write it with a colon (e.g. 2 : 3). Proportion is about keeping the same ratio when we scale up or down. This lesson covers the basics.",
      coreConcepts: [
        { name: "Ratio", explanation: "A ratio says how much of one thing there is compared to another. 2 : 3 means '2 parts of the first to every 3 parts of the second'. Order matters." },
        { name: "Simplifying", explanation: "We simplify ratios by dividing both parts by the same number, like simplifying fractions. So 4 : 6 = 2 : 3 (divide both by 2)." },
        { name: "Proportion", explanation: "When we scale up or down (e.g. double a recipe), we keep the ratio the same. So if the ratio is 1 : 4, 50 ml and 200 ml is in the same proportion as 1 and 4." },
        { name: "Using ratio", explanation: "We use ratio in recipes, maps, and mixing. For example, squash might be 1 part cordial to 4 parts water—so 1 : 4." },
      ],
      example:
        yearNum === 7
          ? "Ratio 1 : 4. If 1 part is 20 g, then 4 parts makes 80 g total."
          : yearNum === 8
            ? "A mixture is 2 : 3. If the first part is 14 ml, the second part is 21 ml."
            : yearNum === 9
              ? "Proportion with a total: ratio 3 : 7, total 100 → 30 and 70."
              : yearNum === 10
                ? "Ratio 5 : 2, total 49 → parts are 35 and 14."
                : "Problem: write ratio as parts, scale by the same factor, and show the working clearly.",
      lessonSummary: "You now know what a ratio is and how to write it; how to simplify ratios; what proportion means when scaling; and how to use ratio in real situations like recipes and mixtures.",
    };
  }
  if (t.includes("trigonometry") || t.includes("right-angled") || t.includes("sin") || t.includes("cos") || t.includes("tan") || t.includes("application")) {
    return {
      intro: "Trigonometry is the study of the relationship between the angles and sides of triangles. For right-angled triangles we use three main ratios: sine (sin), cosine (cos) and tangent (tan). Each ratio compares two specific sides of the triangle. This lesson introduces what these ratios mean and when we use them.",
      coreConcepts: [
        { name: "Right-angled triangles", explanation: "A right-angled triangle has one angle of 90°. The longest side, opposite the right angle, is the hypotenuse. The side next to an angle (other than the hypotenuse) is the adjacent side; the side opposite that angle is the opposite side. We use these names to define sin, cos and tan." },
        { name: "Sine (sin)", explanation: "For an angle in a right-angled triangle, sin(angle) = opposite ÷ hypotenuse. So if we know the angle and the hypotenuse we can find the opposite side; or if we know the opposite and hypotenuse we can find the angle." },
        { name: "Cosine (cos)", explanation: "cos(angle) = adjacent ÷ hypotenuse. We use it the same way as sin: to find a missing side or angle when we have a right-angled triangle and the right two sides." },
        { name: "Tangent (tan)", explanation: "tan(angle) = opposite ÷ adjacent. When the problem involves the opposite and adjacent sides (not the hypotenuse), we use tan. SOH CAH TOA helps you remember: Sin = Opposite/Hypotenuse, Cos = Adjacent/Hypotenuse, Tan = Opposite/Adjacent." },
        { name: "Applications", explanation: "We use trigonometry to find heights (e.g. a tree), distances (e.g. across a river), and angles in building and design. Always sketch the triangle, label the sides, then choose the ratio that uses the sides you know and the one you want to find." },
      ],
      example:
        yearNum === 7
          ? "If a right triangle has hypotenuse 5 m and an angle of 30° to the ground, the opposite height is 5×sin(30°)."
          : yearNum === 8
            ? "Use cos: hypotenuse 10 m and angle 60°. Adjacent = 10×cos(60°)."
            : yearNum === 9
              ? "Ladder: makes 70° with the ground, ladder length 5 m. Height = 5×sin(70°) ≈ 4.7 m."
              : yearNum === 10
                ? "Calculate a missing length with sin/cos/tan, then round appropriately and include units."
                : "Label opposite/adjacent/hypotenuse, choose the correct ratio, substitute, and show working.",
      lessonSummary: "You now know the sides of a right-angled triangle (hypotenuse, opposite, adjacent); the definitions of sin, cos and tan and SOH CAH TOA; and how to use one of the ratios to find a missing side or angle. Use this for simple applications like heights and distances.",
    };
  }
  if (t.includes("calculus") || t.includes("rates of change") || t.includes("gradient")) {
    return {
      intro: "Calculus helps us understand how things change. Two big ideas are rates of change (how fast something changes) and gradients (how steep a graph is). These ideas lead to the calculus you will meet in advanced maths. This lesson introduces what 'rate of change' and 'gradient' mean in real and graphical contexts.",
      coreConcepts: [
        { name: "Rate of change", explanation: "A rate of change is how much one quantity changes when another changes. Speed is a rate of change: distance per unit of time (e.g. metres per second). We also see rates like cost per kilogram, or temperature change per minute. The steeper the change, the greater the rate." },
        { name: "Gradient of a line", explanation: "On a graph, the gradient (slope) of a straight line tells you the rate of change. Gradient = vertical change ÷ horizontal change (rise over run). A steeper line means a bigger gradient. If the line goes down as we go right, the gradient is negative." },
        { name: "Gradient and real meaning", explanation: "The gradient of a distance–time graph is speed. The gradient of a cost–quantity graph is the price per unit. So the gradient is not just a number—it has a meaning that depends on what is on each axis." },
        { name: "Introduction to calculus", explanation: "When the graph is a curve, the gradient changes from point to point. Calculus gives us a way to find the gradient at any point on a curve. That is the idea of 'derivative' you will meet later. For now, knowing that gradient means rate of change on a graph is the first step." },
      ],
      example:
        yearNum === 7
          ? "If a car travels 60 km in 2 hours, speed = 60 ÷ 2 = 30 km/h."
          : yearNum === 8
            ? "Distance–time idea: 45 m in 15 s → rate = 45 ÷ 15 = 3 m/s."
            : yearNum === 9
              ? "Gradient meaning: on a distance–time graph, gradient equals speed (rate of change)."
              : yearNum === 10
                ? "Interpretation: read gradient from the graph and state units (e.g. metres per second)."
                : "Extended answer: explain what a positive/negative gradient means, then link it to the real-world context.",
      lessonSummary: "You now know what a rate of change is and examples like speed; what the gradient of a line means on a graph; how to link gradient to real-world meaning (e.g. speed, price); and that calculus extends this to curves. Use this to read and interpret graphs and simple rates.",
    };
  }
  // Physics
  if (t.includes("balanced force")) {
    return {
      intro: yearLeadIn + "Balanced forces happen when forces are equal in size and opposite in direction. The key result is that the object does not change its motion.",
      learningObjectives: [
        "Define balanced forces as equal and opposite forces.",
        "Describe what happens to an object's speed and direction.",
        "Give an everyday example of balanced forces.",
      ],
      coreConcepts: [
        {
          name: "What “balanced” means",
          explanation:
            "When two (or more) forces on an object are equal in size and opposite in direction, the forces balance. The overall (resultant) force is zero.",
        },
        {
          name: "No change in motion",
          explanation:
            "If forces are balanced, the object does not change speed or direction. It stays at rest or moves at constant speed in a straight line.",
        },
        {
          name: "Example: a book on a table",
          explanation:
            "Gravity pulls the book down. The table pushes up with an equal force. These forces balance, so the book stays still.",
        },
        {
          name: "Example: constant speed",
          explanation:
            "If you push a box and friction opposes that push with an equal force, the box moves at a constant speed. The push and friction are balanced.",
        },
      ],
      example: "A person holding a bag of groceries still: the pull of gravity down is balanced by the pull/support force upwards from your hands.",
      lessonSummary:
        yearLeadIn +
        "You now know balanced forces mean equal/opposite forces and a resultant force of zero. That leads to no change in speed or direction—objects can be at rest or move with constant speed.",
    };
  }
  if (t.includes("friction")) {
    return {
      intro: yearLeadIn + "Friction is a force that acts between surfaces when they rub or slide past each other. It usually slows motion down.",
      learningObjectives: [
        "Define friction as a force between surfaces.",
        "Explain how friction acts against motion.",
        "Describe how surface roughness affects friction.",
      ],
      coreConcepts: [
        {
          name: "Where friction comes from",
          explanation:
            "Friction acts whenever two surfaces touch and move (or try to move) relative to each other. It is not present only in air; it happens in many real materials.",
        },
        {
          name: "Friction’s effect",
          explanation:
            "Friction acts against the direction of motion, so it slows objects down. That can also reduce how far something travels.",
        },
        {
          name: "Roughness matters",
          explanation:
            "Rough surfaces generally have more friction than smooth ones. Smoother surfaces tend to make it easier to slide objects.",
        },
        {
          name: "Friction and warmth",
          explanation:
            "Friction can transfer energy as heat. That's why rubbing your hands together makes them warmer.",
        },
      ],
      example:
        "A box on carpet: the carpet’s surface is rougher, so friction is larger and the box slows down more quickly than on a smooth floor.",
      lessonSummary:
        yearLeadIn +
        "You now know what friction is, that it opposes motion, that rougher surfaces usually create more friction, and that friction can produce heat. Use this to explain slowing down in everyday situations.",
    };
  }
  if (t.includes("gravity")) {
    return {
      intro: yearLeadIn + "Gravity is a pull towards the centre of the Earth. It makes unsupported objects fall and it gives objects their weight.",
      learningObjectives: [
        "Explain gravity as a pull towards Earth.",
        "Define weight as the force of gravity on an object.",
        "Describe what happens to unsupported objects.",
      ],
      coreConcepts: [
        {
          name: "Gravity",
          explanation:
            "Gravity is the force of attraction that pulls objects towards the centre of the Earth (or towards any mass, generally). On Earth, it is what keeps you on the ground.",
        },
        {
          name: "Weight",
          explanation:
            "Weight is the force of gravity on an object. If gravity is weaker, the weight is smaller.",
        },
        {
          name: "Falling",
          explanation:
            "When an object is unsupported, gravity is unopposed and causes it to fall.",
        },
        {
          name: "Earth vs Moon",
          explanation:
            "Gravity on the Moon is weaker, so objects weigh less there and fall more slowly compared with Earth.",
        },
      ],
      example: "If you drop a ball, gravity pulls it down. The ball speeds up because gravity keeps applying a force.",
      lessonSummary:
        yearLeadIn +
        "You now know gravity pulls towards Earth, that weight is the force of gravity, and that unsupported objects fall because gravity acts when there’s no support force.",
    };
  }
  if (t.includes("push") || t.includes("pull")) {
    return {
      intro: yearLeadIn + "A force can be a push or a pull. Forces can change how something moves: they can start it, stop it, or change its speed or direction.",
      learningObjectives: [
        "Define a force as a push or a pull.",
        "Identify examples of pushes and pulls.",
        "Explain that bigger forces have bigger effects.",
      ],
      coreConcepts: [
        {
          name: "Push and pull",
          explanation:
            "A force is a push or a pull. Kicking a ball is a push; opening a door by pulling it is a pull.",
        },
        {
          name: "How forces change motion",
          explanation:
            "Forces can make objects start moving, stop moving, speed up, slow down, or change direction.",
        },
        {
          name: "Size of a force",
          explanation:
            "We measure the size of a force in newtons (N). A larger force usually causes a larger change in motion.",
        },
        {
          name: "Examples",
          explanation:
            "Forces happen in everyday life: pushing a swing, pulling a suitcase, or stretching a rubber band.",
        },
      ],
      example: "If you push a toy car harder across the floor, it moves faster and covers more distance in the same time.",
      lessonSummary:
        yearLeadIn +
        "You now know a force is a push or a pull, and forces can change speed or direction. You can also describe forces as being larger or smaller using newtons (N).",
    };
  }
  if (t.includes("shadow") || t.includes("reflection") || t.includes("refraction") || (t.includes("light") && !t.includes("highlight"))) {
    return {
      intro: yearLeadIn + "Light is a form of energy we can see. It travels in straight lines. We see things when light from a source bounces off them into our eyes. This lesson covers how we see, shadows, reflection and refraction.",
      coreConcepts: [
        { name: "Light travels in straight lines", explanation: "Light travels in straight lines from a source. We draw light as straight lines (rays). Nothing can go round corners unless it bounces or bends." },
        { name: "Shadows", explanation: "A shadow forms where light is blocked by an opaque object. The shape of the shadow depends on the shape of the object and where the light is. No light reaches the shadow area." },
        { name: "Reflection", explanation: "When light hits a smooth, shiny surface (like a mirror), it bounces off at the same angle. We see ourselves in a mirror because light from us reflects off the mirror into our eyes." },
        { name: "Refraction", explanation: "When light passes from one material into another (e.g. air into water), it can bend. This is refraction. A straw in a glass of water looks bent because of refraction." },
      ],
      example: "On a sunny day, your body blocks sunlight and casts a shadow on the ground. The shadow moves as the Sun appears to move. In a mirror, light from your face reflects off the glass into your eyes so you see your reflection.",
      lessonSummary:
        yearLeadIn +
        "You now know that light travels in straight lines; how shadows form when light is blocked; how reflection bounces light off surfaces; and how refraction bends light at boundaries. Use this to explain everyday seeing, shadows and mirrors.",
    };
  }
  if (t.includes("vibration") || t.includes("pitch") || t.includes("volume") || (t.includes("sound") && !t.includes("resound"))) {
    return {
      intro: yearLeadIn + "Sound is made by vibrations (something moving back and forth quickly). Sound travels through air, water and solids as a wave. We hear when the sound wave reaches our ears. This lesson covers how sound is made and how it travels.",
      coreConcepts: [
        { name: "Vibrations", explanation: "Sound is produced when something vibrates. For example, a drum skin vibrates when you hit it; a string vibrates when you pluck it. The vibrations push the air and make a sound wave." },
        { name: "Pitch", explanation: "Pitch is how high or low a sound is. Faster vibrations (higher frequency) make a higher pitch; slower vibrations make a lower pitch. A thin, short string has a higher pitch than a thick, long one." },
        { name: "Volume", explanation: "Volume (loudness) depends on how big the vibrations are. Hitting a drum harder makes a louder sound because the vibrations are bigger. We measure loudness in decibels (dB)." },
        { name: "Sound travels", explanation: "Sound needs a material to travel through (air, water, wood, etc.). It cannot travel through empty space. Sound travels faster in solids than in liquids, and faster in liquids than in gases." },
      ],
      example: "When you pluck a guitar string, it vibrates. The vibration travels through the air to your ear. If you make the string tighter or shorter, it vibrates faster and the pitch is higher. Plucking harder makes it louder.",
      lessonSummary:
        yearLeadIn +
        "You now know that sound is made by vibrations; that pitch depends on how fast the vibration is; that volume depends on the size of the vibration; and that sound needs a material to travel through. Use this to explain musical instruments and everyday sounds.",
    };
  }
  if (t.includes("component")) {
    return {
      intro: yearLeadIn + "Components are the parts you use to build a circuit. In this lesson you will focus on which components you need and what they do.",
      coreConcepts: [
        {
          name: "Power source",
          explanation:
            "A cell or battery provides the electrical energy to run the circuit.",
        },
        {
          name: "Wires (connections)",
          explanation:
            "Wires complete the path so electricity can flow between the power source and the component you want to run.",
        },
        {
          name: "Devices (bulbs/buzzers/motors)",
          explanation:
            "A bulb, buzzer or motor is a component that uses the electrical energy (for example, a bulb produces light).",
        },
        {
          name: "Switches",
          explanation:
            "A switch controls whether the circuit is complete: when the switch is open, the circuit is broken and the current stops.",
        },
      ],
      example: "A simple circuit can use one cell, two wires, one bulb, and a switch. If the switch is opened, the bulb goes off because the circuit is broken.",
      lessonSummary:
        yearLeadIn +
        "You now know common circuit components: power sources, connecting wires, devices that use electricity, and switches that open/close the circuit.",
    };
  }
  if (t.includes("insulator")) {
    return {
      intro: yearLeadIn + "Insulators are materials that do not let electricity flow easily. In this lesson you will focus on insulation and safety in circuits.",
      coreConcepts: [
        {
          name: "What an insulator does",
          explanation:
            "Insulators prevent current from flowing through them. That means electricity is blocked.",
        },
        {
          name: "Examples of insulators",
          explanation:
            "Plastic, rubber and dry wood are typical insulators. That is why wire insulation is often made of plastic or rubber.",
        },
        {
          name: "Why insulators are used",
          explanation:
            "Insulation helps protect you from electric shocks and keeps the circuit working safely.",
        },
        {
          name: "Insulators vs conductors",
          explanation:
            "Conductors allow current to flow; insulators block it. Wires are designed to use conductors so current can travel where you want it.",
        },
      ],
      example: "A plastic cover on a cable stops electricity flowing to your hand.",
      lessonSummary:
        yearLeadIn +
        "You now know what insulators do, examples of insulators, and why insulation is used to prevent unwanted current flow and shocks.",
    };
  }
  if (t.includes("conductor")) {
    return {
      intro: yearLeadIn + "Conductors are materials that allow electricity to flow. In this lesson you will focus on how conductors help circuits work.",
      coreConcepts: [
        {
          name: "What a conductor does",
          explanation:
            "A conductor allows electrical charge to move through it, so current can flow.",
        },
        {
          name: "Metals are usually good conductors",
          explanation:
            "Many metals (for example copper and iron) are good conductors. That is why metal is used for electrical wires.",
        },
        {
          name: "Conductors complete the circuit",
          explanation:
            "A complete circuit needs a path of conductors so electricity can travel from the power source to the device and back.",
        },
        {
          name: "Using the right material",
          explanation:
            "Choosing conductors for connections helps bulbs, buzzers and motors work as intended.",
        },
      ],
      example: "Copper wires let current flow so a bulb can light.",
      lessonSummary:
        yearLeadIn +
        "You now know conductors allow current to flow, that metals are good conductors, and that conductors help complete the circuit.",
    };
  }
  if (t.includes("circuit")) {
    return {
      intro: yearLeadIn + "An electric circuit is a closed loop that allows electricity to flow. In this lesson you will focus on circuits themselves and why they must be complete.",
      coreConcepts: [
        {
          name: "Complete circuit",
          explanation:
            "A complete circuit is a closed path. Electricity can flow around the loop from the power source, through a component, and back again.",
        },
        {
          name: "What happens if the loop opens",
          explanation:
            "If the circuit is broken (for example, by opening a switch), the path is no longer complete, so the current stops.",
        },
        {
          name: "Basic parts of a circuit",
          explanation:
            "A circuit needs a power source, connecting wires, and a component that uses the electrical energy (like a bulb).",
        },
        {
          name: "Closed vs open",
          explanation:
            "Closed circuits allow current; open circuits stop current. This is the key idea behind using switches.",
        },
      ],
      example: "With one cell, wires and a bulb, the bulb lights when the circuit is closed. Add a switch: open the switch and the bulb goes out.",
      lessonSummary:
        yearLeadIn +
        "You now know what a complete circuit is, why electricity needs a closed loop, and what happens when a circuit is broken.",
    };
  }
  if (t.includes("types of energy")) {
    return {
      intro: "Energy can be stored in different forms. In this lesson you will focus on the main types of energy you need for science at this level.",
      coreConcepts: [
        {
          name: "Energy stores",
          explanation:
            "Energy can be stored in objects and then transferred to make things happen. Common stores include motion (kinetic), height (gravitational potential), and chemical energy in fuels and food.",
        },
        {
          name: "Electrical and thermal",
          explanation:
            "Electrical energy is linked to electricity in circuits, and thermal (heat) energy is linked to temperature.",
        },
        {
          name: "Light and sound",
          explanation:
            "Light energy and sound energy can be produced and transferred. They are often recognised by the effects they have.",
        },
        {
          name: "Naming energy by what it is",
          explanation:
            "We usually name the type of energy by how it is stored or how it is transferred (for example, chemical energy to electrical energy).",
        },
      ],
      example: "A torch battery stores chemical energy. When the torch is on, it provides electrical energy which becomes light and heat.",
      lessonSummary:
        "You now know key types of energy (kinetic, gravitational potential, chemical, electrical, thermal, light and sound) and the idea of energy stores.",
    };
  }
  if (t.includes("energy transfer")) {
    return {
      intro: yearLeadIn + "Energy transfers from one object/place/store to another. In this lesson you will focus on energy transfer using everyday examples.",
      coreConcepts: [
        {
          name: "What energy transfer means",
          explanation:
            "Energy transfer is the movement of energy from one place or store to another.",
        },
        {
          name: "Changing energy type",
          explanation:
            "Energy can change from one type to another during transfer. For example, a falling ball changes energy from gravitational potential to kinetic.",
        },
        {
          name: "Examples from devices",
          explanation:
            "When you switch on a lamp, electrical energy is transferred to light and heat.",
        },
        {
          name: "Describing transfers",
          explanation:
            "A good answer says: what is the starting store, what it transfers to, and what type of energy you get at the end.",
        },
      ],
      example: "A ball falls: gravitational potential energy transfers to kinetic energy, so the ball speeds up as it gets closer to the ground.",
      lessonSummary:
        yearLeadIn +
        "You now know how to describe energy transfer, including that energy can change type during transfer and how to use everyday examples in explanations.",
    };
  }
  if (t.includes("conservation") || (t.includes("energy") && topicTitle.toLowerCase() === "energy")) {
    return {
      intro: yearLeadIn + "Conservation of energy is the rule that total energy in a system stays the same. In this lesson you will focus on what that means in real situations.",
      coreConcepts: [
        {
          name: "Cannot be created or destroyed",
          explanation:
            "Energy can’t be created from nothing or destroyed. It can only be changed from one form to another and transferred.",
        },
        {
          name: "Total energy stays the same",
          explanation:
            "The total amount of energy remains constant, even when the forms change.",
        },
        {
          name: "Useful vs unwanted (wasted) energy",
          explanation:
            "In devices we often want one useful type of energy, but some energy is always transferred to the surroundings in unwanted ways (often heat).",
        },
        {
          name: "Explaining “waste”",
          explanation:
            "“Wasted” energy still exists; it just goes into the surroundings where we can’t use it for the same purpose.",
        },
      ],
      example: "In a torch, chemical energy becomes electrical energy, then to light (useful) and heat (unwanted). The total energy is conserved.",
      lessonSummary:
        yearLeadIn +
        "You now know that energy is conserved (not created or destroyed), total energy stays constant, and that real devices transfer some energy to surroundings as heat.",
    };
  }
  if (t.includes("graph")) {
    return {
      intro: yearLeadIn + "Distance-time graphs help you interpret motion. In this lesson you will focus on how to read and use a distance-time graph.",
      coreConcepts: [
        {
          name: "Axes",
          explanation:
            "On a distance-time graph, time is on the horizontal (x) axis, and distance is on the vertical (y) axis.",
        },
        {
          name: "Gradient = speed",
          explanation:
            "The gradient (steepness) tells you the speed. A steeper line means a higher speed.",
        },
        {
          name: "Horizontal line",
          explanation:
            "A flat (horizontal) line means the distance is not changing, so the object is not moving.",
        },
        {
          name: "Constant speed",
          explanation:
            "If speed is constant, the graph is a straight line.",
        },
      ],
      example:
        "If a cyclist’s distance-time graph becomes steeper, the cyclist is travelling faster; if it becomes flat, the cyclist has stopped.",
      lessonSummary:
        yearLeadIn +
        "You now know how to read a distance-time graph using axes and gradient: gradient is speed, steeper is faster, and flat means not moving.",
    };
  }
  if (t.includes("speed")) {
    return {
      intro: yearLeadIn + "Speed describes how fast an object is moving. In this lesson you will focus on speed and how to calculate it.",
      coreConcepts: [
        {
          name: "What speed means",
          explanation:
            "Speed tells you how far something travels in a given time.",
        },
        {
          name: "Units",
          explanation:
            "Speed is often measured in metres per second (m/s) or kilometres per hour (km/h).",
        },
        {
          name: "Speed formula",
          explanation:
            "Speed = distance ÷ time. If distance is in metres and time is in seconds, you get m/s.",
        },
        {
          name: "More speed = quicker travel",
          explanation:
            "A higher speed means you cover more distance in the same time (or cover the same distance in less time).",
        },
      ],
      example: "A car travels 100 m in 5 s. Speed = 100 ÷ 5 = 20 m/s.",
      lessonSummary:
        yearLeadIn +
        "You now know what speed means, the common units, and how to calculate speed using speed = distance ÷ time.",
    };
  }
  if (t.includes("distance")) {
    return {
      intro: yearLeadIn + "Distance tells you how far something has moved. In this lesson you will focus on distance and measurement units.",
      coreConcepts: [
        {
          name: "What distance is",
          explanation:
            "Distance is the length of the path travelled (how far you go), measured in units like metres.",
        },
        {
          name: "Common units",
          explanation:
            "In science problems you’ll usually use metres (m). For longer distances, kilometres (km) may be used.",
        },
        {
          name: "Converting units (idea)",
          explanation:
            "When you convert: 1 km = 1000 m. You multiply to go from km to m, and divide to go from m to km.",
        },
        {
          name: "Distance helps define speed",
          explanation:
            "To calculate speed, you need distance and time together: speed = distance ÷ time.",
        },
      ],
      example: "If you travel 3 km, that is 3000 m.",
      lessonSummary:
        yearLeadIn +
        "You now know what distance means, typical units, and the basic idea of converting km to m. Distance is essential for calculating speed.",
    };
  }
  if (t.includes("time")) {
    return {
      intro: yearLeadIn + "Time is how long a journey or movement takes. In this lesson you will focus on time and how it links to speed.",
      coreConcepts: [
        {
          name: "What time is",
          explanation:
            "Time is the duration of the movement—how long the object takes to travel a given distance.",
        },
        {
          name: "Units",
          explanation:
            "Time is usually measured in seconds (s) for these science calculations.",
        },
        {
          name: "Time affects speed",
          explanation:
            "For the same distance, a shorter time means a higher speed, and a longer time means a lower speed.",
        },
        {
          name: "Speed calculation",
          explanation:
            "Use time in the formula: speed = distance ÷ time.",
        },
      ],
      example: "If a runner takes 30 s for 120 m, their speed is found using 120 ÷ 30.",
      lessonSummary:
        yearLeadIn +
        "You now know what time is, its units (seconds), and how time affects speed in calculations.",
    };
  }
  // Chemistry
  if (t.includes("solids")) {
    return {
      intro:
        yearLeadIn +
        "A solid has a fixed shape and a fixed volume. In the particle model, the particles are packed close together and only vibrate in place.",
      coreConcepts: [
        {
          name: "Shape and volume",
          explanation:
            "Solids keep their shape and also keep the same volume, even if you put them in a different container.",
        },
        {
          name: "Particles in solids",
          explanation:
            "In a solid, particles are tightly packed. They mainly vibrate but do not slide past each other.",
        },
        {
          name: "Examples",
          explanation: "Common examples of solids include wood, ice and metal.",
        },
      ],
      example:
        "Ice is a solid: it keeps its shape. If you heat it, it can melt to become a liquid.",
      lessonSummary:
        yearLeadIn +
        "You now know that solids have fixed shape and volume, and that their particles are packed close and vibrate in place.",
    };
  }
  if (t.includes("liquids")) {
    return {
      intro:
        yearLeadIn +
        "A liquid has a fixed volume but no fixed shape. In the particle model, particles are close together but can move past each other.",
      coreConcepts: [
        {
          name: "Shape and volume",
          explanation:
            "A liquid flows, so it takes the shape of the container. But it still has the same volume.",
        },
        {
          name: "Particles in liquids",
          explanation:
            "Particles in liquids can slide past each other, which is why liquids flow.",
        },
        {
          name: "Examples",
          explanation: "Common examples include water and oil.",
        },
      ],
      example:
        "Water is a liquid: it takes the shape of a glass, but the amount (volume) stays the same.",
      lessonSummary:
        yearLeadIn +
        "You now know that liquids have fixed volume but flow to match the container shape because particles can move past each other.",
    };
  }
  if (t.includes("gases")) {
    return {
      intro:
        yearLeadIn +
        "A gas has no fixed shape and no fixed volume. In the particle model, particles are far apart and move quickly.",
      coreConcepts: [
        {
          name: "Shape and volume",
          explanation:
            "Gases spread out to fill the space available, so they have no fixed shape or volume.",
        },
        {
          name: "Particles in gases",
          explanation:
            "In a gas, particles are much further apart. They move rapidly in all directions.",
        },
        {
          name: "Examples",
          explanation: "Examples include air and steam.",
        },
      ],
      example:
        "Steam is a gas: it spreads out in the room and does not keep the same shape.",
      lessonSummary:
        yearLeadIn +
        "You now know that gases spread to fill space because particles are far apart and move quickly.",
    };
  }
  if (t.includes("properties")) {
    return {
      intro:
        yearLeadIn +
        "Properties describe how a substance behaves. Solids, liquids and gases have different key properties that come from how their particles are arranged and moving.",
      coreConcepts: [
        {
          name: "Solids: fixed shape and volume",
          explanation:
            "Solids do not flow. They keep the same shape and volume because particles are packed close together.",
        },
        {
          name: "Liquids: flow, fixed volume",
          explanation:
            "Liquids flow and take the container shape, but keep the same volume because particles can move past each other.",
        },
        {
          name: "Gases: spread out, no fixed volume",
          explanation:
            "Gases spread out to fill space because particles are far apart and move freely.",
        },
        {
          name: "Temperature and energy",
          explanation:
            "Heating increases the energy of particles, which can change how a substance behaves and which state it is in.",
        },
      ],
      example:
        "A substance can be solid, liquid or gas depending on conditions. Its properties (flowing, compressing, shape) match its state.",
      lessonSummary:
        yearLeadIn +
        "You now know the main properties of solids, liquids and gases and how these come from particle arrangement and movement.",
    };
  }
  if (t.includes("changes")) {
    return {
      intro:
        yearLeadIn +
        "Changes of state happen when a substance gains or loses energy. Heating can melt or boil; cooling can freeze or condense.",
      coreConcepts: [
        {
          name: "Melting",
          explanation:
            "Melting is a change of state from solid to liquid (usually by heating).",
        },
        {
          name: "Boiling",
          explanation:
            "Boiling is a change of state from liquid to gas (usually by heating).",
        },
        {
          name: "Condensation",
          explanation:
            "Condensation is a change of state from gas to liquid (usually by cooling).",
        },
        {
          name: "Freezing",
          explanation:
            "Freezing is a change of state from liquid to solid (usually by cooling).",
        },
        {
          name: "Particles and energy",
          explanation:
            "As energy increases, particles move more. As energy decreases, particles move less and come closer together.",
        },
      ],
      example:
        "Water: ice (solid) melts to water (liquid). If heated more, water boils to steam (gas). Cooling steam condenses back to liquid water, and cooling further can freeze it to ice.",
      lessonSummary:
        yearLeadIn +
        "You now know the names of the main changes of state and that heating/cooling changes particle energy, leading to a different state.",
    };
  }
  if (t.includes("rock")) {
    return {
      intro: yearLeadIn + "Rocks are made in different ways. Scientists often group rocks into three main types: sedimentary, igneous and metamorphic.",
      coreConcepts: [
        {
          name: "Sedimentary rocks",
          explanation:
            "These form when sediments are laid down in layers and squashed over time (for example, sandstone).",
        },
        {
          name: "Igneous rocks",
          explanation:
            "These form when molten rock cools and solidifies (for example, granite).",
        },
        {
          name: "Metamorphic rocks",
          explanation:
            "These form when existing rocks are changed by heat and pressure (for example, marble).",
        },
      ],
      example:
        "Sandstone forms from sand grains laid down in layers and pressed together. Over time it becomes solid rock.",
      lessonSummary:
        yearLeadIn +
        "You now know the three main rock types and the basic idea of how each one forms.",
    };
  }
  if (t.includes("fossil")) {
    return {
      intro: yearLeadIn + "Fossils are traces or remains of living things from long ago, preserved in rock. They help us learn about past life and environments.",
      coreConcepts: [
        {
          name: "What a fossil is",
          explanation:
            "A fossil can be a body part, an imprint or other evidence left behind by a living thing.",
        },
        {
          name: "How fossils form",
          explanation:
            "Fossils usually form when organisms are buried in sediment and preserved over long periods.",
        },
        {
          name: "Where fossils are found",
          explanation:
            "Many fossils are found in sedimentary rocks because these rocks form from layers of sediment.",
        },
      ],
      example:
        "Sea creature fossils are often found in sedimentary rocks that formed under the sea.",
      lessonSummary:
        yearLeadIn +
        "You now know what fossils are, how they generally form, and why they are often found in sedimentary rock.",
    };
  }
  if (t.includes("soil")) {
    return {
      intro: yearLeadIn + "Soil is a mixture that supports plant growth. It is made from broken rock, decayed matter, and also includes water and air between particles.",
      coreConcepts: [
        {
          name: "What soil is made of",
          explanation:
            "Soil contains weathered rock, humus (decayed plants and animals), water and air.",
        },
        {
          name: "Different soils",
          explanation:
            "Soils can have different amounts of these components, which affects how well they support different plants.",
        },
        {
          name: "Why soil matters",
          explanation:
            "Soil provides a place for roots to grow and supplies water, nutrients and conditions for plants.",
        },
      ],
      example:
        "Healthy garden soil contains enough humus and water to help plants grow well.",
      lessonSummary:
        yearLeadIn +
        "You now know what soil is made of and why soil is important for plant growth.",
    };
  }
  if (t.includes("indicator")) {
    return {
      intro: yearLeadIn + "Indicators are substances that change colour in acids and alkalis, helping you test which type a solution is.",
      coreConcepts: [
        {
          name: "Indicators detect acidity",
          explanation:
            "An indicator changes colour depending on whether a solution is acidic, neutral or alkaline.",
        },
        {
          name: "Universal indicator",
          explanation:
            "Universal indicator changes colour across the pH range: strong acids turn it red, neutral solutions turn it green, and alkalis turn it blue/purple.",
        },
        {
          name: "Litmus paper",
          explanation:
            "Litmus paper turns red in acids and blue in alkalis.",
        },
      ],
      example:
        "If you add universal indicator to lemon juice (an acid), it turns red. If you test soap solution (an alkali), it turns blue/purple.",
      lessonSummary:
        yearLeadIn +
        "You now know what indicators do and how universal indicator and litmus show acid/alkali using different colours.",
    };
  }
  if (t.includes("alkali") || t.includes("acid")) {
    return {
      intro: yearLeadIn + "Acids and alkalis are different types of substances. We use pH to describe how acidic or alkaline something is.",
      coreConcepts: [
        {
          name: "Acids vs alkalis",
          explanation:
            "Acids are solutions with pH below 7 and alkalis have pH above 7.",
        },
        {
          name: "The pH scale",
          explanation:
            "pH values: less than 7 means acidic, 7 means neutral, and more than 7 means alkaline.",
        },
        {
          name: "Examples",
          explanation:
            "Examples of acids include vinegar or lemon juice; examples of alkalis include soap and some cleaning products.",
        },
      ],
      example:
        "Vinegar is an acid so it has pH below 7. Baking soda solution is an alkali so it has pH above 7.",
      lessonSummary:
        yearLeadIn +
        "You now know how acids and alkalis differ using the pH scale and you can recognise typical examples.",
    };
  }
  if (t.includes("reaction")) {
    return {
      intro: yearLeadIn + "A chemical reaction changes substances into new substances with different properties. The substances you start with are reactants; the new substances are products.",
      coreConcepts: [
        {
          name: "Reactants and products",
          explanation:
            "Reactants change into products during a chemical reaction.",
        },
        {
          name: "Signs of a reaction",
          explanation:
            "Some reactions show signs such as a colour change, fizzing (gas), a temperature change, or a new solid forming.",
        },
        {
          name: "New properties",
          explanation:
            "Products have different properties from the reactants.",
        },
      ],
      example:
        "Mixing an acid and an alkali can cause neutralisation, producing new substances (and often a change you can detect using indicators).",
      lessonSummary:
        yearLeadIn +
        "You now know what chemical reactions do: reactants turn into new products, often with observable signs and new properties.",
    };
  }
  if (t.includes("atoms") || t.includes("atom")) {
    return {
      intro: yearLeadIn + "Atoms are the smallest particles of an element that still keep the element's properties.",
      coreConcepts: [
        {
          name: "Element properties",
          explanation:
            "Each element has a different type of atom. Changing the atom means the element changes.",
        },
        {
          name: "Examples of atoms",
          explanation:
            "Atoms include hydrogen, carbon and oxygen.",
        },
        {
          name: "Atoms link to molecules",
          explanation:
            "Atoms can join together to form molecules.",
        },
      ],
      example:
        "A water molecule contains atoms of hydrogen and oxygen joined together.",
      lessonSummary:
        yearLeadIn +
        "You now know what atoms are and that atoms of different elements have different types.",
    };
  }
  if (t.includes("molecules") || t.includes("molecule")) {
    return {
      intro: yearLeadIn + "Molecules are groups of atoms joined together. Many everyday substances are made from molecules.",
      coreConcepts: [
        {
          name: "Groups of atoms",
          explanation:
            "A molecule forms when atoms bond together in fixed combinations.",
        },
        {
          name: "Water molecule",
          explanation:
            "Water is a molecule with two hydrogen atoms and one oxygen atom (H2O).",
        },
        {
          name: "Molecules move in states",
          explanation:
            "Whether a substance is solid, liquid or gas depends on how particles (atoms/molecules) are arranged and how much energy they have.",
        },
      ],
      example:
        "In steam, the water molecules are far apart and can move freely.",
      lessonSummary:
        yearLeadIn +
        "You now know what molecules are and that molecules can exist in different states depending on particle behaviour.",
    };
  }
  if (t.includes("particle")) {
    return {
      intro: yearLeadIn + "The particle model explains states of matter by describing how particles are arranged and how they move.",
      coreConcepts: [
        {
          name: "Particles everywhere",
          explanation:
            "All matter is made of tiny particles.",
        },
        {
          name: "Arrangement and movement",
          explanation:
            "In solids, particles are close and vibrate. In liquids, particles are close and can move past each other. In gases, particles are far apart and move quickly.",
        },
        {
          name: "Changes of state",
          explanation:
            "Heating usually gives particles more energy, so solids can melt and liquids can boil.",
        },
      ],
      example:
        "If you heat a solid, particles gain energy and can eventually overcome the forces holding them in place, so the solid melts to a liquid.",
      lessonSummary:
        yearLeadIn +
        "You now know the particle model and how it explains solids, liquids, gases and changes of state.",
    };
  }
  // Biology (split by sub-lesson focus)
  if (topicLower === "living things") {
    if (t.includes("life process")) {
      return {
        intro: yearLeadIn + "Life processes are the activities that living things carry out. This lesson focuses on the main life processes.",
        coreConcepts: [
          { name: "Nutrition (feeding)", explanation: "Living things need food to get energy and materials." },
          { name: "Respiration", explanation: "Respiration releases energy from food so cells can function." },
          { name: "Growth and movement", explanation: "Living things grow and can move, at least in some way." },
          { name: "Response, excretion and reproduction", explanation: "Living things respond to their surroundings, remove waste and reproduce." },
        ],
        example: "A rabbit feeds, breathes (respiration), grows and reproduces, and responds to danger.",
        lessonSummary: yearLeadIn + "You now know the main life processes that characterise living things.",
      };
    }
    if (t.includes("classification")) {
      return {
        intro: yearLeadIn + "Classification groups living things so we can organise and compare them.",
        coreConcepts: [
          { name: "Group by features", explanation: "We classify based on observable features and characteristics." },
          { name: "Broad to specific", explanation: "Start with bigger groups, then split into smaller groups using more specific features." },
          { name: "Similar features mean related", explanation: "Organisms in the same group usually share more features and are more closely related." },
          { name: "Purpose of classification", explanation: "It helps scientists identify patterns and understand relationships between organisms." },
        ],
        example: "Mammals share features like giving milk to their young, so they can be classified together.",
        lessonSummary: yearLeadIn + "You now know that classification is about grouping living things using features.",
      };
    }
    if (t.includes("habitat")) {
      return {
        intro: yearLeadIn + "A habitat is where an organism lives and the conditions it needs to survive.",
        coreConcepts: [
          { name: "What habitats provide", explanation: "Habitats provide food, water, shelter and the right environmental conditions." },
          { name: "Different habitats, different organisms", explanation: "Different conditions lead to different types of living things." },
          { name: "Adaptations", explanation: "Living things may be adapted to their habitat to survive and reproduce." },
          { name: "Comparing habitats", explanation: "You can compare habitats by describing the conditions and the organisms found there." },
        ],
        example: "A desert habitat has dry conditions, so plants and animals are adapted to conserve water.",
        lessonSummary: yearLeadIn + "You now know what a habitat is and why habitats influence which organisms live there.",
      };
    }
  }
  if (topicLower === "humans & health") {
    if (t.includes("body systems")) {
      return {
        intro: yearLeadIn + "Body systems work together to keep humans alive. This lesson focuses on the digestive, circulatory and respiratory systems.",
        coreConcepts: [
          { name: "Digestive system", explanation: "Breaks down food into nutrients." },
          { name: "Circulatory system", explanation: "Carries nutrients in the blood around the body." },
          { name: "Respiratory system", explanation: "Supplies oxygen and removes carbon dioxide." },
          { name: "Systems are linked", explanation: "Nutrients and oxygen are used by cells to release energy." },
        ],
        example: "After eating, digestion produces nutrients, blood transports them, and respiration supplies oxygen for energy release.",
        lessonSummary: yearLeadIn + "You now know how body systems connect to support life.",
      };
    }
    if (t.includes("nutrition")) {
      return {
        intro: yearLeadIn + "Nutrition is about the food and nutrients the body needs. This lesson focuses on balanced diets.",
        coreConcepts: [
          { name: "Balanced diet", explanation: "Includes carbohydrates, proteins, fats, vitamins, minerals, fibre and enough water." },
          { name: "Different nutrients do different jobs", explanation: "Foods support growth, repair and energy release." },
          { name: "Too much or too little", explanation: "Imbalance can affect health and wellbeing." },
          { name: "Hydration matters", explanation: "Water supports digestion and normal body function." },
        ],
        example: "A balanced meal with protein and vegetables helps provide nutrients for energy and growth.",
        lessonSummary:
          yearLeadIn +
          "You now know what nutrition means and why balanced eating helps keep you healthy.",
      };
    }
    if (t.includes("exercise")) {
      return {
        intro: yearLeadIn + "Exercise supports health by strengthening your body and improving fitness. This lesson focuses on key benefits.",
        coreConcepts: [
          { name: "Heart and lungs", explanation: "Exercise can improve how well your heart and lungs work." },
          { name: "Muscles and movement", explanation: "Activity strengthens muscles and improves coordination." },
          { name: "Healthy weight", explanation: "Exercise helps maintain a healthier balance of energy in your body." },
          { name: "Rest and recovery", explanation: "Sleep and rest help your body repair and stay healthy." },
        ],
        example: "Regular exercise can make you feel fitter, stronger and better able to concentrate.",
        lessonSummary:
          yearLeadIn +
          "You now know how exercise supports health and why rest is part of staying well.",
      };
    }
    if (t.includes("health")) {
      return {
        intro: yearLeadIn + "Health is about how well your body works and how you feel day to day. This lesson focuses on healthy habits.",
        coreConcepts: [
          { name: "Healthy routines", explanation: "Good routines include eating well, being active and getting enough sleep." },
          { name: "Prevention", explanation: "Healthy choices can reduce the risk of some illnesses and improve wellbeing." },
          { name: "Listening and getting help", explanation: "If something feels wrong, you should tell an adult and get advice." },
          { name: "Balance", explanation: "Health is not just one habit; it is a balance of many behaviours." },
        ],
        example: "A student who eats well, exercises and sleeps enough is more likely to feel energetic and focused.",
        lessonSummary:
          yearLeadIn +
          "You now understand health as a combination of nutrition, activity, rest and good habits.",
      };
    }
  }
  if (topicLower === "plants") {
    if (t.includes("parts of a plant")) {
      return {
        intro: yearLeadIn + "Plants have parts with different jobs. This lesson focuses on roots, stems, leaves and flowers.",
        coreConcepts: [
          { name: "Roots", explanation: "Anchor the plant and take in water and minerals from the soil." },
          { name: "Stem", explanation: "Supports the plant and transports water and nutrients." },
          { name: "Leaves", explanation: "Leaves make food using photosynthesis." },
          { name: "Flowers", explanation: "Flowers support reproduction and help produce seeds." },
        ],
        example: "In a sunflower, roots absorb water, the stem holds it up, and leaves make food.",
        lessonSummary: yearLeadIn + "You now know what the main plant parts do.",
      };
    }
    if (t.includes("photosynthesis")) {
      return {
        intro:
          yearLeadIn +
          "Photosynthesis is how plants make their own food. This lesson focuses on what plants need and what they make.",
        coreConcepts: [
          { name: "Inputs", explanation: "Plants need light energy, water and carbon dioxide." },
          { name: "Making sugar", explanation: "Plants make sugar (glucose) which stores energy." },
          { name: "Oxygen released", explanation: "Photosynthesis releases oxygen into the air." },
          { name: "Chlorophyll", explanation: "Chlorophyll in leaves captures light energy." },
        ],
        example: "A leaf uses sunlight, water and carbon dioxide to make glucose and release oxygen.",
        lessonSummary:
          yearLeadIn +
          "You now know the key idea of photosynthesis and its inputs/outputs.",
      };
    }
    if (t.includes("life cycle")) {
      return {
        intro:
          yearLeadIn +
          "The plant life cycle shows how a plant grows from a seed to producing more seeds. This lesson focuses on stages.",
        coreConcepts: [
          { name: "Germination", explanation: "Seeds germinate and start to grow." },
          { name: "Growth", explanation: "The plant grows into roots, stems and leaves." },
          { name: "Flowering and seeds", explanation: "Many plants produce flowers, then seeds." },
          { name: "Spreading", explanation: "Seeds spread and can grow into new plants when conditions are suitable." },
        ],
        example: "A sunflower grows from a seed, produces flowers and then produces seeds for the next cycle.",
        lessonSummary:
          yearLeadIn +
          "You now know the stages of a plant life cycle.",
      };
    }
  }
  if (topicLower === "evolution & inheritance") {
    if (t.includes("variation")) {
      return {
        intro: yearLeadIn + "Variation means individuals in a species are not all identical. This lesson focuses on what causes variation.",
        coreConcepts: [
          { name: "Differences", explanation: "Variation is the differences between individuals in a population." },
          { name: "Inherited variation", explanation: "Some variation is passed from parents to offspring." },
          { name: "Environmental variation", explanation: "Some variation happens due to the environment." },
          { name: "Survival effects", explanation: "Some differences can help organisms survive better in certain conditions." },
        ],
        example: "Fur thickness can vary between rabbits, and some inherited traits help survival in cold conditions.",
        lessonSummary: yearLeadIn + "You now know variation and where it can come from.",
      };
    }
    if (t.includes("inheritance")) {
      return {
        intro: yearLeadIn + "Inheritance is how characteristics are passed from parents to offspring. This lesson focuses on inherited traits.",
        coreConcepts: [
          { name: "Passed traits", explanation: "Offspring inherit characteristics from parents." },
          { name: "Not identical", explanation: "Offspring are similar but not exactly the same because traits still vary." },
          { name: "Why it matters", explanation: "Inherited variation can be passed on if it helps survival." },
          { name: "Generations", explanation: "Over many generations, inherited traits can become more common in a population." },
        ],
        example: "If a trait is inherited, offspring can show it even if parents are slightly different.",
        lessonSummary:
          yearLeadIn +
          "You now understand inheritance as the passing of traits to offspring across generations.",
      };
    }
    if (t.includes("adaptation")) {
      return {
        intro: yearLeadIn + "Adaptations are features that help organisms survive in their environment. This lesson focuses on the survival advantage.",
        coreConcepts: [
          { name: "Better suited", explanation: "Adaptations make it easier for organisms to survive and reproduce." },
          { name: "Inherited advantage", explanation: "If the adaptation is inherited, it can spread through populations over generations." },
          { name: "Over long time", explanation: "Adaptations build over long periods, leading to evolution." },
          { name: "Environment link", explanation: "Adaptations depend on the conditions in an environment." },
        ],
        example: "Rabbits with thicker fur can survive colder winters better and pass on the trait.",
        lessonSummary:
          yearLeadIn +
          "You now know what adaptations are and how they link to survival and evolution over time.",
      };
    }
  }
  // Computer Science
  if (topicLower === "algorithms") {
    if (t.includes("decomposition")) {
      return {
        intro: "Decomposition means breaking a large problem into smaller parts so it is easier to solve.",
        coreConcepts: [
          { name: "Split the problem", explanation: "Take a big task and divide it into smaller steps or parts." },
          { name: "Solve separately", explanation: "Work on each part on its own before combining them." },
          { name: "Combine results", explanation: "Put the solutions for the parts together to form the full answer." },
        ],
        example: "Designing a game: create the layout, rules and scoring as separate pieces, then combine them.",
        lessonSummary: "You now know decomposition as a way to handle complexity by working in manageable parts.",
      };
    }
    if (t.includes("debug")) {
      return {
        intro: "Debugging is finding and fixing mistakes (bugs) in an algorithm or program.",
        coreConcepts: [
          { name: "Test with examples", explanation: "Run your algorithm and check what happens for test cases." },
          { name: "Find the cause", explanation: "Identify the step that leads to incorrect results." },
          { name: "Fix and re-test", explanation: "Correct the issue and test again to confirm it works." },
        ],
        example: "If a loop runs the wrong number of times, debugging finds where the condition or counter is wrong.",
        lessonSummary: "You now know debugging as a cycle: test, find, fix, and re-test.",
      };
    }
    if (t.includes("sequence") || t.includes("step")) {
      return {
        intro: "Sequence means the order of steps. In algorithms, the correct order is essential for the right result.",
        coreConcepts: [
          { name: "Order matters", explanation: "Doing steps out of order can change the meaning or outcome." },
          { name: "Follow the rules", explanation: "Algorithms are instructions where each step follows on from the previous step." },
          { name: "Real-life sequences", explanation: "Recipes and instructions are examples of sequences." },
        ],
        example: "If you butter toast before it pops, you get the wrong result because the sequence was incorrect.",
        lessonSummary: "You now know why sequence matters in algorithms and instructions.",
      };
    }
  }

  if (topicLower === "programming") {
    if (t.includes("block") || t.includes("text-based") || t.includes("coding")) {
      return {
        intro: "Programming gives computers instructions. You can build programs using block-based coding or text-based code.",
        coreConcepts: [
          { name: "Program and code", explanation: "A program is a set of instructions; code is the instructions written for the computer." },
          { name: "Block-based coding", explanation: "Blocks make it easy to assemble correct instructions visually." },
          { name: "Text-based coding", explanation: "Text code uses the rules (syntax) of a programming language." },
        ],
        example: "A block program might say: when button pressed, then add to a score variable.",
        lessonSummary: "You now know two ways to code and what programming means in this curriculum.",
      };
    }
    if (t.includes("variable")) {
      return {
        intro: "Variables store data so your program can use and update values.",
        coreConcepts: [
          { name: "Named storage", explanation: "A variable is a name for a place that holds a value." },
          { name: "Use values", explanation: "Programs read variables to decide what to do next." },
          { name: "Update values", explanation: "Variables can change when something in the program happens (like scoring points)." },
        ],
        example: "If `score = 10`, a game can change it to `score + 1` when a player earns a point.",
        lessonSummary: "You now know variables as storage that supports decisions and updates in programs.",
      };
    }
    if (t.includes("loop")) {
      return {
        intro: "Loops repeat instructions, so you don’t have to write the same steps many times.",
        coreConcepts: [
          { name: "Repeat actions", explanation: "A loop repeats a set of instructions." },
          { name: "Count or condition", explanation: "Loops can repeat a set number of times or until a condition is met." },
          { name: "More efficient code", explanation: "Loops make programs shorter and clearer." },
        ],
        example: "Instead of writing 10 move commands, use a loop to move 10 times.",
        lessonSummary: "You now know loops as a tool to repeat actions in programming.",
      };
    }
  }

  if (topicLower === "data & information") {
    if (t.includes("collect")) {
      return {
        intro: "Collecting data means gathering raw information that you can later analyse.",
        coreConcepts: [
          { name: "Decide your question", explanation: "Choose what you want to find out before collecting data." },
          { name: "Gather data", explanation: "Use measuring, surveys or recording to collect values." },
          { name: "Organise and store", explanation: "Keep data organised (for example, in a table) to make it easier to use." },
        ],
        example: "Collect how many students like different fruits and store the counts in a table.",
        lessonSummary: "You now know that collecting data starts the process of turning numbers into information.",
      };
    }
    if (t.includes("present")) {
      return {
        intro: "Presenting data shows information clearly so patterns and comparisons are easy to understand.",
        coreConcepts: [
          { name: "Choose an appropriate chart", explanation: "Different charts show different patterns well." },
          { name: "Add labels and titles", explanation: "Labels help the reader understand what the data means." },
          { name: "Interpret results", explanation: "Presentation includes explaining what the data shows." },
        ],
        example: "A bar chart can quickly show which fruit is most popular.",
        lessonSummary: "You now know how to present data and interpret patterns from charts.",
      };
    }
    if (t.includes("using") && t.includes("data")) {
      return {
        intro: "Using data means turning it into answers and decisions.",
        coreConcepts: [
          { name: "From data to information", explanation: "Analyse and organise data to create useful information." },
          { name: "Make conclusions", explanation: "Use evidence from the data to support your conclusion." },
          { name: "Compare and justify", explanation: "Compare values (highest/lowest, more/less) and explain reasoning." },
        ],
        example: "Use the survey data to decide which fruit is the most popular and justify your answer.",
        lessonSummary: "You now know how to use data to answer questions and justify conclusions.",
      };
    }
  }

  if (topicLower === "networks & the internet") {
    if (t.includes("introduction")) {
      return {
        intro: "Networks connect devices so they can share information. The internet is a network of networks.",
        coreConcepts: [
          { name: "Network", explanation: "A network connects devices so they can share data and resources." },
          { name: "Internet", explanation: "The internet connects networks around the world." },
          { name: "Everyday examples", explanation: "Websites, messaging and video calls rely on networks." },
        ],
        example: "Your phone and laptop can both connect to the same home Wi‑Fi network.",
        lessonSummary: "You now know what networks are and what the internet connects.",
      };
    }
    if (t.includes("key concepts")) {
      return {
        intro: "Networks send information using packets. Packets are sent between devices and rebuilt at the destination.",
        coreConcepts: [
          { name: "Packets", explanation: "Information is split into small packets for sending." },
          { name: "Delivery", explanation: "Packets travel through networks and are routed to their destination." },
          { name: "Reassembly", explanation: "The destination device rebuilds the message from the packets." },
        ],
        example: "When you open a site, packets arrive and your device puts them together to display the page.",
        lessonSummary: "You now know the key idea of packets and delivery in networks.",
      };
    }
    if (t.includes("applying")) {
      return {
        intro: "In real life, networks let devices request and receive information from services such as websites.",
        coreConcepts: [
          { name: "Request/response", explanation: "A device sends a request; a server sends back data." },
          { name: "Protocols (idea)", explanation: "Communication follows agreed rules so devices can understand each other." },
          { name: "Online services", explanation: "Email, browsing and messaging all depend on network communication." },
        ],
        example: "Typing a web address sends a request across the internet, then the page loads.",
        lessonSummary: "You now know how networking supports everyday online tasks.",
      };
    }
  }
  // Business
  if (topicLower === "enterprise") {
    if (t.includes("ideas")) {
      return {
        intro: "Enterprise is about turning ideas into opportunities. This lesson focuses on coming up with business ideas.",
        coreConcepts: [
          { name: "Spot a need or problem", explanation: "An enterprise idea often starts when you notice something people want or need." },
          { name: "Take initiative", explanation: "Enterprise means acting on your idea, not just thinking about it." },
          { name: "Test and improve", explanation: "You can learn by trying ideas and refining them based on results." },
        ],
        example: "If students struggle to find cheap snacks, an idea might be to sell snacks at school.",
        lessonSummary: "You now know enterprise as the process of spotting opportunities and acting on ideas.",
      };
    }
    if (t.includes("product")) {
      return {
        intro: "A product is something you make or provide to customers. This lesson focuses on products and what makes a good product.",
        coreConcepts: [
          { name: "What a product is", explanation: "A product is something you can touch (for example, a snack or a toy)." },
          { name: "Matches customer needs", explanation: "Products should meet what customers want or need." },
          { name: "Costs and selling price (idea)", explanation: "Businesses consider costs and set a price so they can earn money." },
        ],
        example: "Homemade biscuits are a product sold to customers.",
        lessonSummary: "You now know that products are built around customer needs and linked to costs and pricing.",
      };
    }
    return {
      intro: "Businesses provide goods and services. This lesson focuses on what businesses do and the idea of profit.",
      coreConcepts: [
        { name: "Goods vs services", explanation: "Goods/products are tangible, while services are activities done for customers." },
        { name: "Costs and revenue", explanation: "Businesses track costs and earn revenue from selling to customers." },
        { name: "Profit meaning", explanation: "Profit is what remains when revenue is more than costs." },
      ],
      example: "A gardening service charges for work, covers costs, and earns profit if sales are higher than costs.",
      lessonSummary: "You now know what businesses do and how profit links to costs and income from sales.",
    };
  }
  if (t.includes("money") || t.includes("budget") || t.includes("saving") || t.includes("income") || t.includes("spending")) {
    return {
      intro: "Money and budgeting are about income (money coming in), spending (money going out) and saving. A budget is a plan for how to use money so we can afford what we need and save for the future.",
      coreConcepts: [
        { name: "Income", explanation: "Income is money we receive—from a job, pocket money, or selling something. We need to know how much we have so we can plan our spending and saving." },
        { name: "Spending", explanation: "Spending is money we pay out—on food, transport, hobbies, etc. We often have to choose what to spend on because we can't have everything. Prioritising means deciding what is most important." },
        { name: "Saving and budgeting", explanation: "Saving is keeping some money for later. A budget is a plan: we list our income and our expected spending. If income is more than spending, we can save. A budget helps us avoid running out of money." },
      ],
      example: "You get £10 pocket money. You plan to spend £4 on a snack, £3 on a game, and save £3. That is a simple budget. If you stick to it, you save £3. If you spend £5 on the snack, you have less for the game or saving.",
      lessonSummary: "You now know what income and spending are; what saving and a budget are; and why planning helps us use money wisely. Use this to plan your own pocket money or simple budgets.",
    };
  }
  if (t.includes("market") || t.includes("customer") || t.includes("marketing") || t.includes("need") || t.includes("want")) {
    return {
      intro: "Markets are where buyers and sellers meet. Customers are the people or businesses that buy. Businesses try to understand what customers need and want, and use marketing to tell customers about their products.",
      coreConcepts: [
        { name: "Needs and wants", explanation: "A need is something we must have to live or be safe (e.g. food, water). A want is something we would like but don't need (e.g. a new game). Customers have both needs and wants." },
        { name: "Customers", explanation: "Customers are the people or organisations that buy a product or service. Businesses need to know who their customers are and what they want so they can offer the right thing." },
        { name: "Marketing", explanation: "Marketing is how businesses tell people about their product and persuade them to buy. It can include adverts, posters, social media, and the way the product is packaged and sold." },
      ],
      example: "A new cereal brand wants customers. They find out that many people want a healthy, tasty breakfast (need: food; want: healthy and tasty). They design the cereal and use adverts and packaging to market it. Customers see it and might buy it.",
      lessonSummary: "You now know the difference between needs and wants; what a customer is; and how marketing is used to reach customers. Use this to describe how businesses and customers interact.",
    };
  }

  // English
  if (topicLower === "reading") {
    if (t.includes("comprehension")) {
      return {
        intro: "Comprehension means understanding the meaning of what you read. This lesson focuses on extracting main ideas and key details.",
        coreConcepts: [
          { name: "Main idea", explanation: "Identify the purpose or central message of a paragraph or text." },
          { name: "Key details", explanation: "Find important facts, events and descriptions that support the main idea." },
          { name: "Vocabulary clues", explanation: "Use surrounding words to infer meanings of unfamiliar words." },
          { name: "Check your understanding", explanation: "Ask yourself what happened, why it happened, and what it shows." },
        ],
        example: "After reading, summarise the paragraph in one or two sentences in your own words.",
        lessonSummary: "You now know comprehension as the skill of understanding meaning using main ideas, details and vocabulary clues.",
      };
    }
    if (t.includes("analysis")) {
      return {
        intro: "Analysis breaks down how a writer creates effects and meaning using language and structure.",
        coreConcepts: [
          { name: "Language choices", explanation: "Notice words and techniques (like imagery or repetition) and think why they’re used." },
          { name: "Structure", explanation: "Consider how ideas are organised (paragraphing, shifts in tone, pacing)." },
          { name: "Effect", explanation: "Explain what a technique makes the reader feel or understand." },
          { name: "Evidence", explanation: "Use quotes or specific references to support your explanation." },
        ],
        example: "If a writer uses short sentences to describe tension, explain how that speeds up the pace for the reader.",
        lessonSummary: "You now know how to analyse by linking writer choices to meaning and effect using evidence.",
      };
    }
    if (t.includes("inference")) {
      return {
        intro: "Inference means making an educated guess about what is implied. You use evidence from the text to support your answer.",
        coreConcepts: [
          { name: "Clues in the text", explanation: "Find evidence that suggests a conclusion." },
          { name: "Writers imply", explanation: "Writers often don’t state everything directly, so you read between the lines." },
          { name: "Reasoning", explanation: "Explain how the evidence leads to your inference." },
          { name: "Support", explanation: "Your inference should be based on the text, not just opinion." },
        ],
        example: "If a character’s actions show fear, you can infer they are worried about what will happen next.",
        lessonSummary: "You now know inference as using text evidence to explain what a writer implies.",
      };
    }
    if (t.includes("writer") || t.includes("craft")) {
      return {
        intro: "Writer’s craft is how writers choose language and style to shape meaning. This lesson focuses on noticing deliberate choices.",
        coreConcepts: [
          { name: "Purpose and audience", explanation: "Writers pick techniques that fit why they’re writing and who will read it." },
          { name: "Word choice", explanation: "Good writers choose precise words and sometimes figurative language." },
          { name: "Sentence control", explanation: "Sentence length and type can change tone and emphasis." },
          { name: "Patterns", explanation: "Look for repeated ideas or images that build themes." },
        ],
        example: "A vivid adjective can help the reader “see” the scene, which builds atmosphere.",
        lessonSummary: "You now know writer’s craft as deliberate choices that create impact for the reader.",
      };
    }
  }

  if (topicLower === "writing") {
    if (t.includes("stories")) {
      return {
        intro: "Story writing creates a narrative with characters, events and a setting. This lesson focuses on basic story elements.",
        coreConcepts: [
          { name: "Characters", explanation: "Think about traits, motivations and how characters change." },
          { name: "Setting", explanation: "Where and when the story happens builds atmosphere." },
          { name: "Structure", explanation: "Use a beginning, middle and ending (often with a turning point)." },
          { name: "Engaging details", explanation: "Use description to interest the reader and show action clearly." },
        ],
        example: "Start with a problem, build tension in the middle, and resolve it in the ending.",
        lessonSummary: "You now know story writing basics: characters, setting, structure and engaging details.",
      };
    }
    if (t.includes("non-fiction")) {
      return {
        intro: "Non-fiction writing informs, explains or persuades. This lesson focuses on writing for a purpose and audience.",
        coreConcepts: [
          { name: "Purpose", explanation: "Decide what you want the reader to learn or think." },
          { name: "Audience", explanation: "Use language and examples that match your reader." },
          { name: "Clarity", explanation: "Use facts and clear explanations so your writing is easy to follow." },
          { name: "Organisation", explanation: "Arrange information logically with paragraphs or headings." },
        ],
        example: "A guide about recycling should explain steps clearly with simple headings and examples.",
        lessonSummary: "You now know non-fiction as writing for purpose, audience, clarity and organisation.",
      };
    }
    if (t.includes("structure")) {
      return {
        intro: "Structure is how your ideas are organised so the reader can follow your writing.",
        coreConcepts: [
          { name: "Paragraph focus", explanation: "Each paragraph should discuss one main idea." },
          { name: "Connectives", explanation: "Use linking words to show relationships between ideas." },
          { name: "Topic sentences", explanation: "Start paragraphs with sentences that explain what the paragraph covers." },
          { name: "Flow", explanation: "Keep sentences connected so ideas build step by step." },
        ],
        example: "Use a topic sentence at the start of each paragraph, then add supporting explanation.",
        lessonSummary: "You now know how structure helps readers understand your writing.",
      };
    }
    if (t.includes("grammar") || t.includes("vocabulary")) {
      return {
        intro: "Grammar and vocabulary make writing clear and effective. This lesson focuses on accuracy and word choice.",
        coreConcepts: [
          { name: "Accurate grammar", explanation: "Use correct tense, punctuation and sentence types." },
          { name: "Precise vocabulary", explanation: "Choose words that match meaning instead of vague alternatives." },
          { name: "Variety", explanation: "Vary sentence length for emphasis and pacing." },
          { name: "Editing", explanation: "Improve your writing by checking and refining it." },
        ],
        example: "Replace vague words with specific ones that better match what you want to say.",
        lessonSummary: "You now know grammar and vocabulary as key tools for clear and stronger writing.",
      };
    }
  }

  if (topicLower === "spoken language") {
    if (t.includes("presentations")) {
      return {
        intro: "Presentations are planned spoken talks. This lesson focuses on preparation and delivery.",
        coreConcepts: [
          { name: "Plan main points", explanation: "Organise your talk so the audience can follow." },
          { name: "Speak clearly", explanation: "Use suitable pace, volume and articulation." },
          { name: "Engage the audience", explanation: "Use examples and appropriate tone." },
          { name: "Practise", explanation: "Rehearse to improve confidence and timing." },
        ],
        example: "Introduce the topic, give 2-3 key points, and end with a short summary.",
        lessonSummary: "You now know how to deliver effective presentations.",
      };
    }
    if (t.includes("discussion")) {
      return {
        intro: "Discussion is sharing ideas and responding to others. This lesson focuses on discussion skills.",
        coreConcepts: [
          { name: "Listen", explanation: "Pay attention and respond to what others actually say." },
          { name: "Questions", explanation: "Ask questions to clarify and explore further." },
          { name: "Build ideas", explanation: "Agree, disagree or extend ideas using evidence or reasoning." },
          { name: "Stay on topic", explanation: "Keep the conversation linked to the question or theme." },
        ],
        example: "Ask “Why do you think that?” and explain your own viewpoint.",
        lessonSummary: "You now know how to take part in discussions respectfully and effectively.",
      };
    }
    if (t.includes("formal speech")) {
      return {
        intro: "Formal speech is used for more serious speaking situations. This lesson focuses on how formal speech sounds and works.",
        coreConcepts: [
          { name: "Appropriate tone", explanation: "Use respectful language for the audience and purpose." },
          { name: "Clear structure", explanation: "Organise your speech into introduction, main points and conclusion." },
          { name: "Careful wording", explanation: "Avoid slang and use appropriate vocabulary." },
          { name: "Rehearsal", explanation: "Practise to improve clarity, confidence and timing." },
        ],
        example: "A speech for a school event uses formal language and a structured set of points.",
        lessonSummary: "You now know key features of formal speech: tone, structure and careful wording.",
      };
    }
  }

  if (topicLower === "literature") {
    if (t.includes("poetry")) {
      return {
        intro: "Poetry uses language and form to create meaning and emotion. This lesson focuses on reading poetry effectively.",
        coreConcepts: [
          { name: "Themes", explanation: "Think about big ideas the poem explores." },
          { name: "Imagery and language", explanation: "Poets use vivid descriptions and figurative language." },
          { name: "Form and structure", explanation: "Rhyme, rhythm and stanzas can affect pace and emphasis." },
          { name: "Evidence", explanation: "Support ideas with quotations or specific references." },
        ],
        example: "If a poem describes “dark skies,” you might infer it suggests sadness or worry.",
        lessonSummary: "You now know how to approach poetry by focusing on themes, language and evidence.",
      };
    }
    if (t.includes("drama")) {
      return {
        intro: "Drama is written for performance. This lesson focuses on understanding characters, dialogue and stage directions.",
        coreConcepts: [
          { name: "Characters", explanation: "Characters make choices and reveal personalities through dialogue." },
          { name: "Conflict", explanation: "Plays often build tension through disagreement or challenges." },
          { name: "Stage directions", explanation: "Stage directions show actions and can add meaning." },
          { name: "Language in dialogue", explanation: "How characters speak can show power and emotion." },
        ],
        example: "Short, quick replies in a scene can suggest anger or tension.",
        lessonSummary: "You now know how to read drama through characters, conflict and stage directions.",
      };
    }
    if (t.includes("prose")) {
      return {
        intro: "Prose includes novels and stories. This lesson focuses on set texts and unseen extracts.",
        coreConcepts: [
          { name: "Plot and events", explanation: "Understand the sequence of events and key moments." },
          { name: "Themes", explanation: "Identify recurring big ideas across the text." },
          { name: "Unseen reading", explanation: "For unseen extracts, use key moments and evidence to explain meaning." },
          { name: "Quotes as evidence", explanation: "Use short references to support interpretations." },
        ],
        example: "In an unseen extract, identify a turning point and explain how language shapes effect.",
        lessonSummary: "You now know how to understand prose using plot, themes and evidence.",
      };
    }
  }

  // History
  if (topicLower === "medieval and early modern") {
    if (t.includes("key events")) {
      return {
        intro: "Key events are major happenings that shaped power, society and everyday life in the period.",
        coreConcepts: [
          { name: "Timeline", explanation: "Place events on a timeline so you can see change over time." },
          { name: "Cause and effect", explanation: "Explain what led to events and what changed afterwards." },
          { name: "Wider impact", explanation: "Think about how events affected different groups of people." },
        ],
        example: "A political conflict can lead to changes in rules and everyday life.",
        lessonSummary: "You now know how to approach key events with cause, effect and impact.",
      };
    }
    if (t.includes("society")) {
      return {
        intro: "Society describes how people lived, worked and organised their communities in the past.",
        coreConcepts: [
          { name: "Groups and roles", explanation: "Identify major social groups and what their roles were." },
          { name: "Everyday life", explanation: "Describe daily life: work, food, housing and routines." },
          { name: "Beliefs and culture", explanation: "Consider religion and culture and how they influenced society." },
        ],
        example: "A change in farming can affect food supply and daily routines.",
        lessonSummary: "You now know how to describe society by focusing on daily life and social structure.",
      };
    }
    if (t.includes("change")) {
      return {
        intro: "Change in history means events and developments that alter society, politics or everyday life.",
        coreConcepts: [
          { name: "Continuity and change", explanation: "Compare what changed with what stayed the same." },
          { name: "Evidence of change", explanation: "Use sources or examples to show that change happened." },
          { name: "Explain the impact", explanation: "Link change to consequences for people’s lives." },
        ],
        example: "New laws can change rights and responsibilities for ordinary people.",
        lessonSummary: "You now know how to explain historical change using evidence and impact.",
      };
    }
  }

  if (topicLower === "empire, industry, and reform") {
    if (t.includes("industrial")) {
      return {
        intro: "Industrial Britain is the period of major industrial growth and change in work and technology.",
        coreConcepts: [
          { name: "New technology", explanation: "Machines and new methods changed how goods were produced." },
          { name: "Work and living conditions", explanation: "Industrial growth affected jobs, wages and daily life." },
          { name: "Urban growth", explanation: "More factories can lead to more people moving into cities." },
        ],
        example: "Factory work might bring pay but can also involve long hours and unsafe conditions.",
        lessonSummary: "You now know key industrial ideas about technology, work and urban growth.",
      };
    }
    if (t.includes("empire")) {
      return {
        intro: "Empire connects territories through rule, trade and resources. This lesson focuses on empire and its effects.",
        coreConcepts: [
          { name: "Trade links", explanation: "Empires created connections through exchanging goods and resources." },
          { name: "Control and governance", explanation: "A central power influenced laws and administration in territories." },
          { name: "Different experiences", explanation: "People across an empire experienced life differently, so consider multiple perspectives." },
        ],
        example: "Trade can create wealth for some groups while causing hardship for others.",
        lessonSummary: "You now know what empire involved and why it mattered through trade and governance.",
      };
    }
    if (t.includes("democracy") || t.includes("reform")) {
      return {
        intro: "Reform and democracy connect to changes in rights and how people participate in government.",
        coreConcepts: [
          { name: "What reform is", explanation: "Reform means changes made to improve rules or rights." },
          { name: "Representation", explanation: "Democracy includes people having a voice through voting or participation." },
          { name: "Why it happens", explanation: "Pressure from people and events can lead to reform." },
        ],
        example: "Voting rights reforms can allow more people to take part in government.",
        lessonSummary: "You now know how reform and democracy relate to rights and representation.",
      };
    }
  }

  if (topicLower === "twentieth century") {
    if (t.includes("world war")) {
      return {
        intro: "World wars were major global conflicts with huge impacts on countries and civilians.",
        coreConcepts: [
          { name: "Complex causes", explanation: "World wars involve political tensions and multiple factors." },
          { name: "Impact on society", explanation: "Wars affect economies, governments and everyday life." },
          { name: "Long-term effects", explanation: "After wars, new challenges and changes shape the future." },
        ],
        example: "A war can reshape borders and lead to new international relationships.",
        lessonSummary: "You now know how to describe world wars using causes, impact and consequences.",
      };
    }
    if (t.includes("cold war")) {
      return {
        intro: "The Cold War was a period of rivalry and tension between major powers.",
        coreConcepts: [
          { name: "Rival superpowers", explanation: "Major powers competed for influence across the world." },
          { name: "Nuclear threat", explanation: "The possibility of nuclear conflict influenced decisions." },
          { name: "Proxy conflicts", explanation: "Competition sometimes happened through conflicts in other places." },
        ],
        example: "Different groups in another country may receive support from rival powers.",
        lessonSummary: "You now know the main ideas of the Cold War: rivalry, nuclear threat and proxy conflicts.",
      };
    }
    if (t.includes("modern britain")) {
      return {
        intro: "Modern Britain includes changes after major conflicts that shaped society and services.",
        coreConcepts: [
          { name: "Rebuilding and change", explanation: "After war, countries focused on rebuilding and improving services." },
          { name: "Social changes", explanation: "Policies and attitudes changed how society worked." },
          { name: "Use examples", explanation: "Support explanations with specific post-war changes." },
        ],
        example: "Reforms to healthcare or education show how modern Britain developed after the war.",
        lessonSummary: "You now know how modern Britain was shaped by post-war priorities and reforms.",
      };
    }
  }

  if (topicLower === "historical skills") {
    if (t.includes("sources")) {
      return {
        intro: "Historical sources are evidence historians use to understand the past.",
        coreConcepts: [
          { name: "Primary and secondary", explanation: "Primary sources come from the time; secondary sources interpret events later." },
          { name: "Reliability", explanation: "Sources may be biased or incomplete, so consider reliability." },
          { name: "Context", explanation: "Think about when and why the source was created." },
        ],
        example: "A document from the time is likely a primary source.",
        lessonSummary: "You now know what sources are and why reliability and context matter.",
      };
    }
    if (t.includes("evidence")) {
      return {
        intro: "Evidence supports your historical explanations and arguments.",
        coreConcepts: [
          { name: "Choose relevant evidence", explanation: "Use evidence that directly supports your point." },
          { name: "Explain evidence", explanation: "Don’t just list facts—explain what they show and why they matter." },
          { name: "Build an argument", explanation: "Use evidence across paragraphs to show a clear line of reasoning." },
        ],
        example: "If you claim change happened, use dates and examples to show how it happened and why it mattered.",
        lessonSummary: "You now know how to use evidence to create clear, supported historical arguments.",
      };
    }
    if (t.includes("essay")) {
      return {
        intro: "Writing a history essay is about structure and argument supported by evidence.",
        coreConcepts: [
          { name: "Paragraph structure", explanation: "Each paragraph should cover one main idea and include explanation." },
          { name: "Introduction and conclusion", explanation: "Set up your argument and summarise your main points at the end." },
          { name: "Use evidence", explanation: "Support claims with sources or facts and explain their meaning." },
        ],
        example: "In each paragraph: claim, evidence, explain, then link to the overall argument.",
        lessonSummary: "You now know the basics of strong history essay writing.",
      };
    }
  }

  // Geography
  if (topicLower === "physical geography") {
    if (t.includes("rivers")) {
      return {
        intro: "Rivers shape landscapes through erosion, transport and deposition. This lesson focuses on those processes.",
        coreConcepts: [
          { name: "Erosion", explanation: "Moving water wears away land and rocks." },
          { name: "Transport", explanation: "Rivers carry sediment and materials downstream." },
          { name: "Deposition", explanation: "When energy decreases, sediment is dropped and deposited." },
        ],
        example: "Fast water can erode banks, while slow water deposits sand and gravel.",
        lessonSummary: "You now know how rivers change landscapes through erosion, transport and deposition.",
      };
    }
    if (t.includes("coast")) {
      return {
        intro: "Coasts are shaped by waves and weathering. This lesson focuses on erosion and deposition along coastlines.",
        coreConcepts: [
          { name: "Wave erosion", explanation: "Waves break down rocks and move material along the coast." },
          { name: "Weathering", explanation: "Rocks weaken over time due to wind, water and temperature changes." },
          { name: "Deposition", explanation: "When wave energy drops, material is deposited and beaches can build up." },
        ],
        example: "Strong waves can cause cliffs to retreat, while calmer conditions build beaches.",
        lessonSummary: "You now know key coastal processes and the landforms they create.",
      };
    }
    if (t.includes("weather")) {
      return {
        intro: "Weather is short-term conditions in the atmosphere. This lesson focuses on what weather includes.",
        coreConcepts: [
          { name: "Short-term changes", explanation: "Weather can change quickly from day to day." },
          { name: "Weather factors", explanation: "Weather describes conditions like rainfall, temperature, wind and cloud." },
          { name: "Measured and forecast", explanation: "Weather uses observations and forecasts to inform people." },
        ],
        example: "A rainy afternoon is an example of weather at a specific time.",
        lessonSummary: "You now know what weather means and how it can change over short time periods.",
      };
    }
    if (t.includes("climate")) {
      return {
        intro: "Climate is long-term patterns of weather. This lesson focuses on how climate differs from weather.",
        coreConcepts: [
          { name: "Long-term averages", explanation: "Climate is based on averages over many years." },
          { name: "Patterns of temperature and rainfall", explanation: "Climate describes how warm/cold and wet/dry an area tends to be." },
          { name: "Ecosystem links", explanation: "Plants and animals adapt to climate conditions." },
        ],
        example: "A desert climate is typically very dry over long periods.",
        lessonSummary: "You now know climate as long-term weather patterns and why it matters for ecosystems.",
      };
    }
    if (t.includes("ecosystem")) {
      return {
        intro: "An ecosystem is living things interacting with their environment. This lesson focuses on how ecosystems work.",
        coreConcepts: [
          { name: "Living and non-living parts", explanation: "Ecosystems include organisms and environmental factors like water and air." },
          { name: "Food chains", explanation: "Energy transfers through feeding relationships." },
          { name: "Balance and change", explanation: "Changes in conditions can affect how the ecosystem works." },
        ],
        example: "A pond ecosystem includes plants, animals and water conditions that affect each other.",
        lessonSummary: "You now know what ecosystems are and how living things link to their environment.",
      };
    }
  }

  if (topicLower === "human geography") {
    if (t.includes("population")) {
      return {
        intro: "Population geography studies how the number of people in a place changes and what affects it.",
        coreConcepts: [
          { name: "Growth", explanation: "Population changes through births, deaths and migration." },
          { name: "Density", explanation: "Population density compares people to land area." },
          { name: "Impacts", explanation: "Population changes affect services, housing and resources." },
        ],
        example: "If more people move to an area, transport and schools may need to expand.",
        lessonSummary: "You now know key ideas about population: growth, density and impacts.",
      };
    }
    if (t.includes("urban")) {
      return {
        intro: "Urban geography looks at cities and how they develop. This lesson focuses on city needs and challenges.",
        coreConcepts: [
          { name: "City growth", explanation: "Cities grow as more people move in." },
          { name: "Services and land use", explanation: "Cities need housing, transport, utilities and planning." },
          { name: "Challenges", explanation: "Urban problems can include traffic, pollution and inequality." },
        ],
        example: "New housing might require new roads and expanded public services.",
        lessonSummary: "You now know how cities develop and what challenges they can face.",
      };
    }
    if (t.includes("development")) {
      return {
        intro: "Development is about improving quality of life. This lesson focuses on what development includes.",
        coreConcepts: [
          { name: "Quality of life indicators", explanation: "Development can be measured using things like health and education." },
          { name: "Sustainability", explanation: "Development should not harm future generations or exhaust resources." },
          { name: "Challenges", explanation: "Some places face difficulties like limited resources or conflict." },
        ],
        example: "Improving schools increases access to education and supports development.",
        lessonSummary: "You now know development as improved quality of life with sustainability.",
      };
    }
    if (t.includes("resources")) {
      return {
        intro: "Resources are things people use. This lesson focuses on using resources wisely.",
        coreConcepts: [
          { name: "Renewable vs non-renewable", explanation: "Renewable resources replenish; non-renewable resources take a very long time to form." },
          { name: "Sustainable use", explanation: "Sustainability means meeting needs without damaging ecosystems." },
          { name: "Environmental impacts", explanation: "Using resources can affect land, water and habitats." },
        ],
        example: "Solar energy is a renewable resource that can reduce fossil fuel use.",
        lessonSummary: "You now know resources and how sustainable use helps protect the environment.",
      };
    }
  }

  if (topicLower === "uk and the world") {
    if (t.includes("uk landscapes")) {
      return {
        intro: "UK landscapes vary across regions. This lesson focuses on describing landforms and features in the UK.",
        coreConcepts: [
          { name: "Regional landforms", explanation: "Different areas have different landforms shaped by geography processes." },
          { name: "Physical features", explanation: "Coasts, rivers and hills create different features." },
          { name: "Human impact", explanation: "People change landscapes through building and land use." },
        ],
        example: "Coastal areas are shaped by waves, while inland valleys can be shaped by rivers.",
        lessonSummary: "You now know how UK landscapes differ and how to describe physical features.",
      };
    }
    if (t.includes("global links")) {
      return {
        intro: "Global links are connections between places around the world. This lesson focuses on trade, people and shared impacts.",
        coreConcepts: [
          { name: "Trade", explanation: "Countries exchange goods and services, creating economic links." },
          { name: "Movement of people", explanation: "Migration and travel create connections between places." },
          { name: "Shared impacts", explanation: "Events and decisions in one place can affect others." },
        ],
        example: "A product sold in the UK might depend on resources from other countries.",
        lessonSummary: "You now know how global links connect places through trade and movement.",
      };
    }
    if (t.includes("fieldwork")) {
      return {
        intro: "Fieldwork is collecting data in the real world. This lesson focuses on planning and recording.",
        coreConcepts: [
          { name: "Plan your investigation", explanation: "Decide your question, methods and safety before collecting data." },
          { name: "Collect data systematically", explanation: "Use tools to measure and record results clearly." },
          { name: "Present findings", explanation: "Use tables, charts or written explanations to show what you found." },
        ],
        example: "Count plants in an area and present your results using a simple table or graph.",
        lessonSummary: "You now know what fieldwork is and why careful planning and recording matter.",
      };
    }
  }

  const focus = lessonTitleCorePhrase(lessonTitle) || topicTitle;
  const generic = pickLessonBand(yearNum, {
    y7: {
      intro: `This lesson is about ${focus} inside the topic ${topicTitle}. You’ll meet the idea in plain language first: what it is, one picture or story that helps you remember it, and a very short example. Don’t worry about formal wording yet — aim to explain it to a friend in simple words.`,
      core: [
        {
          name: "Say what it means (simply)",
          explanation: `In your own words, ${focus} is one piece of ${topicTitle}. Start with: “This is about…” and finish the sentence without copying a textbook. If you can explain it simply, you understand the first layer.`,
        },
        {
          name: "Spot one keyword",
          explanation: `Pick one important word that belongs with ${focus} (from the Explain tab or your teacher). Write it down and use it in a short sentence. At this stage, one strong keyword beats a long list you won’t remember.`,
        },
        {
          name: "Connect to something real",
          explanation: `Think of one everyday example where ${topicTitle} touches your life (school, home, sport, phone, nature). How does ${focus} show up there? Draw a quick sketch or bullet list if that helps.`,
        },
      ],
      example: `Starter task: Describe ${focus} like you’re explaining to someone new to the topic — three short sentences max. End with “So in real life, this matters because…”`,
      summary: `You’ve built a simple mental model of ${focus} within ${topicTitle}: meaning, one keyword, and one real-world link. Next time you’ll add more detail and vocabulary.`,
    },
    y89: {
      intro: `This lesson digs into ${focus} as part of ${topicTitle}. You’ll define the idea precisely, link it to at least two other ideas in the topic, and practise explaining why it matters (not only what it is). Expect short written explanations and multi-step reasoning.`,
      core: [
        {
          name: "Precise definition + conditions",
          explanation: `Write a careful definition of ${focus}: what must be true for the idea to apply, and what would count as a mistake (e.g. mixing it up with a similar term in ${topicTitle}). Compare “always / sometimes / never” if you can.`,
        },
        {
          name: "Link to the rest of the topic",
          explanation: `Name two other ideas from ${topicTitle} that connect to ${focus}. For each link, say “If I change X, then Y changes because…”. This is how you build topic-wide understanding instead of isolated facts.`,
        },
        {
          name: "Worked reasoning pattern",
          explanation: `Use a fixed pattern for written answers: State the idea, show an example or step, explain why the step is valid, then check your answer makes sense. This prepares you for longer, mark-scheme-style questions.`,
        },
        {
          name: "Common misconceptions",
          explanation: `List one misconception people have about ${focus} and correct it in one paragraph. If you’re not sure, use the Practice tab to test your fix with a second example.`,
        },
      ],
      example: `Written task: Answer as if it’s a homework question worth several marks: define ${focus}, give a concrete example from ${topicTitle}, then explain one consequence (what happens next if…).`,
      summary: `You can now define ${focus} more tightly, connect it across ${topicTitle}, and write short chains of reasoning. That’s the bridge from informal intuition to more formal, extended answers.`,
    },
    y1011: {
      intro: `This lesson treats ${focus} as advanced material within ${topicTitle}. You must read questions carefully, select the correct method, show structured working, use correct terminology and units where relevant, and check feasibility. Treat every worked section below as a template you can reuse when practising under time limits.`,
      core: [
        {
          name: "Command words & what strong answers include",
          explanation: `Identify whether you are being asked to state, describe, explain, calculate, evaluate, or compare. For ${focus}, underline the command word and list the minimum you must include (e.g. “explain” needs a because chain with evidence or mechanism, not just a definition).`,
        },
        {
          name: "Method selection",
          explanation: `For ${topicTitle}, there may be more than one approach. Write: “I will use ___ because the question gives ___.” Show the first line of working that commits you to a method — this reduces waffle and makes marking clearer.`,
        },
        {
          name: "Accuracy, units and form of answer",
          explanation: `State answers to the required precision (significant figures or decimal places). Include units whenever they apply. If the question asks for a fraction, surd or standard form, give exactly that — not a rounded decimal unless allowed.`,
        },
        {
          name: "Verify and critique",
          explanation: `After solving, run a 30-second check: sign, magnitude, units, and “does this answer answer the actual question?”. If something is wrong, show the corrected line rather than only erasing — clear correction often earns credit when time allows.`,
        },
      ],
      example: `Advanced task: Attempt a full-credit response for ${focus}: brief plan (bullets), full working, final answer in the required form, and one-sentence check. If ${topicTitle} is essay-based, use a PEEL paragraph (Point–Evidence–Explanation–Link).`,
      summary: `You can now tackle ${focus} with strong discipline: command words, clear method, accurate final form, and a verification habit. Use the Assessment tab under timed conditions next.`,
    },
  });
  return {
    intro: yearLeadIn + generic.intro,
    coreConcepts: generic.core,
    example: generic.example,
    lessonSummary: yearLeadIn + generic.summary,
  };
}

type LessonDetailPayload = {
  intro: string;
  learningObjectives?: string[];
  coreConcepts: { name: string; explanation: string }[];
  example: string;
  lessonSummary: string;
};

/** Extra band-specific guidance so every lesson feels a step harder/softer with the year filter (no year label in text). */
function deepenLessonByYear(detail: LessonDetailPayload, yearNum: number): LessonDetailPayload {
  const band = lessonYearBand(yearNum);
  const introExtra =
    band === "y7"
      ? " Take a moment to connect each new idea to something you can sketch, act out, or point at before moving on."
      : band === "y89"
        ? " After each core concept, add one sentence that links it to another idea you already know (here or in another topic)."
        : " Aim for tight vocabulary, explicit intermediate steps, and a quick sanity-check on every numeric or logical result.";
  const summaryExtra =
    band === "y7"
      ? " Try teaching the lesson aloud in under a minute—note any phrase that still feels vague and reread just that part."
      : band === "y89"
        ? " Write one follow-up question of your own that needs two ideas from this lesson in the same answer."
        : " Redo the hardest step without notes, then align your working and wording with the lesson line by line.";
  const objectivePush =
    band === "y7"
      ? "Say each new term aloud with a picture or action that fits its meaning."
      : band === "y89"
        ? "Name one link between this lesson and a different part of the same topic."
        : "Produce one line of working that would clearly earn credit in a formal mark scheme.";

  return {
    ...detail,
    intro: detail.intro + introExtra,
    lessonSummary: detail.lessonSummary + summaryExtra,
    learningObjectives:
      detail.learningObjectives && detail.learningObjectives.length > 0
        ? [...detail.learningObjectives, objectivePush]
        : detail.learningObjectives,
  };
}

/** Practice questions with hints and explanations (what we're looking for / model answer) */
function getPracticeQuestionsForTopic(topic: { title: string }): { question: string; hint: string; explanation: string }[] {
  const t = topic.title.toLowerCase();
  if (t.includes("forces")) {
    return [
      {
        question: "What is a force? Explain it as a push or a pull, and give one example from everyday life.",
        hint: "Look for 'push'/'pull' and one short example.",
        explanation: "A force is a push or a pull. Examples include kicking a ball (push) or pulling a door open (pull). Forces can change how an object moves.",
      },
      {
        question: "Explain gravity and why unsupported objects fall.",
        hint: "Gravity is a pull towards the Earth.",
        explanation: "Gravity is a pull towards the centre of the Earth. When an object is unsupported, gravity is unopposed, so it falls.",
      },
      {
        question: "What is weight? Write it in terms of gravity.",
        hint: "Weight is a force.",
        explanation: "Weight is the force of gravity on an object.",
      },
      {
        question: "What is friction, and how does it affect a moving object?",
        hint: "Friction acts against motion.",
        explanation: "Friction is a force between surfaces when they rub or slide. It acts opposite to the direction of motion, slowing the object down.",
      },
      {
        question: "When are forces balanced? What happens to the object’s motion?",
        hint: "Think equal size, opposite direction, and no change.",
        explanation:
          "Forces are balanced when they are equal in size and opposite in direction. The result is no change in speed or direction: the object stays at rest or moves at constant speed.",
      },
    ];
  }
  if (t.includes("electricity")) {
    return [
      {
        question: "What is a complete circuit? Explain why a broken circuit stops things working.",
        hint: "Use 'closed loop' / 'complete path'.",
        explanation: "A complete circuit is a closed loop. Electricity can flow only when the circuit is complete; if the path is broken (e.g. an open switch), current stops.",
      },
      {
        question: "Explain what a conductor is and give one example of a good conductor.",
        hint: "Conductors let electricity flow.",
        explanation: "Conductors allow electricity to flow through them. Metals such as copper are good conductors.",
      },
      {
        question: "Explain what an insulator is and why wire insulation is important.",
        hint: "Insulators block electricity flow.",
        explanation: "Insulators do not let electricity flow easily. Insulation (often plastic/rubber) helps prevent shocks and keeps wires safe.",
      },
      {
        question: "List the main components in a simple circuit (e.g. power source, wires, device) and what one does.",
        hint: "Power, connections, and the thing that uses electricity.",
        explanation: "A simple circuit needs a power source (cell/battery), wires to connect, and a device/component (e.g. bulb). A switch can open/close the circuit.",
      },
      {
        question: "What happens when a switch is opened in a circuit?",
        hint: "Think 'circuit broken'.",
        explanation: "Opening the switch breaks the circuit, so the current stops and the bulb/device goes off.",
      },
    ];
  }
  if (t.includes("energy")) {
    return [
      {
        question: "Name four types of energy and give a short example for each.",
        hint: "Think kinetic, gravitational potential, chemical, electrical, thermal, light, sound.",
        explanation: "Examples: kinetic (moving), gravitational potential (height), chemical (fuel/food), electrical (circuits), thermal (heat), light (lamps), sound (vibrations).",
      },
      {
        question: "What does energy transfer mean? Explain using one example (ball falling or lamp).",
        hint: "Energy moves from one store to another.",
        explanation: "Energy transfer is the movement of energy from one object/place/store to another. For example: a ball falling transfers gravitational potential energy to kinetic energy; a lamp transfers electrical energy to light and heat.",
      },
      {
        question: "State the conservation of energy rule in your own words.",
        hint: "Not created or destroyed; changed and transferred.",
        explanation: "Energy cannot be created or destroyed. It can only be changed from one form to another or transferred. The total amount stays the same.",
      },
      {
        question: "Useful energy vs wasted energy: what’s the difference?",
        hint: "Useful is what we want; wasted often becomes heat.",
        explanation:
          "Useful energy is the output we want (e.g. light). Wasted energy is energy that goes to the surroundings in unwanted ways, often as heat, even though energy is still conserved.",
      },
      {
        question: "In a torch, what energy stores and transfers are happening?",
        hint: "Think chemical -> electrical -> light/heat.",
        explanation: "Chemical energy in the battery is transferred as electrical energy through wires, then to light (useful) and heat (unwanted) in the bulb.",
      },
    ];
  }
  if (t.includes("motion")) {
    return [
      {
        question: "Explain what speed means and how to calculate it using distance and time.",
        hint: "Use: speed = distance ÷ time.",
        explanation: "Speed is how far something travels in a certain time. Calculate using speed = distance ÷ time.",
      },
      {
        question: "A cyclist travels 120 m in 30 s. Calculate the speed.",
        hint: "Divide distance by time.",
        explanation: "Speed = 120 ÷ 30 = 4 m/s.",
      },
      {
        question: "What is distance? What unit is most commonly used in these problems?",
        hint: "Distance is how far; think metres.",
        explanation: "Distance is how far something moves, measured in metres (m) for most calculations.",
      },
      {
        question: "What is time, and what unit is commonly used in motion calculations?",
        hint: "Think seconds.",
        explanation: "Time is how long the journey/movement takes, commonly measured in seconds (s).",
      },
      {
        question: "On a distance-time graph, what does a flat (horizontal) line mean?",
        hint: "Distance isn’t changing.",
        explanation: "A flat line means distance is not changing, so the object is not moving.",
      },
    ];
  }
  if (t.includes("living things")) {
    return [
      {
        question: "In your own words, what are “life processes”?",
        hint: "Think feeding, respiration, growth, movement, response, excretion, reproduction.",
        explanation: "Life processes are the activities living things carry out to stay alive, including nutrition/feeding, respiration (releasing energy), growth, response, waste removal and reproduction.",
      },
      {
        question: "What does it mean to classify living things?",
        hint: "Look for the idea of grouping by features.",
        explanation: "Classification means grouping living things based on their features (characteristics) so we can organise and compare them.",
      },
      {
        question: "What is a habitat?",
        hint: "Think conditions + where an organism lives.",
        explanation: "A habitat is where an organism lives and the conditions it needs to survive, such as food, water, shelter and appropriate environment.",
      },
      {
        question: "Give one example of how a habitat links to an organism’s survival.",
        hint: "Example: desert conserving water, pond oxygen access.",
        explanation: "A good answer links habitat conditions to adaptations (for example, desert plants conserving water because water is scarce).",
      },
      {
        question: "Why do scientists classify organisms instead of just listing them?",
        hint: "Think patterns/relationships.",
        explanation: "Classifying helps scientists see patterns and relationships by grouping similar organisms together, making information easier to organise and compare.",
      },
    ];
  }
  if (t.includes("humans & health")) {
    return [
      {
        question: "What is the purpose of body systems working together?",
        hint: "Think digestive -> circulatory -> respiratory -> energy.",
        explanation: "Body systems work together so the body can break down food, transport nutrients, supply oxygen and release energy for life functions.",
      },
      {
        question: "What does a balanced diet mean?",
        hint: "Include nutrients like carbs, proteins, fats, vitamins, minerals, fibre and water.",
        explanation: "A balanced diet includes the main nutrients your body needs in appropriate amounts, plus enough water.",
      },
      {
        question: "Name one way exercise supports health.",
        hint: "Heart/lungs/muscles/fitness.",
        explanation: "Exercise can strengthen the heart and lungs, improve fitness and help muscles and overall wellbeing.",
      },
      {
        question: "Why is rest (sleep/recovery) part of staying healthy?",
        hint: "Think repair and recovery.",
        explanation: "Rest helps the body recover and repair, supporting long-term health and wellbeing.",
      },
      {
        question: "Give a healthy habit and explain why it helps your body.",
        hint: "Example: sleep, healthy eating, staying active.",
        explanation: "A strong answer links the habit to body functions such as energy, growth/repair, and wellbeing.",
      },
    ];
  }
  if (t.includes("plants")) {
    return [
      {
        question: "Describe what roots do for a plant.",
        hint: "Think water/minerals and anchoring.",
        explanation: "Roots anchor the plant and absorb water and minerals from the soil.",
      },
      {
        question: "What do leaves do in a plant?",
        hint: "Photosynthesis.",
        explanation: "Leaves make food by photosynthesis, using light energy, water and carbon dioxide.",
      },
      {
        question: "What is photosynthesis?",
        hint: "Inputs: light, water, carbon dioxide. Outputs: sugar and oxygen.",
        explanation: "Photosynthesis is how plants make sugar (glucose) using light energy, water and carbon dioxide, and it releases oxygen.",
      },
      {
        question: "Explain the plant life cycle in order (seed -> growth -> reproduction -> new seeds).",
        hint: "Use terms like germination/seed spread.",
        explanation: "A correct sequence includes seeds germinating, the plant growing and producing flowers, and then seeds that spread to grow new plants.",
      },
      {
        question: "Why do flowers matter to plant survival?",
        hint: "Reproduction + seeds.",
        explanation: "Flowers support reproduction and help produce seeds, which become new plants.",
      },
    ];
  }
  if (t.includes("evolution & inheritance") || t.includes("evolution")) {
    return [
      {
        question: "What is variation?",
        hint: "Differences between individuals in a species.",
        explanation: "Variation means differences between individuals, such as physical traits, and it can be inherited or influenced by the environment.",
      },
      {
        question: "What is inheritance?",
        hint: "Traits passed from parents to offspring.",
        explanation: "Inheritance is when characteristics are passed from parents to offspring, helping explain why traits appear in future generations.",
      },
      {
        question: "How can inherited traits help survival?",
        hint: "Adaptations and better survival in certain environments.",
        explanation: "If an inherited trait helps an organism survive and reproduce in a particular environment, it can become more common over many generations.",
      },
      {
        question: "Explain what an adaptation is.",
        hint: "A feature that helps survival in an environment.",
        explanation: "An adaptation is a feature that helps an organism survive in its environment, often increasing the chance of reproduction.",
      },
      {
        question: "Why does evolution happen over a long time?",
        hint: "Population changes across generations.",
        explanation: "Evolution happens over many generations because traits that help survival and reproduction spread through a population gradually.",
      },
    ];
  }

  if (t.includes("algorithms")) {
    return [
      {
        question: "What is a sequence in an algorithm?",
        hint: "Order of steps.",
        explanation: "A sequence is the order of steps. In algorithms, the correct order matters because it affects the outcome.",
      },
      {
        question: "What does decomposition mean?",
        hint: "Break a big problem into smaller parts.",
        explanation: "Decomposition means splitting a large problem into smaller, easier parts that can be solved separately and combined.",
      },
      {
        question: "What is debugging?",
        hint: "Find and fix mistakes.",
        explanation: "Debugging is identifying and fixing errors so your algorithm or program works correctly.",
      },
      {
        question: "Give a real example where the order of steps matters.",
        hint: "A recipe, instructions or game actions.",
        explanation: "Any correct example where step order affects results is acceptable (e.g. toast then butter).",
      },
      {
        question: "Explain why decomposition makes problems easier.",
        hint: "Smaller parts are more manageable.",
        explanation: "Smaller parts are easier to understand, test and improve, before combining them into the full solution.",
      },
    ];
  }
  if (t.includes("programming")) {
    return [
      {
        question: "What is programming?",
        hint: "Giving a computer instructions/code to do a task.",
        explanation: "Programming is giving a computer instructions (code) so it can perform a task.",
      },
      {
        question: "What is the difference between block-based and text-based coding?",
        hint: "Visual blocks vs written code with syntax.",
        explanation: "Block-based coding uses visual blocks to assemble instructions, while text-based coding uses written syntax rules in a programming language.",
      },
      {
        question: "What is a variable?",
        hint: "A named storage for a value.",
        explanation: "A variable is a named place that stores a value such as a number or text.",
      },
      {
        question: "Why do we use loops?",
        hint: "Repeat instructions efficiently.",
        explanation: "Loops repeat instructions so you can do the same action multiple times without writing it again and again.",
      },
      {
        question: "Give one example of how variables and loops could help in a game.",
        hint: "Score and repeating actions.",
        explanation: "A strong answer includes a variable for something like score and a loop to repeat actions such as moving enemies or scoring.",
      },
    ];
  }
  if (t.includes("data & information")) {
    return [
      {
        question: "What is data?",
        hint: "Raw facts or figures.",
        explanation: "Data is raw facts or figures collected for analysis (e.g. numbers, words, counts).",
      },
      {
        question: "What is “collecting data”?",
        hint: "Measuring/surveying/recording.",
        explanation: "Collecting data means gathering information through measurements, surveys or recording and organising it for later.",
      },
      {
        question: "Why do we present data using charts/tables?",
        hint: "Make patterns and comparisons clear.",
        explanation: "Presentation makes data easier to understand by showing patterns and comparisons clearly, with appropriate labels and charts.",
      },
      {
        question: "What does using data mean in practice?",
        hint: "Use it to answer a question or make decisions.",
        explanation: "Using data means analysing the data to create information and using it to support conclusions or decisions.",
      },
      {
        question: "Give an example of a question you could answer using data you collected.",
        hint: "Most popular, average, comparison.",
        explanation: "Any reasonable question tied to a realistic example is acceptable (e.g. which fruit is most popular based on survey counts).",
      },
    ];
  }
  if (t.includes("networks & the internet")) {
    return [
      {
        question: "What is a network?",
        hint: "Connected devices sharing data/resources.",
        explanation: "A network connects two or more devices so they can share data and resources.",
      },
      {
        question: "What is the internet?",
        hint: "Network of networks.",
        explanation: "The internet is a worldwide network of networks that allows devices to communicate.",
      },
      {
        question: "How does information travel across a network (basic idea)?",
        hint: "Packets split and reassembled.",
        explanation: "Information is split into packets sent across the network and put back together at the destination device.",
      },
      {
        question: "What happens when you open a website?",
        hint: "Request + response.",
        explanation: "Your device sends a request, a server responds with data, and your device rebuilds it so you can see the page.",
      },
      {
        question: "Why do online activities need networks?",
        hint: "They rely on sending/receiving data.",
        explanation: "Online activities require network communication because data has to be transferred between devices and services.",
      },
    ];
  }

  if (t.includes("enterprise")) {
    return [
      {
        question: "What does enterprise mean in business?",
        hint: "Turning ideas into opportunities.",
        explanation: "Enterprise means spotting opportunities and taking action on ideas so you can create a product or service people want.",
      },
      {
        question: "Give an example of an enterprise idea and what need it solves.",
        hint: "Think: problem or need for customers.",
        explanation: "A good answer states the idea and clearly links it to a need or problem.",
      },
      {
        question: "What is a product?",
        hint: "Something you can touch/provide to customers.",
        explanation: "A product is something you make or provide that customers can use or buy.",
      },
      {
        question: "What does profit mean?",
        hint: "Revenue minus costs.",
        explanation: "Profit is what remains when money made from sales is more than the costs of running the business.",
      },
      {
        question: "Explain one thing businesses must do to sell successfully.",
        hint: "Find customers, set price, advertising.",
        explanation: "Any correct point such as setting a fair price, finding customers or advertising is acceptable.",
      },
    ];
  }
  if (t.includes("money") || t.includes("budget")) {
    return [
      {
        question: "What is income?",
        hint: "Money coming in.",
        explanation: "Income is money you receive, such as wages, pocket money or money from selling something.",
      },
      {
        question: "What is spending?",
        hint: "Money going out.",
        explanation: "Spending is money you pay out on items or services.",
      },
      {
        question: "What does saving mean?",
        hint: "Keep some money for later.",
        explanation: "Saving means keeping some money for the future instead of spending it all now.",
      },
      {
        question: "What is a budget?",
        hint: "A plan for income and spending.",
        explanation: "A budget is a plan that shows expected income and how you plan to spend it, helping you avoid running out.",
      },
      {
        question: "Why is budgeting useful?",
        hint: "Helps you plan and afford needs.",
        explanation: "Budgeting helps you make choices and manage money so you can afford what you need and save.",
      },
    ];
  }
  if (t.includes("markets") || t.includes("customers") || t.includes("marketing")) {
    return [
      {
        question: "What is the difference between a need and a want?",
        hint: "Need is necessary; want is desirable.",
        explanation: "A need is something you must have (like food or safety). A want is something you would like but don’t strictly need.",
      },
      {
        question: "What is a customer?",
        hint: "Who buys a product or service.",
        explanation: "A customer is a person or organisation that buys goods or services.",
      },
      {
        question: "What is marketing?",
        hint: "How businesses tell people about products.",
        explanation: "Marketing is how businesses advertise and persuade people to buy their products and services.",
      },
      {
        question: "Give an example of marketing you’ve seen (ad/social media/packaging).",
        hint: "Pick one you remember.",
        explanation: "Any real example is acceptable; you should mention what it promotes and how it encourages buying.",
      },
      {
        question: "How can a business learn what customers want?",
        hint: "Research/surveys/observing behaviour.",
        explanation: "A business can learn through research like surveys, feedback, and observing which products are most popular.",
      },
    ];
  }

  if (t.includes("reading")) {
    return [
      {
        question: "What does comprehension mean when reading?",
        hint: "Understanding meaning + main ideas/details.",
        explanation: "Comprehension is understanding meaning from a text, including main ideas and key details.",
      },
      {
        question: "What is inference in reading?",
        hint: "Meaning implied, supported by evidence.",
        explanation: "Inference means guessing what is implied using clues and evidence from the text.",
      },
      {
        question: "What is analysis in reading?",
        hint: "Explain how choices create effect.",
        explanation: "Analysis means breaking down how a writer uses language and structure and explaining the effect on the reader.",
      },
      {
        question: "What does writer’s craft mean?",
        hint: "Deliberate choices of language/style.",
        explanation: "Writer’s craft means how writers choose words, structure and style to shape meaning and impact.",
      },
      {
        question: "Give one way you can use evidence from a text to support an answer.",
        hint: "Quote or reference a specific part of the text.",
        explanation: "Using evidence means pointing to words/phrases from the text and explaining how they support your claim.",
      },
    ];
  }
  if (t.includes("writing")) {
    return [
      {
        question: "What is story writing mostly trying to do?",
        hint: "Create a narrative with characters and events.",
        explanation: "Story writing aims to create a narrative with characters, events and a setting, usually with a beginning, middle and ending.",
      },
      {
        question: "What is non-fiction writing?",
        hint: "Inform/explain/persuade using facts.",
        explanation: "Non-fiction writing uses factual information to inform, explain or persuade an audience.",
      },
      {
        question: "Why does structure matter in writing?",
        hint: "Make ideas clear and easy to follow.",
        explanation: "Structure matters because it helps the reader follow your ideas logically using paragraphs and linking words.",
      },
      {
        question: "How can vocabulary improve your writing?",
        hint: "More precise word choice.",
        explanation: "Using precise vocabulary makes your writing clearer and more engaging by matching the exact meaning you want.",
      },
      {
        question: "Give one editing step you could do before finishing a piece of writing.",
        hint: "Check grammar/punctuation or improve clarity.",
        explanation: "A good editing step is checking grammar, punctuation and clarity, then improving sentences where needed.",
      },
    ];
  }
  if (t.includes("spoken language")) {
    return [
      {
        question: "What should you do when preparing a presentation?",
        hint: "Plan points and organise them.",
        explanation: "Prepare by planning main points, organising them, and rehearsing so your talk is clear and timed well.",
      },
      {
        question: "What makes discussion effective?",
        hint: "Listen, respond, ask questions.",
        explanation: "Effective discussion involves listening, responding respectfully, asking questions and building on others’ ideas.",
      },
      {
        question: "What is formal speech?",
        hint: "Appropriate tone and careful wording.",
        explanation: "Formal speech uses respectful tone and careful vocabulary appropriate for the audience and purpose.",
      },
      {
        question: "Give one example of a situation where you would use formal speech.",
        hint: "Assembly/speech/interview.",
        explanation: "Any realistic example is acceptable, such as a school assembly speech or an interview answer.",
      },
      {
        question: "Why is rehearsing helpful for spoken tasks?",
        hint: "Clarity/timing/confidence.",
        explanation: "Rehearsing improves clarity, timing and confidence, helping you deliver your ideas effectively.",
      },
    ];
  }
  if (t.includes("literature")) {
    return [
      {
        question: "How do you start thinking about a poem?",
        hint: "Themes and language techniques.",
        explanation: "Start by identifying themes and noticing how language and form create meaning and emotion.",
      },
      {
        question: "In drama, why are stage directions important?",
        hint: "They describe actions and meaning.",
        explanation: "Stage directions help describe how scenes are performed, including actions and tone, which adds meaning.",
      },
      {
        question: "What is prose in literature?",
        hint: "Stories/novels; events and themes.",
        explanation: "Prose includes novels and stories where you follow plot events and identify themes and ideas.",
      },
      {
        question: "What does it mean to use evidence in literature answers?",
        hint: "Quoting or referencing parts of the text.",
        explanation: "Evidence means referring to specific parts of the text (quotes/phrases) to support your interpretation.",
      },
      {
        question: "Give one reason unseen extracts require careful reading.",
        hint: "You don’t know the story yet.",
        explanation: "Unseen extracts require careful reading to identify key moments and use evidence to explain meaning even without prior knowledge.",
      },
    ];
  }

  if (t.includes("medieval and early modern")) {
    return [
      {
        question: "What is a key event in history?",
        hint: "Major happening that shaped the period.",
        explanation: "A key event is a major happening that influences political power, society or everyday life during a historical period.",
      },
      {
        question: "What does “society” mean in a history topic?",
        hint: "How people lived and organised life.",
        explanation: "Society refers to how people live and organise daily life, including roles, beliefs and everyday routines.",
      },
      {
        question: "How can you explain historical change?",
        hint: "Compare continuity and change + impact.",
        explanation: "To explain change, compare what changed with what stayed the same, then describe the impact on people’s lives.",
      },
      {
        question: "Give an example of how a past event could affect everyday life.",
        hint: "Use cause/effect.",
        explanation: "A strong answer links an event to consequences, such as new rules, economic impacts or changes in work.",
      },
      {
        question: "Why is it useful to use a timeline?",
        hint: "Order and cause/effect.",
        explanation: "Timelines help you see when events happen and understand cause-and-effect relationships over time.",
      },
    ];
  }
  if (t.includes("empire, industry, and reform")) {
    return [
      {
        question: "What is industrial Britain about in this topic?",
        hint: "Industry, technology and working/living changes.",
        explanation: "Industrial Britain focuses on changes from industrialisation: new technology, work conditions and how cities/communities developed.",
      },
      {
        question: "What is an empire?",
        hint: "Rule over territories + connections.",
        explanation: "An empire is a central power that rules territories, creating trade and political links, and affecting people in different ways.",
      },
      {
        question: "How does reform connect to democracy?",
        hint: "Changing rights and representation.",
        explanation: "Reform can expand rights and representation, helping more people participate in democratic decisions.",
      },
      {
        question: "Give one way industry can change a country.",
        hint: "Factories/cities/work.",
        explanation: "A good answer links industry to changes in work, technology and urban growth, and how it affects everyday life.",
      },
      {
        question: "Why should you consider different perspectives when studying empire?",
        hint: "Not everyone experienced it the same way.",
        explanation: "Different groups experienced empire differently, so considering multiple perspectives helps you build a fair understanding.",
      },
    ];
  }
  if (t.includes("twentieth century")) {
    return [
      {
        question: "What does “world war” mean in a history topic?",
        hint: "Global conflict + major effects.",
        explanation: "A world war is a major global conflict that affects many countries and causes large changes in society and government.",
      },
      {
        question: "How would you describe the Cold War in basic terms?",
        hint: "Rivalry and tension between major powers.",
        explanation: "The Cold War was a period of rivalry and tension, with major powers competing for influence rather than direct full-scale war.",
      },
      {
        question: "What is meant by “modern Britain” in this topic?",
        hint: "Post-war changes and developments.",
        explanation: "Modern Britain refers to developments after major conflicts that shaped society and public services in later years.",
      },
      {
        question: "What is one long-term effect wars can have?",
        hint: "New challenges/changes afterwards.",
        explanation: "Wars can lead to political changes, new international relationships, and long-term social and economic effects.",
      },
      {
        question: "Why is cause and effect important in history answers?",
        hint: "Explain what led to what.",
        explanation: "Cause and effect helps you explain how events happened and why they led to changes in the world.",
      },
    ];
  }
  if (t.includes("historical skills")) {
    return [
      {
        question: "What is a historical source?",
        hint: "Evidence for the past.",
        explanation: "A historical source is evidence historians use, such as documents, photos or artefacts, to understand and interpret the past.",
      },
      {
        question: "Why do you need to check the reliability of a source?",
        hint: "Bias/incompleteness/context.",
        explanation: "Sources can be biased or incomplete, so evaluating reliability and context helps you use evidence accurately.",
      },
      {
        question: "What is historical evidence used for in answers?",
        hint: "Support claims + explain impact.",
        explanation: "Evidence supports your claims and helps explain what you think happened and why it matters.",
      },
      {
        question: "What makes a good history essay paragraph?",
        hint: "Claim + evidence + explanation.",
        explanation: "A good paragraph has a main point, supported evidence, and explanation linking evidence to the argument.",
      },
      {
        question: "Why should conclusions summarise your argument?",
        hint: "Connect back to question.",
        explanation: "A conclusion should summarise how your evidence supports your overall argument and answer the question.",
      },
    ];
  }

  if (t.includes("physical geography")) {
    return [
      {
        question: "Name three processes that shape rivers.",
        hint: "Erosion, transport, deposition.",
        explanation: "Rivers shape landscapes through erosion (wearing away), transport (moving sediment) and deposition (dropping sediment).",
      },
      {
        question: "How do coastlines change over time?",
        hint: "Waves/erosion/weathering/deposition.",
        explanation: "Coasts change due to waves causing erosion, weathering weakening rocks, and deposition building features like beaches.",
      },
      {
        question: "What is the difference between weather and climate?",
        hint: "Short-term vs long-term averages.",
        explanation: "Weather is short-term conditions, while climate describes long-term patterns of weather over many years.",
      },
      {
        question: "What is an ecosystem?",
        hint: "Living things + environment interacting.",
        explanation: "An ecosystem includes living organisms and the non-living environment, interacting in a system (often including food chains).",
      },
      {
        question: "Explain one reason climate matters for ecosystems.",
        hint: "Conditions affect what can live there.",
        explanation: "Climate influences temperature and rainfall, which affects what plants and animals can survive there.",
      },
    ];
  }
  if (t.includes("human geography")) {
    return [
      {
        question: "How does population change happen?",
        hint: "Births, deaths and migration.",
        explanation: "Population changes through births, deaths and migration (people moving in or out).",
      },
      {
        question: "What does density mean?",
        hint: "People per area.",
        explanation: "Population density describes how many people live in a certain area (people per land area).",
      },
      {
        question: "What are cities usually like in terms of land use and services?",
        hint: "Housing, transport, utilities.",
        explanation: "Cities have significant land use changes and require services like transport, housing, water and waste management.",
      },
      {
        question: "What does development mean in human geography?",
        hint: "Improving quality of life.",
        explanation: "Development means improving quality of life, often measured through health, education and income, while considering sustainability.",
      },
      {
        question: "Why is sustainable resource use important?",
        hint: "Protect environment and avoid exhaustion.",
        explanation: "Sustainable use helps meet needs without destroying ecosystems or running out of important resources.",
      },
    ];
  }
  if (t.includes("uk and the world")) {
    return [
      {
        question: "How can UK landscapes differ from place to place?",
        hint: "Landforms shaped by processes + geology.",
        explanation: "UK landscapes differ because physical processes and geology create different landforms, such as coasts, rivers and hills.",
      },
      {
        question: "What are global links?",
        hint: "Trade, people, shared impacts.",
        explanation: "Global links are connections between places worldwide, including trade, movement of people and shared impacts.",
      },
      {
        question: "What is fieldwork?",
        hint: "Collecting data in the real world.",
        explanation: "Fieldwork is collecting data and observations in real locations to answer a question and present findings.",
      },
      {
        question: "Give one example of how fieldwork results could be presented.",
        hint: "Table, chart, map, written explanation.",
        explanation: "Results can be presented using tables, graphs, maps or clear written summaries showing what was found.",
      },
      {
        question: "Why do plans and safety matter in fieldwork?",
        hint: "Avoid problems and keep data organised.",
        explanation: "Planning helps you collect consistent data, and safety reduces risks while you carry out the investigation.",
      },
    ];
  }
  if (t.includes("materials")) {
    return [
      {
        question: "Explain what makes a substance a solid.",
        hint: "Think fixed shape and fixed volume, plus particles.",
        explanation:
          "A solid has a fixed shape and fixed volume. In the particle model, particles are packed close and mainly vibrate in place.",
      },
      {
        question: "Explain what makes a substance a liquid.",
        hint: "Think fixed volume but not fixed shape.",
        explanation:
          "A liquid has a fixed volume but no fixed shape. Particles are close together but can move past each other, so the liquid flows.",
      },
      {
        question: "Explain what makes a substance a gas.",
        hint: "Think no fixed shape or volume and particles moving quickly.",
        explanation:
          "A gas has no fixed shape and no fixed volume. Particles are far apart and move quickly, so the gas spreads to fill space.",
      },
      {
        question: "Choose one property for each state (solid, liquid, gas) and explain it.",
        hint: "Examples: shape, volume, flow, spreading.",
        explanation:
          "Any correct property comparison is acceptable, for example: solids have fixed shape; liquids flow and take container shape; gases spread out and are compressible because particles are far apart.",
      },
      {
        question: "Describe one change of state and what happens to the particles.",
        hint: "Example: melting, boiling, freezing or condensation.",
        explanation:
          "Change of state happens when particles gain or lose energy. For example, melting (solid -> liquid) happens when a solid gains enough energy for particles to move more.",
      },
    ];
  }
  if (t.includes("chemical")) {
    return [
      {
        question: "In your own words, what is a chemical reaction?",
        hint: "Reactants become products.",
        explanation:
          "A chemical reaction changes substances into new substances. The starting substances are reactants and the new substances formed are products.",
      },
      {
        question: "What is the difference between an acid and an alkali? Use pH in your answer.",
        hint: "Acids are below 7; alkalis above 7.",
        explanation:
          "Acids have pH less than 7, alkalis have pH greater than 7, and neutral solutions have pH 7.",
      },
      {
        question: "What is an indicator and how does it help you?",
        hint: "Indicators change colour.",
        explanation:
          "An indicator is a substance that changes colour in acids and alkalis, helping you decide whether a solution is acidic, neutral or alkaline.",
      },
      {
        question: "Give an example of an acid and an example of an alkali.",
        hint: "Examples can be everyday household items.",
        explanation:
          "Any correct examples are acceptable, such as vinegar or lemon juice (acids) and soap or baking soda solutions (alkalis).",
      },
      {
        question: "Describe neutralisation using an acid and an alkali.",
        hint: "What new substances are formed?",
        explanation:
          "Neutralisation is when an acid and an alkali react to form new substances, typically a salt and water, and can be detected using indicators and pH changes.",
      },
    ];
  }
  if (t.includes("rocks")) {
    return [
      {
        question: "Explain the three main types of rocks (just the idea of how they form).",
        hint: "Look for sedimentary, igneous, metamorphic.",
        explanation:
          "Sedimentary rocks form from layers of sediment being pressed together. Igneous rocks form when molten rock cools. Metamorphic rocks form when rocks are changed by heat and pressure.",
      },
      {
        question: "What is a fossil and what does it tell us?",
        hint: "Traces or remains of living things.",
        explanation:
          "Fossils are remains or traces of living things from long ago. They help scientists learn about past life and environments.",
      },
      {
        question: "Explain what soil is made of.",
        hint: "Think broken rock, humus, air and water.",
        explanation:
          "Soil is a mixture of broken rock, humus (decayed plants and animals), air and water.",
      },
      {
        question: "Describe how fossils often form in rocks.",
        hint: "Buried in sediment and preserved over time.",
        explanation:
          "Many fossils form when organisms are buried in sediment and preserved over very long periods.",
      },
      {
        question: "Why is soil important for plants?",
        hint: "Roots need conditions and nutrients.",
        explanation:
          "Soil helps plants grow by providing roots a place to grow and by holding water and nutrients.",
      },
    ];
  }
  if (t.includes("particle")) {
    return [
      {
        question: "Explain the particle model in your own words.",
        hint: "Matter is made of tiny particles.",
        explanation:
          "The particle model says all matter is made of tiny particles. It explains states of matter by describing how particles are arranged and how they move.",
      },
      {
        question: "What is an atom?",
        hint: "Smallest particle of an element that still has its properties.",
        explanation:
          "Atoms are the smallest particles of an element that still have the element's properties.",
      },
      {
        question: "What is a molecule?",
        hint: "Groups of atoms joined together.",
        explanation:
          "Molecules are groups of atoms joined together.",
      },
      {
        question: "Use the particle model to explain solids, liquids and gases.",
        hint: "Arrangement and movement.",
        explanation:
          "Solids: particles close and vibrate; liquids: close and slide past each other; gases: far apart and move quickly.",
      },
      {
        question: "Explain what happens to particles when you heat a solid.",
        hint: "Energy increases, vibration increases, can change state.",
        explanation:
          "Heating gives particles more energy. They vibrate more and can eventually overcome forces, causing a change of state such as melting.",
      },
    ];
  }
  if (t.includes("geometry") || t.includes("measure")) {
    return [
      {
        question: "A rectangle is 9 cm long and 5 cm wide. Calculate its perimeter and its area. Show your working.",
        hint: "Perimeter uses 2(l + w). Area uses l × w. Remember to include units.",
        explanation: "Perimeter = 2(9 + 5) = 2 × 14 = 28 cm. Area = 9 × 5 = 45 cm². Perimeter is measured in cm; area in cm² (square centimetres).",
      },
      {
        question: "A triangle has angles of 55° and 72°. What is the third angle? Name the type of angle you calculated.",
        hint: "Angles in a triangle add to 180°. Then classify the result as acute, right or obtuse.",
        explanation: "Third angle = 180° − 55° − 72° = 53°. Since 53° is less than 90°, it is an acute angle. All three angles are acute, so this is an acute triangle.",
      },
      {
        question: "A cuboid has length 6 cm, width 4 cm and height 3 cm. Calculate its volume. Convert your answer to millilitres.",
        hint: "Volume of a cuboid = l × w × h. 1 cm³ = 1 ml.",
        explanation: "Volume = 6 × 4 × 3 = 72 cm³. Since 1 cm³ = 1 ml, the volume is also 72 ml.",
      },
      {
        question: "A runner completes a 5-kilometre race. How many metres is this? A sign says the finish line is 600 m away — how many km is that?",
        hint: "1 km = 1000 m. Multiply to go from km to m; divide to go from m to km.",
        explanation: "5 km = 5 × 1000 = 5000 m. 600 m = 600 ÷ 1000 = 0.6 km. To convert km → m multiply; to convert m → km divide by 1000.",
      },
      {
        question: "Name one 2D and one 3D shape. For each, state two properties (e.g. number of sides/faces, angles, symmetry).",
        hint: "Think about shapes from the Shapes lesson. 2D: sides, angles, symmetry. 3D: faces, edges, vertices.",
        explanation: "Example: Rectangle (2D) — 4 sides, 4 right angles (90°), 2 lines of symmetry, opposite sides equal and parallel. Cuboid (3D) — 6 rectangular faces, 12 edges, 8 vertices. Any two correct properties for each shape are acceptable.",
      },
    ];
  }
  return [
    {
      question: `What is the main idea behind ${topic.title}?`,
      hint: "Think about the definition you learned.",
      explanation: `We're looking for a short definition or summary of ${topic.title} in your own words. For example: what it is, when we use it, or how it works. One or two sentences is enough.`,
    },
    {
      question: "Give one example from everyday life.",
      hint: "Look at the examples in the Explain and Lessons sections.",
      explanation: "Describe a real situation where this topic appears (e.g. shopping, sport, cooking, building). Explain briefly how the idea applies. This shows you can use what you've learned outside the classroom.",
    },
    {
      question: "How would you explain this to a friend?",
      hint: "Use simple words and one example.",
      explanation: "Imagine your friend has never studied this. Use everyday language and one clear example. Avoid long lists; focus on the main idea and one application. This checks that you really understand, not just remember words.",
    },
  ];
}

/** Assessment: 20 questions with explained answers */
function getAssessmentQuestionsForTopic(topic: { title: string }): {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}[] {
  const t = topic.title.toLowerCase();

  // Biology
  if (t.includes("living things")) {
    return [
      {
        question: "Which is a life process?",
        options: ["classification into groups", "growing and moving", "changing into a new substance", "measuring in metres"],
        correctIndex: 1,
        explanation: "Life processes are activities living things carry out, such as growth and movement.",
      },
      {
        question: "Classification is mainly about:",
        options: ["grouping living things by features", "making new habitats", "changing an organism’s DNA", "measuring speed"],
        correctIndex: 0,
        explanation: "Classification groups organisms by observable features to organise and compare them.",
      },
      {
        question: "What does a habitat provide?",
        options: ["food, water, shelter and suitable conditions", "only air and water", "only plants and animals", "a guaranteed way to survive forever"],
        correctIndex: 0,
        explanation: "A habitat supports living by providing the resources and conditions an organism needs.",
      },
      {
        question: "Why do scientists classify organisms?",
        options: ["to see patterns and relationships", "to prevent organisms changing", "to make habitats bigger", "to remove the need for evidence"],
        correctIndex: 0,
        explanation: "Classification helps scientists see patterns by grouping similar organisms together.",
      },
      {
        question: "Which could be an example of a habitat?",
        options: ["a pond", "a recipe", "a worksheet", "a map scale bar"],
        correctIndex: 0,
        explanation: "Habitats are places where organisms live, such as ponds.",
      },
      {
        question: "A good habitat-linked answer should mention:",
        options: ["conditions + how an organism is suited", "only an organism’s name", "only the location name", "how quickly speed changes"],
        correctIndex: 0,
        explanation: "To link habitats to survival, you explain how conditions match the organism’s adaptations.",
      },
    ];
  }

  if (t.includes("humans & health")) {
    return [
      {
        question: "Body systems work together because:",
        options: ["they are all the same shape", "they help nutrients and oxygen support energy release", "they never need rest", "they only affect muscles"],
        correctIndex: 1,
        explanation: "Digestive systems provide nutrients, circulatory transports them, and respiration supplies oxygen for energy use.",
      },
      {
        question: "A balanced diet means:",
        options: ["eating only one food type", "the right mix of nutrients and enough water", "no need for fibre", "only drinking water"],
        correctIndex: 1,
        explanation: "Balanced diets include the main nutrients in appropriate amounts plus enough water.",
      },
      {
        question: "Exercise mainly supports health by:",
        options: ["weakening heart and lungs", "improving fitness and strengthening systems", "making sleep unnecessary", "removing all need for eating"],
        correctIndex: 1,
        explanation: "Exercise improves fitness and strengthens key body systems while supporting wellbeing.",
      },
      {
        question: "Why is rest (sleep/recovery) important?",
        options: ["it helps the body repair and recover", "it increases the need for more exercise", "it stops digestion", "it makes nutrients appear in the blood automatically"],
        correctIndex: 0,
        explanation: "Rest supports repair and recovery, which helps you stay healthy long-term.",
      },
      {
        question: "Which is part of nutrition?",
        options: ["only vitamins", "carbohydrates, proteins, fats, vitamins, minerals, fibre and water", "only sweet drinks", "only energy drinks"],
        correctIndex: 1,
        explanation: "Nutrition covers the main nutrient types and includes enough water.",
      },
      {
        question: "A strong “healthy habit” explanation links to:",
        options: ["how the habit supports body functions", "how it tastes", "how long you watched a video", "how many songs you listen to"],
        correctIndex: 0,
        explanation: "Health answers should explain the link between the habit and body function or wellbeing.",
      },
    ];
  }

  if (t.includes("plants")) {
    return [
      {
        question: "What is the main job of roots?",
        options: ["make sugar by photosynthesis", "absorb water and minerals and anchor the plant", "produce seeds only", "move oxygen around the plant"],
        correctIndex: 1,
        explanation: "Roots anchor plants and absorb water and minerals.",
      },
      {
        question: "Leaves are important because they:",
        options: ["carry blood through the plant", "make food via photosynthesis", "only grow flowers", "turn gas into solid"],
        correctIndex: 1,
        explanation: "Leaves make food (sugar) using photosynthesis.",
      },
      {
        question: "Photosynthesis uses:",
        options: ["light energy, water and carbon dioxide", "oil, salt and oxygen", "sound, heat and friction", "only water and oxygen"],
        correctIndex: 0,
        explanation: "Plants use light, water and carbon dioxide to make sugar and release oxygen.",
      },
      {
        question: "A plant life cycle often includes:",
        options: ["germination from a seed and producing new seeds", "only leaves falling off", "never producing seeds", "no growth stage"],
        correctIndex: 0,
        explanation: "Many plant life cycles involve seeds germinating, growth, and reproduction producing new seeds.",
      },
      {
        question: "What do flowers mainly help with?",
        options: ["photosynthesis only", "reproduction (seed production)", "transport of blood", "changing the rock type"],
        correctIndex: 1,
        explanation: "Flowers support reproduction and help form seeds for the next generation.",
      },
      {
        question: "In a sunflower, the leaf’s job is mainly to:",
        options: ["absorb minerals", "make food by photosynthesis", "hold the plant up only", "break down soil"],
        correctIndex: 1,
        explanation: "Leaves make food through photosynthesis.",
      },
    ];
  }

  if (t.includes("evolution & inheritance") || t.includes("evolution")) {
    return [
      {
        question: "Variation means:",
        options: ["all individuals are identical", "individuals differ in features", "plants always survive", "evidence is not needed"],
        correctIndex: 1,
        explanation: "Variation is differences between individuals in a population.",
      },
      {
        question: "Inheritance is when:",
        options: ["features are passed from parents to offspring", "habitats are changed overnight", "energy is created from nothing", "all organisms become the same"],
        correctIndex: 0,
        explanation: "Offspring receive characteristics from their parents.",
      },
      {
        question: "Adaptations help organisms by:",
        options: ["making survival worse", "increasing survival in a particular environment", "stopping reproduction", "changing rocks into soil"],
        correctIndex: 1,
        explanation: "Adaptations are features that help organisms survive and reproduce in their environment.",
      },
      {
        question: "Evolution happens over:",
        options: ["many generations", "one day only", "a single hour", "only during childhood"],
        correctIndex: 0,
        explanation: "Evolution is change in populations over long time periods across generations.",
      },
      {
        question: "Which could be an example of inherited variation?",
        options: ["eye colour differences between family members", "a new scar you got today", "a storm changing rainfall", "a temperature changing season"],
        correctIndex: 0,
        explanation: "Eye colour is inherited from parents, whereas scars from today are not inherited in that way.",
      },
      {
        question: "A helpful adaptation tends to:",
        options: ["become less common immediately", "increase the chance of survival and reproduction", "stop all offspring being born", "prevent all future variation"],
        correctIndex: 1,
        explanation: "If an adaptation improves survival/reproduction, it can spread over generations.",
      },
    ];
  }

  // Computer Science
  if (t.includes("algorithms")) {
    return [
      {
        question: "A sequence in an algorithm is best described as:",
        options: ["the order of steps", "the speed of running", "a type of battery", "a graph shape"],
        correctIndex: 0,
        explanation: "Sequence means the order of steps matters for the outcome.",
      },
      {
        question: "Decomposition means:",
        options: ["making the code longer", "breaking a big problem into smaller parts", "removing all errors", "measuring data in charts"],
        correctIndex: 1,
        explanation: "Decomposition splits a large problem into smaller parts that can be handled separately.",
      },
      {
        question: "Debugging is:",
        options: ["choosing the best colour", "finding and fixing mistakes", "guessing without testing", "copying without understanding"],
        correctIndex: 1,
        explanation: "Debugging involves identifying bugs and correcting them.",
      },
      {
        question: "Why can the wrong order of steps give the wrong answer?",
        options: ["because computers only follow text", "because each step depends on what came before", "because sequence never matters", "because errors disappear automatically"],
        correctIndex: 1,
        explanation: "If steps happen in the wrong order, later steps may be based on the wrong earlier state.",
      },
      {
        question: "Which is a correct statement about algorithms?",
        options: ["they are random", "they are step-by-step instructions to solve a task", "they always use only loops", "they stop errors forever"],
        correctIndex: 1,
        explanation: "Algorithms are clear step-by-step instructions to solve a problem.",
      },
      {
        question: "A good debugging strategy is to:",
        options: ["ignore test results", "test with examples, find the cause, then fix", "only change random lines", "never re-test"],
        correctIndex: 1,
        explanation: "Test, identify the cause, fix, and re-test is the usual debugging approach.",
      },
    ];
  }

  if (t.includes("programming")) {
    return [
      {
        question: "Programming is mainly about:",
        options: ["giving a computer instructions", "changing habitats", "measuring with rulers only", "writing essays"],
        correctIndex: 0,
        explanation: "Programming creates instructions (code) for a computer to do a task.",
      },
      {
        question: "Block-based coding uses:",
        options: ["drag-and-drop visual blocks", "only handwritten equations", "only spreadsheets", "paper folding"],
        correctIndex: 0,
        explanation: "Blocks are assembled visually rather than typed as full text code.",
      },
      {
        question: "A variable is:",
        options: ["a named place to store a value", "a type of robot", "a chart label", "a kind of keyboard"],
        correctIndex: 0,
        explanation: "Variables store values that a program can use and update.",
      },
      {
        question: "Loops are used to:",
        options: ["repeat instructions", "store data only", "stop programs", "remove all errors"],
        correctIndex: 0,
        explanation: "Loops repeat instructions, making programs shorter and more efficient.",
      },
      {
        question: "A program is:",
        options: ["one line of random text", "a set of instructions", "a single picture", "always the same for every task"],
        correctIndex: 1,
        explanation: "A program is a set of instructions for the computer.",
      },
      {
        question: "Which is a good reason to use a loop?",
        options: ["to avoid repeating the same code many times", "because variables never change", "because debugging is unnecessary", "so everything happens instantly"],
        correctIndex: 0,
        explanation: "Loops let you repeat actions without writing the same instructions over and over.",
      },
    ];
  }

  if (t.includes("data & information")) {
    return [
      {
        question: "Data is best described as:",
        options: ["raw facts/figures", "final decisions only", "a single graph title", "a type of network"],
        correctIndex: 0,
        explanation: "Data is raw facts or figures collected for analysis.",
      },
      {
        question: "Collecting data involves:",
        options: ["recording/measuring/surveying", "only drawing graphs", "only making opinions", "only guessing"],
        correctIndex: 0,
        explanation: "Collecting data means gathering information using measurements, surveys or recording.",
      },
      {
        question: "Presenting data helps because it:",
        options: ["hides patterns", "makes patterns/comparisons easier to understand", "removes the need for labels", "turns data into random ideas"],
        correctIndex: 1,
        explanation: "Presentation makes it easier to see patterns and compare values.",
      },
      {
        question: "Using data means you:",
        options: ["use data to support conclusions/decisions", "ignore the evidence", "only change the title", "avoid comparing values"],
        correctIndex: 0,
        explanation: "Using data means analysing and using it to support an answer or decision.",
      },
      {
        question: "A table is useful for presenting data because it can:",
        options: ["only show feelings", "organise values clearly", "remove all numbers", "replace all evidence"],
        correctIndex: 1,
        explanation: "Tables organise values clearly and make patterns easier to read.",
      },
      {
        question: "An example of presenting data is:",
        options: ["a bar chart", "an unexplained opinion", "a random story", "an unrelated quote"],
        correctIndex: 0,
        explanation: "A bar chart is a common way to present data so patterns are clear.",
      },
    ];
  }

  if (t.includes("networks & the internet")) {
    return [
      {
        question: "A network is:",
        options: ["one computer alone", "connected devices that share data/resources", "a type of power socket", "only a website"],
        correctIndex: 1,
        explanation: "Networks connect two or more devices to share data and resources.",
      },
      {
        question: "The internet is:",
        options: ["a single computer", "a worldwide network of networks", "a kind of battery", "a type of document format"],
        correctIndex: 1,
        explanation: "The internet is a worldwide network of networks.",
      },
      {
        question: "Information is sent across networks using:",
        options: ["packets", "single huge files only", "only paper", "sound waves only"],
        correctIndex: 0,
        explanation: "Data is split into packets to travel across networks.",
      },
      {
        question: "When you open a website, your device typically:",
        options: ["sends a request and receives data", "stops all communication", "prints paper instantly", "changes the device into a router"],
        correctIndex: 0,
        explanation: "Your device requests a webpage and receives data back to display it.",
      },
      {
        question: "Why do online activities need networks?",
        options: ["because they need network communication to transfer data", "because they cannot use devices", "because they do not send data", "because they only use heat"],
        correctIndex: 0,
        explanation: "Online activities require sending/receiving data across networks.",
      },
      {
        question: "Routers help networks by:",
        options: ["creating new computers", "routing packets to their destination", "measuring time", "editing photos"],
        correctIndex: 1,
        explanation: "Routers route packets so they reach the correct destination.",
      },
    ];
  }

  // Business Studies
  if (t.includes("enterprise")) {
    return [
      {
        question: "Enterprise in business is about:",
        options: ["turning ideas into opportunities", "only following rules", "avoiding risk completely", "not needing customers"],
        correctIndex: 0,
        explanation: "Enterprise means spotting opportunities and acting on ideas to create something people want.",
      },
      {
        question: "A product is:",
        options: ["something customers can touch or buy", "only a service", "a type of spreadsheet", "a type of graph"],
        correctIndex: 0,
        explanation: "A product is something you make/provide that customers use or buy.",
      },
      {
        question: "A service is best described as:",
        options: ["something you can touch", "an activity done for customers", "an electricity circuit", "only money you receive"],
        correctIndex: 1,
        explanation: "Services are activities provided to customers.",
      },
      {
        question: "Profit is:",
        options: ["revenue minus costs", "always zero", "money from borrowing", "only the price of the product"],
        correctIndex: 0,
        explanation: "Profit is what remains when revenue is more than costs.",
      },
      {
        question: "A business must find:",
        options: ["customers", "only furniture", "only new habitats", "only posters with no content"],
        correctIndex: 0,
        explanation: "Customers are needed because businesses sell goods and services to them.",
      },
      {
        question: "Which is a realistic enterprise idea?",
        options: ["a product/service that solves a need", "ignoring costs completely", "making something without thinking about customers", "choosing random prices with no purpose"],
        correctIndex: 0,
        explanation: "Enterprise ideas are usually linked to meeting a need or solving a problem for customers.",
      },
    ];
  }

  if (t.includes("money") && t.includes("budget")) {
    return [
      {
        question: "Income is:",
        options: ["money coming in", "money going out", "only money saved", "a unit of time"],
        correctIndex: 0,
        explanation: "Income is money you receive.",
      },
      {
        question: "Spending is:",
        options: ["money you pay out", "only the amount you save", "money earned by borrowing", "a type of measurement"],
        correctIndex: 0,
        explanation: "Spending is money you pay out on things and services.",
      },
      {
        question: "Saving means:",
        options: ["spending all money now", "keeping money for later", "changing the budget", "only buying food"],
        correctIndex: 1,
        explanation: "Saving is keeping money for later rather than spending it straight away.",
      },
      {
        question: "A budget is:",
        options: ["a plan for income and spending", "a list of only debts", "a device for measuring", "a map of the town"],
        correctIndex: 0,
        explanation: "A budget is a plan showing expected income and spending.",
      },
      {
        question: "Budgeting helps you avoid:",
        options: ["running out of money", "all exercise", "finding customers", "writing reports"],
        correctIndex: 0,
        explanation: "A budget helps you manage choices so you don’t run out of money.",
      },
      {
        question: "If income is greater than spending, you can:",
        options: ["save some money", "increase spending forever", "delete the budget", "make profit without any costs"],
        correctIndex: 0,
        explanation: "When income exceeds spending, the difference can be saved.",
      },
    ];
  }

  if (t.includes("markets") || (t.includes("customers") && t.includes("marketing"))) {
    return [
      {
        question: "A need is:",
        options: ["something you must have to be safe or live", "something you want but don’t need", "only money", "a type of network"],
        correctIndex: 0,
        explanation: "Needs are required to live or stay safe.",
      },
      {
        question: "A want is:",
        options: ["something desirable but not essential", "something required to breathe", "always the same for everyone", "an amount of rainfall"],
        correctIndex: 0,
        explanation: "Wants are desirable but not strictly necessary.",
      },
      {
        question: "Customers are:",
        options: ["people or organisations that buy", "only businesses that sell", "only delivery vans", "types of rocks"],
        correctIndex: 0,
        explanation: "Customers buy goods or services.",
      },
      {
        question: "Marketing is:",
        options: ["telling people about products to persuade them", "only charging a high price", "hiding information from customers", "measuring data in graphs"],
        correctIndex: 0,
        explanation: "Marketing includes advertising and ways of communicating a product’s value.",
      },
      {
        question: "A business can learn what customers want by:",
        options: ["researching and gathering feedback", "ignoring opinions", "never observing behaviour", "never changing products"],
        correctIndex: 0,
        explanation: "Businesses learn through research like surveys, feedback and observation.",
      },
      {
        question: "A simple marketing aim is to:",
        options: ["increase customers’ awareness and interest", "avoid all selling", "stop customers buying", "ensure profit always happens automatically"],
        correctIndex: 0,
        explanation: "Marketing aims to reach customers and encourage buying.",
      },
    ];
  }

  // English
  if (t.includes("reading")) {
    return [
      {
        question: "Comprehension mainly means:",
        options: ["guessing without evidence", "understanding the meaning of what you read", "only reading difficult words", "ignoring main ideas"],
        correctIndex: 1,
        explanation: "Comprehension is understanding the meaning using main ideas and details.",
      },
      {
        question: "Inference is:",
        options: ["stating only what is directly written", "making a conclusion using evidence", "guessing randomly", "changing the topic"],
        correctIndex: 1,
        explanation: "Inferences use evidence and reasoning to explain what is implied.",
      },
      {
        question: "Analysis in reading involves:",
        options: ["explaining the effect of writer choices", "only copying sentences", "ignoring structure", "only matching synonyms"],
        correctIndex: 0,
        explanation: "Analysis breaks down techniques and explains the meaning/effect for the reader.",
      },
      {
        question: "Main idea means:",
        options: ["the central message or purpose", "a single random word", "the length of the text", "the number of pages"],
        correctIndex: 0,
        explanation: "Main idea is the central message of a paragraph or text.",
      },
      {
        question: "Evidence is used to:",
        options: ["support answers with references to the text", "remove the need for reading", "only add opinions", "replace structure"],
        correctIndex: 0,
        explanation: "Evidence supports interpretations by referencing specific parts of the text.",
      },
      {
        question: "Writer’s craft is mainly about:",
        options: ["how writers choose words and techniques to shape meaning", "printing the text in a book", "choosing random punctuation", "ignoring audience"],
        correctIndex: 0,
        explanation: "Writer’s craft refers to deliberate choices in language and style.",
      },
    ];
  }

  if (t.includes("writing")) {
    return [
      {
        question: "Story writing focuses on creating a narrative with:",
        options: ["characters, events and a setting", "only numbers and charts", "only maps", "only vocabulary lists"],
        correctIndex: 0,
        explanation: "Stories are built from narrative elements: characters, events and setting.",
      },
      {
        question: "Non-fiction writing is mainly for:",
        options: ["informing, explaining or persuading with facts", "making up fantasy characters only", "creating music", "doing lab experiments"],
        correctIndex: 0,
        explanation: "Non-fiction uses factual information to achieve a purpose.",
      },
      {
        question: "Structure in writing helps because it:",
        options: ["makes ideas flow logically and helps the reader follow", "stops the reader from understanding", "removes the need for paragraphs", "only affects handwriting"],
        correctIndex: 0,
        explanation: "Good structure makes writing easier to follow.",
      },
      {
        question: "Grammar and punctuation are important for:",
        options: ["clarity and accurate meaning", "making writing longer", "choosing different fonts only", "avoiding editing"],
        correctIndex: 0,
        explanation: "Grammar and punctuation support correct and clear meaning.",
      },
      {
        question: "Precise vocabulary means:",
        options: ["using vague words only", "using words that match the exact meaning you want", "avoiding descriptive words", "repeating the same word always"],
        correctIndex: 1,
        explanation: "Precise vocabulary matches intended meaning and improves writing quality.",
      },
      {
        question: "Editing before finishing a piece of writing is about:",
        options: ["checking and improving things like grammar, clarity and punctuation", "copying it without checking", "never rereading", "removing paragraphs"],
        correctIndex: 0,
        explanation: "Editing is reviewing and improving your writing before submitting.",
      },
    ];
  }

  if (t.includes("spoken language")) {
    return [
      {
        question: "A presentation is typically:",
        options: ["a planned spoken talk", "only a written document", "a map drawing", "a science experiment"],
        correctIndex: 0,
        explanation: "Presentations are planned spoken talks delivered to an audience.",
      },
      {
        question: "Effective discussion includes:",
        options: ["listening and responding respectfully", "interrupting without listening", "ignoring others’ points", "talking only to yourself"],
        correctIndex: 0,
        explanation: "Discussion skills include listening, responding and building on others’ ideas.",
      },
      {
        question: "Formal speech is characterised by:",
        options: ["appropriate tone and careful wording", "lots of slang in every sentence", "no structure at all", "only texting language"],
        correctIndex: 0,
        explanation: "Formal speech uses respectful tone and carefully chosen vocabulary.",
      },
      {
        question: "Rehearsal helps you:",
        options: ["improve clarity, timing and confidence", "avoid all preparation", "make your speech random", "stop nerves from existing completely"],
        correctIndex: 0,
        explanation: "Practise improves how you deliver and organise what you say.",
      },
      {
        question: "In discussion, questions help by:",
        options: ["clarifying meaning and exploring ideas", "changing the topic randomly", "stopping the conversation", "avoiding evidence"],
        correctIndex: 0,
        explanation: "Questions clarify and explore, helping discussion stay meaningful.",
      },
      {
        question: "You can build on others’ ideas by:",
        options: ["agreeing/disagreeing and extending respectfully", "only ignoring them", "copying them without thinking", "never responding"],
        correctIndex: 0,
        explanation: "A good discussion extends ideas respectfully using what others said.",
      },
    ];
  }

  if (t.includes("literature")) {
    return [
      {
        question: "Poetry is often used to explore:",
        options: ["themes and emotions", "only maths facts", "only weather measurements", "only bus routes"],
        correctIndex: 0,
        explanation: "Poetry uses language and form to create meaning and emotion.",
      },
      {
        question: "In drama, stage directions are useful because they:",
        options: ["only show the theme", "describe actions and delivery", "are always random", "replace character dialogue"],
        correctIndex: 1,
        explanation: "Stage directions guide how actions and scenes should be performed.",
      },
      {
        question: "Prose includes:",
        options: ["novels and stories", "only poetry", "only speeches", "only diagrams"],
        correctIndex: 0,
        explanation: "Prose refers to narrative writing such as novels and stories.",
      },
      {
        question: "Using evidence in literature answers means:",
        options: ["referencing specific parts of the text", "guessing with no support", "only using your own feelings", "writing a random ending"],
        correctIndex: 0,
        explanation: "Evidence means using quotations or references to support your interpretation.",
      },
      {
        question: "Unseen prose extracts require careful reading because:",
        options: ["you may not know the text already", "you can ignore evidence", "they never include key moments", "they always have cartoons"],
        correctIndex: 0,
        explanation: "You don’t have background knowledge, so you must focus on key moments and evidence.",
      },
      {
        question: "A theme is:",
        options: ["a big idea repeated across a text", "a colour of a page", "a measurement unit", "a type of calculator"],
        correctIndex: 0,
        explanation: "Themes are big ideas explored throughout a text.",
      },
    ];
  }

  // History
  if (t.includes("medieval and early modern")) {
    return [
      {
        question: "Key events are important because they:",
        options: ["changed power, society or everyday life", "are always small details only", "cannot be linked to cause and effect", "only affect maps"],
        correctIndex: 0,
        explanation: "Key events shape the period and can link to wider changes and impacts.",
      },
      {
        question: "“Society” in history mainly refers to:",
        options: ["how people lived and were organised", "only the weather", "only battles", "only the length of time"],
        correctIndex: 0,
        explanation: "Society describes everyday life and social organisation in the past.",
      },
      {
        question: "Historical change usually means:",
        options: ["things getting worse in one room", "developments that alter life over time", "random events with no impact", "no differences between periods"],
        correctIndex: 1,
        explanation: "Change describes developments that alter society, politics or everyday life.",
      },
      {
        question: "Continuity and change means:",
        options: ["everything changed", "everything stayed the same", "some changed while some stayed similar", "time travel only"],
        correctIndex: 2,
        explanation: "Continuity and change compares what stayed the same and what changed.",
      },
      {
        question: "A timeline helps you:",
        options: ["see when things happened and cause/effect", "ignore dates", "guess without evidence", "remove historical context"],
        correctIndex: 0,
        explanation: "Timelines show order and help you explain how events influence each other.",
      },
      {
        question: "A strong history explanation should include:",
        options: ["evidence and impact on people", "only opinions with no examples", "just the date", "no comparison"],
        correctIndex: 0,
        explanation: "High-quality answers use evidence and explain consequences for people.",
      },
    ];
  }

  if (t.includes("empire") && t.includes("industry")) {
    return [
      {
        question: "Industrial Britain mainly refers to:",
        options: ["changes linked to industry and technology", "only oceans and weather", "only poetry", "only sports"],
        correctIndex: 0,
        explanation: "Industrial Britain focuses on industrialisation and its effects on work and society.",
      },
      {
        question: "An empire is:",
        options: ["a central power ruling territories", "a single town only", "a type of graph", "a type of weather pattern"],
        correctIndex: 0,
        explanation: "Empires are groups of territories ruled by a central power.",
      },
      {
        question: "Reform means:",
        options: ["making things better through change", "ignoring problems", "keeping everything exactly the same", "stopping all voting forever"],
        correctIndex: 0,
        explanation: "Reform is change intended to improve rules, rights or systems.",
      },
      {
        question: "Democracy is linked to:",
        options: ["representation and people having a voice", "only one person making all decisions", "no voting ever", "only sport teams voting"],
        correctIndex: 0,
        explanation: "Democracy involves representation and participation.",
      },
      {
        question: "One impact of industrialisation could be:",
        options: ["urban growth and changing work conditions", "no change in work", "only changes in oceans", "no effect on people’s lives"],
        correctIndex: 0,
        explanation: "Industrialisation changed work and often increased people living in cities.",
      },
      {
        question: "When studying empire, it helps to consider:",
        options: ["more than one perspective", "only one opinion", "ignoring sources", "only maps and dates with no context"],
        correctIndex: 0,
        explanation: "Different groups experienced empire differently, so multiple perspectives improve understanding.",
      },
    ];
  }

  if (t.includes("twentieth century")) {
    return [
      {
        question: "A world war is:",
        options: ["a major global conflict", "a local argument", "only a short football tournament", "a type of weather event"],
        correctIndex: 0,
        explanation: "World wars involve major global conflicts with wide impacts.",
      },
      {
        question: "The Cold War was mainly about:",
        options: ["rivalry and tension between major powers", "only travelling to space", "only school rules", "only local sport"],
        correctIndex: 0,
        explanation: "The Cold War was a period of rivalry and tension rather than full-scale direct war.",
      },
      {
        question: "Cold War “proxy conflicts” means:",
        options: ["fighting directly between superpowers only", "competition through conflicts in other places", "no conflict at all", "nobody supports anything"],
        correctIndex: 1,
        explanation: "Proxy conflicts happen when rivals support different groups in other countries.",
      },
      {
        question: "Modern Britain in this topic refers to:",
        options: ["post-war changes and developments", "only ancient times", "only medieval buildings", "only geography of rivers"],
        correctIndex: 0,
        explanation: "Modern Britain focuses on developments after major conflicts shaping later society.",
      },
      {
        question: "A cause-and-effect skill means you:",
        options: ["explain what led to what", "ignore what happened first", "choose random options", "remove all evidence"],
        correctIndex: 0,
        explanation: "Cause and effect explains how earlier events lead to later changes.",
      },
      {
        question: "History answers should use:",
        options: ["evidence and specific examples", "only general guesses", "no dates at all", "no explanation"],
        correctIndex: 0,
        explanation: "Evidence and examples make explanations convincing and linked to the past.",
      },
    ];
  }

  if (t.includes("historical skills")) {
    return [
      {
        question: "A primary source is:",
        options: ["made at the time being studied", "made hundreds of years later to summarise", "a random opinion", "a cartoon-only image"],
        correctIndex: 0,
        explanation: "Primary sources come from the time period itself.",
      },
      {
        question: "Reliability means you should consider:",
        options: ["bias, missing info and context", "only how colourful the source is", "whether it is a poster", "whether the date is missing"],
        correctIndex: 0,
        explanation: "Reliability involves judging trustworthiness, including bias and incomplete information.",
      },
      {
        question: "Evidence is used to:",
        options: ["support claims and explain meaning", "replace all reading", "avoid explanation", "make arguments random"],
        correctIndex: 0,
        explanation: "Evidence supports your claims and helps explain what it shows.",
      },
      {
        question: "In an essay, each paragraph should include:",
        options: ["a clear main point plus evidence and explanation", "only a list of facts", "no evidence", "only opinions without reasons"],
        correctIndex: 0,
        explanation: "Good paragraphs have structure: point, evidence, then explanation linking back to the question.",
      },
      {
        question: "A good introduction should:",
        options: ["set up the argument you will build", "contain no focus", "skip the question", "avoid using any plan"],
        correctIndex: 0,
        explanation: "Introductions set the argument and direction for the essay.",
      },
      {
        question: "Why are conclusions important?",
        options: ["they summarise the argument and answer the question", "they add new unrelated facts only", "they remove evidence", "they avoid links to the question"],
        correctIndex: 0,
        explanation: "Conclusions summarise the argument and bring the essay back to the question.",
      },
    ];
  }

  // Geography
  if (t.includes("physical geography")) {
    return [
      {
        question: "Erosion is mainly about:",
        options: ["wearing away land by moving water/waves", "building up land only", "making land disappear instantly", "only measuring weather"],
        correctIndex: 0,
        explanation: "Erosion is the wearing away of land by processes like running water or waves.",
      },
      {
        question: "Transportation in rivers is when:",
        options: ["the river carries sediment downstream", "the river stops flowing", "sediment becomes a fossil instantly", "only rain changes"],
        correctIndex: 0,
        explanation: "Transport means moving material such as sand and pebbles along the river.",
      },
      {
        question: "Deposition is when:",
        options: ["sediment is dropped/laid down", "sediment is erased forever", "the river becomes empty", "no energy is involved"],
        correctIndex: 0,
        explanation: "Deposition happens when the river’s energy decreases and sediment is laid down.",
      },
      {
        question: "Weather is:",
        options: ["short-term conditions", "long-term averages", "a type of ecosystem", "a river feature only"],
        correctIndex: 0,
        explanation: "Weather refers to short-term atmospheric conditions at a particular time.",
      },
      {
        question: "Climate is:",
        options: ["long-term patterns of weather", "only wind direction", "a single day of rain", "a type of soil"],
        correctIndex: 0,
        explanation: "Climate describes average patterns over many years.",
      },
      {
        question: "An ecosystem includes:",
        options: ["living things interacting with the environment", "only rocks", "only weather", "only roads and buildings"],
        correctIndex: 0,
        explanation: "Ecosystems are living communities interacting with their surroundings.",
      },
    ];
  }

  if (t.includes("human geography")) {
    return [
      {
        question: "Population density means:",
        options: ["number of people per land area", "total area measured in metres", "how fast cities grow overnight", "a type of river"],
        correctIndex: 0,
        explanation: "Density compares the number of people to the area they live in.",
      },
      {
        question: "Urban geography is about:",
        options: ["cities and how they develop", "only forests", "only oceans", "only planets"],
        correctIndex: 0,
        explanation: "Urban geography looks at cities, land use and how urban areas develop.",
      },
      {
        question: "Development in geography is mainly about:",
        options: ["improving quality of life", "making cities bigger only", "ignoring education and health", "only changing rivers"],
        correctIndex: 0,
        explanation: "Development focuses on improving wellbeing/quality of life indicators.",
      },
      {
        question: "Renewable resources are:",
        options: ["resources that can be replenished", "resources that run out immediately", "resources that never renew", "only metals"],
        correctIndex: 0,
        explanation: "Renewables can be replenished on human timescales (like wind).",
      },
      {
        question: "Sustainable resource use means:",
        options: ["meeting needs without harming future generations", "using until everything disappears tomorrow", "ignoring the environment", "only using non-renewables"],
        correctIndex: 0,
        explanation: "Sustainable use meets needs while protecting resources and the environment.",
      },
      {
        question: "A city might face challenges like:",
        options: ["traffic and pollution", "no people living there", "no services needed", "no housing"],
        correctIndex: 0,
        explanation: "Urban challenges can include traffic, pollution and inequality.",
      },
    ];
  }

  if (t.includes("uk and the world")) {
    return [
      {
        question: "UK landscapes are shaped by factors like:",
        options: ["physical processes and geology", "only cartoons", "only the internet", "only human names"],
        correctIndex: 0,
        explanation: "Physical processes and geology shape landforms such as coasts and valleys.",
      },
      {
        question: "Global links include:",
        options: ["trade and movement of people", "only local friendships", "only rainfall amounts", "only school timetables"],
        correctIndex: 0,
        explanation: "Global links are connections between places through trade, movement and influence.",
      },
      {
        question: "Fieldwork means:",
        options: ["collecting data in the real world", "only reading a textbook", "printing a worksheet", "doing a software update"],
        correctIndex: 0,
        explanation: "Fieldwork is collecting real-world data and observations to answer a question.",
      },
      {
        question: "When presenting fieldwork results, you should:",
        options: ["use clear methods like tables/charts/maps", "hide all measurements", "only write random sentences", "avoid labels and units always"],
        correctIndex: 0,
        explanation: "Clear presentation with labels and suitable methods makes results understandable.",
      },
      {
        question: "Planning is important in fieldwork because it helps you:",
        options: ["collect consistent data and manage safety", "avoid all tools", "do only one measurement", "guarantee perfect results"],
        correctIndex: 0,
        explanation: "Planning keeps the investigation safe and the data collection consistent.",
      },
      {
        question: "A change in one place can affect other places because of:",
        options: ["global interdependence", "random luck only", "no connections exist", "time travel rules"],
        correctIndex: 0,
        explanation: "Places are linked through trade, people and shared impacts, so changes can spread.",
      },
    ];
  }

  if (t.includes("forces")) {
    return [
      {
        question: "A force is best described as:",
        options: ["energy of motion", "a push or a pull", "a type of heat", "a measure of time"],
        correctIndex: 1,
        explanation: "A force can be a push or a pull. Forces can start/stop motion or change speed/direction.",
      },
      {
        question: "Forces are measured in:",
        options: ["joules (J)", "newtons (N)", "watts (W)", "metres (m)"],
        correctIndex: 1,
        explanation: "The unit of force is the newton (N).",
      },
      {
        question: "Gravity is a:",
        options: ["push from Earth", "pull towards the centre of the Earth", "force that only acts in water", "friction between surfaces"],
        correctIndex: 1,
        explanation: "Gravity pulls objects towards the centre of the Earth.",
      },
      {
        question: "An unsupported object falls because:",
        options: ["it is pulled by gravity", "air pushes it up", "it is heavier on the Moon only", "friction acts upward"],
        correctIndex: 0,
        explanation: "When unsupported, gravity is unopposed so it pulls the object down.",
      },
      {
        question: "Weight is best described as:",
        options: ["the amount of matter", "the force of gravity on an object", "a measure of speed", "the energy transferred to heat"],
        correctIndex: 1,
        explanation: "Weight is the force of gravity acting on an object.",
      },
      {
        question: "A rough surface usually has:",
        options: ["less friction", "more friction", "zero friction", "no effect on motion"],
        correctIndex: 1,
        explanation: "Rough surfaces increase friction, which tends to slow objects down.",
      },
      {
        question: "Friction acts:",
        options: ["in the same direction as motion", "opposite to the direction of motion", "only when objects are stationary", "only in space"],
        correctIndex: 1,
        explanation: "Friction opposes the motion between surfaces, so it reduces speed.",
      },
      {
        question: "When forces are balanced, the object will:",
        options: ["speed up", "change direction", "stay at rest or move at constant speed", "stop instantly and disappear"],
        correctIndex: 2,
        explanation: "Balanced forces mean zero resultant force, so there is no change in speed or direction.",
      },
      {
        question: "A book resting on a table is an example of balanced forces because:",
        options: ["gravity is zero", "the table pushes up with an equal force", "there is no friction", "the forces are both in the same direction"],
        correctIndex: 1,
        explanation: "Gravity pulls the book down; the table pushes up with an equal force—forces balance.",
      },
      {
        question: "If you push a box and it moves at constant speed, the forces on it are:",
        options: ["balanced (resultant force is zero)", "unbalanced and accelerating forward", "unbalanced and reversing", "always zero even while falling"],
        correctIndex: 0,
        explanation: "Constant speed means no change in motion, so the forces must be balanced.",
      },
      {
        question: "What force makes a bicycle slow down when you brake (ignoring air resistance)?",
        options: ["gravity", "friction between pads and wheel", "magnetism", "sound"],
        correctIndex: 1,
        explanation: "Braking relies on friction between brake pads and the wheel.",
      },
      {
        question: "If the surface becomes smoother, friction usually:",
        options: ["increases", "decreases", "stays the same always", "turns the object into a magnet"],
        correctIndex: 1,
        explanation: "Smooth surfaces have less contact resistance, so friction decreases.",
      },
      {
        question: "A skydiver reaches terminal velocity when:",
        options: ["gravity and air resistance balance", "air resistance is always zero", "they fall faster and faster forever", "the parachute has no effect"],
        correctIndex: 0,
        explanation: "At terminal velocity, forces balance so speed becomes constant.",
      },
      {
        question: "In a tug of war where both teams pull with equal force in opposite directions, the rope:",
        options: ["does not accelerate (balanced forces)", "moves faster for the team on the left only", "moves because friction always increases", "stops because gravity disappears"],
        correctIndex: 0,
        explanation: "Equal and opposite forces balance, giving zero resultant force, so there is no acceleration.",
      },
      {
        question: "Which situation shows a net (resultant) force of zero?",
        options: ["A car accelerating", "A car moving at constant speed", "A ball speeding up when dropped", "A rocket thrusting upward"],
        correctIndex: 1,
        explanation: "A car moving at constant speed has no change in motion, so the net force is zero.",
      },
      {
        question: "If the pushing force is bigger than friction, the object will:",
        options: ["slow down", "speed up", "remain perfectly still", "lose mass"],
        correctIndex: 1,
        explanation: "Unbalanced forces cause a change in motion. Bigger push than friction speeds the object up.",
      },
      {
        question: "If you apply a force to a trolley and it starts moving, you have:",
        options: ["reduced gravity", "applied an unbalanced force", "created energy", "stopped friction"],
        correctIndex: 1,
        explanation: "It starts moving because the forces are unbalanced (resultant force is not zero).",
      },
      {
        question: "Weight is measured in:",
        options: ["newtons (N)", "kilograms (kg)", "seconds (s)", "metres (m)"],
        correctIndex: 0,
        explanation: "Weight is a force, so its unit is newtons (N).",
      },
      {
        question: "A force changes motion by affecting:",
        options: ["only speed", "only direction", "speed or direction", "only temperature"],
        correctIndex: 2,
        explanation: "Forces can change both speed and direction (or just one of them).",
      },
      {
        question: "Which is a correct statement about gravity?",
        options: ["Gravity pushes objects away from Earth", "Gravity pulls objects towards Earth", "Gravity depends only on mass, not height", "Gravity exists only in liquids"],
        correctIndex: 1,
        explanation: "Gravity pulls objects towards Earth; the strength depends on where you are (e.g. weaker on the Moon).",
      },
    ];
  }

  if (t.includes("electricity")) {
    return [
      {
        question: "A complete circuit is:",
        options: ["an open path", "a closed loop", "a circle with no wires", "a chemical reaction"],
        correctIndex: 1,
        explanation: "A complete circuit is a closed loop that current can flow around.",
      },
      {
        question: "Electricity flows in a circuit when:",
        options: ["the circuit is complete (closed)", "the battery is removed", "the wires are unplugged", "the switch is open"],
        correctIndex: 0,
        explanation: "Current needs a complete path, so the circuit must be closed.",
      },
      {
        question: "If a switch is open, typically:",
        options: ["current continues", "the circuit is broken and current stops", "the bulb gets brighter", "only sound works"],
        correctIndex: 1,
        explanation: "Opening a switch breaks the circuit, so current stops.",
      },
      {
        question: "Conductors are materials that:",
        options: ["do not let electricity flow", "allow electricity to flow easily", "make light energy directly", "stop sound vibrations"],
        correctIndex: 1,
        explanation: "Conductors allow current to pass through them.",
      },
      {
        question: "Which material is a good conductor?",
        options: ["rubber", "wood", "copper", "plastic wrap"],
        correctIndex: 2,
        explanation: "Copper is a metal and a good conductor of electricity.",
      },
      {
        question: "Insulators are materials that:",
        options: ["allow current flow", "do not let electricity flow", "increase battery voltage", "conduct only when hot"],
        correctIndex: 1,
        explanation: "Insulators block current and stop electricity flowing through them.",
      },
      {
        question: "Plastic is often used to cover wires because it is:",
        options: ["a conductor", "an insulator", "a power source", "a switch"],
        correctIndex: 1,
        explanation: "Plastic is an insulator, so it helps prevent shocks.",
      },
      {
        question: "A cell or battery in a circuit provides:",
        options: ["an electrical power source", "a type of friction", "a light bulb", "a measuring unit"],
        correctIndex: 0,
        explanation: "The battery/cell provides the electrical energy to run the circuit.",
      },
      {
        question: "Which component is mainly for switching the circuit on and off?",
        options: ["a switch", "a bulb", "a motor", "a conductor wire"],
        correctIndex: 0,
        explanation: "A switch opens/closes the circuit.",
      },
      {
        question: "A bulb in a simple circuit mainly converts electrical energy to:",
        options: ["chemical energy", "light (and heat)", "motion energy", "sound waves"],
        correctIndex: 1,
        explanation: "Bulbs produce light, and they also transfer some energy as heat.",
      },
      {
        question: "Current flows around a circuit along the path that is:",
        options: ["broken", "complete", "random", "made of air only"],
        correctIndex: 1,
        explanation: "Current needs a complete path, so the circuit must be closed.",
      },
      {
        question: "If the circuit is broken (open), the bulb:",
        options: ["stays on", "goes off", "changes colour randomly", "only flickers when it is dark"],
        correctIndex: 1,
        explanation: "With an open circuit, there is no complete loop so current stops.",
      },
      {
        question: "A conductor is typically made of:",
        options: ["metal", "glass", "rubber", "dry sand"],
        correctIndex: 0,
        explanation: "Metals are usually conductors, so current can flow through them.",
      },
      {
        question: "An insulator is typically made of:",
        options: ["metal", "copper", "plastic or rubber", "iron only"],
        correctIndex: 2,
        explanation: "Plastic/rubber insulate wires by blocking current flow.",
      },
      {
        question: "Which of these is an example of a circuit component?",
        options: ["bulb", "cell", "switch", "all of these"],
        correctIndex: 3,
        explanation: "Bulbs, cells and switches are all components used in circuits.",
      },
      {
        question: "Wires are used to:",
        options: ["carry electricity between components", "stop electricity from flowing", "make energy disappear", "measure current with a sensor"],
        correctIndex: 0,
        explanation: "Wires connect components and provide the path for current.",
      },
      {
        question: "Which action breaks a circuit?",
        options: ["closing a switch", "removing a wire", "adding more insulation", "using a conductor"],
        correctIndex: 1,
        explanation: "Removing a wire breaks the complete loop, so current can’t flow.",
      },
      {
        question: "A motor is a component that converts electrical energy mainly into:",
        options: ["motion (kinetic energy)", "sound waves", "heat only", "chemical energy storage"],
        correctIndex: 0,
        explanation: "Motors turn electrical energy into motion.",
      },
      {
        question: "Which statement is correct?",
        options: ["Electricity can flow through insulators easily", "Electricity needs a complete circuit to flow", "A circuit always works even if it is open", "Only batteries store electricity, not cells"],
        correctIndex: 1,
        explanation: "If the circuit is open, it is not a complete path, so current cannot flow.",
      },
      {
        question: "The purpose of insulation around a wire is to:",
        options: ["help current flow faster", "prevent unwanted current flow and shocks", "replace the battery", "increase friction"],
        correctIndex: 1,
        explanation: "Insulation prevents electric current from flowing where it shouldn’t, improving safety.",
      },
    ];
  }

  if (t.includes("energy")) {
    return [
      {
        question: "Kinetic energy is energy of:",
        options: ["motion", "height", "chemical bonds", "sound waves only"],
        correctIndex: 0,
        explanation: "Kinetic energy is the energy an object has because it is moving.",
      },
      {
        question: "Gravitational potential energy depends on:",
        options: ["mass only", "height (and gravity)", "speed", "colour of the object"],
        correctIndex: 1,
        explanation: "Higher objects have greater gravitational potential energy.",
      },
      {
        question: "Chemical energy is stored in:",
        options: ["fuels and food", "moving objects only", "light bulbs", "wires only"],
        correctIndex: 0,
        explanation: "Chemical energy is stored in substances such as fuels and food.",
      },
      {
        question: "Electrical energy is associated with:",
        options: ["charge and current", "temperature only", "motion only", "angle measurements"],
        correctIndex: 0,
        explanation: "Electrical energy comes from electricity in circuits.",
      },
      {
        question: "When a ball falls, which energy transfer usually happens?",
        options: ["thermal -> kinetic only", "gravitational potential -> kinetic", "kinetic -> gravitational potential only", "chemical -> sound"],
        correctIndex: 1,
        explanation: "As the ball falls, gravitational potential energy decreases and kinetic energy increases.",
      },
      {
        question: "Energy transfer means:",
        options: ["energy disappears", "energy moves from one place/store to another", "energy is created", "only occurs as heat"],
        correctIndex: 1,
        explanation: "Energy transfer is the movement of energy between objects/places/stores.",
      },
      {
        question: "Conservation of energy means:",
        options: ["energy can be created from nothing", "energy cannot be created or destroyed, only changed/transferred", "energy always increases", "energy only exists in one form"],
        correctIndex: 1,
        explanation: "Energy is conserved: total energy stays the same even if forms change.",
      },
      {
        question: "In most real devices, some energy is transferred to the surroundings as:",
        options: ["light only", "heat", "sound only", "frictionless work"],
        correctIndex: 1,
        explanation: "Some energy is not useful and becomes heat in the surroundings.",
      },
      {
        question: "Useful energy is:",
        options: ["energy you don't want", "the output you are aiming for", "energy stored in air only", "energy that can't be measured"],
        correctIndex: 1,
        explanation: "Useful energy is the type of energy that the device is designed to produce.",
      },
      {
        question: "Wasted energy is usually:",
        options: ["transferred to surroundings in unwanted ways (often heat)", "never transferred", "only chemical energy", "always zero"],
        correctIndex: 0,
        explanation: "Wasted energy still exists; it just ends up where it’s not useful (commonly as heat).",
      },
      {
        question: "A torch battery mainly stores:",
        options: ["chemical energy", "light energy", "sound energy", "only kinetic energy"],
        correctIndex: 0,
        explanation: "The battery stores chemical energy.",
      },
      {
        question: "When the torch is switched on, energy transfers as:",
        options: ["chemical -> electrical -> light and heat", "light -> chemical", "kinetic -> chemical only", "heat -> electrical only"],
        correctIndex: 0,
        explanation: "Chemical energy becomes electrical energy, then produces light and heat in the bulb.",
      },
      {
        question: "If energy is conserved, then in a system:",
        options: ["the total energy increases", "the total energy stays the same even if forms change", "only one form is allowed", "energy is destroyed each step"],
        correctIndex: 1,
        explanation: "Conservation means total energy is constant; it changes form and is transferred.",
      },
      {
        question: "Which example best illustrates energy transfer?",
        options: ["A ball falling", "A picture becoming blurry", "A number shrinking to zero", "A chair gaining mass"],
        correctIndex: 0,
        explanation: "A falling ball transfers energy between stores (gravitational potential to kinetic).",
      },
      {
        question: "In a lamp, energy changes type when it is transferred. Which is correct?",
        options: ["electrical -> light (and heat)", "gravitational -> light only", "chemical -> electrical only", "sound -> electrical"],
        correctIndex: 0,
        explanation: "Electrical energy is transferred to light and heat in a lamp.",
      },
      {
        question: "Thermal energy is:",
        options: ["energy due to temperature", "energy due to height", "energy due to motion", "energy due to electricity only"],
        correctIndex: 0,
        explanation: "Thermal energy is heat energy related to temperature.",
      },
      {
        question: "Electrical appliances are not 100% efficient because:",
        options: ["some energy becomes heat in the surroundings", "energy conservation is false", "they create extra energy", "they stop energy transfer"],
        correctIndex: 0,
        explanation: "Efficiency is limited because some energy becomes unwanted heat.",
      },
      {
        question: "If you double a ball’s height (same conditions), gravitational potential energy generally:",
        options: ["decreases", "stays the same", "increases", "becomes zero"],
        correctIndex: 2,
        explanation: "More height means more gravitational potential energy.",
      },
      {
        question: "Sound energy mainly comes from:",
        options: ["vibrations", "fixed shapes", "static electricity only", "a lack of air"],
        correctIndex: 0,
        explanation: "Sound is produced by vibrations, which create sound waves.",
      },
      {
        question: "Which statement is always true?",
        options: ["Energy is created and destroyed", "Total energy in a closed system is conserved", "Energy can vanish into nothing", "Only light energy is conserved"],
        correctIndex: 1,
        explanation: "Energy is conserved: the total energy doesn’t disappear; it changes form/transfers.",
      },
    ];
  }

  if (t.includes("motion")) {
    return [
      {
        question: "Speed tells you:",
        options: ["how far something moves per unit time", "how much time passes", "how heavy something is", "how much heat is present"],
        correctIndex: 0,
        explanation: "Speed describes how distance changes with time.",
      },
      {
        question: "The formula for speed is:",
        options: ["speed = distance ÷ time", "speed = time ÷ distance", "speed = distance × time", "speed = 1 ÷ (d + t)"],
        correctIndex: 0,
        explanation: "Speed = distance ÷ time.",
      },
      {
        question: "If distance is in metres and time is in seconds, speed is in:",
        options: ["m/s", "m²", "s²", "km/h only"],
        correctIndex: 0,
        explanation: "Using m and s gives speed in metres per second (m/s).",
      },
      {
        question: "A runner covers 120 m in 30 s. What is the speed?",
        options: ["3 m/s", "4 m/s", "5 m/s", "6 m/s"],
        correctIndex: 1,
        explanation: "Speed = 120 ÷ 30 = 4 m/s.",
      },
      {
        question: "If you double the time for the same distance, speed generally:",
        options: ["doubles", "halves", "stays the same", "becomes zero"],
        correctIndex: 1,
        explanation: "With the same distance, a larger time means a smaller speed.",
      },
      {
        question: "Distance-time graphs show:",
        options: ["distance on the y-axis and time on the x-axis", "time on the y-axis and distance on the x-axis", "only speed on one axis", "temperature over time"],
        correctIndex: 0,
        explanation: "On a distance-time graph: y-axis = distance, x-axis = time.",
      },
      {
        question: "On a distance-time graph, a steeper line indicates:",
        options: ["slower speed", "constant speed only", "faster speed", "no movement"],
        correctIndex: 2,
        explanation: "Steeper gradient means bigger distance change per unit time → faster speed.",
      },
      {
        question: "A horizontal line on a distance-time graph means:",
        options: ["speed is greatest", "the object is not moving", "the object is moving with changing distance", "time is zero"],
        correctIndex: 1,
        explanation: "Horizontal line means distance is constant, so speed is zero.",
      },
      {
        question: "A straight line on a distance-time graph usually indicates:",
        options: ["speed is changing", "speed is constant", "the object is moving backwards only", "distance is negative"],
        correctIndex: 1,
        explanation: "Straight line means the gradient is constant, so speed is constant.",
      },
      {
        question: "The gradient of a distance-time graph is:",
        options: ["distance", "time", "speed", "acceleration (always)"],
        correctIndex: 2,
        explanation: "Gradient is speed: how much distance changes for each unit of time.",
      },
      {
        question: "If a car travels 3 km in 300 s, speed is:",
        options: ["5 m/s", "10 m/s", "15 m/s", "20 m/s"],
        correctIndex: 1,
        explanation: "3 km = 3000 m. Speed = 3000 ÷ 300 = 10 m/s.",
      },
      {
        question: "Speed can be measured in:",
        options: ["km/h", "degrees", "litres", "newtons (N)"],
        correctIndex: 0,
        explanation: "km/h is a common unit for speed.",
      },
      {
        question: "Time is measured in units such as:",
        options: ["seconds (s)", "metres (m)", "kilograms (kg)", "watts (W)"],
        correctIndex: 0,
        explanation: "Time is measured in seconds (s).",
      },
      {
        question: "Distance is measured in units such as:",
        options: ["metres (m)", "seconds (s)", "newtons (N)", "square metres (m²)"],
        correctIndex: 0,
        explanation: "Distance is usually measured in metres (m).",
      },
      {
        question: "If distance increases (with the same time), speed:",
        options: ["decreases", "increases", "stays the same", "becomes negative"],
        correctIndex: 1,
        explanation: "Speed = distance ÷ time, so a larger distance gives a larger speed.",
      },
      {
        question: "If a distance-time graph curves upward, that suggests:",
        options: ["speed is increasing", "speed is decreasing", "speed is zero", "time is going backwards"],
        correctIndex: 0,
        explanation: "An upward curve often means the gradient increases with time → speed increases.",
      },
      {
        question: "A cyclist travels 600 m in 120 s. Speed is:",
        options: ["4 m/s", "5 m/s", "6 m/s", "7 m/s"],
        correctIndex: 1,
        explanation: "Speed = 600 ÷ 120 = 5 m/s.",
      },
      {
        question: "If an object starts at rest, the speed at the first point on the graph is:",
        options: ["zero", "maximum", "negative", "undefined"],
        correctIndex: 0,
        explanation: "At rest means no change in distance at that moment, so speed is zero.",
      },
      {
        question: "If the distance-time graph shows distance decreasing towards zero, the object is:",
        options: ["staying still", "moving back towards the start", "moving faster forwards", "teleporting"],
        correctIndex: 1,
        explanation: "Decreasing distance indicates the object is moving back towards the starting position.",
      },
      {
        question: "Which expression correctly calculates speed?",
        options: ["s = d ÷ t", "s = d × t", "s = t ÷ d", "s = d + t"],
        correctIndex: 0,
        explanation: "Correct relationship: speed = distance ÷ time.",
      },
    ];
  }

  if (t.includes("materials")) {
    return [
      {
        question: "A solid is best described as having:",
        options: ["no fixed volume and no fixed shape", "fixed shape but no fixed volume", "fixed shape and fixed volume", "no volume at all"],
        correctIndex: 2,
        explanation: "Solids have a fixed shape and fixed volume.",
      },
      {
        question: "A liquid is best described as having:",
        options: ["fixed volume but no fixed shape", "fixed shape but no fixed volume", "no fixed shape and no fixed volume", "zero volume when poured"],
        correctIndex: 0,
        explanation: "Liquids have a fixed volume but take the container shape, so they do not have a fixed shape.",
      },
      {
        question: "A gas is best described as having:",
        options: ["fixed shape and fixed volume", "fixed volume but not fixed shape", "no fixed shape or fixed volume", "only fixed volume and no shape change"],
        correctIndex: 2,
        explanation: "Gases have no fixed shape and no fixed volume; they spread out to fill space.",
      },
      {
        question: "In the particle model, particles in a solid are:",
        options: ["far apart and move freely", "close together and mainly vibrate", "close but slide past easily", "only moving when heated"],
        correctIndex: 1,
        explanation: "In solids, particles are packed close and vibrate in place.",
      },
      {
        question: "In the particle model, particles in a gas are:",
        options: ["packed close together", "close and can only vibrate", "far apart and move quickly", "fixed in one position"],
        correctIndex: 2,
        explanation: "Gases have particles far apart that move quickly in all directions.",
      },
      {
        question: "Changing state usually happens because particles:",
        options: ["gain or lose energy", "disappear completely", "become new substances", "only move in solids"],
        correctIndex: 0,
        explanation: "Heating or cooling changes particle energy, leading to state changes.",
      },
      {
        question: "Melting is the change of state from:",
        options: ["solid to liquid", "liquid to solid", "liquid to gas", "gas to liquid"],
        correctIndex: 0,
        explanation: "Melting is solid -> liquid.",
      },
      {
        question: "Boiling is the change of state from:",
        options: ["solid to liquid", "liquid to gas", "gas to liquid", "liquid to solid"],
        correctIndex: 1,
        explanation: "Boiling is liquid -> gas.",
      },
      {
        question: "Condensation is the change of state from:",
        options: ["gas to liquid", "liquid to gas", "solid to gas", "liquid to solid"],
        correctIndex: 0,
        explanation: "Condensation is gas -> liquid.",
      },
      {
        question: "Freezing is the change of state from:",
        options: ["solid to liquid", "liquid to solid", "gas to liquid", "solid to gas"],
        correctIndex: 1,
        explanation: "Freezing is liquid -> solid.",
      },
      {
        question: "If you heat a substance, particles generally:",
        options: ["lose energy and slow down", "gain energy and move more", "stay the same and do not vibrate", "turn into a new element"],
        correctIndex: 1,
        explanation: "Heating increases particle energy, so they move more.",
      },
      {
        question: "Which changes most during a change of state?",
        options: ["particle arrangement and movement", "the number of atoms", "the element identity", "mass always becomes zero"],
        correctIndex: 0,
        explanation: "State changes come from particles rearranging and changing how they move.",
      },
      {
        question: "Cooling a gas can cause:",
        options: ["melting", "condensation", "boiling", "evaporation only without change"],
        correctIndex: 1,
        explanation: "Cooling a gas usually causes condensation to liquid.",
      },
      {
        question: "Temperature is linked to:",
        options: ["particle energy", "particle shape only", "mass of the container", "electric charge only"],
        correctIndex: 0,
        explanation: "In the particle model, temperature relates to the energy of particles.",
      },
      {
        question: "Ice changing to water at room temperature is usually:",
        options: ["freezing", "melting", "boiling", "condensation"],
        correctIndex: 1,
        explanation: "Ice (solid) -> water (liquid) is melting.",
      },
      {
        question: "Water vapour is:",
        options: ["a solid", "a liquid", "a gas", "a type of soil"],
        correctIndex: 2,
        explanation: "Water vapour is water in the gas state.",
      },
      {
        question: "Liquids can be poured and take container shape because their particles can:",
        options: ["slide past each other", "vibrate in only one spot", "never move", "separate into different elements"],
        correctIndex: 0,
        explanation: "In liquids, particles can move past each other, so the liquid flows.",
      },
      {
        question: "Solids are not easy to compress because particles are:",
        options: ["far apart and free to spread", "packed close together", "moving at random with empty space", "made of zero volume"],
        correctIndex: 1,
        explanation: "Particles in solids are already packed close together.",
      },
      {
        question: "Gases are easy to compress because they have:",
        options: ["very little space between particles", "lots of space between particles", "fixed shape", "no particles at all"],
        correctIndex: 1,
        explanation: "In gases, particles are far apart, so there is space to compress.",
      },
      {
        question: "A change of state like melting ice is usually a:",
        options: ["chemical reaction", "physical change", "electrical change", "nuclear change"],
        correctIndex: 1,
        explanation: "Change of state is a physical change (no new substance is formed).",
      },
    ];
  }

  if (t.includes("chemical")) {
    return [
      {
        question: "A chemical reaction is when:",
        options: ["new substances are formed", "only the container changes", "the matter disappears", "no change happens at all"],
        correctIndex: 0,
        explanation: "In a chemical reaction, reactants change into new substances.",
      },
      {
        question: "The starting substances in a reaction are called:",
        options: ["products", "reactants", "indicators", "solvents only"],
        correctIndex: 1,
        explanation: "Reactants are the starting substances.",
      },
      {
        question: "The new substances formed are called:",
        options: ["reactants", "products", "particles", "elements only"],
        correctIndex: 1,
        explanation: "Products are the new substances.",
      },
      {
        question: "A sign of a chemical reaction can be:",
        options: ["a colour change", "the mixture staying exactly the same", "no new substances ever", "only temperature stays constant"],
        correctIndex: 0,
        explanation: "Chemical reactions can show colour change, fizzing (gas), temperature change or new solids.",
      },
      {
        question: "Acids have a pH of:",
        options: ["more than 7", "less than 7", "exactly 7 only", "equal to the number of particles"],
        correctIndex: 1,
        explanation: "Acids have pH < 7.",
      },
      {
        question: "Alkalis have a pH of:",
        options: ["less than 7", "more than 7", "exactly 7 only", "always 0"],
        correctIndex: 1,
        explanation: "Alkalis have pH > 7.",
      },
      {
        question: "A neutral solution has a pH of:",
        options: ["0", "3", "7", "14"],
        correctIndex: 2,
        explanation: "Neutral is pH 7.",
      },
      {
        question: "Universal indicator turns red in:",
        options: ["alkalis", "neutral solutions", "strong acids", "very cold liquids"],
        correctIndex: 2,
        explanation: "Strong acids turn universal indicator red.",
      },
      {
        question: "Universal indicator turns green in:",
        options: ["strong acids", "neutral solutions", "alkalis", "hot gases"],
        correctIndex: 1,
        explanation: "Universal indicator is green at neutral pH.",
      },
      {
        question: "Universal indicator turns blue/purple in:",
        options: ["neutral solutions", "strong acids", "alkalis", "only water"],
        correctIndex: 2,
        explanation: "Alkalis turn universal indicator blue/purple.",
      },
      {
        question: "Litmus paper turns red in:",
        options: ["alkalis", "acids", "neutral solutions", "gases only"],
        correctIndex: 1,
        explanation: "Litmus is red in acids.",
      },
      {
        question: "Litmus paper turns blue in:",
        options: ["acids", "alkalis", "neutral solutions", "metals"],
        correctIndex: 1,
        explanation: "Litmus is blue in alkalis.",
      },
      {
        question: "Indicators are used mainly to:",
        options: ["measure mass", "tell whether something is acid or alkali", "make new substances instantly", "change electricity to heat"],
        correctIndex: 1,
        explanation: "Indicators help you test for acid/alkali (and neutral).",
      },
      {
        question: "Which is an example of an acid?",
        options: ["vinegar", "soap", "baking soda", "salt only"],
        correctIndex: 0,
        explanation: "Vinegar is an acid.",
      },
      {
        question: "Which is an example of an alkali?",
        options: ["lemon juice", "soap", "vinegar", "orange juice"],
        correctIndex: 1,
        explanation: "Soap is an alkali.",
      },
      {
        question: "Neutralisation is usually a reaction between:",
        options: ["a solid and a gas", "an acid and an alkali", "two metals only", "two identical acids"],
        correctIndex: 1,
        explanation: "Neutralisation is acid + alkali.",
      },
      {
        question: "When an acid and an alkali neutralise, you get (typically):",
        options: ["salt and water", "only heat with no new substances", "only gas bubbles", "a new element"],
        correctIndex: 0,
        explanation: "Acid + alkali neutralise to form salt and water (plus indicator/pH changes).",
      },
      {
        question: "If bubbles form in a test, it may mean:",
        options: ["a gas has been produced", "no reaction happened", "the solution became a metal", "the pH must be 14"],
        correctIndex: 0,
        explanation: "Fizzing/bubbles often indicate gas produced in the reaction.",
      },
      {
        question: "If litmus turns blue, the solution is likely:",
        options: ["acidic", "alkaline", "neutral", "a gas with no liquid"],
        correctIndex: 1,
        explanation: "Litmus turns blue in alkalis, so the solution is alkaline.",
      },
      {
        question: "Is melting ice a chemical reaction?",
        options: ["Yes, because it makes new substances", "No, it is usually a physical change", "Only if it changes colour", "Only if it makes gas"],
        correctIndex: 1,
        explanation: "Melting ice is a physical change (state change), not a chemical reaction.",
      },
    ];
  }

  if (t.includes("rocks")) {
    return [
      {
        question: "Sedimentary rocks usually form when:",
        options: ["molten rock cools", "layers of sediment are squashed and pressed together", "rocks are changed by extreme pressure and heat", "plants become fossil fuel"],
        correctIndex: 1,
        explanation: "Sedimentary rocks form from layers of sediment being pressed together over time.",
      },
      {
        question: "Igneous rocks usually form when:",
        options: ["molten rock cools", "sediments grow into plants", "rocks are broken down into soil only", "only oceans evaporate"],
        correctIndex: 0,
        explanation: "Igneous rocks form when molten rock cools and solidifies.",
      },
      {
        question: "Metamorphic rocks usually form when:",
        options: ["existing rocks are changed by heat and pressure", "molten rock cools quickly in water", "sediment layers are dissolved", "fossils form instantly"],
        correctIndex: 0,
        explanation: "Metamorphic rocks form from existing rocks altered by heat and pressure.",
      },
      {
        question: "A fossil is best described as:",
        options: ["a mineral type", "the remains or traces of a living thing from long ago", "a type of soil", "a new chemical substance"],
        correctIndex: 1,
        explanation: "Fossils are remains/traces of living things preserved in rock.",
      },
      {
        question: "Fossils usually form in rocks like:",
        options: ["sedimentary rocks", "only igneous rocks", "only volcanic ash", "only sand that is still loose"],
        correctIndex: 0,
        explanation: "Many fossils are found in sedimentary rocks because they form from layers of sediment.",
      },
      {
        question: "Soil is a mixture of:",
        options: ["only rocks with no water", "broken rock, humus, air and water", "only dead plants without minerals", "pure chemicals with no mixture"],
        correctIndex: 1,
        explanation: "Soil is made from broken rock, humus, air and water.",
      },
      {
        question: "Humus is:",
        options: ["liquid water in soil", "decayed plants and animals", "a type of gas in soil", "molten rock"],
        correctIndex: 1,
        explanation: "Humus is decayed plants and animals.",
      },
      {
        question: "Why is soil important for plants?",
        options: ["It provides conditions and nutrients for growth", "It stops roots working", "Plants cannot use water from soil", "It removes all air from roots"],
        correctIndex: 0,
        explanation: "Soil supports plant growth by holding water and nutrients and giving roots space to grow.",
      },
      {
        question: "Soils differ because they can have different amounts of:",
        options: ["humus, air, water and rock", "only one mineral", "only ice", "no particles at all"],
        correctIndex: 0,
        explanation: "Different soils have different proportions of components like rock, humus, water and air.",
      },
      {
        question: "Which process best describes how many fossils form?",
        options: ["buried in sediment and preserved over a long time", "burned into rock instantly", "formed by electricity in the ground", "created by melting metals"],
        correctIndex: 0,
        explanation: "Many fossils form when organisms are buried in sediment and preserved over long periods.",
      },
      {
        question: "Sandstone is an example of a:",
        options: ["sedimentary rock", "metamorphic rock", "igneous rock", "space rock only"],
        correctIndex: 0,
        explanation: "Sandstone is typically a sedimentary rock.",
      },
      {
        question: "Granite is typically a(n):",
        options: ["igneous rock", "sedimentary rock", "metamorphic rock", "soil type"],
        correctIndex: 0,
        explanation: "Granite is an igneous rock formed from cooled molten rock.",
      },
      {
        question: "Marble is typically a(n):",
        options: ["metamorphic rock", "sedimentary rock", "igneous rock", "only a fossil"],
        correctIndex: 0,
        explanation: "Marble is usually a metamorphic rock.",
      },
      {
        question: "A reason fossils help scientists is that they can:",
        options: ["tell us about past life and environments", "prove that electricity exists underground", "change the pH of soil", "create new elements"],
        correctIndex: 0,
        explanation: "Fossils provide evidence about past organisms and habitats.",
      },
      {
        question: "Soil contains air because:",
        options: ["roots need oxygen", "it is made only of gas", "air is added by electricity", "plants do not need oxygen"],
        correctIndex: 0,
        explanation: "Roots need oxygen and air spaces in soil provide it.",
      },
      {
        question: "Weathered rock in soil mainly provides:",
        options: ["mineral material and structure", "only salt water", "only electricity", "zero solids"],
        correctIndex: 0,
        explanation: "Broken/weathered rock forms the mineral part of soil.",
      },
      {
        question: "Which is most likely found in sedimentary rocks?",
        options: ["many fossils", "only gemstones with no layers", "only molten rock with no sediment", "no evidence of organisms"],
        correctIndex: 0,
        explanation: "Sedimentary rocks are good at preserving fossils.",
      },
      {
        question: "Soil is important because it:",
        options: ["helps plants grow", "stops water from being stored", "has no nutrients", "turns into gas"],
        correctIndex: 0,
        explanation: "Soil supports plant growth and stores water and nutrients.",
      },
      {
        question: "Fossils are best described as:",
        options: ["new materials made during experiments", "remains or traces from long ago", "only footprints in sand today", "chemical indicators"],
        correctIndex: 1,
        explanation: "Fossils record life from long ago.",
      },
      {
        question: "A mixture like soil is considered:",
        options: ["a pure substance", "a mixture", "a single chemical element", "a type of gas"],
        correctIndex: 1,
        explanation: "Soil is a mixture of different components.",
      },
    ];
  }

  if (t.includes("particle")) {
    return [
      {
        question: "The particle model is based on the idea that:",
        options: ["matter has no particles", "all matter is made of tiny particles", "only solids have particles", "particles are imaginary in science"],
        correctIndex: 1,
        explanation: "The particle model says all matter is made of tiny particles.",
      },
      {
        question: "Atoms are the smallest particles of an:",
        options: ["element that still has that element's properties", "molecule only", "solution", "rock only"],
        correctIndex: 0,
        explanation: "Atoms are the smallest particles of an element that still keep its properties.",
      },
      {
        question: "A molecule is:",
        options: ["an individual atom only", "a group of atoms joined together", "a type of soil", "a rock type"],
        correctIndex: 1,
        explanation: "Molecules are groups of atoms joined together.",
      },
      {
        question: "In a solid, particles are:",
        options: ["far apart and moving freely", "close together and mainly vibrate", "close together and freely moving past each other", "only moving as gases"],
        correctIndex: 1,
        explanation: "Solids have particles close together and mainly vibrating.",
      },
      {
        question: "In a liquid, particles are:",
        options: ["far apart", "close and can move past each other", "fixed in place", "only vibrating with no movement"],
        correctIndex: 1,
        explanation: "Liquids have particles close together that can move past each other, so they flow.",
      },
      {
        question: "In a gas, particles are:",
        options: ["close and still", "far apart and moving quickly", "fixed in one place", "made of only one atom always"],
        correctIndex: 1,
        explanation: "Gas particles are far apart and move quickly.",
      },
      {
        question: "The particle model helps explain:",
        options: ["states of matter and changes of state", "only colours of objects", "only the weather", "only forces"],
        correctIndex: 0,
        explanation: "The particle model explains solids, liquids, gases and how they change.",
      },
      {
        question: "Heating usually causes particles to:",
        options: ["lose energy and slow down", "gain energy and move more", "disappear", "become a new element"],
        correctIndex: 1,
        explanation: "Heating increases particle energy so they move more.",
      },
      {
        question: "When a solid melts, particles usually:",
        options: ["are pulled closer and slow down", "gain energy and can move more", "stop existing", "change element type"],
        correctIndex: 1,
        explanation: "Melting occurs when particles gain energy and can move more.",
      },
      {
        question: "Water is a molecule with formula:",
        options: ["O2", "H2O", "CO2", "NaCl"],
        correctIndex: 1,
        explanation: "Water is H2O: two hydrogen atoms and one oxygen atom.",
      },
      {
        question: "Different elements have different:",
        options: ["types of atom", "only one type of molecule", "only one state of matter", "no particle arrangement"],
        correctIndex: 0,
        explanation: "Each element has its own type of atom.",
      },
      {
        question: "Molecules form when atoms:",
        options: ["bond together in groups", "break apart instantly", "only vibrate and never join", "turn into heat energy only"],
        correctIndex: 0,
        explanation: "Molecules are made when atoms bond and join together.",
      },
      {
        question: "Why are solids not easily compressed?",
        options: ["particles are far apart", "particles are already packed close together", "solids have no particles", "temperature is always zero"],
        correctIndex: 1,
        explanation: "In solids, particles are packed close together, leaving less space to compress.",
      },
      {
        question: "Why do liquids take the shape of the container?",
        options: ["particles can slide past each other", "particles are fixed to one point", "there are no particles", "gravity is turned off"],
        correctIndex: 0,
        explanation: "Particles in liquids can move past each other, so liquids flow into the container shape.",
      },
      {
        question: "Why do gases spread out quickly?",
        options: ["particles are trapped in a fixed pattern", "particles are far apart and move freely", "gases have fixed shape", "gases have no energy"],
        correctIndex: 1,
        explanation: "Gas particles are far apart and move freely, so gases spread out.",
      },
      {
        question: "If particles are far apart and moving quickly, the state is most likely:",
        options: ["solid", "liquid", "gas", "always ice"],
        correctIndex: 2,
        explanation: "Far apart and fast motion indicates a gas.",
      },
      {
        question: "In a solid, particles cannot easily:",
        options: ["move past each other", "vibrate", "change state", "be arranged in layers"],
        correctIndex: 0,
        explanation: "Particles in solids stay in fixed positions and mainly vibrate.",
      },
      {
        question: "In a liquid, particles can move past each other, so the liquid:",
        options: ["does not flow", "flows and takes container shape", "stays in place forever", "turns into solid immediately"],
        correctIndex: 1,
        explanation: "Ability to move past each other is what makes liquids flow.",
      },
      {
        question: "A change from gas to liquid is explained by particles:",
        options: ["coming closer and moving less", "getting further apart and moving more", "turning into a new element", "disappearing"],
        correctIndex: 0,
        explanation: "Condensation (gas to liquid) involves particles coming closer and losing energy.",
      },
      {
        question: "Which statement best matches the particle model?",
        options: ["Particles do not explain behaviour", "Energy affects particle motion and state", "States happen without any particle changes", "Only temperature matters and not particle arrangement"],
        correctIndex: 1,
        explanation: "The particle model connects energy to particle motion and state changes.",
      },
    ];
  }

  if (t.includes("geometry") || t.includes("measure")) {
    return [
      { question: "How many sides does a hexagon have?", options: ["4", "5", "6", "8"], correctIndex: 2, explanation: "A hexagon has 6 sides. Hex means 6 in Greek. A regular hexagon has all 6 sides equal and all angles 120°." },
      { question: "What do the interior angles of any triangle always add up to?", options: ["90°", "180°", "270°", "360°"], correctIndex: 1, explanation: "The three interior angles of any triangle always add to 180°, no matter what shape or size the triangle is." },
      { question: "A rectangle is 8 cm long and 3 cm wide. What is its area?", options: ["11 cm²", "22 cm²", "24 cm²", "32 cm²"], correctIndex: 2, explanation: "Area = length × width = 8 × 3 = 24 cm². Area is always in square units (cm²)." },
      { question: "A rectangle is 8 cm long and 3 cm wide. What is its perimeter?", options: ["11 cm", "22 cm", "24 cm", "32 cm"], correctIndex: 1, explanation: "Perimeter = 2(l + w) = 2(8 + 3) = 2 × 11 = 22 cm. Perimeter goes around the outside." },
      { question: "What is the formula for the volume of a cuboid?", options: ["l + w + h", "2(l + w + h)", "l × w", "l × w × h"], correctIndex: 3, explanation: "Volume of a cuboid = length × width × height. This gives the 3D space inside in cubic units (cm³, m³)." },
      { question: "How many metres are in 4.5 kilometres?", options: ["45 m", "450 m", "4500 m", "45,000 m"], correctIndex: 2, explanation: "1 km = 1000 m, so 4.5 km = 4.5 × 1000 = 4500 m. Multiply when converting from a larger to a smaller unit." },
      { question: "An angle of 135° is best described as:", options: ["Acute", "Right", "Obtuse", "Reflex"], correctIndex: 2, explanation: "Obtuse angles are greater than 90° but less than 180°. 135° is between 90° and 180°, so it is obtuse." },
      { question: "What is the area of a triangle with base 10 cm and perpendicular height 7 cm?", options: ["17 cm²", "35 cm²", "70 cm²", "100 cm²"], correctIndex: 1, explanation: "Area of triangle = ½ × base × height = ½ × 10 × 7 = 35 cm². Always use the perpendicular (vertical) height." },
      { question: "How many faces does a cube have?", options: ["4", "5", "6", "8"], correctIndex: 2, explanation: "A cube has 6 faces, all of which are identical squares. It also has 12 edges and 8 vertices." },
      { question: "Angles on a straight line always add up to:", options: ["90°", "180°", "270°", "360°"], correctIndex: 1, explanation: "Angles on a straight line add to 180°. This is because a straight line represents a half-turn." },
      { question: "A cuboid has length 5 cm, width 4 cm, height 2 cm. What is its volume?", options: ["11 cm³", "22 cm³", "40 cm³", "100 cm³"], correctIndex: 2, explanation: "Volume = 5 × 4 × 2 = 40 cm³. Multiply all three dimensions together and write the result in cubic units." },
      { question: "Which metric unit is most appropriate to measure the distance between two cities?", options: ["Millimetres (mm)", "Centimetres (cm)", "Metres (m)", "Kilometres (km)"], correctIndex: 3, explanation: "Kilometres are used for large distances like those between cities. Metres suit room/field sizes; cm and mm suit smaller objects." },
      { question: "A square has one side of 6 cm. What is its perimeter?", options: ["12 cm", "18 cm", "24 cm", "36 cm"], correctIndex: 2, explanation: "A square has 4 equal sides. Perimeter = 4 × 6 = 24 cm." },
      { question: "Which of these correctly describes an equilateral triangle?", options: ["2 equal sides, 2 equal angles", "No equal sides", "3 equal sides, all angles 60°", "One angle of 90°"], correctIndex: 2, explanation: "An equilateral triangle has 3 equal sides and 3 equal angles, each 60°. 3 × 60° = 180° ✓." },
      { question: "1 litre is equal to how many millilitres?", options: ["10 ml", "100 ml", "1000 ml", "10,000 ml"], correctIndex: 2, explanation: "1 litre = 1000 millilitres (ml). This is like saying 1 kg = 1000 g — the kilo prefix always means 1000." },
      { question: "Two angles at a point are 130° and 80°. What is the third angle at the same point?", options: ["30°", "50°", "100°", "150°"], correctIndex: 3, explanation: "Angles around a point add to 360°. Third angle = 360° − 130° − 80° = 150°, which is a reflex angle." },
      { question: "A parallelogram has base 7 cm and perpendicular height 4 cm. What is its area?", options: ["11 cm²", "22 cm²", "28 cm²", "56 cm²"], correctIndex: 2, explanation: "Area of parallelogram = base × perpendicular height = 7 × 4 = 28 cm². Do not use the slant side." },
      { question: "What is the circumference of a circle with radius 5 cm? (Use π ≈ 3.14)", options: ["15.7 cm", "31.4 cm", "78.5 cm", "157 cm"], correctIndex: 1, explanation: "Circumference = 2πr = 2 × 3.14 × 5 = 31.4 cm. Alternatively, C = πd = 3.14 × 10 = 31.4 cm." },
      { question: "Which conversion is correct?", options: ["1 m² = 100 cm²", "1 m² = 1000 cm²", "1 m² = 10,000 cm²", "1 m² = 100,000 cm²"], correctIndex: 2, explanation: "1 m = 100 cm, so 1 m² = 100 × 100 = 10,000 cm². Squaring the unit means squaring the conversion factor." },
      { question: "A triangular prism has a triangular cross-section with area 15 cm² and a length of 9 cm. What is its volume?", options: ["24 cm³", "45 cm³", "120 cm³", "135 cm³"], correctIndex: 3, explanation: "Volume of prism = cross-section area × length = 15 × 9 = 135 cm³. This formula works for any prism." },
    ];
  }

  const base: { question: string; options: string[]; correctIndex: number; explanation: string }[] = [
    {
      question: `Which best describes ${topic.title}?`,
      options: ["Something unrelated", "The core concept you studied", "An advanced topic only", "Only for beginners"],
      correctIndex: 1,
      explanation: "The core concept you studied is the main idea of this topic. The other options don't match what we learned.",
    },
    {
      question: "When would you use this in real life?",
      options: ["Never", "In situations that match the examples", "Only in exams", "Only in school"],
      correctIndex: 1,
      explanation: "We use this topic in real life whenever the situation matches the examples (e.g. shopping, measuring, sharing). It's not only for exams or school.",
    },
    {
      question: "What should you do next after this topic?",
      options: ["Stop learning", "Practice more and try the next topic", "Skip to another subject", "Only revise for tests"],
      correctIndex: 1,
      explanation: "Practising more and then moving to the next topic helps you remember and build on what you've learned.",
    },
    {
      question: `What is the main purpose of learning ${topic.title}?`,
      options: ["To pass tests only", "To understand and use the idea in real situations", "To memorise formulas", "To finish the course quickly"],
      correctIndex: 1,
      explanation: "The main purpose is to understand the idea and use it in real situations. Tests and formulas support that understanding.",
    },
    {
      question: "Which skill does this topic help you build?",
      options: ["Only writing", "Reasoning and applying ideas", "Only reading", "Only listening"],
      correctIndex: 1,
      explanation: "This topic helps you build reasoning and applying ideas: you think through problems and use what you've learned.",
    },
    {
      question: "How do key points help you?",
      options: ["They replace practice", "They summarise what matters most", "They are only for teachers", "They are optional"],
      correctIndex: 1,
      explanation: "Key points summarise what matters most so you can remember and apply the main ideas. Practice then reinforces them.",
    },
    {
      question: "Why are examples useful?",
      options: ["To copy in exams", "To see how the idea works in a concrete case", "To skip reading", "To fill space"],
      correctIndex: 1,
      explanation: "Examples show how the idea works in a concrete case, which makes it easier to understand and use in similar situations.",
    },
    {
      question: "What does 'apply' mean in this topic?",
      options: ["Ignore it", "Use the idea in a real or new situation", "Only in class", "Only in homework"],
      correctIndex: 1,
      explanation: "To apply means to use the idea in a real or new situation, not just repeat definitions. That shows you understand.",
    },
    {
      question: "When is it best to try the Practice questions?",
      options: ["Before reading", "After working through the lessons", "Never", "Only before the test"],
      correctIndex: 1,
      explanation: "It's best to try Practice after working through the lessons so you can use what you've just learned and see what you need to revise.",
    },
    {
      question: "What does a good answer to a practice question need?",
      options: ["Only one word", "Your own words and a clear example or explanation", "Exactly the textbook text", "Nothing written"],
      correctIndex: 1,
      explanation: "A good answer uses your own words and includes a clear example or explanation. That shows you understand, not just memorise.",
    },
    {
      question: `How does ${topic.title} connect to other topics?`,
      options: ["It doesn't", "It builds on earlier ideas and links to later ones", "Only to one other topic", "Only in this subject"],
      correctIndex: 1,
      explanation: "Topics in the curriculum build on earlier ideas and link to later ones. Seeing these connections helps you understand the subject as a whole.",
    },
    {
      question: "Why is it useful to explain something to a friend?",
      options: ["It isn't", "It checks that you really understand", "Only to help them", "Only for speaking practice"],
      correctIndex: 1,
      explanation: "Explaining to a friend in simple words checks that you really understand. If you can teach it, you know it well.",
    },
    {
      question: "What should you do if you get an assessment question wrong?",
      options: ["Ignore it", "Read the explanation and review that part of the topic", "Only look at the right answer", "Skip the topic"],
      correctIndex: 1,
      explanation: "Reading the explanation and reviewing that part of the topic helps you learn from the mistake and improve next time.",
    },
    {
      question: "What is the role of the Explain section?",
      options: ["To replace lessons", "To give an overview of what you'll learn", "To test you", "To list only keywords"],
      correctIndex: 1,
      explanation: "The Explain section gives an overview of what you'll learn in the topic so you know what to expect and how it fits together.",
    },
    {
      question: "Why do we have Lessons, Practice and Assessment?",
      options: ["To make the page long", "To learn step by step, practise, then check understanding", "Only for teachers", "Only one is needed"],
      correctIndex: 1,
      explanation: "Lessons teach step by step, Practice lets you use the ideas, and Assessment checks your understanding. Together they support learning.",
    },
    {
      question: "Which is a sign that you understand a topic?",
      options: ["You can recite the title", "You can explain it and use it in an example", "You finished the page", "You skipped the assessment"],
      correctIndex: 1,
      explanation: "Being able to explain the topic and use it in an example is a strong sign of understanding. Reciting or just finishing the page is not enough.",
    },
    {
      question: "What is the best way to use the correct answer after the assessment?",
      options: ["Copy it and forget", "Compare it with your answer and read the explanation to see why it's right", "Only remember the letter", "Ignore it"],
      correctIndex: 1,
      explanation: "Comparing the correct answer with your answer and reading the explanation helps you see why it's right and what to improve.",
    },
    {
      question: "How often should you revisit a topic?",
      options: ["Never", "When you need it or when revising", "Only before exams", "Only once"],
      correctIndex: 1,
      explanation: "Revisiting when you need the idea or when revising helps you remember and use it. You don't have to do it only before exams.",
    },
    {
      question: "What does progress in the assessment mean?",
      options: ["Only how many you answered", "How many questions you've answered and how you're doing", "Only the score", "Only the percentage"],
      correctIndex: 1,
      explanation: "Progress shows how many questions you've answered and how you're doing. The score and percentage after submit show your final result.",
    },
    {
      question: "Why are there 20 questions in the assessment?",
      options: ["To take a long time", "To cover the topic well and give you enough practice", "To match the number of lessons", "To make it hard"],
      correctIndex: 1,
      explanation: "Having 20 questions helps cover the topic well and gives you enough practice and feedback. Each question and explanation reinforces your learning.",
    },
  ];
  return base;
}

function getPracticeQuestionsForLesson(detail: ReturnType<typeof getLessonDetail>, yearNum?: number): {
  question: string;
  hint: string;
  explanation: string;
}[] {
  // Keep questions anchored to the exact lesson content shown on screen:
  // - one per core concept (up to 4)
  // - one based on the lesson example
  // - one based on the lesson summary
  const coreConcepts = detail.coreConcepts.slice(0, 4);
  const yearInstruction =
    yearNum === 10 || yearNum === 11
      ? "Answer formally: show working, use correct notation/units, and check your answer."
      : yearNum === 9
        ? "Answer with clear step-by-step reasoning (not just the final answer)."
        : yearNum === 8
          ? "Use step-by-step explanations and try an example that matches your core concept."
          : "Keep it simple: explain the idea and give a basic example.";

  const questions: { question: string; hint: string; explanation: string }[] = coreConcepts.map((c) => ({
    question: `Explain "${c.name}" in your own words.`,
    hint: `${yearInstruction} Use the definition from the Core concepts section.`,
    explanation: c.explanation,
  }));

  questions.push({
    question: "Use the Example to explain the main idea step-by-step.",
    hint: `${yearInstruction} Refer to the Example text and describe what happens.`,
    explanation: detail.example,
  });

  questions.push({
    question: "Write the most important takeaway from the Summary.",
    hint: `${yearInstruction} Look at the Summary section above.`,
    explanation: detail.lessonSummary,
  });

  return questions;
}

function LessonsTab({
  subjectId,
  topicId,
  topic,
  year,
}: {
  subjectId?: string;
  topicId?: string;
  topic: { title: string; description: string; years: number[] };
  year?: number;
}) {
  const yearNum = year ?? topic.years?.[0];
  const lessons = getLessonTitlesForTopic(topic, yearNum);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const selectedLesson = selectedIndex !== null ? lessons[selectedIndex] : null;
  const detail = selectedLesson
    ? deepenLessonByYear(getLessonDetail(selectedLesson, topic.title, yearNum), yearNum)
    : null;
  const canPrev = selectedIndex !== null && selectedIndex > 0;
  const canNext =
    selectedIndex !== null && selectedIndex >= 0 && selectedIndex < lessons.length - 1;

  // Persist completion locally (renderer-side). This mirrors the “tick” UX of AI Academy,
  // but uses localStorage since Learning Academy doesn't have a DB progress table yet.
  const completionStorageKey = `learning-academy:lesson-complete:${subjectId ?? "unknown"}:${topicId ?? "unknown"}:${topic.title}:year:${yearNum ?? "unknown"}`;
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(completionStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setCompletedLessons(new Set(parsed.filter((v) => typeof v === "string")));
    } catch (err) {
      console.warn("[LearningAcademy] Failed to load lesson completion:", err);
    }
  }, [completionStorageKey]);

  const toggleLessonComplete = (lessonTitle: string) => {
    setCompletedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonTitle)) next.delete(lessonTitle);
      else next.add(lessonTitle);
      try {
        localStorage.setItem(completionStorageKey, JSON.stringify(Array.from(next)));
      } catch (err) {
        console.warn("[LearningAcademy] Failed to persist lesson completion:", err);
      }
      return next;
    });
  };

  const selectedIsComplete = selectedLesson ? completedLessons.has(selectedLesson) : false;
  const yearLabel = yearNum ? `Year ${yearNum}` : "";
  const lessonPracticeQuestions = detail ? getPracticeQuestionsForLesson(detail, yearNum) : [];
  const [lessonPracticeAnswers, setLessonPracticeAnswers] = useState<string[]>(
    () => (lessonPracticeQuestions.length ? lessonPracticeQuestions.map(() => "") : [])
  );

  useEffect(() => {
    setLessonPracticeAnswers(lessonPracticeQuestions.map(() => ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLesson]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <div className="lg:col-span-1">
        <p className="text-gray-700 dark:text-gray-300 mb-4 text-base">
          Work through these lessons in order. Select one to see the full lesson on the right.
        </p>
        <ul className="space-y-2">
          {lessons.map((title, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                  selectedIndex === i
                    ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 dark:border-teal-600"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-teal-300 dark:hover:border-teal-600"
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 font-semibold text-sm">
                  {i + 1}
                </span>
                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm break-words min-w-0">{title}</p>
                {completedLessons.has(title) ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 ml-auto flex-shrink-0" />
                ) : (
                  <PlayCircle className="h-4 w-4 text-teal-500 shrink-0 ml-auto flex-shrink-0" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:col-span-4 min-w-0 max-h-[calc(100vh-10rem)] overflow-y-auto overflow-x-hidden">
        {detail ? (
          <div className="p-8 pb-16 rounded-2xl bg-white dark:bg-gray-900 shadow-lg space-y-8 w-full">
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {yearLabel}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-3">
              {selectedLesson}
            </h2>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedIndex((v) => (v === null ? v : Math.max(0, v - 1)))}
                disabled={!canPrev}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setSelectedIndex((v) => (v === null ? v : Math.min(lessons.length - 1, v + 1)))}
                disabled={!canNext}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-start pt-1">
              <button
                type="button"
                onClick={() => {
                  if (!selectedLesson) return;
                  if (selectedIsComplete) return;
                  toggleLessonComplete(selectedLesson);
                }}
                disabled={selectedIsComplete}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold shadow-md ${
                  selectedIsComplete
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-teal-50 text-teal-800 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-200 dark:hover:bg-teal-900/30"
                } ${selectedIsComplete ? "opacity-90 cursor-not-allowed" : ""}`}
              >
                {selectedIsComplete ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Completed
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Mark as Complete
                  </>
                )}
              </button>
            </div>

            <section>
              <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">
                {detail.intro}
              </p>
            </section>
            {detail.learningObjectives && detail.learningObjectives.length > 0 && (
              <section className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wide mb-3">What you will learn</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                  {detail.learningObjectives.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <h3 className="text-lg font-bold text-teal-800 dark:text-teal-200 mb-4">Core concepts</h3>
              <ul className="space-y-4">
                {detail.coreConcepts.map((c, i) => (
                  <li key={i} className="pl-4 border-l-4 border-teal-300 dark:border-teal-600">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-1">{c.name}</p>
                    <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">{c.explanation}</p>
                  </li>
                ))}
              </ul>
            </section>
            <section className="p-5 rounded-xl bg-teal-50 dark:bg-teal-900/20 border-2 border-teal-200 dark:border-teal-800">
              <h3 className="text-lg font-bold text-teal-800 dark:text-teal-200 mb-3">Example</h3>
              <p className="text-teal-900 dark:text-teal-100 text-base leading-relaxed">{detail.example}</p>
            </section>
            <section className="p-5 rounded-xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Summary</h3>
              <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">{detail.lessonSummary}</p>
            </section>

            {lessonPracticeQuestions.length > 0 && (
              <section className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Practice (from this lesson)</h3>
                <div className="space-y-4">
                  {lessonPracticeQuestions.map((q, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40"
                    >
                      <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {i + 1}. {q.question}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">Hint: {q.hint}</p>
                      <textarea
                        className="mt-2 w-full min-h-[70px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                        placeholder="Type your answer here..."
                        aria-label={`Lesson practice answer ${i + 1}`}
                        value={lessonPracticeAnswers[i] ?? ""}
                        onChange={(e) => {
                          const next = [...lessonPracticeAnswers];
                          next[i] = e.target.value;
                          setLessonPracticeAnswers(next);
                        }}
                      />
                      <div className="mt-3 p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
                        <p className="text-xs font-semibold text-teal-800 dark:text-teal-200 mb-1">
                          What to include
                        </p>
                        <p className="text-sm text-teal-800 dark:text-teal-200">{q.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              When you're done with this lesson, try the Practice and Assessment tabs to check your understanding.
            </p>
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-600 text-center text-gray-500 dark:text-gray-400 text-base">
            Select a lesson from the list to see the full lesson here.
          </div>
        )}
      </div>
    </div>
  );
}

function AssessmentTab({
  topic,
}: {
  topic: { title: string };
}) {
  const questions = getAssessmentQuestionsForTopic(topic);
  const [selected, setSelected] = useState<number[]>(questions.map(() => -1));
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (qIndex: number, optionIndex: number) => {
    if (submitted) return;
    setSelected((prev) => {
      const next = [...prev];
      next[qIndex] = optionIndex;
      return next;
    });
  };

  const score = questions.reduce((acc, q, i) => acc + (selected[i] === q.correctIndex ? 1 : 0), 0);
  const total = questions.length;

  const resetAssessment = () => {
    setSelected(questions.map(() => -1));
    setSubmitted(false);
  };

  const pct = total ? Math.round((score / total) * 100) : 0;
  const answeredCount = selected.filter((s) => s >= 0).length;
  const progressPct = total ? Math.round((answeredCount / total) * 100) : 0;

  return (
    <div>
      <p className="text-gray-700 dark:text-gray-300 mb-6">
        Choose one answer per question. When you’re done, click Submit to see your score and explained answers.
      </p>
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Progress: {answeredCount} of {total} answered</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-full bg-teal-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
      <div className="space-y-6">
        {questions.map((q, qIndex) => (
          <div
            key={qIndex}
            className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
                Question {qIndex + 1} of {total}
              </span>
            </div>
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-3">
              {q.question}
            </p>
            <ul className="space-y-2">
              {q.options.map((opt, optIndex) => {
                const isSelected = selected[qIndex] === optIndex;
                const showCorrect = submitted && optIndex === q.correctIndex;
                const showWrong = submitted && isSelected && optIndex !== q.correctIndex;
                return (
                  <li key={optIndex}>
                    <button
                      type="button"
                      onClick={() => handleSelect(qIndex, optIndex)}
                      className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                        showCorrect
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : showWrong
                            ? "border-red-400 bg-red-50 dark:bg-red-900/20"
                            : isSelected
                              ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                              : "border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      {submitted ? (
                        showCorrect ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                        ) : showWrong ? (
                          <Circle className="h-5 w-5 text-red-500 shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400 shrink-0" />
                        )
                      ) : (
                        <Circle className={`h-5 w-5 shrink-0 ${isSelected ? "text-teal-600" : "text-gray-400"}`} />
                      )}
                      <span className="text-gray-900 dark:text-gray-100">{opt}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {submitted && (
              <div className="mt-4 space-y-1 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  Correct answer: {q.options[q.correctIndex]}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {q.explanation}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
      {!submitted ? (
        <div className="mt-8 flex flex-col items-start gap-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Answer every question above, then click Submit to see your score and the correct answers.
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            disabled={selected.some((s) => s === -1)}
            className="px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            Submit assessment
          </button>
        </div>
      ) : (
        <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-2 border-teal-200 dark:border-teal-800 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/50">
              <Trophy className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-teal-900 dark:text-teal-100">
                {score} / {total} correct
              </p>
              <p className="text-sm font-medium text-teal-700 dark:text-teal-300">{pct}%</p>
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {score === total
              ? "Well done! You’re ready for the next topic."
              : "Review the Explain and Lessons tabs, then try again to improve your score."}
          </p>
          <button
            type="button"
            onClick={resetAssessment}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 font-medium hover:bg-teal-100 dark:hover:bg-teal-900/30"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export function LearningAcademyCurriculumTopic() {
  const { subjectId, topicId } = useParams({ from: "/learning-academy/curriculum/$subjectId/$topicId" });
  const search = useSearch({ from: "/learning-academy/curriculum/$subjectId/$topicId" }) as {
    year?: number;
  };
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("explain");

  const subject = subjectId ? getSubject(subjectId) : undefined;
  const topic = subjectId && topicId ? getTopic(subjectId, topicId) : undefined;

  const orderedTopics = subject ? subject.topics.slice().sort((a, b) => a.order - b.order) : [];
  const topicIndex = topic ? orderedTopics.findIndex((t) => t.id === topic.id) : -1;
  const prevTopic = topicIndex > 0 ? orderedTopics[topicIndex - 1] : null;
  const nextTopic =
    topicIndex >= 0 && topicIndex < orderedTopics.length - 1 ? orderedTopics[topicIndex + 1] : null;

  const selectedYear =
    topic && search.year && topic.years.includes(search.year as any)
      ? search.year
      : topic?.years?.[0] ?? 7;

  const handleBackToSubject = () => {
    if (subjectId) {
      const year = selectedYear;
      router.navigate({
        to: "/learning-academy/curriculum",
        // TanStack Router typing can be overly strict with string `to` values.
        search: (year ? { subjectId, year } : { subjectId }) as any,
      });
    } else {
      router.navigate({ to: "/learning-academy/curriculum" });
    }
  };

  if (!subject || !topic) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-gray-500">Topic not found.</p>
        <button
          type="button"
          onClick={handleBackToSubject}
          className="text-teal-600 dark:text-teal-400 mt-2 inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full">
      <div className="p-6 w-full max-w-[1600px] mx-auto pb-20">
        <div className="flex items-center gap-4 mb-4">
          <button
            type="button"
            onClick={handleBackToSubject}
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {subject.title}
          </button>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">{subject.emoji}</span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 break-words min-w-0">
              {topic.title}
            </h1>
            <span className="text-gray-500 dark:text-gray-400 text-sm shrink-0">
              Year {selectedYear}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          {prevTopic ? (
            <Link
              to="/learning-academy/curriculum/$subjectId/$topicId"
              params={{ subjectId, topicId: prevTopic.id } as any}
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous topic: {prevTopic.title}
            </Link>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-600" />
          )}
          {nextTopic ? (
            <Link
              to="/learning-academy/curriculum/$subjectId/$topicId"
              params={{ subjectId, topicId: nextTopic.id } as any}
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400"
            >
              Next topic: {nextTopic.title}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-600" />
          )}
        </div>

        {/* Tabs: Explain | Lessons | Practice | Assessment */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === id
                  ? "border-teal-600 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "explain" && (
        <div className="prose dark:prose-invert max-w-none">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-0">What you’ll learn</h3>
          <p className="text-gray-700 dark:text-gray-300">
            In <strong>{topic.title}</strong> you will cover: {topic.description}
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-3">
            Work through the <strong>Lessons</strong> tab in order, then use <strong>Practice</strong> to reinforce your understanding. When you’re ready, take the <strong>Assessment</strong> to check your progress.
          </p>
        </div>
      )}

      {activeTab === "lessons" && (
        <LessonsTab subjectId={subjectId} topicId={topicId} topic={topic} year={selectedYear} />
      )}

      {activeTab === "practice" && (
        <div>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Answer in your own words. Use the hint if stuck; read the explanation to see what we’re looking for.
          </p>
          <div className="space-y-6">
            {getPracticeQuestionsForTopic(topic).map((q, i) => (
              <div
                key={i}
                className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {i + 1}. {q.question}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">Hint: {q.hint}</p>
                <textarea
                  className="mt-3 w-full min-h-[80px] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                  placeholder="Type your answer here..."
                  aria-label={`Your answer for question ${i + 1}`}
                />
                <div className="mt-3 p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
                  <p className="text-xs font-semibold text-teal-800 dark:text-teal-200 mb-1">What we’re looking for</p>
                  <p className="text-sm text-teal-800 dark:text-teal-200">{q.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "assessment" && (
        <div className="min-h-[60vh]">
          <AssessmentTab topic={topic} />
        </div>
      )}
      </div>
    </div>
  );
}
