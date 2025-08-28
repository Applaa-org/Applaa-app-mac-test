import log from 'electron-log';
import { normalizeVector } from '../utils/vector_utils';

// Dynamic import type for transformers
type Pipeline = any;

const logger = log.scope('embeddings_service');

export interface EmbeddingOptions {
  maxLength?: number;
  normalize?: boolean;
  pooling?: 'mean' | 'cls';
}

export class EmbeddingsService {
  private pipeline: Pipeline | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;
  private readonly modelName = 'Xenova/all-MiniLM-L6-v2'; // 384-dimensional embeddings
  
  constructor() {
    // Set cache directory for models
    if (typeof process !== 'undefined' && process.env) {
      process.env.TRANSFORMERS_CACHE = require('path').join(
        require('os').homedir(), 
        '.cache', 
        'applaa-transformers'
      );
    }
  }

  async initialize(): Promise<void> {
    if (this.pipeline) return;
    
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this._initialize();
    
    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
    }
  }

  private async _initialize(): Promise<void> {
    try {
      logger.info(`Initializing embeddings service with model: ${this.modelName}`);
      
      // Check if we're in an environment that supports transformers
      if (typeof window !== 'undefined' && !window.navigator?.userAgent?.includes('Electron')) {
        throw new Error('Embeddings service only supported in Electron environment');
      }

      // Dynamically import transformers to avoid build issues
      let transformers;
      try {
        transformers = await import('@xenova/transformers');
      } catch (importError) {
        throw new Error('Transformers package not available. Semantic context features disabled.');
      }
      
      const { pipeline } = transformers;
      
      // Create feature extraction pipeline
      this.pipeline = await pipeline('feature-extraction', this.modelName, {
        quantized: true, // Use quantized model for better performance
        local_files_only: false, // Allow downloading if not cached
        revision: 'main',
        // Add device configuration for better compatibility
        device: 'cpu'
      });

      logger.info('Embeddings service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize embeddings service:', error);
      this.pipeline = null;
      // Don't throw - make this gracefully degrade
      logger.warn('Semantic context features will be disabled due to initialization failure');
    }
  }

  async generateEmbedding(
    text: string, 
    options: EmbeddingOptions = {}
  ): Promise<Float32Array> {
    await this.initialize();

    if (!this.pipeline) {
      throw new Error('Embeddings service not initialized');
    }

    const { maxLength = 512, normalize = true } = options;

    try {
      // Truncate text if too long
      const truncatedText = text.length > maxLength * 4 
        ? text.substring(0, maxLength * 4) + '...'
        : text;

      logger.debug(`Generating embedding for text (${truncatedText.length} chars)`);

      // Generate embedding
      const result = await this.pipeline(truncatedText, {
        pooling: 'mean',
        normalize: normalize
      });

      // Extract the embedding array
      let embedding: Float32Array;
      
      if (result.data) {
        embedding = new Float32Array(result.data);
      } else if (Array.isArray(result)) {
        embedding = new Float32Array(result);
      } else {
        throw new Error('Unexpected embedding format');
      }

      // Normalize if requested and not already normalized
      if (normalize && !result.normalized) {
        embedding = normalizeVector(embedding);
      }

      logger.debug(`Generated ${embedding.length}-dimensional embedding`);
      return embedding;
    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  async generateBatchEmbeddings(
    texts: string[], 
    options: EmbeddingOptions = {}
  ): Promise<Float32Array[]> {
    await this.initialize();

    if (!this.pipeline) {
      throw new Error('Embeddings service not initialized');
    }

    const { maxLength = 512, normalize = true } = options;

    try {
      logger.info(`Generating batch embeddings for ${texts.length} texts`);

      // Process texts in smaller batches to avoid memory issues
      const batchSize = 10;
      const results: Float32Array[] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const truncatedBatch = batch.map(text => 
          text.length > maxLength * 4 
            ? text.substring(0, maxLength * 4) + '...'
            : text
        );

        const batchResults = await this.pipeline(truncatedBatch, {
          pooling: 'mean',
          normalize: normalize
        });

        // Process batch results
        for (let j = 0; j < truncatedBatch.length; j++) {
          let embedding: Float32Array;
          
          if (Array.isArray(batchResults) && batchResults[j]) {
            if (batchResults[j].data) {
              embedding = new Float32Array(batchResults[j].data);
            } else {
              embedding = new Float32Array(batchResults[j]);
            }
          } else if (batchResults.data) {
            // Single result format
            const startIdx = j * this.getEmbeddingDimension();
            const endIdx = startIdx + this.getEmbeddingDimension();
            embedding = new Float32Array(batchResults.data.slice(startIdx, endIdx));
          } else {
            throw new Error(`Unexpected batch embedding format for item ${j}`);
          }

          // Normalize if requested
          if (normalize) {
            embedding = normalizeVector(embedding);
          }

          results.push(embedding);
        }

        // Log progress
        logger.debug(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);
      }

      logger.info(`Generated ${results.length} embeddings successfully`);
      return results;
    } catch (error) {
      logger.error('Failed to generate batch embeddings:', error);
      throw new Error(`Failed to generate batch embeddings: ${error}`);
    }
  }

  getEmbeddingDimension(): number {
    // all-MiniLM-L6-v2 produces 384-dimensional embeddings
    return 384;
  }

  isInitialized(): boolean {
    return this.pipeline !== null;
  }

  async dispose(): Promise<void> {
    if (this.pipeline) {
      try {
        // Dispose of the pipeline if it has a dispose method
        if (typeof (this.pipeline as any).dispose === 'function') {
          await (this.pipeline as any).dispose();
        }
        this.pipeline = null;
        logger.info('Embeddings service disposed');
      } catch (error) {
        logger.error('Error disposing embeddings service:', error);
      }
    }
  }

  /**
   * Generate embedding for code with special preprocessing
   */
  async generateCodeEmbedding(
    code: string,
    language: string,
    options: EmbeddingOptions = {}
  ): Promise<Float32Array> {
    // Preprocess code for better embeddings
    const processedCode = this.preprocessCode(code, language);
    return this.generateEmbedding(processedCode, options);
  }

  /**
   * Generate embedding for documentation/markdown
   */
  async generateDocEmbedding(
    content: string,
    options: EmbeddingOptions = {}
  ): Promise<Float32Array> {
    // Preprocess documentation
    const processedContent = this.preprocessDoc(content);
    return this.generateEmbedding(processedContent, options);
  }

  private preprocessCode(code: string, language: string): string {
    // Remove excessive whitespace and comments for better semantic understanding
    let processed = code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/^\s*$/gm, '') // Remove empty lines
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Add language context
    processed = `${language} code: ${processed}`;

    return processed;
  }

  private preprocessDoc(content: string): string {
    // Remove markdown formatting but keep semantic content
    return content
      .replace(/```[\s\S]*?```/g, '[code block]') // Replace code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code formatting
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/[#*_~]/g, '') // Remove markdown formatting
      .replace(/^\s*$/gm, '') // Remove empty lines
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}
