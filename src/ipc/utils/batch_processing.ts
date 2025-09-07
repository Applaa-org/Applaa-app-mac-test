import log from "electron-log";
import { createCacheableSystemPrompt, getCachingConfig } from "./prompt_caching";

const logger = log.scope("batch_processing");

export interface BatchRequest {
  custom_id: string;
  params: {
    model: string;
    max_tokens: number;
    system?: any; // Can be string or cacheable format
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
  };
}

export interface BatchResponse {
  id: string;
  type: "message_batch";
  processing_status: "in_progress" | "completed" | "failed" | "canceled" | "expired";
  request_counts: {
    processing: number;
    succeeded: number;
    errored: number;
    canceled: number;
    expired: number;
  };
  ended_at?: string;
  created_at: string;
  expires_at: string;
  archive_url?: string;
  results_url?: string;
}

export interface BatchResult {
  custom_id: string;
  result: {
    type: "succeeded" | "errored" | "canceled" | "expired";
    message?: any;
    error?: {
      type: string;
      message: string;
    };
  };
}

export class BatchProcessingService {
  private apiKey: string;
  private baseUrl = "https://api.anthropic.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Create a batch with prompt caching for maximum cost savings
   */
  async createOptimizedBatch(
    requests: Array<{
      id: string;
      systemPrompt: string;
      userMessage: string;
      model: string;
      maxTokens?: number;
    }>
  ): Promise<BatchResponse> {
    const cachingConfig = getCachingConfig("anthropic");
    
    const batchRequests: BatchRequest[] = requests.map(req => {
      // Create cacheable system prompt for maximum savings
      const cacheableSystem = createCacheableSystemPrompt(req.systemPrompt, cachingConfig);
      
      return {
        custom_id: req.id,
        params: {
          model: req.model,
          max_tokens: req.maxTokens || 4096,
          system: cacheableSystem,
          messages: [
            { role: "user", content: req.userMessage }
          ],
          temperature: 0
        }
      };
    });

    logger.log(`Creating batch with ${batchRequests.length} requests, all with prompt caching`);

    const response = await fetch(`${this.baseUrl}/messages/batches`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        requests: batchRequests
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Batch creation failed: ${error}`);
    }

    const batch = await response.json();
    logger.log(`Batch created successfully: ${batch.id}`);
    
    return batch;
  }

  /**
   * Check batch status
   */
  async getBatchStatus(batchId: string): Promise<BatchResponse> {
    const response = await fetch(`${this.baseUrl}/messages/batches/${batchId}`, {
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get batch status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get batch results when completed
   */
  async getBatchResults(batchId: string): Promise<BatchResult[]> {
    const batch = await this.getBatchStatus(batchId);
    
    if (batch.processing_status !== "completed") {
      throw new Error(`Batch not completed yet. Status: ${batch.processing_status}`);
    }

    if (!batch.results_url) {
      throw new Error("No results URL available");
    }

    const response = await fetch(batch.results_url, {
      headers: {
        "x-api-key": this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get batch results: ${response.statusText}`);
    }

    const resultsText = await response.text();
    const results: BatchResult[] = resultsText
      .trim()
      .split('\n')
      .map(line => JSON.parse(line));

    logger.log(`Retrieved ${results.length} batch results`);
    return results;
  }

  /**
   * Cancel a batch
   */
  async cancelBatch(batchId: string): Promise<BatchResponse> {
    const response = await fetch(`${this.baseUrl}/messages/batches/${batchId}/cancel`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel batch: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Calculate cost savings from batch + caching
   */
  calculateBatchSavings(
    requestCount: number,
    avgTokensPerRequest: number
  ): {
    standardCost: number;
    cachingOnlyCost: number;
    batchingOnlyCost: number;
    combinedCost: number;
    totalSavings: number;
    savingsPercentage: number;
  } {
    const pricePerMTok = 3.75; // Claude 3.5 Sonnet input
    const totalTokens = (requestCount * avgTokensPerRequest) / 1_000_000;

    const standardCost = totalTokens * pricePerMTok;
    const cachingOnlyCost = totalTokens * (pricePerMTok * 0.1); // 90% savings
    const batchingOnlyCost = totalTokens * (pricePerMTok * 0.5); // 50% savings
    const combinedCost = totalTokens * (pricePerMTok * 0.05); // 95% savings

    const totalSavings = standardCost - combinedCost;
    const savingsPercentage = (totalSavings / standardCost) * 100;

    return {
      standardCost,
      cachingOnlyCost,
      batchingOnlyCost,
      combinedCost,
      totalSavings,
      savingsPercentage
    };
  }
}

/**
 * Applaa-specific batch processing scenarios
 */
export class ApplaaBatchProcessor {
  private batchService: BatchProcessingService;

  constructor(apiKey: string) {
    this.batchService = new BatchProcessingService(apiKey);
  }

  /**
   * Process multiple app generation requests in batch
   */
  async batchGenerateApps(
    requests: Array<{
      appId: string;
      prompt: string;
      systemPrompt: string;
    }>
  ): Promise<string> {
    const batchRequests = requests.map(req => ({
      id: `app_gen_${req.appId}`,
      systemPrompt: req.systemPrompt,
      userMessage: req.prompt,
      model: "claude-3-5-sonnet-20241022",
      maxTokens: 8192
    }));

    const batch = await this.batchService.createOptimizedBatch(batchRequests);
    
    logger.log(`Started batch app generation for ${requests.length} apps`);
    logger.log(`Batch ID: ${batch.id}`);
    logger.log(`Expected completion: within 1 hour`);
    
    // Calculate and log savings
    const savings = this.batchService.calculateBatchSavings(
      requests.length,
      25665 // Your average system prompt tokens
    );
    
    logger.log(`Cost savings: $${savings.totalSavings.toFixed(2)} (${savings.savingsPercentage.toFixed(1)}%)`);
    
    return batch.id;
  }

  /**
   * Process code reviews in batch
   */
  async batchCodeReviews(
    codeFiles: Array<{
      fileId: string;
      filePath: string;
      content: string;
    }>
  ): Promise<string> {
    const systemPrompt = `You are an expert code reviewer. Analyze the provided code for:
- Code quality and best practices
- Potential bugs and security issues  
- Performance optimizations
- Maintainability improvements

Provide specific, actionable feedback.`;

    const batchRequests = codeFiles.map(file => ({
      id: `review_${file.fileId}`,
      systemPrompt,
      userMessage: `Review this ${file.filePath} file:\n\n${file.content}`,
      model: "claude-3-5-sonnet-20241022",
      maxTokens: 4096
    }));

    const batch = await this.batchService.createOptimizedBatch(batchRequests);
    
    logger.log(`Started batch code review for ${codeFiles.length} files`);
    return batch.id;
  }

  /**
   * Wait for batch completion and return results
   */
  async waitForBatchCompletion(
    batchId: string,
    maxWaitMinutes: number = 60
  ): Promise<BatchResult[]> {
    const startTime = Date.now();
    const maxWaitMs = maxWaitMinutes * 60 * 1000;

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.batchService.getBatchStatus(batchId);
      
      logger.log(`Batch ${batchId} status: ${status.processing_status}`);
      logger.log(`Progress: ${status.request_counts.succeeded}/${status.request_counts.processing + status.request_counts.succeeded} completed`);

      if (status.processing_status === "completed") {
        return await this.batchService.getBatchResults(batchId);
      }

      if (status.processing_status === "failed" || status.processing_status === "expired") {
        throw new Error(`Batch ${status.processing_status}: ${batchId}`);
      }

      // Wait 30 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 30000));
    }

    throw new Error(`Batch ${batchId} did not complete within ${maxWaitMinutes} minutes`);
  }
}

// Export singleton for easy use
export const createApplaaBatchProcessor = (apiKey: string) => new ApplaaBatchProcessor(apiKey);
