import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { glob } from 'glob';
import log from 'electron-log';
import { VectorStore, ContextDocument } from './vector_store';
import { EmbeddingsService } from './embeddings_service';
import { estimateTokens } from '../ipc/utils/token_utils';

const logger = log.scope('indexing_pipeline');

export interface IndexingOptions {
  appId: number;
  appPath: string;
  excludePaths?: string[];
  includePatterns?: string[];
  maxFileSize?: number;
  batchSize?: number;
}

export interface IndexingProgress {
  phase: 'scanning' | 'processing' | 'embedding' | 'storing' | 'complete';
  current: number;
  total: number;
  currentFile?: string;
  error?: string;
}

export type ProgressCallback = (progress: IndexingProgress) => void;

export class IndexingPipeline {
  private vectorStore: VectorStore;
  private embeddingsService: EmbeddingsService;

  constructor(vectorStore: VectorStore, embeddingsService: EmbeddingsService) {
    this.vectorStore = vectorStore;
    this.embeddingsService = embeddingsService;
  }

  async indexApp(
    options: IndexingOptions,
    progressCallback?: ProgressCallback
  ): Promise<void> {
    const {
      appId,
      appPath,
      excludePaths = ['node_modules', '.git', 'dist', 'build', 'out'],
      includePatterns = ['**/*.{ts,tsx,js,jsx,py,java,cpp,c,h,cs,php,rb,go,rs,md,txt}'],
      maxFileSize = 1024 * 1024, // 1MB
      batchSize = 5
    } = options;

    try {
      logger.info(`Starting indexing for app ${appId} at ${appPath}`);

      // Phase 1: Scan files
      progressCallback?.({ phase: 'scanning', current: 0, total: 0 });
      const files = await this.scanFiles(appPath, includePatterns, excludePaths, maxFileSize);
      
      logger.info(`Found ${files.length} files to index`);

      if (files.length === 0) {
        progressCallback?.({ phase: 'complete', current: 0, total: 0 });
        return;
      }

      // Phase 2: Process files in batches
      const documents: Omit<ContextDocument, 'id' | 'createdAt' | 'updatedAt'>[] = [];
      
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        
        progressCallback?.({
          phase: 'processing',
          current: i,
          total: files.length,
          currentFile: batch[0]
        });

        const batchDocuments = await this.processBatch(batch, appId, appPath);
        documents.push(...batchDocuments);
      }

      // Phase 3: Generate embeddings
      progressCallback?.({ phase: 'embedding', current: 0, total: documents.length });
      
      const texts = documents.map(doc => this.createEmbeddingText(doc));
      const embeddings = await this.embeddingsService.generateBatchEmbeddings(texts);

      // Phase 4: Store in vector store
      progressCallback?.({ phase: 'storing', current: 0, total: documents.length });

      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        doc.embedding = embeddings[i];

        await this.vectorStore.addDocument(doc);

        progressCallback?.({
          phase: 'storing',
          current: i + 1,
          total: documents.length,
          currentFile: doc.filePath
        });
      }

      progressCallback?.({ phase: 'complete', current: documents.length, total: documents.length });
      logger.info(`Successfully indexed ${documents.length} documents for app ${appId}`);

    } catch (error) {
      logger.error(`Failed to index app ${appId}:`, error);
      progressCallback?.({
        phase: 'complete',
        current: 0,
        total: 0,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async updateFile(
    appId: number,
    appPath: string,
    filePath: string
  ): Promise<void> {
    try {
      const fullPath = path.join(appPath, filePath);
      const relativePath = path.relative(appPath, fullPath);

      // Check if file should be indexed
      if (!this.shouldIndexFile(relativePath)) {
        return;
      }

      // Read and process file
      const content = await fs.readFile(fullPath, 'utf-8');
      const contentHash = crypto.createHash('md5').update(content).digest('hex');

      // Check if file has changed
      const existingDocs = await this.vectorStore.searchSimilar(
        new Float32Array(this.embeddingsService.getEmbeddingDimension()),
        { appId, maxResults: 1000 }
      );

      const existingDoc = existingDocs.find(result => 
        result.document.filePath === relativePath
      );

      if (existingDoc && existingDoc.document.contentHash === contentHash) {
        logger.debug(`File ${relativePath} unchanged, skipping update`);
        return;
      }

      // Process file
      const language = this.detectLanguage(relativePath);
      const summary = this.generateSummary(content, language);
      const tokens = estimateTokens(content);

      // Generate embedding
      const embeddingText = this.createEmbeddingText({
        appId,
        filePath: relativePath,
        contentHash,
        content,
        summary,
        tokens,
        language,
        embedding: new Float32Array()
      });

      const embedding = await this.embeddingsService.generateEmbedding(embeddingText);

      // Update or add document
      if (existingDoc) {
        await this.vectorStore.updateDocument(existingDoc.document.id, {
          contentHash,
          content,
          summary,
          tokens,
          embedding
        });
        logger.debug(`Updated document for ${relativePath}`);
      } else {
        await this.vectorStore.addDocument({
          appId,
          filePath: relativePath,
          contentHash,
          content,
          summary,
          tokens,
          language,
          embedding
        });
        logger.debug(`Added new document for ${relativePath}`);
      }

    } catch (error) {
      logger.error(`Failed to update file ${filePath}:`, error);
      throw error;
    }
  }

  async deleteFile(appId: number, filePath: string): Promise<void> {
    try {
      // Find and delete the document
      const docs = await this.vectorStore.searchSimilar(
        new Float32Array(this.embeddingsService.getEmbeddingDimension()),
        { appId, maxResults: 1000 }
      );

      const doc = docs.find(result => result.document.filePath === filePath);
      if (doc) {
        await this.vectorStore.deleteDocument(doc.document.id);
        logger.debug(`Deleted document for ${filePath}`);
      }
    } catch (error) {
      logger.error(`Failed to delete file ${filePath}:`, error);
      throw error;
    }
  }

  private async scanFiles(
    appPath: string,
    includePatterns: string[],
    excludePaths: string[],
    maxFileSize: number
  ): Promise<string[]> {
    const files: string[] = [];

    for (const pattern of includePatterns) {
      const matches = await glob(pattern, {
        cwd: appPath,
        ignore: excludePaths.map(p => `**/${p}/**`),
        nodir: true
      });

      for (const match of matches) {
        const fullPath = path.join(appPath, match);
        
        try {
          const stats = await fs.stat(fullPath);
          if (stats.size <= maxFileSize && this.shouldIndexFile(match)) {
            files.push(match);
          }
        } catch (error) {
          logger.warn(`Failed to stat file ${match}:`, error);
        }
      }
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private async processBatch(
    files: string[],
    appId: number,
    appPath: string
  ): Promise<Omit<ContextDocument, 'id' | 'createdAt' | 'updatedAt'>[]> {
    const documents: Omit<ContextDocument, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    for (const filePath of files) {
      try {
        const fullPath = path.join(appPath, filePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        const contentHash = crypto.createHash('md5').update(content).digest('hex');
        const language = this.detectLanguage(filePath);
        const summary = this.generateSummary(content, language);
        const tokens = estimateTokens(content);

        documents.push({
          appId,
          filePath,
          contentHash,
          content,
          summary,
          tokens,
          language,
          embedding: new Float32Array() // Will be filled later
        });

      } catch (error) {
        logger.warn(`Failed to process file ${filePath}:`, error);
      }
    }

    return documents;
  }

  private shouldIndexFile(filePath: string): boolean {
    // Skip certain file types and patterns
    const skipPatterns = [
      /\.min\.(js|css)$/,
      /\.map$/,
      /\.lock$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /\.log$/,
      /\.tmp$/,
      /\.cache/,
      /\.DS_Store$/,
      /Thumbs\.db$/
    ];

    return !skipPatterns.some(pattern => pattern.test(filePath));
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.md': 'markdown',
      '.txt': 'text',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass'
    };

    return languageMap[ext] || 'text';
  }

  private generateSummary(content: string, language: string): string {
    // Generate a simple summary based on content
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    
    if (language === 'markdown') {
      // For markdown, extract headers
      const headers = nonEmptyLines
        .filter(line => line.startsWith('#'))
        .slice(0, 3)
        .map(line => line.replace(/^#+\s*/, ''))
        .join(', ');
      
      return headers || 'Markdown document';
    }

    // For code files, extract function/class names
    const codePatterns = [
      /(?:function|def|class|interface|type)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
      /(?:const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g,
      /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g
    ];

    const identifiers = new Set<string>();
    
    for (const pattern of codePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null && identifiers.size < 5) {
        identifiers.add(match[1]);
      }
    }

    if (identifiers.size > 0) {
      return `${language} code with: ${Array.from(identifiers).join(', ')}`;
    }

    // Fallback: first non-empty line
    const firstLine = nonEmptyLines[0];
    return firstLine ? firstLine.substring(0, 100) + '...' : `${language} file`;
  }

  private createEmbeddingText(doc: Omit<ContextDocument, 'id' | 'createdAt' | 'updatedAt'>): string {
    // Create text optimized for semantic search
    const parts = [
      `File: ${doc.filePath}`,
      `Language: ${doc.language}`,
      `Summary: ${doc.summary}`
    ];

    // Add relevant content snippets
    if (doc.content.length > 0) {
      const contentPreview = doc.content.length > 1000 
        ? doc.content.substring(0, 1000) + '...'
        : doc.content;
      parts.push(`Content: ${contentPreview}`);
    }

    return parts.join('\n');
  }
}



