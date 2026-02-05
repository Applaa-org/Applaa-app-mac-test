/**
 * Firebase Service for Applaa
 * Handles authentication, secure function calls, and remote configuration
 */

import { initializeApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  Auth,
  User 
} from "firebase/auth";
import { 
  getFunctions, 
  httpsCallable, 
  Functions 
} from "firebase/functions";
import {
  getRemoteConfig,
  fetchAndActivate,
  getValue,
  RemoteConfig
} from "firebase/remote-config";
import { firebaseConfig } from "../config/firebase.config";
import log from "electron-log";

const logger = log.scope("firebase_service");

// Interface for remote configuration
export interface RemoteSupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

class FirebaseService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private functions: Functions | null = null;
  private remoteConfig: RemoteConfig | null = null;
  private currentUser: User | null = null;
  private supabaseConfig: RemoteSupabaseConfig | null = null;

  /**
   * Initialize Firebase
   */
  async initialize(): Promise<void> {
    try {
      // Initialize Firebase app
      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.functions = getFunctions(this.app, "us-central1");
      this.remoteConfig = getRemoteConfig(this.app);

      // Configure Remote Config
      this.remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour

      // Set default values for Remote Config
      this.remoteConfig.defaultConfig = {
        supabase_url: "https://pzprgvlutyfqfwmllufm.supabase.co",
        supabase_anon_key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cHJndmx1dHlmcWZ3bWxsdWZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODg1MTksImV4cCI6MjA3MjY2NDUxOX0.yKKIL4a6pNwMqKT1iYsmfRXecyR8_4ksyGH-8kxoBWM"
      };

      logger.info("Firebase initialized successfully");

      // Sign in anonymously for Electron app
      await this.signIn();

      // Fetch remote configuration
      await this.fetchRemoteConfig();
    } catch (error) {
      logger.error("Failed to initialize Firebase:", error);
      throw error;
    }
  }

  /**
   * Fetch and cache remote configuration from Firebase Remote Config
   */
  private async fetchRemoteConfig(): Promise<void> {
    if (!this.remoteConfig) {
      logger.warn("Remote Config not initialized");
      return;
    }

    try {
      logger.info("Fetching remote configuration...");
      
      // Fetch and activate remote config
      const activated = await fetchAndActivate(this.remoteConfig);
      
      if (activated) {
        logger.info("Remote config fetched and activated");
      } else {
        logger.info("Using cached remote config");
      }

      // Get Supabase configuration from Remote Config
      const supabaseUrl = getValue(this.remoteConfig, "supabase_url").asString();
      const supabaseAnonKey = getValue(this.remoteConfig, "supabase_anon_key").asString();

      this.supabaseConfig = {
        supabaseUrl,
        supabaseAnonKey
      };

      logger.info("Supabase configuration loaded from Remote Config");
    } catch (error) {
      logger.error("Failed to fetch remote config, using defaults:", error);
      
      // Use default values if fetch fails
      this.supabaseConfig = {
        supabaseUrl: "https://pzprgvlutyfqfwmllufm.supabase.co",
        supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cHJndmx1dHlmcWZ3bWxsdWZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODg1MTksImV4cCI6MjA3MjY2NDUxOX0.yKKIL4a6pNwMqKT1iYsmfRXecyR8_4ksyGH-8kxoBWM"
      };
    }
  }

  /**
   * Get Supabase configuration from Remote Config
   */
  getSupabaseConfig(): RemoteSupabaseConfig | null {
    return this.supabaseConfig;
  }

  /**
   * Manually refresh remote configuration
   */
  async refreshRemoteConfig(): Promise<void> {
    await this.fetchRemoteConfig();
  }

  /**
   * Sign in anonymously (suitable for desktop apps)
   */
  private async signIn(): Promise<void> {
    if (!this.auth) {
      throw new Error("Firebase auth not initialized");
    }

    try {
      const result = await signInAnonymously(this.auth);
      this.currentUser = result.user;
      logger.info("Signed in anonymously:", this.currentUser.uid);
    } catch (error) {
      logger.error("Failed to sign in:", error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // ============================================================================
  // AZURE OPENAI FUNCTIONS
  // ============================================================================

  /**
   * Call Azure OpenAI API securely via Firebase Function
   */
  async callAzureOpenAI(params: {
    messages: Array<{ role: string; content: string }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<any> {
    if (!this.functions) {
      throw new Error("Firebase functions not initialized");
    }

    const callAzureOpenAI = httpsCallable(this.functions, "callAzureOpenAI");
    const result = await callAzureOpenAI(params);
    return result.data;
  }

  // ============================================================================
  // GITHUB FUNCTIONS
  // ============================================================================

  /**
   * Create GitHub repository securely via Firebase Function
   */
  async createGitHubRepo(params: {
    repoName: string;
    isPrivate?: boolean;
    description?: string;
  }): Promise<any> {
    if (!this.functions) {
      throw new Error("Firebase functions not initialized");
    }

    const createGitHubRepo = httpsCallable(this.functions, "createGitHubRepo");
    const result = await createGitHubRepo(params);
    return result.data;
  }

  /**
   * Push to GitHub securely via Firebase Function
   */
  async pushToGitHub(params: {
    owner: string;
    repo: string;
    branch: string;
    files: any[];
    commitMessage: string;
  }): Promise<any> {
    if (!this.functions) {
      throw new Error("Firebase functions not initialized");
    }

    const pushToGitHub = httpsCallable(this.functions, "pushToGitHub");
    const result = await pushToGitHub(params);
    return result.data;
  }

  // ============================================================================
  // VERCEL FUNCTIONS
  // ============================================================================

  /**
   * Deploy to Vercel securely via Firebase Function
   */
  async deployToVercel(params: {
    projectName: string;
    gitUrl: string;
    envVars?: Record<string, string>;
  }): Promise<any> {
    if (!this.functions) {
      throw new Error("Firebase functions not initialized");
    }

    const deployToVercel = httpsCallable(this.functions, "deployToVercel");
    const result = await deployToVercel(params);
    return result.data;
  }

  /**
   * Get Vercel deployment status securely via Firebase Function
   */
  async getVercelDeploymentStatus(params: {
    deploymentId: string;
  }): Promise<any> {
    if (!this.functions) {
      throw new Error("Firebase functions not initialized");
    }

    const getStatus = httpsCallable(
      this.functions,
      "getVercelDeploymentStatus"
    );
    const result = await getStatus(params);
    return result.data;
  }

  // ============================================================================
  // E2B FUNCTIONS
  // ============================================================================

  /**
   * Execute code in E2B sandbox securely via Firebase Function
   */
  async executeInE2B(params: {
    code: string;
    language: string;
  }): Promise<any> {
    if (!this.functions) {
      throw new Error("Firebase functions not initialized");
    }

    const executeInE2B = httpsCallable(this.functions, "executeInE2B");
    const result = await executeInE2B(params);
    return result.data;
  }
}

// Export singleton instance
export const firebaseService = new FirebaseService();
