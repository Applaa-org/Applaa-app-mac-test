// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { ipcMain, BrowserWindow, IpcMainInvokeEvent } from "electron";
import fetch from "node-fetch"; // Use node-fetch for making HTTP requests in main process
import { writeSettings, readSettings } from "../../main/settings";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import * as schema from "../../db/schema";
import * as fs from "node:fs";
import * as path from "node:path";
import { getDyadAppPath } from "../../paths/paths";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { GithubUser } from "../../lib/schemas";
import log from "electron-log";
import { IS_TEST_BUILD } from "../utils/test_utils";

const logger = log.scope("github_handlers");

// --- GitHub Device Flow Constants ---
// TODO: Fetch this securely, e.g., from environment variables or a config file
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "Ov23liWV2HdC0RBLecWx";

// Use test server URLs when in test mode

const TEST_SERVER_BASE = "http://localhost:3500";

const GITHUB_DEVICE_CODE_URL = IS_TEST_BUILD
  ? `${TEST_SERVER_BASE}/github/login/device/code`
  : "https://github.com/login/device/code";
const GITHUB_ACCESS_TOKEN_URL = IS_TEST_BUILD
  ? `${TEST_SERVER_BASE}/github/login/oauth/access_token`
  : "https://github.com/login/oauth/access_token";
const GITHUB_API_BASE = IS_TEST_BUILD
  ? `${TEST_SERVER_BASE}/github/api`
  : "https://api.github.com";
const GITHUB_GIT_BASE = IS_TEST_BUILD
  ? `${TEST_SERVER_BASE}/github/git`
  : "https://github.com";

const GITHUB_SCOPES = "repo,user,workflow"; // Define the scopes needed

// --- State Management (Simple in-memory, consider alternatives for robustness) ---
interface DeviceFlowState {
  deviceCode: string;
  interval: number;
  timeoutId: NodeJS.Timeout | null;
  isPolling: boolean;
  window: BrowserWindow | null; // Reference to the window that initiated the flow
}

// Simple map to track ongoing flows (key could be appId or a unique flow ID if needed)
// For simplicity, let's assume only one flow can happen at a time for now.
let currentFlowState: DeviceFlowState | null = null;

// --- Helper Functions ---

/**
 * Fetches the GitHub username of the currently authenticated user (using the stored access token).
 * @returns {Promise<string|null>} The GitHub username, or null if not authenticated or on error.
 */
export async function getGithubUser(): Promise<GithubUser | null> {
  const settings = readSettings();
  const email = settings.githubUser?.email;
  if (email) return { email };
  try {
    const accessToken = settings.githubAccessToken?.value;
    if (!accessToken) return null;
    const res = await fetch(`${GITHUB_API_BASE}/user/emails`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const emails = await res.json();
    const email = emails.find((e: any) => e.primary)?.email;
    if (!email) return null;

    writeSettings({
      githubUser: {
        email,
      },
    });
    return { email };
  } catch (err) {
    logger.error("[GitHub Handler] Failed to get GitHub username:", err);
    return null;
  }
}

// function event.sender.send(channel: string, data: any) {
//   if (currentFlowState?.window && !currentFlowState.window.isDestroyed()) {
//     currentFlowState.window.webContents.send(channel, data);
//   }
// }

async function pollForAccessToken(event: IpcMainInvokeEvent) {
  if (!currentFlowState || !currentFlowState.isPolling) {
    logger.debug("[GitHub Handler] Polling stopped or no active flow.");
    return;
  }

  const { deviceCode, interval } = currentFlowState;

  logger.debug("[GitHub Handler] Polling for token with device code");
  event.sender.send("github:flow-update", {
    message: "Polling GitHub for authorization...",
  });

  try {
    const response = await fetch(GITHUB_ACCESS_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    const data = await response.json();

    if (response.ok && data.access_token) {
      logger.log("Successfully obtained GitHub Access Token.");
      event.sender.send("github:flow-success", {
        message: "Successfully connected!",
      });
      writeSettings({
        githubAccessToken: {
          value: data.access_token,
        },
      });

      stopPolling();
      return;
    } else if (data.error) {
      switch (data.error) {
        case "authorization_pending":
          logger.debug("Authorization pending...");
          event.sender.send("github:flow-update", {
            message: "Waiting for user authorization...",
          });
          // Schedule next poll
          currentFlowState.timeoutId = setTimeout(
            () => pollForAccessToken(event),
            interval * 1000,
          );
          break;
        case "slow_down":
          const newInterval = interval + 5;
          logger.debug(`Slow down requested. New interval: ${newInterval}s`);
          currentFlowState.interval = newInterval; // Update interval
          event.sender.send("github:flow-update", {
            message: `GitHub asked to slow down. Retrying in ${newInterval}s...`,
          });
          currentFlowState.timeoutId = setTimeout(
            () => pollForAccessToken(event),
            newInterval * 1000,
          );
          break;
        case "expired_token":
          logger.error("Device code expired.");
          event.sender.send("github:flow-error", {
            error: "Verification code expired. Please try again.",
          });
          stopPolling();
          break;
        case "access_denied":
          logger.error("Access denied by user.");
          event.sender.send("github:flow-error", {
            error: "Authorization denied by user.",
          });
          stopPolling();
          break;
        default:
          logger.error(
            `Unknown GitHub error: ${data.error_description || data.error}`,
          );
          event.sender.send("github:flow-error", {
            error: `GitHub authorization error: ${
              data.error_description || data.error
            }`,
          });
          stopPolling();
          break;
      }
    } else {
      throw new Error(`Unknown response structure: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    logger.error("Error polling for GitHub access token:", error);
    event.sender.send("github:flow-error", {
      error: `Network or unexpected error during polling: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    stopPolling();
  }
}

function stopPolling() {
  if (currentFlowState) {
    if (currentFlowState.timeoutId) {
      clearTimeout(currentFlowState.timeoutId);
    }
    currentFlowState.isPolling = false;
    currentFlowState.timeoutId = null;

    logger.debug("[GitHub Handler] Polling stopped.");
  }
}

// --- IPC Handlers ---

function handleStartGithubFlow(
  event: IpcMainInvokeEvent,
  args: { appId: number | null },
) {
  logger.debug(`Received github:start-flow for appId: ${args.appId}`);

  // If a flow is already in progress, maybe cancel it or send an error
  if (currentFlowState && currentFlowState.isPolling) {
    logger.warn("Another GitHub flow is already in progress.");
    event.sender.send("github:flow-error", {
      error: "Another connection process is already active.",
    });
    return;
  }

  // Store the window that initiated the request
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) {
    logger.error("Could not get BrowserWindow instance.");
    return;
  }

  currentFlowState = {
    deviceCode: "",
    interval: 5, // Default interval
    timeoutId: null,
    isPolling: false,
    window: window,
  };

  event.sender.send("github:flow-update", {
    message: "Requesting device code from GitHub...",
  });

  fetch(GITHUB_DEVICE_CODE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      scope: GITHUB_SCOPES,
    }),
  })
    .then((res) => {
      if (!res.ok) {
        return res.json().then((errData) => {
          throw new Error(
            `GitHub API Error: ${errData.error_description || res.statusText}`,
          );
        });
      }
      return res.json();
    })
    .then((data) => {
      logger.info("Received device code response");
      if (!currentFlowState) return; // Flow might have been cancelled

      currentFlowState.deviceCode = data.device_code;
      currentFlowState.interval = data.interval || 5;
      currentFlowState.isPolling = true;

      // Send user code and verification URI to renderer
      event.sender.send("github:flow-update", {
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        message: "Please authorize in your browser.",
      });

      // Start polling after the initial interval
      currentFlowState.timeoutId = setTimeout(
        () => pollForAccessToken(event),
        currentFlowState.interval * 1000,
      );
    })
    .catch((error) => {
      logger.error("Error initiating GitHub device flow:", error);
      event.sender.send("github:flow-error", {
        error: `Failed to start GitHub connection: ${error.message}`,
      });
      stopPolling(); // Ensure polling stops on initial error
      currentFlowState = null; // Clear state on initial error
    });
}

// --- GitHub List Repos Handler ---
async function handleListGithubRepos(): Promise<
  { name: string; full_name: string; private: boolean }[]
> {
  try {
    // Get access token from settings
    const settings = readSettings();
    const accessToken = settings.githubAccessToken?.value;
    if (!accessToken) {
      throw new Error("Not authenticated with GitHub.");
    }

    // Fetch user's repositories
    const response = await fetch(
      `${GITHUB_API_BASE}/user/repos?per_page=100&sort=updated`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `GitHub API error: ${errorData.message || response.statusText}`,
      );
    }

    const repos = await response.json();
    return repos.map((repo: any) => ({
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
    }));
  } catch (err: any) {
    logger.error("[GitHub Handler] Failed to list repos:", err);
    throw new Error(err.message || "Failed to list GitHub repositories.");
  }
}

// --- GitHub Get Repo Branches Handler ---
async function handleGetRepoBranches(
  event: IpcMainInvokeEvent,
  { owner, repo }: { owner: string; repo: string },
): Promise<{ name: string; commit: { sha: string } }[]> {
  try {
    // Get access token from settings
    const settings = readSettings();
    const accessToken = settings.githubAccessToken?.value;
    if (!accessToken) {
      throw new Error("Not authenticated with GitHub.");
    }

    // Fetch repository branches
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/branches`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `GitHub API error: ${errorData.message || response.statusText}`,
      );
    }

    const branches = await response.json();
    return branches.map((branch: any) => ({
      name: branch.name,
      commit: { sha: branch.commit.sha },
    }));
  } catch (err: any) {
    logger.error("[GitHub Handler] Failed to get repo branches:", err);
    throw new Error(err.message || "Failed to get repository branches.");
  }
}

// --- GitHub Repo Availability Handler ---
async function handleIsRepoAvailable(
  event: IpcMainInvokeEvent,
  { org, repo }: { org: string; repo: string },
): Promise<{ available: boolean; error?: string }> {
  try {
    // Get access token from settings
    const settings = readSettings();
    const accessToken = settings.githubAccessToken?.value;
    if (!accessToken) {
      return { available: false, error: "Not authenticated with GitHub." };
    }
    // If org is empty, use the authenticated user
    const owner =
      org ||
      (await fetch(`${GITHUB_API_BASE}/user`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((r) => r.json())
        .then((u) => u.login));
    // Check if repo exists
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 404) {
      return { available: true };
    } else if (res.ok) {
      return { available: false, error: "Repository already exists." };
    } else {
      const data = await res.json();
      return { available: false, error: data.message || "Unknown error" };
    }
  } catch (err: any) {
    return { available: false, error: err.message || "Unknown error" };
  }
}

// --- GitHub Create Repo Handler ---
async function handleCreateRepo(
  event: IpcMainInvokeEvent,
  {
    org,
    repo,
    appId,
    branch,
  }: { org: string; repo: string; appId: number; branch?: string },
): Promise<void> {
  // Get access token from settings
  const settings = readSettings();
  const accessToken = settings.githubAccessToken?.value;
  if (!accessToken) {
    throw new Error("Not authenticated with GitHub.");
  }
  // If org is empty, create for the authenticated user
  let owner = org;
  if (!owner) {
    const userRes = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user = await userRes.json();
    owner = user.login;
  }
  // Create repo
  const createUrl = org
    ? `${GITHUB_API_BASE}/orgs/${owner}/repos`
    : `${GITHUB_API_BASE}/user/repos`;
  const res = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({
      name: repo,
      private: true,
    }),
  });
  if (!res.ok) {
    let errorMessage = `Failed to create repository (${res.status} ${res.statusText})`;
    try {
      const data = await res.json();
      logger.error("GitHub API error when creating repo:", {
        status: res.status,
        statusText: res.statusText,
        response: data,
      });

      // Handle specific GitHub API error cases
      if (data.message) {
        errorMessage = data.message;
      }

      // Handle validation errors with more details
      if (data.errors && Array.isArray(data.errors)) {
        const errorDetails = data.errors
          .map((err: any) => {
            if (typeof err === "string") return err;
            if (err.message) return err.message;
            if (err.code) return `${err.field || "field"}: ${err.code}`;
            return JSON.stringify(err);
          })
          .join(", ");
        errorMessage = `${data.message || "Repository creation failed"}: ${errorDetails}`;
      }
    } catch (jsonError) {
      // If response is not JSON, fall back to status text
      logger.error("Failed to parse GitHub API error response:", {
        status: res.status,
        statusText: res.statusText,
        jsonError:
          jsonError instanceof Error ? jsonError.message : String(jsonError),
      });
      errorMessage = `GitHub API error: ${res.status} ${res.statusText}`;
    }

    throw new Error(errorMessage);
  }
  // Store org, repo, and branch in the app's DB row (apps table)
  await updateAppGithubRepo({ appId, org: owner, repo, branch });
}

// --- GitHub Connect to Existing Repo Handler ---
async function handleConnectToExistingRepo(
  event: IpcMainInvokeEvent,
  {
    owner,
    repo,
    branch,
    appId,
  }: { owner: string; repo: string; branch: string; appId: number },
): Promise<void> {
  try {
    // Get access token from settings
    const settings = readSettings();
    const accessToken = settings.githubAccessToken?.value;
    if (!accessToken) {
      throw new Error("Not authenticated with GitHub.");
    }

    // Verify the repository exists and user has access
    const repoResponse = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      },
    );

    if (!repoResponse.ok) {
      const errorData = await repoResponse.json();
      throw new Error(
        `Repository not found or access denied: ${errorData.message}`,
      );
    }

    // Store org, repo, and branch in the app's DB row
    await updateAppGithubRepo({ appId, org: owner, repo, branch });
  } catch (err: any) {
    logger.error("[GitHub Handler] Failed to connect to existing repo:", err);
    throw new Error(err.message || "Failed to connect to existing repository.");
  }
}

// --- GitHub Push Handler ---
async function handlePushToGithub(
  event: IpcMainInvokeEvent,
  { appId, force }: { appId: number; force?: boolean },
) {
  try {
    // Get access token from settings
    const settings = readSettings();
    const accessToken = settings.githubAccessToken?.value;
    if (!accessToken) {
      return { success: false, error: "Not authenticated with GitHub." };
    }
    // Get app info from DB
    const app = await db.query.apps.findFirst({ where: eq(apps.id, appId) });
    if (!app || !app.githubOrg || !app.githubRepo) {
      return { success: false, error: "App is not linked to a GitHub repo." };
    }
    const appPath = getDyadAppPath(app.path);
    const branch = app.githubBranch || "main";

    // Set up remote URL with token
    const remoteUrl = IS_TEST_BUILD
      ? `${GITHUB_GIT_BASE}/${app.githubOrg}/${app.githubRepo}.git`
      : `https://${accessToken}:x-oauth-basic@github.com/${app.githubOrg}/${app.githubRepo}.git`;
    // Set or update remote URL using git config
    await git.setConfig({
      fs,
      dir: appPath,
      path: "remote.origin.url",
      value: remoteUrl,
    });
    // Push to GitHub
    await git.push({
      fs,
      http,
      dir: appPath,
      remote: "origin",
      ref: "main",
      remoteRef: branch,
      onAuth: () => ({
        username: accessToken,
        password: "x-oauth-basic",
      }),
      force: !!force,
    });
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to push to GitHub.",
    };
  }
}

async function handleDisconnectGithubRepo(
  event: IpcMainInvokeEvent,
  { appId }: { appId: number },
): Promise<void> {
  logger.log(`Disconnecting GitHub repo for appId: ${appId}`);

  // Get the app from the database
  const app = await db.query.apps.findFirst({
    where: eq(apps.id, appId),
  });

  if (!app) {
    throw new Error("App not found");
  }

  // Update app in database to remove GitHub repo, org, and branch
  await db
    .update(apps)
    .set({
      githubRepo: null,
      githubOrg: null,
      githubBranch: null,
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


// --- Registration ---
export function registerGithubHandlers() {
  ipcMain.handle("github:start-flow", handleStartGithubFlow);
  ipcMain.handle("github:list-repos", handleListGithubRepos);
  ipcMain.handle(
    "github:get-repo-branches",
    (event, args: { owner: string; repo: string }) =>
      handleGetRepoBranches(event, args),
  );
  ipcMain.handle("github:is-repo-available", handleIsRepoAvailable);
  ipcMain.handle("github:create-repo", handleCreateRepo);
  ipcMain.handle(
    "github:connect-existing-repo",
    (
      event,
      args: { owner: string; repo: string; branch: string; appId: number },
    ) => handleConnectToExistingRepo(event, args),
  );
  ipcMain.handle("github:push", handlePushToGithub);
  ipcMain.handle("github:disconnect", (event, args: { appId: number }) =>
    handleDisconnectGithubRepo(event, args),
  );
  ipcMain.handle("github:save-token", (event, args: { token: string }) =>
    handleSaveGithubAccessToken(event, args),
  );
  ipcMain.handle("github:update-app-info", (event, args: {
    appId: number;
    githubOrg: string;
    githubRepo: string;
    githubBranch: string;
  }) => handleUpdateAppGithubInfo(event, args));
  
  ipcMain.handle("github:auto-push", (event, args: {
    appId: number;
    githubToken: string;
    githubUsername: string;
    repoName: string;
    appPath: string;
  }) => handleAutoPushToGithub(event, args));
}

export async function updateAppGithubRepo({
  appId,
  org,
  repo,
  branch,
}: {
  appId: number;
  org?: string;
  repo: string;
  branch?: string;
}): Promise<void> {
  await db
    .update(schema.apps)
    .set({
      githubOrg: org,
      githubRepo: repo,
      githubBranch: branch || "main",
    })
    .where(eq(schema.apps.id, appId));
}

// --- Save GitHub Access Token Handler ---
async function handleSaveGithubAccessToken(
  event: IpcMainInvokeEvent,
  { token }: { token: string },
): Promise<void> {
  try {
    logger.info("Saving GitHub access token");
    writeSettings({
      githubAccessToken: {
        value: token,
      },
    });
    logger.info("GitHub access token saved successfully");
  } catch (err: any) {
    logger.error("Failed to save GitHub access token:", err);
    throw new Error(err.message || "Failed to save GitHub access token.");
  }
}

// --- Update App GitHub Info Handler (for auto push) ---
async function handleUpdateAppGithubInfo(
  event: IpcMainInvokeEvent,
  { appId, githubOrg, githubRepo, githubBranch }: { 
    appId: number; 
    githubOrg: string; 
    githubRepo: string; 
    githubBranch: string; 
  },
): Promise<void> {
  try {
    logger.info(`Updating app ${appId} GitHub info: ${githubOrg}/${githubRepo}`);
    await updateAppGithubRepo({ appId, org: githubOrg, repo: githubRepo, branch: githubBranch });
    logger.info("App GitHub info updated successfully");
  } catch (err: any) {
    logger.error("Failed to update app GitHub info:", err);
    throw new Error(err.message || "Failed to update app GitHub info.");
  }
}

// --- Auto Push to GitHub using isomorphic-git ---
async function handleAutoPushToGithub(
  event: IpcMainInvokeEvent,
  { appId, githubToken, githubUsername, repoName, appPath }: {
    appId: number;
    githubToken: string;
    githubUsername: string;
    repoName: string;
    appPath: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info(`AUTOPUSH: Start for app ${appId} → ${githubUsername}/${repoName}`);
    logger.info(`AUTOPUSH: appPath=${appPath}`);
    
    // Resolve to the actual app directory
    const dir = getDyadAppPath(appPath);
    logger.info(`AUTOPUSH: Resolved app directory: ${dir}`);
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const sample = entries.slice(0, 20).map(e => (e.isDirectory() ? `${e.name}/` : e.name));
      logger.info(`AUTOPUSH: Directory sample (${entries.length} entries): ${sample.join(', ')}`);
    } catch (e) {
      logger.warn(`AUTOPUSH: Failed to read directory '${dir}': ${String(e)}`);
    }
    const branch = "main";
    const owner = githubUsername;
    const repo = repoName;
    const message = "Auto commit from Applaa";
    const token = githubToken;
    const author = { name: "Applaa", email: "applaa@example.com" };

    // 1. Ensure GitHub repo exists
    const ghApiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    let repoExists = true;

    logger.info(`AUTOPUSH: Checking repo existence at ${ghApiUrl}`);
    const res = await fetch(ghApiUrl, {
      headers: { Authorization: `token ${token}` },
    });

    if (res.status === 404) {
      repoExists = false;
    } else if (!res.ok) {
      throw new Error(`GitHub API error: ${res.statusText}`);
    }

    if (!repoExists) {
      logger.info("AUTOPUSH: Repo not found. Creating new repo on GitHub...");
      const createRes = await fetch(`https://api.github.com/user/repos`, {
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: repo,
          private: false,
          auto_init: false,
        }),
      });

      if (!createRes.ok) {
        const text = await createRes.text();
        logger.error(`AUTOPUSH: Failed to create repo. Response=${text}`);
        throw new Error(`Failed to create repo: ${text}`);
      }
      logger.info(`AUTOPUSH: ✅ Repo ${owner}/${repo} created`);
    }

    // 2b. Bootstrap repo with README.md to guarantee default branch exists
    try {
      logger.info("AUTOPUSH: Bootstrapping repo with README.md (first commit)...");
      // check if README already exists
      const checkReadme = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/README.md`, {
        headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" },
      });
      if (checkReadme.status === 404) {
        const readmeContent = `# ${repo}\n\nThis repository was bootstrapped by Applaa.`;
        const createReadme = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/README.md`, {
          method: "PUT",
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "first commit",
            content: Buffer.from(readmeContent, "utf8").toString("base64"),
          }),
        });
        if (!createReadme.ok) {
          const t = await createReadme.text();
          logger.warn(`AUTOPUSH: README bootstrap failed: ${t}`);
        } else {
          logger.info("AUTOPUSH: ✅ README.md created (first commit)");
        }
      } else {
        logger.info("AUTOPUSH: README.md already exists; skipping bootstrap");
      }
    } catch (e) {
      logger.warn(`AUTOPUSH: README bootstrap step warning: ${String(e)}`);
    }

    // 2. Init repo if not exists
    try {
      logger.info("AUTOPUSH: Checking local git repo status...");
      await git.status({ fs, dir, filepath: "." });
    } catch {
      await git.init({ fs, dir, defaultBranch: branch });
      logger.info("AUTOPUSH: 📂 Initialized local repo");
    }

    // 3. Add remote (auto-create if missing)
    const remoteUrl = `https://${token}@github.com/${owner}/${repo}.git`;
    try {
      const remotes = await git.listRemotes({ fs, dir });
      const hasOrigin = remotes.some(r => r.remote === "origin");
      if (!hasOrigin) {
        await git.addRemote({ fs, dir, remote: "origin", url: remoteUrl });
        logger.info("AUTOPUSH: Added remote 'origin'");
      }
    } catch {
      await git.addRemote({ fs, dir, remote: "origin", url: remoteUrl });
      logger.info("AUTOPUSH: Added remote 'origin' (fallback)");
    }
    // Ensure origin URL is correct
    await git.setConfig({ fs, dir, path: "remote.origin.url", value: remoteUrl });
    // Ensure upstream config for main exists
    await git.setConfig({ fs, dir, path: "branch.main.remote", value: "origin" });
    await git.setConfig({ fs, dir, path: "branch.main.merge", value: "refs/heads/main" });
    logger.info("AUTOPUSH: Remote 'origin' configured");

    // 3b. Try fetching refs to initialize remote refs (ignore errors for new repo)
    try {
      await git.fetch({ fs, http, dir, remote: "origin", ref: `refs/heads/${branch}`, singleBranch: true });
      logger.info("AUTOPUSH: Fetched origin refs (optional)");
    } catch (e) {
      logger.info(`AUTOPUSH: Fetch skipped/failed (likely new repo): ${String(e)}`);
    }

    // 4. Ensure we are on the desired branch
    try {
      const branches = await git.listBranches({ fs, dir });
      if (!branches.includes(branch)) {
        logger.info(`AUTOPUSH: Creating branch '${branch}'`);
        await git.branch({ fs, dir, ref: branch });
      }
      const current = await git.currentBranch({ fs, dir, fullname: false });
      if (current !== branch) {
        logger.info(`AUTOPUSH: Checking out '${branch}' (current=${current || 'none'})`);
        await git.checkout({ fs, dir, ref: branch });
      }
    } catch (e) {
      logger.warn(`AUTOPUSH: Branch setup warning: ${String(e)}`);
      try { await git.branch({ fs, dir, ref: branch }); } catch {}
      await git.checkout({ fs, dir, ref: branch });
    }

    // 5. Stage all changes (blanket add to avoid misses)
    logger.info("AUTOPUSH: Staging all changes with 'add .'...");
    await git.add({ fs, dir, filepath: "." });
    
    // Explicitly ensure vercel.json is staged if it exists (for Godot apps)
    const vercelJsonPath = path.join(dir, "vercel.json");
    if (fs.existsSync(vercelJsonPath)) {
      try {
        await git.add({ fs, dir, filepath: "vercel.json" });
        logger.info("AUTOPUSH: ✅ Explicitly staged vercel.json");
      } catch (e) {
        logger.warn(`AUTOPUSH: Failed to explicitly stage vercel.json: ${String(e)}`);
      }
    } else {
      logger.info("AUTOPUSH: vercel.json not found (may not be needed for this app type)");
    }
    
    // Log status matrix to verify files are detected
    try {
      const matrixPreview = await git.statusMatrix({ fs, dir });
      logger.info(`AUTOPUSH: statusMatrix entries: ${matrixPreview.length}`);
      const sample = matrixPreview.slice(0, 30).map(([p, h, w, s]) => `${p} [H:${h} W:${w} S:${s}]`);
      logger.info(`AUTOPUSH: statusMatrix sample: ${sample.join(' | ')}`);
    } catch (e) {
      logger.warn(`AUTOPUSH: statusMatrix preview failed: ${String(e)}`);
    }
    // Always attempt a commit to ensure an initial commit exists
    try {
      const sha = await git.commit({ fs, dir, message, author });
      logger.info(`AUTOPUSH: ✅ Commit created: ${sha}`);
    } catch (commitErr: any) {
      logger.info(`AUTOPUSH: Commit skipped or failed: ${commitErr?.message || commitErr}`);
    }

    // 7. Push
    logger.info(`AUTOPUSH: Pushing to origin/${branch}...`);
    try {
      await git.push({
        fs,
        http,
        dir,
        remote: "origin",
        ref: `refs/heads/${branch}`,
        remoteRef: `refs/heads/${branch}`,
        onAuth: () => ({ username: token, password: "" }),
        force: true,
      });
    } catch (pushErr: any) {
      logger.warn(`AUTOPUSH: First push attempt failed: ${pushErr?.message || pushErr}`);
      logger.info("AUTOPUSH: Retrying push with force and fully-qualified remoteRef...");
      await git.push({
        fs,
        http,
        dir,
        remote: "origin",
        ref: `refs/heads/${branch}`,
        remoteRef: `refs/heads/${branch}`,
        onAuth: () => ({ username: token, password: "" }),
        force: true,
      });
    }
    logger.info(`AUTOPUSH: 🚀 Successfully pushed: ${owner}/${repo}@${branch}`);
    return { success: true };

  } catch (err: any) {
    logger.error("AUTOPUSH: Failed:", err);
    return { success: false, error: err.message || "Auto push failed" };
  }
}
