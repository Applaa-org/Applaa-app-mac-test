import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import path from "path";
import { SemanticContextManager, SmartSuggestion, ContextSuggestionOptions } from "../../context/semantic_context_manager";
import { IndexingProgress } from "../../context/indexing_pipeline";

const logger = log.scope("semantic_context_handlers");
const handle = createLoggedHandler(logger);

// Global instance - initialized lazily
let semanticContextManager: SemanticContextManager | null = null;

function getSemanticContextManager(): SemanticContextManager {
  if (!semanticContextManager) {
    try {
      // Store vector database in userData directory
      const userDataPath = require('electron').app.getPath('userData');
      const vectorDbPath = path.join(userDataPath, 'semantic_context.db');
      semanticContextManager = new SemanticContextManager(vectorDbPath);
    } catch (error) {
      logger.error('Failed to create semantic context manager:', error);
      throw new Error('Semantic context features are not available');
    }
  }
  return semanticContextManager;
}

export interface IndexAppParams {
  appId: number;
  appPath: string;
  excludePaths?: string[];
  includePatterns?: string[];
}

export interface GetSuggestionsParams {
  query: string;
  appId: number;
  maxSuggestions?: number;
  minSimilarity?: number;
  excludePaths?: string[];
  includeOtherApps?: boolean;
  mentionedApps?: string[];
}

export interface RecordFeedbackParams {
  filePath: string;
  appId: number;
  query: string;
  accepted: boolean;
}

export interface UpdateFileParams {
  appId: number;
  appPath: string;
  filePath: string;
}

export interface DeleteFileParams {
  appId: number;
  filePath: string;
}

export function registerSemanticContextHandlers() {
  // Get smart context suggestions
  handle(
    "semantic-context:get-suggestions",
    async (_, params: GetSuggestionsParams): Promise<SmartSuggestion[]> => {
      try {
        const manager = getSemanticContextManager();
        
        const options: ContextSuggestionOptions = {
          query: params.query,
          appId: params.appId,
          maxSuggestions: params.maxSuggestions || 5,
          minSimilarity: params.minSimilarity || 0.3,
          excludePaths: params.excludePaths || [],
          includeOtherApps: params.includeOtherApps || false,
          mentionedApps: params.mentionedApps || []
        };

        const suggestions = await manager.getSmartSuggestions(options);
        logger.debug(`Generated ${suggestions.length} suggestions for query: "${params.query.substring(0, 50)}..."`);
        
        return suggestions;
      } catch (error) {
        logger.error("Failed to get semantic context suggestions:", error);
        return []; // Graceful fallback
      }
    }
  );

  // Index an app's codebase
  handle(
    "semantic-context:index-app",
    async (_, params: IndexAppParams): Promise<{ success: boolean; error?: string }> => {
      try {
        const manager = getSemanticContextManager();
        
        logger.info(`Starting indexing for app ${params.appId}`);
        
        await manager.indexApp(
          params.appId,
          params.appPath,
          {
            excludePaths: params.excludePaths,
            includePatterns: params.includePatterns
          },
          (progress: IndexingProgress) => {
            // Send progress updates to renderer
            // Note: In a real implementation, you'd want to use a proper event system
            logger.debug(`Indexing progress: ${progress.phase} ${progress.current}/${progress.total}`);
          }
        );

        logger.info(`Successfully indexed app ${params.appId}`);
        return { success: true };
      } catch (error) {
        logger.error(`Failed to index app ${params.appId}:`, error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  // Update a single file in the index
  handle(
    "semantic-context:update-file",
    async (_, params: UpdateFileParams): Promise<{ success: boolean; error?: string }> => {
      try {
        const manager = getSemanticContextManager();
        await manager.updateFile(params.appId, params.appPath, params.filePath);
        
        logger.debug(`Updated file ${params.filePath} in app ${params.appId}`);
        return { success: true };
      } catch (error) {
        logger.error(`Failed to update file ${params.filePath}:`, error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  // Delete a file from the index
  handle(
    "semantic-context:delete-file",
    async (_, params: DeleteFileParams): Promise<{ success: boolean; error?: string }> => {
      try {
        const manager = getSemanticContextManager();
        await manager.deleteFile(params.appId, params.filePath);
        
        logger.debug(`Deleted file ${params.filePath} from app ${params.appId}`);
        return { success: true };
      } catch (error) {
        logger.error(`Failed to delete file ${params.filePath}:`, error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  // Delete all indexed data for an app
  handle(
    "semantic-context:delete-app",
    async (_, params: { appId: number }): Promise<{ success: boolean; error?: string }> => {
      try {
        const manager = getSemanticContextManager();
        await manager.deleteApp(params.appId);
        
        logger.info(`Deleted all indexed data for app ${params.appId}`);
        return { success: true };
      } catch (error) {
        logger.error(`Failed to delete app ${params.appId}:`, error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  // Record user feedback on suggestions
  handle(
    "semantic-context:record-feedback",
    async (_, params: RecordFeedbackParams): Promise<{ success: boolean; error?: string }> => {
      try {
        const manager = getSemanticContextManager();
        await manager.recordFeedback(
          params.filePath,
          params.appId,
          params.query,
          params.accepted
        );
        
        logger.debug(`Recorded feedback for ${params.filePath}: ${params.accepted ? 'accepted' : 'rejected'}`);
        return { success: true };
      } catch (error) {
        logger.error(`Failed to record feedback:`, error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  // Get analytics data
  handle(
    "semantic-context:get-analytics",
    async (_, params: { appId?: number }): Promise<any> => {
      try {
        const manager = getSemanticContextManager();
        const analytics = await manager.getAnalytics(params.appId);
        
        logger.debug(`Retrieved analytics for app ${params.appId || 'all'}`);
        return analytics;
      } catch (error) {
        logger.error("Failed to get analytics:", error);
        return {
          totalDocuments: 0,
          topFiles: [],
          averageAcceptanceRate: 0,
          totalUsage: 0
        };
      }
    }
  );

  // Check if an app is indexed
  handle(
    "semantic-context:is-app-indexed",
    async (_, params: { appId: number }): Promise<boolean> => {
      try {
        const manager = getSemanticContextManager();
        const isIndexed = await manager.isAppIndexed(params.appId);
        
        logger.debug(`App ${params.appId} indexed status: ${isIndexed}`);
        return isIndexed;
      } catch (error) {
        logger.error(`Failed to check if app ${params.appId} is indexed:`, error);
        return false;
      }
    }
  );

  // Get indexed file count for an app
  handle(
    "semantic-context:get-file-count",
    async (_, params: { appId: number }): Promise<number> => {
      try {
        const manager = getSemanticContextManager();
        const count = await manager.getIndexedFileCount(params.appId);
        
        logger.debug(`App ${params.appId} has ${count} indexed files`);
        return count;
      } catch (error) {
        logger.error(`Failed to get file count for app ${params.appId}:`, error);
        return 0;
      }
    }
  );

  // Initialize the semantic context system
  handle(
    "semantic-context:initialize",
    async (): Promise<{ success: boolean; error?: string }> => {
      try {
        // Check if transformers package is available
        try {
          await import('@xenova/transformers');
        } catch (importError) {
          logger.warn("Transformers package not available, semantic context disabled");
          return { 
            success: false, 
            error: "Semantic context features require @xenova/transformers package. Install with: npm install @xenova/transformers" 
          };
        }

        const manager = getSemanticContextManager();
        await manager.initialize();
        
        logger.info("Semantic context system initialized");
        return { success: true };
      } catch (error) {
        logger.error("Failed to initialize semantic context system:", error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  logger.info("Registered semantic context IPC handlers");
}

// Cleanup function for graceful shutdown
export async function disposeSemanticContext(): Promise<void> {
  if (semanticContextManager) {
    try {
      await semanticContextManager.dispose();
      semanticContextManager = null;
      logger.info("Semantic context manager disposed");
    } catch (error) {
      logger.error("Error disposing semantic context manager:", error);
    }
  }
}
