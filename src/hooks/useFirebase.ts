/**
 * React Hook for Firebase Functions
 * Provides easy access to secure Firebase Functions from React components
 */

import { useState, useEffect } from "react";
import { firebaseService } from "../services/firebase_service";
import log from "electron-log";

const logger = log.scope("useFirebase");

export function useFirebase() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initFirebase = async () => {
      try {
        await firebaseService.initialize();
        setIsInitialized(true);
        setIsAuthenticated(firebaseService.isAuthenticated());
        logger.info("Firebase initialized in React");
      } catch (err) {
        logger.error("Failed to initialize Firebase:", err);
        setError(err as Error);
      }
    };

    initFirebase();
  }, []);

  return {
    isInitialized,
    isAuthenticated,
    error,
    firebaseService,
  };
}

// Export individual function hooks for convenience
export function useAzureOpenAI() {
  const { firebaseService, isInitialized } = useFirebase();

  const callAzureOpenAI = async (params: {
    messages: Array<{ role: string; content: string }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }) => {
    if (!isInitialized) {
      throw new Error("Firebase not initialized");
    }
    return firebaseService.callAzureOpenAI(params);
  };

  return { callAzureOpenAI, isInitialized };
}

export function useGitHub() {
  const { firebaseService, isInitialized } = useFirebase();

  const createRepo = async (params: {
    repoName: string;
    isPrivate?: boolean;
    description?: string;
  }) => {
    if (!isInitialized) {
      throw new Error("Firebase not initialized");
    }
    return firebaseService.createGitHubRepo(params);
  };

  const pushToRepo = async (params: {
    owner: string;
    repo: string;
    branch: string;
    files: any[];
    commitMessage: string;
  }) => {
    if (!isInitialized) {
      throw new Error("Firebase not initialized");
    }
    return firebaseService.pushToGitHub(params);
  };

  return { createRepo, pushToRepo, isInitialized };
}

export function useVercel() {
  const { firebaseService, isInitialized } = useFirebase();

  const deploy = async (params: {
    projectName: string;
    gitUrl: string;
    envVars?: Record<string, string>;
  }) => {
    if (!isInitialized) {
      throw new Error("Firebase not initialized");
    }
    return firebaseService.deployToVercel(params);
  };

  const getDeploymentStatus = async (params: { deploymentId: string }) => {
    if (!isInitialized) {
      throw new Error("Firebase not initialized");
    }
    return firebaseService.getVercelDeploymentStatus(params);
  };

  return { deploy, getDeploymentStatus, isInitialized };
}
