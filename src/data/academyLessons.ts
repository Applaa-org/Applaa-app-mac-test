/**
 * Applaa AI Academy – Learning modules: Python, JavaScript, Web (HTML/CSS), React, TypeScript, AI.
 * Each lesson has: id, title, explanation, exampleCode, miniChallenge, quiz.
 */

export type AcademyTrack = "python" | "javascript" | "html" | "react" | "typescript" | "ai";

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
      { title: "Print with a variable", code: 'name = "Sam"\nprint("Hi,", name)' },
      { title: "Print and math", code: "print(2 + 3)\nprint(10 - 4)" },
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
      { title: "Many variables", code: 'first = "Hello"\nlast = "World"\nprint(first, last)' },
      { title: "Swap two variables", code: "a = 1\nb = 2\na, b = b, a\nprint(a, b)  # 2 1" },
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
      { title: "Type of a value", code: "x = 42\nprint(type(x))\nprint(type(\"hi\"))" },
      { title: "Converting types", code: "num = 7\nprint(str(num) + \" apples\")\nprint(int(\"10\") + 5)" },
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
      { title: "Using or", code: "day = \"Saturday\"\nif day == \"Saturday\" or day == \"Sunday\":\n    print(\"Weekend!\")" },
      { title: "Nested if", code: "age = 14\nif age >= 13:\n    if age < 18:\n        print(\"Teen\")" },
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
      { title: "Loop with step", code: "for i in range(0, 10, 2):\n    print(i)  # 0, 2, 4, 6, 8" },
      { title: "Countdown", code: "for i in range(3, 0, -1):\n    print(i)\nprint(\"Go!\")" },
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
      { title: "Function with no return", code: "def say_hi():\n    print(\"Hi!\")\nsay_hi()\nsay_hi()" },
      { title: "Return early", code: "def is_even(n):\n    if n % 2 == 0:\n        return True\n    return False\nprint(is_even(4))\nprint(is_even(5))" },
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
      { title: "Insert and remove", code: "nums = [1, 2, 3]\nnums.insert(0, 0)\nnums.remove(2)\nprint(nums)" },
      { title: "List of lists", code: "grid = [[1, 2], [3, 4]]\nprint(grid[0][1])  # 2" },
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
      { title: "Check if key exists", code: "d = {\"a\": 1}\nprint(\"a\" in d)\nprint(\"b\" in d)" },
      { title: "get() with default", code: "d = {\"name\": \"Alex\"}\nprint(d.get(\"age\", 0))" },
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
      { title: "Try and except", code: "try:\n    print(int(\"hello\"))\nexcept:\n    print(\"That was not a number!\")" },
    ],
    miniChallenge: "The code has a bug: it prints 0 instead of 8. Fix it (use two variables and add them).",
    challengeStarterCode: "a = 5\nb = 3\ntotal = a - b  # Bug: should be +\nprint(total)  # Should print 8\n",
    quiz: [
      { question: "What is a bug?", options: ["An insect", "An error or mistake in code", "A variable"], correctIndex: 1 },
      { question: "What can help you debug?", options: ["Ignoring errors", "Using print() to see values", "Deleting code"], correctIndex: 1 },
    ],
  },
  { id: "strings-methods", title: "String methods", explanation: "Strings have methods: .upper(), .lower(), .strip(), .split(), .replace(), .startswith(), in. They return new strings (strings are immutable).", exampleCode: "s = \"  Hello World  \"\nprint(s.strip().lower())\nprint(\"hello\".replace(\"l\", \"L\"))\nprint(\"a,b,c\".split(\",\"))", miniChallenge: "Take a string, strip it, and print its length.", challengeStarterCode: "t = \"  hi  \"\n# strip and len\n", quiz: [{ question: ".strip() does?", options: ["Adds spaces", "Removes leading/trailing spaces", "Splits"], correctIndex: 1 }, { question: "Strings are?", options: ["Mutable", "Immutable", "Numbers"], correctIndex: 1 }] },
  { id: "try-except", title: "Try and except", explanation: "Use try/except to handle errors. Code in try runs; if an exception occurs, the except block runs. You can have except ValueError or except Exception.", exampleCode: "try:\n    n = int(\"42\")\n    print(n + 1)\nexcept ValueError:\n    print(\"Not a number\")\ntry:\n    print(1/0)\nexcept ZeroDivisionError:\n    print(\"Cannot divide by zero\")", miniChallenge: "Ask for a number with input(); if it's not a number, print 'Invalid'.", challengeStarterCode: "s = input(\"Number: \")\n# try int(s) except print Invalid\n", quiz: [{ question: "try/except is for?", options: ["Loops", "Handling errors", "Defining functions"], correctIndex: 1 }, { question: "except runs when?", options: ["Always", "When an error occurs in try", "Never"], correctIndex: 1 }] },
  { id: "list-comprehensions", title: "List comprehensions", explanation: "A list comprehension builds a list in one line: [x*2 for x in nums] or [x for x in nums if x > 0]. They are concise and fast.", exampleCode: "nums = [1, 2, 3, 4, 5]\ndoubled = [x * 2 for x in nums]\nevens = [x for x in nums if x % 2 == 0]\nprint(doubled)\nprint(evens)", miniChallenge: "Create a list of squares of numbers from 1 to 5 using a comprehension.", challengeStarterCode: "# squares = [x**2 for x in range(1,6)]\n", quiz: [{ question: "[x*2 for x in [1,2,3]] gives?", options: ["[1,2,3]", "[2,4,6]", "[1,4,9]"], correctIndex: 1 }, { question: "We can add a condition with?", options: ["while", "if after for", "else"], correctIndex: 1 }] },
  { id: "reading-files", title: "Reading files", explanation: "Open a file with open('file.txt'). read() reads all; readlines() returns lines. Use with open(...) as f: so the file is closed automatically.", exampleCode: "with open(\"test.txt\", \"w\") as f:\n    f.write(\"Line 1\\nLine 2\\n\")\nwith open(\"test.txt\") as f:\n    content = f.read()\n    print(content)\n# Or: for line in f: print(line)", miniChallenge: "Write two lines to a file, then read and print them.", challengeStarterCode: "with open(\"out.txt\", \"w\") as f:\n    f.write(\"hello\\n\")\n# then open and read\n", quiz: [{ question: "with open(...) as f ensures?", options: ["File is slow", "File is closed after block", "File is deleted"], correctIndex: 1 }, { question: "read() returns?", options: ["One line", "Full content as string", "A list"], correctIndex: 1 }] },
  { id: "modules-import", title: "Modules and import", explanation: "Import other code with import math or from math import sqrt. Python has many built-in modules: math, random, datetime, json.", exampleCode: "import math\nprint(math.sqrt(16))\nprint(math.pi)\nimport random\nprint(random.randint(1, 10))", miniChallenge: "Import random and print a random number between 1 and 100.", challengeStarterCode: "import random\n# print(random.randint(1, 100))\n", quiz: [{ question: "import math gives?", options: ["Only pi", "The math module", "A number"], correctIndex: 1 }, { question: "from math import sqrt does?", options: ["Imports math", "Imports only sqrt", "Deletes sqrt"], correctIndex: 1 }] },
  { id: "default-args", title: "Default arguments", explanation: "Function parameters can have defaults: def greet(name, greeting=\"Hello\"):. Callers can omit them. Defaults are evaluated once at definition time.", exampleCode: "def power(base, exp=2):\n    return base ** exp\nprint(power(3))\nprint(power(3, 3))\ndef say(msg, end=\".\"):\n    print(msg + end)\nsay(\"Hi\")\nsay(\"Bye\", \"!\")", miniChallenge: "Write a function add(a, b=0) that returns a+b. Call with one and with two args.", challengeStarterCode: "def add(a, b=0):\n    return a + b\nprint(add(5))\nprint(add(5, 3))", quiz: [{ question: "Default args are used when?", options: ["Never", "Caller doesn't pass that arg", "Always"], correctIndex: 1 }, { question: "def f(x=1): means?", options: ["x is 1 always", "x defaults to 1 if not passed", "x must be 1"], correctIndex: 1 }] },
  { id: "slices", title: "Slicing", explanation: "Slicing gets a part of a list or string: lst[start:end] (end excluded). Omit start (from start) or end (to end). Negative indices count from the end. lst[::-1] reverses.", exampleCode: "s = \"Hello\"\nprint(s[1:4])\nprint(s[:2])\nprint(s[-1])\nprint(s[::-1])\nnums = [1,2,3,4,5]\nprint(nums[1:4])\nprint(nums[::2])", miniChallenge: "Given a list [10,20,30,40,50], print the middle three elements using a slice.", challengeStarterCode: "a = [10,20,30,40,50]\n# print(a[1:4])\n", quiz: [{ question: "s[1:4] includes index 4?", options: ["Yes", "No, end is excluded", "Only in strings"], correctIndex: 1 }, { question: "[::-1] does?", options: ["First element", "Reverse", "Sort"], correctIndex: 1 }] },
  { id: "enumerate-zip", title: "enumerate and zip", explanation: "enumerate(iterable) gives (index, item). zip(a, b) pairs items from two lists. Useful in loops when you need index or parallel iteration.", exampleCode: "fruits = [\"apple\", \"banana\", \"cherry\"]\nfor i, f in enumerate(fruits):\n    print(i, f)\nnames = [\"A\", \"B\"]\nages = [10, 12]\nfor n, a in zip(names, ages):\n    print(n, a)", miniChallenge: "Loop over a list with enumerate and print index and value.", challengeStarterCode: "items = [\"a\", \"b\", \"c\"]\n# for i, x in enumerate(items): print(i, x)\n", quiz: [{ question: "enumerate gives?", options: ["Only value", "Index and value", "Only index"], correctIndex: 1 }, { question: "zip combines?", options: ["One list", "Two or more lists in pairs", "Strings only"], correctIndex: 1 }] },
  { id: "sets", title: "Sets (unique items)", explanation: "A set holds unique items, no order. Use for membership and removing duplicates. {} or set(). add(), remove(), in.", exampleCode: "s = {1, 2, 3}\ns.add(4)\ns.add(2)\nprint(s)\nwords = [\"a\", \"b\", \"a\", \"c\", \"b\"]\nunique = set(words)\nprint(unique)", miniChallenge: "Create a set from a list that has duplicates and print its length.", challengeStarterCode: "nums = [1, 2, 2, 3, 3, 3]\n# unique = set(nums)\n", quiz: [{ question: "Sets contain?", options: ["Duplicates", "Unique items only", "Ordered pairs"], correctIndex: 1 }, { question: "Why use a set?", options: ["To sort", "To store unique values fast", "To index"], correctIndex: 1 }] },
  { id: "lambda", title: "Lambda (small functions)", explanation: "lambda args: expression creates a small anonymous function. Often used with map, filter, or sort key.", exampleCode: "double = lambda x: x * 2\nprint(double(5))\nnums = [1, 2, 3, 4]\nprint(list(map(lambda x: x**2, nums)))\nprint(list(filter(lambda x: x > 2, nums)))", miniChallenge: "Use lambda with map to add 10 to each number in [1,2,3].", challengeStarterCode: "nums = [1, 2, 3]\n# list(map(lambda x: x+10, nums))\n", quiz: [{ question: "lambda is for?", options: ["Long functions", "Short one-expression functions", "Loops only"], correctIndex: 1 }, { question: "map(f, lst) returns?", options: ["A number", "New list with f applied to each", "The same list"], correctIndex: 1 }] },
  { id: "recursion-basics", title: "Recursion basics", explanation: "A function can call itself (recursion). You need a base case (when to stop) and a recursive case. Example: factorial(n) = n * factorial(n-1).", exampleCode: "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\nprint(factorial(5))\ndef count_down(n):\n    if n <= 0: return\n    print(n)\n    count_down(n - 1)\ncount_down(3)", miniChallenge: "Write a recursive function that returns the sum of 1 to n.", challengeStarterCode: "def sum_to(n):\n    if n <= 0: return 0\n    return n + sum_to(n - 1)\nprint(sum_to(5))", quiz: [{ question: "Recursion needs?", options: ["Only recursion", "A base case and recursive case", "No return"], correctIndex: 1 }, { question: "factorial(0) should return?", options: ["0", "1", "None"], correctIndex: 1 }] },
  { id: "dict-methods", title: "Dictionary methods", explanation: "Keys(), .values(), .items() give keys, values, or pairs. .get(key, default) avoids KeyError. .update(other) merges. del d[key] or .pop(key) removes.", exampleCode: "d = {\"a\": 1, \"b\": 2}\nprint(d.keys())\nprint(d.get(\"c\", 0))\nd.update({\"c\": 3})\nprint(d)\nprint(d.pop(\"a\"))", miniChallenge: "Given a dict, print all keys and their values using .items().", challengeStarterCode: "d = {\"x\": 10, \"y\": 20}\n# for k, v in d.items(): print(k, v)\n", quiz: [{ question: ".get(key, 0) returns?", options: ["Always 0", "Value or 0 if key missing", "Keys only"], correctIndex: 1 }, { question: ".items() gives?", options: ["Only values", "Key-value pairs", "Only keys"], correctIndex: 1 }] },
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
      { title: "Log with variable", code: 'let name = "Sam";\nconsole.log("Hi,", name);' },
      { title: "Log multiple values", code: "console.log(\"Sum:\", 5 + 3, \"Product:\", 5 * 3);" },
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
      { title: "const cannot change", code: "const PI = 3.14;\nconsole.log(PI);" },
      { title: "Variables in one line", code: "let a = 1, b = 2, c = 3;\nconsole.log(a + b + c);" },
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
      { title: "typeof", code: "console.log(typeof 42);\nconsole.log(typeof \"hi\");\nconsole.log(typeof true);" },
      { title: "String and number", code: "let n = 5;\nconsole.log(\"I have \" + n + \" apples\");" },
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
      { title: "Logical OR", code: "let day = \"Saturday\";\nif (day === \"Saturday\" || day === \"Sunday\") console.log(\"Weekend!\");" },
      { title: "Ternary", code: "let age = 14;\nlet msg = age >= 13 ? \"Teen\" : \"Kid\";\nconsole.log(msg);" },
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
      { title: "Step in loop", code: "for (let i = 0; i < 10; i += 2) console.log(i);" },
      { title: "while loop", code: "let n = 0;\nwhile (n < 3) {\n  console.log(n);\n  n++;\n}" },
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
      { title: "Arrow function", code: "const double = (x) => x * 2;\nconsole.log(double(5));" },
      { title: "Return early", code: "function isEven(n) {\n  if (n % 2 === 0) return true;\n  return false;\n}\nconsole.log(isEven(4));" },
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
      { title: "unshift and shift", code: "let a = [2, 3];\na.unshift(1);\nconsole.log(a);\na.shift();\nconsole.log(a);" },
      { title: "Slice and indexOf", code: "let arr = [10, 20, 30, 40];\nconsole.log(arr.slice(1, 3));\nconsole.log(arr.indexOf(30));" },
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
      { title: "Keys and values", code: "let o = { a: 1, b: 2 };\nconsole.log(Object.keys(o));\nconsole.log(Object.values(o));" },
      { title: "Check property", code: "let user = { name: \"Alex\" };\nconsole.log(\"name\" in user);\nconsole.log(\"age\" in user);" },
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
      { title: "try and catch", code: "try {\n  console.log(JSON.parse(\"not json\"));\n} catch (e) {\n  console.log(\"Error:\", e.message);\n}" },
    ],
    miniChallenge: "Fix the bug: the code should log 8 (add two numbers).",
    challengeStarterCode: "let a = 5;\nlet b = 3;\nlet total = a - b;  // Bug: should be +\nconsole.log(total);  // Should be 8\n",
    quiz: [
      { question: "What is debugging?", options: ["Removing code", "Finding and fixing errors", "Writing new code"], correctIndex: 1 },
      { question: "What helps you see values while debugging?", options: ["Deleting variables", "console.log()", "Closing the console"], correctIndex: 1 },
    ],
  },
  { id: "string-methods", title: "String methods", explanation: "Strings have methods: .toUpperCase(), .toLowerCase(), .trim(), .split(), .replace(), .includes(), .startsWith(). They return new strings.", exampleCode: "let s = \"  Hello World  \";\nconsole.log(s.trim().toLowerCase());\nconsole.log(\"a,b,c\".split(\",\"));\nconsole.log(\"hello\".includes(\"ell\"));", miniChallenge: "Take a string, trim it, and log its length.", challengeStarterCode: "let t = \"  hi  \";\n// t.trim().length\n", quiz: [{ question: ".trim() does?", options: ["Adds spaces", "Removes leading/trailing spaces", "Splits"], correctIndex: 1 }, { question: ".split(\",\") returns?", options: ["String", "Array of strings", "Number"], correctIndex: 1 }] },
  { id: "try-catch", title: "Try and catch", explanation: "Use try/catch to handle errors. Code in try runs; if an exception is thrown, catch runs. Use catch (e) to read e.message.", exampleCode: "try {\n  let n = parseInt(\"42\");\n  console.log(n + 1);\n} catch (e) {\n  console.log(\"Error:\", e.message);\n}\ntry {\n  JSON.parse(\"invalid\");\n} catch (e) {\n  console.log(\"Parse failed\");\n}", miniChallenge: "Parse a string as JSON in try; in catch log 'Invalid JSON'.", challengeStarterCode: "let s = '{\"a\":1}';\ntry { console.log(JSON.parse(s)); } catch (e) { console.log('Invalid'); }", quiz: [{ question: "try/catch is for?", options: ["Loops", "Handling errors", "Functions only"], correctIndex: 1 }, { question: "catch runs when?", options: ["Always", "When an error is thrown in try", "Never"], correctIndex: 1 }] },
  { id: "map-filter", title: "map and filter", explanation: "arr.map(fn) returns a new array with fn applied to each element. arr.filter(fn) returns elements where fn returns true.", exampleCode: "let nums = [1, 2, 3, 4, 5];\nlet doubled = nums.map(x => x * 2);\nlet evens = nums.filter(x => x % 2 === 0);\nconsole.log(doubled);\nconsole.log(evens);", miniChallenge: "Use map to get squares of [1,2,3,4]. Use filter to get numbers > 2.", challengeStarterCode: "let a = [1,2,3,4];\n// map, filter\n", quiz: [{ question: "map returns?", options: ["Same array", "New array with fn applied", "A number"], correctIndex: 1 }, { question: "filter keeps elements where?", options: ["fn returns false", "fn returns true", "fn is undefined"], correctIndex: 1 }] },
  { id: "spread-rest", title: "Spread and rest", explanation: "...spread copies or merges: [...arr], {...obj}. Rest collects args: function f(...args) { }. Use them to copy arrays/objects or variable arguments.", exampleCode: "let a = [1, 2, 3];\nlet b = [...a, 4];\nconsole.log(b);\nlet o = { x: 1 };\nlet o2 = { ...o, y: 2 };\nfunction sum(...nums) { return nums.reduce((s, n) => s + n, 0); }\nconsole.log(sum(1, 2, 3));", miniChallenge: "Write a function that takes any number of args and returns the max.", challengeStarterCode: "function max(...n) { return Math.max(...n); }\nconsole.log(max(1,5,3));", quiz: [{ question: "... in [...arr] is?", options: ["Rest", "Spread", "Optional"], correctIndex: 1 }, { question: "function f(...a) collects?", options: ["One value", "All arguments in array a", "Nothing"], correctIndex: 1 }] },
  { id: "destructuring", title: "Destructuring", explanation: "Unpack values: const [a, b] = [1, 2]; const { name } = obj;. For function params: function f({ name }) { }. Defaults: const [a = 0] = [].", exampleCode: "let [x, y] = [10, 20];\nconsole.log(x, y);\nlet { name, age } = { name: \"Alex\", age: 10 };\nconsole.log(name);\nlet [first, ...rest] = [1, 2, 3];\nconsole.log(first, rest);", miniChallenge: "Destructure an object with title and price; log both.", challengeStarterCode: "let book = { title: \"JS\", price: 20 };\n// let { title, price } = book;\n", quiz: [{ question: "const [a,b] = [1,2] sets?", options: ["a=1, b=2", "a=[1,2]", "b=1"], correctIndex: 0 }, { question: "Destructuring object uses?", options: ["[]", "{}", "()"], correctIndex: 1 }] },
  { id: "json", title: "JSON", explanation: "JSON.stringify(obj) turns an object into a string. JSON.parse(str) turns a string into an object. Used for sending and receiving data.", exampleCode: "let obj = { name: \"Alex\", scores: [80, 90] };\nlet str = JSON.stringify(obj);\nconsole.log(str);\nlet back = JSON.parse(str);\nconsole.log(back.name);", miniChallenge: "Create an object, stringify it, then parse it back and log a property.", challengeStarterCode: "let o = { a: 1 };\nlet s = JSON.stringify(o);\nlet o2 = JSON.parse(s);\nconsole.log(o2.a);", quiz: [{ question: "JSON.stringify does?", options: ["Parses", "Turns object to string", "Deletes keys"], correctIndex: 1 }, { question: "JSON.parse does?", options: ["Stringifies", "Turns string to object", "Validates only"], correctIndex: 1 }] },
  { id: "fetch-basics", title: "Fetch (async)", explanation: "fetch(url) returns a Promise. Use async/await: const res = await fetch(url); const data = await res.json();. Wrap in async function.", exampleCode: "async function getData() {\n  try {\n    const res = await fetch('https://jsonplaceholder.typicode.com/todos/1');\n    const data = await res.json();\n    console.log(data);\n  } catch (e) { console.log(e); }\n}\ngetData();", miniChallenge: "Call fetch on a URL and log the response text (res.text()).", challengeStarterCode: "async function run() {\n  const r = await fetch('https://example.com');\n  const t = await r.text();\n  console.log(t.slice(0, 100));\n}\nrun();", quiz: [{ question: "fetch returns?", options: ["Data directly", "A Promise", "A string"], correctIndex: 1 }, { question: "await can be used inside?", options: ["Any function", "async function only", "Nowhere"], correctIndex: 1 }] },
  { id: "classes-basics", title: "Classes basics", explanation: "class Name { constructor() { } method() { } }. new Name() creates an instance. this refers to the instance.", exampleCode: "class Person {\n  constructor(name) { this.name = name; }\n  greet() { return \"Hi, \" + this.name; }\n}\nlet p = new Person(\"Alex\");\nconsole.log(p.greet());", miniChallenge: "Define a class Robot with constructor(battery) and method use() that logs battery.", challengeStarterCode: "class Robot {\n  constructor(battery) { this.battery = battery; }\n  use() { console.log(this.battery); }\n}\nlet r = new Robot(100);\nr.use();", quiz: [{ question: "new ClassName() creates?", options: ["A class", "An instance", "A function"], correctIndex: 1 }, { question: "this in a method refers to?", options: ["Global", "The instance", "The class"], correctIndex: 1 }] },
  { id: "modules-import", title: "Modules (import/export)", explanation: "Export with export function f() {} or export default. Import with import { f } from './file.js' or import x from './file.js'.", exampleCode: "// In math.js: export function add(a,b){ return a+b; }\n// Here:\n// import { add } from './math.js';\n// console.log(add(2,3));\n// Simulated:\nfunction add(a,b){ return a+b; }\nconsole.log(add(2,3));", miniChallenge: "Write a small function and 'export' it (comment). In another place 'import' and call it.", challengeStarterCode: "// export function double(x){ return x*2; }\nfunction double(x){ return x*2; }\nconsole.log(double(5));", quiz: [{ question: "export makes?", options: ["Private", "Available for import", "Deleted"], correctIndex: 1 }, { question: "import { x } loads?", options: ["Nothing", "Named export x", "Default only"], correctIndex: 1 }] },
  { id: "reduce", title: "reduce", explanation: "arr.reduce((acc, item) => newAcc, initial) builds one value from an array. acc is the accumulated value; return the next acc.", exampleCode: "let nums = [1, 2, 3, 4];\nlet sum = nums.reduce((acc, n) => acc + n, 0);\nlet product = nums.reduce((acc, n) => acc * n, 1);\nconsole.log(sum);\nconsole.log(product);", miniChallenge: "Use reduce to find the maximum value in an array.", challengeStarterCode: "let a = [3, 1, 4, 1, 5];\nlet max = a.reduce((m, n) => n > m ? n : m, a[0]);\nconsole.log(max);", quiz: [{ question: "reduce returns?", options: ["Array", "Single value", "Nothing"], correctIndex: 1 }, { question: "First argument to reduce callback is?", options: ["Current item", "Accumulator", "Index"], correctIndex: 1 }] },
  { id: "set-timeout", title: "setTimeout and setInterval", explanation: "setTimeout(fn, ms) runs fn once after ms. setInterval(fn, ms) runs fn every ms. Clear with clearTimeout(id) or clearInterval(id).", exampleCode: "setTimeout(() => console.log(\"Done\"), 1000);\nlet id = setInterval(() => console.log(\"tick\"), 500);\nsetTimeout(() => clearInterval(id), 2000);", miniChallenge: "Use setTimeout to log 'Hello' after 2 seconds.", challengeStarterCode: "setTimeout(() => console.log('Hello'), 2000);", quiz: [{ question: "setTimeout runs?", options: ["Immediately", "Once after delay", "Forever"], correctIndex: 1 }, { question: "setInterval runs?", options: ["Once", "Repeatedly", "Never"], correctIndex: 1 }] },
  { id: "template-literals", title: "Template literals", explanation: "Use backticks for strings. ${expression} inside is evaluated. Good for multiline and embedding variables.", exampleCode: "let name = \"Alex\";\nlet age = 10;\nconsole.log(`Name: ${name}, Age: ${age}`);\nconsole.log(`Next year: ${age + 1}`);\nlet html = `<div>${name}</div>`;", miniChallenge: "Create a string with template literal: 'I have X apples' where X is a variable.", challengeStarterCode: "let n = 5;\nconsole.log(`I have ${n} apples`);", quiz: [{ question: "Template literals use?", options: ["Quotes", "Backticks", "Parentheses"], correctIndex: 1 }, { question: "${x} in a template?", options: ["Prints literally", "Evaluates x", "Errors"], correctIndex: 1 }] },
];

// —— Web Basics (HTML/CSS) ——
const HTML_LESSONS: AcademyLesson[] = [
  {
    id: "html-headings",
    title: "Headings and paragraphs",
    explanation: "HTML uses tags to structure the page. <h1> is the biggest heading, <h2> smaller, and <p> is a paragraph. Every tag has an opening and closing part.",
    exampleCode: "<!DOCTYPE html>\n<html>\n<body>\n  <h1>My Page</h1>\n  <p>This is a paragraph.</p>\n  <h2>Smaller heading</h2>\n  <p>Another paragraph.</p>\n</body>\n</html>",
    extraExamples: [
      { title: "More headings", code: "<h1>Title</h1>\n<h2>Part 1</h2>\n<h3>Section A</h3>\n<p>Text here.</p>" },
      { title: "Lists", code: "<ul>\n  <li>First</li>\n  <li>Second</li>\n</ul>\n<ol>\n  <li>Step one</li>\n  <li>Step two</li>\n</ol>" },
    ],
    miniChallenge: "Add an <h1> with your name and a <p> that says one thing you like.",
    challengeStarterCode: "<!DOCTYPE html>\n<html>\n<body>\n  <!-- Add h1 and p here -->\n</body>\n</html>",
    quiz: [
      { question: "What tag is for a paragraph?", options: ["<par>", "<p>", "<para>"], correctIndex: 1 },
      { question: "Which is the biggest heading?", options: ["<h2>", "<h1>", "<h3>"], correctIndex: 1 },
    ],
  },
  {
    id: "html-links-images",
    title: "Links and images",
    explanation: "<a href=\"url\">text</a> makes a link. <img src=\"url\" alt=\"description\"> shows an image. Links can go to other pages or to a place on the same page.",
    exampleCode: "<!DOCTYPE html>\n<html>\n<body>\n  <a href=\"https://example.com\">Visit Example</a>\n  <img src=\"https://placekitten.com/200/200\" alt=\"A cat\">\n</body>\n</html>",
    extraExamples: [
      { title: "Link in a paragraph", code: "<p>Go to <a href=\"https://google.com\">Google</a>.</p>" },
      { title: "Image with width", code: "<img src=\"https://placekitten.com/100/100\" alt=\"Kitten\" width=\"100\">" },
    ],
    miniChallenge: "Add a link to your favourite website and an image.",
    challengeStarterCode: "<!DOCTYPE html>\n<html>\n<body>\n  <!-- Add <a> and <img> -->\n</body>\n</html>",
    quiz: [
      { question: "Which attribute holds the URL in a link?", options: ["src", "href", "url"], correctIndex: 1 },
      { question: "What does alt on an image do?", options: ["Makes it bigger", "Describes the image", "Links it"], correctIndex: 1 },
    ],
  },
  {
    id: "css-basics",
    title: "CSS: colours and fonts",
    explanation: "CSS styles your HTML. You can set color, font-size, font-family, and background-color. Use a <style> tag or a separate .css file. Selectors like h1 or .class name pick which elements to style.",
    exampleCode: "<!DOCTYPE html>\n<html>\n<head>\n<style>\n  h1 { color: blue; font-size: 32px; }\n  p { color: gray; font-family: Arial; }\n  body { background-color: #f0f0f0; }\n</style>\n</head>\n<body>\n  <h1>Styled heading</h1>\n  <p>Styled paragraph.</p>\n</body>\n</html>",
    extraExamples: [
      { title: "More colors", code: "<style>\np { color: green; }\n.special { color: red; }\n</style>\n<p>Normal</p>\n<p class=\"special\">Red text</p>" },
      { title: "Padding and border", code: "<style>\n.box { padding: 20px; border: 2px solid black; }\n</style>\n<div class=\"box\">Content</div>" },
    ],
    miniChallenge: "Make the heading red and the paragraph have a larger font-size.",
    challengeStarterCode: "<!DOCTYPE html>\n<html>\n<head>\n<style>\n  /* style h1 and p */\n</style>\n</head>\n<body>\n  <h1>Hello</h1>\n  <p>Some text.</p>\n</body>\n</html>",
    quiz: [
      { question: "Which CSS property sets text color?", options: ["font-color", "color", "text-color"], correctIndex: 1 },
      { question: "Where can you put CSS?", options: ["Only in another file", "In a <style> tag or a .css file", "Only in <body>"], correctIndex: 1 },
    ],
  },
  {
    id: "css-layout",
    title: "CSS: layout and boxes",
    explanation: "Every element is a box. You can set width, height, margin (space outside), and padding (space inside). display: flex; on a parent arranges children in a row or column. Use class and id to target specific elements.",
    exampleCode: "<!DOCTYPE html>\n<html>\n<head>\n<style>\n  .card { width: 200px; padding: 16px; border: 1px solid #ccc; margin: 10px; }\n  .row { display: flex; flex-wrap: wrap; }\n</style>\n</head>\n<body>\n  <div class=\"row\">\n    <div class=\"card\">Card 1</div>\n    <div class=\"card\">Card 2</div>\n  </div>\n</body>\n</html>",
    extraExamples: [
      { title: "Center text", code: "<style>\n.centered { text-align: center; margin: 20px auto; max-width: 400px; }\n</style>\n<div class=\"centered\">Centered</div>" },
      { title: "Flex column", code: "<style>\n.col { display: flex; flex-direction: column; gap: 10px; }\n</style>\n<div class=\"col\"><div>A</div><div>B</div></div>" },
    ],
    miniChallenge: "Create two boxes side by side using display: flex.",
    challengeStarterCode: "<!DOCTYPE html>\n<html>\n<head>\n<style>\n  /* use flex to put .box1 and .box2 side by side */\n</style>\n</head>\n<body>\n  <div>\n    <div class=\"box1\">One</div>\n    <div class=\"box2\">Two</div>\n  </div>\n</body>\n</html>",
    quiz: [
      { question: "What does padding do?", options: ["Space outside the box", "Space inside the box", "Border thickness"], correctIndex: 1 },
      { question: "How do you lay out items in a row with CSS?", options: ["float", "display: flex", "display: row"], correctIndex: 1 },
    ],
  },
  {
    id: "html-forms",
    title: "Forms and inputs",
    explanation: "Forms collect user input. Use <form>, <input> (text, number, checkbox, submit), <label>, and <button>. The name attribute identifies the field when the form is submitted.",
    exampleCode: "<!DOCTYPE html>\n<html>\n<body>\n  <form>\n    <label>Name: <input type=\"text\" name=\"name\"></label><br>\n    <label>Age: <input type=\"number\" name=\"age\"></label><br>\n    <button type=\"submit\">Send</button>\n  </form>\n</body>\n</html>",
    extraExamples: [
      { title: "Checkbox and radio", code: "<label><input type=\"checkbox\" name=\"agree\"> I agree</label><br>\n<label><input type=\"radio\" name=\"size\" value=\"s\"> S</label>\n<label><input type=\"radio\" name=\"size\" value=\"m\"> M</label>" },
      { title: "Placeholder and required", code: "<input type=\"email\" placeholder=\"you@example.com\" required>" },
    ],
    miniChallenge: "Create a form with a text input for 'favourite colour' and a Submit button.",
    challengeStarterCode: "<!DOCTYPE html>\n<html>\n<body>\n  <form>\n    <!-- Add input and button -->\n  </form>\n</body>\n</html>",
    quiz: [
      { question: "Which input type is for numbers?", options: ["text", "number", "num"], correctIndex: 1 },
      { question: "What links a label to an input?", options: ["id and for", "name", "class"], correctIndex: 0 },
    ],
  },
  {
    id: "html-semantic",
    title: "Semantic HTML",
    explanation: "Semantic tags describe meaning: <header>, <nav>, <main>, <section>, <article>, <footer>. They help accessibility and SEO, and make the structure clear.",
    exampleCode: "<!DOCTYPE html>\n<html>\n<body>\n  <header><h1>Site title</h1></header>\n  <nav><a href=\"/\">Home</a> | <a href=\"/about\">About</a></nav>\n  <main>\n    <article><h2>Post title</h2><p>Content here.</p></article>\n  </main>\n  <footer>© 2025</footer>\n</body>\n</html>",
    extraExamples: [
      { title: "Section and aside", code: "<main>\n  <section><h2>Intro</h2><p>Text.</p></section>\n  <aside><p>Side note</p></aside>\n</main>" },
    ],
    miniChallenge: "Build a small page with header, nav, main (one section), and footer.",
    challengeStarterCode: "<!DOCTYPE html>\n<html>\n<body>\n  <!-- header, nav, main, footer -->\n</body>\n</html>",
    quiz: [
      { question: "Which tag is for the main content?", options: ["<div>", "<main>", "<content>"], correctIndex: 1 },
      { question: "What is <nav> for?", options: ["Images", "Navigation links", "Tables"], correctIndex: 1 },
    ],
  },
  {
    id: "css-responsive",
    title: "CSS: responsive and media queries",
    explanation: "Responsive design adapts to screen size. Use max-width on containers, and @media (max-width: 600px) { ... } to change styles on small screens. Use relative units (%, rem) where it helps.",
    exampleCode: "<!DOCTYPE html>\n<html>\n<head>\n<style>\n  .box { width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; }\n  @media (max-width: 500px) {\n    .box { font-size: 14px; padding: 10px; }\n  }\n</style>\n</head>\n<body>\n  <div class=\"box\">Resize the window to see styles change.</div>\n</body>\n</html>",
    extraExamples: [
      { title: "Stack on mobile", code: "@media (max-width: 600px) {\n  .row { flex-direction: column; }\n}" },
    ],
    miniChallenge: "Add a media query so that on screens under 400px the body has a different background colour.",
    challengeStarterCode: "<!DOCTYPE html>\n<html>\n<head>\n<style>\n  body { background: #f5f5f5; }\n  /* @media (max-width: 400px) { ... } */\n</style>\n</head>\n<body>\n  <p>Resize to test.</p>\n</body>\n</html>",
    quiz: [
      { question: "What does @media do?", options: ["Plays audio", "Applies styles by screen size", "Imports a file"], correctIndex: 1 },
      { question: "Why use max-width on a container?", options: ["To hide it", "To limit width on large screens", "To add padding"], correctIndex: 1 },
    ],
  },
  { id: "html-tables", title: "Tables", explanation: "Tables organize data in rows and columns. Use <table>, <tr> (row), <th> (header cell), <td> (data cell). Add <thead> and <tbody> for structure.", exampleCode: "<table border=\"1\">\n<tr><th>Name</th><th>Score</th></tr>\n<tr><td>Alex</td><td>90</td></tr>\n<tr><td>Sam</td><td>85</td></tr>\n</table>", miniChallenge: "Create a table with 2 columns and 3 rows of data.", challengeStarterCode: "<table>\n<!-- add tr, th, td -->\n</table>", quiz: [{ question: "What is <td>?", options: ["Table data", "Table div", "Text bold"], correctIndex: 0 }, { question: "What is <tr>?", options: ["Table row", "Table right", "Table header"], correctIndex: 0 }] },
  { id: "html-div-span", title: "div and span", explanation: "<div> is a block container (starts on a new line); <span> is inline (stays in the same line). Use them to group elements and apply CSS or JavaScript.", exampleCode: "<div class=\"block\">Block one</div><div>Block two</div>\n<p>Here is <span class=\"highlight\">important</span> text.</p>", miniChallenge: "Wrap two paragraphs in a div and give the div a class.", challengeStarterCode: "<div class=\"wrapper\">\n  <!-- p tags -->\n</div>", quiz: [{ question: "div is block or inline?", options: ["Block", "Inline", "Neither"], correctIndex: 0 }, { question: "span is used for?", options: ["Full page", "Part of a line", "Images only"], correctIndex: 1 }] },
  { id: "css-box-model", title: "CSS: Box model", explanation: "Every element has content, padding (inside), border, and margin (outside). Total width = width + padding + border. Use box-sizing: border-box to include padding and border in width.", exampleCode: "<style>\n.box { width: 200px; padding: 20px; border: 5px solid black; margin: 10px; box-sizing: border-box; }\n</style>\n<div class=\"box\">Content</div>", miniChallenge: "Create a box with 10px padding and a 2px border.", challengeStarterCode: "<style>\n.card { }\n</style>\n<div class=\"card\">Hi</div>", quiz: [{ question: "Margin is outside or inside?", options: ["Outside", "Inside", "Border"], correctIndex: 0 }, { question: "What does box-sizing: border-box do?", options: ["Hides box", "Includes padding in width", "Adds shadow"], correctIndex: 1 }] },
  { id: "css-grid", title: "CSS: Grid", explanation: "CSS Grid lays out items in rows and columns. Use display: grid on the parent; grid-template-columns and grid-template-rows define the grid. Use gap for space between items.", exampleCode: "<style>\n.grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }\n.grid > div { background: #eee; padding: 10px; }\n</style>\n<div class=\"grid\"><div>A</div><div>B</div><div>C</div><div>D</div><div>E</div><div>F</div></div>", miniChallenge: "Make a 2x2 grid with four items.", challengeStarterCode: "<style>\n.grid { display: grid; }\n</style>\n<div class=\"grid\"><div>1</div><div>2</div><div>3</div><div>4</div></div>", quiz: [{ question: "Grid is for?", options: ["Colors", "Layout in rows/columns", "Fonts"], correctIndex: 1 }, { question: "What is 1fr?", options: ["One font", "One fraction of space", "One frame"], correctIndex: 1 }] },
  { id: "css-pseudo", title: "CSS: Pseudo-classes", explanation: "Pseudo-classes style elements in a certain state. :hover when the mouse is over, :focus when focused, :first-child for the first child. Example: a:hover { color: red; }", exampleCode: "<style>\nbutton { padding: 10px 20px; }\nbutton:hover { background: blue; color: white; }\np:first-child { font-weight: bold; }\n</style>\n<button>Hover me</button>\n<p>First</p><p>Second</p>", miniChallenge: "Make links change color on hover.", challengeStarterCode: "<style>\na { color: blue; }\n/* a:hover { } */\n</style>\n<a href=\"#\">Link</a>", quiz: [{ question: ":hover is for?", options: ["Mobile", "Mouse over element", "Hidden"], correctIndex: 1 }, { question: ":first-child targets?", options: ["All children", "First child only", "Last child"], correctIndex: 1 }] },
  { id: "css-units", title: "CSS: Units (px, em, rem, %)", explanation: "px is pixels (fixed). em is relative to the element's font size. rem is relative to the root font size. % is percentage of the parent. Use rem for scalable typography.", exampleCode: "<style>\nhtml { font-size: 16px; }\n.text { font-size: 1.5rem; }\n.box { width: 50%; padding: 1em; }\n</style>\n<div class=\"box\"><p class=\"text\">Sized with rem and %</p></div>", miniChallenge: "Set a heading to 2rem and a box width to 80%.", challengeStarterCode: "<style>\nh1 { }\n.wide { }\n</style>", quiz: [{ question: "rem is relative to?", options: ["Parent", "Root html", "Screen"], correctIndex: 1 }, { question: "What is 50%?", options: ["50 pixels", "Half of parent", "Half screen"], correctIndex: 1 }] },
  { id: "css-transitions", title: "CSS: Transitions", explanation: "Transitions animate a property change over time. Use transition: property duration; e.g. transition: background 0.3s; Then change the property (e.g. on hover) and it animates.", exampleCode: "<style>\n.btn { background: green; color: white; padding: 10px; transition: background 0.3s; }\n.btn:hover { background: darkgreen; }\n</style>\n<button class=\"btn\">Hover</button>", miniChallenge: "Add a 0.5s transition to a link's color on hover.", challengeStarterCode: "<style>\na { color: blue; }\n</style>\n<a href=\"#\">Link</a>", quiz: [{ question: "transition needs?", options: ["Property and duration", "Only color", "JavaScript"], correctIndex: 0 }, { question: "What does 0.3s mean?", options: ["3 pixels", "0.3 seconds", "3 times"], correctIndex: 1 }] },
  { id: "html-meta", title: "Head and meta tags", explanation: "The <head> contains metadata: <title> (browser tab), <meta charset=\"utf-8\"> (character encoding), <meta name=\"viewport\" content=\"width=device-width\"> for mobile. Link to CSS with <link rel=\"stylesheet\" href=\"style.css\">.", exampleCode: "<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width\">\n  <title>My Page</title>\n</head>\n<body><p>Content</p></body>\n</html>", miniChallenge: "Add a title and viewport meta tag to your page.", challengeStarterCode: "<!DOCTYPE html>\n<html>\n<head>\n</head>\n<body></body>\n</html>", quiz: [{ question: "Where does <title> appear?", options: ["In body", "Browser tab", "Footer"], correctIndex: 1 }, { question: "Viewport meta helps with?", options: ["Speed", "Mobile sizing", "Colors"], correctIndex: 1 }] },
  { id: "html-accessibility", title: "Accessibility basics", explanation: "Use semantic HTML (header, nav, main). Add alt text to images. Use <label> for inputs. Ensure good contrast and that keyboard navigation works. aria-label can describe elements for screen readers.", exampleCode: "<label for=\"name\">Name</label>\n<input id=\"name\" type=\"text\" aria-label=\"Your name\">\n<img src=\"cat.jpg\" alt=\"A orange cat sleeping\">", miniChallenge: "Add alt text to an image and a label for an input.", challengeStarterCode: "<input type=\"text\">\n<img src=\"pic.jpg\">", quiz: [{ question: "alt on images helps?", options: ["Speed", "Screen readers and SEO", "Colors"], correctIndex: 1 }, { question: "label for= should match input?", options: ["No", "Yes, with id", "Only in forms"], correctIndex: 1 }] },
  { id: "css-variables", title: "CSS variables", explanation: "Define variables in :root and use them with var(). Example: :root { --main-color: blue; } .box { color: var(--main-color); }. Change one place to update many elements.", exampleCode: "<style>\n:root { --primary: #2563eb; --spacing: 16px; }\n.box { background: var(--primary); padding: var(--spacing); }\n</style>\n<div class=\"box\">Uses variables</div>", miniChallenge: "Define --my-color and use it for a heading and a border.", challengeStarterCode: "<style>\n:root { }\n</style>", quiz: [{ question: "Where do we define CSS variables?", options: ["In body", "In :root or any selector", "Only in JS"], correctIndex: 1 }, { question: "var(--name) does?", options: ["Creates variable", "Uses the variable value", "Deletes variable"], correctIndex: 1 }] },
  { id: "html-entities", title: "HTML entities", explanation: "Special characters use entities: &lt; for <, &gt; for >, &amp; for &, &nbsp; for non-breaking space, &copy; for ©. Use them when you need to show the character, not use it as code.", exampleCode: "<p>Write 5 &lt; 10 and 10 &gt; 5.</p>\n<p>© 2025 My Site</p>", miniChallenge: "Display the text 'Use <div> in HTML' using entities for the angle brackets.", challengeStarterCode: "<p></p>", quiz: [{ question: "&amp; shows?", options: ["And", "&", "Amp"], correctIndex: 1 }, { question: "Why use entities?", options: ["To hide text", "To display special chars safely", "To run code"], correctIndex: 1 }] },
  { id: "css-flexbox-deep", title: "CSS: Flexbox deep dive", explanation: "Flexbox: justify-content (main axis), align-items (cross axis), flex-wrap, flex-grow, flex-shrink. Use flex: 1 to let items share space. gap adds space between items.", exampleCode: "<style>\n.flex { display: flex; justify-content: space-between; align-items: center; gap: 10px; }\n.flex .item { flex: 1; padding: 10px; background: #eee; }\n</style>\n<div class=\"flex\"><div class=\"item\">1</div><div class=\"item\">2</div><div class=\"item\">3</div></div>", miniChallenge: "Center three items vertically and space them evenly horizontally.", challengeStarterCode: "<style>\n.flex { display: flex; }\n</style>\n<div class=\"flex\"><span>A</span><span>B</span><span>C</span></div>", quiz: [{ question: "justify-content aligns on?", options: ["Cross axis", "Main axis", "Both"], correctIndex: 1 }, { question: "flex: 1 means?", options: ["One pixel", "Grow to share space", "Shrink only"], correctIndex: 1 }] },
  { id: "html-forms-submit", title: "Forms: Submit and action", explanation: "A form can have action=\"url\" (where to send data) and method=\"GET\" or \"POST\". On submit, the browser sends the input names and values. Use JavaScript or a server to handle the submission.", exampleCode: "<form action=\"/submit\" method=\"POST\">\n  <input name=\"email\" type=\"email\" required>\n  <button type=\"submit\">Submit</button>\n</form>", miniChallenge: "Add action and method to a form with one input.", challengeStarterCode: "<form>\n  <input name=\"q\" type=\"text\">\n  <button type=\"submit\">Go</button>\n</form>", quiz: [{ question: "method POST sends data?", options: ["In URL", "In request body", "In title"], correctIndex: 1 }, { question: "name on input is used for?", options: ["Styling", "Identifying the value sent", "Placeholder"], correctIndex: 1 }] },
  { id: "css-animations", title: "CSS: Simple animations", explanation: "Use @keyframes to define an animation, then animation: name duration on an element. Example: @keyframes fade { from { opacity: 0; } to { opacity: 1; } } and animation: fade 1s;", exampleCode: "<style>\n@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }\n.anim { animation: pulse 2s infinite; }\n</style>\n<p class=\"anim\">Pulsing text</p>", miniChallenge: "Create a simple spin or fade animation and apply it.", challengeStarterCode: "<style>\n@keyframes myanim { }\n</style>", quiz: [{ question: "@keyframes defines?", options: ["Colors", "Animation steps", "Layout"], correctIndex: 1 }, { question: "animation: fade 1s means?", options: ["Fade 1 time", "Animation named fade, 1 second", "Fade and 1 second delay"], correctIndex: 1 }] },
];

// —— React JS (run as JavaScript; concepts) ——
const REACT_LESSONS: AcademyLesson[] = [
  {
    id: "react-component-idea",
    title: "Components as functions",
    explanation: "In React, a component is often a function that returns what to show. The idea is: one function = one piece of the UI. Here we simulate that with a plain function returning a string (in real React it returns JSX).",
    exampleCode: "function Greeting(props) {\n  return \"Hello, \" + props.name + \"!\";\n}\nconst msg = Greeting({ name: \"Alex\" });\nconsole.log(msg);  // Hello, Alex!",
    extraExamples: [
      { title: "Multiple props", code: "function Card(props) {\n  return props.title + \": \" + props.value;\n}\nconsole.log(Card({ title: \"Score\", value: 100 }));" },
      { title: "Default prop", code: "function Say(msg) {\n  return (msg && msg.text) || \"Hi\";\n}\nconsole.log(Say({ text: \"Bye\" }));\nconsole.log(Say({}));" },
    ],
    miniChallenge: "Write a function Welcome(props) that returns 'Welcome, ' + props.name. Call it with { name: 'Sam' }.",
    challengeStarterCode: "function Welcome(props) {\n  // return 'Welcome, ' + props.name\n}\nconsole.log(Welcome({ name: \"Sam\" }));",
    quiz: [
      { question: "What does a React component receive?", options: ["Nothing", "Props (inputs)", "Only strings"], correctIndex: 1 },
      { question: "A component is like a what?", options: ["Variable", "Function that returns UI", "Loop"], correctIndex: 1 },
    ],
  },
  {
    id: "react-state-idea",
    title: "State: data that changes",
    explanation: "State is data that can change over time (e.g. a counter, whether a modal is open). When state changes, the UI updates. Here we mimic that with a simple object and a function that updates it and 're-renders' (logs).",
    exampleCode: "let state = { count: 0 };\nfunction setCount(n) {\n  state.count = n;\n  console.log(\"Render:\", state.count);\n}\nsetCount(1);\nsetCount(2);\nconsole.log(\"Final:\", state.count);",
    extraExamples: [
      { title: "Toggle", code: "let state = { on: false };\nfunction toggle() {\n  state.on = !state.on;\n  console.log(\"Lights\", state.on ? \"on\" : \"off\");\n}\ntoggle();\ntoggle();" },
      { title: "Input value", code: "let state = { text: \"\" };\nfunction setText(t) { state.text = t; console.log(state.text); }\nsetText(\"Hi\");\nsetText(\"Hello\");" },
    ],
    miniChallenge: "Keep a state object with score. Write a function addScore() that adds 10 and logs the new score.",
    challengeStarterCode: "let state = { score: 0 };\nfunction addScore() {\n  // add 10 to state.score and console.log\n}\naddScore();\naddScore();",
    quiz: [
      { question: "What is state?", options: ["A country", "Data that can change and update the UI", "A loop"], correctIndex: 1 },
      { question: "When state changes in React, what happens?", options: ["Nothing", "The component re-renders", "The page reloads"], correctIndex: 1 },
    ],
  },
  {
    id: "react-lists",
    title: "Rendering lists",
    explanation: "In React you often map over an array to render a list of components. Each item needs a unique key (usually an id) so React can update efficiently. Here we simulate with a simple loop and console output.",
    exampleCode: "const fruits = [\"Apple\", \"Banana\", \"Cherry\"];\nfunction FruitList(items) {\n  return items.map((f, i) => (i + 1) + \". \" + f).join(\"\\n\");\n}\nconsole.log(FruitList(fruits));",
    extraExamples: [
      { title: "List of objects", code: "const users = [{ id: 1, name: \"Alex\" }, { id: 2, name: \"Sam\" }];\nusers.forEach(u => console.log(u.id, u.name));" },
      { title: "Filter then map", code: "const nums = [1, 2, 3, 4, 5];\nconst evens = nums.filter(n => n % 2 === 0).map(n => n * 2);\nconsole.log(evens);" },
    ],
    miniChallenge: "Given an array of names, 'log' each as 'Hello, Name!' (simulate list render).",
    challengeStarterCode: "const names = [\"Alex\", \"Sam\", \"Jordan\"];\n// loop and console.log 'Hello, Name!' for each\n",
    quiz: [
      { question: "Why do we need keys in a list?", options: ["To encrypt", "So React can track each item", "To sort"], correctIndex: 1 },
      { question: "What do we use to turn data into UI items?", options: ["key", "map", "state"], correctIndex: 1 },
    ],
  },
  {
    id: "react-events",
    title: "Events and handlers",
    explanation: "React uses camelCase event names (onClick, onChange). You pass a function that gets called when the event happens. Here we simulate: a function that would be the click handler and we call it to show the idea.",
    exampleCode: "function handleClick() {\n  console.log(\"Button clicked!\");\n}\nfunction handleChange(value) {\n  console.log(\"New value:\", value);\n}\nhandleClick();\nhandleChange(\"hello\");",
    extraExamples: [
      { title: "With parameter", code: "function handleSelect(id) {\n  console.log(\"Selected:\", id);\n}\nhandleSelect(42);" },
      { title: "Event object (simulated)", code: "function handleClick(e) {\n  console.log(\"target:\", e?.target?.tagName);\n}\nhandleClick({ target: { tagName: \"BUTTON\" } });" },
    ],
    miniChallenge: "Write a function handleSubmit() that logs 'Form submitted'. Call it.",
    challengeStarterCode: "function handleSubmit() {\n  // console.log('Form submitted')\n}\nhandleSubmit();",
    quiz: [
      { question: "What is the click handler prop called in React?", options: ["click", "onClick", "handleClick"], correctIndex: 1 },
      { question: "What do you pass to an event prop?", options: ["A string", "A function", "A number"], correctIndex: 1 },
    ],
  },
  { id: "react-jsx-idea", title: "JSX: HTML-like syntax", explanation: "React uses JSX: HTML-like tags in JavaScript. You can embed expressions with { }. Components return JSX. Here we simulate with a function that returns a string that looks like a tag.", exampleCode: "function Box(props) {\n  return \"<div>\" + props.children + \"</div>\";\n}\nconsole.log(Box({ children: \"Hello\" }));", miniChallenge: "Write a function that 'returns' a string like <span>content</span>.", challengeStarterCode: "function Span(props) { return \"<span>\" + props.children + \"</span>\"; }\nconsole.log(Span({ children: \"hi\" }));", quiz: [{ question: "JSX is?", options: ["HTML only", "HTML-like syntax in JS", "A database"], correctIndex: 1 }, { question: "Expressions in JSX go in?", options: ["Quotes", "Curly braces {}", "Parentheses"], correctIndex: 1 }] },
  { id: "react-conditional-render", title: "Conditional rendering", explanation: "Show different UI based on state: use if/else or ternary. Example: { isLoggedIn ? <Greeting /> : <Login /> }. Here we simulate with a function that returns different strings.", exampleCode: "function Greeting(props) {\n  return props.isLoggedIn ? \"Welcome back!\" : \"Please log in.\";\n}\nconsole.log(Greeting({ isLoggedIn: true }));\nconsole.log(Greeting({ isLoggedIn: false }));", miniChallenge: "Return 'Loading...' if loading is true, else return 'Ready'.", challengeStarterCode: "function Status(props) {\n  return props.loading ? \"Loading...\" : \"Ready\";\n}\nconsole.log(Status({ loading: true }));", quiz: [{ question: "Conditional render shows?", options: ["Always same", "Different UI by condition", "Only one component"], correctIndex: 1 }, { question: "Ternary is?", options: ["condition ? a : b", "if only", "loop"], correctIndex: 0 }] },
  { id: "react-forms-controlled", title: "Controlled inputs", explanation: "In React, form inputs are often 'controlled': value comes from state, onChange updates state. So the component owns the value. Here we simulate with state and setState.", exampleCode: "let state = { text: \"\" };\nfunction setText(t) { state.text = t; console.log(\"Value:\", state.text); }\nsetText(\"hi\");\nsetText(\"hello\");", miniChallenge: "Keep state for an input value; write a function that updates it and logs.", challengeStarterCode: "let state = { input: \"\" };\nfunction handleChange(val) { state.input = val; console.log(state.input); }\nhandleChange(\"a\");", quiz: [{ question: "Controlled input value comes from?", options: ["DOM", "State", "Props only"], correctIndex: 1 }, { question: "Who updates the value?", options: ["Browser only", "onChange updates state", "Nobody"], correctIndex: 1 }] },
  { id: "react-useEffect-idea", title: "Side effects (useEffect idea)", explanation: "Some code runs as a 'side effect': after render (e.g. fetch data, subscribe). In React we use useEffect(fn, deps). Here we simulate: run a function after 'render'.", exampleCode: "function render() {\n  console.log(\"Render\");\n  setTimeout(() => console.log(\"Effect: fetch done\"), 0);\n}\nrender();", miniChallenge: "Simulate: after 'render', log 'Mounted'.", challengeStarterCode: "function render() {\n  console.log(\"Render\");\n  setTimeout(() => console.log(\"Mounted\"), 0);\n}\nrender();", quiz: [{ question: "useEffect runs?", options: ["Before render", "After render (side effect)", "Never"], correctIndex: 1 }, { question: "Side effects include?", options: ["Only state", "Fetch, subscribe, timers", "Only props"], correctIndex: 1 }] },
  { id: "react-props-children", title: "Props and children", explanation: "Props can be any value. children is a special prop for content between tags: <Card>Hello</Card> gives children = 'Hello'. Pass data or UI via props.", exampleCode: "function Card(props) {\n  return \"Card title: \" + props.title + \", body: \" + props.children;\n}\nconsole.log(Card({ title: \"Tip\", children: \"Click to save\" }));", miniChallenge: "Write a Layout(props) that uses props.header and props.children.", challengeStarterCode: "function Layout(props) {\n  return \"Header: \" + props.header + \" | \" + props.children;\n}\nconsole.log(Layout({ header: \"My App\", children: \"Content\" }));", quiz: [{ question: "children is?", options: ["A child component only", "Content between tags", "State"], correctIndex: 1 }, { question: "Props are?", options: ["Mutable", "Read-only inputs", "Optional only"], correctIndex: 1 }] },
  { id: "react-key-list", title: "Keys in lists", explanation: "When rendering a list, each item needs a unique key (e.g. item.id). Keys help React know which item changed. Don't use index as key if the list can reorder.", exampleCode: "const items = [{ id: 1, name: \"A\" }, { id: 2, name: \"B\" }];\nitems.forEach(it => console.log(\"key=\" + it.id, it.name));", miniChallenge: "Given [{ id: 10, label: 'X' }, { id: 20, label: 'Y' }], 'render' each with key = id.", challengeStarterCode: "const list = [{ id: 10, label: \"X\" }, { id: 20, label: \"Y\" }];\nlist.forEach(it => console.log(\"key:\", it.id, it.label));", quiz: [{ question: "Key should be?", options: ["Always index", "Unique and stable per item", "Random"], correctIndex: 1 }, { question: "Keys help React?", options: ["Style", "Track which item changed", "Sort"], correctIndex: 1 }] },
  { id: "react-lifting-state", title: "Lifting state up", explanation: "When two components need the same data, put that data in their parent and pass it down as props. The parent 'owns' the state and passes setState down so children can update it.", exampleCode: "let parentState = { count: 0 };\nfunction ChildA(s) { return \"A sees \" + s.count; }\nfunction ChildB(s) { return \"B sees \" + s.count; }\nconsole.log(ChildA(parentState), ChildB(parentState));", miniChallenge: "Have a parent state 'name'; two child functions that both receive and display name.", challengeStarterCode: "let state = { name: \"Alex\" };\nfunction Child1(s) { return \"1: \" + s.name; }\nfunction Child2(s) { return \"2: \" + s.name; }\nconsole.log(Child1(state), Child2(state));", quiz: [{ question: "Where do we put shared state?", options: ["In both components", "In the parent (lift up)", "Nowhere"], correctIndex: 1 }, { question: "Children get data via?", options: ["Global only", "Props from parent", "useEffect only"], correctIndex: 1 }] },
  { id: "react-composition", title: "Composition", explanation: "Build UIs by combining small components. Put components inside other components. Prefer composition over one huge component.", exampleCode: "function Button(props) { return \"[ \" + props.label + \" ]\"; }\nfunction Toolbar(props) { return \"Toolbar: \" + props.children; }\nconsole.log(Toolbar({ children: Button({ label: \"Save\" }) }));", miniChallenge: "Compose a Page that contains a Header and a Content string.", challengeStarterCode: "function Header() { return \"Header\"; }\nfunction Page(props) { return \"Page: \" + Header() + \" | \" + props.content; }\nconsole.log(Page({ content: \"Hello\" }));", quiz: [{ question: "Composition means?", options: ["One big component", "Combining small components", "Only state"], correctIndex: 1 }, { question: "We prefer?", options: ["One huge component", "Small reusable pieces", "No components"], correctIndex: 1 }] },
  { id: "react-default-props", title: "Default props", explanation: "You can give default values for props so the component works even when a prop is missing. In function: props.name || 'Guest'. In real React: defaultProps or default params.", exampleCode: "function Greet(props) {\n  const name = props.name || \"Guest\";\n  return \"Hello, \" + name;\n}\nconsole.log(Greet({}));\nconsole.log(Greet({ name: \"Alex\" }));", miniChallenge: "Write a Badge(props) that shows props.label or 'New'.", challengeStarterCode: "function Badge(props) {\n  const label = props.label || \"New\";\n  return label;\n}\nconsole.log(Badge({}));", quiz: [{ question: "Default props are for?", options: ["Required only", "When prop is missing", "State"], correctIndex: 1 }, { question: "props.x || 'default' means?", options: ["Always default", "Use default if x is falsy", "Error"], correctIndex: 1 }] },
  { id: "react-callback-props", title: "Callback props", explanation: "Parents can pass functions as props so children can 'communicate up'. Example: <Form onSubmit={handleSubmit} />. The child calls the prop when something happens.", exampleCode: "function Button(props) {\n  return { label: props.label, onClick: props.onClick };\n}\nfunction handleClick() { console.log(\"Clicked\"); }\nlet btn = Button({ label: \"Save\", onClick: handleClick });\nbtn.onClick();", miniChallenge: "A parent passes onSave to a child; child 'calls' onSave with a value.", challengeStarterCode: "function Child(props) {\n  props.onSave(\"data\");\n  return \"ok\";\n}\nChild({ onSave: (v) => console.log(\"Saved\", v) });", quiz: [{ question: "Callback prop is?", options: ["A string", "A function passed to child", "State"], correctIndex: 1 }, { question: "Child calls it to?", options: ["Render", "Notify parent", "Replace state"], correctIndex: 1 }] },
  { id: "react-fragments-idea", title: "Fragments", explanation: "React components must return one top-level element. Use a Fragment (<></> or <React.Fragment>) to group multiple elements without adding a DOM node. Here we simulate with an array.", exampleCode: "function Group() {\n  return [\"<p>A</p>\", \"<p>B</p>\"];\n}\nconsole.log(Group());", miniChallenge: "Return two strings (simulating two elements) from one function.", challengeStarterCode: "function Two() { return [\"First\", \"Second\"]; }\nconsole.log(Two());", quiz: [{ question: "Fragment is used to?", options: ["Add a div", "Group without extra node", "Replace state"], correctIndex: 1 }, { question: "Short fragment syntax?", options: ["<> </>", "Fragment only", "div"], correctIndex: 0 }] },
  { id: "react-inline-styles", title: "Inline styles in React", explanation: "In React, inline styles are an object: style={{ color: 'red', fontSize: 16 }}. Use camelCase (fontSize not font-size). Numbers become px for many properties.", exampleCode: "let style = { color: \"red\", fontSize: 18 };\nconsole.log(\"Style:\", style);\nfunction Box(props) { return \"div with \" + JSON.stringify(props.style); }\nconsole.log(Box({ style }));", miniChallenge: "Create a style object with backgroundColor 'blue' and padding 10.", challengeStarterCode: "let s = { backgroundColor: \"blue\", padding: 10 };\nconsole.log(s);", quiz: [{ question: "React inline style is?", options: ["A string", "An object", "A class name only"], correctIndex: 1 }, { question: "Property names are?", options: ["kebab-case", "camelCase", "PascalCase"], correctIndex: 1 }] },
  { id: "react-conditional-class", title: "Conditional class names", explanation: "Often we add classes based on state: className={isActive ? 'active' : ''} or use a helper. Multiple classes: [\"btn\", active && \"active\"].filter(Boolean).join(' ').", exampleCode: "function cn(classes) {\n  return classes.filter(Boolean).join(\" \");\n}\nconsole.log(cn([\"btn\", true && \"active\"]));\nconsole.log(cn([\"btn\", false && \"active\"]));", miniChallenge: "Build a className string: 'card' plus 'highlight' only when highlighted is true.", challengeStarterCode: "let highlighted = true;\nlet cls = \"card\" + (highlighted ? \" highlight\" : \"\");\nconsole.log(cls);", quiz: [{ question: "Conditional class is for?", options: ["Always same class", "Different styles by state", "Only one class"], correctIndex: 1 }, { question: "We often join with?", options: ["Comma", "Space", "Nothing"], correctIndex: 1 }] },
  { id: "react-refs-idea", title: "Refs idea", explanation: "Refs let you hold a reference to a DOM element or a value that persists without causing re-render. Use for focus, scroll, or storing mutable values. Here we simulate with an object.", exampleCode: "let ref = { current: null };\nref.current = { focus: () => console.log(\"Focused\") };\nref.current.focus();", miniChallenge: "Create a ref object and set ref.current to a simple object with a method.", challengeStarterCode: "let ref = { current: null };\nref.current = { value: 42 };\nconsole.log(ref.current.value);", quiz: [{ question: "Ref holds?", options: ["State", "A reference to DOM or mutable value", "Props"], correctIndex: 1 }, { question: "Changing ref.current?", options: ["Re-renders", "Does not re-render", "Deletes component"], correctIndex: 1 }] },
  { id: "react-memo-idea", title: "When to optimize (memo idea)", explanation: "Re-renders can be expensive. React.memo skips re-rendering a component if props are the same. Use after measuring; don't optimize everything. Here we just understand the idea.", exampleCode: "let renderCount = 0;\nfunction Expensive(props) {\n  renderCount++;\n  return \"Rendered \" + renderCount + \" times, value \" + props.x;\n}\nconsole.log(Expensive({ x: 1 }));\nconsole.log(Expensive({ x: 1 }));", miniChallenge: "Count how many times a function is 'called' and log it.", challengeStarterCode: "let calls = 0;\nfunction F(props) { calls++; return props.n; }\nF({ n: 1 }); F({ n: 1 });\nconsole.log(\"Calls:\", calls);", quiz: [{ question: "React.memo helps?", options: ["Always", "Skip re-render when props same", "Add state"], correctIndex: 1 }, { question: "We should optimize?", options: ["Everything", "When we measure and need it", "Never"], correctIndex: 1 }] },
  { id: "react-context-idea", title: "Context idea", explanation: "Context lets you pass data through the tree without prop drilling. One component provides a value; any descendant can read it. Use for theme, auth, locale. Here we simulate with a shared object.", exampleCode: "let theme = { color: \"blue\" };\nfunction Button() { return \"Button with \" + theme.color; }\nfunction Toolbar() { return \"Toolbar: \" + Button(); }\nconsole.log(Toolbar());", miniChallenge: "A shared user object; two components that both read user.name.", challengeStarterCode: "let user = { name: \"Alex\" };\nfunction A() { return user.name; }\nfunction B() { return user.name; }\nconsole.log(A(), B());", quiz: [{ question: "Context is for?", options: ["Replacing state", "Passing data without prop drilling", "Only refs"], correctIndex: 1 }, { question: "Provider?", options: ["Consumes", "Provides the value", "Deletes context"], correctIndex: 1 }] },
  { id: "react-hooks-rules", title: "Rules of hooks", explanation: "Only call hooks at the top level (not in loops or conditions). Only call hooks from React components or custom hooks. This keeps hook order consistent so React can match state to the right component.", exampleCode: "function useCounter() {\n  let n = 0;\n  return [n, () => n++];\n}\nlet [count, inc] = useCounter();\nconsole.log(count);", miniChallenge: "Write a simple function that returns [value, setValue] like useState.", challengeStarterCode: "function useValue(initial) {\n  return [initial, (v) => console.log(\"Set\", v)];\n}\nlet [x, setX] = useValue(0);\nconsole.log(x);", quiz: [{ question: "Hooks must be called?", options: ["In conditions", "At top level only", "In loops"], correctIndex: 1 }, { question: "Why?", options: ["Speed", "React matches by call order", "No reason"], correctIndex: 1 }] },
  { id: "react-custom-hook-idea", title: "Custom hooks", explanation: "A custom hook is a function that uses other hooks (useState, useEffect) and returns state or logic. Name it useSomething. Reuse logic across components. Here we simulate with a simple function.", exampleCode: "function useToggle(initial) {\n  let value = initial;\n  let toggle = () => { value = !value; return value; };\n  return [value, toggle];\n}\nlet [on, toggle] = useToggle(false);\nconsole.log(on);\nconsole.log(toggle());", miniChallenge: "Write useCounter(initial) that returns [count, increment].", challengeStarterCode: "function useCounter(initial) {\n  let count = initial;\n  let inc = () => ++count;\n  return [count, inc];\n}\nlet [n, inc] = useCounter(0);\nconsole.log(n, inc());", quiz: [{ question: "Custom hook name usually starts with?", options: ["get", "use", "hook"], correctIndex: 1 }, { question: "Custom hooks can use?", options: ["Only state", "Other hooks (useState, useEffect)", "Nothing"], correctIndex: 1 }] },
  { id: "react-recap", title: "React recap", explanation: "You've seen: components, props, state, lists and keys, events, JSX, conditional render, controlled inputs, useEffect idea, lifting state, composition, callbacks, refs, context, hooks rules, custom hooks. Build small components and combine them!", exampleCode: "console.log(\"Components + Props + State + Events = React UI\");", miniChallenge: "Describe in one sentence: what is a React component?", challengeStarterCode: "// A component is a function that returns UI (JSX), can have props and state", quiz: [{ question: "React builds UIs with?", options: ["Only HTML", "Components and state", "Only CSS"], correctIndex: 1 }, { question: "Data flows?", options: ["Only up", "Down via props, up via callbacks", "Only down"], correctIndex: 1 }] },
];

// —— TypeScript (run as JavaScript) ——
const TYPESCRIPT_LESSONS: AcademyLesson[] = [
  {
    id: "ts-types-simple",
    title: "Types for variables",
    explanation: "In TypeScript you add types after a colon: let name: string = 'Alex'. The editor and compiler will warn you if you use the wrong type. Here we write valid JS that would be valid TS too (types in comments).",
    exampleCode: "// TypeScript: let age: number = 10;\nlet age = 10;\n// age = \"old\";  // Error in TS!\nconsole.log(age);\nlet name = \"Sam\";\nconsole.log(name);",
    extraExamples: [
      { title: "Array type (TS: number[])", code: "let nums = [1, 2, 3];\nconsole.log(nums.length);" },
      { title: "Boolean", code: "let done = false;\ndone = true;\nconsole.log(done);" },
    ],
    miniChallenge: "Create a variable score as a number and a variable greeting as a string. Log both.",
    challengeStarterCode: "// let score: number = 100;\n// let greeting: string = \"Hi\";\nlet score = 100;\nlet greeting = \"Hi\";\n// log both",
    quiz: [
      { question: "What does TypeScript add to JavaScript?", options: ["Nothing", "Types", "Only syntax"], correctIndex: 1 },
      { question: "Why use types?", options: ["To make code longer", "To catch mistakes before running", "To run faster"], correctIndex: 1 },
    ],
  },
  {
    id: "ts-functions",
    title: "Types for functions",
    explanation: "You can type function parameters and return value: function add(a: number, b: number): number { return a + b; }. That way you can't accidentally pass a string. Here we write the same in plain JS.",
    exampleCode: "function add(a, b) {\n  return a + b;\n}\nconsole.log(add(2, 3));   // 5\n// add(\"2\", 3);  // In TS this would be an error\nfunction greet(name) {\n  return \"Hello, \" + name;\n}\nconsole.log(greet(\"Alex\"));",
    extraExamples: [
      { title: "Return type", code: "function double(n) { return n * 2; }\nconsole.log(double(5));" },
      { title: "Array in, number out", code: "function first(arr) { return arr[0]; }\nconsole.log(first([10, 20, 30]));" },
    ],
    miniChallenge: "Write a function multiply(a, b) that returns a * b. Call it with two numbers.",
    challengeStarterCode: "function multiply(a, b) {\n  return a * b;\n}\nconsole.log(multiply(4, 5));",
    quiz: [
      { question: "What can you type in a function?", options: ["Only the name", "Parameters and return value", "Only the return"], correctIndex: 1 },
      { question: "TypeScript helps catch what?", options: ["Slow code", "Wrong types passed to functions", "Spelling in strings"], correctIndex: 1 },
    ],
  },
  {
    id: "ts-interfaces",
    title: "Interfaces (object shapes)",
    explanation: "Interfaces define the shape of an object: which properties exist and their types. Use them for function parameters and return types. Here we write JS that matches an interface idea.",
    exampleCode: "// TS: interface User { name: string; age: number }\nconst user = { name: \"Alex\", age: 10 };\nfunction greet(u) {\n  return \"Hi, \" + u.name;\n}\nconsole.log(greet(user));",
    extraExamples: [
      { title: "Optional property", code: "const p = { name: \"Sam\", score: 100 };\nconsole.log(p.name, p.score);\n// TS: score?: number\n" },
      { title: "Nested object", code: "const data = { user: { name: \"Alex\" }, id: 1 };\nconsole.log(data.user.name);" },
    ],
    miniChallenge: "Create an object that has title (string) and count (number). Log both.",
    challengeStarterCode: "// interface Item { title: string; count: number }\nconst item = { title: \"Apples\", count: 5 };\n// log item.title and item.count\n",
    quiz: [
      { question: "What does an interface describe?", options: ["A function", "The shape of an object", "A loop"], correctIndex: 1 },
      { question: "Why use interfaces?", options: ["To run faster", "To document and check object shapes", "To create instances"], correctIndex: 1 },
    ],
  },
  {
    id: "ts-unions",
    title: "Union types and narrowing",
    explanation: "A union type is A | B: the value can be A or B. You then narrow (check) which one it is with typeof or checks, so TypeScript knows the type in each branch.",
    exampleCode: "// TS: function show(x: string | number) { ... }\nfunction show(x) {\n  if (typeof x === \"string\") console.log(\"String:\", x);\n  else console.log(\"Number:\", x);\n}\nshow(\"hi\");\nshow(42);",
    extraExamples: [
      { title: "Union in variable", code: "let value = \"hello\";\nconsole.log(typeof value);\nvalue = 10;\nconsole.log(typeof value);" },
      { title: "Array of mixed", code: "const arr = [1, \"two\", 3];\narr.forEach((a) => console.log(typeof a, a));" },
    ],
    miniChallenge: "Write a function that takes a string or number; if string log its length, if number log double.",
    challengeStarterCode: "function handle(val) {\n  if (typeof val === \"string\") console.log(val.length);\n  else console.log(val * 2);\n}\nhandle(\"hi\");\nhandle(5);",
    quiz: [
      { question: "What does string | number mean?", options: ["Both at once", "Either string or number", "Neither"], correctIndex: 1 },
      { question: "Why narrow a union?", options: ["To slow down", "So TS knows the type in each branch", "To delete the value"], correctIndex: 1 },
    ],
  },
  { id: "ts-arrays-tuples", title: "Array and tuple types", explanation: "Type arrays: number[] or Array<number>. Tuples fix length and types: [string, number]. Use for fixed-shape data like [name, age].", exampleCode: "let nums = [1, 2, 3];\nlet pair = [\"Alex\", 10];\nconsole.log(nums.length, pair[0], pair[1]);", miniChallenge: "Create a tuple-like array [title, count] and log both elements.", challengeStarterCode: "let item = [\"Apples\", 5];\nconsole.log(item[0], item[1]);", quiz: [{ question: "number[] means?", options: ["One number", "Array of numbers", "Tuple"], correctIndex: 1 }, { question: "Tuple [string, number] has?", options: ["Any length", "Exactly 2 elements, string then number", "No order"], correctIndex: 1 }] },
  { id: "ts-type-assertions", title: "Type assertions", explanation: "When you know more than TypeScript: value as Type or <Type>value. Use sparingly; it doesn't change runtime. Good for DOM or after checks.", exampleCode: "let input = document.querySelector(\"input\");\nlet val = (input && input.value) || \"\";\nconsole.log(val);\nlet x = \"5\";\nlet n = parseInt(x);\nconsole.log(n);", miniChallenge: "Parse a string to number and use it in a calculation.", challengeStarterCode: "let s = \"42\";\nlet n = parseInt(s, 10);\nconsole.log(n + 1);", quiz: [{ question: "as Type is?", options: ["Runtime conversion", "Tell compiler the type", "A function"], correctIndex: 1 }, { question: "Assertion changes runtime?", options: ["Yes", "No", "Sometimes"], correctIndex: 1 }] },
  { id: "ts-literals", title: "Literal types", explanation: "A literal type is an exact value: 'red' | 'blue' or 1 | 2. Combined with unions they restrict to specific strings or numbers. Good for options.", exampleCode: "function setColor(c) {\n  console.log(c);\n}\nsetColor(\"red\");\nsetColor(\"blue\");\n// TS: c: 'red' | 'blue'", miniChallenge: "Write a function that accepts only 'small' or 'large' and logs it.", challengeStarterCode: "function size(s) {\n  if (s === \"small\" || s === \"large\") console.log(s);\n}\nsize(\"small\");", quiz: [{ question: "Literal type 'on' | 'off' means?", options: ["Any string", "Only 'on' or 'off'", "Boolean"], correctIndex: 1 }, { question: "Used for?", options: ["Any value", "Fixed set of options", "Numbers only"], correctIndex: 1 }] },
  { id: "ts-optional-properties", title: "Optional and readonly", explanation: "Optional property: name?: string (may be undefined). readonly: property can't be reassigned. Both make object shapes clearer.", exampleCode: "let user = { name: \"Alex\", age: 10 };\nfunction greet(u) {\n  return \"Hi, \" + (u.name || \"Guest\");\n}\nconsole.log(greet(user));\nconsole.log(greet({}));", miniChallenge: "Create an object with optional score; if present log it, else log 'no score'.", challengeStarterCode: "let p = { name: \"Sam\", score: 80 };\nconsole.log(p.score !== undefined ? p.score : \"no score\");", quiz: [{ question: "name?: string means?", options: ["Required", "Optional (may be undefined)", "Always string"], correctIndex: 1 }, { question: "readonly means?", options: ["Can't reassign", "Can't read", "Optional"], correctIndex: 0 }] },
  { id: "ts-type-aliases", title: "Type aliases", explanation: "type Name = ... gives a name to a type. Reuse for objects, unions, etc. type User = { name: string; id: number }; then use User in params.", exampleCode: "const user = { id: 1, name: \"Alex\" };\nfunction getName(u) { return u.name; }\nconsole.log(getName(user));", miniChallenge: "Define (in comment) type Point = { x: number; y: number } and use it for a variable.", challengeStarterCode: "// type Point = { x: number; y: number }\nlet p = { x: 0, y: 0 };\nconsole.log(p.x, p.y);", quiz: [{ question: "type Alias = ... is?", options: ["A variable", "A name for a type", "A value"], correctIndex: 1 }, { question: "We use aliases to?", options: ["Run faster", "Reuse and clarify types", "Create instances"], correctIndex: 1 }] },
  { id: "ts-generics-basics", title: "Generics basics", explanation: "Generics let you write types that work with any type: function first<T>(arr: T[]): T. T is a type parameter. Call with first<number>(nums) or let TS infer.", exampleCode: "function first(arr) { return arr[0]; }\nconsole.log(first([1, 2, 3]));\nconsole.log(first([\"a\", \"b\"]));", miniChallenge: "Write a function wrap(x) that returns [x]. Call with number and string.", challengeStarterCode: "function wrap(x) { return [x]; }\nconsole.log(wrap(5));\nconsole.log(wrap(\"hi\"));", quiz: [{ question: "Generic T stands for?", options: ["A value", "A type to be filled in", "Array only"], correctIndex: 1 }, { question: "first<T>(arr: T[]): T returns?", options: ["Always number", "Element type T", "Array"], correctIndex: 1 }] },
  { id: "ts-enums", title: "Enums", explanation: "Enum gives names to a set of values. enum Color { Red, Green } or enum Status { Done = 'done', Pending = 'pending' }. Use for fixed sets of options.", exampleCode: "const Status = { Done: \"done\", Pending: \"pending\" };\nlet s = Status.Done;\nconsole.log(s);\nif (s === Status.Done) console.log(\"Finished\");", miniChallenge: "Create a small 'enum' object with two states and use one.", challengeStarterCode: "const State = { Idle: \"idle\", Loading: \"loading\" };\nlet st = State.Loading;\nconsole.log(st);", quiz: [{ question: "Enum is for?", options: ["Any value", "Fixed set of named values", "Only numbers"], correctIndex: 1 }, { question: "String enum uses?", options: ["Only numbers", "Explicit string values", "No values"], correctIndex: 1 }] },
  { id: "ts-null-undefined", title: "null and undefined", explanation: "In TypeScript, null and undefined are types. Strict mode distinguishes them. Use optional chaining (?. ) and nullish coalescing (??) to handle missing values.", exampleCode: "let a = null;\nlet b = undefined;\nlet obj = { name: \"Alex\" };\nconsole.log(obj.name);\nconsole.log(obj.age ?? \"unknown\");", miniChallenge: "Use ?? to provide a default when a variable might be null or undefined.", challengeStarterCode: "let x = null;\nlet y = x ?? 0;\nconsole.log(y);", quiz: [{ question: "?? returns right side when?", options: ["Always", "When left is null/undefined", "When left is 0"], correctIndex: 1 }, { question: "?. does?", options: ["Calls function", "Short-circuits if null/undefined", "Throws"], correctIndex: 1 }] },
  { id: "ts-return-type-void", title: "Return types and void", explanation: "Functions can declare return type: function f(): number { }. void means no return value (or undefined). Omit return type and let TS infer if obvious.", exampleCode: "function add(a, b) { return a + b; }\nfunction log(msg) { console.log(msg); }\nconsole.log(add(1, 2));\nlog(\"hi\");", miniChallenge: "Write a function that returns a boolean and one that returns nothing (void).", challengeStarterCode: "function isEven(n) { return n % 2 === 0; }\nfunction say() { console.log(\"done\"); }\nconsole.log(isEven(4));\nsay();", quiz: [{ question: "void means?", options: ["Returns value", "No meaningful return", "Error"], correctIndex: 1 }, { question: "We can omit return type when?", options: ["Never", "TS can infer", "Only for void"], correctIndex: 1 }] },
  { id: "ts-index-signatures", title: "Index signatures", explanation: "When an object can have many keys of the same type: { [key: string]: number }. Useful for dictionaries. Keys are strings (or numbers); values have one type.", exampleCode: "let counts = {};\ncounts[\"a\"] = 1;\ncounts[\"b\"] = 2;\nconsole.log(counts[\"a\"]);\nconsole.log(counts[\"c\"] ?? 0);", miniChallenge: "Build an object that maps string keys to number values; add two entries and read one.", challengeStarterCode: "let map = {};\nmap[\"x\"] = 10;\nmap[\"y\"] = 20;\nconsole.log(map[\"x\"]);", quiz: [{ question: "[key: string]: number means?", options: ["One key", "Any string key, number value", "Only numbers"], correctIndex: 1 }, { question: "Use case?", options: ["Single object", "Dictionary/map", "Array"], correctIndex: 1 }] },
  { id: "ts-utility-partial", title: "Utility types: Partial, Pick", explanation: "Partial<T> makes all properties optional. Pick<T, K> keeps only selected keys. They help reuse types when you need a variation. Here we simulate with plain objects.", exampleCode: "let full = { name: \"Alex\", age: 10 };\nlet partial = { name: \"Alex\" };\nconsole.log(partial.name);\nlet picked = { name: full.name };\nconsole.log(picked.name);", miniChallenge: "Create an object with only 'title' from { title, body, id }.", challengeStarterCode: "let post = { title: \"Hi\", body: \"...\", id: 1 };\nlet short = { title: post.title };\nconsole.log(short.title);", quiz: [{ question: "Partial<T> does?", options: ["Requires all", "Makes all optional", "Removes all"], correctIndex: 1 }, { question: "Pick<T, K> does?", options: ["Adds keys", "Keeps only K keys from T", "Deletes T"], correctIndex: 1 }] },
  { id: "ts-narrowing-typeof", title: "Narrowing with typeof and in", explanation: "typeof x === 'string' narrows to string. 'key' in obj narrows to objects that have that key. TypeScript uses these to narrow union types.", exampleCode: "function f(x) {\n  if (typeof x === \"string\") return x.length;\n  if (typeof x === \"number\") return x * 2;\n  return 0;\n}\nconsole.log(f(\"hi\"), f(5));", miniChallenge: "Use typeof to handle string and number in one function; return different results.", challengeStarterCode: "function handle(x) {\n  if (typeof x === \"string\") return \"str: \" + x;\n  return \"num: \" + x;\n}\nconsole.log(handle(\"a\"), handle(1));", quiz: [{ question: "typeof x === 'string' narrows?", options: ["To number", "To string in that branch", "To any"], correctIndex: 1 }, { question: "'x' in obj checks?", options: ["Value", "Property exists", "Type only"], correctIndex: 1 }] },
  { id: "ts-never", title: "never type", explanation: "never is the type when something never happens: unreachable code, or a function that always throws. Exhaustive checks in switch use it: default: const _: never = x.", exampleCode: "function fail(msg) {\n  throw new Error(msg);\n}\nfunction assert(cond) {\n  if (!cond) fail(\"Assert failed\");\n}\nassert(2 + 2 === 4);\nconsole.log(\"ok\");", miniChallenge: "Write a function that throws an error and never returns.", challengeStarterCode: "function neverReturn() {\n  throw new Error(\"Oops\");\n}\n// neverReturn();", quiz: [{ question: "never means?", options: ["Any type", "No value (unreachable)", "Null"], correctIndex: 1 }, { question: "Used for?", options: ["All functions", "Exhaustive checks, throw", "Optional"], correctIndex: 1 }] },
  { id: "ts-strict-mode", title: "Strict mode", explanation: "TypeScript strict mode (strict: true) enables stricter checks: no implicit any, strict null checks, etc. It catches more bugs. Enable it for new projects.", exampleCode: "let x = 5;\nx = 6;\nlet s = \"hello\";\n// s = 10;  // would be error in strict\nconsole.log(x, s);", miniChallenge: "Write code that would fail in strict mode if you used wrong type (comment the bad line).", challengeStarterCode: "let n = 10;\n// n = \"ten\";  // error in TS strict\nconsole.log(n);", quiz: [{ question: "Strict mode does?", options: ["Runs faster", "Stricter type checking", "Disables types"], correctIndex: 1 }, { question: "implicit any?", options: ["Allowed in strict", "Often disallowed in strict", "Required"], correctIndex: 1 }] },
  { id: "ts-react-types", title: "TypeScript with React", explanation: "React components can be typed: React.FC<Props> or function Comp(props: Props). Children: React.ReactNode. Events: React.ChangeEvent<HTMLInputElement>. State: useState<Type>(init).", exampleCode: "function Greet(props) {\n  return \"Hello, \" + props.name;\n}\nconsole.log(Greet({ name: \"Alex\" }));", miniChallenge: "Write a function that accepts props with title: string and returns a string.", challengeStarterCode: "function Card(props) {\n  return props.title;\n}\nconsole.log(Card({ title: \"Hi\" }));", quiz: [{ question: "React props are often?", options: ["Untyped", "An interface or type", "Always any"], correctIndex: 1 }, { question: "useState<number>(0) means?", options: ["Any state", "State is number", "State is 0 only"], correctIndex: 1 }] },
  { id: "ts-config", title: "tsconfig.json basics", explanation: "tsconfig.json configures the compiler: target (ES version), module, strict, include/exclude. Set strict: true and noImplicitAny: true to catch more bugs.", exampleCode: "// In tsconfig: strict: true, target: ES2020\nconsole.log(\"TS compiles to JS\");", miniChallenge: "List (in comment) three options you'd set in tsconfig for a new project.", challengeStarterCode: "// strict: true, target: ES2020, module: ESNext", quiz: [{ question: "tsconfig is for?", options: ["Runtime", "TypeScript compiler options", "Tests only"], correctIndex: 1 }, { question: "strict: true enables?", options: ["Fewer checks", "Stricter type checks", "No types"], correctIndex: 1 }] },
  { id: "ts-recap", title: "TypeScript recap", explanation: "You've seen: variable types, function types, interfaces, unions, narrowing, arrays/tuples, literals, optional/readonly, type aliases, generics, enums, null/undefined, utility types, never, strict mode, React types. TypeScript helps catch bugs and document code.", exampleCode: "console.log(\"Types = documentation + fewer bugs\");", miniChallenge: "Name one benefit of using TypeScript over plain JavaScript.", challengeStarterCode: "// Catch errors early, better editor support, clearer APIs", quiz: [{ question: "TypeScript compiles to?", options: ["Python", "JavaScript", "HTML"], correctIndex: 1 }, { question: "Main benefit?", options: ["Faster run", "Type safety and tooling", "Smaller files"], correctIndex: 1 }] },
];

// —— AI (run as Python; simple concepts) ——
const AI_LESSONS: AcademyLesson[] = [
  {
    id: "ai-data-and-patterns",
    title: "Data and simple patterns",
    explanation: "AI often starts with data: numbers, lists, categories. A simple 'pattern' might be: the average of a list, or the most common item. Here we work with a list of numbers and find the average—like a tiny step toward what ML does with lots of data.",
    exampleCode: "scores = [80, 90, 70, 85, 95]\ntotal = sum(scores)\naverage = total / len(scores)\nprint(\"Average:\", average)\nprint(\"Highest:\", max(scores))",
    extraExamples: [
      { title: "Count occurrences", code: "data = [\"cat\", \"dog\", \"cat\", \"cat\"]\nprint(data.count(\"cat\"))\nprint(\"Most data is cat\" if data.count(\"cat\") > len(data)/2 else \"Mixed\")" },
      { title: "Simple rule", code: "def is_high(score):\n    return score >= 80\nprint(is_high(85))\nprint(is_high(70))" },
    ],
    miniChallenge: "Given a list of temperatures, print the minimum and the maximum.",
    challengeStarterCode: "temps = [20, 22, 19, 25, 21]\n# print min and max",
    quiz: [
      { question: "What do we need before we can find patterns?", options: ["Nothing", "Data", "Only code"], correctIndex: 1 },
      { question: "What does average tell you?", options: ["The biggest value", "A typical value in the middle", "The number of items"], correctIndex: 1 },
    ],
  },
  {
    id: "ai-simple-prediction",
    title: "Simple prediction rule",
    explanation: "A very simple 'model' is a rule we write by hand. For example: if score >= 80 then predict 'pass'. Machine learning later learns such rules from data. Here we write a small rule and use it on a few examples.",
    exampleCode: "def predict_pass(score):\n    return \"pass\" if score >= 60 else \"fail\"\nprint(predict_pass(70))  # pass\nprint(predict_pass(50))  # fail\nscores = [65, 45, 80]\nfor s in scores:\n    print(s, \"->\", predict_pass(s))",
    extraExamples: [
      { title: "Category by range", code: "def category(age):\n    if age < 13: return \"kid\"\n    if age < 20: return \"teen\"\n    return \"adult\"\nprint(category(10))\nprint(category(15))" },
      { title: "Multiple rules", code: "def mood(weather):\n    if weather == \"sunny\": return \"happy\"\n    if weather == \"rainy\": return \"cosy\"\n    return \"ok\"\nprint(mood(\"sunny\"))" },
    ],
    miniChallenge: "Write a rule: if temperature > 25 print 'Hot', else print 'Cool'. Try with 20 and 30.",
    challengeStarterCode: "def hot_or_cool(temp):\n    # return \"Hot\" or \"Cool\"\n    pass\nprint(hot_or_cool(20))\nprint(hot_or_cool(30))",
    quiz: [
      { question: "What is a simple prediction rule?", options: ["A random guess", "A rule we write (e.g. if score >= 60 then pass)", "A loop"], correctIndex: 1 },
      { question: "What does ML learn from data?", options: ["Nothing", "Rules or patterns we don't write by hand", "Only numbers"], correctIndex: 1 },
    ],
  },
  {
    id: "ai-loops-and-data",
    title: "Loops over data",
    explanation: "AI programs often loop over lots of data: for item in data: ... We might count, sum, or check a condition. Here we loop over a list and collect a result—like building a simple 'dataset' of answers.",
    exampleCode: "answers = [\"yes\", \"no\", \"yes\", \"yes\"]\nyes_count = 0\nfor a in answers:\n    if a == \"yes\":\n        yes_count += 1\nprint(\"Yes count:\", yes_count)\nprint(\"Total:\", len(answers))",
    extraExamples: [
      { title: "Sum with loop", code: "prices = [10, 20, 15]\ntotal = 0\nfor p in prices:\n    total += p\nprint(\"Total price:\", total)" },
      { title: "Find first match", code: "names = [\"Alex\", \"Sam\", \"Jordan\"]\nfor i, n in enumerate(names):\n    if n == \"Sam\":\n        print(\"Found at index\", i)\n        break" },
    ],
    miniChallenge: "Given a list of numbers, count how many are greater than 10.",
    challengeStarterCode: "nums = [5, 15, 8, 20, 12]\ncount = 0\n# loop and count if n > 10\nprint(\"Count > 10:\", count)",
    quiz: [
      { question: "Why do we loop over data?", options: ["To slow down the program", "To process each item", "To delete it"], correctIndex: 1 },
      { question: "What can we do in a loop?", options: ["Only print", "Count, sum, check conditions", "Only one thing"], correctIndex: 1 },
    ],
  },
  { id: "ai-mean-median", title: "Mean and median", explanation: "Mean is the average (sum / count). Median is the middle value when sorted. Both summarize a list of numbers. AI often uses these to understand data.", exampleCode: "data = [3, 1, 4, 1, 5]\nmean = sum(data) / len(data)\nsorted_data = sorted(data)\nmedian = sorted_data[len(sorted_data) // 2]\nprint(\"Mean:\", mean, \"Median:\", median)", miniChallenge: "Compute the mean of [10, 20, 30, 40, 50].", challengeStarterCode: "nums = [10, 20, 30, 40, 50]\n# mean = ...\n", quiz: [{ question: "Mean is?", options: ["Middle value", "Sum divided by count", "Largest value"], correctIndex: 1 }, { question: "Median is?", options: ["Average", "Middle when sorted", "Sum"], correctIndex: 1 }] },
  { id: "ai-count-categories", title: "Counting by category", explanation: "Group data by category and count. Example: count how many fruits are 'apple', 'banana', etc. This is like building a simple histogram—useful before training a classifier.", exampleCode: "fruits = [\"apple\", \"banana\", \"apple\", \"apple\", \"banana\"]\ncounts = {}\nfor f in fruits:\n    counts[f] = counts.get(f, 0) + 1\nprint(counts)", miniChallenge: "Given a list of colours, count how many of each colour.", challengeStarterCode: "colours = [\"red\", \"blue\", \"red\", \"green\", \"blue\", \"red\"]\n# counts = ...\n", quiz: [{ question: "Why count by category?", options: ["To slow down", "To see distribution of data", "To delete data"], correctIndex: 1 }, { question: "get(key, 0) returns?", options: ["Key", "Value or 0 if missing", "Always 0"], correctIndex: 1 }] },
  { id: "ai-simple-threshold", title: "Thresholds and rules", explanation: "Many simple AI rules use a threshold: if score > 70 then 'pass'. You can combine several rules. This is the idea behind decision rules and decision trees.", exampleCode: "def classify(score):\n    if score >= 90: return \"A\"\n    if score >= 80: return \"B\"\n    if score >= 70: return \"C\"\n    return \"F\"\nfor s in [85, 72, 95]:\n    print(s, \"->\", classify(s))", miniChallenge: "Write a rule: if temp < 0 return 'freezing', 0-15 'cold', 15-25 'mild', else 'hot'.", challengeStarterCode: "def temp_label(temp):\n    pass\nprint(temp_label(10))\nprint(temp_label(30))", quiz: [{ question: "A threshold is?", options: ["A loop", "A cutoff value for a decision", "A variable"], correctIndex: 1 }, { question: "Decision trees use?", options: ["Only one rule", "Many rules in sequence", "No rules"], correctIndex: 1 }] },
  { id: "ai-lists-of-dicts", title: "Lists of records", explanation: "Data for AI often comes as a list of records (dicts): each item has the same keys (e.g. age, score, result). You can loop and filter or aggregate by key.", exampleCode: "students = [{\"name\": \"Alex\", \"score\": 85}, {\"name\": \"Sam\", \"score\": 92}]\nfor s in students:\n    print(s[\"name\"], s[\"score\"])\npassed = [s for s in students if s[\"score\"] >= 80]\nprint(\"Passed:\", passed)", miniChallenge: "Given a list of people with 'age', count how many are 18 or over.", challengeStarterCode: "people = [{\"name\": \"A\", \"age\": 20}, {\"name\": \"B\", \"age\": 15}]\n# count 18+\n", quiz: [{ question: "A list of dicts is like?", options: ["A single value", "A table with rows", "A string"], correctIndex: 1 }, { question: "We filter with?", options: ["print", "if or list comprehension", "input"], correctIndex: 1 }] },
  { id: "ai-min-max-normalize", title: "Min, max, and simple scaling", explanation: "Sometimes we scale numbers to a range (e.g. 0–1). One way: (x - min) / (max - min). This can help when comparing different features in data.", exampleCode: "scores = [10, 20, 30, 40, 50]\nlo, hi = min(scores), max(scores)\nfor s in scores:\n    scaled = (s - lo) / (hi - lo) if hi > lo else 0\n    print(s, \"->\", round(scaled, 2))", miniChallenge: "Scale the list [5, 10, 15, 20] to 0–1 range.", challengeStarterCode: "nums = [5, 10, 15, 20]\n# scaled = (x - min) / (max - min)\n", quiz: [{ question: "Scaling to 0-1 helps?", options: ["To delete data", "To compare different-sized numbers", "To slow down"], correctIndex: 1 }, { question: "Formula (x-min)/(max-min) gives?", options: ["Always 1", "Value between 0 and 1", "Negative"], correctIndex: 1 }] },
  { id: "ai-majority-vote", title: "Majority vote", explanation: "A simple way to 'combine' several answers is majority vote: count each label and pick the one that appears most. Used in simple ensemble ideas.", exampleCode: "votes = [\"yes\", \"no\", \"yes\", \"yes\", \"no\"]\nfrom collections import Counter\nc = Counter(votes)\nwinner = c.most_common(1)[0][0]\nprint(\"Winner:\", winner)", miniChallenge: "Given a list of votes (A, B, A, B, A), print the winner.", challengeStarterCode: "votes = [\"A\", \"B\", \"A\", \"B\", \"A\"]\n# count and find most common\n", quiz: [{ question: "Majority vote picks?", options: ["First vote", "The option that appears most", "Random"], correctIndex: 1 }, { question: "Counter does?", options: ["Slows down", "Counts occurrences", "Deletes duplicates"], correctIndex: 1 }] },
  { id: "ai-distance-idea", title: "Distance between points", explanation: "In 2D, the distance between (x1,y1) and (x2,y2) is sqrt((x2-x1)**2 + (y2-y1)**2). Similar points have small distance. This idea is used in nearest-neighbour and clustering.", exampleCode: "import math\ndef dist(a, b):\n    return math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2)\np1, p2 = (0, 0), (3, 4)\nprint(\"Distance:\", dist(p1, p2))", miniChallenge: "Compute distance between (1, 0) and (4, 3).", challengeStarterCode: "import math\n# dist = sqrt((x2-x1)**2 + (y2-y1)**2)\n", quiz: [{ question: "Small distance means?", options: ["Far apart", "Similar or close", "Unrelated"], correctIndex: 1 }, { question: "Nearest-neighbour uses?", options: ["Only sum", "Distance to find closest", "Random choice"], correctIndex: 1 }] },
  { id: "ai-train-test-idea", title: "Train vs test idea", explanation: "In ML we often split data: use part to 'train' (learn) and part to 'test' (check how well it works on new data). Here we simulate: take 80% of a list as train, 20% as test.", exampleCode: "data = list(range(20))\nimport random\nrandom.shuffle(data)\nsplit = int(0.8 * len(data))\ntrain, test = data[:split], data[split:]\nprint(\"Train size:\", len(train), \"Test size:\", len(test))", miniChallenge: "Split a list of 10 items into 70% train and 30% test.", challengeStarterCode: "items = list(range(10))\n# train = items[:?], test = items[?:]\n", quiz: [{ question: "Why split data?", options: ["To delete some", "To test on unseen data", "To slow down"], correctIndex: 1 }, { question: "Test set is for?", options: ["Training", "Evaluating the model", "Deleting"], correctIndex: 1 }] },
  { id: "ai-features", title: "What are features?", explanation: "Features are the inputs we use to make a prediction (e.g. age, score, colour). We often store them as numbers or categories. Good features help the model; bad ones don't.", exampleCode: "person = {\"age\": 12, \"score\": 85, \"passed\": True}\nfeatures = [person[\"age\"], person[\"score\"]]\nprint(\"Features:\", features)\n# A model would use these to predict passed", miniChallenge: "From a dict with 'height' and 'weight', make a list of features.", challengeStarterCode: "d = {\"height\": 160, \"weight\": 50}\n# features = ...\n", quiz: [{ question: "Features are?", options: ["Outputs only", "Inputs we use for prediction", "Random numbers"], correctIndex: 1 }, { question: "We often convert categories to?", options: ["Strings only", "Numbers or codes", "Nothing"], correctIndex: 1 }] },
  { id: "ai-bias-variance-idea", title: "Simple vs complex rules", explanation: "A very simple rule (e.g. always predict 'yes') might miss patterns (bias). A very complex rule might fit noise (variance). In practice we try to find a balance.", exampleCode: "def simple_rule(score):\n    return \"pass\" if score > 50 else \"fail\"\ndef complex_rule(score):\n    if score > 95: return \"A+\"\n    if score > 90: return \"A\"\n    if score > 80: return \"B\"\n    return \"C\"\nprint(simple_rule(60), complex_rule(92))", miniChallenge: "Write a simple rule and a slightly more detailed rule for the same input.", challengeStarterCode: "def simple(x): return x > 10\n# def detailed(x): ...\n", quiz: [{ question: "Too simple a model can?", options: ["Overfit", "Underfit / miss patterns", "Nothing"], correctIndex: 1 }, { question: "Too complex can?", options: ["Underfit", "Overfit to noise", "Always be best"], correctIndex: 1 }] },
  { id: "ai-accuracy-idea", title: "Accuracy", explanation: "Accuracy = correct predictions / total predictions. After we have predictions and true answers, we count how many match and divide by total. It's the simplest metric for classification.", exampleCode: "true = [1, 0, 1, 1, 0]\npred = [1, 0, 0, 1, 0]\ncorrect = sum(1 for t, p in zip(true, pred) if t == p)\nacc = correct / len(true)\nprint(\"Accuracy:\", acc)", miniChallenge: "Compute accuracy for true=[1,1,0] and pred=[1,0,0].", challengeStarterCode: "true = [1, 1, 0]\npred = [1, 0, 0]\n# correct = ..., acc = ...\n", quiz: [{ question: "Accuracy is?", options: ["Speed", "Correct / total", "Number of rules"], correctIndex: 1 }, { question: "100% accuracy means?", options: ["All wrong", "All correct", "Half correct"], correctIndex: 1 }] },
  { id: "ai-llm-prompt-idea", title: "Prompts and LLMs", explanation: "LLMs take text (a prompt) and generate more text. The prompt tells the model what to do. In code we might call an API with a prompt. Here we simulate: a function that 'responds' based on keywords.", exampleCode: "def simple_bot(prompt):\n    p = prompt.lower()\n    if \"hello\" in p: return \"Hi there!\"\n    if \"name\" in p: return \"I am a bot.\"\n    return \"I'm not sure.\"\nprint(simple_bot(\"Hello!\"))\nprint(simple_bot(\"What is your name?\"))", miniChallenge: "Write a function that returns different replies for 'hi', 'bye', and 'help'.", challengeStarterCode: "def reply(msg):\n    pass\nprint(reply(\"hi\"))", quiz: [{ question: "A prompt is?", options: ["Output", "Input text to the model", "A bug"], correctIndex: 1 }, { question: "LLMs generate?", options: ["Only numbers", "Text (and sometimes code)", "Only images"], correctIndex: 1 }] },
  { id: "ai-ethics-fairness", title: "Fairness and ethics", explanation: "AI can reflect biases in data. If training data is unfair, the model might be unfair too. We should think about who is affected and whether the system is fair. Checking data and results helps.", exampleCode: "scores_by_group = {\"A\": [80, 85, 90], \"B\": [70, 75, 80]}\nfor group, vals in scores_by_group.items():\n    avg = sum(vals) / len(vals)\n    print(group, \"average:\", avg)", miniChallenge: "Compute the average score for two groups and compare.", challengeStarterCode: "group1 = [70, 80, 90]\ngroup2 = [60, 70, 80]\n# avg1, avg2, compare\n", quiz: [{ question: "Bias in data can lead to?", options: ["Faster code", "Unfair AI", "Smaller models"], correctIndex: 1 }, { question: "We should check?", options: ["Only speed", "Who is affected and fairness", "Only accuracy"], correctIndex: 1 }] },
  { id: "ai-pipeline-idea", title: "Data pipeline idea", explanation: "Real AI often has a pipeline: load data → clean (fix missing, errors) → transform (features) → train → evaluate. Here we do a tiny pipeline: load a list, filter, then compute a stat.", exampleCode: "raw = [1, 2, None, 4, 5, -1, 6]\ncleaned = [x for x in raw if x is not None and x > 0]\navg = sum(cleaned) / len(cleaned)\nprint(\"Cleaned:\", cleaned, \"Avg:\", avg)", miniChallenge: "Given a list with some negative numbers, filter them out and compute the sum.", challengeStarterCode: "data = [3, -1, 5, -2, 4]\n# cleaned = ..., total = ...\n", quiz: [{ question: "Cleaning data means?", options: ["Deleting all", "Fixing missing or bad values", "Making it longer"], correctIndex: 1 }, { question: "A pipeline is?", options: ["One step", "A sequence of steps", "Random steps"], correctIndex: 1 }] },
  { id: "ai-strings-tokens", title: "Text as tokens", explanation: "LLMs see text as tokens (pieces: words or subwords). Longer text = more tokens. We can simulate by splitting a string into words and counting.", exampleCode: "text = \"Hello world from AI\"\ntokens = text.split()\nprint(\"Tokens:\", tokens)\nprint(\"Count:\", len(tokens))", miniChallenge: "Split a sentence into words and print the number of words.", challengeStarterCode: "s = \"The quick brown fox\"\n# words = s.split(), count = ...\n", quiz: [{ question: "Tokens are?", options: ["Only numbers", "Pieces of text (e.g. words)", "Random"], correctIndex: 1 }, { question: "More text usually means?", options: ["Fewer tokens", "More tokens", "Same tokens"], correctIndex: 1 }] },
  { id: "ai-embedding-idea", title: "Embeddings idea", explanation: "An embedding turns text (or other data) into a list of numbers so that similar things have similar numbers. We don't build one here—we just understand: same idea as 'encode as a vector' for comparison.", exampleCode: "def simple_encode(word):\n    return [ord(c) for c in word[:5]]  # first 5 char codes\nprint(simple_encode(\"hello\"))\nprint(simple_encode(\"hi\"))", miniChallenge: "Encode a word as a list of character codes (ord) and print it.", challengeStarterCode: "word = \"cat\"\n# codes = [ord(c) for c in word]\n", quiz: [{ question: "Embeddings turn data into?", options: ["Strings", "Numbers (vectors)", "Random text"], correctIndex: 1 }, { question: "Similar items should have?", options: ["Very different vectors", "Similar vectors", "No vectors"], correctIndex: 1 }] },
  { id: "ai-recap", title: "AI concepts recap", explanation: "You've seen: data and patterns, simple rules, loops over data, mean/median, counting by category, thresholds, train/test split, features, accuracy, prompts, fairness, pipelines, tokens, embeddings. These are building blocks for real ML and LLMs.", exampleCode: "print(\"Key ideas: data, features, rules, train/test, accuracy, prompts\")\nprint(\"Next: try real tools like scikit-learn or LLM APIs!\")", miniChallenge: "Write one small script that loads a list, computes mean, and prints it.", challengeStarterCode: "data = [10, 20, 30]\n# mean = sum(data)/len(data)\n# print(mean)", quiz: [{ question: "ML needs?", options: ["Only code", "Data and code", "Only data"], correctIndex: 1 }, { question: "We evaluate with?", options: ["Only training data", "Test data / accuracy", "Random guess"], correctIndex: 1 }] },
];

export const ACADEMY_LESSONS: Record<AcademyTrack, AcademyLesson[]> = {
  python: PYTHON_LESSONS,
  javascript: JAVASCRIPT_LESSONS,
  html: HTML_LESSONS,
  react: REACT_LESSONS,
  typescript: TYPESCRIPT_LESSONS,
  ai: AI_LESSONS,
};

export const ACADEMY_LESSON_IDS = PYTHON_LESSONS.map((l) => l.id);

export function getLesson(track: AcademyTrack, lessonId: string): AcademyLesson | undefined {
  return ACADEMY_LESSONS[track]?.find((l) => l.id === lessonId);
}
