import React, { useState } from "react";
import { Link, useParams, useRouter } from "@tanstack/react-router";
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

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "explain", label: "Explain", icon: BookOpen },
  { id: "lessons", label: "Lessons", icon: ListOrdered },
  { id: "practice", label: "Practice", icon: PenLine },
  { id: "assessment", label: "Assessment", icon: ClipboardCheck },
];

/** Derive lesson titles from topic description (e.g. "Place value, four operations, fractions" -> 3 lessons) */
function getLessonTitlesForTopic(topic: { title: string; description: string }): string[] {
  const parts = topic.description.split(/[,.]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.map((p, i) => `Lesson ${i + 1}: ${p}`);
  return [
    `Lesson 1: Introduction to ${topic.title}`,
    `Lesson 2: Key concepts`,
    `Lesson 3: Applying ${topic.title}`,
  ];
}

/** Lesson detail: intro, optional learning objectives, core concepts, example, lesson summary */
function getLessonDetail(lessonTitle: string, topicTitle: string): {
  intro: string;
  learningObjectives?: string[];
  coreConcepts: { name: string; explanation: string }[];
  example: string;
  lessonSummary: string;
} {
  const t = lessonTitle.toLowerCase();
  if (t.includes("place value")) {
    return {
      intro: "Place value is one of the most important ideas in maths: the value of a digit depends on where it sits in the number. The 3 in 34 means 3 tens (30), but the 3 in 304 means 3 hundreds (300). This lesson explains how ones, tens, hundreds and thousands work, and why we use zero as a placeholder. Everything we do with larger numbers and decimals builds on place value.",
      learningObjectives: [
        "Understand that each position in a number is a 'place' (ones, tens, hundreds, thousands).",
        "Work out the value of a digit using its place (digit × place value).",
        "Understand base 10: each place is 10 times the one to its right.",
        "Use zero as a placeholder so other digits stay in the correct places.",
      ],
      coreConcepts: [
        { name: "Place", explanation: "Each position in a number is a 'place'. Starting from the right: ones (1), tens (10), hundreds (100), thousands (1000), and so on. The ones place is for single items; the tens place is for groups of 10; the hundreds for groups of 100. Reading from left to right we go from the largest place to the smallest." },
        { name: "Value", explanation: "The value of a digit equals the digit multiplied by the value of its place. In 342: the 3 is in the hundreds place, so 3 × 100 = 300; the 4 is in the tens place, so 4 × 10 = 40; the 2 is in the ones place, so 2 × 1 = 2. So 342 = 300 + 40 + 2. This is called expanded form." },
        { name: "Base 10", explanation: "Our number system is base 10: each place is 10 times the one to its right. So 10 ones = 1 ten, 10 tens = 1 hundred, 10 hundreds = 1 thousand. We use this when we regroup in addition and subtraction (e.g. when we 'carry' or 'borrow') and when we read and write numbers." },
        { name: "Zero as placeholder", explanation: "When a place has no amount, we write 0 so that the other digits stay in the right places. In 2,507 the 0 means 'no tens'. Without the zero we would write 257, which is a different number. Zero is essential for writing numbers like 105, 2,007 and 30 correctly." },
      ],
      example: "In 2,507: 2 thousands (2 × 1000 = 2000), 5 hundreds (5 × 100 = 500), 0 tens (0 × 10 = 0), 7 ones (7 × 1 = 7). So 2,507 = 2000 + 500 + 0 + 7. We read it as 'two thousand, five hundred and seven'. The zero keeps the 5 in the hundreds place and the 7 in the ones place.",
      lessonSummary: "You now know that each digit's value depends on its place; that we use base 10 (each place is 10× the one to the right); and that zero holds a place when there are no tens, hundreds, etc. Use this to read, write, compare and calculate with numbers confidently.",
    };
  }
  if (t.includes("four operations") || t.includes("operations")) {
    return {
      intro: "The four operations—add, subtract, multiply and divide—are the building blocks of arithmetic. We use them to combine amounts, find differences, make equal groups, and share fairly.",
      coreConcepts: [
        { name: "Addition (+)", explanation: "Putting amounts together. We add when we combine two or more groups or numbers to find the total." },
        { name: "Subtraction (−)", explanation: "Taking away or finding the difference. We subtract when we remove some or compare how much more or less one number is than another." },
        { name: "Multiplication (×)", explanation: "Equal groups or repeated addition. We multiply when we have several equal groups and want the total (e.g. 4 bags of 5 apples = 4 × 5 = 20)." },
        { name: "Division (÷)", explanation: "Sharing equally or grouping. We divide when we split an amount into equal parts or put items into equal-sized groups." },
      ],
      example: "If you have 24 sweets and share them among 6 friends: 24 ÷ 6 = 4 sweets each.",
      lessonSummary: "You have learned the four operations: add (combine), subtract (take away or difference), multiply (equal groups), and divide (share or group). Use them to solve real problems and always check your answer makes sense.",
    };
  }
  if (t.includes("fraction")) {
    return {
      intro: "Fractions are how we describe parts of a whole: half a pizza, a quarter of an hour, three fifths of the class. In this lesson we learn what the top and bottom numbers mean, how to find equivalent fractions, and why we need the same denominator when we add or subtract. These ideas are used in measuring, sharing and later in percentages and algebra.",
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
      example: "A pizza is cut into 4 equal slices. You eat 2 slices. You have eaten 2/4 of the pizza. 2/4 = ½ (divide numerator and denominator by 2), so we say you ate half the pizza. To add ½ + ¼: write ½ as 2/4, then 2/4 + ¼ = 3/4.",
      lessonSummary: "You now know that the numerator is the number of parts we have and the denominator is the number of equal parts in the whole; that equivalent fractions represent the same amount; and that we need the same denominator to add or subtract fractions. Use this when sharing, measuring and in later topics like percentages.",
    };
  }
  if (t.includes("decimal")) {
    return {
      intro: "Decimals let us write numbers that are not whole: amounts between 0 and 1, or a mix of whole and parts (like 3.45). We use them for money (£3.45), measures (2.5 kg), and in almost every calculation. This lesson covers what the decimal point means, how tenths and hundredths work, and how to read, order and use decimals.",
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
      example: "£3.45 means 3 pounds and 45 pence: 3 whole, 4 tenths and 5 hundredths of a pound. To add £1.30 + £2.45: align the decimals, add column by column: 1.30 + 2.45 = 3.75, so £3.75.",
      lessonSummary: "You now know how the decimal point separates wholes from parts of one; how tenths and hundredths work and link to fractions; and how to read, order and use decimals in money and measures. Use this whenever you see numbers with a decimal point.",
    };
  }
  if (t.includes("percentage")) {
    return {
      intro: "Percentages are everywhere: in shops (25% off), in tests (you got 80%), and in the news (e.g. 30% of people said yes). In this lesson we learn what a percentage really is, how it links to fractions and decimals, and how to work out simple percentages so you can use them in real life.",
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
      example: "A coat costs £20 and is 25% off. 25% of £20 = ¼ of 20 = £5, so you save £5 and pay £15. Alternatively: 10% of 20 = £2, so 20% = £4 and 5% = £1; 25% = 20% + 5% = £4 + £1 = £5. Same answer.",
      lessonSummary: "You now know that a percentage is a number out of 100; how to convert between percentages, fractions and decimals; how to find 10% by dividing by 10 and use it to find other percentages; and how to use percentages in real situations like discounts and scores. Practise with the Practice and Assessment tabs.",
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
      example: "Solve 3x − 4 = 11. Step 1: add 4 to both sides → 3x = 15. Step 2: divide both sides by 3 → x = 5. Check: 3(5) − 4 = 15 − 4 = 11 ✓. The solution is x = 5.",
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
      example: "Sequence: 2, 5, 8, 11, … First term a = 2, common difference d = 3. nth-term = 2 + (n − 1) × 3 = 3n − 1. 10th term = 3(10) − 1 = 29. Is 100 a term? 3n − 1 = 100 → n = 33.67 — no. Is 98 a term? 3n − 1 = 98 → n = 33 — yes, the 33rd term.",
      lessonSummary: "You now know what an arithmetic sequence is and what the common difference means; how to describe the term-to-term rule; how to find and apply an nth-term formula; and how to check whether a number is in a sequence. Use this in pattern problems, predictions and GCSE exam questions.",
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
        { name: "Common formulae to know", explanation: "Important formulae include: Area of rectangle = length × width (A = lw); Perimeter of rectangle = 2(l + w); Area of triangle = ½ × base × height; Speed = distance ÷ time (s = d/t); Circumference of circle = 2πr; Area of circle = πr². Knowing these lets you tackle a wide range of GCSE problems." },
      ],
      example: "Formula: speed = distance ÷ time. A car travels 120 km in 2 hours. Speed = 120 ÷ 2 = 60 km/h. Now rearrange to find distance: distance = speed × time. If speed = 60 km/h and time = 3 hours, distance = 60 × 3 = 180 km.",
      lessonSummary: "You now know what a formula is and how it expresses a rule using letters; how to substitute values to calculate unknowns; how to rearrange a simple formula to change its subject; and several important common formulae. These skills are essential across maths, science and GCSE exams.",
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
      lessonSummary: "You now know what an angle is; how to name types of angle; the rules for angles on a line, at a point, and in triangles and quadrilaterals; and how to calculate missing angles. These skills are used throughout geometry and are essential for GCSE.",
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
        { name: "Units of area and volume", explanation: "Area is measured in square units: 1 m² = 10,000 cm² (because 100 × 100 = 10,000). Volume is measured in cubic units: 1 m³ = 1,000,000 cm³ (100 × 100 × 100). Also: 1 cm³ = 1 ml, so 1 litre = 1000 cm³. These links between area, volume and capacity are frequently tested at GCSE." },
        { name: "Imperial units and conversions", explanation: "Imperial units are still used in everyday life in the UK. Key approximate conversions: 1 inch ≈ 2.54 cm; 1 foot = 12 inches ≈ 30 cm; 1 mile ≈ 1.6 km (or 5 miles ≈ 8 km); 1 pound (lb) ≈ 454 g; 1 stone = 14 lb; 1 pint ≈ 568 ml; 1 gallon ≈ 4.5 litres. Approximate conversions are enough for most GCSE questions." },
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
      example: "Squash in ratio 1 : 4: 50 ml cordial needs 200 ml water (50×4). Same ratio as 1 and 4.",
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
      example: "A ladder leans against a wall and makes 70° with the ground. The ladder is 5 m long. Height up the wall = 5 × sin(70°) ≈ 4.7 m. Here the hypotenuse is the ladder (5 m) and we want the opposite side (height), so we use sin.",
      lessonSummary: "You now know the sides of a right-angled triangle (hypotenuse, opposite, adjacent); the definitions of sin, cos and tan and SOH CAH TOA; and how to use one of the ratios to find a missing side or angle. Use this for simple applications like heights and distances.",
    };
  }
  if (t.includes("calculus") || t.includes("rates of change") || t.includes("gradient")) {
    return {
      intro: "Calculus helps us understand how things change. Two big ideas are rates of change (how fast something changes) and gradients (how steep a graph is). These ideas lead to the calculus you will meet at GCSE and beyond. This lesson introduces what 'rate of change' and 'gradient' mean in real and graphical contexts.",
      coreConcepts: [
        { name: "Rate of change", explanation: "A rate of change is how much one quantity changes when another changes. Speed is a rate of change: distance per unit of time (e.g. metres per second). We also see rates like cost per kilogram, or temperature change per minute. The steeper the change, the greater the rate." },
        { name: "Gradient of a line", explanation: "On a graph, the gradient (slope) of a straight line tells you the rate of change. Gradient = vertical change ÷ horizontal change (rise over run). A steeper line means a bigger gradient. If the line goes down as we go right, the gradient is negative." },
        { name: "Gradient and real meaning", explanation: "The gradient of a distance–time graph is speed. The gradient of a cost–quantity graph is the price per unit. So the gradient is not just a number—it has a meaning that depends on what is on each axis." },
        { name: "Introduction to calculus", explanation: "When the graph is a curve, the gradient changes from point to point. Calculus gives us a way to find the gradient at any point on a curve. That is the idea of 'derivative' you will meet later. For now, knowing that gradient means rate of change on a graph is the first step." },
      ],
      example: "A car travels 60 miles in 2 hours. Rate of change of distance with time = 60 ÷ 2 = 30 miles per hour. On a distance–time graph for this journey, the line would have gradient 30 (miles per hour).",
      lessonSummary: "You now know what a rate of change is and examples like speed; what the gradient of a line means on a graph; how to link gradient to real-world meaning (e.g. speed, price); and that calculus extends this to curves. Use this to read and interpret graphs and simple rates.",
    };
  }
  // Physics
  if (t.includes("push") || t.includes("pull") || t.includes("gravity") || t.includes("friction") || t.includes("balanced force")) {
    return {
      intro: "Forces are what make things move, stop or change direction. In this lesson we look at what a force is (a push or a pull), gravity (the pull towards the Earth), friction (what slows things down when surfaces rub), and what we mean by balanced forces—when nothing changes because the forces cancel out. These ideas help you explain why a ball falls, why a car slows down when you brake, and why a book stays still on a table.",
      learningObjectives: [
        "Describe a force as a push or a pull and give everyday examples.",
        "Explain what gravity is and how it affects weight and falling.",
        "Explain what friction is and how it affects motion.",
        "Explain balanced forces and when an object does not change motion.",
      ],
      coreConcepts: [
        { name: "Push and pull", explanation: "A force is a push or a pull. When you kick a ball you push it; when you open a drawer you pull it. Forces can make things start moving, stop moving, speed up, slow down or change direction. We measure the size of a force in newtons (N). The bigger the force, the greater its effect (e.g. a harder kick sends the ball further)." },
        { name: "Gravity", explanation: "Gravity is a pull towards the centre of the Earth. It makes unsupported objects fall and gives objects weight. Weight is the force of gravity on an object. On the Moon, gravity is weaker, so the same object would weigh less and fall more slowly. We take gravity for granted on Earth, but it is what keeps us on the ground and makes things drop." },
        { name: "Friction", explanation: "Friction is a force between two surfaces when they rub or slide past each other. It acts against the direction of motion, so it slows things down. Friction can also make things warm (e.g. rubbing your hands together). Rough surfaces usually have more friction than smooth ones; that's why it's harder to slide a heavy box on carpet than on a smooth floor." },
        { name: "Balanced forces", explanation: "When two (or more) forces on an object are equal in size and opposite in direction, they are balanced. The result is that the object does not change speed or direction. A book on a table: gravity pulls the book down; the table pushes the book up with an equal force. The forces are balanced, so the book stays still. If you push a box at constant speed, the pushing force is balanced by friction—same idea." },
      ],
      example: "A toy car on a ramp: gravity pulls the car down the ramp (that's why it moves). Friction between the wheels and the ramp acts against the motion and slows the car. If you make the ramp smoother, friction is less and the car goes faster. If the car is on a flat table and you don't push it, the forces (e.g. gravity and the table pushing up) are balanced and the car doesn't move.",
      lessonSummary: "You now know that forces are pushes or pulls; that gravity pulls things towards the Earth and gives them weight; that friction opposes motion and can make things warm; and that balanced forces mean no change in motion. Use this to explain everyday movements and simple experiments.",
    };
  }
  if (t.includes("shadow") || t.includes("reflection") || t.includes("refraction") || (t.includes("light") && !t.includes("highlight"))) {
    return {
      intro: "Light is a form of energy we can see. It travels in straight lines. We see things when light from a source bounces off them into our eyes. This lesson covers how we see, shadows, reflection and refraction.",
      coreConcepts: [
        { name: "Light travels in straight lines", explanation: "Light travels in straight lines from a source. We draw light as straight lines (rays). Nothing can go round corners unless it bounces or bends." },
        { name: "Shadows", explanation: "A shadow forms where light is blocked by an opaque object. The shape of the shadow depends on the shape of the object and where the light is. No light reaches the shadow area." },
        { name: "Reflection", explanation: "When light hits a smooth, shiny surface (like a mirror), it bounces off at the same angle. We see ourselves in a mirror because light from us reflects off the mirror into our eyes." },
        { name: "Refraction", explanation: "When light passes from one material into another (e.g. air into water), it can bend. This is refraction. A straw in a glass of water looks bent because of refraction." },
      ],
      example: "On a sunny day, your body blocks sunlight and casts a shadow on the ground. The shadow moves as the Sun appears to move. In a mirror, light from your face reflects off the glass into your eyes so you see your reflection.",
      lessonSummary: "You now know that light travels in straight lines; how shadows form when light is blocked; how reflection bounces light off surfaces; and how refraction bends light at boundaries. Use this to explain everyday seeing, shadows and mirrors.",
    };
  }
  if (t.includes("vibration") || t.includes("pitch") || t.includes("volume") || (t.includes("sound") && !t.includes("resound"))) {
    return {
      intro: "Sound is made by vibrations (something moving back and forth quickly). Sound travels through air, water and solids as a wave. We hear when the sound wave reaches our ears. This lesson covers how sound is made and how it travels.",
      coreConcepts: [
        { name: "Vibrations", explanation: "Sound is produced when something vibrates. For example, a drum skin vibrates when you hit it; a string vibrates when you pluck it. The vibrations push the air and make a sound wave." },
        { name: "Pitch", explanation: "Pitch is how high or low a sound is. Faster vibrations (higher frequency) make a higher pitch; slower vibrations make a lower pitch. A thin, short string has a higher pitch than a thick, long one." },
        { name: "Volume", explanation: "Volume (loudness) depends on how big the vibrations are. Hitting a drum harder makes a louder sound because the vibrations are bigger. We measure loudness in decibels (dB)." },
        { name: "Sound travels", explanation: "Sound needs a material to travel through (air, water, wood, etc.). It cannot travel through empty space. Sound travels faster in solids than in liquids, and faster in liquids than in gases." },
      ],
      example: "When you pluck a guitar string, it vibrates. The vibration travels through the air to your ear. If you make the string tighter or shorter, it vibrates faster and the pitch is higher. Plucking harder makes it louder.",
      lessonSummary: "You now know that sound is made by vibrations; that pitch depends on how fast the vibration is; that volume depends on the size of the vibration; and that sound needs a material to travel through. Use this to explain musical instruments and everyday sounds.",
    };
  }
  if (t.includes("circuit") || t.includes("conductor") || t.includes("insulator") || t.includes("electricity")) {
    return {
      intro: "Electricity can make things work: lights, buzzers, motors. An electric circuit is a closed loop that electricity can flow around. We need a power source (like a cell or battery), wires, and something that uses the energy (e.g. a bulb).",
      coreConcepts: [
        { name: "Circuit", explanation: "A complete circuit is a closed path. Electricity flows from the negative side of the battery, through the wires and the component (e.g. bulb), and back to the positive side. If the loop is broken, the current stops." },
        { name: "Conductors", explanation: "Conductors are materials that let electricity flow through them. Metals (e.g. copper, iron) are good conductors. That is why wires are made of metal." },
        { name: "Insulators", explanation: "Insulators do not let electricity flow. Plastic, rubber and wood are insulators. We use them to cover wires and hold components so we don't get a shock." },
        { name: "Components", explanation: "Components are the parts in a circuit: cells (or batteries), bulbs, buzzers, motors, switches. A switch breaks the circuit when open so we can turn things on and off." },
      ],
      example: "A simple circuit: one cell, two wires, one bulb. One wire goes from the cell to the bulb; the other from the bulb back to the cell. When the circuit is complete, the bulb lights. Add a switch: when the switch is open, the circuit is broken and the bulb goes out.",
      lessonSummary: "You now know what a complete circuit is; that conductors let current flow and insulators do not; and how to use cells, wires, bulbs and switches in a simple circuit. Use this to build and explain simple circuits safely.",
    };
  }
  if (t.includes("energy transfer") || t.includes("types of energy") || t.includes("conservation") || (t.includes("energy") && topicTitle.toLowerCase() === "energy")) {
    return {
      intro: "Energy is what makes things happen. It can be stored (e.g. in a battery or in food) or moving (e.g. in a moving ball). Energy can change from one type to another and be transferred, but it is never created or destroyed.",
      coreConcepts: [
        { name: "Types of energy", explanation: "Common types: kinetic (moving), gravitational potential (height), chemical (in fuels and food), light, sound, electrical, thermal (heat). We name the type by how it is stored or how it is transferred." },
        { name: "Energy transfer", explanation: "Energy is transferred from one place or object to another. For example, when a ball falls, gravitational potential energy is transferred to kinetic energy. When you switch on a lamp, electrical energy is transferred to light and heat." },
        { name: "Conservation of energy", explanation: "Energy cannot be created or destroyed—only changed from one form to another or transferred. The total amount of energy stays the same. Some energy may be transferred to the surroundings as heat." },
        { name: "Useful energy", explanation: "In a device we often want one type of energy (e.g. light from a lamp). Some energy is always transferred in ways we don't want (e.g. heat). We say some energy is 'wasted' to the surroundings." },
      ],
      example: "A battery-powered torch: chemical energy in the battery is transferred as electrical energy through the wires, then to light and heat in the bulb. The total energy is conserved; we just wanted more light and less heat.",
      lessonSummary: "You now know different types of energy; that energy is transferred between stores; that energy is conserved; and that in real devices some energy is useful and some is wasted. Use this to describe everyday energy changes.",
    };
  }
  if (t.includes("speed") || t.includes("distance") || t.includes("time") || (t.includes("motion") && topicTitle.toLowerCase().includes("physics"))) {
    return {
      intro: "Motion is about things moving. We describe motion using speed (how fast), distance (how far) and time (how long). Scientists use graphs and the relationship speed = distance ÷ time to analyse motion.",
      coreConcepts: [
        { name: "Speed", explanation: "Speed is how far something travels in a certain time. We often use metres per second (m/s) or kilometres per hour (km/h). Faster means more distance in the same time, or the same distance in less time." },
        { name: "Distance and time", explanation: "Distance is how far something has moved (e.g. in metres). Time is how long the journey took (e.g. in seconds). We measure these to work out speed." },
        { name: "Speed = distance ÷ time", explanation: "We can calculate speed with: speed = distance ÷ time. So if a car travels 100 m in 5 s, speed = 100 ÷ 5 = 20 m/s. We can also find distance (distance = speed × time) or time (time = distance ÷ speed)." },
        { name: "Distance–time graphs", explanation: "On a distance–time graph, distance is on the vertical axis and time on the horizontal. A steeper line means a faster speed. A flat line means the object is not moving." },
      ],
      example: "A cyclist travels 600 m in 2 minutes. Time in seconds = 2 × 60 = 120 s. Speed = 600 ÷ 120 = 5 m/s. So the cyclist's speed is 5 metres per second.",
      lessonSummary: "You now know what speed, distance and time mean; how to use speed = distance ÷ time; and how to interpret simple distance–time graphs. Use this to describe and compare motions.",
    };
  }
  // Chemistry
  if (t.includes("solid") || t.includes("liquid") || t.includes("gas") || t.includes("states of matter") || t.includes("materials")) {
    return {
      intro: "Materials can be solids, liquids or gases. These are the three states of matter. Solids keep their shape; liquids flow and take the shape of the container; gases spread out to fill the space. Heating or cooling can change the state.",
      coreConcepts: [
        { name: "Solids", explanation: "In a solid, particles are packed close together and vibrate in place. Solids have a fixed shape and volume. Examples: wood, ice, metal." },
        { name: "Liquids", explanation: "In a liquid, particles are close but can move past each other. Liquids flow and take the shape of the container. They have a fixed volume but not a fixed shape. Examples: water, oil." },
        { name: "Gases", explanation: "In a gas, particles are far apart and move quickly. Gases spread out to fill the container. They have no fixed shape or volume. Examples: air, steam." },
        { name: "Changing state", explanation: "Heating can melt a solid to a liquid, or boil a liquid to a gas. Cooling can condense a gas to a liquid, or freeze a liquid to a solid. The particles gain or lose energy." },
      ],
      example: "Water: as ice it is a solid; when we heat it it melts to liquid water; when we heat it more it boils to steam (gas). Cooling steam condenses it back to water; cooling water freezes it back to ice.",
      lessonSummary: "You now know the three states of matter (solid, liquid, gas) and how the arrangement and movement of particles differ; and how heating and cooling can change state. Use this to describe everyday materials and changes.",
    };
  }
  if (t.includes("rock") || t.includes("soil") || t.includes("fossil")) {
    return {
      intro: "Rocks are made of minerals and form in different ways. Soils are a mixture of broken rock, dead plants and animals, air and water. Fossils are the remains or traces of living things preserved in rock.",
      coreConcepts: [
        { name: "Types of rocks", explanation: "Sedimentary rocks form when layers of sediment are squashed (e.g. sandstone). Igneous rocks form when molten rock cools (e.g. granite). Metamorphic rocks form when existing rocks are changed by heat and pressure (e.g. marble)." },
        { name: "Soil", explanation: "Soil is a mixture of weathered rock, humus (decayed plants and animals), water and air. Different soils have different amounts of these. Soil is important for plants to grow." },
        { name: "Fossils", explanation: "Fossils are remains or impressions of living things from long ago, preserved in rock. They tell us about past life and environments. They usually form in sedimentary rock." },
      ],
      example: "Sandstone is a sedimentary rock: sand grains were laid down in layers and over time were squashed and stuck together. Fossils of sea creatures are often found in sedimentary rocks that formed under the sea.",
      lessonSummary: "You now know the main types of rocks and how they form; what soil is made of; and what fossils are and how they help us understand the past. Use this to describe rocks and soils in the environment.",
    };
  }
  if (t.includes("reaction") || t.includes("acid") || t.includes("alkali") || t.includes("indicator")) {
    return {
      intro: "Chemical reactions change substances into new ones. Some substances are acids (e.g. lemon juice, vinegar) and some are alkalis (e.g. soap). We use indicators to tell if something is acid or alkali.",
      coreConcepts: [
        { name: "Chemical reaction", explanation: "In a chemical reaction, one or more substances (reactants) change into new substances (products). There may be a colour change, fizzing, or a temperature change. The new substances have different properties." },
        { name: "Acids and alkalis", explanation: "Acids taste sour (don't taste in the lab!) and can be corrosive. Alkalis feel soapy and can be corrosive too. We use a scale called pH: acids have pH less than 7, alkalis more than 7, and 7 is neutral." },
        { name: "Indicators", explanation: "An indicator is a substance that changes colour in acid or alkali. Universal indicator turns red in strong acids, green in neutral, and blue/purple in alkalis. Litmus is red in acids and blue in alkalis." },
      ],
      example: "Vinegar is an acid. If you add universal indicator to vinegar, it turns red. Adding baking soda (an alkali) can neutralise the acid; the indicator may turn green when the mixture is neutral.",
      lessonSummary: "You now know what a chemical reaction is; the difference between acids and alkalis and the pH scale; and how indicators are used to test for acids and alkalis. Use this to describe safe, simple tests.",
    };
  }
  if (t.includes("particle") || t.includes("atom") || t.includes("molecule")) {
    return {
      intro: "All matter is made of tiny particles: atoms and molecules. The particle model helps us explain the properties of solids, liquids and gases and how they change state.",
      coreConcepts: [
        { name: "Particle model", explanation: "We imagine materials are made of very small particles. In a solid they are close and vibrate; in a liquid they are close but can move; in a gas they are far apart and move quickly. This model explains many properties." },
        { name: "Atoms", explanation: "Atoms are the smallest particles of an element that still have the properties of that element. Different elements have different types of atom (e.g. hydrogen, carbon, oxygen)." },
        { name: "Molecules", explanation: "Molecules are groups of atoms joined together. Water is a molecule made of two hydrogen atoms and one oxygen atom (H₂O). Many gases and liquids are made of molecules." },
      ],
      example: "When we heat a solid, the particles gain energy and vibrate more. Eventually they can overcome the forces holding them in place and the solid melts to a liquid. The particle model explains why heating causes melting.",
      lessonSummary: "You now know the particle model for solids, liquids and gases; what atoms and molecules are; and how the model helps explain states of matter and changes of state. Use this to describe matter at a simple level.",
    };
  }
  // Biology
  if (t.includes("living") || t.includes("life process") || t.includes("classification") || t.includes("habitat")) {
    return {
      intro: "Living things carry out life processes (e.g. feeding, breathing, moving, growing). We can group (classify) them and look at where they live (habitats). This lesson introduces what makes something living and how we group living things.",
      coreConcepts: [
        { name: "Life processes", explanation: "Living things do certain things: they feed (get nutrition), respire (release energy), grow, move, get rid of waste, respond to their surroundings, and reproduce. We use the acronym MRS GREN to remember: Movement, Respiration, Sensitivity, Growth, Reproduction, Excretion, Nutrition." },
        { name: "Classification", explanation: "Classification is grouping living things by their features. We group into kingdoms (e.g. animals, plants), then into smaller groups. Similar features suggest related species." },
        { name: "Habitats", explanation: "A habitat is where an organism lives. It provides food, water, shelter and the right conditions. Different habitats (e.g. pond, woodland, desert) have different living things adapted to them." },
      ],
      example: "A rabbit: it moves, eats plants (nutrition), breathes (respiration), grows, has young (reproduction), and responds to danger. So it is living. We classify it as an animal. Its habitat might be a field or woodland.",
      lessonSummary: "You now know the life processes that characterise living things; how we classify living things into groups; and what a habitat is. Use this to describe and compare living things and their habitats.",
    };
  }
  if (t.includes("human") || t.includes("body") || t.includes("nutrition") || t.includes("health") || t.includes("exercise")) {
    return {
      intro: "Humans have body systems that work together (e.g. digestive, circulatory, respiratory). Eating a balanced diet (nutrition), drinking water, and exercise help keep the body healthy. This lesson covers the main ideas.",
      coreConcepts: [
        { name: "Body systems", explanation: "Our body has several systems: the digestive system breaks down food; the circulatory system carries blood and nutrients; the respiratory system takes in oxygen and releases carbon dioxide. They work together." },
        { name: "Nutrition", explanation: "A balanced diet includes carbohydrates, proteins, fats, vitamins, minerals and fibre, and enough water. Different foods give us different nutrients. Too much or too little of something can affect health." },
        { name: "Exercise and health", explanation: "Exercise helps keep the heart, lungs and muscles healthy. It also helps us maintain a healthy weight and feel good. Rest and sleep are important too." },
      ],
      example: "When we eat a sandwich, the digestive system breaks it down. Nutrients are absorbed into the blood and the circulatory system carries them around the body. The respiratory system supplies oxygen so our cells can use the nutrients for energy.",
      lessonSummary: "You now know that the body has several systems working together; what a balanced diet and good nutrition mean; and how exercise and rest support health. Use this to describe how we stay healthy.",
    };
  }
  if (t.includes("plant") || t.includes("photosynthesis") || t.includes("life cycle")) {
    return {
      intro: "Plants make their own food using sunlight, water and carbon dioxide—this is photosynthesis. They have roots, stems and leaves, and many reproduce with seeds. This lesson covers the main parts of a plant and how they grow.",
      coreConcepts: [
        { name: "Parts of a plant", explanation: "Roots anchor the plant and take in water and minerals from the soil. The stem supports the plant and carries water and nutrients. Leaves make food by photosynthesis. Flowers are involved in reproduction and produce seeds." },
        { name: "Photosynthesis", explanation: "Photosynthesis is the process in leaves where plants use light energy, water (from the roots) and carbon dioxide (from the air) to make sugar (glucose) and release oxygen. Chlorophyll in the leaves captures the light." },
        { name: "Life cycle", explanation: "Many plants grow from seeds. The seed germinates (starts to grow), the plant grows and may produce flowers, then seeds. The seeds can spread and grow into new plants. This is the plant life cycle." },
      ],
      example: "A sunflower: roots take in water; the stem holds it up and carries water to the leaves; leaves use sunlight, water and carbon dioxide to make food; the flower produces seeds. When the seeds fall, they can grow into new sunflowers.",
      lessonSummary: "You now know the main parts of a plant and their jobs; what photosynthesis is and what plants need; and how many plants have a life cycle involving seeds. Use this to describe how plants grow and survive.",
    };
  }
  if (t.includes("evolution") || t.includes("inheritance") || t.includes("variation") || t.includes("adaptation")) {
    return {
      intro: "Living things vary (they are not all the same). Some variation is inherited from parents. Over long periods, species can change (evolve) and become better suited to their environment—this is adaptation. This lesson introduces these ideas.",
      coreConcepts: [
        { name: "Variation", explanation: "Variation means differences between individuals. Some variation is inherited (passed from parents, e.g. eye colour). Some is due to the environment (e.g. scars, fitness). Both can affect how well an organism survives." },
        { name: "Inheritance", explanation: "Inheritance is when characteristics are passed from parents to offspring. Offspring get information from both parents, so they are similar but not identical. We use this to explain family resemblance." },
        { name: "Adaptation and evolution", explanation: "Adaptations are features that help an organism survive in its environment. Over very long times, species can change (evolve) so that better-adapted individuals are more likely to survive and reproduce. This can lead to new species." },
      ],
      example: "Rabbits in a cold climate might have thicker fur. If fur thickness is inherited, rabbits with thicker fur are more likely to survive winter and have offspring. Over many generations, the population may have thicker fur on average—an adaptation.",
      lessonSummary: "You now know what variation and inheritance are; how adaptation helps organisms survive; and that evolution is the change in species over time. Use this to describe why living things look and behave the way they do.",
    };
  }
  // Computer Science
  if (t.includes("algorithm") || t.includes("step") || t.includes("sequence") || t.includes("decomposition") || t.includes("debug")) {
    return {
      intro: "An algorithm is a clear set of steps to solve a problem or do a task. We break big problems into smaller steps (decomposition) and put steps in the right order (sequence). When something goes wrong, we debug (find and fix the error).",
      coreConcepts: [
        { name: "Algorithm", explanation: "An algorithm is a step-by-step method to do something. Recipes and instructions are algorithms. In computing, we give algorithms to computers so they can carry out tasks." },
        { name: "Sequence", explanation: "Sequence means the order of steps matters. Doing step 2 before step 1 might give the wrong result. We write algorithms in a logical order." },
        { name: "Decomposition", explanation: "Decomposition is breaking a big problem into smaller, easier parts. Each part can be solved or coded separately. Then we combine the parts to solve the whole problem." },
        { name: "Debugging", explanation: "Debugging is finding and fixing mistakes (bugs) in an algorithm or program. We check each step, test with examples, and correct any step that does the wrong thing." },
      ],
      example: "Algorithm for making toast: 1) Get bread. 2) Put bread in toaster. 3) Turn toaster on. 4) Wait until it pops. 5) Put butter on toast. If we did step 5 before step 2, we would be putting butter on bread that isn't toast yet—wrong sequence.",
      lessonSummary: "You now know what an algorithm is; why sequence matters; how decomposition helps with big problems; and how to debug by finding and fixing errors. Use this when designing and improving instructions and programs.",
    };
  }
  if (t.includes("programming") || t.includes("variable") || t.includes("loop") || t.includes("code") || t.includes("block")) {
    return {
      intro: "Programming is giving a computer instructions (code) to do a task. We can use block-based coding (dragging blocks) or text-based code. Programs use variables to store data and loops to repeat steps.",
      coreConcepts: [
        { name: "Program and code", explanation: "A program is a set of instructions for a computer. Code is the actual instructions we write. The computer follows the code step by step to produce the result we want." },
        { name: "Variables", explanation: "A variable is a named place to store a value (e.g. a number or text). We can change the value and use it in our program. For example, a variable called score might hold the number 10." },
        { name: "Loops", explanation: "A loop repeats a set of instructions. Instead of writing the same instructions many times, we use a loop (e.g. 'repeat 5 times' or 'repeat until something is true'). This makes programs shorter and clearer." },
      ],
      example: "In a game, we might have a variable called score. When the player scores a point we add 1 to score. We might use a loop to move an enemy 10 times. Variables and loops help us build games and useful programs.",
      lessonSummary: "You now know what a program and code are; how variables store and use data; and how loops repeat instructions. Use this when writing block-based or text-based programs.",
    };
  }
  if (t.includes("data") && (t.includes("information") || t.includes("collect") || t.includes("present"))) {
    return {
      intro: "Data is information we collect, store and use. We can present data in tables and charts so it is easier to understand. Computers help us collect, sort and display data.",
      coreConcepts: [
        { name: "Data and information", explanation: "Data is raw facts or figures (e.g. numbers, words). When we organise and use data to answer questions, it becomes information. For example, a list of scores is data; the average score is information." },
        { name: "Collecting data", explanation: "We collect data by measuring, surveying or recording. We need to decide what to collect and how to store it (e.g. in a table or spreadsheet) so we can use it later." },
        { name: "Presenting data", explanation: "We present data using tables, bar charts, pie charts or other graphs. The right choice makes patterns and comparisons clear. Labels and titles help others understand." },
      ],
      example: "We survey the class's favourite fruit. We collect the data in a table (e.g. apple: 5, banana: 8). We then draw a bar chart so we can quickly see that banana is the most popular. The chart presents the data clearly.",
      lessonSummary: "You now know the difference between data and information; how we collect and store data; and how to present data in tables and charts. Use this when handling data in computing and other subjects.",
    };
  }
  if (t.includes("network") || t.includes("internet") || t.includes("connect") || t.includes("communicate")) {
    return {
      intro: "Computers can be connected in networks to share information and resources. The internet is a huge network of networks. This lesson covers how computers connect and how information is sent and received.",
      coreConcepts: [
        { name: "Network", explanation: "A network is when two or more computers (or devices) are connected so they can share data and resources. A school or home might have a local network (LAN)." },
        { name: "The internet", explanation: "The internet is a worldwide network of networks. It allows computers everywhere to communicate. We use it for the web, email, video calls and much more." },
        { name: "Sending information", explanation: "When we send a message or load a webpage, data is split into small packets, sent across the network, and put back together at the destination. This happens very quickly." },
      ],
      example: "When you open a website, your computer sends a request across the internet. The server that holds the website sends the web page back in packets. Your computer puts the packets together and displays the page. All of this uses networks.",
      lessonSummary: "You now know what a network is; what the internet is; and how information is sent in packets across networks. Use this to describe how devices connect and communicate.",
    };
  }
  // Business
  if (t.includes("enterprise") || t.includes("business") || t.includes("product")) {
    return {
      intro: "Enterprise is about having ideas and turning them into products or services that people want. Businesses are organisations that provide goods or services, often to make a profit. This lesson introduces these ideas.",
      coreConcepts: [
        { name: "Enterprise", explanation: "Enterprise means being willing to take on new ideas and projects. Entrepreneurs spot opportunities, take risks and try to create something people want—a product or a service." },
        { name: "Product and service", explanation: "A product is something you can touch (e.g. a toy, a loaf of bread). A service is something done for someone (e.g. cutting hair, delivering post). Businesses sell products, services, or both." },
        { name: "What businesses do", explanation: "Businesses often need to design or choose a product, work out the cost, set a price, and find customers. They may need to advertise and deliver. Profit is when money from sales is more than the costs." },
      ],
      example: "Someone has an idea to sell homemade biscuits. They are being enterprising. The biscuits are the product. They might sell them at a school fair. If they take more money than they spent on ingredients, they make a profit.",
      lessonSummary: "You now know what enterprise is; the difference between products and services; and what businesses do. Use this to describe simple business ideas and how they work.",
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
  const focus = lessonTitle.replace(/^Lesson \d+:\s*/i, "").trim() || topicTitle;
  return {
    intro: `This lesson is part of ${topicTitle} and focuses on ${focus}. You will learn the main ideas, key terms and how to use them in problems. Work through each core concept below, then try the example. Use the Practice and Assessment tabs afterwards to check your understanding.`,
    coreConcepts: [
      { name: "What it is", explanation: `The main idea behind ${focus} is something we use in ${topicTitle}. Read the definitions in the Explain and other lessons for this topic. Try to say in your own words what ${focus} means before moving on.` },
      { name: "Key terms", explanation: "Learn the correct vocabulary (e.g. from the topic’s lessons). Using the right words helps you explain the idea clearly and answer questions accurately. Use each term in a short sentence." },
      { name: "How to use it", explanation: "Apply the idea to a simple example: use the definition and the key points step by step. In the Practice tab you can try more examples; in the Assessment tab you can check how well you understand." },
    ],
    example: `For ${focus}: think about a simple situation where ${topicTitle} is used. Apply the main idea and key terms step by step. If you're stuck, look back at the Explain section and the other lessons in this topic.`,
    lessonSummary: `You have completed this lesson on ${focus} (part of ${topicTitle}). Revise the core concepts above, try the example, then use the Practice and Assessment tabs to reinforce your learning.`,
  };
}

/** Practice questions with hints and explanations (what we're looking for / model answer) */
function getPracticeQuestionsForTopic(topic: { title: string }): { question: string; hint: string; explanation: string }[] {
  const t = topic.title.toLowerCase();
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
      options: ["Something unrelated", "The core concept you studied", "An advanced topic only", "Only for Year 7"],
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

function LessonsTab({ topic }: { topic: { title: string; description: string } }) {
  const lessons = getLessonTitlesForTopic(topic);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const selectedLesson = selectedIndex !== null ? lessons[selectedIndex] : null;
  const detail = selectedLesson ? getLessonDetail(selectedLesson, topic.title) : null;
  const canPrev = selectedIndex !== null && selectedIndex > 0;
  const canNext =
    selectedIndex !== null && selectedIndex >= 0 && selectedIndex < lessons.length - 1;

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
                <PlayCircle className="h-4 w-4 text-teal-500 shrink-0 ml-auto flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:col-span-4 min-w-0 max-h-[calc(100vh-10rem)] overflow-y-auto overflow-x-hidden">
        {detail ? (
          <div className="p-8 pb-16 rounded-2xl bg-white dark:bg-gray-900 shadow-lg space-y-8 w-full">
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("explain");

  const subject = subjectId ? getSubject(subjectId) : undefined;
  const topic = subjectId && topicId ? getTopic(subjectId, topicId) : undefined;

  const orderedTopics = subject ? subject.topics.slice().sort((a, b) => a.order - b.order) : [];
  const topicIndex = topic ? orderedTopics.findIndex((t) => t.id === topic.id) : -1;
  const prevTopic = topicIndex > 0 ? orderedTopics[topicIndex - 1] : null;
  const nextTopic =
    topicIndex >= 0 && topicIndex < orderedTopics.length - 1 ? orderedTopics[topicIndex + 1] : null;

  if (!subject || !topic) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-gray-500">Topic not found.</p>
        <button
          type="button"
          onClick={() => router.history.back()}
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
            onClick={() => router.history.back()}
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
              {subject.title} · Year {topic.years.join(", ")}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          {prevTopic ? (
            <Link
              to="/learning-academy/curriculum/$subjectId/$topicId"
              params={{ subjectId, topicId: prevTopic.id }}
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
              params={{ subjectId, topicId: nextTopic.id }}
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
        <LessonsTab topic={topic} />
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
