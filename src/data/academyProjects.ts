/**
 * Starter code and instructions for Academy project templates.
 */

export interface AcademyProjectTemplate {
  id: string;
  name: string;
  type: string;
  instructions: string;
  starterCode: { python: string; javascript: string };
}

export const ACADEMY_PROJECT_TEMPLATES: AcademyProjectTemplate[] = [
  {
    id: "calculator",
    name: "Calculator",
    type: "calculator",
    instructions: "Build a simple calculator that can add, subtract, multiply, and divide two numbers. Add a simple UI or use prompt/console.",
    starterCode: {
      javascript: `// Simple calculator - extend this
function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }
// Add multiply, divide, and a way to run (e.g. console.log(add(2, 3)))
console.log("2 + 3 =", add(2, 3));
`,
      python: `# Simple calculator - extend this
def add(a, b):
    return a + b
def subtract(a, b):
    return a - b
# Add multiply, divide, and print some examples
print("2 + 3 =", add(2, 3))
`,
    },
  },
  {
    id: "todo",
    name: "Todo App",
    type: "todo",
    instructions: "Create a todo list: add items, list them, and mark as done. Use a list/array and a loop to display items.",
    starterCode: {
      javascript: `// Todo list - add, list, complete
const todos = [];
function addTodo(text) { todos.push({ text, done: false }); }
function listTodos() {
  todos.forEach((t, i) => console.log(i + 1, t.done ? "[x]" : "[ ]", t.text));
}
addTodo("Learn JavaScript");
addTodo("Build a project");
listTodos();
`,
      python: `# Todo list - add, list, complete
todos = []
def add_todo(text):
    todos.append({"text": text, "done": False})
def list_todos():
    for i, t in enumerate(todos):
        print(i + 1, "[x]" if t["done"] else "[ ]", t["text"])
add_todo("Learn Python")
add_todo("Build a project")
list_todos()
`,
    },
  },
  {
    id: "quiz",
    name: "Quiz Game",
    type: "quiz",
    instructions: "Build a simple quiz: store a few questions and answers, then loop and ask the user (use prompt or input). Count correct answers.",
    starterCode: {
      javascript: `// Quiz game - questions and score
const questions = [
  { q: "What is 2+2?", a: "4" },
  { q: "Capital of France?", a: "Paris" }
];
let score = 0;
for (const { q, a } of questions) {
  const ans = prompt(q);
  if (ans && ans.trim().toLowerCase() === a.toLowerCase()) score++;
}
console.log("Score:", score, "/", questions.length);
`,
      python: `# Quiz game - questions and score
questions = [
    {"q": "What is 2+2?", "a": "4"},
    {"q": "Capital of France?", "a": "Paris"}
]
score = 0
for item in questions:
    ans = input(item["q"] + " ")
    if ans.strip().lower() == item["a"].lower():
        score += 1
print("Score:", score, "/", len(questions))
`,
    },
  },
  {
    id: "weather",
    name: "Weather App",
    type: "weather",
    instructions: "Simulate a weather app: store a few cities and fake temperatures, then look up by city name and display the result.",
    starterCode: {
      javascript: `// Weather lookup - extend with more cities
const weather = { "London": 15, "Paris": 18, "Tokyo": 22 };
function getTemp(city) {
  const c = weather[city];
  return c != null ? c + "°C" : "City not found";
}
console.log("London:", getTemp("London"));
console.log("Paris:", getTemp("Paris"));
`,
      python: `# Weather lookup - extend with more cities
weather = {"London": 15, "Paris": 18, "Tokyo": 22}
def get_temp(city):
    c = weather.get(city)
    return f"{c}°C" if c is not None else "City not found"
print("London:", get_temp("London"))
print("Paris:", get_temp("Paris"))
`,
    },
  },
  {
    id: "guessing",
    name: "Number Guessing Game",
    type: "guessing",
    instructions: "The program picks a random number. The user guesses until they get it right. Use a loop and input/prompt.",
    starterCode: {
      javascript: `// Guess the number (1-10)
const secret = Math.floor(Math.random() * 10) + 1;
let guess = parseInt(prompt("Guess 1-10:"), 10);
while (guess !== secret) {
  console.log(guess < secret ? "Too low!" : "Too high!");
  guess = parseInt(prompt("Guess again:"), 10);
}
console.log("You got it!");
`,
      python: `import random
secret = random.randint(1, 10)
guess = int(input("Guess 1-10: "))
while guess != secret:
    print("Too low!" if guess < secret else "Too high!")
    guess = int(input("Guess again: "))
print("You got it!")
`,
    },
  },
  {
    id: "story",
    name: "Mad Libs Story",
    type: "story",
    instructions: "Ask for a few words (noun, verb, place) and then print a silly sentence using those words.",
    starterCode: {
      javascript: `let noun = "dragon";
let verb = "dance";
let place = "the moon";
console.log("The " + noun + " likes to " + verb + " at " + place + "!");
`,
      python: `noun = input("Give me a noun: ")
verb = input("Give me a verb: ")
place = input("Give me a place: ")
print(f"The {noun} likes to {verb} at {place}!")
`,
    },
  },
  {
    id: "counter",
    name: "Click Counter",
    type: "counter",
    instructions: "Simulate a counter: start at 0, add functions to add one, subtract one, and reset. Print the count after each action.",
    starterCode: {
      javascript: `let count = 0;
function addOne() { count++; return count; }
function subOne() { count--; return count; }
function reset() { count = 0; return count; }
addOne(); addOne(); addOne();
console.log("Count:", count);
subOne();
console.log("Count:", count);
`,
      python: `count = 0
def add_one():
    global count
    count += 1
    return count
def sub_one():
    global count
    count -= 1
    return count
def reset():
    global count
    count = 0
    return count
add_one(); add_one(); add_one()
print("Count:", count)
sub_one()
print("Count:", count)
`,
    },
  },
  {
    id: "greeting",
    name: "Greeting Machine",
    type: "greeting",
    instructions: "Ask for the user's name and the time of day (morning/afternoon/evening). Print a greeting like 'Good morning, Alex!'",
    starterCode: {
      javascript: `let name = "Alex";
let time = "morning";
console.log("Good " + time + ", " + name + "!");
`,
      python: `name = input("Your name: ")
time = input("Morning, afternoon, or evening? ")
print(f"Good {time}, {name}!")
`,
    },
  },
];

export function getProjectTemplate(type: string): AcademyProjectTemplate | undefined {
  return ACADEMY_PROJECT_TEMPLATES.find((t) => t.type === type || t.id === type);
}
