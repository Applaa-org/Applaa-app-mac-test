import { ipcMain } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";
import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";
import { WebCrawlerService } from "../../services/web-crawler-service";
import { getDyadAppPath } from "../../paths/paths";
import { getAppRelativePath, ensureWorkspaceInitialized } from "../../paths/workspace";
import { db } from "../../db";
import { createFromTemplate } from "./createFromTemplate";
import { gitCommit } from "../utils/git_utils";
import { backendAPI } from "../../lib/backend-api";
import { getSupabaseAuth } from "../../lib/supabase";
import fetch from "node-fetch";

const logger = log.scope("web_clone_handlers");
const handle = createLoggedHandler(logger);

interface CloneWebsiteParams {
  url: string;
  appName: string;
}

async function isUserAuthenticated(): Promise<boolean> {
  try {
    const auth = getSupabaseAuth();
    const session = await auth.getCurrentSession();
    return !!session;
  } catch (error) {
    logger.debug("Auth check failed or Supabase not initialized:", error);
    return false;
  }
}

async function generateUniqueAppName(baseName: string): Promise<string> {
  const existingApps = db.$client
    .prepare("SELECT name FROM apps WHERE name LIKE ?")
    .all(`${baseName}%`) as Array<{ name: string }>;
  
  const existingNames = new Set(existingApps.map(app => app.name));
  
  if (!existingNames.has(baseName)) {
    return baseName;
  }
  
  for (let i = 1; i <= 100; i++) {
    const candidate = `${baseName}-${i}`;
    if (!existingNames.has(candidate)) {
      return candidate;
    }
  }
  
  return `${baseName}-${Date.now()}`;
}

export function registerWebCloneHandlers() {
  handle(
    "clone-website",
    async (_, params: CloneWebsiteParams): Promise<{ app: any; chatId: number }> => {
      if (!params.url || !params.appName) {
        throw new Error("URL and app name are required");
      }

      // Validate URL
      let targetUrl: URL;
      try {
        targetUrl = new URL(params.url);
        if (!["http:", "https:"].includes(targetUrl.protocol)) {
          throw new Error("URL must use http or https protocol");
        }
      } catch (error) {
        throw new Error(`Invalid URL: ${params.url}`);
      }

      // Check authentication (same limit as create-app)
      const existingApps = db.$client.prepare("SELECT COUNT(*) as count FROM apps").get() as { count: number };
      const FREE_UNAUTH_LIMIT = 3;
      const isAuthenticated = await isUserAuthenticated();

      if (!isAuthenticated && existingApps.count >= FREE_UNAUTH_LIMIT) {
        throw new Error(`AUTH_REQUIRED_APP_LIMIT:${FREE_UNAUTH_LIMIT}`);
      }

      await ensureWorkspaceInitialized();

      // Check if app name already exists
      const appRelPath = getAppRelativePath(params.appName, "web");
      const fullAppPath = getDyadAppPath(appRelPath);
      
      if (fs.existsSync(fullAppPath)) {
        const suggestedName = await generateUniqueAppName(params.appName);
        throw new Error(`DUPLICATE_APP_NAME:${params.appName}:${suggestedName}`);
      }

      // Create app record first
      const info = db.$client
        .prepare("INSERT INTO apps (name, path, app_type) VALUES (?, ?, ?)")
        .run(params.appName, appRelPath, "web");
      const appId = Number(info.lastInsertRowid);

      try {
        // 🗄️ AUTOMATIC DATABASE PROVISIONING: Call backend to create Postgres schema
        let databaseInfo: { schemaName: string; connectionString: string } | null = null;
        
        const backendUrl = process.env.BACKEND_API_URL || 'https://haix.ai/api';
        logger.log(`📦 [POSTGRES] Starting database provisioning for cloned app ${appId}: ${params.appName}`);
        
        try {
          const backendResult = await backendAPI.createApp(params.appName, "web", true);
          logger.log(`📦 [POSTGRES] Backend response received`);
          
          if (!backendResult) {
            throw new Error('Backend returned empty response');
          }
          
          if (!backendResult.database) {
            throw new Error('Backend did not return database info');
          }
          
          databaseInfo = backendResult.database;
          
          if (!databaseInfo.connectionString) {
            throw new Error('Backend returned database info but missing connectionString');
          }
          
          if (!databaseInfo.databaseName && !databaseInfo.schemaName) {
            throw new Error('Backend returned database info but missing both databaseName and schemaName');
          }
          
          logger.log(`✅ [POSTGRES] Database provisioned successfully!`);
          
          // Store database info in local app record
          db.$client
            .prepare("UPDATE apps SET supabase_project_id = ? WHERE id = ?")
            .run(JSON.stringify({
              schemaName: databaseInfo.schemaName || databaseInfo.databaseName,
              databaseName: databaseInfo.databaseName,
              connectionString: databaseInfo.connectionString,
              mode: databaseInfo.mode || (databaseInfo.databaseName ? 'dedicated' : 'schema'),
              provisionedAt: new Date().toISOString(),
            }), appId);
          
          logger.log(`💾 [POSTGRES] Database info stored in local app record`);
        } catch (error: any) {
          logger.error(`❌ [POSTGRES] Failed to provision database for app ${appId}!`, error);
          // Don't fail the clone if database provisioning fails - app can still work
        }

        // Create app directory structure using React template as base
        logger.info(`Creating app structure from React template...`);
        await createFromTemplate({
          fullAppPath,
          templateId: "react",
        });

        // Crawl the website
        logger.info(`Starting website crawl for: ${targetUrl.href}`);
        const crawler = new WebCrawlerService();
        const crawlResult = await crawler.crawlWebsite(targetUrl.href, fullAppPath);

        // Create public/index.html with crawled content
        const publicDir = path.join(fullAppPath, "public");
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        const indexPath = path.join(publicDir, "index.html");
        fs.writeFileSync(indexPath, crawlResult.html);
        logger.info(`Saved cloned HTML to ${indexPath}`);

        // Create a React component that loads the cloned HTML
        const srcDir = path.join(fullAppPath, "src");
        if (fs.existsSync(srcDir)) {
          const clonedComponent = `import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Load the cloned HTML into the app
    const loadClonedContent = async () => {
      try {
        const response = await fetch('/index.html');
        const html = await response.text();
        
        // Create a temporary container
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Extract body content
        const bodyContent = tempDiv.querySelector('body')?.innerHTML || html;
        
        // Insert into app container
        const appContainer = document.getElementById('root');
        if (appContainer) {
          appContainer.innerHTML = bodyContent;
        }
      } catch (error) {
        console.error('Failed to load cloned content:', error);
        document.getElementById('root')!.innerHTML = '<h1>Failed to load cloned website</h1>';
      }
    };
    
    loadClonedContent();
  }, []);

  return <div id="root" />;
}
`;
          
          const appTsxPath = path.join(srcDir, "App.tsx");
          if (fs.existsSync(appTsxPath)) {
            fs.writeFileSync(appTsxPath, clonedComponent);
            logger.info(`Updated App.tsx to load cloned content`);
          }
        }

        // Update index.html to reference the React app properly
        const rootIndexPath = path.join(fullAppPath, "index.html");
        if (fs.existsSync(rootIndexPath)) {
          // Keep the React app's index.html for Vite
          // The cloned HTML is in public/index.html and will be served as static
        }

        // Initial git commit
        try {
          await gitCommit(fullAppPath, `Initial commit: Cloned from ${targetUrl.href}`);
          logger.info(`Created initial git commit`);
        } catch (error) {
          logger.warn(`Failed to create git commit (non-critical):`, error);
        }

        // Get the created app
        const app = db.$client
          .prepare("SELECT * FROM apps WHERE id = ?")
          .get(appId) as any;

        // Create a chat for this app
        const chatInfo = db.$client
          .prepare("INSERT INTO chats (app_id, title) VALUES (?, ?)")
          .run(appId, `Cloned from ${targetUrl.href}`);
        const chatId = Number(chatInfo.lastInsertRowid);

        logger.info(`Successfully cloned website: ${targetUrl.href} to app ${appId}`);
        
        return { app, chatId };
      } catch (error: any) {
        // Cleanup on error
        logger.error(`Error cloning website:`, error);
        db.$client.prepare("DELETE FROM apps WHERE id = ?").run(appId);
        if (fs.existsSync(fullAppPath)) {
          try {
            fs.rmSync(fullAppPath, { recursive: true, force: true });
          } catch (cleanupError) {
            logger.warn(`Failed to cleanup app directory:`, cleanupError);
          }
        }
        throw error;
      }
    }
  );
}

