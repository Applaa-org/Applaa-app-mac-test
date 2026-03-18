/**
 * Offline AI Tutor – static coding knowledge base.
 * No LLM calls; answers are chosen by keyword matching so the tutor works fully offline.
 */

export interface KnowledgeEntry {
  keywords: string[];
  answer: string;
}

/** Answers that can include the user's code in the response */
export const TUTOR_KNOWLEDGE: KnowledgeEntry[] = [
  {
    keywords: ["why", "not working", "error", "broken", "wrong", "fix", "bug", "doesn't work"],
    answer: "Here’s how to track down why code isn’t working:\n\n1. **Read the error message** – It usually says what went wrong and which line (or the first line) is involved.\n2. **Check spelling** – Variable and function names must match exactly (e.g. myVar vs myvar).\n3. **Check brackets and colons** – In Python, every colon (:) needs a block below it. In JavaScript, every { needs a }.\n4. **Use print/console.log** – Add print() (Python) or console.log() (JavaScript) to see the values of variables and confirm they’re what you expect.\n5. **Run small parts** – Comment out some code and run the rest to see which part causes the problem.\n\nPaste your code in the editor and click Run to see the exact error, then compare with the steps above.",
  },
  {
    keywords: ["explain", "what does", "how does", "meaning", "this code", "do"],
    answer: "To understand a piece of code:\n\n1. **Find the main action** – Look for function calls (e.g. print, console.log) or assignments (name = ...).\n2. **Follow variables** – See where each variable is set and where it’s used.\n3. **Check conditions** – if/else and loops decide which parts run; see what must be true for each branch.\n4. **Run it** – Click Run and watch the output. Change one thing (e.g. a number or a condition) and run again to see how behavior changes.\n\nIf you paste the exact lines you don’t understand, I can walk through them step by step (e.g. “line 3 sets x to 5, then line 4 checks if x is greater than 0”).",
  },
  {
    keywords: ["variable", "variables", "let", "const", "var", "assign"],
    answer: "**Variables** store values so you can use them later.\n\n**Python:** name = \"Alex\"  then  print(name)\n**JavaScript:** let name = \"Alex\";  then  console.log(name);\n\n• Use a clear name (e.g. score, userName).\n• In JavaScript use const if the value won’t change, let if it will.\n• The name must be the same everywhere (case-sensitive: Score and score are different).",
  },
  {
    keywords: ["print", "console.log", "output", "show", "display"],
    answer: "To show text or values:\n\n**Python:** print(\"Hello\")  or  print(x)\n**JavaScript:** console.log(\"Hello\");  or  console.log(x);\n\n• Use quotes for text (strings). Don’t use quotes for variables: print(name) not print(\"name\") if you want the value of name.\n• You can print multiple things: print(a, b) or console.log(a, b).",
  },
  {
    keywords: ["if", "else", "condition", "elif"],
    answer: "**Conditions** run different code depending on whether something is true or false.\n\n**Python:**\nif age >= 18:\n    print(\"Adult\")\nelif age >= 13:\n    print(\"Teen\")\nelse:\n    print(\"Child\")\n\n**JavaScript:**\nif (age >= 18) {\n  console.log(\"Adult\");\n} else if (age >= 13) {\n  console.log(\"Teen\");\n} else {\n  console.log(\"Child\");\n}\n\n• Use == for “equal to”, != for “not equal”, < > <= >= for comparisons.\n• In JavaScript use === for strict equality (same type and value).",
  },
  {
    keywords: ["loop", "loops", "for", "while", "repeat"],
    answer: "**Loops** run a block of code multiple times.\n\n**Python for:** for i in range(5): print(i)  → 0,1,2,3,4\n**Python over list:** for item in my_list: print(item)\n**JavaScript for:** for (let i = 0; i < 5; i++) { console.log(i); }\n\n• Make sure the condition in a while loop can become false, or you get an infinite loop.\n• Use the loop variable (i, item) inside the block to do something each time.",
  },
  {
    keywords: ["function", "functions", "def", "return"],
    answer: "**Functions** are reusable blocks of code. You define them once and call them when needed.\n\n**Python:**\ndef add(a, b):\n    return a + b\nprint(add(2, 3))  # 5\n\n**JavaScript:**\nfunction add(a, b) {\n  return a + b;\n}\nconsole.log(add(2, 3));  // 5\n\n• Parameters (a, b) are the inputs. return sends a value back.\n• If you don’t return anything, the function gives undefined (JavaScript) or None (Python).",
  },
  {
    keywords: ["list", "array", "arrays", "lists", "index", "append", "push"],
    answer: "**Lists (Python) / Arrays (JavaScript)** store multiple values in order.\n\n**Python:** fruits = [\"apple\", \"banana\"]  →  fruits[0] is \"apple\".  fruits.append(\"cherry\")\n**JavaScript:** let fruits = [\"apple\", \"banana\"];  →  fruits[0] is \"apple\".  fruits.push(\"cherry\");\n\n• Indexes start at 0. First item is [0], second is [1].\n• Use .length (JavaScript) or len(list) (Python) to get the number of items.",
  },
  {
    keywords: ["object", "dictionary", "dict", "key", "value", "json"],
    answer: "**Objects (JavaScript) / Dictionaries (Python)** store key–value pairs.\n\n**Python:** person = {\"name\": \"Alex\", \"age\": 10}  →  person[\"name\"] is \"Alex\"\n**JavaScript:** let person = { name: \"Alex\", age: 10 };  →  person.name or person[\"name\"] is \"Alex\"\n\n• Keys are usually strings. Values can be anything (numbers, strings, lists, etc.).\n• Use the key to get or set a value: person[\"age\"] = 11.",
  },
  {
    keywords: ["syntax", "syntaxerror", "unexpected", "invalid"],
    answer: "**Syntax errors** mean the language rules are broken. The computer can’t run the code until you fix them.\n\nCommon causes:\n• **Missing or extra brackets** – Every ( needs ), every { needs }, every [ needs ].\n• **Missing colon (Python)** – After if, for, def, etc. you need : and then the block indented below.\n• **Missing semicolon or comma (JavaScript)** – Check that lines and list items are properly separated.\n• **Typos in keywords** – if, for, def, return, function, etc. must be spelled correctly.\n\nThe error message often points to the line (or the line after) where the parser got confused. Fix that spot first.",
  },
  {
    keywords: ["undefined", "null", "none", "not defined", "reference"],
    answer: "**Undefined / None / “not defined”** usually means you’re using a name that doesn’t exist or has no value yet.\n\n• **Spelling** – Variable and function names must match exactly (case-sensitive).\n• **Order** – Use a variable only after it’s assigned. Define functions before you call them (or put calls after the definition).\n• **Scope** – A variable defined inside an if or function is only visible there. Use it outside and you get “not defined”.\n• In JavaScript, undefined often means “no value yet”. In Python, NameError means the name isn’t defined.",
  },
  {
    keywords: ["index", "out of range", "bounds", "subscript"],
    answer: "**Index out of range** means you used an index that doesn’t exist in the list/array.\n\n• Indexes start at 0. A list with 3 items has indexes 0, 1, 2. Index 3 is out of range.\n• Check the length: len(my_list) in Python, myArray.length in JavaScript.\n• Last valid index is length - 1. For a loop, use range(len(my_list)) in Python or i < arr.length in JavaScript.\n• Empty list has no valid index (0 is already out of range).",
  },
  {
    keywords: ["type", "typeerror", "number", "string", "boolean"],
    answer: "**Types** are the kind of data: numbers, strings (text), booleans (true/false), lists, etc.\n\n• **Type errors** often happen when you mix types: e.g. \"5\" + 3 in JavaScript gives \"53\" (string), not 8. Use Number(\"5\") + 3 or parseInt(\"5\") + 3 for 8.\n• In Python, \"5\" + 3 raises an error. Use int(\"5\") + 3.\n• Check what you’re passing: is it a string when the function expects a number? Convert with int(), float(), or Number() as needed.",
  },
  {
    keywords: ["indent", "indentation", "indent error", "python"],
    answer: "**Indentation** in Python is part of the syntax. Blocks are defined by how many spaces (or tabs) you use.\n\n• After if, for, def, else, elif, use a colon : then indent the next lines (usually 4 spaces).\n• All lines in the same block must have the same indentation. Mixing spaces and tabs can cause errors.\n• “IndentationError” means Python found a line that’s indented wrongly. Make the block consistently indented.",
  },
  {
    keywords: ["debug", "debugging", "find bug", "fix bug"],
    answer: "**Debugging** is finding and fixing mistakes in your code.\n\n1. **Reproduce** – Run the code and see the exact error or wrong behavior.\n2. **Read the message** – Error text often tells you the line and the kind of problem.\n3. **Add prints** – Use print() or console.log() to see variable values and which branches run.\n4. **Simplify** – Comment out or remove parts to see when the problem appears.\n5. **Check assumptions** – Is that variable really a number? Is the list empty? Is the index in range?\n\nSmall steps and clear output make it much easier to find the bug.",
  },
  {
    keywords: ["hello", "hi", "help", "start", "beginner"],
    answer: "Welcome! I’m your offline coding tutor. I can help you with:\n\n• **Why code isn’t working** – errors, bugs, wrong output\n• **Explaining code** – what a piece of code does\n• **Variables, loops, functions** – basics in Python and JavaScript\n• **Lists/arrays and objects/dictionaries**\n• **Syntax and common errors** – indentation, undefined, index out of range\n\nAsk in your own words (e.g. “Why is my code not working?” or “Explain this code”) and I’ll answer from my built‑in knowledge. No internet or AI service needed.",
  },
];

/**
 * Find the best matching knowledge entry for a question (and optional code).
 * Returns the answer or a default if no good match.
 */
export function getTutorAnswer(question: string, _code?: string): string {
  const q = question.trim().toLowerCase();
  if (!q) {
    return "Ask me something about your code! For example: \"Why is my code not working?\" or \"Explain this code\".";
  }

  let bestScore = 0;
  let bestAnswer = TUTOR_KNOWLEDGE[TUTOR_KNOWLEDGE.length - 1].answer; // default: welcome/help

  for (const entry of TUTOR_KNOWLEDGE) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw.toLowerCase())) {
        score += 1;
        if (q.includes(" " + kw + " ") || q.startsWith(kw + " ") || q.endsWith(" " + kw)) score += 0.5;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestAnswer = entry.answer;
    }
  }

  return bestAnswer;
}
