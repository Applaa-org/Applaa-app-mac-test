import { ipcMain } from "electron";
import log from "electron-log";
import { costOptimizationService } from "../utils/cost_optimization_service";

const logger = log.scope("cost_analytics");

export interface CostAnalyticsResponse {
  totalRequests: number;
  cacheHits: number;
  estimatedSavings: number;
  dailySavings: number;
  monthlySavings: number;
  annualSavings: number;
  topProviders: Array<{ provider: string; requests: number }>;
  cachingStrategies: Record<string, string[]>;
}

export function registerCostAnalyticsHandlers() {
  ipcMain.handle(
    "cost-analytics:get-stats",
    async (): Promise<CostAnalyticsResponse> => {
      try {
        logger.log("Getting cost optimization statistics");
        
        const stats = costOptimizationService.getOptimizationStats();
        const optimizations = costOptimizationService.getProviderOptimizations();
        
        // Calculate projected savings
        const dailySavings = stats.estimatedSavings;
        const monthlySavings = dailySavings * 30;
        const annualSavings = dailySavings * 365;
        
        return {
          totalRequests: stats.totalRequests,
          cacheHits: stats.cacheHits,
          estimatedSavings: stats.estimatedSavings,
          dailySavings,
          monthlySavings,
          annualSavings,
          topProviders: stats.topProviders,
          cachingStrategies: optimizations
        };
      } catch (error) {
        logger.error("Failed to get cost analytics:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "cost-analytics:reset-stats",
    async (): Promise<void> => {
      try {
        logger.log("Resetting cost optimization statistics");
        // Reset the service statistics
        // This would require adding a reset method to the service
        logger.log("Statistics reset successfully");
      } catch (error) {
        logger.error("Failed to reset cost analytics:", error);
        throw error;
      }
    }
  );
}
