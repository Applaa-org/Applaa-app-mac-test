import React, { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { getSubject, getTopic } from "@/data/learningAcademyCurriculum";
import {
  BookOpen,
  ListOrdered,
  PenLine,
  ClipboardCheck,
  ArrowLeft,
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
  if (t.includes("algebra") || t.includes("expression") || t.includes("equation") || t.includes("sequences") || t.includes("formulae")) {
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
  if (t.includes("geometry") || t.includes("shape") || t.includes("angle")) {
    return {
      intro: "Geometry is about shapes, angles, and space. We look at properties of shapes, measure lengths and angles, and work out area and perimeter. This lesson covers the core ideas.",
      coreConcepts: [
        { name: "Properties of shapes", explanation: "Shapes are described by their properties: number of sides, angles, symmetry, parallel sides, etc. For example, a triangle has 3 sides and 3 angles." },
        { name: "Angles", explanation: "Angles are measured in degrees (°). A right angle is 90°; a straight line is 180°. We use a protractor to measure and draw angles." },
        { name: "Perimeter", explanation: "Perimeter is the distance around the outside of a shape. For a rectangle, add all four sides (or 2 × length + 2 × width)." },
        { name: "Area", explanation: "Area is the amount of space inside a shape. For a rectangle, area = length × width. We measure it in square units (e.g. cm²)." },
      ],
      example: "A rectangle with sides 5 cm and 3 cm has perimeter 5+3+5+3 = 16 cm and area 5×3 = 15 cm².",
      lessonSummary: "You now know how to describe shapes by their properties; how angles are measured in degrees; and how to find perimeter (distance around) and area (space inside) for simple shapes like rectangles.",
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
  const [activeTab, setActiveTab] = useState<TabId>("explain");

  const subject = subjectId ? getSubject(subjectId) : undefined;
  const topic = subjectId && topicId ? getTopic(subjectId, topicId) : undefined;

  if (!subject || !topic) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-gray-500">Topic not found.</p>
        <Link to="/learning-academy/curriculum" className="text-teal-600 dark:text-teal-400 mt-2 inline-block">
          Back to Curriculum
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full">
      <div className="p-6 w-full max-w-[1600px] mx-auto pb-20">
        <div className="flex items-center gap-4 mb-4">
          <Link
            to="/learning-academy/curriculum"
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Curriculum
          </Link>
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
