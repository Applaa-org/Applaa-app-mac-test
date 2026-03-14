/**
 * Mini real-project templates for Academy. Each is a real project to build, then enhance to learn.
 */

export type ProjectLevel = "Starter" | "Intermediate" | "Expert";

export type ProjectLanguage = "python" | "javascript" | "react" | "typescript";

export interface AcademyProjectTemplate {
  id: string;
  name: string;
  type: string;
  /** Level: Starter, Intermediate, or Expert */
  level: ProjectLevel;
  instructions: string;
  /** Short explanation of what the project does and what concepts it uses */
  explanation?: string;
  /** Ideas to extend the project – "enhance it to learn" */
  enhanceOptions?: string[];
  /** At least python and javascript; react and typescript optional */
  starterCode: {
    python: string;
    javascript: string;
    react?: string;
    typescript?: string;
  };
}

export const ACADEMY_PROJECT_TEMPLATES: AcademyProjectTemplate[] = [
  {
    id: "expense-tracker",
    name: "Expense Tracker",
    type: "expense-tracker",
    level: "Starter",
    instructions: "Mini app: add expenses (amount + category), list them, show total, and optionally filter by category or show a simple summary (e.g. total per category). Use a list of objects and functions for add, list, total.",
    explanation: "This project teaches lists/arrays of objects, adding items, looping to sum or group by category, and simple data modeling. You practice functions that add, list, and aggregate data.",
    enhanceOptions: [
      "Add a date to each expense and filter by month.",
      "Show the category with the highest total spending.",
      "Add a limit per category and warn when exceeded.",
      "Export a simple summary as text (e.g. total per category).",
      "Support editing or deleting an expense by index.",
    ],
    starterCode: {
      javascript: `// Expense Tracker: add, list, total, filter by category
const expenses = [];
function addExpense(amount, category) {
  expenses.push({ amount, category, date: new Date().toISOString().slice(0, 10) });
}
function total() {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}
function byCategory() {
  const map = {};
  expenses.forEach(e => {
    map[e.category] = (map[e.category] || 0) + e.amount;
  });
  return map;
}
addExpense(10, "food");
addExpense(25, "transport");
addExpense(15, "food");
console.log("All:", expenses);
console.log("Total:", total());
console.log("By category:", byCategory());
`,
      python: `# Expense Tracker: add, list, total, filter by category
expenses = []
def add_expense(amount, category):
    from datetime import date
    expenses.append({"amount": amount, "category": category, "date": str(date.today())})
def total():
    return sum(e["amount"] for e in expenses)
def by_category():
    out = {}
    for e in expenses:
        c = e["category"]
        out[c] = out.get(c, 0) + e["amount"]
    return out
add_expense(10, "food")
add_expense(25, "transport")
add_expense(15, "food")
print("All:", expenses)
print("Total:", total())
print("By category:", by_category())
`,
    },
  },
  {
    id: "pomodoro",
    name: "Pomodoro Timer",
    type: "pomodoro",
    level: "Intermediate",
    instructions: "Simulate a Pomodoro timer: work phase (e.g. 25 min) and break phase (e.g. 5 min). Use a loop or setInterval/sleep to count down; print when phase changes. Optionally track how many work sessions completed.",
    explanation: "You learn state (phase, seconds left), loops or timers, and conditional logic to switch between work and break. Great for practicing time-based logic and simple state machines.",
    enhanceOptions: [
      "Track total work sessions completed and print a summary.",
      "Add a long break (e.g. 15 min) after every 4 work sessions.",
      "Make work and break durations configurable (variables at the top).",
      "Print a visual countdown (e.g. a row of dots that shrink).",
      "Save session count to a file or simple storage.",
    ],
    starterCode: {
      javascript: `// Pomodoro: work 25 min, break 5 min (simulate with seconds for testing)
let secondsLeft = 5;  // use 25*60 for real 25 min
let phase = "work";
function tick() {
  if (secondsLeft <= 0) {
    phase = phase === "work" ? "break" : "work";
    secondsLeft = phase === "work" ? 5 : 3;
    console.log("Phase:", phase, "–", secondsLeft, "sec");
  } else {
    console.log(phase, secondsLeft);
    secondsLeft--;
  }
}
for (let i = 0; i < 12; i++) tick();
`,
      python: `# Pomodoro: work then break (simulate with short intervals for testing)
import time
work_sec, break_sec = 5, 3  # use 25*60, 5*60 for real
phase = "work"
seconds_left = work_sec
for _ in range(12):
    if seconds_left <= 0:
        phase = "break" if phase == "work" else "work"
        seconds_left = break_sec if phase == "break" else work_sec
        print("Phase:", phase, "-", seconds_left, "sec")
    else:
        print(phase, seconds_left)
        seconds_left -= 1
    time.sleep(0.1)
`,
    },
  },
  {
    id: "mini-blog",
    name: "Mini Blog",
    type: "mini-blog",
    level: "Starter",
    instructions: "Mini blog: list posts (title, body, date), add a new post, and optionally show the latest first or filter by a keyword. Store posts in an array; use functions for add, list, and search.",
    explanation: "You work with a list of posts (objects with title, body, date, id), string methods (slice, toLowerCase, includes), and filtering. It reinforces arrays, loops, and search logic.",
    enhanceOptions: [
      "Sort posts by date (newest first) when listing.",
      "Add an edit post function (by id or index).",
      "Support deleting a post by id.",
      "Limit list output to the first N characters of the body.",
      "Add a simple 'slug' or tag to each post and filter by tag.",
    ],
    starterCode: {
      javascript: `// Mini Blog: posts with title, body, date; add, list, search
const posts = [];
function addPost(title, body) {
  posts.push({
    title,
    body,
    date: new Date().toISOString().slice(0, 10),
    id: posts.length + 1
  });
}
function listPosts() {
  posts.forEach(p => console.log(p.date, "|", p.title, "–", p.body.slice(0, 30) + "..."));
}
function search(keyword) {
  return posts.filter(p =>
    p.title.toLowerCase().includes(keyword) || p.body.toLowerCase().includes(keyword)
  );
}
addPost("First post", "Hello world. This is my mini blog.");
addPost("Second", "Another short post.");
listPosts();
console.log("Search 'post':", search("post"));
`,
      python: `# Mini Blog: posts with title, body, date; add, list, search
from datetime import date
posts = []
def add_post(title, body):
    posts.append({
        "id": len(posts) + 1,
        "title": title,
        "body": body,
        "date": str(date.today())
    })
def list_posts():
    for p in posts:
        print(p["date"], "|", p["title"], "–", p["body"][:30] + "...")
def search(keyword):
    k = keyword.lower()
    return [p for p in posts if k in p["title"].lower() or k in p["body"].lower()]
add_post("First post", "Hello world. This is my mini blog.")
add_post("Second", "Another short post.")
list_posts()
print("Search 'post':", search("post"))
`,
    },
  },
  {
    id: "recipe-finder",
    name: "Recipe Finder",
    type: "recipe-finder",
    level: "Intermediate",
    instructions: "Recipe app: store recipes (name, ingredients list, steps). Add recipes, list all, and find recipes that contain a given ingredient. Use an array of objects and a filter/search function.",
    explanation: "This project uses nested data (recipes with arrays of ingredients and steps), filtering with .filter() or list comprehensions, and string matching. You practice searching through structured data.",
    enhanceOptions: [
      "Find recipes that contain all of a list of ingredients (not just one).",
      "Add a function to list all unique ingredients across all recipes.",
      "Support removing a recipe by name.",
      "Print the number of steps for each recipe in the list.",
      "Search in steps as well as ingredients.",
    ],
    starterCode: {
      javascript: `// Recipe Finder: add recipes, list, find by ingredient
const recipes = [];
function addRecipe(name, ingredients, steps) {
  recipes.push({ name, ingredients, steps });
}
function findByIngredient(ing) {
  const lower = ing.toLowerCase();
  return recipes.filter(r =>
    r.ingredients.some(i => i.toLowerCase().includes(lower))
  );
}
addRecipe("Pasta", ["pasta", "tomato", "garlic"], ["Boil pasta", "Make sauce", "Mix"]);
addRecipe("Salad", ["lettuce", "tomato", "olive oil"], ["Chop", "Mix", "Dress"]);
console.log("All:", recipes.map(r => r.name));
console.log("With tomato:", findByIngredient("tomato").map(r => r.name));
`,
      python: `# Recipe Finder: add recipes, list, find by ingredient
recipes = []
def add_recipe(name, ingredients, steps):
    recipes.append({"name": name, "ingredients": ingredients, "steps": steps})
def find_by_ingredient(ing):
    k = ing.lower()
    return [r for r in recipes if any(k in i.lower() for i in r["ingredients"])]
add_recipe("Pasta", ["pasta", "tomato", "garlic"], ["Boil pasta", "Make sauce", "Mix"])
add_recipe("Salad", ["lettuce", "tomato", "olive oil"], ["Chop", "Mix", "Dress"])
print("All:", [r["name"] for r in recipes])
print("With tomato:", [r["name"] for r in find_by_ingredient("tomato")])
`,
    },
  },
  {
    id: "calculator",
    name: "Calculator",
    type: "calculator",
    level: "Starter",
    instructions: "Build a calculator that supports add, subtract, multiply, divide. Support a chain of operations (e.g. 2 + 3 * 4 with correct order, or a simple one-step prompt). Make it reusable with clear functions.",
    explanation: "You practice defining small functions for each operation, handling edge cases (e.g. divide by zero), and optionally parsing user input or chaining operations. Core concepts: functions, conditionals, and clean structure.",
    enhanceOptions: [
      "Add power (e.g. 2^3) and modulo (remainder) operations.",
      "Support a simple expression string like '2 + 3 * 4' and evaluate it (or step by step).",
      "Keep a running total and allow multiple operations in sequence.",
      "Add a clear/reset and a history of the last N operations.",
      "Validate input (only numbers and allowed operators).",
    ],
    starterCode: {
      javascript: `// Calculator: add, subtract, multiply, divide; chain or menu
function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }
function multiply(a, b) { return a * b; }
function divide(a, b) { return b !== 0 ? a / b : NaN; }
console.log("2 + 3 =", add(2, 3));
console.log("10 / 2 =", divide(10, 2));
`,
      python: `# Calculator: add, subtract, multiply, divide
def add(a, b): return a + b
def subtract(a, b): return a - b
def multiply(a, b): return a * b
def divide(a, b): return a / b if b != 0 else None
print("2 + 3 =", add(2, 3))
print("10 / 2 =", divide(10, 2))
`,
    },
  },
  {
    id: "todo",
    name: "Todo App",
    type: "todo",
    level: "Starter",
    instructions: "Full todo app: add, list, mark done/undone, delete by index, and show counts (total / done). Use an array of objects; keep the code organized with small functions.",
    explanation: "A classic CRUD-style app: you add items, list them, update (toggle done), and delete. You use arrays of objects, indexing, and small functions for each action. Great for learning state and structure.",
    enhanceOptions: [
      "Add a priority (high/medium/low) and sort or filter by it.",
      "Support filtering the list: show all, only done, or only not done.",
      "Add due dates and list overdue items.",
      "Add edit: change the text of a todo by index.",
      "Persist todos (e.g. save/load from a simple file or JSON).",
    ],
    starterCode: {
      javascript: `// Todo: add, list, mark done, delete, counts
const todos = [];
function addTodo(text) { todos.push({ text, done: false }); }
function toggle(i) { if (todos[i]) todos[i].done = !todos[i].done; }
function remove(i) { todos.splice(i, 1); }
function list() {
  todos.forEach((t, i) => console.log(i + 1, t.done ? "[x]" : "[ ]", t.text));
}
function counts() {
  const done = todos.filter(t => t.done).length;
  return { total: todos.length, done };
}
addTodo("Learn JavaScript"); addTodo("Build a project"); addTodo("Ship it");
list();
toggle(1); list();
console.log("Counts:", counts());
`,
      python: `# Todo: add, list, mark done, delete, counts
todos = []
def add_todo(text): todos.append({"text": text, "done": False})
def toggle(i):
    if 0 <= i < len(todos): todos[i]["done"] = not todos[i]["done"]
def remove(i): todos.pop(i) if 0 <= i < len(todos) else None
def list_todos():
    for i, t in enumerate(todos):
        print(i + 1, "[x]" if t["done"] else "[ ]", t["text"])
def counts():
    done = sum(1 for t in todos if t["done"])
    return {"total": len(todos), "done": done}
add_todo("Learn Python"); add_todo("Build a project"); add_todo("Ship it")
list_todos()
toggle(1); list_todos()
print("Counts:", counts())
`,
    },
  },
  {
    id: "quiz",
    name: "Quiz Game",
    type: "quiz",
    level: "Starter",
    instructions: "Quiz with multiple questions, scoring, and a final summary (score / total and a short message). Support at least 5 questions; optionally shuffle or add multiple choice.",
    explanation: "You work with a list of questions (and answers), loops, user input, string comparison, and scoring. Teaches conditionals, arrays, and simple game flow.",
    enhanceOptions: [
      "Add multiple-choice options and validate the chosen letter.",
      "Shuffle the order of questions each run.",
      "Add a time limit per question (if your environment supports it).",
      "Show the correct answer when the user is wrong.",
      "Store high scores (e.g. in a list or file) and show the top 3.",
    ],
    starterCode: {
      javascript: `// Quiz: questions, score, final summary
const questions = [
  { q: "What is 2+2?", a: "4" },
  { q: "Capital of France?", a: "Paris" },
  { q: "Largest planet?", a: "Jupiter" }
];
let score = 0;
questions.forEach(({ q, a }, i) => {
  const ans = prompt("Q" + (i+1) + ": " + q);
  if (ans && ans.trim().toLowerCase() === a.toLowerCase()) score++;
});
console.log("Score:", score, "/", questions.length);
console.log(score === questions.length ? "Perfect!" : "Keep learning!");
`,
      python: `# Quiz: questions, score, final summary
questions = [
    {"q": "What is 2+2?", "a": "4"},
    {"q": "Capital of France?", "a": "Paris"},
    {"q": "Largest planet?", "a": "Jupiter"}
]
score = 0
for i, item in enumerate(questions):
    ans = input(f"Q{i+1}: {item['q']} ").strip().lower()
    if ans == item["a"].lower():
        score += 1
print("Score:", score, "/", len(questions))
print("Perfect!" if score == len(questions) else "Keep learning!")
`,
    },
  },
  {
    id: "weather",
    name: "Weather App",
    type: "weather",
    level: "Intermediate",
    instructions: "Weather app: multiple cities with temp and condition. Look up by city, list all, and optionally show average temp or 'hottest' city. Use an object/map for data.",
    explanation: "You use objects (or dicts) as key–value maps, iterate with Object.entries or .items(), and compute aggregates like max and average. Good practice for real-world data lookups and simple stats.",
    enhanceOptions: [
      "Add average temperature across all cities.",
      "List cities with a given condition (e.g. all 'sunny').",
      "Add a 'feels like' or humidity field and display it.",
      "Sort cities by temperature (hottest to coldest).",
      "Support adding or removing a city and updating the data.",
    ],
    starterCode: {
      javascript: `// Weather: cities with temp and condition; lookup, list, stats
const weather = {
  London: { temp: 15, condition: "cloudy" },
  Paris: { temp: 18, condition: "sunny" },
  Tokyo: { temp: 22, condition: "rainy" }
};
function getCity(name) { return weather[name]; }
function listAll() {
  Object.entries(weather).forEach(([city, d]) =>
    console.log(city + ":", d.temp + "°C", d.condition));
}
function hottest() {
  return Object.entries(weather).reduce((a, b) =>
    a[1].temp > b[1].temp ? a : b);
}
listAll();
console.log("Hottest:", hottest());
`,
      python: `# Weather: cities with temp and condition; lookup, list, stats
weather = {
    "London": {"temp": 15, "condition": "cloudy"},
    "Paris": {"temp": 18, "condition": "sunny"},
    "Tokyo": {"temp": 22, "condition": "rainy"}
}
def get_city(name): return weather.get(name)
def list_all():
    for city, d in weather.items():
        print(city + ":", d["temp"], "°C", d["condition"])
def hottest():
    return max(weather.items(), key=lambda x: x[1]["temp"])
list_all()
print("Hottest:", hottest())
`,
    },
  },
  {
    id: "guessing",
    name: "Number Guessing Game",
    type: "guessing",
    level: "Intermediate",
    instructions: "Guess the number: random 1–100, limited tries (e.g. 7), and feedback (too high/too low). Print how many tries were used when the user wins.",
    explanation: "You use random number generation, a loop with a try limit, user input, and conditionals for feedback. Classic game logic and loop control.",
    enhanceOptions: [
      "Let the user choose difficulty (easy: 1–50, hard: 1–200) or more tries.",
      "After a win, ask to play again and reset the secret number.",
      "Give a hint like 'within 10' when 2 tries are left.",
      "Track and display the best (lowest) number of tries so far.",
      "Add a simple replay history (list of guesses per game).",
    ],
    starterCode: {
      javascript: `// Guess 1-100, max 7 tries
const secret = Math.floor(Math.random() * 100) + 1;
let tries = 0, max = 7, guess;
while (tries < max) {
  guess = parseInt(prompt("Guess 1-100 (" + (max - tries) + " left):"), 10);
  tries++;
  if (guess === secret) {
    console.log("You got it in", tries, "tries!");
    break;
  }
  console.log(guess < secret ? "Too low" : "Too high");
}
if (guess !== secret) console.log("Out of tries. It was", secret);
`,
      python: `# Guess 1-100, max 7 tries
import random
secret = random.randint(1, 100)
tries, max_tries = 0, 7
while tries < max_tries:
    guess = int(input(f"Guess 1-100 ({max_tries - tries} left): "))
    tries += 1
    if guess == secret:
        print("You got it in", tries, "tries!")
        break
    print("Too low" if guess < secret else "Too high")
else:
    print("Out of tries. It was", secret)
`,
    },
  },
  {
    id: "stopwatch",
    name: "Stopwatch",
    type: "stopwatch",
    level: "Intermediate",
    instructions: "Build a stopwatch: start, pause, reset. Track elapsed time in seconds (or minutes:seconds). Use setInterval or a loop to update.",
    explanation: "Practice timers, state (running, elapsed), and formatting time. Good for learning event-driven and time-based logic.",
    enhanceOptions: ["Add lap times.", "Save best time.", "Format as MM:SS.ms.", "Sound on lap.", "Pause/resume toggle."],
    starterCode: {
      javascript: `let elapsed = 0, running = false, id;\nfunction tick() { if (running) { elapsed++; console.log(elapsed + "s"); } }\nfunction start() { running = true; id = setInterval(tick, 1000); }\nfunction stop() { running = false; clearInterval(id); }\nfunction reset() { elapsed = 0; console.log("Reset"); }\nstart(); setTimeout(() => { stop(); console.log("Stopped at", elapsed); }, 3000);`,
      python: `import time\nelapsed, running = 0, False\nwhile True:\n    if running: elapsed += 1; print(elapsed, "s")\n    time.sleep(1)\n# start/stop/reset with input() in a loop`,
    },
  },
  {
    id: "counter-app",
    name: "Counter App",
    type: "counter-app",
    level: "Starter",
    instructions: "Simple counter: add one, subtract one, optional reset. Display the current count. Use a variable and functions.",
    explanation: "Core state and functions. Perfect first project for variables, conditionals, and buttons (or console commands).",
    enhanceOptions: ["Add step size (e.g. +5).", "Cap min/max.", "Log history of counts.", "Double on even.", "Reset button."],
    starterCode: {
      javascript: `let count = 0;\nfunction add() { count++; return count; }\nfunction sub() { count--; return count; }\nfunction reset() { count = 0; return count; }\nadd(); add(); console.log(count);\nsub(); console.log(count);\nreset(); console.log(count);`,
      python: `count = 0\ndef add(): global count; count += 1; return count\ndef sub(): global count; count -= 1; return count\ndef reset(): global count; count = 0; return count\nadd(); add(); print(count)\nsub(); print(count)\nreset(); print(count)`,
    },
  },
  {
    id: "password-generator",
    name: "Password Generator",
    type: "password-generator",
    level: "Starter",
    instructions: "Generate a random password of given length. Optionally include uppercase, numbers, symbols. Use random choice from character sets.",
    explanation: "Strings, random, loops. Build a string from random characters and learn about character sets.",
    enhanceOptions: ["Configurable length and character sets.", "Copy to clipboard (if env supports).", "Strength meter.", "Exclude ambiguous chars.", "Multiple passwords at once."],
    starterCode: {
      javascript: `const chars = "abcdefghijklmnopqrstuvwxyz0123456789";\nfunction gen(len) {\n  let s = "";\n  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];\n  return s;\n}\nconsole.log(gen(8));\nconsole.log(gen(12));`,
      python: `import random\nchars = "abcdefghijklmnopqrstuvwxyz0123456789"\ndef gen(length):\n    return "".join(random.choice(chars) for _ in range(length))\nprint(gen(8))\nprint(gen(12))`,
    },
  },
  {
    id: "unit-converter",
    name: "Unit Converter",
    type: "unit-converter",
    level: "Starter",
    instructions: "Convert between units: e.g. km to miles, kg to lbs, Celsius to Fahrenheit. Functions for each conversion.",
    explanation: "Simple math and functions. One input, one output per conversion.",
    enhanceOptions: ["Add more units (e.g. feet, meters).", "Two-way conversion menu.", "Round to 2 decimals.", "History of conversions.", "Switch between unit types."],
    starterCode: {
      javascript: `function kmToMiles(km) { return km * 0.621371; }\nfunction cToF(c) { return c * 9/5 + 32; }\nconsole.log("5 km =", kmToMiles(5), "miles");\nconsole.log("0 C =", cToF(0), "F");`,
      python: `def km_to_miles(km): return km * 0.621371\ndef c_to_f(c): return c * 9/5 + 32\nprint("5 km =", km_to_miles(5), "miles")\nprint("0 C =", c_to_f(0), "F")`,
    },
  },
  {
    id: "tip-calculator",
    name: "Tip Calculator",
    type: "tip-calculator",
    level: "Starter",
    instructions: "Given bill amount and tip percentage, compute tip and total. Optional: split between N people.",
    explanation: "Numbers, percentages, and rounding. Simple real-world math in code.",
    enhanceOptions: ["Round to 2 decimals.", "Preset tip buttons (10%, 15%, 20%).", "Split bill by number of people.", "Tax before tip.", "Currency formatting."],
    starterCode: {
      javascript: `function tip(bill, pct) { return bill * (pct / 100); }\nfunction total(bill, pct) { return bill + tip(bill, pct); }\nconsole.log("Tip:", tip(50, 15));\nconsole.log("Total:", total(50, 15));`,
      python: `def tip(bill, pct): return bill * (pct / 100)\ndef total(bill, pct): return bill + tip(bill, pct)\nprint("Tip:", tip(50, 15))\nprint("Total:", total(50, 15))`,
    },
  },
  {
    id: "random-quote",
    name: "Random Quote",
    type: "random-quote",
    level: "Starter",
    instructions: "Store a list of quotes (strings). Pick one at random and print it. Optionally show author.",
    explanation: "Arrays and random selection. Minimal data + one random choice.",
    enhanceOptions: ["Add authors.", "Don't repeat until all shown.", "Category filter.", "Copy quote.", "Add new quote."],
    starterCode: {
      javascript: `const quotes = ["Hello world", "Code is fun", "Learn every day"];\nfunction randomQuote() { return quotes[Math.floor(Math.random() * quotes.length)]; }\nconsole.log(randomQuote());\nconsole.log(randomQuote());`,
      python: `import random\nquotes = ["Hello world", "Code is fun", "Learn every day"]\ndef random_quote(): return random.choice(quotes)\nprint(random_quote())\nprint(random_quote())`,
    },
  },
  {
    id: "bmi-calculator",
    name: "BMI Calculator",
    type: "bmi-calculator",
    level: "Starter",
    instructions: "Compute BMI from weight (kg) and height (m). Formula: weight / height². Optionally classify: underweight, normal, overweight.",
    explanation: "Math and simple conditionals. One formula and thresholds.",
    enhanceOptions: ["Add classification (under/normal/over).", "Support lbs and feet.", "Round to 1 decimal.", "Health message.", "Input validation."],
    starterCode: {
      javascript: `function bmi(weightKg, heightM) { return weightKg / (heightM * heightM); }\nconsole.log(bmi(70, 1.75).toFixed(1));`,
      python: `def bmi(weight_kg, height_m): return weight_kg / (height_m ** 2)\nprint(round(bmi(70, 1.75), 1))`,
    },
  },
  {
    id: "countdown-timer",
    name: "Countdown Timer",
    type: "countdown-timer",
    level: "Intermediate",
    instructions: "Count down from N seconds to 0. Print each second. When done, print 'Done!' or trigger an action.",
    explanation: "Loops, timers, and state. Similar to Pomodoro but single phase.",
    enhanceOptions: ["Start/pause/reset.", "Set minutes and seconds.", "Sound or message at 0.", "Visual progress bar.", "Repeat countdown."],
    starterCode: {
      javascript: `let sec = 5;\nconst id = setInterval(() => {\n  console.log(sec);\n  sec--;\n  if (sec < 0) { clearInterval(id); console.log("Done!"); }\n}, 1000);`,
      python: `import time\nfor sec in range(5, 0, -1):\n    print(sec)\n    time.sleep(1)\nprint("Done!")`,
    },
  },
  {
    id: "grade-book",
    name: "Grade Book",
    type: "grade-book",
    level: "Intermediate",
    instructions: "Store student names and scores. Compute average, find highest/lowest, list who passed (e.g. >= 60).",
    explanation: "Lists of records, aggregation, and filtering. Classic data summary project.",
    enhanceOptions: ["Add letter grades (A–F).", "Sort by score.", "Add/remove student.", "Class average.", "Export as text."],
    starterCode: {
      javascript: `const students = [{ name: "Alex", score: 85 }, { name: "Sam", score: 72 }];\nconst avg = students.reduce((s, st) => s + st.score, 0) / students.length;\nconst passed = students.filter(st => st.score >= 60);\nconsole.log("Average:", avg);\nconsole.log("Passed:", passed.map(st => st.name));`,
      python: `students = [{"name": "Alex", "score": 85}, {"name": "Sam", "score": 72}]\navg = sum(s["score"] for s in students) / len(students)\npassed = [s["name"] for s in students if s["score"] >= 60]\nprint("Average:", avg)\nprint("Passed:", passed)`,
    },
  },
  {
    id: "flashcards",
    name: "Flashcards",
    type: "flashcards",
    level: "Intermediate",
    instructions: "List of question/answer pairs. Show one question at a time; user answers (or flips to see answer). Track correct count.",
    explanation: "Arrays of pairs, indexing, and simple state. Good for loops and user input.",
    enhanceOptions: ["Shuffle order.", "Skip card.", "Categories.", "Save progress.", "Multiple choice."],
    starterCode: {
      javascript: `const cards = [{ q: "2+2?", a: "4" }, { q: "Capital of France?", a: "Paris" }];\ncards.forEach((c, i) => console.log("Q" + (i+1) + ":", c.q, "->", c.a));`,
      python: `cards = [{"q": "2+2?", "a": "4"}, {"q": "Capital of France?", "a": "Paris"}]\nfor i, c in enumerate(cards): print("Q" + str(i+1) + ":", c["q"], "->", c["a"])`,
    },
  },
  {
    id: "api-fetch",
    name: "Fetch Data (API)",
    type: "api-fetch",
    level: "Expert",
    instructions: "Fetch data from a public API (e.g. JSONPlaceholder, Open Weather). Parse JSON and display or process the result.",
    explanation: "Async, fetch, JSON. Real-world pattern for getting data from the web.",
    enhanceOptions: ["Error handling and loading state.", "Display in a simple list.", "Filter or search results.", "Cache response.", "Different endpoints."],
    starterCode: {
      javascript: `async function fetchData() {\n  const res = await fetch("https://jsonplaceholder.typicode.com/todos/1");\n  const data = await res.json();\n  console.log(data);\n}\nfetchData();`,
      python: `import urllib.request, json\nwith urllib.request.urlopen("https://jsonplaceholder.typicode.com/todos/1") as r:\n    data = json.loads(r.read())\n    print(data)`,
    },
  },
  {
    id: "sort-visualize",
    name: "Sort a List",
    type: "sort-visualize",
    level: "Expert",
    instructions: "Take a list of numbers. Implement a sort (bubble, selection, or use built-in). Print the list before and after. Optionally print steps.",
    explanation: "Algorithms and arrays. Understanding how sorting works.",
    enhanceOptions: ["Print each swap or pass.", "Compare sort times.", "Sort strings by length.", "Descending order.", "Sort objects by key."],
    starterCode: {
      javascript: `const nums = [3, 1, 4, 1, 5];\nconst sorted = [...nums].sort((a, b) => a - b);\nconsole.log("Before:", nums);\nconsole.log("After:", sorted);`,
      python: `nums = [3, 1, 4, 1, 5]\nsorted_nums = sorted(nums)\nprint("Before:", nums)\nprint("After:", sorted_nums)`,
    },
  },
];

export function getProjectTemplate(type: string): AcademyProjectTemplate | undefined {
  return ACADEMY_PROJECT_TEMPLATES.find((t) => t.type === type || t.id === type);
}

/** Get starter code for a language; React/TypeScript fall back to JavaScript if not defined */
export function getStarterCodeForLanguage(
  template: AcademyProjectTemplate,
  lang: ProjectLanguage
): string {
  const code = template.starterCode[lang];
  if (code) return code;
  if (lang === "react" || lang === "typescript") return template.starterCode.javascript;
  return template.starterCode.python;
}
