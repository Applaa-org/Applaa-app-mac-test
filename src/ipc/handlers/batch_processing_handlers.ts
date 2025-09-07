import { ipcMain } from "electron";
import log from "electron-log";
import { readSettings } from "../../main/settings";
import { createApplaaBatchProcessor } from "../utils/batch_processing";

const logger = log.scope("batch_processing_handlers");

export interface BatchProcessingRequest {
  type: "app_generation" | "code_review" | "content_analysis";
  requests: Array<{
    id: string;
    prompt: string;
    systemPrompt?: string;
    metadata?: any;
  }>;
  model?: string;
}

export interface BatchProcessingResponse {
  batchId: string;
  requestCount: number;
  estimatedCompletion: string;
  costSavings: {
    standardCost: number;
    optimizedCost: number;
    totalSavings: number;
    savingsPercentage: number;
  };
}

export function registerBatchProcessingHandlers() {
  ipcMain.handle(
    "batch:create-optimized",
    async (event, request: BatchProcessingRequest): Promise<BatchProcessingResponse> => {
      try {
        logger.log(`Creating optimized batch for ${request.type} with ${request.requests.length} requests`);
        
        const settings = readSettings();
        const anthropicApiKey = settings.providerSettings?.anthropic?.apiKey?.value;
        
        if (!anthropicApiKey) {
          throw new Error("Anthropic API key not configured");
        }

        const batchProcessor = createApplaaBatchProcessor(anthropicApiKey);
        
        let batchId: string;
        let avgTokens = 25665; // Default to your system prompt size

        switch (request.type) {
          case "app_generation":
            batchId = await batchProcessor.batchGenerateApps(
              request.requests.map(req => ({
                appId: req.id,
                prompt: req.prompt,
                systemPrompt: req.systemPrompt || "Default app generation prompt"
              }))
            );
            avgTokens = 30000; // Larger for app generation
            break;

          case "code_review":
            const codeFiles = request.requests.map(req => ({
              fileId: req.id,
              filePath: req.metadata?.filePath || "unknown",
              content: req.prompt
            }));
            batchId = await batchProcessor.batchCodeReviews(codeFiles);
            avgTokens = 15000; // Medium for code review
            break;

          default:
            throw new Error(`Unsupported batch type: ${request.type}`);
        }

        // Calculate cost savings
        const batchService = (batchProcessor as any).batchService;
        const savings = batchService.calculateBatchSavings(
          request.requests.length,
          avgTokens
        );

        const estimatedCompletion = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now

        logger.log(`Batch created: ${batchId}`);
        logger.log(`Cost savings: $${savings.totalSavings.toFixed(2)} (${savings.savingsPercentage.toFixed(1)}%)`);

        return {
          batchId,
          requestCount: request.requests.length,
          estimatedCompletion,
          costSavings: {
            standardCost: savings.standardCost,
            optimizedCost: savings.combinedCost,
            totalSavings: savings.totalSavings,
            savingsPercentage: savings.savingsPercentage
          }
        };
      } catch (error) {
        logger.error("Failed to create optimized batch:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "batch:get-status",
    async (event, batchId: string) => {
      try {
        const settings = readSettings();
        const anthropicApiKey = settings.providerSettings?.anthropic?.apiKey?.value;
        
        if (!anthropicApiKey) {
          throw new Error("Anthropic API key not configured");
        }

        const batchProcessor = createApplaaBatchProcessor(anthropicApiKey);
        const batchService = (batchProcessor as any).batchService;
        
        return await batchService.getBatchStatus(batchId);
      } catch (error) {
        logger.error("Failed to get batch status:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "batch:get-results",
    async (event, batchId: string) => {
      try {
        const settings = readSettings();
        const anthropicApiKey = settings.providerSettings?.anthropic?.apiKey?.value;
        
        if (!anthropicApiKey) {
          throw new Error("Anthropic API key not configured");
        }

        const batchProcessor = createApplaaBatchProcessor(anthropicApiKey);
        
        return await batchProcessor.waitForBatchCompletion(batchId, 60);
      } catch (error) {
        logger.error("Failed to get batch results:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "batch:cancel",
    async (event, batchId: string) => {
      try {
        const settings = readSettings();
        const anthropicApiKey = settings.providerSettings?.anthropic?.apiKey?.value;
        
        if (!anthropicApiKey) {
          throw new Error("Anthropic API key not configured");
        }

        const batchProcessor = createApplaaBatchProcessor(anthropicApiKey);
        const batchService = (batchProcessor as any).batchService;
        
        return await batchService.cancelBatch(batchId);
      } catch (error) {
        logger.error("Failed to cancel batch:", error);
        throw error;
      }
    }
  );
}
