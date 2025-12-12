import { ipcMain } from "electron";
import log from "electron-log";
import {
  getVaultSecret,
  setVaultSecret,
  deleteVaultSecret,
  listVaultSecrets,
  getAllVaultSecrets,
  isVaultEnabled,
  loadVaultSecretsIntoEnv,
} from "../../lib/vault";

const logger = log.scope("vault_handlers");

export interface GetVaultSecretParams {
  secretName: string;
}

export interface SetVaultSecretParams {
  secretName: string;
  secretValue: string;
}

export interface DeleteVaultSecretParams {
  secretName: string;
}

/**
 * Register IPC handlers for Supabase Vault operations
 */
export function registerVaultHandlers() {
  // Check if Vault is enabled
  ipcMain.handle("vault:is-enabled", async () => {
    try {
      const enabled = await isVaultEnabled();
      return { success: true, enabled };
    } catch (error) {
      logger.error("Error checking if Vault is enabled:", error);
      throw new Error(
        `Failed to check Vault status: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  });

  // Get a single secret from Vault
  ipcMain.handle(
    "vault:get-secret",
    async (_, { secretName }: GetVaultSecretParams) => {
      try {
        if (!secretName) {
          throw new Error("Secret name is required");
        }

        const value = await getVaultSecret(secretName);
        return { success: true, value };
      } catch (error) {
        logger.error(`Error getting vault secret "${secretName}":`, error);
        throw new Error(
          `Failed to get vault secret: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
  );

  // Get all secrets from Vault
  ipcMain.handle("vault:get-all-secrets", async () => {
    try {
      const secrets = await getAllVaultSecrets();
      return { success: true, secrets };
    } catch (error) {
      logger.error("Error getting all vault secrets:", error);
      throw new Error(
        `Failed to get vault secrets: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  });

  // List all secret names
  ipcMain.handle("vault:list-secrets", async () => {
    try {
      const secretNames = await listVaultSecrets();
      return { success: true, secretNames };
    } catch (error) {
      logger.error("Error listing vault secrets:", error);
      throw new Error(
        `Failed to list vault secrets: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  });

  // Set a secret in Vault
  ipcMain.handle(
    "vault:set-secret",
    async (_, { secretName, secretValue }: SetVaultSecretParams) => {
      try {
        if (!secretName) {
          throw new Error("Secret name is required");
        }
        if (secretValue === undefined || secretValue === null) {
          throw new Error("Secret value is required");
        }

        const success = await setVaultSecret(secretName, secretValue);
        if (!success) {
          throw new Error("Failed to set vault secret");
        }

        return { success: true };
      } catch (error) {
        logger.error(
          `Error setting vault secret "${secretName}":`,
          error,
        );
        throw new Error(
          `Failed to set vault secret: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
  );

  // Delete a secret from Vault
  ipcMain.handle(
    "vault:delete-secret",
    async (_, { secretName }: DeleteVaultSecretParams) => {
      try {
        if (!secretName) {
          throw new Error("Secret name is required");
        }

        const success = await deleteVaultSecret(secretName);
        if (!success) {
          throw new Error("Failed to delete vault secret");
        }

        return { success: true };
      } catch (error) {
        logger.error(
          `Error deleting vault secret "${secretName}":`,
          error,
        );
        throw new Error(
          `Failed to delete vault secret: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
  );

  // Reload secrets from Vault into process.env
  ipcMain.handle("vault:reload-secrets", async () => {
    try {
      await loadVaultSecretsIntoEnv();
      return { success: true };
    } catch (error) {
      logger.error("Error reloading vault secrets:", error);
      throw new Error(
        `Failed to reload vault secrets: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  });

  logger.info("✅ Vault handlers registered");
}

