/**
 * Tech basics for kids – What is HTML, CSS, database, etc.
 * Shown before Python/JavaScript. Fun, simple explanations.
 */

export interface BasicsLesson {
  id: string;
  title: string;
  emoji: string;
  explanation: string;
  exampleCode?: string;
  exampleLabel?: string;
  funFact: string;
}

export const ACADEMY_BASICS: BasicsLesson[] = [
  {
    id: "what-is-code",
    title: "What is code?",
    emoji: "✨",
    explanation: "Code is a set of instructions we give to the computer, like a recipe for a robot! When you write code, you're telling the computer exactly what to do, step by step. Just like you might tell a friend how to make a sandwich, you tell the computer how to show a game, a website, or an app.",
    funFact: "The first computer programmer was a woman named Ada Lovelace, way back in the 1840s!",
  },
  {
    id: "what-is-html",
    title: "What is HTML?",
    emoji: "📄",
    explanation: "HTML stands for HyperText Markup Language. It's the skeleton of a webpage! Imagine you're building a page: HTML is the structure – the headings, paragraphs, buttons, and links. Every website you visit is made with HTML. It uses 'tags' like <h1> for a big heading and <p> for a paragraph.",
    exampleCode: "<h1>My First Page</h1>\n<p>Hello, I'm learning to code!</p>\n<button>Click me</button>",
    exampleLabel: "Simple HTML",
    funFact: "HTML was invented in 1991. The first website ever is still online!",
  },
  {
    id: "what-is-css",
    title: "What is CSS?",
    emoji: "🎨",
    explanation: "CSS stands for Cascading Style Sheets. If HTML is the skeleton of a page, CSS is the style – the colors, fonts, sizes, and layout! With CSS you can make text red, make buttons round, or put things in a grid. Same HTML can look totally different with different CSS.",
    exampleCode: "h1 { color: blue; font-size: 24px; }\np { color: gray; }\nbutton { background: green; color: white; }",
    exampleLabel: "CSS makes things pretty",
    funFact: "You can change one CSS file and the whole website can get a new look!",
  },
  {
    id: "what-is-javascript",
    title: "What is JavaScript?",
    emoji: "🟨",
    explanation: "JavaScript is a programming language that runs in your web browser. It makes web pages interactive – when you click a button and something happens, that's often JavaScript! It can also do math, work with lists, and talk to the server. Lots of games and apps on the web use JavaScript.",
    funFact: "JavaScript was created in just 10 days in 1995. Now it's one of the most popular languages in the world!",
  },
  {
    id: "what-is-python",
    title: "What is Python?",
    emoji: "🐍",
    explanation: "Python is a programming language named after the comedy group Monty Python! It's famous for being easy to read and write. People use Python for games, websites, robots, science, and teaching. Many schools teach Python first because it's friendly for beginners.",
    funFact: "Python is used by NASA, Google, and YouTube. Even the game Minecraft has Python mods!",
  },
  {
    id: "what-is-database",
    title: "What is a database?",
    emoji: "🗄️",
    explanation: "A database is a place where we store information so we can find it later. Think of it like a super-organized filing cabinet or a giant spreadsheet. When you save your progress in a game, or when a website remembers your name, that data is usually stored in a database. We can add, search, update, and delete data.",
    funFact: "Databases can hold millions or billions of pieces of data and still find what you need in a flash!",
  },
  {
    id: "how-web-works",
    title: "How does the web work?",
    emoji: "🌐",
    explanation: "When you type a website address and press Enter, your computer sends a request to a server (a computer that stores the website). The server sends back HTML, CSS, and JavaScript. Your browser then puts it all together and shows you the page. So: you ask, the server answers, and the browser draws the page!",
    funFact: "The 'web' is called that because pages are linked together like a spider's web!",
  },
];
