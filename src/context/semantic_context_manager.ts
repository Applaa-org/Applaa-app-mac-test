import path from 'path';
import log from 'electron-log';
import { VectorStore, SearchResult, SearchOptions } from './vector_store';
import { EmbeddingsService } from './embeddings_service';
import { IndexingPipeline, IndexingOptions, ProgressCallback } from './indexing_pipeline';
import { getDyadAppPath } from '../paths/paths';

const logger = log.scope('semantic_context_manager');

export interface SmartSuggestion {
  filePath: string;
  similarity: number;
  relevanceScore: number;
  summary: string;
  language: string;
  tokens: number;
  reason: string;
}

export interface ContextSuggestionOptions {
  query: string;
  appId: number;
  maxSuggestions?: number;
  minSimilarity?: number;
  excludePaths?: string[];
  includeOtherApps?: boolean;
  mentionedApps?: string[];
}

export class SemanticContextManager {
  private vectorStore: VectorStore;
  private embeddingsService: EmbeddingsService;
  private indexingPipeline: IndexingPipeline;
  private initialized = false;

  constructor(vectorDbPath: string) {
    this.vectorStore = new VectorStore(vectorDbPath);
    this.embeddingsService = new EmbeddingsService();
    this.indexingPipeline = new IndexingPipeline(this.vectorStore, this.embeddingsService);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('Initializing Semantic Context Manager');
      
      await this.vectorStore.initialize();
      await this.embeddingsService.initialize();
      
      this.initialized = true;
      logger.info('Semantic Context Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Semantic Context Manager:', error);
      throw error;
    }
  }

  async getSmartSuggestions(options: ContextSuggestionOptions): Promise<SmartSuggestion[]> {
    await this.initialize();

    const {
      query,
      appId,
      maxSuggestions = 5,
      minSimilarity = 0.3,
      excludePaths = [],
      includeOtherApps = false,
      mentionedApps = []
    } = options;

    try {
      logger.debug(`Getting smart suggestions for query: "${query.substring(0, 100)}..."`);

      // Generate embedding for the query
      const queryEmbedding = await this.embeddingsService.generateEmbedding(query);

      // Search in current app
      const searchOptions: SearchOptions = {
        appId,
        maxResults: maxSuggestions * 2, // Get more to filter
        minSimilarity,
        excludePaths
      };

      let results = await this.vectorStore.searchSimilar(queryEmbedding, searchOptions);

      // If including other apps or mentioned apps, search those too
      if (includeOtherApps || mentionedApps.length > 0) {
        const otherAppResults = await this.searchOtherApps(
          queryEmbedding,
          appId,
          mentionedApps,
          maxSuggestions,
          minSimilarity
        );
        results = [...results, ...otherAppResults];
      }

      // Convert to smart suggestions
      const suggestions = results
        .slice(0, maxSuggestions)
        .map(result => this.createSmartSuggestion(result, query));

      logger.debug(`Generated ${suggestions.length} smart suggestions`);
      return suggestions;

    } catch (error) {
      logger.error('Failed to get smart suggestions:', error);
      return []; // Graceful fallback
    }
  }

  async indexApp(
    appId: number,
    appPath: string,
    options: Partial<IndexingOptions> = {},
    progressCallback?: ProgressCallback
  ): Promise<void> {
    await this.initialize();

    const fullAppPath = getDyadAppPath(appPath);
    const indexingOptions: IndexingOptions = {
      appId,
      appPath: fullAppPath,
      ...options
    };

    logger.info(`Starting indexing for app ${appId} at ${fullAppPath}`);
    await this.indexingPipeline.indexApp(indexingOptions, progressCallback);
  }

  async updateFile(appId: number, appPath: string, filePath: string): Promise<void> {
    await this.initialize();

    try {
      const fullAppPath = getDyadAppPath(appPath);
      await this.indexingPipeline.updateFile(appId, fullAppPath, filePath);
      logger.debug(`Updated file ${filePath} in app ${appId}`);
    } catch (error) {
      logger.error(`Failed to update file ${filePath}:`, error);
      // Don't throw - this is a background operation
    }
  }

  async deleteFile(appId: number, filePath: string): Promise<void> {
    await this.initialize();

    try {
      await this.indexingPipeline.deleteFile(appId, filePath);
      logger.debug(`Deleted file ${filePath} from app ${appId}`);
    } catch (error) {
      logger.error(`Failed to delete file ${filePath}:`, error);
      // Don't throw - this is a background operation
    }
  }

  async deleteApp(appId: number): Promise<void> {
    await this.initialize();

    try {
      await this.vectorStore.deleteDocumentsByApp(appId);
      logger.info(`Deleted all documents for app ${appId}`);
    } catch (error) {
      logger.error(`Failed to delete app ${appId}:`, error);
      throw error;
    }
  }

  async recordFeedback(
    filePath: string,
    appId: number,
    query: string,
    accepted: boolean
  ): Promise<void> {
    await this.initialize();

    try {
      // Find the document
      const queryEmbedding = await this.embeddingsService.generateEmbedding(query);
      const results = await this.vectorStore.searchSimilar(queryEmbedding, {
        appId,
        maxResults: 100
      });

      const result = results.find(r => r.document.filePath === filePath);
      if (result) {
        await this.vectorStore.recordUsage(
          result.document.id,
          query,
          result.similarity,
          accepted
        );
        logger.debug(`Recorded feedback for ${filePath}: ${accepted ? 'accepted' : 'rejected'}`);
      }
    } catch (error) {
      logger.error(`Failed to record feedback for ${filePath}:`, error);
      // Don't throw - this is a background operation
    }
  }

  async getAnalytics(appId?: number): Promise<any> {
    await this.initialize();

    try {
      const analytics = await this.vectorStore.getAnalytics(appId);
      return {
        totalDocuments: analytics.length,
        topFiles: analytics.slice(0, 10),
        averageAcceptanceRate: analytics.reduce((sum, item) => sum + item.acceptance_rate, 0) / analytics.length || 0,
        totalUsage: analytics.reduce((sum, item) => sum + item.usage_count, 0)
      };
    } catch (error) {
      logger.error('Failed to get analytics:', error);
      return {
        totalDocuments: 0,
        topFiles: [],
        averageAcceptanceRate: 0,
        totalUsage: 0
      };
    }
  }

  async isAppIndexed(appId: number): Promise<boolean> {
    await this.initialize();

    try {
      const dummyEmbedding = new Float32Array(this.embeddingsService.getEmbeddingDimension());
      const results = await this.vectorStore.searchSimilar(dummyEmbedding, {
        appId,
        maxResults: 1
      });
      return results.length > 0;
    } catch (error) {
      logger.error(`Failed to check if app ${appId} is indexed:`, error);
      return false;
    }
  }

  async getIndexedFileCount(appId: number): Promise<number> {
    await this.initialize();

    try {
      const dummyEmbedding = new Float32Array(this.embeddingsService.getEmbeddingDimension());
      const results = await this.vectorStore.searchSimilar(dummyEmbedding, {
        appId,
        maxResults: 10000 // Large number to get all
      });
      return results.length;
    } catch (error) {
      logger.error(`Failed to get indexed file count for app ${appId}:`, error);
      return 0;
    }
  }

  private async searchOtherApps(
    queryEmbedding: Float32Array,
    currentAppId: number,
    mentionedApps: string[],
    maxResults: number,
    minSimilarity: number
  ): Promise<SearchResult[]> {
    try {
      // Search across all apps except current
      const searchOptions: SearchOptions = {
        excludeAppIds: [currentAppId],
        maxResults: maxResults * 2,
        minSimilarity: minSimilarity * 0.8 // Slightly lower threshold for cross-app
      };

      const results = await this.vectorStore.searchSimilar(queryEmbedding, searchOptions);
      
      // If specific apps were mentioned, prioritize those
      if (mentionedApps.length > 0) {
        const mentionedResults = results.filter(result => 
          mentionedApps.some(appName => 
            result.document.filePath.includes(appName) ||
            result.document.content.toLowerCase().includes(appName.toLowerCase())
          )
        );
        
        const otherResults = results.filter(result => 
          !mentionedApps.some(appName => 
            result.document.filePath.includes(appName) ||
            result.document.content.toLowerCase().includes(appName.toLowerCase())
          )
        );

        return [...mentionedResults, ...otherResults].slice(0, maxResults);
      }

      return results.slice(0, maxResults);
    } catch (error) {
      logger.error('Failed to search other apps:', error);
      return [];
    }
  }

  private createSmartSuggestion(result: SearchResult, query: string): SmartSuggestion {
    const { document, similarity, relevanceScore } = result;
    
    // Generate reason for suggestion
    let reason = `${Math.round(similarity * 100)}% similarity`;
    
    if (relevanceScore > similarity) {
      reason += ', frequently used';
    }
    
    if (document.language && query.toLowerCase().includes(document.language.toLowerCase())) {
      reason += `, ${document.language} match`;
    }

    return {
      filePath: document.filePath,
      similarity,
      relevanceScore,
      summary: document.summary,
      language: document.language,
      tokens: document.tokens,
      reason
    };
  }

  async dispose(): Promise<void> {
    try {
      await this.embeddingsService.dispose();
      await this.vectorStore.close();
      this.initialized = false;
      logger.info('Semantic Context Manager disposed');
    } catch (error) {
      logger.error('Error disposing Semantic Context Manager:', error);
    }
  }
}



