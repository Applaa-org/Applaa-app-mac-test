/**
 * Applaa AI Academy – Learning modules (Python & JavaScript).
 * Each lesson has: id, title, explanation, exampleCode, miniChallenge, quiz.
 */

export type AcademyTrack = "python" | "javascript";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface CodeExample {
  title: string;
  code: string;
}

export interface AcademyLesson {
  id: string;
  title: string;
  explanation: string;
  exampleCode: string;
  /** Extra copy-paste examples for learners to try */
  extraExamples?: CodeExample[];
  miniChallenge: string;
  challengeStarterCode?: string;
  quiz: QuizQuestion[];
}

const PYTHON_LESSONS: AcademyLesson[] = [
  {
    id: "what-is-programming",
    title: "What is Programming",
    explanation: "Programming is giving the computer step-by-step instructions. Just like a recipe tells you how to make food, code tells the computer what to do. We write code in a programming language (like Python) that both humans and computers can understand.",
    exampleCode: "# This is a comment - the computer ignores it\nprint(\"Hello, World!\")  # This prints text to the screen",
    extraExamples: [
      { title: "Print multiple lines", code: 'print("Line 1")\nprint("Line 2")\nprint("Done!")' },
      { title: "Print a number", code: "print(42)\nprint(3.14)" },
    ],
    miniChallenge: "Write a line of code that prints your name.",
    challengeStarterCode: "# Print your name below\n",
    quiz: [
      { question: "What is code?", options: ["A secret password", "Instructions for the computer", "A type of game"], correctIndex: 1 },
      { question: "What does print() do?", options: ["Deletes text", "Shows text on screen", "Saves a file"], correctIndex: 1 },
    ],
  },
  {
    id: "variables",
    title: "Variables",
    explanation: "Variables are like labeled boxes that store information. You give a variable a name and put a value in it. Later you can use the name to get the value back.",
    exampleCode: "name = \"Alex\"\nage = 10\nprint(name)   # Alex\nprint(age)    # 10",
    extraExamples: [
      { title: "Variables and math", code: "x = 5\ny = 3\nsum = x + y\nprint(sum)  # 8" },
      { title: "Reassigning", code: "count = 0\ncount = count + 1\ncount = count + 1\nprint(count)  # 2" },
    ],
    miniChallenge: "Create a variable called score and set it to 100. Then print it.",
    challengeStarterCode: "# Create a variable score = 100 and print it\n",
    quiz: [
      { question: "What is a variable?", options: ["A math equation", "A named container for a value", "A type of loop"], correctIndex: 1 },
      { question: "Which line creates a variable?", options: ["print(x)", "x = 5", "if x:"], correctIndex: 1 },
    ],
  },
  {
    id: "data-types",
    title: "Data Types",
    explanation: "Data types are the kind of information we store. Numbers (int, float), text (str), and true/false (bool) are the main types. Python uses them automatically.",
    exampleCode: "num = 42          # integer\npi = 3.14         # float\ngreeting = \"Hi\"   # string\nis_cool = True    # boolean",
    extraExamples: [
      { title: "Math with types", code: "a = 10\nb = 3\nprint(a + b)\nprint(a * b)\nprint(a / b)" },
      { title: "Strings together", code: 'first = "Hello"\nsecond = "World"\nprint(first + " " + second)' },
      { title: "Boolean in condition", code: "raining = True\nif raining:\n    print(\"Take an umbrella!\")" },
    ],
    miniChallenge: "Create a variable of each type: an integer, a float, a string, and a boolean. Print each one.",
    challengeStarterCode: "# Create one variable of each type and print them\n",
    quiz: [
      { question: "What type is 3.14?", options: ["int", "float", "str"], correctIndex: 1 },
      { question: "What type is \"hello\"?", options: ["int", "float", "str"], correctIndex: 2 },
    ],
  },
  {
    id: "conditions",
    title: "Conditions (if/else)",
    explanation: "Conditions let your program make decisions. If something is true, run one block of code; else run another. Use if, elif, and else.",
    exampleCode: "age = 12\nif age >= 13:\n    print(\"You can join\")\nelse:\n    print(\"Come back when you're 13\")",
    extraExamples: [
      { title: "elif chain", code: "score = 75\nif score >= 90:\n    print(\"A\")\nelif score >= 80:\n    print(\"B\")\nelif score >= 70:\n    print(\"C\")\nelse:\n    print(\"Keep trying!\")" },
      { title: "Check multiple conditions", code: "x = 10\ny = 5\nif x > 0 and y > 0:\n    print(\"Both positive\")\nif x > y:\n    print(\"x is larger\")" },
    ],
    miniChallenge: "Write code that sets a variable temp. If temp is above 30, print 'Hot', else print 'Cool'.",
    challengeStarterCode: "temp = 25  # try changing this\n# Add if/else to print Hot or Cool\n",
    quiz: [
      { question: "When does the else block run?", options: ["Always", "When the if condition is False", "Never"], correctIndex: 1 },
      { question: "What keyword checks another condition after if?", options: ["else", "elif", "or"], correctIndex: 1 },
    ],
  },
  {
    id: "loops",
    title: "Loops",
    explanation: "Loops repeat code. A for loop runs a fixed number of times or over a list. A while loop runs while a condition is true.",
    exampleCode: "for i in range(3):\n    print(\"Hello\", i)\n# Hello 0, Hello 1, Hello 2",
    extraExamples: [
      { title: "Loop over a list", code: "fruits = [\"apple\", \"banana\", \"cherry\"]\nfor f in fruits:\n    print(\"I like\", f)" },
      { title: "Sum with a loop", code: "total = 0\nfor i in range(1, 6):\n    total = total + i\nprint(total)  # 15" },
    ],
    miniChallenge: "Use a for loop to print the numbers 1 to 5.",
    challengeStarterCode: "# Print 1 to 5 using a for loop\n",
    quiz: [
      { question: "How many times does range(3) run?", options: ["2", "3", "4"], correctIndex: 1 },
      { question: "What does a loop do?", options: ["Stops the program", "Repeats code", "Creates a variable"], correctIndex: 1 },
    ],
  },
  {
    id: "functions",
    title: "Functions",
    explanation: "Functions are reusable blocks of code. You define them with def, give a name and parameters, and call them by name. They can return a value.",
    exampleCode: "def greet(name):\n    return \"Hello, \" + name\nprint(greet(\"Sam\"))  # Hello, Sam",
    extraExamples: [
      { title: "Function with default", code: "def greet(name, greeting=\"Hello\"):\n    return greeting + \", \" + name\nprint(greet(\"Sam\"))\nprint(greet(\"Sam\", \"Hi\"))" },
      { title: "Multiple returns", code: "def min_max(a, b):\n    if a < b:\n        return a, b\n    return b, a\nsmaller, larger = min_max(10, 5)\nprint(smaller, larger)  # 5 10" },
    ],
    miniChallenge: "Write a function add(a, b) that returns the sum of a and b. Call it with 3 and 5.",
    challengeStarterCode: "# Define add(a, b) and call it with 3 and 5\n",
    quiz: [
      { question: "How do you define a function in Python?", options: ["function name():", "def name():", "func name():"], correctIndex: 1 },
      { question: "What does return do?", options: ["Prints a value", "Sends a value back from the function", "Stops the program"], correctIndex: 1 },
    ],
  },
  {
    id: "lists",
    title: "Arrays / Lists",
    explanation: "Lists store multiple values in order. You can add, remove, and access items by index (starting at 0).",
    exampleCode: "fruits = [\"apple\", \"banana\", \"cherry\"]\nprint(fruits[0])   # apple\nfruits.append(\"date\")",
    extraExamples: [
      { title: "List length and loop", code: "nums = [10, 20, 30]\nprint(len(nums))\nfor n in nums:\n    print(n)" },
      { title: "Change an item", code: "colors = [\"red\", \"green\", \"blue\"]\ncolors[1] = \"yellow\"\nprint(colors)" },
      { title: "Slice a list", code: "letters = [\"a\", \"b\", \"c\", \"d\", \"e\"]\nprint(letters[1:4])  # b, c, d" },
    ],
    miniChallenge: "Create a list of three numbers. Print the first and the last item.",
    challengeStarterCode: "# Create a list of 3 numbers, print first and last\n",
    quiz: [
      { question: "What is the first index in a list?", options: ["1", "0", "-1"], correctIndex: 1 },
      { question: "Which method adds an item to the end of a list?", options: ["add", "append", "push"], correctIndex: 1 },
    ],
  },
  {
    id: "dictionaries",
    title: "Objects / Dictionaries",
    explanation: "Dictionaries store key-value pairs. You look up a value by its key. Useful for storing named data.",
    exampleCode: "person = {\"name\": \"Alex\", \"age\": 10}\nprint(person[\"name\"])  # Alex",
    extraExamples: [
      { title: "Add and change keys", code: "pet = {\"name\": \"Fluffy\", \"type\": \"cat\"}\npet[\"age\"] = 2\nprint(pet)" },
      { title: "Loop over dict", code: "scores = {\"Alex\": 10, \"Sam\": 8}\nfor name, score in scores.items():\n    print(name, score)" },
    ],
    miniChallenge: "Create a dictionary with keys 'animal' and 'sound'. Print the value of 'sound'.",
    challengeStarterCode: "# Create a dict with animal and sound, print sound\n",
    quiz: [
      { question: "How do you get a value from a dictionary?", options: ["dict.value", "dict[key]", "dict.get(key)"], correctIndex: 1 },
      { question: "What do we call the two parts in a key-value pair?", options: ["left and right", "key and value", "name and data"], correctIndex: 1 },
    ],
  },
  {
    id: "debugging",
    title: "Debugging Basics",
    explanation: "Bugs are mistakes in code. Debugging is finding and fixing them. Use print() to see values, read error messages, and check your logic step by step.",
    exampleCode: "x = 5\ny = 0\n# print(x, y)  # uncomment to debug\nresult = x + y\nprint(result)",
    extraExamples: [
      { title: "Print to find a bug", code: "total = 0\nfor i in range(3):\n    total = total + i\n    print(\"i=\", i, \"total=\", total)\nprint(\"Final:\", total)" },
      { title: "Check before divide", code: "a = 10\nb = 0\nif b != 0:\n    print(a / b)\nelse:\n    print(\"Cannot divide by zero!\")" },
    ],
    miniChallenge: "The code has a bug: it prints 0 instead of 8. Fix it (use two variables and add them).",
    challengeStarterCode: "a = 5\nb = 3\ntotal = a - b  # Bug: should be +\nprint(total)  # Should print 8\n",
    quiz: [
      { question: "What is a bug?", options: ["An insect", "An error or mistake in code", "A variable"], correctIndex: 1 },
      { question: "What can help you debug?", options: ["Ignoring errors", "Using print() to see values", "Deleting code"], correctIndex: 1 },
    ],
  },
];

const JAVASCRIPT_LESSONS: AcademyLesson[] = [
  {
    id: "what-is-programming",
    title: "What is Programming",
    explanation: "Programming is giving the computer step-by-step instructions. We write code in a language like JavaScript so the computer can run it. Browsers understand JavaScript and can run it on web pages.",
    exampleCode: "// This is a comment\nconsole.log(\"Hello, World!\");  // Prints to the console",
    extraExamples: [
      { title: "Multiple logs", code: "console.log(\"First\");\nconsole.log(\"Second\");\nconsole.log(\"Third\");" },
      { title: "Log numbers", code: "console.log(100);\nconsole.log(2 + 3);" },
    ],
    miniChallenge: "Write a line that prints your name using console.log.",
    challengeStarterCode: "// Print your name below\n",
    quiz: [
      { question: "What does console.log do?", options: ["Deletes text", "Shows text in the console", "Creates a variable"], correctIndex: 1 },
      { question: "What is JavaScript often used for?", options: ["Only servers", "Web pages and apps", "Only games"], correctIndex: 1 },
    ],
  },
  {
    id: "variables",
    title: "Variables",
    explanation: "Variables store values. In JavaScript we use let or const. Use const when the value won't change, let when it might.",
    exampleCode: "let name = \"Alex\";\nconst age = 10;\nconsole.log(name);  // Alex\nconsole.log(age);   // 10",
    extraExamples: [
      { title: "Variables and math", code: "let x = 5;\nlet y = 3;\nlet sum = x + y;\nconsole.log(sum);  // 8" },
      { title: "Reassigning let", code: "let count = 0;\ncount = count + 1;\ncount = count + 1;\nconsole.log(count);  // 2" },
    ],
    miniChallenge: "Create a variable called score with value 100 and log it.",
    challengeStarterCode: "// Create let score = 100 and console.log it\n",
    quiz: [
      { question: "Which keyword is for values that don't change?", options: ["let", "var", "const"], correctIndex: 2 },
      { question: "What do we use to store a value?", options: ["console.log", "A variable", "A comment"], correctIndex: 1 },
    ],
  },
  {
    id: "data-types",
    title: "Data Types",
    explanation: "JavaScript has numbers, strings (text in quotes), and booleans (true/false). You don't declare the type; JavaScript figures it out.",
    exampleCode: "let num = 42;\nlet pi = 3.14;\nlet greeting = \"Hi\";\nlet isCool = true;",
    extraExamples: [
      { title: "Math with numbers", code: "let a = 10;\nlet b = 3;\nconsole.log(a + b, a * b, a / b);" },
      { title: "String concatenation", code: 'let first = "Hello";\nlet second = "World";\nconsole.log(first + " " + second);' },
      { title: "Boolean in if", code: "let sunny = true;\nif (sunny) console.log(\"Go play outside!\");" },
    ],
    miniChallenge: "Create one variable of each type and log them.",
    challengeStarterCode: "// Create number, string, boolean and log each\n",
    quiz: [
      { question: "What type is true?", options: ["number", "string", "boolean"], correctIndex: 2 },
      { question: "Strings are wrapped in what?", options: ["Parentheses", "Quotes", "Curly braces"], correctIndex: 1 },
    ],
  },
  {
    id: "conditions",
    title: "Conditions (if/else)",
    explanation: "Use if and else to make decisions. The code in the block runs only when the condition is true.",
    exampleCode: "let age = 12;\nif (age >= 13) {\n  console.log(\"You can join\");\n} else {\n  console.log(\"Come back when you're 13\");\n}",
    extraExamples: [
      { title: "else if chain", code: "let score = 85;\nif (score >= 90) console.log(\"A\");\nelse if (score >= 80) console.log(\"B\");\nelse if (score >= 70) console.log(\"C\");\nelse console.log(\"Keep trying!\");" },
      { title: "Logical AND", code: "let x = 5;\nlet y = 10;\nif (x > 0 && y > 0) console.log(\"Both positive\");" },
    ],
    miniChallenge: "Set a variable temp. If temp > 30 log 'Hot', else log 'Cool'.",
    challengeStarterCode: "let temp = 25;\n// Add if/else to log Hot or Cool\n",
    quiz: [
      { question: "What do we put inside if ()?", options: ["A number", "A condition (true/false)", "A string"], correctIndex: 1 },
      { question: "When does else run?", options: ["Always", "When if is false", "Never"], correctIndex: 1 },
    ],
  },
  {
    id: "loops",
    title: "Loops",
    explanation: "for loops repeat code. A common form is for (let i = 0; i < 5; i++) which runs 5 times with i from 0 to 4.",
    exampleCode: "for (let i = 0; i < 3; i++) {\n  console.log(\"Hello\", i);\n}\n// Hello 0, Hello 1, Hello 2",
    extraExamples: [
      { title: "Loop over array", code: "let fruits = [\"apple\", \"banana\"];\nfor (let f of fruits) console.log(f);" },
      { title: "Sum with loop", code: "let total = 0;\nfor (let i = 1; i <= 5; i++) total += i;\nconsole.log(total);" },
    ],
    miniChallenge: "Use a for loop to log the numbers 1 to 5.",
    challengeStarterCode: "// Log 1 to 5 using a for loop\n",
    quiz: [
      { question: "In for (let i=0; i<3; i++), how many times does it run?", options: ["2", "3", "4"], correctIndex: 1 },
      { question: "What does i++ do?", options: ["Adds 2", "Adds 1 to i", "Stops the loop"], correctIndex: 1 },
    ],
  },
  {
    id: "functions",
    title: "Functions",
    explanation: "Functions are reusable blocks. Define with function name() {} or const name = () => {}. Use return to send a value back.",
    exampleCode: "function greet(name) {\n  return \"Hello, \" + name;\n}\nconsole.log(greet(\"Sam\"));  // Hello, Sam",
    extraExamples: [
      { title: "Multiple parameters", code: "function add(a, b) { return a + b; }\nconsole.log(add(2, 3));\nconsole.log(add(10, 5));" },
      { title: "Function with default", code: "function say(msg = \"Hi\") { console.log(msg); }\nsay();\nsay(\"Hello\");" },
    ],
    miniChallenge: "Write a function add(a, b) that returns a + b. Call it with 3 and 5.",
    challengeStarterCode: "// Define add(a, b) and call with 3 and 5\n",
    quiz: [
      { question: "How do you return a value from a function?", options: ["print(value)", "return value;", "send value"], correctIndex: 1 },
      { question: "What are a and b in add(a, b)?", options: ["Results", "Parameters", "Strings"], correctIndex: 1 },
    ],
  },
  {
    id: "arrays",
    title: "Arrays / Lists",
    explanation: "Arrays hold multiple values. Indexes start at 0. Use .push() to add, .length for size.",
    exampleCode: "let fruits = [\"apple\", \"banana\", \"cherry\"];\nconsole.log(fruits[0]);  // apple\nfruits.push(\"date\");",
    extraExamples: [
      { title: "Length and loop", code: "let nums = [10, 20, 30];\nconsole.log(nums.length);\nfor (let i = 0; i < nums.length; i++) console.log(nums[i]);" },
      { title: "Change and pop", code: "let arr = [1, 2, 3];\narr[1] = 99;\narr.pop();\nconsole.log(arr);" },
    ],
    miniChallenge: "Create an array of three numbers. Log the first and last element.",
    challengeStarterCode: "// Create array of 3 numbers, log first and last\n",
    quiz: [
      { question: "What is fruits[0] for [\"a\",\"b\",\"c\"]?", options: ["b", "a", "c"], correctIndex: 1 },
      { question: "Which method adds to the end of an array?", options: ["add", "push", "append"], correctIndex: 1 },
    ],
  },
  {
    id: "objects",
    title: "Objects / Dictionaries",
    explanation: "Objects store key-value pairs. You can access properties with dot notation or brackets.",
    exampleCode: "let person = { name: \"Alex\", age: 10 };\nconsole.log(person.name);   // Alex\nconsole.log(person[\"age\"]);  // 10",
    extraExamples: [
      { title: "Add property", code: "let pet = { name: \"Max\" };\npet.type = \"dog\";\npet.age = 2;\nconsole.log(pet);" },
      { title: "Object in array", code: "let kids = [{ name: \"Alex\" }, { name: \"Sam\" }];\nconsole.log(kids[0].name);" },
    ],
    miniChallenge: "Create an object with animal and sound. Log the sound.",
    challengeStarterCode: "// Create object with animal and sound, log sound\n",
    quiz: [
      { question: "How do you access person's name in person = { name: 'A' }?", options: ["person(name)", "person.name", "person[name]"], correctIndex: 1 },
      { question: "Objects contain what?", options: ["Only numbers", "Key-value pairs", "Only strings"], correctIndex: 1 },
    ],
  },
  {
    id: "debugging",
    title: "Debugging Basics",
    explanation: "Use console.log() to see values. Read error messages in the console. Check spelling, brackets, and logic.",
    exampleCode: "let x = 5;\nlet y = 0;\n// console.log(x, y);  // uncomment to debug\nlet result = x + y;\nconsole.log(result);",
    extraExamples: [
      { title: "Log inside loop", code: "let sum = 0;\nfor (let i = 1; i <= 3; i++) {\n  sum += i;\n  console.log(\"i:\", i, \"sum:\", sum);\n}" },
      { title: "Check before using", code: "let data = null;\nif (data !== null) console.log(data);\nelse console.log(\"No data yet\");" },
    ],
    miniChallenge: "Fix the bug: the code should log 8 (add two numbers).",
    challengeStarterCode: "let a = 5;\nlet b = 3;\nlet total = a - b;  // Bug: should be +\nconsole.log(total);  // Should be 8\n",
    quiz: [
      { question: "What is debugging?", options: ["Removing code", "Finding and fixing errors", "Writing new code"], correctIndex: 1 },
      { question: "What helps you see values while debugging?", options: ["Deleting variables", "console.log()", "Closing the console"], correctIndex: 1 },
    ],
  },
];

export const ACADEMY_LESSONS: Record<AcademyTrack, AcademyLesson[]> = {
  python: PYTHON_LESSONS,
  javascript: JAVASCRIPT_LESSONS,
};

export const ACADEMY_LESSON_IDS = PYTHON_LESSONS.map((l) => l.id);

export function getLesson(track: AcademyTrack, lessonId: string): AcademyLesson | undefined {
  return ACADEMY_LESSONS[track].find((l) => l.id === lessonId);
}
