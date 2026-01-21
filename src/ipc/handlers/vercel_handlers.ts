import { ipcMain, IpcMainInvokeEvent } from "electron";
import { Vercel } from "@vercel/sdk";
import { writeSettings, readSettings } from "../../main/settings";
import * as schema from "../../db/schema";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import log from "electron-log";
import { IS_TEST_BUILD } from "../utils/test_utils";
import * as fs from "fs";
import * as path from "path";
import { CreateProjectFramework } from "@vercel/sdk/models/createprojectop.js";
import { getDyadAppPath } from "@/paths/paths";
import {
  CreateVercelProjectParams,
  IsVercelProjectAvailableParams,
  SaveVercelAccessTokenParams,
  VercelDeployment,
  VercelProject,
} from "../ipc_types";
import { ConnectToExistingVercelProjectParams } from "../ipc_types";
import { GetVercelDeploymentsParams } from "../ipc_types";
import { DisconnectVercelProjectParams } from "../ipc_types";
import { createLoggedHandler } from "./safe_handle";
import fetch from "node-fetch";

const logger = log.scope("vercel_handlers");
const handle = createLoggedHandler(logger);

// Use test server URLs when in test mode
const TEST_SERVER_BASE = "http://localhost:3500";

const VERCEL_API_BASE = IS_TEST_BUILD
  ? `${TEST_SERVER_BASE}/vercel/api`
  : "https://api.vercel.com";

// --- Helper Functions ---

function createVercelClient(token: string): Vercel {
  return new Vercel({
    bearerToken: token,
    ...(IS_TEST_BUILD && { serverURL: VERCEL_API_BASE }),
  });
}

async function validateVercelToken(token: string): Promise<boolean> {
  try {
    const vercel = createVercelClient(token);
    await vercel.user.getAuthUser();
    return true;
  } catch (error) {
    logger.error("Error validating Vercel token:", error);
    return false;
  }
}

async function getDefaultTeamId(token: string): Promise<string> {
  try {
    const response = await fetch(`${VERCEL_API_BASE}/v2/teams?limit=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch teams: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    // Use the first team (typically the personal account or default team)
    if (data.teams && data.teams.length > 0) {
      return data.teams[0].id;
    }

    throw new Error("No teams found for this user");
  } catch (error) {
    logger.error("Error getting default team ID:", error);
    throw new Error("Failed to get team information");
  }
}

async function detectFramework(
  appPath: string,
): Promise<CreateProjectFramework | undefined> {
  try {
    // Check for specific config files first
    const configFiles: Array<{
      file: string;
      framework: CreateProjectFramework;
    }> = [
      { file: "next.config.js", framework: "nextjs" },
      { file: "next.config.mjs", framework: "nextjs" },
      { file: "next.config.ts", framework: "nextjs" },
      { file: "vite.config.js", framework: "vite" },
      { file: "vite.config.ts", framework: "vite" },
      { file: "vite.config.mjs", framework: "vite" },
      { file: "nuxt.config.js", framework: "nuxtjs" },
      { file: "nuxt.config.ts", framework: "nuxtjs" },
      { file: "astro.config.js", framework: "astro" },
      { file: "astro.config.mjs", framework: "astro" },
      { file: "astro.config.ts", framework: "astro" },
      { file: "svelte.config.js", framework: "svelte" },
    ];

    for (const { file, framework } of configFiles) {
      if (fs.existsSync(path.join(appPath, file))) {
        return framework;
      }
    }

    // Check package.json for dependencies
    const packageJsonPath = path.join(appPath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Check for framework dependencies in order of preference
      if (dependencies.next) return "nextjs";
      if (dependencies.vite) return "vite";
      if (dependencies.nuxt) return "nuxtjs";
      if (dependencies.astro) return "astro";
      if (dependencies.svelte) return "svelte";
      if (dependencies["@angular/core"]) return "angular";
      if (dependencies.vue) return "vue";
      if (dependencies["react-scripts"]) return "create-react-app";
      if (dependencies.gatsby) return "gatsby";
      if (dependencies.remix) return "remix";
    }

    // Default fallback
    return undefined;
  } catch (error) {
    logger.error("Error detecting framework:", error);
    return undefined;
  }
}

// --- IPC Handlers ---

async function handleSaveVercelToken(
  event: IpcMainInvokeEvent,
  { token }: SaveVercelAccessTokenParams,
): Promise<void> {
  logger.debug("Saving Vercel access token");

  if (!token || token.trim() === "") {
    throw new Error("Access token is required.");
  }

  try {
    // Validate the token by making a test API call
    const isValid = await validateVercelToken(token.trim());
    if (!isValid) {
      throw new Error(
        "Invalid access token. Please check your token and try again.",
      );
    }

    writeSettings({
      vercelAccessToken: {
        value: token.trim(),
      },
    });

    logger.log("Successfully saved Vercel access token.");
  } catch (error: any) {
    logger.error("Error saving Vercel token:", error);
    throw new Error(`Failed to save access token: ${error.message}`);
  }
}

// --- Vercel List Projects Handler ---
async function handleListVercelProjects(): Promise<VercelProject[]> {
  try {
    const settings = readSettings();
    const accessToken = settings.vercelAccessToken?.value;
    if (!accessToken) {
      throw new Error("Not authenticated with Vercel.");
    }

    const vercel = createVercelClient(accessToken);
    const response = await vercel.projects.getProjects({});

    if (!response.projects) {
      throw new Error("Failed to retrieve projects from Vercel.");
    }

    return response.projects.map((project) => ({
      id: project.id,
      name: project.name,
      framework: project.framework || null,
    }));
  } catch (err: any) {
    logger.error("[Vercel Handler] Failed to list projects:", err);
    throw new Error(err.message || "Failed to list Vercel projects.");
  }
}

// --- Vercel Project Availability Handler ---
async function handleIsProjectAvailable(
  event: IpcMainInvokeEvent,
  { name }: IsVercelProjectAvailableParams,
): Promise<{ available: boolean; error?: string }> {
  try {
    const settings = readSettings();
    const accessToken = settings.vercelAccessToken?.value;
    if (!accessToken) {
      return { available: false, error: "Not authenticated with Vercel." };
    }

    const vercel = createVercelClient(accessToken);

    // Check if project name is available by searching for projects with that name
    const response = await vercel.projects.getProjects({
      search: name,
    });

    if (!response.projects) {
      return {
        available: false,
        error: "Failed to check project availability.",
      };
    }

    const projectExists = response.projects.some(
      (project) => project.name === name,
    );

    return {
      available: !projectExists,
      error: projectExists ? "Project name is not available." : undefined,
    };
  } catch (err: any) {
    return { available: false, error: err.message || "Unknown error" };
  }
}

// --- Vercel Create Project Handler ---
async function handleCreateProject(
  event: IpcMainInvokeEvent,
  { name, appId }: CreateVercelProjectParams,
): Promise<void> {
  // Check if user can deploy (Pro tier only)
  const { canDeployApp } = await import("../utils/feature_checks");
  const deployCheck = canDeployApp();
  if (!deployCheck.allowed) {
    throw new Error(deployCheck.reason || "DEPLOYMENT_NOT_ALLOWED");
  }
  const settings = readSettings();
  const accessToken = settings.vercelAccessToken?.value;
  if (!accessToken) {
    throw new Error("Not authenticated with Vercel.");
  }

  try {
    logger.info(`Creating Vercel project: ${name} for app ${appId}`);

    // Get app details to determine the framework
    const app = await db.query.apps.findFirst({ where: eq(apps.id, appId) });
    if (!app) {
      throw new Error("App not found.");
    }

    // Check if app has GitHub repository configured
    if (!app.githubOrg || !app.githubRepo) {
      throw new Error(
        "App must be connected to a GitHub repository before creating a Vercel project.",
      );
    }

    // Detect the framework from the app's directory
    const detectedFramework = await detectFramework(getDyadAppPath(app.path));

    logger.info(
      `Detected framework: ${detectedFramework || "none detected"} for app at ${app.path}`,
    );

    const vercel = createVercelClient(accessToken);

    const projectData = await vercel.projects.createProject({
      requestBody: {
        name: name,
        gitRepository: {
          type: "github",
          repo: `${app.githubOrg}/${app.githubRepo}`,
        },
        framework: detectedFramework,
      },
    });
    if (!projectData.id) {
      throw new Error("Failed to create project: No project ID returned.");
    }

    // Get the default team ID
    const teamId = await getDefaultTeamId(accessToken);

    const projectDomains = await vercel.projects.getProjectDomains({
      idOrName: projectData.id,
    });
    const projectUrl = "https://" + projectDomains.domains[0].name;

    // Store project info in the app's DB row
    await updateAppVercelProject({
      appId,
      projectId: projectData.id,
      projectName: projectData.name,
      teamId: teamId,
      deploymentUrl: projectUrl,
    });

    logger.info(
      `Successfully created Vercel project: ${projectData.id} with GitHub repo: ${app.githubOrg}/${app.githubRepo}`,
    );

    // Trigger the first deployment
    logger.info(`Triggering first deployment for project: ${projectData.id}`);
    try {
      // Create deployment via Vercel SDK using the project settings we just created
      const deploymentData = await vercel.deployments.createDeployment({
        requestBody: {
          name: projectData.name,
          project: projectData.id,
          target: "production",
          gitSource: {
            type: "github",
            org: app.githubOrg,
            repo: app.githubRepo,
            ref: app.githubBranch || "main",
          },
        },
      });

      if (deploymentData.url) {
        logger.info(`First deployment successful: ${deploymentData.url}`);
      } else {
        logger.warn("First deployment failed: No deployment URL returned");
      }
    } catch (deployError: any) {
      logger.warn(`First deployment failed with error: ${deployError.message}`);
      // Don't throw here - project creation was successful, deployment failure is non-critical
    }
  } catch (err: any) {
    logger.error("[Vercel Handler] Failed to create project:", err);
    throw new Error(err.message || "Failed to create Vercel project.");
  }
}

// --- Vercel Connect to Existing Project Handler ---
async function handleConnectToExistingProject(
  event: IpcMainInvokeEvent,
  { projectId, appId }: ConnectToExistingVercelProjectParams,
): Promise<void> {
  try {
    const settings = readSettings();
    const accessToken = settings.vercelAccessToken?.value;
    if (!accessToken) {
      throw new Error("Not authenticated with Vercel.");
    }

    logger.info(
      `Connecting to existing Vercel project: ${projectId} for app ${appId}`,
    );

    const vercel = createVercelClient(accessToken);

    // Verify the project exists and get its details
    const response = await vercel.projects.getProjects({});
    const projectData = response.projects?.find(
      (p) => p.id === projectId || p.name === projectId,
    );

    if (!projectData) {
      throw new Error("Project not found. Please check the project ID.");
    }

    // Get the default team ID
    const teamId = await getDefaultTeamId(accessToken);

    // Store project info in the app's DB row
    await updateAppVercelProject({
      appId,
      projectId: projectData.id,
      projectName: projectData.name,
      teamId: teamId,
      deploymentUrl: projectData.targets?.production?.url
        ? `https://${projectData.targets.production.url}`
        : null,
    });

    logger.info(`Successfully connected to Vercel project: ${projectData.id}`);
  } catch (err: any) {
    logger.error(
      "[Vercel Handler] Failed to connect to existing project:",
      err,
    );
    throw new Error(err.message || "Failed to connect to existing project.");
  }
}

// --- Vercel Get Deployments Handler ---
async function handleGetVercelDeployments(
  event: IpcMainInvokeEvent,
  { appId }: GetVercelDeploymentsParams,
): Promise<VercelDeployment[]> {
  try {
    const settings = readSettings();
    const accessToken = settings.vercelAccessToken?.value;
    if (!accessToken) {
      throw new Error("Not authenticated with Vercel.");
    }

    const app = await db.query.apps.findFirst({ where: eq(apps.id, appId) });
    if (!app || !app.vercelProjectId) {
      throw new Error("App is not linked to a Vercel project.");
    }

    logger.info(
      `Getting deployments for Vercel project: ${app.vercelProjectId} for app ${appId}`,
    );

    const vercel = createVercelClient(accessToken);

    // Get deployments for the project
    const deploymentsResponse = await vercel.deployments.getDeployments({
      projectId: app.vercelProjectId,
      limit: 3, // Get last 3 deployments
    });

    if (!deploymentsResponse.deployments) {
      throw new Error("Failed to retrieve deployments from Vercel.");
    }

    // Map deployments to our interface format
    return deploymentsResponse.deployments.map((deployment) => ({
      uid: deployment.uid,
      url: deployment.url,
      state: deployment.state || "unknown",
      createdAt: deployment.createdAt || 0,
      target: deployment.target || "production",
      readyState: deployment.readyState || "unknown",
    }));
  } catch (err: any) {
    logger.error("[Vercel Handler] Failed to get deployments:", err);
    throw new Error(err.message || "Failed to get Vercel deployments.");
  }
}

async function handleDisconnectVercelProject(
  event: IpcMainInvokeEvent,
  { appId }: DisconnectVercelProjectParams,
): Promise<void> {
  logger.log(`Disconnecting Vercel project for appId: ${appId}`);

  const app = await db.query.apps.findFirst({
    where: eq(apps.id, appId),
  });

  if (!app) {
    throw new Error("App not found");
  }

  // Update app in database to remove Vercel project info
  await db
    .update(apps)
    .set({
      vercelProjectId: null,
      vercelProjectName: null,
      vercelTeamId: null,
      vercelDeploymentUrl: null,
    })
    .where(eq(apps.id, appId));
  
  // Sync app to Supabase (non-blocking)
  try {
    const { syncAppByIdToSupabase } = await import('../../lib/supabase_app_sync');
    await syncAppByIdToSupabase(appId);
  } catch (error) {
    logger.warn('Failed to sync app to Supabase (non-critical):', error);
  }
}

// --- Direct Vercel Deployment Handler ---
async function handleDeployToVercel(
  event: IpcMainInvokeEvent,
  { vercelToken, githubUsername, repoName, githubToken, appId }: {
    vercelToken: string;
    githubUsername: string;
    repoName: string;
    githubToken: string;
    appId?: number;
  },
): Promise<{ success: boolean; url?: string; deploymentId?: string; error?: string }> {
  try {
    // Check if user can deploy (Pro tier only)
    const { canDeployApp } = await import("../utils/feature_checks");
    const deployCheck = canDeployApp();
    if (!deployCheck.allowed) {
      throw new Error(deployCheck.reason || "DEPLOYMENT_NOT_ALLOWED");
    }
    
    logger.info(`Deploying to Vercel: ${githubUsername}/${repoName}`);

    // 1. Get GitHub repo ID
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

    // 2. Detect app type if appId is provided
    let projectSettings: {
      framework?: string | null;
      installCommand?: string | null;
      buildCommand?: string | null;
      outputDirectory?: string;
    } | undefined;

    if (appId) {
      try {
        const app = await db.query.apps.findFirst({ where: eq(apps.id, appId) });
        if (app) {
          const isGodotApp = app.appType === 'godot' || 
            (app.files && app.files.some(file => 
              file.includes('godot-project') || 
              file.includes('project.godot') ||
              file.includes('game_spec.json')
            ));

          if (isGodotApp) {
            // Godot apps are static - no build step needed
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
        }
      } catch (appError: any) {
        logger.warn(`Failed to detect app type for appId ${appId}: ${appError.message}`);
        // Continue with default settings
      }
    }

    // 3. Prepare Vercel payload
    const deploymentPayload: {
      name: string;
      gitSource: {
        type: "github";
        repoId: number;
        ref: string;
      };
      projectSettings?: typeof projectSettings;
    } = {
      name: repoName,
      gitSource: {
        type: "github",
        repoId: repoId,
        ref: "main",
      },
    };

    if (projectSettings) {
      deploymentPayload.projectSettings = projectSettings;
    }

    // 4. Call Vercel API
    const deploymentResponse = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(deploymentPayload),
    });

    const deploymentData = await deploymentResponse.json();

    if (!deploymentResponse.ok) {
      throw new Error(`Vercel error: ${deploymentData.message || "Unknown error"}`);
    }

    // Log the full response to see what we're getting
    logger.info(`Vercel deployment response:`, JSON.stringify(deploymentData, null, 2));
    
    // Try multiple possible fields for deployment ID
    let deploymentId = deploymentData.uid || deploymentData.id || deploymentData.deploymentId || null;
    
    // If we don't have a deployment ID, try to get it from the project's latest deployment
    if (!deploymentId && deploymentData.projectId) {
      try {
        logger.info(`No deployment ID in response, fetching latest deployment for project: ${deploymentData.projectId}`);
        const deploymentsResponse = await fetch(`https://api.vercel.com/v6/deployments?projectId=${deploymentData.projectId}&limit=1`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${vercelToken}`,
            "Accept": "application/json",
          },
        });
        
        if (deploymentsResponse.ok) {
          const deploymentsData = await deploymentsResponse.json();
          if (deploymentsData.deployments && deploymentsData.deployments.length > 0) {
            deploymentId = deploymentsData.deployments[0].uid || deploymentsData.deployments[0].id || null;
            logger.info(`Found deployment ID from project deployments: ${deploymentId}`);
          }
        }
      } catch (error: any) {
        logger.warn(`Failed to fetch deployment ID from project: ${error.message}`);
      }
    }
    
    // Alternative: Try to get deployment ID from the URL if it contains a deployment hash
    if (!deploymentId && deploymentData.url) {
      // Vercel URLs sometimes contain deployment info, but this is less reliable
      const urlMatch = deploymentData.url.match(/https:\/\/([^.]+)\.vercel\.app/);
      if (urlMatch) {
        logger.info(`Extracted project name from URL: ${urlMatch[1]}`);
        // We can't get deployment ID from URL alone, but we can use project name
      }
    }
    
    // Get production URL - prefer alias (production domain) over preview URL
    let productionUrl = null;
    if (deploymentData.alias && Array.isArray(deploymentData.alias) && deploymentData.alias.length > 0) {
      logger.info(`Processing ${deploymentData.alias.length} aliases:`, deploymentData.alias);
      
      // Find the production alias
      // Preview URLs have format: project-name-hash-team.vercel.app or project-name-git-main-team.vercel.app
      // Production URLs have format: project-name.vercel.app
      const productionAlias = deploymentData.alias.find((alias: string) => {
        const subdomain = alias.split('.')[0];
        logger.info(`Checking alias: ${alias}, subdomain: ${subdomain}`);
        
        // Check for common patterns that indicate preview URLs:
        // 1. Long hash-like segments (8+ alphanumeric chars after a dash)
        const hasHash = subdomain.match(/-[a-z0-9]{8,}/);
        if (hasHash) {
          logger.info(`  ❌ Rejected (has hash): ${alias}`);
          return false;
        }
        
        // 2. Team suffixes (like -applaa-dev, -vercel, etc.)
        const hasTeamSuffix = subdomain.match(/-[a-z]+-[a-z]+$/);
        if (hasTeamSuffix) {
          logger.info(`  ❌ Rejected (has team suffix): ${alias}`);
          return false;
        }
        
        // 3. Git branch patterns (like -git-main, -git-master, etc.)
        const hasGitBranch = subdomain.match(/-git-[a-z0-9-]+/);
        if (hasGitBranch) {
          logger.info(`  ❌ Rejected (has git branch): ${alias}`);
          return false;
        }
        
        // 4. Production URLs are usually shorter (fewer dashes)
        const dashCount = (subdomain.match(/-/g) || []).length;
        if (dashCount > 5) {
          logger.info(`  ❌ Rejected (too many dashes: ${dashCount}): ${alias}`);
          return false;
        }
        
        logger.info(`  ✅ Accepted as production URL: ${alias}`);
        return true;
      });
      
      // If no production alias found, use shortest one
      if (productionAlias) {
        productionUrl = `https://${productionAlias}`;
        logger.info(`Found production URL from alias: ${productionUrl}`);
      } else {
        const shortestAlias = deploymentData.alias.reduce((shortest: string, current: string) => {
          return current.length < shortest.length ? current : shortest;
        }, deploymentData.alias[0]);
        productionUrl = `https://${shortestAlias}`;
        logger.info(`Using shortest alias as production URL: ${productionUrl}`);
      }
    } else if (deploymentData.projectId) {
      // Construct production URL from project ID/name
      productionUrl = `https://${deploymentData.projectId}.vercel.app`;
      logger.info(`Constructed production URL from projectId: ${productionUrl}`);
    } else {
      // No alias and no projectId - cannot determine production URL
      logger.warn(`No alias or projectId found, cannot determine production URL`);
      productionUrl = null;
    }
    
    logger.info(`Vercel deployment initiated: Production URL: ${productionUrl}, Preview URL: ${deploymentData.url || "No URL returned"}, ID: ${deploymentId || "NOT FOUND"}`);
    logger.info(`Deployment data summary:`, {
      uid: deploymentData.uid,
      id: deploymentData.id,
      deploymentId: deploymentData.deploymentId,
      extractedId: deploymentId,
      previewUrl: deploymentData.url,
      productionUrl: productionUrl,
      alias: deploymentData.alias,
      state: deploymentData.state,
      readyState: deploymentData.readyState,
      projectId: deploymentData.projectId,
    });
    
    return { 
      success: true, 
      url: productionUrl || deploymentData.url || null, // Prefer production URL
      deploymentId: deploymentId
    };
  } catch (err: any) {
    logger.error("Vercel deployment failed:", err);
    return { success: false, error: err.message };
  }
}

// --- Get Vercel Deployment Status Handler ---
async function handleGetVercelDeploymentStatus(
  event: IpcMainInvokeEvent,
  { deploymentId, vercelToken }: {
    deploymentId: string;
    vercelToken: string;
  },
): Promise<{
  state: string;
  readyState: string;
  url?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${vercelToken}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to get deployment status: ${errorData.message || response.statusText}`);
    }

    const deployment = await response.json();
    
    // Log the full deployment response to see what Vercel is returning
    logger.info(`=== FULL VERCEL DEPLOYMENT RESPONSE ===`);
    logger.info(`Deployment ID: ${deploymentId}`);
    logger.info(`Full deployment object:`, JSON.stringify(deployment, null, 2));
    logger.info(`deployment.url:`, deployment.url);
    logger.info(`deployment.alias:`, deployment.alias);
    logger.info(`deployment.projectId:`, deployment.projectId);
    logger.info(`deployment.readyState:`, deployment.readyState);
    logger.info(`deployment.state:`, deployment.state);
    logger.info(`=== END VERCEL DEPLOYMENT RESPONSE ===`);
    
    // Get production URL from alias array
    // Vercel returns aliases array where production URL is typically the one without deployment hash
    let productionUrl = undefined;
    if (deployment.alias && Array.isArray(deployment.alias) && deployment.alias.length > 0) {
      logger.info(`Processing ${deployment.alias.length} aliases:`, deployment.alias);
      // Find the production alias
      // Preview URLs have format: project-name-hash-team.vercel.app
      // Production URLs have format: project-name.vercel.app
      const productionAlias = deployment.alias.find((alias: string) => {
        const subdomain = alias.split('.')[0];
        logger.info(`Checking alias: ${alias}, subdomain: ${subdomain}`);
        
        // Check for common patterns that indicate preview URLs:
        // 1. Long hash-like segments (8+ alphanumeric chars after a dash)
        const hasHash = subdomain.match(/-[a-z0-9]{8,}/);
        if (hasHash) {
          logger.info(`  ❌ Rejected (has hash): ${alias}`);
          return false;
        }
        
        // 2. Team suffixes (like -applaa-dev, -vercel, etc.)
        // Pattern: ends with -word-word (team suffix)
        const hasTeamSuffix = subdomain.match(/-[a-z]+-[a-z]+$/);
        if (hasTeamSuffix) {
          logger.info(`  ❌ Rejected (has team suffix): ${alias}`);
          return false;
        }
        
        // 3. Check for git branch patterns (like -git-main, -git-master)
        const hasGitBranch = subdomain.match(/-git-[a-z0-9-]+$/);
        if (hasGitBranch) {
          logger.info(`  ❌ Rejected (has git branch): ${alias}`);
          return false;
        }
        
        // 4. Production URLs are usually shorter (fewer dashes)
        // Count dashes - production URLs typically have fewer dashes
        const dashCount = (subdomain.match(/-/g) || []).length;
        // If it has more than 5 dashes, it's likely a preview URL
        if (dashCount > 5) {
          logger.info(`  ❌ Rejected (too many dashes: ${dashCount}): ${alias}`);
          return false;
        }
        
        logger.info(`  ✅ Accepted as production URL: ${alias}`);
        return true;
      });
      
      // If no production alias found, try to find the shortest one (production is usually shorter)
      if (productionAlias) {
        productionUrl = `https://${productionAlias}`;
        logger.info(`Found production URL from alias: ${productionUrl}`);
      } else {
        // Fallback: use shortest alias (production URLs are typically shorter)
        const shortestAlias = deployment.alias.reduce((shortest: string, current: string) => {
          return current.length < shortest.length ? current : shortest;
        }, deployment.alias[0]);
        productionUrl = `https://${shortestAlias}`;
        logger.info(`Using shortest alias as production URL: ${productionUrl}`);
      }
    } else if (deployment.projectId) {
      productionUrl = `https://${deployment.projectId}.vercel.app`;
      logger.info(`Constructed production URL from projectId: ${productionUrl}`);
    } else {
      // No alias and no projectId - cannot determine production URL
      logger.warn(`No alias or projectId found, cannot determine production URL`);
      productionUrl = undefined;
    }
    
    logger.info(`Deployment status for ${deploymentId}:`, {
      state: deployment.state,
      readyState: deployment.readyState,
      previewUrl: deployment.url,
      productionUrl: productionUrl,
      aliases: deployment.alias,
    });
    
    return {
      state: deployment.state || "unknown",
      readyState: deployment.readyState || "unknown",
      url: productionUrl || undefined, // Return production URL
    };
  } catch (err: any) {
    logger.error("Failed to get Vercel deployment status:", err);
    return {
      state: "error",
      readyState: "error",
      error: err.message || "Failed to get deployment status",
    };
  }
}

// --- Registration ---
export function registerVercelHandlers() {
  // DO NOT LOG this handler because tokens are sensitive
  ipcMain.handle("vercel:save-token", handleSaveVercelToken);

  // Logged handlers
  handle("vercel:list-projects", handleListVercelProjects);
  handle("vercel:is-project-available", handleIsProjectAvailable);
  handle("vercel:create-project", handleCreateProject);
  handle("vercel:connect-existing-project", handleConnectToExistingProject);
  handle("vercel:get-deployments", handleGetVercelDeployments);
  handle("vercel:disconnect", handleDisconnectVercelProject);
  handle("vercel:deploy", handleDeployToVercel);
  handle("vercel:get-deployment-status", handleGetVercelDeploymentStatus);
}

export async function updateAppVercelProject({
  appId,
  projectId,
  projectName,
  teamId,
  deploymentUrl,
}: {
  appId: number;
  projectId: string;
  projectName: string;
  teamId: string;
  deploymentUrl?: string | null;
}): Promise<void> {
  await db
    .update(schema.apps)
    .set({
      vercelProjectId: projectId,
      vercelProjectName: projectName,
      vercelTeamId: teamId,
      vercelDeploymentUrl: deploymentUrl,
    })
    .where(eq(schema.apps.id, appId));
  
  // Sync app to Supabase (non-blocking)
  try {
    const { syncAppByIdToSupabase } = await import('../../lib/supabase_app_sync');
    await syncAppByIdToSupabase(appId);
  } catch (error) {
    logger.warn('Failed to sync app to Supabase (non-critical):', error);
  }
}
