import { ipcMain } from "electron";
import { OAuth2Client } from "google-auth-library";
import { readSettings, writeSettings } from "../../main/settings";
import log from "electron-log";
import * as keytar from "keytar";
import { encrypt, decrypt } from "../../main/settings";

const logger = log.scope("gemini-auth");

// OAuth 2.0 configuration for Google AI Studio / Vertex AI
// For development, we'll use a placeholder configuration
// In production, these should be set via environment variables or secure configuration
const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "placeholder-client-id",
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "placeholder-client-secret",
  redirectUri: "http://localhost:8080/oauth/callback",
  scopes: [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/generative-language",
  ],
};

// Check if OAuth is properly configured
const isOAuthConfigured = () => {
  return GOOGLE_OAUTH_CONFIG.clientId !== "placeholder-client-id" && 
         GOOGLE_OAUTH_CONFIG.clientSecret !== "placeholder-client-secret";
};

const KEYTAR_SERVICE = "applaa-gemini";
const KEYTAR_ACCOUNT = "oauth-tokens";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GeminiAuthStatus {
  isAuthenticated: boolean;
  authMode?: "oauth" | "adc";
  projectId?: string;
  region?: string;
  email?: string;
  expiresAt?: number;
  error?: string;
}

/**
 * Securely store tokens using keytar (OS keychain) with fallback to encrypted settings
 */
async function storeTokensSecurely(tokens: TokenResponse): Promise<void> {
  try {
    // Try keytar first (OS keychain)
    await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, JSON.stringify(tokens));
    logger.info("Tokens stored securely in OS keychain");
  } catch (error) {
    logger.warn("Failed to store in keychain, falling back to encrypted settings:", error);
    
    // Fallback to encrypted settings
    const settings = readSettings();
    const now = Date.now();
    
    writeSettings({
      gemini: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        expiresIn: tokens.expires_in,
        tokenTimestamp: now,
        authMode: "oauth",
      },
    });
  }
}

/**
 * Retrieve tokens from secure storage
 */
async function getStoredTokens(): Promise<TokenResponse | null> {
  try {
    // Try keytar first
    const storedData = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
    if (storedData) {
      logger.info("Retrieved tokens from OS keychain");
      return JSON.parse(storedData);
    }
  } catch (error) {
    logger.warn("Failed to retrieve from keychain, checking encrypted settings:", error);
  }

  // Fallback to encrypted settings
  const settings = readSettings();
  if (settings.gemini?.accessToken && settings.gemini?.tokenTimestamp) {
    const tokens: TokenResponse = {
      access_token: settings.gemini.accessToken.value,
      refresh_token: settings.gemini.refreshToken?.value,
      expires_in: settings.gemini.expiresIn || 3600,
      token_type: "Bearer",
      scope: GOOGLE_OAUTH_CONFIG.scopes.join(" "),
    };
    return tokens;
  }

  return null;
}

/**
 * Clear stored tokens from all storage locations
 */
async function clearStoredTokens(): Promise<void> {
  try {
    await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
    logger.info("Cleared tokens from OS keychain");
  } catch (error) {
    logger.warn("Failed to clear keychain (may not exist):", error);
  }

  // Clear from settings
  const settings = readSettings();
  if (settings.gemini) {
    writeSettings({
      gemini: {
        ...settings.gemini,
        accessToken: undefined,
        refreshToken: undefined,
        expiresIn: undefined,
        tokenTimestamp: undefined,
      },
    });
  }
}

/**
 * Check if tokens are expired and need refresh
 */
function isTokenExpired(tokens: TokenResponse, tokenTimestamp: number): boolean {
  const now = Date.now();
  const expiresAt = tokenTimestamp + (tokens.expires_in * 1000);
  const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
  return now >= (expiresAt - bufferTime);
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
  try {
    const oauth2Client = new OAuth2Client(
      GOOGLE_OAUTH_CONFIG.clientId,
      GOOGLE_OAUTH_CONFIG.clientSecret,
      GOOGLE_OAUTH_CONFIG.redirectUri
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (credentials.access_token) {
      const tokenResponse: TokenResponse = {
        access_token: credentials.access_token,
        refresh_token: refreshToken, // Keep existing refresh token
        expires_in: credentials.expiry_date ? 
          Math.floor((credentials.expiry_date - Date.now()) / 1000) : 3600,
        token_type: "Bearer",
        scope: GOOGLE_OAUTH_CONFIG.scopes.join(" "),
      };

      await storeTokensSecurely(tokenResponse);
      logger.info("Access token refreshed successfully");
      return tokenResponse;
    }
  } catch (error) {
    logger.error("Failed to refresh access token:", error);
  }
  return null;
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getStoredTokens();
  if (!tokens) {
    return null;
  }

  const settings = readSettings();
  const tokenTimestamp = settings.gemini?.tokenTimestamp || Date.now();

  if (isTokenExpired(tokens, tokenTimestamp)) {
    if (tokens.refresh_token) {
      const refreshedTokens = await refreshAccessToken(tokens.refresh_token);
      return refreshedTokens?.access_token || null;
    } else {
      logger.warn("Token expired and no refresh token available");
      return null;
    }
  }

  return tokens.access_token;
}

// IPC Handlers

/**
 * Start OAuth 2.0 PKCE flow for Google authentication
 */
ipcMain.handle("gemini-auth-login", async (): Promise<{ authUrl: string; codeVerifier: string }> => {
  try {
    // Check if OAuth is properly configured
    if (!isOAuthConfigured()) {
      throw new Error("Google OAuth is not configured. Please set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET environment variables or configure OAuth credentials in Google Cloud Console.");
    }

    const oauth2Client = new OAuth2Client(
      GOOGLE_OAUTH_CONFIG.clientId,
      GOOGLE_OAUTH_CONFIG.clientSecret,
      GOOGLE_OAUTH_CONFIG.redirectUri
    );

    // Generate PKCE parameters - use crypto module for PKCE generation
    const crypto = await import('crypto');
    
    // Generate code verifier (43-128 characters, base64url-encoded)
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    
    // Generate code challenge (SHA256 hash of verifier, base64url-encoded)
    const codeChallenge = crypto.createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: GOOGLE_OAUTH_CONFIG.scopes,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "consent", // Force consent to get refresh token
    });

    logger.info("Generated OAuth URL for Gemini authentication");
    return { authUrl, codeVerifier };
  } catch (error) {
    logger.error("Failed to generate OAuth URL:", error);
    throw new Error(`Failed to start authentication: ${(error as Error).message}`);
  }
});

/**
 * Complete OAuth flow with authorization code
 */
ipcMain.handle("gemini-auth-callback", async (
  _event,
  { code, codeVerifier }: { code: string; codeVerifier: string }
): Promise<GeminiAuthStatus> => {
  try {
    const oauth2Client = new OAuth2Client(
      GOOGLE_OAUTH_CONFIG.clientId,
      GOOGLE_OAUTH_CONFIG.clientSecret,
      GOOGLE_OAUTH_CONFIG.redirectUri
    );

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken({
      code,
      codeVerifier,
    });

    if (!tokens.access_token) {
      throw new Error("No access token received");
    }

    const tokenResponse: TokenResponse = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || undefined,
      expires_in: tokens.expiry_date ? 
        Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
      token_type: "Bearer",
      scope: GOOGLE_OAUTH_CONFIG.scopes.join(" "),
    };

    await storeTokensSecurely(tokenResponse);

    // Get user info
    oauth2Client.setCredentials(tokens);
    const userInfo = await oauth2Client.getTokenInfo(tokens.access_token);

    logger.info("Gemini OAuth authentication completed successfully");

    return {
      isAuthenticated: true,
      authMode: "oauth",
      email: userInfo.email,
      expiresAt: tokens.expiry_date,
    };
  } catch (error) {
    logger.error("Failed to complete OAuth callback:", error);
    throw new Error(`Authentication failed: ${(error as Error).message}`);
  }
});

/**
 * Get current authentication status
 */
ipcMain.handle("gemini-auth-status", async (): Promise<GeminiAuthStatus> => {
  try {
    // Check if OAuth is properly configured first
    if (!isOAuthConfigured()) {
      return {
        isAuthenticated: false,
        error: "Google OAuth is not configured. Please set up OAuth credentials in Google Cloud Console."
      };
    }

    const accessToken = await getValidAccessToken();
    
    if (!accessToken) {
      return { isAuthenticated: false };
    }

    const settings = readSettings();
    const oauth2Client = new OAuth2Client();
    
    try {
      const tokenInfo = await oauth2Client.getTokenInfo(accessToken);
      
      return {
        isAuthenticated: true,
        authMode: settings.gemini?.authMode || "oauth",
        projectId: settings.gemini?.projectId,
        region: settings.gemini?.region,
        email: tokenInfo.email,
        expiresAt: tokenInfo.expiry_date,
      };
    } catch (error) {
      logger.warn("Token validation failed:", error);
      return { isAuthenticated: false, error: "Token validation failed" };
    }
  } catch (error) {
    logger.error("Failed to get auth status:", error);
          return { isAuthenticated: false, error: (error as Error).message };
  }
});

/**
 * Refresh current access token
 */
ipcMain.handle("gemini-auth-refresh", async (): Promise<GeminiAuthStatus> => {
  try {
    const tokens = await getStoredTokens();
    if (!tokens?.refresh_token) {
      throw new Error("No refresh token available");
    }

    const refreshedTokens = await refreshAccessToken(tokens.refresh_token);
    if (!refreshedTokens) {
      throw new Error("Failed to refresh token");
    }

    return {
      isAuthenticated: true,
      authMode: "oauth",
    };
  } catch (error) {
    logger.error("Failed to refresh token:", error);
    throw new Error(`Token refresh failed: ${(error as Error).message}`);
  }
});

/**
 * Logout and clear all stored tokens
 */
ipcMain.handle("gemini-auth-logout", async (): Promise<void> => {
  try {
    await clearStoredTokens();
    logger.info("Gemini authentication cleared");
  } catch (error) {
    logger.error("Failed to logout:", error);
    throw new Error(`Logout failed: ${(error as Error).message}`);
  }
});

/**
 * Revoke tokens with Google (optional)
 */
ipcMain.handle("gemini-auth-revoke", async (): Promise<void> => {
  try {
    const accessToken = await getValidAccessToken();
    if (accessToken) {
      const oauth2Client = new OAuth2Client();
      await oauth2Client.revokeToken(accessToken);
      logger.info("Tokens revoked with Google");
    }
    
    await clearStoredTokens();
    logger.info("Gemini authentication revoked and cleared");
  } catch (error) {
    logger.error("Failed to revoke tokens:", error);
    throw new Error(`Token revocation failed: ${(error as Error).message}`);
  }
});

/**
 * Update Vertex AI configuration (Project ID, Region)
 */
ipcMain.handle("gemini-auth-update-vertex-config", async (
  _event,
  { projectId, region }: { projectId: string; region: string }
): Promise<void> => {
  try {
    const settings = readSettings();
    writeSettings({
      gemini: {
        ...settings.gemini,
        projectId,
        region,
      },
    });
    logger.info(`Updated Vertex AI config: ${projectId}@${region}`);
  } catch (error) {
    logger.error("Failed to update Vertex config:", error);
    throw new Error(`Failed to update configuration: ${(error as Error).message}`);
  }
});

/**
 * Register all Gemini authentication IPC handlers
 */
export function registerGeminiAuthHandlers() {
  // Handlers are already registered above via ipcMain.handle calls
  logger.info("Gemini authentication handlers registered");
}

// Export for testing
export {
  storeTokensSecurely,
  getStoredTokens,
  clearStoredTokens,
  getValidAccessToken,
  refreshAccessToken,
};
