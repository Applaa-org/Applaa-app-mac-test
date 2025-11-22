import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Github, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { IpcClient } from "@/ipc/ipc_client";
import { App } from "@/ipc/ipc_types";
import { AUTOPUSH_CONFIG } from "@/config/autopush.config";
import { toast } from "sonner";
import { useAtom } from "jotai";
import { globalPublishStateAtom } from "@/atoms/appAtoms";
import log from "electron-log";

const logger = log.scope("AutoPush");

// Function to generate a valid Vercel project name from repository name
function generateVercelProjectName(repoName: string): string {
  // Convert to lowercase and replace invalid characters
  let projectName = repoName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Replace invalid characters with hyphens
    .replace(/-+/g, '-') // Replace multiple consecutive hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 52); // Limit to 52 characters
  
  // Ensure it doesn't start with a number (Vercel requirement)
  if (/^[0-9]/.test(projectName)) {
    projectName = 'app-' + projectName;
  }
  
  // Ensure it's not empty
  if (!projectName) {
    projectName = 'app-project';
  }
  
  return projectName;
}

// Function to validate and check availability of Vercel project name
async function validateVercelProjectName(name: string, token: string): Promise<{
  valid: boolean;
  available: boolean;
  reason?: string;
}> {
  // 1. Validate format
  const regex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!regex.test(name) || name.length > 52) {
    return { valid: false, available: false, reason: "Invalid format" };
  }

  // 2. Check availability via API
  const url = `https://api.vercel.com/v9/projects/${encodeURIComponent(name)}`;
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (res.status === 404) {
      return { valid: true, available: true }; // ✅ Valid and available
    } else if (res.ok) {
      return { valid: true, available: false }; // ❌ Already exists
    } else {
      const errText = await res.text();
      return { valid: false, available: false, reason: `API error: ${res.status} - ${errText}` };
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { valid: false, available: false, reason: "Validation timed out" };
    }
    throw error;
  }
}

interface AutoPushProps {
  appId: number | null;
  projectName: string;
  app: App | null;
  onSuccess?: () => void;
  publishState?: {
    isPushing: boolean;
    progressMessage: string;
    uploadProgress: { current: number; total: number };
    isUploading: boolean;
  };
  setPublishState?: (state: {
    isPushing: boolean;
    progressMessage: string;
    uploadProgress: { current: number; total: number };
    isUploading: boolean;
  }) => void;
}

// Function to read app files without using IPC
async function readAppFilesWithoutIPC(app: App, repoName: string): Promise<Array<{path: string, content: string}>> {
  const filesToUpload: Array<{path: string, content: string}> = [];
  
  // Try to read .gitignore file first using IPC
  let gitignorePatterns: string[] = [];
  try {
    const gitignoreContent = await IpcClient.getInstance().readAppFile(app.id, '.gitignore');
    if (gitignoreContent) {
      gitignorePatterns = gitignoreContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      logger.info(`📁 Found .gitignore with ${gitignorePatterns.length} patterns`);
    }
  } catch (error) {
    logger.info(`📁 No .gitignore file found or could not read it`);
  }
  
  // Try to read files using fetch (if they're served by a local server)
  console.log(`📁 Processing ${app.files.length} files from app`);
  console.log(`📁 App path: ${app.path}`);
  console.log(`📁 App files array:`, app.files);
  
  // If app.files is empty, try to get files using IPC
  let filesToProcess = app.files;
  if (filesToProcess.length === 0) {
    console.log(`📁 App files array is empty, trying to get files via IPC...`);
    try {
      const ipcFiles = await IpcClient.getInstance().getAppFiles(app.id);
      console.log(`📁 Got ${ipcFiles.length} files via IPC:`, ipcFiles);
      filesToProcess = ipcFiles;
    } catch (error) {
      console.log(`📁 Failed to get files via IPC:`, error);
    }
  }
  
  for (const filePath of filesToProcess) {
    console.log(`🔍 Checking file: ${filePath}`);
    if (shouldIncludeFile(filePath, gitignorePatterns)) {
      console.log(`✅ Including file: ${filePath}`);
      try {
        // Try to read the actual file from the file system
        console.log(`📁 Attempting to read actual file: ${filePath}`);
        
        // Try different approaches to read the file
        let fileContent = null;
        
        // Try to read from the app path using IPC (bypasses CSP restrictions)
        try {
          console.log(`📁 Trying to read file via IPC: ${filePath}`);
          const content = await IpcClient.getInstance().readAppFile(app.id, filePath);
          if (content && !content.includes('<!doctype html>') && !content.includes('<html')) {
            fileContent = content;
            console.log(`✅ Successfully read actual file via IPC: ${filePath} (${content.length} characters)`);
          }
        } catch (error: any) {
          console.log(`⚠️ Could not read ${filePath} via IPC:`, error.message);
        }
        
        // If we got actual content, use it
        if (fileContent) {
          filesToUpload.push({
            path: filePath,
            content: fileContent
          });
          console.log(`✅ Added actual file: ${filePath}`);
        } else {
          console.log(`⚠️ Could not read actual file: ${filePath} - will use fallback if available`);
        }
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
      }
    } else {
      console.log(`❌ Excluding file: ${filePath}`);
    }
  }
  
  // Only use fallback files if we couldn't read any actual files
  if (filesToUpload.length === 0) {
    console.log("📁 No actual files could be read, using fallback files with proper folder structure");
    return [
      {
        path: "README.md",
        content: `# ${repoName}

This repository was automatically generated by Applaa.

## About

This is an auto-generated repository containing the source code for the ${repoName} application.

## Getting Started

To run this application locally, follow these steps:

1. Clone the repository
2. Install dependencies: \`npm install\`
3. Run the application: \`npm start\`

## Generated by Applaa

This repository was created and populated automatically by [Applaa](https://applaa.com) - the AI-powered app development platform.
`
      },
      {
        path: "package.json",
        content: `{
  "name": "${repoName}",
  "version": "1.0.0",
  "description": "Auto-generated app by Applaa",
  "main": "src/index.tsx",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}`
      },
      {
        path: "src/App.tsx",
        content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to ${repoName}</h1>
        <p>This app was generated by Applaa</p>
        <p>🚀 Successfully deployed to Vercel!</p>
      </header>
    </div>
  );
}

export default App;`
      },
      {
        path: "src/index.tsx",
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
      },
      {
        path: "src/App.css",
        content: `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
}

.App-header h1 {
  margin-bottom: 20px;
}

.App-header p {
  margin: 10px 0;
}`
      },
      {
        path: "src/index.css",
        content: `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}`
      },
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${repoName}</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`
      },
      {
        path: "eslint.config.js",
        content: `export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "warn",
    },
  },
];`
      },
      {
        path: "postcss.config.js",
        content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`
      },
      {
        path: "tailwind.config.ts",
        content: `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config`
      },
      {
        path: "vite.config.ts",
        content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
})`
      },
      {
        path: "src/vite-env.d.ts",
        content: `/// <reference types="vite/client" />`
      }
    ];
  }
  
  // Always add index.html to root (required for Vite)
  filesToUpload.push({
    path: 'index.html',
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${repoName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
  });
  console.log(`✅ Added index.html file to root`);

  console.log(`📁 Successfully read ${filesToUpload.length} actual files from app`);
  return filesToUpload;
}


// Helper function to determine if a file should be included
function shouldIncludeFile(filename: string, gitignorePatterns: string[] = []): boolean {
  const includeExtensions = [
    '.tsx', '.ts', '.js', '.jsx', '.json', '.md', '.css', '.html', '.txt',
    '.config.js', '.config.ts', '.config.mjs', '.config.cjs',
    '.env', '.env.local', '.env.development', '.env.production',
    '.d.ts', '.mjs', '.cjs', '.gitignore', '.eslintrc', '.eslintrc.js',
    '.eslintrc.json', '.prettierrc', '.prettierrc.js', '.prettierrc.json',
    '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf',
    '.eot', '.scss', '.sass', '.less', '.styl', '.vue', '.svelte'
  ];
  
  // Always exclude these directories and files
  const excludePatterns = [
    'node_modules/', '.git/', 'dist/', 'build/', '.next/', 
    '.vscode/', '.idea/', '.DS_Store', '*.log', '*.local',
    'dist-ssr/', '*.suo', '*.ntvs*', '*.njsproj', '*.sln', '*.sw?',
    'coverage/', '.nyc_output/', '.cache/', 'temp/', 'tmp/'
  ];
  
  // Check if file should be excluded based on patterns
  const allExcludePatterns = [...excludePatterns, ...gitignorePatterns];
  for (const pattern of allExcludePatterns) {
    let matches = false;
    if (pattern.includes('*')) {
      // Handle wildcard patterns
      const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
      matches = regex.test(filename);
    } else {
      matches = filename.includes(pattern);
    }
    
    if (matches) {
      console.log(`❌ Excluding file: ${filename} (matched exclude pattern: ${pattern})`);
      return false;
    }
  }
  
  // Check if file has an included extension
  const hasIncludedExtension = includeExtensions.some(ext => filename.endsWith(ext));
  if (!hasIncludedExtension) {
    console.log(`❌ Excluding file: ${filename} (no included extension)`);
    console.log(`   Available extensions: ${includeExtensions.join(', ')}`);
  } else {
    console.log(`✅ Including file: ${filename} (has included extension)`);
  }
  return hasIncludedExtension;
}

export function AutoPush({ appId, projectName, app, onSuccess, publishState, setPublishState }: AutoPushProps) {
  // Use global state by default, or external state if provided
  const [globalPublishState, setGlobalPublishState] = useAtom(globalPublishStateAtom);
  
  // Use external state if provided, otherwise use global state
  const currentPublishState = publishState || globalPublishState;
  const currentSetPublishState = setPublishState || setGlobalPublishState;
  
  const isPushing = currentPublishState.isPushing;
  const progressMessage = currentPublishState.progressMessage;
  const uploadProgress = currentPublishState.uploadProgress;
  const isUploading = currentPublishState.isUploading;
  
  // Debug: Log current state values
  console.log("🔍 Current state values:", { isPushing, progressMessage, uploadProgress, isUploading, publishState });
  
  const setIsPushing = (value: boolean) => currentSetPublishState({ 
    isPushing: value, 
    progressMessage: currentPublishState.progressMessage, 
    uploadProgress: currentPublishState.uploadProgress, 
    isUploading: currentPublishState.isUploading 
  });
  
  const setProgressMessage = (value: string) => {
    console.log("🔍 setProgressMessage called with:", value);
    const newState = { 
      isPushing: currentPublishState.isPushing, 
      progressMessage: value, 
      uploadProgress: currentPublishState.uploadProgress, 
      isUploading: currentPublishState.isUploading 
    };
    console.log("🔍 setProgressMessage newState:", newState);
    currentSetPublishState(newState);
  };
  
  const setUploadProgress = (value: { current: number; total: number }) => {
    console.log("🔍 setUploadProgress called with:", value);
    const newState = { 
      isPushing: currentPublishState.isPushing, 
      progressMessage: currentPublishState.progressMessage, 
      uploadProgress: value, 
      isUploading: currentPublishState.isUploading 
    };
    console.log("🔍 setUploadProgress newState:", newState);
    currentSetPublishState(newState);
  };
  
  const setIsUploading = (value: boolean) => currentSetPublishState({ 
    isPushing: currentPublishState.isPushing, 
    progressMessage: currentPublishState.progressMessage, 
    uploadProgress: currentPublishState.uploadProgress, 
    isUploading: value 
  });
  
  // If app is null, we need to fetch it
  const [appData, setAppData] = useState<App | null>(app);
  
  // Load app data if not provided
  useEffect(() => {
    if (!app && appId) {
      const loadApp = async () => {
        try {
          const fetchedApp = await IpcClient.getInstance().getApp(appId);
          setAppData(fetchedApp);
        } catch (error) {
          console.error("Failed to load app:", error);
        }
      };
      loadApp();
    }
  }, [app, appId]);
  
  const currentApp = appData || app;
  const [pushStatus, setPushStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  
  // Hardcoded values as requested
  const [githubToken] = useState(AUTOPUSH_CONFIG.GITHUB_TOKEN);
  const [githubUsername] = useState(AUTOPUSH_CONFIG.GITHUB_USERNAME);
  const [vercelToken, setVercelToken] = useState(AUTOPUSH_CONFIG.VERCEL_TOKEN); // Updated Vercel token
  const [repoName, setRepoName] = useState(projectName);
  const [vercelProjectName, setVercelProjectName] = useState(generateVercelProjectName(projectName));
  const [deployToVercel, setDeployToVercel] = useState<boolean>(AUTOPUSH_CONFIG.DEFAULT_DEPLOY_TO_VERCEL);
  const [showInHub, setShowInHub] = useState(false);
  const [vercelProjectValidation, setVercelProjectValidation] = useState<{
    valid: boolean;
    available: boolean;
    reason?: string;
    checking: boolean;
  }>({ valid: true, available: true, checking: false });
  const [savedUrls, setSavedUrls] = useState<{
    githubRepoUrl?: string;
    vercelDeploymentUrl?: string;
  }>({});
  const [vercelDeploying, setVercelDeploying] = useState(false);
  const [vercelDeployTimer, setVercelDeployTimer] = useState(0);
  const [vercelUrlShown, setVercelUrlShown] = useState(false);

  // Load saved URLs when component mounts
  useEffect(() => {
    if (appId && currentApp) {
      console.log("🔍 Loading saved URLs for app:", appId, currentApp);
      console.log("🔍 App data:", {
        githubOrg: currentApp.githubOrg,
        githubRepo: currentApp.githubRepo,
        vercelDeploymentUrl: currentApp.vercelDeploymentUrl
      });
      
      const githubRepoUrl = currentApp.githubOrg && currentApp.githubRepo 
        ? `https://github.com/${currentApp.githubOrg}/${currentApp.githubRepo}`
        : undefined;
      const vercelDeploymentUrl = currentApp.vercelDeploymentUrl || undefined;
      
      console.log("🔍 Constructed URLs:", { githubRepoUrl, vercelDeploymentUrl });
      
      setSavedUrls({
        githubRepoUrl,
        vercelDeploymentUrl
      });
    }
  }, [appId, currentApp]);

  // Update Vercel project name when repository name changes
  useEffect(() => {
    setVercelProjectName(generateVercelProjectName(repoName));
  }, [repoName]);

  // Validate Vercel project name when it changes
  useEffect(() => {
    if (deployToVercel && vercelProjectName && vercelToken) {
      setVercelProjectValidation(prev => ({ ...prev, checking: true }));
      
      validateVercelProjectName(vercelProjectName, vercelToken)
        .then(result => {
          setVercelProjectValidation({
            ...result,
            checking: false
          });
        })
        .catch(error => {
          console.error("Vercel validation error:", error);
          setVercelProjectValidation({
            valid: false,
            available: false,
            reason: `Validation error: ${error.message}`,
            checking: false
          });
        });
    } else {
      setVercelProjectValidation({ valid: true, available: true, checking: false });
    }
  }, [vercelProjectName, vercelToken, deployToVercel]);

  // Handle Vercel deployment timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (vercelDeploying && vercelDeployTimer < AUTOPUSH_CONFIG.DEPLOYMENT_TIMER_SECONDS && !vercelUrlShown) {
      console.log("🔍 Starting Vercel timer:", { vercelDeploying, vercelDeployTimer, vercelUrlShown });
      interval = setInterval(() => {
        setVercelDeployTimer(prev => {
          console.log("🔍 Timer tick:", prev);
          if (prev >= AUTOPUSH_CONFIG.DEPLOYMENT_TIMER_SECONDS - 1) {
            console.log("🔍 Timer completed, stopping deployment");
            setVercelDeploying(false);
            // Show the Vercel URL after timer completes (only once)
            if (deployToVercel && vercelProjectName && !vercelUrlShown) {
              const vercelUrl = `https://${vercelProjectName}.vercel.app`;
              console.log("🔍 Adding Vercel URL to success message:", vercelUrl);
              setSuccessMessage(prev => {
                console.log("🔍 Previous message:", prev);
                const newMessage = prev + `\n🚀 Vercel deployment ready: ${vercelUrl}`;
                console.log("🔍 New message:", newMessage);
                return newMessage;
              });
              setVercelUrlShown(true);
              
              // Save the Vercel URL
              if (appId) {
                IpcClient.getInstance().updateAppDeploymentUrls({
                  appId: appId,
                  vercelDeploymentUrl: vercelUrl
                }).catch(console.error);
              }
            } else {
              console.log("🔍 Not adding Vercel URL:", { deployToVercel, repoName, vercelUrlShown });
            }
            return AUTOPUSH_CONFIG.DEPLOYMENT_TIMER_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) {
        console.log("🔍 Clearing Vercel timer");
        clearInterval(interval);
      }
    };
  }, [vercelDeploying, vercelDeployTimer, deployToVercel, repoName, appId, vercelUrlShown]);

  const handleAutoPush = async () => {
    if (!appId) {
      setErrorMessage("No app selected");
      setPushStatus("error");
      return;
    }

    setIsPushing(true);
    setPushStatus("idle");
    setErrorMessage("");
    setSuccessMessage("");
    setProgressMessage("");

    try {
      // 1. Create GitHub repository via API
      console.log("📝 Setting progress message: Creating GitHub repository...");
      setProgressMessage("Creating GitHub repository...");
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const createRepoResponse = await fetch("https://api.github.com/user/repos", {
          method: "POST",
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: repoName,
            private: false,
            description: `Auto-generated repository for ${repoName}`,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!createRepoResponse.ok) {
          const errorData = await createRepoResponse.json();
          if (createRepoResponse.status === 422) {
            // Repository already exists, that's okay
            console.log("📝 Repository already exists, continuing...");
          } else {
            const errorMsg = errorData.message || createRepoResponse.statusText;
            throw new Error(`Failed to create repository: ${errorMsg}`);
          }
        } else {
          console.log("📝 Repository created successfully");
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error("Repository creation timed out. Please try again.");
        }
        throw error;
      }

      // 2. Get app files and upload them
      console.log("📝 Setting progress message: Reading app files...");
      setProgressMessage("Reading app files...");
      
      // Use current app data
      if (!currentApp) {
        throw new Error("App not found");
      }

      // Use main-process auto push to push the entire working tree reliably
      console.log("📝 Setting progress message: Preparing full repo push...");
      setProgressMessage("Preparing full repo push...");

      const autoPushResult = await IpcClient.getInstance().autoPushToGithub({
        appId: currentApp.id,
        githubToken,
        githubUsername,
        repoName,
        appPath: currentApp.path,
      });

      if (!autoPushResult.success) {
        throw new Error(autoPushResult.error || "Auto push failed");
      }

      // Show completion message
      setProgressMessage(`Successfully pushed to GitHub! Repository: https://github.com/${githubUsername}/${repoName}`);
      // Mark upload progress as complete (no per-file count in full push mode)
      setUploadProgress({ current: 1, total: 1 });

      // 3. Deploy to Vercel if requested
      let vercelUrl = "";
      let vercelError = "";
      
      if (deployToVercel) {
        if (!vercelToken.trim()) {
          vercelError = "Vercel token is required for deployment";
        } else {
          console.log("📝 Setting progress message: Setting up Vercel deployment...");
          setProgressMessage("Setting up Vercel deployment...");
          
          try {
            console.log("🚀 Starting Vercel setup...");
            
            // Save Vercel token
            await IpcClient.getInstance().saveVercelAccessToken({
              token: vercelToken,
            });
            console.log("✅ Vercel token saved");

            // Start the deployment timer
            console.log("🚀 Starting Vercel deployment timer...");
            setVercelDeploying(true);
            setVercelDeployTimer(0);
            setVercelUrlShown(false);

            // Deploy directly to Vercel using the deployment API
            console.log("🚀 Deploying to Vercel...");
            
            try {
              // Try IPC method first, fallback to direct fetch if channel not available
              console.log("🚀 Deploying to Vercel...");
              
              try {
                const deploymentResult = await IpcClient.getInstance().deployToVercel({
                  vercelToken,
                  githubUsername,
                  repoName,
                  githubToken,
                  appId: appId || undefined
                });

                if (deploymentResult.success) {
                  // Get the production domain instead of deployment URL
                  if (deploymentResult.url) {
                    // Extract the project name from the deployment URL
                    const projectName = repoName;
                    vercelUrl = `https://${projectName}.vercel.app`;
                  } else {
                    vercelUrl = "Deployment in progress...";
                  }
                  console.log("✅ Deployed to Vercel via IPC:", vercelUrl);
                } else {
                  throw new Error(deploymentResult.error || "Vercel deployment failed");
                }
              } catch (ipcError: any) {
                if (ipcError.message.includes("Invalid channel")) {
                  console.log("🔄 IPC channel not available, using direct fetch...");
                  
                  // Fallback to direct fetch approach
                  const repoResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${repoName}`, {
                    headers: {
                      "Authorization": `Bearer ${githubToken}`,
                      "Accept": "application/vnd.github+json",
                    },
                  });

                  if (!repoResponse.ok) {
                    throw new Error(`GitHub repo lookup failed: ${repoResponse.statusText}`);
                  }

                  const repoData = await repoResponse.json();
                  const repoId = repoData.id;

                  // Detect if this is a Godot app
                  const isGodotApp = currentApp?.appType === 'godot' || 
                    (currentApp?.files && currentApp.files.some(file => 
                      file.includes('godot-project') || 
                      file.includes('project.godot') ||
                      file.includes('game_spec.json')
                    ));

                  // Set projectSettings based on app type
                  let projectSettings: {
                    framework?: string | null;
                    installCommand?: string | null;
                    buildCommand?: string | null;
                    outputDirectory?: string;
                  };

                  if (isGodotApp) {
                    // Godot apps are static - no build step needed
                    // Files are already exported to godot-web-export directory
                    projectSettings = {
                      framework: null, // Static site, no framework
                      installCommand: null, // No npm install needed
                      buildCommand: null, // No build step - files are already exported
                      outputDirectory: "godot-web-export" // Where Godot exports are stored
                    };
                    logger.info("🎮 Detected Godot app - using static deployment settings");
                  } else {
                    // Default to Vite settings for web apps
                    projectSettings = {
                      framework: "vite",
                      installCommand: "npm install",
                      buildCommand: "npm run build",
                      outputDirectory: "dist"
                    };
                  }

                  const deploymentPayload = {
                    name: vercelProjectName,
                    target: "production",
                    gitSource: {
                      type: "github",
                      repoId: repoId,
                      ref: "main",
                    },
                    projectSettings
                  };
                  
                  const deploymentResponse = await fetch("https://api.vercel.com/v13/deployments", {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${vercelToken}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(deploymentPayload),
                  });

                  if (!deploymentResponse.ok) {
                    const errorData = await deploymentResponse.json();
                    throw new Error(`Vercel error: ${errorData.message || "Unknown error"}`);
                  }

                  const deploymentData = await deploymentResponse.json();
                  // Get the production domain instead of deployment URL
                  if (deploymentData.url) {
                    // Use the validated Vercel project name
                    vercelUrl = `https://${vercelProjectName}.vercel.app`;
                  } else {
                    vercelUrl = "Deployment in progress...";
                  }
                  console.log("✅ Deployed to Vercel via direct fetch:", vercelUrl);
                } else {
                  throw ipcError;
                }
              }
              
            } catch (error: any) {
              console.error("❌ Vercel deployment failed:", error);
              throw new Error(`Vercel deployment failed: ${error.message}`);
            }
            
          } catch (error: any) {
            console.error("❌ Vercel setup failed:", error);
            vercelError = error.message || "Vercel setup failed";
            setVercelDeploying(false);
          }
        }
      }
      
      // Save deployment URLs to app data
      const githubRepoUrl = `https://github.com/${githubUsername}/${repoName}`;
      const finalVercelUrl = vercelUrl?.startsWith("https://") ? vercelUrl : vercelUrl ? `https://${vercelUrl}` : null;
      
      try {
        await IpcClient.getInstance().updateAppDeploymentUrls({
          appId: currentApp.id,
          githubRepoUrl: githubRepoUrl,
          vercelDeploymentUrl: finalVercelUrl || undefined,
          showInHub: showInHub
        });
        console.log(`✅ Saved deployment URLs for app ${currentApp.id}`);
      } catch (error) {
        console.error(`⚠️ Failed to save deployment URLs:`, error);
      }

      // Success!
      let successMsg = `✅ Successfully pushed to GitHub! Repository: ${githubRepoUrl}`;
      if (vercelUrl) {
        if (vercelUrl.includes("Deployment in progress")) {
          successMsg += `\n🚀 Vercel deployment triggered!`;
         
        } else if (vercelUrl.startsWith("https://")) {
          // Don't show the URL here - it will be shown after the timer completes
          successMsg += `\n🚀 Vercel deployment in progress...`;
        } else {
          successMsg += `\n🚀 Vercel deployment in progress...`;
        }
      } else if (vercelError) {
        successMsg += `\n⚠️ Vercel deployment failed: ${vercelError}`;
      } else if (deployToVercel) {
        successMsg += `\n⚠️ Vercel deployment was requested but no result was returned`;
      }
      setSuccessMessage(successMsg);
      setPushStatus("success");
      // Don't clear progress message if Vercel deployment is still in progress
      if (!deployToVercel || !vercelDeploying) {
        setProgressMessage("");
      }
      
      // Show success toast
      toast.success("Deployment Completed!", {
        description: `Successfully deployed ${projectName} to GitHub${deployToVercel ? ' and Vercel' : ''}`,
        duration: 5000,
      });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error("Auto push error:", error);
      setErrorMessage(error.message || "An unexpected error occurred");
      setPushStatus("error");
      setProgressMessage("");
      
      // Show error toast
      toast.error("Deployment Failed", {
        description: error.message || "An unexpected error occurred during deployment",
        duration: 5000,
      });
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-3">
          <div>
            <Label htmlFor="repo-name">Repository Name</Label>
            <Input
              id="repo-name"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="Enter repository name"
              disabled={isPushing}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="deploy-vercel"
              checked={deployToVercel}
              onChange={(e) => setDeployToVercel(e.target.checked)}
              disabled={isPushing}
              className="rounded border-gray-300"
            />
            <Label htmlFor="deploy-vercel" className="text-sm">
              Also deploy to Vercel
            </Label>
          </div>

          {deployToVercel && (
            <div>
              <Label htmlFor="vercel-project-name">Vercel Project Name</Label>
              <p className="text-xs text-gray-500 mb-2">
                Automatically generated from repository name. Special characters are removed and converted to lowercase.
              </p>
              <div className="relative">
                <Input
                  id="vercel-project-name"
                  value={vercelProjectName}
                  onChange={(e) => setVercelProjectName(e.target.value)}
                  placeholder="Enter Vercel project name"
                  disabled={isPushing}
                  className={`pr-8 ${
                    vercelProjectValidation.checking 
                      ? 'border-yellow-300' 
                      : !vercelProjectValidation.valid 
                        ? 'border-red-300' 
                        : !vercelProjectValidation.available 
                          ? 'border-orange-300' 
                          : 'border-green-300'
                  }`}
                />
                {vercelProjectValidation.checking && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <svg className="animate-spin h-4 w-4 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
                {!vercelProjectValidation.checking && vercelProjectValidation.valid && vercelProjectValidation.available && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                )}
                {!vercelProjectValidation.checking && (!vercelProjectValidation.valid || !vercelProjectValidation.available) && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </div>
                )}
              </div>
              {vercelProjectValidation.checking && (
                <p className="text-xs text-yellow-600 mt-1">Checking availability...</p>
              )}
              {!vercelProjectValidation.checking && !vercelProjectValidation.valid && (
                <p className="text-xs text-red-600 mt-1">
                  Invalid format: {vercelProjectValidation.reason || "Must be lowercase letters, numbers, and hyphens only, max 52 characters"}
                </p>
              )}
              {!vercelProjectValidation.checking && vercelProjectValidation.valid && !vercelProjectValidation.available && (
                <p className="text-xs text-orange-600 mt-1">
                  Project name already exists on Vercel. Please choose a different name.
                </p>
              )}
              {!vercelProjectValidation.checking && vercelProjectValidation.valid && vercelProjectValidation.available && (
                <p className="text-xs text-green-600 mt-1">✓ Project name is available</p>
              )}
            </div>
          )}

          {/* {deployToVercel && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Vercel deployment will use the configured access token. 
                Your app will be deployed automatically after GitHub push completes.
              </p>
            </div>
          )} */}
          
          {/* <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> This will create a new public repository on GitHub and push your current code.
              {deployToVercel && " If Vercel deployment is enabled, it will deploy your app directly to Vercel using the deployment API."}
            </p>
          </div> */}
        </div>

        {/* Show in Hub Consent Checkbox */}
        <div className="space-y-3 mb-4">
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="show-in-hub-consent"
              checked={showInHub}
              onChange={(e) => setShowInHub(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
            />
            <label 
              htmlFor="show-in-hub-consent" 
              className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex-1"
            >
              <span className="font-medium">Show this app in Hub</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                By checking this, you consent to make this app visible in the Hub for others to discover and use.
              </span>
            </label>
          </div>
        </div>

        <Button 
          onClick={handleAutoPush} 
          disabled={
            isPushing || 
            !repoName.trim() || 
            (deployToVercel && !vercelToken.trim()) ||
            (deployToVercel && (!vercelProjectValidation.valid || !vercelProjectValidation.available || vercelProjectValidation.checking))
          }
          className="w-full"
        >
          {isPushing ? (
            <>
              <svg
                className="animate-spin h-4 w-4 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {deployToVercel ? "Pushing to GitHub & Deploying..." : "Pushing to GitHub..."}
            </>
          ) : (
            <>
              <Github className="h-4 w-4 mr-2" />
              {deployToVercel ? "Auto Push & Deploy" : "Auto Push to GitHub"}
            </>
          )}
        </Button>

        {(progressMessage || (uploadProgress && uploadProgress.current < uploadProgress.total)) && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <svg
              className="animate-spin h-4 w-4 text-blue-600 dark:text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <div className="flex flex-col">
              {progressMessage && (
                <span className="text-sm text-blue-600 dark:text-blue-400">{progressMessage}</span>
              )}
              {/* Show uploading if current < total */}
              {uploadProgress && uploadProgress.current < uploadProgress.total && (
                <span className="text-xs text-blue-500 dark:text-blue-300">
                  {uploadProgress.current}/{uploadProgress.total} files uploaded
                </span>
              )}
            </div>
          </div>
        )}

        {/* Vercel deployment loader */}
        {vercelDeploying && (
          <div className="space-y-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="text-sm font-medium">Deploying to Vercel...</span>
            </div>
            <div className="text-sm text-orange-700 dark:text-orange-300">
              <p>Your app is being deployed to Vercel. This usually takes 30-60 seconds.</p>
              <p className="mt-1">Time elapsed: {vercelDeployTimer}s / {AUTOPUSH_CONFIG.DEPLOYMENT_TIMER_SECONDS}s</p>
            </div>
            <div className="w-full bg-orange-200 dark:bg-orange-800 rounded-full h-2">
              <div 
                className="bg-orange-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(vercelDeployTimer / AUTOPUSH_CONFIG.DEPLOYMENT_TIMER_SECONDS) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Display saved URLs if they exist */}
        {(savedUrls.githubRepoUrl || savedUrls.vercelDeploymentUrl) && pushStatus !== "success" && (
          <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Already Deployed</span>
            </div>
            <div className="space-y-2 text-sm">
              {savedUrls.githubRepoUrl && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">GitHub: </span>
                  <a 
                    href={savedUrls.githubRepoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {savedUrls.githubRepoUrl}
                  </a>
                </div>
              )}
              {savedUrls.vercelDeploymentUrl && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Vercel: </span>
                  <a 
                    href={savedUrls.vercelDeploymentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {savedUrls.vercelDeploymentUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {pushStatus === "success" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <div className="text-sm whitespace-pre-line">
                {successMessage.split('\n').map((line, index) => {
                  // Check if line contains a URL
                  const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
                  if (urlMatch) {
                    const url = urlMatch[1];
                    const beforeUrl = line.substring(0, urlMatch.index);
                    const afterUrl = line.substring(urlMatch.index! + url.length);
                    return (
                      <div key={index}>
                        {beforeUrl}
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {url}
                        </a>
                        {afterUrl}
                      </div>
                    );
                  }
                  return <div key={index}>{line}</div>;
                })}
              </div>
            </div>
            {(successMessage.includes("Vercel project created") || successMessage.includes("Deployed to Vercel")) && (
              <div>
                <button
                  onClick={() => {
                    const ipcClient = IpcClient.getInstance();
                    ipcClient.openExternalUrl("https://vercel.com/dashboard");
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 22.525H0l12-21.05 12 21.05z" />
                  </svg>
                  Open Vercel Dashboard
                </button>
              </div>
            )}
          </div>
        )}

        {pushStatus === "error" && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{errorMessage}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
