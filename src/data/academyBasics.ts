/**
 * Tech basics for kids – What is coding, web, front/back-end, DB, HTML, CSS, etc.
 * Plus React, TypeScript, and AI concepts (NLP, ML, Deep Learning).
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
    title: "What is coding?",
    emoji: "✨",
    explanation: "Coding is writing instructions for a computer, like giving a robot a recipe! When you code, you tell the computer exactly what to do, step by step. Games, websites, and apps are all made with code. Learning to code helps you build your own ideas and understand how technology works.",
    funFact: "The first computer programmer was a woman named Ada Lovelace, way back in the 1840s!",
  },
  {
    id: "what-is-web",
    title: "What is the web?",
    emoji: "🌐",
    explanation: "The web (World Wide Web) is millions of pages connected by links. When you open a browser and visit a site, you're using the web. Pages live on servers – computers that store and send them. The web lets us share information, play games, watch videos, and learn – all through the internet!",
    funFact: "The first website ever created is still online. You can look it up!",
  },
  {
    id: "front-end",
    title: "What is front-end?",
    emoji: "🖥️",
    explanation: "Front-end is everything you see and click on a website or app – the buttons, text, colors, and layout. It runs in your browser on your device. Front-end developers use HTML (structure), CSS (style), and JavaScript (interactivity) to build what users see and interact with.",
    funFact: "When you click a button and something happens, that's front-end code at work!",
  },
  {
    id: "back-end",
    title: "What is back-end?",
    emoji: "⚙️",
    explanation: "Back-end is the part of a website or app that runs on a server, not on your screen. It handles things like saving your data, logging you in, and doing heavy calculations. Back-end code might be written in Python, JavaScript (Node.js), Java, or other languages. You don't see it, but it powers the app!",
    funFact: "When you save your progress in a game, the back-end stores it in a database.",
  },
  {
    id: "what-is-database",
    title: "What is a database?",
    emoji: "🗄️",
    explanation: "A database is a place where we store information so we can find it later. Think of it like a super-organized filing cabinet or a giant spreadsheet. When a website remembers your name or a game saves your score, that data is usually in a database. We can add, search, update, and delete data.",
    funFact: "Databases can hold millions or billions of pieces of data and still find what you need in a flash!",
  },
  {
    id: "what-is-html",
    title: "What is HTML?",
    emoji: "📄",
    explanation: "HTML stands for HyperText Markup Language. It's the skeleton of a webpage! HTML defines the structure – headings, paragraphs, buttons, and links. Every website uses HTML. It uses 'tags' like <h1> for a big heading and <p> for a paragraph.",
    exampleCode: "<h1>My First Page</h1>\n<p>Hello, I'm learning to code!</p>\n<button>Click me</button>",
    exampleLabel: "Simple HTML",
    funFact: "HTML was invented in 1991. The first website ever is still online!",
  },
  {
    id: "what-is-css",
    title: "What is CSS?",
    emoji: "🎨",
    explanation: "CSS stands for Cascading Style Sheets. If HTML is the skeleton, CSS is the style – colors, fonts, sizes, and layout! With CSS you can make text red, buttons round, or put things in a grid. Same HTML can look totally different with different CSS.",
    exampleCode: "h1 { color: blue; font-size: 24px; }\np { color: gray; }\nbutton { background: green; color: white; }",
    exampleLabel: "CSS makes things pretty",
    funFact: "You can change one CSS file and the whole website can get a new look!",
  },
  {
    id: "what-is-javascript",
    title: "What is JavaScript?",
    emoji: "🟨",
    explanation: "JavaScript is a programming language that runs in your web browser. It makes web pages interactive – when you click a button and something happens, that's often JavaScript! It can do math, work with lists, and talk to the server. Lots of games and apps on the web use JavaScript.",
    funFact: "JavaScript was created in just 10 days in 1995. Now it's one of the most popular languages!",
  },
  {
    id: "what-is-python",
    title: "What is Python?",
    emoji: "🐍",
    explanation: "Python is a programming language named after Monty Python! It's famous for being easy to read and write. People use Python for games, websites, robots, science, and teaching. Many schools teach Python first because it's friendly for beginners.",
    funFact: "Python is used by NASA, Google, and YouTube. Even Minecraft has Python mods!",
  },
  {
    id: "how-web-works",
    title: "How does the web work?",
    emoji: "🔗",
    explanation: "When you type a website address and press Enter, your computer sends a request to a server. The server sends back HTML, CSS, and JavaScript. Your browser puts it all together and shows you the page. You ask, the server answers, and the browser draws the page!",
    funFact: "The 'web' is called that because pages are linked together like a spider's web!",
  },
  {
    id: "what-are-algorithms",
    title: "What are algorithms?",
    emoji: "📐",
    explanation: "An algorithm is a step-by-step recipe to solve a problem. Sorting a list, finding the shortest path, or searching for a word in a document – each has an algorithm. Learning to break problems into clear steps is a core skill in coding.",
    funFact: "The word 'algorithm' comes from the name of a Persian mathematician, Al-Khwarizmi, from over 1,000 years ago!",
  },
  {
    id: "debugging",
    title: "What is debugging?",
    emoji: "🔧",
    explanation: "Debugging is finding and fixing mistakes in your code. When something doesn't work as expected, you look at the error message, add print or console.log to see what's happening, and fix the bug. Every programmer debugs – it's part of the job!",
    funFact: "The first 'bug' was literally a moth stuck in a computer in 1947. Engineers had to 'debug' the machine!",
  },
  {
    id: "what-is-api",
    title: "What is an API?",
    emoji: "🔌",
    explanation: "An API (Application Programming Interface) is how two programs talk to each other. When an app shows the weather or loads your feed, it often calls an API on a server to get data. You send a request and get back data (usually JSON).",
    funFact: "When you check the weather on your phone, the app is calling a weather API to get the latest data!",
  },
  {
    id: "version-control",
    title: "What is version control (Git)?",
    emoji: "📦",
    explanation: "Version control saves different versions of your code so you can go back if something breaks, or work on new features without losing the old code. Git is the most popular tool: you 'commit' snapshots and can branch, merge, and share code with others.",
    funFact: "Git was created by Linus Torvalds, the same person who created Linux!",
  },
  {
    id: "thinking-like-programmer",
    title: "Thinking like a programmer",
    emoji: "💡",
    explanation: "Programming is about breaking big problems into small steps, trying things, and fixing what doesn't work. You don't need to know everything – you need to read, experiment, and use documentation. Start small, test often, and build up.",
    funFact: "Many programmers say the best way to learn is to build something you care about, one small step at a time!",
  },
  // --- React, TypeScript, AI ---
  {
    id: "what-is-react",
    title: "What is React?",
    emoji: "⚛️",
    explanation: "React is a library for building user interfaces with JavaScript. Instead of writing one big page, you build small pieces called components (like a button, a card, or a form) and put them together. React is used by Facebook, Instagram, Netflix, and many apps. It makes building interactive UIs easier!",
    funFact: "React was created by Facebook. Components are like LEGO blocks for the web!",
  },
  {
    id: "what-is-typescript",
    title: "What is TypeScript?",
    emoji: "📘",
    explanation: "TypeScript is JavaScript with types. Types tell the computer what kind of data a variable holds – a number, text, or something else. That helps catch mistakes before you run the code and makes big projects easier to work on. TypeScript turns into JavaScript so it runs everywhere JS runs.",
    funFact: "Many big projects use TypeScript because it helps prevent bugs and makes code easier to understand.",
  },
  {
    id: "what-is-ai",
    title: "What is AI?",
    emoji: "🤖",
    explanation: "AI (Artificial Intelligence) is when computers do things that seem smart – like understanding speech, recognizing images, or making decisions. AI doesn't think like humans; it learns from lots of data and patterns. Chatbots, recommendations, and voice assistants use AI.",
    funFact: "AI can learn to play games, translate languages, and even help doctors spot diseases!",
  },
  {
    id: "ai-ml",
    title: "What is Machine Learning (ML)?",
    emoji: "📊",
    explanation: "Machine Learning is when a computer learns from examples instead of being told every rule. You give it lots of data (like pictures of cats and dogs), and it figures out patterns. Then it can recognize new pictures it hasn't seen before. ML is behind recommendations, face recognition, and many AI features.",
    funFact: "ML can learn to win at games just by playing millions of times!",
  },
  {
    id: "ai-nlp",
    title: "What is NLP?",
    emoji: "💬",
    explanation: "NLP stands for Natural Language Processing. It's how computers understand and work with human language – reading text, understanding meaning, translating, or answering questions. When you talk to a chatbot or use a translator, NLP is involved. It connects human words to what the computer can do.",
    funFact: "NLP helps spell-check, translate between languages, and power voice assistants!",
  },
  {
    id: "ai-deep-learning",
    title: "What is Deep Learning?",
    emoji: "🧠",
    explanation: "Deep Learning is a type of Machine Learning that uses networks with many layers (like a brain with many neurons). These networks can learn very complex patterns – like recognizing faces, understanding speech, or driving a car. Deep learning needs lots of data and powerful computers.",
    funFact: "Deep learning helps with image recognition, speech, and even creating art and music!",
  },
  // --- How AI is evolving ---
  {
    id: "ai-llms",
    title: "What are LLMs?",
    emoji: "📝",
    explanation: "LLMs (Large Language Models) are AI systems trained on huge amounts of text. They can write, answer questions, summarize, and even write code. ChatGPT and similar tools are LLMs. They don't 'know' facts like a database – they predict the next words based on patterns they learned.",
    funFact: "LLMs can write essays, code, and poems – but they can also make mistakes, so it's good to check important answers!",
  },
  {
    id: "vibe-coding",
    title: "What is vibe coding?",
    emoji: "🎸",
    explanation: "Vibe coding means describing what you want in plain language (or a rough sketch) and letting AI help generate the code. You might say 'a button that turns the background blue' and get starter code to tweak. It's still important to understand the code so you can fix and improve it.",
    funFact: "Vibe coding can speed up building UIs and scripts – but learning the basics helps you tell the AI what you really want!",
  },
  {
    id: "agentic-ai",
    title: "What is agentic AI?",
    emoji: "🦾",
    explanation: "Agentic AI is when the AI doesn't just answer one question – it takes a goal and does multiple steps on its own (like searching the web, running code, or using tools). An 'agent' might plan, act, check the result, and try again. It's how AI can help with complex tasks end-to-end.",
    funFact: "Future tools might use agentic AI to help you build a whole app by breaking it into steps and doing each one!",
  },
  {
    id: "ai-evolving",
    title: "How is AI evolving?",
    emoji: "🚀",
    explanation: "AI is getting better at language (LLMs), at following instructions, and at using tools (agentic AI). Coding is changing too: more people use AI to suggest code, fix bugs, or explain things. Learning the fundamentals – variables, logic, how the web works – helps you work with AI and stay in control.",
    funFact: "Learning to code today means you can both write code yourself and work better with AI assistants!",
  },
];
