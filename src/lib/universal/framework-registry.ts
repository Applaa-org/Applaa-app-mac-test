/**
 * Universal Framework Registry
 * 
 * The core system that enables "Prompt to ANY Framework" functionality.
 * This is the foundation for unlimited app building capabilities.
 */

export interface UniversalFramework {
  id: string;
  name: string;
  category: FrameworkCategory;
  platforms: Platform[];
  language: ProgrammingLanguage;
  description: string;

  // Framework Detection
  keywords: string[];
  aliases: string[];

  // Technical Requirements
  prerequisites: string[];
  dependencies: string[];
  devDependencies: string[];
  globalTools: string[];

  // Project Structure
  scaffolding: ProjectScaffolding;
  configFiles: ConfigFile[];

  // Development Workflow
  commands: FrameworkCommands;
  hotReload: boolean;
  buildProcess: BuildConfiguration;

  // Guidance & Documentation
  gettingStarted: string[];
  commonPatterns: CodePattern[];
  troubleshooting: TroubleshootingTip[];

  // Integration
  popularity: number;
  maturity: 'experimental' | 'stable' | 'mature';
  lastUpdated: string;
}

export type FrameworkCategory =
  | 'web-frontend' | 'web-backend' | 'web-fullstack'
  | 'mobile-native' | 'mobile-hybrid' | 'mobile-cross-platform'
  | 'desktop-native' | 'desktop-cross-platform'
  | 'game-engine' | 'game-framework'
  | 'api-framework' | 'microservices'
  | 'cms' | 'ecommerce' | 'blog'
  | 'ai-ml' | 'data-science' | 'analytics'
  | 'iot' | 'embedded' | 'system-programming'
  | 'blockchain' | 'web3'
  | 'testing' | 'automation' | 'devops'
  | 'ui-library' | 'component-library'
  | 'static-site' | 'jamstack'
  | 'educational' | 'visual-blocks';

export type Platform =
  | 'web' | 'ios' | 'android' | 'windows' | 'macos' | 'linux'
  | 'server' | 'cloud' | 'edge' | 'iot' | 'embedded'
  | 'browser-extension' | 'pwa' | 'desktop-app'
  | 'smart-tv' | 'watch' | 'ar' | 'vr';

export type ProgrammingLanguage =
  | 'javascript' | 'typescript' | 'python' | 'rust' | 'go' | 'java'
  | 'kotlin' | 'swift' | 'dart' | 'c#' | 'c++' | 'c' | 'php'
  | 'ruby' | 'elixir' | 'clojure' | 'scala' | 'haskell' | 'f#'
  | 'lua' | 'perl' | 'r' | 'julia' | 'nim' | 'zig' | 'v'
  | 'solidity' | 'assembly' | 'bash' | 'powershell';

export interface ProjectScaffolding {
  structure: DirectoryStructure;
  entryPoint: string;
  configurationFiles: string[];
  initialFiles: InitialFile[];
}

export interface DirectoryStructure {
  [path: string]: 'directory' | 'file' | DirectoryStructure;
}

export interface InitialFile {
  path: string;
  content: string;
  template?: boolean;
}

export interface ConfigFile {
  name: string;
  path: string;
  content: any;
  required: boolean;
}

export interface FrameworkCommands {
  install: string;
  dev: string;
  build: string;
  test?: string;
  lint?: string;
  format?: string;
  deploy?: string;
}

export interface BuildConfiguration {
  outputDir: string;
  assetHandling: 'copy' | 'bundle' | 'optimize';
  optimizations: string[];
  targets: BuildTarget[];
}

export interface BuildTarget {
  platform: Platform;
  format: string;
  configuration: any;
}

export interface CodePattern {
  name: string;
  description: string;
  code: string;
  explanation: string;
}

export interface TroubleshootingTip {
  issue: string;
  solution: string;
  commonCauses: string[];
}

/**
 * The Universal Framework Registry
 * Contains definitions for ALL frameworks we can build with
 */
export const UNIVERSAL_FRAMEWORKS: UniversalFramework[] = [
  // WEB FRONTEND FRAMEWORKS
  {
    id: 'react',
    name: 'React',
    category: 'web-frontend',
    platforms: ['web', 'pwa'],
    language: 'javascript',
    description: 'A JavaScript library for building user interfaces',
    keywords: ['react', 'jsx', 'components', 'virtual dom'],
    aliases: ['reactjs', 'react.js'],
    prerequisites: ['node.js'],
    dependencies: ['react', 'react-dom'],
    devDependencies: ['@vitejs/plugin-react', 'vite'],
    globalTools: ['npm', 'yarn', 'pnpm'],
    scaffolding: {
      structure: {
        'src': {
          'components': 'directory',
          'hooks': 'directory',
          'utils': 'directory',
          'App.jsx': 'file',
          'main.jsx': 'file',
          'index.css': 'file'
        },
        'public': {
          'index.html': 'file'
        }
      },
      entryPoint: 'src/main.jsx',
      configurationFiles: ['vite.config.js', 'package.json'],
      initialFiles: [
        {
          path: 'src/App.jsx',
          content: `import React from 'react'
import './App.css'

function App() {
  return (
    <div className="App">
      <h1>Hello React!</h1>
      <p>Built with Applaa 🚀</p>
    </div>
  )
}

export default App`,
          template: true
        }
      ]
    },
    configFiles: [
      {
        name: 'vite.config.js',
        path: 'vite.config.js',
        content: {
          plugins: ['@vitejs/plugin-react']
        },
        required: true
      }
    ],
    commands: {
      install: 'npm install',
      dev: 'npm run dev',
      build: 'npm run build',
      test: 'npm run test',
      lint: 'npm run lint'
    },
    hotReload: true,
    buildProcess: {
      outputDir: 'dist',
      assetHandling: 'bundle',
      optimizations: ['minification', 'tree-shaking', 'code-splitting'],
      targets: [
        {
          platform: 'web',
          format: 'es',
          configuration: { target: 'es2015' }
        }
      ]
    },
    gettingStarted: [
      'React is a component-based library',
      'Use JSX to write HTML-like syntax in JavaScript',
      'Manage state with useState and useEffect hooks',
      'Break your UI into reusable components'
    ],
    commonPatterns: [
      {
        name: 'Functional Component',
        description: 'A basic React component using hooks',
        code: `function MyComponent({ title }) {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  );
}`,
        explanation: 'This shows a functional component with props and state'
      }
    ],
    troubleshooting: [
      {
        issue: 'Component not rendering',
        solution: 'Check if component is properly exported and imported',
        commonCauses: ['Missing default export', 'Incorrect import path', 'JSX syntax errors']
      }
    ],
    popularity: 95,
    maturity: 'mature',
    lastUpdated: '2024-01-15'
  },

  // FLUTTER FRAMEWORK
  {
    id: 'flutter',
    name: 'Flutter',
    category: 'mobile-cross-platform',
    platforms: ['ios', 'android', 'web', 'windows', 'macos', 'linux'],
    language: 'dart',
    description: "Google's UI toolkit for building natively compiled applications",
    keywords: ['flutter', 'dart', 'mobile', 'cross-platform', 'widgets'],
    aliases: ['flutter-dart'],
    prerequisites: ['flutter-sdk', 'dart-sdk'],
    dependencies: ['flutter'],
    devDependencies: [],
    globalTools: ['flutter', 'dart'],
    scaffolding: {
      structure: {
        'lib': {
          'main.dart': 'file',
          'screens': 'directory',
          'widgets': 'directory',
          'models': 'directory',
          'services': 'directory'
        },
        'assets': {
          'images': 'directory',
          'fonts': 'directory'
        },
        'test': 'directory'
      },
      entryPoint: 'lib/main.dart',
      configurationFiles: ['pubspec.yaml', 'analysis_options.yaml'],
      initialFiles: [
        {
          path: 'lib/main.dart',
          content: `import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: MyHomePage(title: 'Flutter Demo Home Page'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  MyHomePage({Key? key, required this.title}) : super(key: key);

  final String title;

  @override
  _MyHomePageState createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _counter = 0;

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text(
              'You have pushed the button this many times:',
            ),
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.headline4,
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: Icon(Icons.add),
      ),
    );
  }
}`,
          template: true
        }
      ]
    },
    configFiles: [
      {
        name: 'pubspec.yaml',
        path: 'pubspec.yaml',
        content: {
          name: 'my_flutter_app',
          description: 'A new Flutter project built with Applaa',
          version: '1.0.0+1',
          environment: {
            sdk: '>=2.17.0 <4.0.0'
          },
          dependencies: {
            flutter: {
              sdk: 'flutter'
            }
          },
          dev_dependencies: {
            flutter_test: {
              sdk: 'flutter'
            },
            flutter_lints: '^2.0.0'
          }
        },
        required: true
      }
    ],
    commands: {
      install: 'flutter pub get',
      dev: 'flutter run',
      build: 'flutter build',
      test: 'flutter test',
      lint: 'flutter analyze'
    },
    hotReload: true,
    buildProcess: {
      outputDir: 'build',
      assetHandling: 'bundle',
      optimizations: ['ahead-of-time-compilation', 'tree-shaking'],
      targets: [
        {
          platform: 'android',
          format: 'apk',
          configuration: { mode: 'release' }
        },
        {
          platform: 'ios',
          format: 'ipa',
          configuration: { mode: 'release' }
        }
      ]
    },
    gettingStarted: [
      'Flutter uses Dart programming language',
      'Everything is a widget in Flutter',
      'Use StatelessWidget for static UI, StatefulWidget for dynamic UI',
      'Hot reload allows instant code changes during development'
    ],
    commonPatterns: [
      {
        name: 'StatefulWidget',
        description: 'A widget that can change its state',
        code: `class MyWidget extends StatefulWidget {
  @override
  _MyWidgetState createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget> {
  String _text = 'Hello';

  @override
  Widget build(BuildContext context) {
    return Container(
      child: Text(_text),
    );
  }
}`,
        explanation: 'This shows how to create a widget with mutable state'
      }
    ],
    troubleshooting: [
      {
        issue: 'Hot reload not working',
        solution: 'Save the file and ensure no compilation errors exist',
        commonCauses: ['Syntax errors', 'Missing imports', 'Device connection issues']
      }
    ],
    popularity: 88,
    maturity: 'mature',
    lastUpdated: '2024-01-10'
  },

  // PYTHON DJANGO FRAMEWORK
  {
    id: 'django',
    name: 'Django',
    category: 'web-backend',
    platforms: ['server', 'cloud'],
    language: 'python',
    description: 'The web framework for perfectionists with deadlines',
    keywords: ['django', 'python', 'web framework', 'mvc', 'orm'],
    aliases: ['django-python'],
    prerequisites: ['python3', 'pip'],
    dependencies: ['django'],
    devDependencies: ['django-debug-toolbar'],
    globalTools: ['pip', 'virtualenv'],
    scaffolding: {
      structure: {
        'myproject': {
          '__init__.py': 'file',
          'settings.py': 'file',
          'urls.py': 'file',
          'wsgi.py': 'file',
          'asgi.py': 'file'
        },
        'myapp': {
          '__init__.py': 'file',
          'admin.py': 'file',
          'apps.py': 'file',
          'models.py': 'file',
          'views.py': 'file',
          'urls.py': 'file',
          'tests.py': 'file',
          'migrations': 'directory'
        },
        'static': 'directory',
        'templates': 'directory'
      },
      entryPoint: 'manage.py',
      configurationFiles: ['requirements.txt', 'settings.py'],
      initialFiles: [
        {
          path: 'myapp/views.py',
          content: `from django.shortcuts import render
from django.http import HttpResponse

def index(request):
    return HttpResponse("Hello, world! Built with Applaa 🚀")

def home(request):
    return render(request, 'myapp/home.html', {
        'title': 'Welcome to Django'
    })`,
          template: true
        }
      ]
    },
    configFiles: [
      {
        name: 'requirements.txt',
        path: 'requirements.txt',
        content: 'Django>=4.2.0\ndjango-debug-toolbar>=4.0.0',
        required: true
      }
    ],
    commands: {
      install: 'pip install -r requirements.txt',
      dev: 'python manage.py runserver',
      build: 'python manage.py collectstatic',
      test: 'python manage.py test'
    },
    hotReload: true,
    buildProcess: {
      outputDir: 'static',
      assetHandling: 'copy',
      optimizations: ['static-file-compression'],
      targets: [
        {
          platform: 'server',
          format: 'wsgi',
          configuration: { deployment: 'production' }
        }
      ]
    },
    gettingStarted: [
      'Django follows the Model-View-Template (MVT) pattern',
      'Create apps to organize your project functionality',
      'Use the admin interface for quick content management',
      'Django ORM handles database operations'
    ],
    commonPatterns: [
      {
        name: 'Model Definition',
        description: 'Defining a database model',
        code: `from django.db import models

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title`,
        explanation: 'This creates a Post model with title, content, and timestamp'
      }
    ],
    troubleshooting: [
      {
        issue: 'Import errors',
        solution: 'Ensure virtual environment is activated and dependencies are installed',
        commonCauses: ['Missing virtual environment', 'Incorrect Python path', 'Missing dependencies']
      }
    ],
    popularity: 85,
    maturity: 'mature',
    lastUpdated: '2024-01-12'
  },


  // BLOCKLY
  {
    id: 'blockly',
    name: 'Blocklaa',
    category: 'visual-blocks',
    platforms: ['web'],
    language: 'javascript',
    description: 'Visual programming with drag-and-drop logic blocks',
    keywords: ['blockly', 'blocks', 'visual', 'logic', 'scratch', 'drag and drop'],
    aliases: ['google-blockly', 'visual-blocks'],
    prerequisites: [],
    dependencies: ['blockly'],
    devDependencies: [],
    globalTools: [],
    scaffolding: {
      structure: {
        'index.html': 'file',
        'workspace.json': 'file',
        'generated.js': 'file'
      },
      entryPoint: 'index.html',
      configurationFiles: ['workspace.json'],
      initialFiles: [
        {
          path: 'workspace.json',
          content: `{
  "blocks": {
    "languageVersion": 0,
    "blocks": [
      {
        "type": "text_print",
        "id": "start_block",
        "x": 50,
        "y": 50,
        "fields": {
          "TEXT": "Hello from Applaa!"
        }
      }
    ]
  }
}`,
          template: true
        },
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Blockly Workspace</title>
  <script src="https://unpkg.com/blockly/blockly.min.js"></script>
</head>
<body>
  <div id="blocklyDiv" style="height: 480px; width: 600px;"></div>
  <button onclick="runCode()">Run Code</button>
  <div id="output"></div>
</body>
</html>`,
          template: true
        }
      ]
    },
    configFiles: [
      {
        name: 'workspace.json',
        path: 'workspace.json',
        content: {
          blocks: {
            languageVersion: 0,
            blocks: []
          }
        },
        required: true
      }
    ],
    commands: {
      install: 'npm install blockly',
      dev: 'echo "Open index.html in browser"',
      build: 'echo "Export workspace JSON"',
      test: 'echo "Run in browser"'
    },
    hotReload: true,
    buildProcess: {
      outputDir: 'dist',
      assetHandling: 'bundle',
      optimizations: [],
      targets: [
        {
          platform: 'web',
          format: 'es',
          configuration: {}
        }
      ]
    },
    gettingStarted: [
      'Drag blocks from the toolbox to the workspace',
      'Connect blocks together to create logic',
      'Use variables to store values',
      'Add loops to repeat actions',
      'Run your code to see it in action'
    ],
    commonPatterns: [],
    troubleshooting: [],
    popularity: 90,
    maturity: 'mature',
    lastUpdated: '2024-02-01'
  },

  // TODO: Add more frameworks
  // - Vue.js, Angular, Svelte (Web Frontend)
  // - Express.js, FastAPI, Ruby on Rails (Web Backend)  
  // - React Native, Ionic, Xamarin (Mobile)
  // - Electron, Tauri, Qt (Desktop)
  // - Unity, Godot, Unreal (Games)
  // - WordPress, Ghost, Strapi (CMS)
  // - And literally ANY framework users request!
];

/**
 * Framework Detection Engine
 * Analyzes user prompts to identify which framework they want to use
 */
export class FrameworkDetectionEngine {
  static detectFramework(userPrompt: string): UniversalFramework | null {
    const promptLower = userPrompt.toLowerCase();

    for (const framework of UNIVERSAL_FRAMEWORKS) {
      // Check direct name matches
      if (promptLower.includes(framework.name.toLowerCase())) {
        return framework;
      }

      // Check keyword matches
      for (const keyword of framework.keywords) {
        if (promptLower.includes(keyword.toLowerCase())) {
          return framework;
        }
      }

      // Check alias matches
      for (const alias of framework.aliases) {
        if (promptLower.includes(alias.toLowerCase())) {
          return framework;
        }
      }
    }

    return null;
  }

  static suggestFrameworks(userPrompt: string, limit: number = 5): UniversalFramework[] {
    const promptLower = userPrompt.toLowerCase();
    const suggestions: { framework: UniversalFramework; score: number }[] = [];

    for (const framework of UNIVERSAL_FRAMEWORKS) {
      let score = 0;

      // Category relevance
      if (promptLower.includes('mobile') && framework.category.includes('mobile')) score += 3;
      if (promptLower.includes('web') && framework.category.includes('web')) score += 3;
      if (promptLower.includes('desktop') && framework.category.includes('desktop')) score += 3;
      if (promptLower.includes('game') && framework.category.includes('game')) score += 3;

      // Language preference
      if (promptLower.includes(framework.language)) score += 2;

      // Popularity boost
      score += framework.popularity / 100;

      if (score > 0) {
        suggestions.push({ framework, score });
      }
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.framework);
  }
}

/**
 * Universal Project Generator
 * Can generate a project for ANY framework
 */
export class UniversalProjectGenerator {
  static async generateProject(
    framework: UniversalFramework,
    projectName: string,
    userPrompt: string
  ): Promise<{
    success: boolean;
    projectPath: string;
    nextSteps: string[];
    error?: string;
  }> {
    try {
      // 1. Create project directory
      const projectPath = await this.createProjectDirectory(projectName);

      // 2. Generate project structure
      await this.createProjectStructure(framework, projectPath);

      // 3. Generate configuration files
      await this.createConfigurationFiles(framework, projectPath, projectName);

      // 4. Install dependencies (if possible)
      await this.installDependencies(framework, projectPath);

      // 5. Generate next steps
      const nextSteps = this.generateNextSteps(framework, userPrompt);

      return {
        success: true,
        projectPath,
        nextSteps
      };
    } catch (error) {
      return {
        success: false,
        projectPath: '',
        nextSteps: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private static async createProjectDirectory(projectName: string): Promise<string> {
    // Implementation would create the directory
    return `/path/to/${projectName}`;
  }

  private static async createProjectStructure(
    framework: UniversalFramework,
    projectPath: string
  ): Promise<void> {
    // Implementation would create directories and files based on framework.scaffolding
  }

  private static async createConfigurationFiles(
    framework: UniversalFramework,
    projectPath: string,
    projectName: string
  ): Promise<void> {
    // Implementation would generate config files with proper project name substitution
  }

  private static async installDependencies(
    framework: UniversalFramework,
    projectPath: string
  ): Promise<void> {
    // Implementation would run the install command for the framework
  }

  private static generateNextSteps(
    framework: UniversalFramework,
    userPrompt: string
  ): string[] {
    const steps = [
      `Navigate to your project directory`,
      `Run '${framework.commands.dev}' to start development`,
      ...framework.gettingStarted
    ];

    // Add context-specific steps based on user prompt
    if (userPrompt.toLowerCase().includes('api')) {
      steps.push('Create your API endpoints in the appropriate directory');
    }

    if (userPrompt.toLowerCase().includes('database')) {
      steps.push('Set up your database connection and models');
    }

    return steps;
  }
}


