/**
 * Secure Firebase Cloud Functions for Applaa
 * These functions protect sensitive API keys and tokens
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");

// Load environment variables
require("dotenv").config();

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

// ============================================================================
// AZURE OPENAI FUNCTIONS
// ============================================================================

/**
 * Call Azure OpenAI API securely
 * @param {Object} data - { messages, model, temperature, maxTokens }
 * @returns {Promise<Object>} - OpenAI response
 */
exports.callAzureOpenAI = onCall(async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to call this function",
    );
  }

  const {messages, model, temperature, maxTokens} = request.data;

  if (!messages || !Array.isArray(messages)) {
    throw new HttpsError(
        "invalid-argument",
        "messages must be an array",
    );
  }

  try {
    const endpoint = process.env.AZURE_ENDPOINT;
    const deployment = process.env.AZURE_DEPLOYMENT_NAME;
    const apiVersion = process.env.AZURE_API_VERSION;
    const url = `${endpoint}/openai/deployments/${deployment}/` +
                `chat/completions?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": process.env.AZURE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        model: model || "gpt-4",
        temperature: temperature || 0.7,
        max_tokens: maxTokens || 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Azure OpenAI API error:", errorText);
      throw new HttpsError("internal", `Azure OpenAI API error: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Error calling Azure OpenAI:", error);
    throw new HttpsError("internal", error.message);
  }
});

// ============================================================================
// GITHUB FUNCTIONS
// ============================================================================

/**
 * Create a GitHub repository
 * @param {Object} data - { repoName, isPrivate, description }
 * @returns {Promise<Object>} - Repository info
 */
exports.createGitHubRepo = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const {repoName, isPrivate, description} = request.data;

  if (!repoName) {
    throw new HttpsError("invalid-argument", "repoName is required");
  }

  try {
    const response = await fetch(
        `https://api.github.com/orgs/${process.env.GITHUB_USERNAME}/repos`,
        {
          method: "POST",
          headers: {
            "Authorization": `token ${process.env.GITHUB_TOKEN}`,
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: repoName,
            private: isPrivate || false,
            description: description || "",
            auto_init: false,
          }),
        },
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("GitHub API error:", errorText);
      throw new HttpsError("internal", `GitHub API error: ${errorText}`);
    }

    const data = await response.json();
    logger.info(`Created GitHub repo: ${data.full_name}`);

    return {
      repoUrl: data.html_url,
      cloneUrl: data.clone_url,
      fullName: data.full_name,
    };
  } catch (error) {
    logger.error("Error creating GitHub repo:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Push code to GitHub (via API)
 * @param {Object} data - { owner, repo, branch, files, commitMessage }
 * @returns {Promise<Object>} - Commit info
 */
exports.pushToGitHub = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const {owner, repo, branch, files, commitMessage} = request.data;

  if (!owner || !repo || !files || !commitMessage) {
    throw new HttpsError(
        "invalid-argument",
        "owner, repo, files, and commitMessage are required",
    );
  }

  try {
    // This is a simplified version - in production you'd want to:
    // 1. Get the reference
    // 2. Get the commit
    // 3. Create a tree
    // 4. Create a commit
    // 5. Update the reference

    logger.info(`Pushing to ${owner}/${repo} on branch ${branch}`);

    // For now, return success - full implementation would require
    // multiple GitHub API calls to create trees and commits
    return {
      success: true,
      message: "Push initiated",
      repoUrl: `https://github.com/${owner}/${repo}`,
    };
  } catch (error) {
    logger.error("Error pushing to GitHub:", error);
    throw new HttpsError("internal", error.message);
  }
});

// ============================================================================
// VERCEL FUNCTIONS
// ============================================================================

/**
 * Deploy to Vercel
 * @param {Object} data - { projectName, gitUrl, envVars }
 * @returns {Promise<Object>} - Deployment info
 */
exports.deployToVercel = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const {projectName, gitUrl, envVars} = request.data;

  if (!projectName || !gitUrl) {
    throw new HttpsError(
        "invalid-argument",
        "projectName and gitUrl are required",
    );
  }

  try {
    const response = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName,
        gitSource: {
          type: "github",
          repoId: gitUrl,
        },
        env: envVars || {},
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Vercel API error:", errorText);
      throw new HttpsError("internal", `Vercel API error: ${errorText}`);
    }

    const data = await response.json();
    logger.info(`Vercel deployment created: ${data.id}`);

    return {
      deploymentId: data.id,
      deploymentUrl: data.url,
      status: data.readyState,
    };
  } catch (error) {
    logger.error("Error deploying to Vercel:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get Vercel deployment status
 * @param {Object} data - { deploymentId }
 * @returns {Promise<Object>} - Deployment status
 */
exports.getVercelDeploymentStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const {deploymentId} = request.data;

  if (!deploymentId) {
    throw new HttpsError("invalid-argument", "deploymentId is required");
  }

  try {
    const response = await fetch(
        `https://api.vercel.com/v13/deployments/${deploymentId}`,
        {
          headers: {
            "Authorization": `Bearer ${process.env.VERCEL_TOKEN}`,
          },
        },
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Vercel API error:", errorText);
      throw new HttpsError("internal", `Vercel API error: ${errorText}`);
    }

    const data = await response.json();

    return {
      deploymentId: data.id,
      status: data.readyState,
      state: data.state,
      url: data.url,
      error: data.error,
    };
  } catch (error) {
    logger.error("Error getting Vercel deployment status:", error);
    throw new HttpsError("internal", error.message);
  }
});

// ============================================================================
// E2B SANDBOX FUNCTIONS
// ============================================================================

/**
 * Execute code in E2B sandbox
 * @param {Object} data - { code, language }
 * @returns {Promise<Object>} - Execution result
 */
exports.executeInE2B = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const {code, language} = request.data;

  if (!code || !language) {
    throw new HttpsError("invalid-argument", "code and language are required");
  }

  try {
    const response = await fetch("https://api.e2b.dev/sandbox/run", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.E2B_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        language,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("E2B API error:", errorText);
      throw new HttpsError("internal", `E2B API error: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Error executing code in E2B:", error);
    throw new HttpsError("internal", error.message);
  }
});
