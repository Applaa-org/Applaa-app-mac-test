/**
 * Concept blocks with detailed sub-topics: React, TypeScript, C++, AI.
 * Each sub-topic has multiple sections, bullets, and real-life examples.
 */

export interface BlockSection {
  heading?: string;
  body: string;
  bullets?: string[];
  realLifeExample?: string;
  codeExample?: string;
  codeLanguage?: "javascript" | "typescript" | "jsx" | "cpp" | "python" | "text";
}

export interface BlockSubTopic {
  id: string;
  title: string;
  emoji?: string;
  sections: BlockSection[];
}

export interface ConceptBlock {
  id: string;
  title: string;
  emoji: string;
  description: string;
  subTopics: BlockSubTopic[];
}

export const ACADEMY_CONCEPT_BLOCKS: ConceptBlock[] = [
  // —— Python (concept block with sub-topics) ——
  {
    id: "python",
    title: "Python",
    emoji: "🐍",
    description: "Easy-to-read language for apps, data, and learning. Used by NASA, Google, YouTube.",
    subTopics: [
      {
        id: "py-what",
        title: "What is Python?",
        emoji: "🐍",
        sections: [
          {
            heading: "A friendly programming language",
            body: "Python is a programming language designed to be easy to read and write. It uses indentation to show blocks of code (no curly braces like in C++ or JavaScript), so programs often look clean and readable. It’s used in web apps, data science, automation, games, and teaching.",
          },
          {
            bullets: [
              "Interpreted: Python runs line by line (you don’t compile it to a separate executable like C++).",
              "General purpose: same language for scripts, websites, data analysis, and more.",
              "Huge ecosystem: thousands of libraries for math, graphics, AI, and more.",
            ],
          },
          {
            realLifeExample: "YouTube uses Python for many backend tasks. Scientists use Python (with libraries like NumPy and Pandas) to analyze data from experiments. Many schools teach Python first because beginners can write useful programs quickly.",
          },
        ],
      },
      {
        id: "py-variables-types",
        title: "Variables and data types",
        emoji: "📦",
        sections: [
          {
            heading: "Storing and naming values",
            body: "Variables hold values and have names so you can reuse them. You don’t declare the type—Python figures it out. Common types: int (whole numbers), float (decimals), str (text), bool (True/False), list (ordered collection), dict (key–value pairs).",
          },
          {
            realLifeExample: "In a game, you might have variables like score = 0, player_name = \"Alex\", and lives = 3. The program uses these names everywhere instead of repeating the values.",
          },
          {
            codeExample: "name = \"Sam\"\nage = 10\nprice = 4.99\nis_active = True",
            codeLanguage: "python",
          },
        ],
      },
      {
        id: "py-control-flow",
        title: "Control flow: if, loops",
        emoji: "🔄",
        sections: [
          {
            heading: "Making decisions and repeating",
            body: "if/elif/else run different code based on conditions. for loops repeat over a sequence (e.g. a list or range); while loops repeat until a condition is false. Together they control the flow of your program.",
          },
          {
            realLifeExample: "A quiz app: if the user’s answer == correct_answer, add points (if/else). To show 10 questions, you use a for loop that runs 10 times. To keep asking until the user types “quit,” you’d use a while loop.",
          },
        ],
      },
      {
        id: "py-functions",
        title: "Functions",
        emoji: "⚙️",
        sections: [
          {
            heading: "Reusable blocks of code",
            body: "A function is a named block of code that can take inputs (parameters) and return a value. You define it with def and call it by name. Functions help you avoid repeating code and organize logic.",
          },
          {
            realLifeExample: "A drawing app might have a function draw_circle(x, y, radius). Every time it needs a circle, it calls that function instead of rewriting the same code. Changing how circles look only requires editing one place.",
          },
        ],
      },
      {
        id: "py-data-structures",
        title: "Lists and dictionaries",
        emoji: "📋",
        sections: [
          {
            heading: "Lists (ordered) and dicts (key–value)",
            body: "Lists store multiple values in order; you access by index (0-based). Dictionaries store key–value pairs; you look up by key. Both are used everywhere: lists for scores, items in a cart; dicts for settings, user profiles.",
          },
          {
            realLifeExample: "A to-do app: the list of tasks is a list (e.g. [\"Buy milk\", \"Finish homework\"]). Each task might be a dict: {\"title\": \"Buy milk\", \"done\": False}. You loop over the list and check the \"done\" key to show completed items.",
          },
        ],
      },
    ],
  },

  // —— JavaScript (concept block with sub-topics) ——
  {
    id: "javascript",
    title: "JavaScript",
    emoji: "🟨",
    description: "The language of the web. Runs in browsers and on servers (Node.js).",
    subTopics: [
      {
        id: "js-what",
        title: "What is JavaScript?",
        emoji: "🟨",
        sections: [
          {
            heading: "The language of the web",
            body: "JavaScript runs in almost every web browser. It makes pages interactive: buttons, forms, animations, and loading new content without reloading. It’s also used on the server (Node.js), so one language can power both front-end and back-end.",
          },
          {
            bullets: [
              "You don’t install it in the browser—it’s built in.",
              "Works with HTML (structure) and CSS (style) to build full web apps.",
              "Used by Google, Facebook, Netflix, and millions of sites.",
            ],
          },
          {
            realLifeExample: "When you click “Add to cart” and the number updates without the page reloading, that’s JavaScript. When you type in a search box and suggestions appear below, that’s JavaScript talking to the server and updating the page.",
          },
        ],
      },
      {
        id: "js-variables-types",
        title: "Variables and types",
        emoji: "📦",
        sections: [
          {
            heading: "let, const, and dynamic types",
            body: "JavaScript has let (can change) and const (shouldn’t be reassigned). Values have types (number, string, boolean, object, array), but you don’t declare the type—JS is dynamically typed. typeof helps you check at runtime.",
          },
          {
            realLifeExample: "In a form, you might have const form = document.querySelector('form') (the form element never changes), and let errorMessage = '' (the message can change when the user fixes an error).",
          },
        ],
      },
      {
        id: "js-dom",
        title: "The DOM and the browser",
        emoji: "🌐",
        sections: [
          {
            heading: "Changing the page with code",
            body: "The Document Object Model (DOM) is how JavaScript sees the page: every tag is an object. You can find elements (e.g. by id or class), change their text or style, add or remove elements, and listen for events (click, type, scroll).",
          },
          {
            realLifeExample: "When you click “Like,” JavaScript finds the like count element, reads the number, adds 1, and writes it back. It might also change the button colour and send a request to the server to save the like. All of that is JS using the DOM and network.",
          },
        ],
      },
      {
        id: "js-async",
        title: "Async: callbacks, promises",
        emoji: "⏳",
        sections: [
          {
            heading: "Waiting for the server or timer",
            body: "Requests to the server take time. JavaScript doesn’t block the page; it uses callbacks or Promises (async/await) to run code when the response arrives. Same idea for timers (setTimeout, setInterval) and animations.",
          },
          {
            realLifeExample: "When you load a weather app, it sends a request to a weather API. The rest of the page stays clickable. When the data comes back, a Promise resolves and your code updates the screen with temperature and conditions. That’s async programming.",
          },
        ],
      },
      {
        id: "js-ecosystem",
        title: "Where JavaScript runs",
        emoji: "🚀",
        sections: [
          {
            body: "JavaScript runs in the browser (Chrome, Firefox, Safari, etc.) and on the server with Node.js. Frameworks like React or Vue help build complex UIs; Express helps build APIs. Same language, different environments.",
          },
          {
            realLifeExample: "A chat app might use JavaScript in the browser for the UI and real-time updates, and Node.js on the server to handle connections and store messages. Both sides can share similar code (e.g. validating a message).",
          },
        ],
      },
    ],
  },

  // —— React JS ——
  {
    id: "react",
    title: "React JS",
    emoji: "⚛️",
    description: "Build user interfaces with components. Used by Facebook, Instagram, Netflix.",
    subTopics: [
      {
        id: "react-what",
        title: "What is React?",
        emoji: "⚛️",
        sections: [
          {
            heading: "A library for building UIs",
            body: "React is a JavaScript library created by Facebook. It helps you build user interfaces by breaking them into small, reusable pieces called components. Instead of writing one huge HTML file, you build many small components and combine them.",
          },
          {
            bullets: [
              "React is used for the part of the app the user sees (front-end).",
              "You write components in JavaScript (and often JSX, which looks like HTML inside JS).",
              "React updates only what changed on the screen, which keeps apps fast.",
            ],
          },
          {
            heading: "Why use React?",
            body: "React makes it easier to manage complex UIs. When data changes, React figures out what to update on the screen. You describe what the UI should look like for a given state, and React keeps the screen in sync.",
          },
          {
            realLifeExample: "Instagram and Facebook use React. When you like a post, only that like button and counter update—the rest of the page doesn’t reload. That’s React updating just the changed part.",
          },
          {
            codeExample: "function Welcome({ name }) {\n  return <h1>Hello, {name}!</h1>;\n}\n// Usage: <Welcome name=\"Sam\" />",
            codeLanguage: "jsx",
          },
        ],
      },
      {
        id: "react-components",
        title: "Components",
        emoji: "🧩",
        sections: [
          {
            heading: "What is a component?",
            body: "A component is a piece of the UI that you can reuse. It can be as small as a button or as big as a whole page. Each component is a function (or class) that returns what to show on the screen.",
          },
          {
            bullets: [
              "Components take inputs called props (properties).",
              "They return a description of the UI (often written in JSX).",
              "You can use one component inside another to build complex UIs.",
            ],
          },
          {
            realLifeExample: "On a shopping site, a “Product card” component might show image, title, price, and “Add to cart.” That same component is reused for every product—only the props (image URL, title, price) change.",
          },
          {
            codeExample: "function ProductCard({ name, price }) {\n  return (\n    <div>\n      <h3>{name}</h3>\n      <p>${price}</p>\n    </div>\n  );\n}",
            codeLanguage: "jsx",
          },
        ],
      },
      {
        id: "react-jsx",
        title: "JSX",
        emoji: "📝",
        sections: [
          {
            heading: "HTML-like syntax in JavaScript",
            body: "JSX lets you write something that looks like HTML inside your JavaScript. Under the hood, tools turn JSX into JavaScript function calls. That’s why you can mix logic and layout in one place.",
          },
          {
            bullets: [
              "Use curly braces {} to put JavaScript expressions inside JSX (e.g. variables, math).",
              "Tags must be closed (e.g. <div>...</div>).",
              "The main component returns one top-level element (or a Fragment).",
            ],
          },
          {
            realLifeExample: "When a weather app shows “It’s 22°C and sunny,” the temperature comes from data. In JSX you’d write something like: <p>It's {temperature}°C and {condition}</p>. When the data changes, the text updates.",
          },
        ],
      },
      {
        id: "react-props-state",
        title: "Props and State",
        emoji: "📦",
        sections: [
          {
            heading: "Props (inputs from outside)",
            body: "Props are how a parent component passes data to a child. They are read-only. The child cannot change its props; only the parent can pass new ones.",
          },
          {
            heading: "State (data inside a component)",
            body: "State is data that belongs to a component and can change over time (e.g. whether a modal is open, the value of an input). When you update state, React re-renders the component so the screen matches the new state.",
          },
          {
            realLifeExample: "A “Like” button: the count comes from props (how many likes from the server). Whether the button is “pressed” on your screen is state. When you click, state updates and the UI shows “Liked” until the server confirms.",
          },
        ],
      },
      {
        id: "react-hooks",
        title: "Hooks (useState, useEffect)",
        emoji: "🪝",
        sections: [
          {
            heading: "useState",
            body: "useState lets you add state to a function component. You call it with the initial value; it returns the current value and a function to update it. When you call the update function, React re-renders with the new value.",
          },
          {
            heading: "useEffect",
            body: "useEffect lets you run code after render—for example, fetching data from a server, subscribing to events, or updating the document title. You say when it should run (e.g. once on mount, or when a value changes).",
          },
          {
            realLifeExample: "A chat app: useState holds the list of messages; when a new message arrives, you update state and the list re-renders. useEffect might run once to connect to the server and subscribe to new messages, then update state when they arrive.",
          },
        ],
      },
    ],
  },

  // —— TypeScript ——
  {
    id: "typescript",
    title: "TypeScript",
    emoji: "📘",
    description: "JavaScript with types. Catch bugs early and build bigger apps with confidence.",
    subTopics: [
      {
        id: "ts-what",
        title: "What is TypeScript?",
        emoji: "📘",
        sections: [
          {
            heading: "JavaScript plus types",
            body: "TypeScript is a language that extends JavaScript by adding types. Types describe what kind of value a variable holds (number, string, array, object, etc.). Your code is checked by the TypeScript compiler before it runs, so many mistakes are caught in the editor.",
          },
          {
            bullets: [
              "TypeScript compiles to JavaScript, so it runs anywhere JavaScript runs.",
              "You can add types gradually to an existing JavaScript project.",
              "Editors use types to give better autocomplete and error messages.",
            ],
          },
          {
            realLifeExample: "If a function is supposed to take a user’s age (a number) and you pass a string by mistake, TypeScript will show an error before you run the code. In plain JavaScript, that bug might only show up when a user gets wrong behaviour.",
          },
          {
            codeExample: "function greet(name: string): string {\n  return \"Hello, \" + name;\n}\ngreet(\"Alex\");  // OK\ngreet(123);    // Error: number not allowed",
            codeLanguage: "typescript",
          },
        ],
      },
      {
        id: "ts-types",
        title: "Basic types",
        emoji: "🔤",
        sections: [
          {
            heading: "Primitive types",
            body: "You can label variables and parameters with types like number, string, boolean, and null or undefined. Once a variable is a string, you can’t assign a number to it unless the type allows it.",
          },
          {
            bullets: [
              "number – integers and decimals",
              "string – text",
              "boolean – true or false",
              "array – e.g. number[] or string[]",
              "object – shape described with interfaces or types",
            ],
          },
          {
            codeExample: "let age: number = 10;\nlet name: string = \"Sam\";\nlet scores: number[] = [90, 85, 88];",
            codeLanguage: "typescript",
          },
        ],
      },
      {
        id: "ts-interfaces",
        title: "Interfaces and object shapes",
        emoji: "📐",
        sections: [
          {
            heading: "Describing objects",
            body: "Interfaces define the shape of an object: which properties it has and their types. When you pass an object to a function that expects an interface, TypeScript checks that the object has the right properties and types.",
          },
          {
            realLifeExample: "In a game, a “Player” might have name (string), score (number), and level (number). You define an interface Player and use it everywhere. If someone adds a typo like “scroe” instead of “score,” TypeScript will point it out.",
          },
          {
            codeExample: "interface Player {\n  name: string;\n  score: number;\n  level: number;\n}\nconst p: Player = { name: \"Alex\", score: 100, level: 2 };",
            codeLanguage: "typescript",
          },
        ],
      },
      {
        id: "ts-why",
        title: "Why use TypeScript?",
        emoji: "✅",
        sections: [
          {
            body: "TypeScript helps in big projects and teams. The compiler catches type errors before you run or deploy. Editors can suggest properties and show documentation. Refactoring (e.g. renaming a function) is safer because the compiler finds every place that needs to change.",
          },
          {
            realLifeExample: "Large codebases like VS Code and many enterprise apps use TypeScript. When hundreds of developers work on the same app, types act as living documentation and reduce bugs from wrong argument types or typos.",
          },
        ],
      },
    ],
  },

  // —— C++ ——
  {
    id: "cpp",
    title: "C++",
    emoji: "⚡",
    description: "Powerful language for games, operating systems, and performance-critical software.",
    subTopics: [
      {
        id: "cpp-what",
        title: "What is C++?",
        emoji: "⚡",
        sections: [
          {
            heading: "Fast and close to the hardware",
            body: "C++ is a programming language that gives you a lot of control over how the computer works. Code is compiled into machine code, so it runs very fast. It’s used when speed and control matter: games, browsers, operating systems, robots, and scientific software.",
          },
          {
            bullets: [
              "C++ is “compiled”: your source code is turned into an executable file that the CPU runs directly.",
              "You manage memory and resources more explicitly than in Python or JavaScript.",
              "It supports both procedural and object-oriented style (classes, inheritance).",
            ],
          },
          {
            realLifeExample: "Most big game engines (e.g. Unreal Engine) are written in C++. Games need to draw millions of pixels every second and react to input with minimal delay—C++’s speed makes that possible.",
          },
        ],
      },
      {
        id: "cpp-variables-types",
        title: "Variables and types",
        emoji: "🔢",
        sections: [
          {
            heading: "You must declare types",
            body: "In C++, every variable has a type (int, double, char, bool, etc.) and you must declare it. The compiler uses that to allocate the right amount of memory and catch type errors.",
          },
          {
            codeExample: "int age = 12;\ndouble price = 9.99;\nchar grade = 'A';\nbool passed = true;",
            codeLanguage: "cpp",
          },
          {
            realLifeExample: "In a racing game, the car’s speed might be stored as a float (e.g. 120.5 km/h). The lap count is an integer. Using the right type keeps calculations accurate and uses memory efficiently.",
          },
        ],
      },
      {
        id: "cpp-pointers",
        title: "Pointers and memory",
        emoji: "📍",
        sections: [
          {
            heading: "Pointers store addresses",
            body: "A pointer is a variable that holds the memory address of another variable. C++ lets you work with addresses directly so you can write very efficient code, but you must be careful not to use invalid memory.",
          },
          {
            bullets: [
              "Pointers are used for dynamic data structures, arrays, and when you need to pass large data without copying.",
              "References are like “nicknames” for a variable—another name for the same place in memory.",
            ],
          },
          {
            realLifeExample: "In a game, a “bullet” object might hold a pointer to the “enemy” it’s targeting. When the bullet hits, the game follows the pointer to update that enemy’s health—no need to search through all enemies.",
          },
        ],
      },
      {
        id: "cpp-classes",
        title: "Classes and objects",
        emoji: "🏗️",
        sections: [
          {
            heading: "Object-oriented programming",
            body: "C++ supports classes: blueprints for objects that have data (member variables) and behaviour (member functions). You can use inheritance to extend classes and reuse code.",
          },
          {
            realLifeExample: "A game might have a base class “Enemy” with health and an “takeDamage()” function. “Boss” and “Minion” could be different classes that inherit from Enemy and add their own behaviour (e.g. boss has multiple phases).",
          },
          {
            codeExample: "class Robot {\npublic:\n  int battery;\n  void move() { /* ... */ }\n};\nRobot r;\nr.battery = 100;\nr.move();",
            codeLanguage: "cpp",
          },
        ],
      },
      {
        id: "cpp-where-used",
        title: "Where C++ is used",
        emoji: "🌍",
        sections: [
          {
            body: "C++ is used in operating systems (Windows, Linux, macOS), browsers (Chrome, Firefox), game engines (Unreal, many AAA games), embedded systems (cars, drones, IoT), and high-frequency trading. Whenever performance and control are critical, C++ is often the choice.",
          },
          {
            realLifeExample: "Spacecraft and Mars rovers run C++ (or C) because they need reliable, efficient code that runs on limited hardware. Self-driving car software also uses C++ for real-time sensor processing.",
          },
        ],
      },
    ],
  },

  // —— AI (detailed, many sub-topics and real-life examples) ——
  {
    id: "ai",
    title: "AI & Machine Learning",
    emoji: "🤖",
    description: "How machines learn from data: ML, NLP, vision, and real-world applications.",
    subTopics: [
      {
        id: "ai-what",
        title: "What is Artificial Intelligence?",
        emoji: "🤖",
        sections: [
          {
            heading: "Machines doing “smart” tasks",
            body: "Artificial Intelligence (AI) means getting computers to do things that usually need human intelligence: understanding language, recognizing images, making decisions, or playing games. AI doesn’t mean the machine “thinks” like a human; it means we build systems that behave in smart ways, often by learning from data.",
          },
          {
            bullets: [
              "Narrow AI: good at one task (e.g. face unlock, translation, recommendations).",
              "We don’t have human-level “general” AI yet—today’s AI is narrow but very useful.",
              "AI is used in phones, websites, cars, hospitals, and homes.",
            ],
          },
          {
            realLifeExample: "When you ask your phone “What’s the weather?” and it answers, that’s AI (speech recognition + understanding + answering). When Netflix suggests a show you like, that’s AI (recommendation system). When a camera recognizes your face to unlock the phone, that’s AI (face recognition).",
          },
        ],
      },
      {
        id: "ai-ml-intro",
        title: "What is Machine Learning?",
        emoji: "📊",
        sections: [
          {
            heading: "Learning from examples",
            body: "Machine Learning (ML) is when a computer learns from data instead of being programmed with every rule. You give it many examples (e.g. pictures of cats and dogs with labels), and it finds patterns. Then it can handle new examples it hasn’t seen before (e.g. classify a new photo as cat or dog).",
          },
          {
            bullets: [
              "Supervised learning: you have labeled data (inputs and correct outputs); the model learns to predict the output for new inputs.",
              "Unsupervised learning: no labels; the model finds structure (e.g. groups of similar items).",
              "Reinforcement learning: the model learns by trying actions and getting rewards or penalties (e.g. a game or robot).",
            ],
          },
          {
            realLifeExample: "Email spam filters use ML. They’re trained on millions of emails marked “spam” or “not spam.” The model learns patterns (certain words, senders, links) and then labels new emails. You rarely have to write rules like “if it says ‘winner’ then spam”—the model learns that from data.",
          },
        ],
      },
      {
        id: "ai-supervised",
        title: "Supervised learning in real life",
        emoji: "🎯",
        sections: [
          {
            heading: "Learning from input–output pairs",
            body: "In supervised learning, each training example has an input and the correct output. The model’s job is to learn a rule that maps inputs to outputs. After training, you give it new inputs and it predicts the output.",
          },
          {
            bullets: [
              "Classification: predict a category (e.g. spam or not, cat or dog, disease or healthy).",
              "Regression: predict a number (e.g. house price, temperature, sales next month).",
            ],
          },
          {
            realLifeExample: "Doctors use ML to help detect diseases. For example, a model is trained on thousands of X-rays where experts have marked “has tumour” or “no tumour.” For a new X-ray, the model suggests whether it sees something that might need a closer look. The doctor still makes the final decision.",
          },
          {
            realLifeExample: "Streaming apps predict what you might want to watch next. They use your history (what you watched, how long, what you skipped) as inputs and “would enjoy this” as the output. The model learns patterns and recommends similar content.",
          },
        ],
      },
      {
        id: "ai-nlp",
        title: "Natural Language Processing (NLP)",
        emoji: "💬",
        sections: [
          {
            heading: "Computers understanding and using language",
            body: "NLP is the part of AI that works with human language: text and speech. It includes reading and understanding text, translating between languages, answering questions, summarizing, detecting sentiment, and generating text. Voice assistants, chatbots, and translators all use NLP.",
          },
          {
            bullets: [
              "Text classification: is this review positive or negative? Is this email urgent?",
              "Named entity recognition: find people, places, dates in text.",
              "Machine translation: translate from one language to another.",
              "Question answering and chatbots: understand a question and produce an answer.",
            ],
          },
          {
            realLifeExample: "When you type “restaurants near me” in a search engine, NLP understands that you want places to eat and “near me” means your location. The engine then combines that with maps and business data to show results.",
          },
          {
            realLifeExample: "Customer support chatbots use NLP to understand “I want to return my order” and then either answer from a knowledge base or hand off to a human. They’re trained on many real conversations so they can handle different ways of asking the same thing.",
          },
        ],
      },
      {
        id: "ai-vision",
        title: "Computer vision",
        emoji: "👁️",
        sections: [
          {
            heading: "Teaching machines to “see”",
            body: "Computer vision is AI that works with images and video. Tasks include recognizing objects, detecting faces, reading text in images (OCR), and understanding scenes. Models are trained on huge sets of labeled images so they learn what things look like.",
          },
          {
            bullets: [
              "Image classification: what is in this image? (e.g. dog, car, beach).",
              "Object detection: where are the cars or people in this image? (draw boxes).",
              "Face recognition: whose face is this? (used in unlock, photo tagging).",
            ],
          },
          {
            realLifeExample: "Self-checkout in stores uses computer vision. The camera above the belt “sees” what you put down and identifies items (fruit, packaged goods). It can also detect if you put something in the bag without scanning—all in real time.",
          },
          {
            realLifeExample: "Social media uses face detection to suggest who to tag in a photo. The system finds faces in the image and matches them to profiles (with your permission). That’s object detection plus recognition.",
          },
        ],
      },
      {
        id: "ai-deep-learning",
        title: "Deep learning and neural networks",
        emoji: "🧠",
        sections: [
          {
            heading: "Layers that learn features",
            body: "Deep learning uses neural networks with many layers. Each layer learns increasingly abstract features: early layers might learn edges and textures, later layers learn shapes and objects. Given enough data and computing power, deep networks can learn very complex patterns.",
          },
          {
            bullets: [
              "Neural networks are inspired by the brain: many simple “neurons” connected in layers.",
              "Training means adjusting millions of parameters (weights) so the network’s predictions match the right answers.",
              "Deep learning has driven big improvements in vision, speech, and language.",
            ],
          },
          {
            realLifeExample: "Voice assistants (Siri, Alexa, Google) use deep learning for speech recognition. The network turns sound waves into text. It was trained on huge amounts of recorded speech with transcripts, so it learned to handle different accents, noise, and ways of speaking.",
          },
          {
            realLifeExample: "Recommendation systems (YouTube, TikTok, shopping sites) use deep networks to predict what you’ll like. They take your behaviour (clicks, watch time, likes) and item data as input and learn complex patterns—far beyond simple “people who bought A also bought B.”",
          },
        ],
      },
      {
        id: "ai-ethics",
        title: "AI in the world: benefits and care",
        emoji: "⚖️",
        sections: [
          {
            heading: "Where AI helps",
            body: "AI helps in healthcare (diagnosis support, drug discovery), education (personalized learning), accessibility (screen readers, captioning), safety (fraud detection, crash avoidance), and the environment (optimizing energy, monitoring wildlife).",
          },
          {
            heading: "Using AI responsibly",
            body: "AI can also cause harm if we’re not careful: biased decisions (e.g. unfair hiring or loans), privacy issues (how data is collected and used), and reliance on systems we don’t fully understand. Researchers and companies work on making AI fair, transparent, and safe.",
          },
          {
            realLifeExample: "Some hospitals use AI to flag patients who might need extra care. The model looks at vital signs and history. But if the training data was biased (e.g. certain groups were under-represented), the model might be less accurate for those groups. So we need to check for bias and keep humans in the loop for important decisions.",
          },
        ],
      },
      {
        id: "ai-careers",
        title: "AI and you",
        emoji: "🚀",
        sections: [
          {
            body: "You don’t have to be a PhD to use AI. You can use existing tools (APIs, no-code platforms) to add recommendations, chatbots, or image recognition to your projects. Learning the basics of ML and data helps you understand what’s possible and what’s not. Coding (Python, for example) is often used to train and run ML models, so your programming skills are a great start.",
          },
          {
            realLifeExample: "Lots of apps add “smart” features with pre-trained models: an art app might use a style-transfer model, a writing app might use a language model for suggestions. Learning how these work helps you build the next generation of tools.",
          },
        ],
      },
    ],
  },
];

export type ConceptBlockId = "python" | "javascript" | "react" | "typescript" | "cpp" | "ai";

export function getConceptBlock(id: ConceptBlockId): ConceptBlock | undefined {
  return ACADEMY_CONCEPT_BLOCKS.find((b) => b.id === id);
}

export function getBlockSubTopic(blockId: ConceptBlockId, subTopicId: string): BlockSubTopic | undefined {
  const block = getConceptBlock(blockId);
  return block?.subTopics.find((s) => s.id === subTopicId);
}

/** All block IDs that have only concept content (no interactive code lessons in academyLessons). */
export const CONCEPT_ONLY_BLOCK_IDS: ConceptBlockId[] = ["react", "typescript", "cpp", "ai"];
