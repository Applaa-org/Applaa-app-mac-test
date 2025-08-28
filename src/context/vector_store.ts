import Database from "better-sqlite3";
import { cosineDistance } from "../utils/vector_utils";
import log from "electron-log";

const logger = log.scope("vector_store");

export interface ContextDocument {
  id: number;
  appId: number;
  filePath: string;
  contentHash: string;
  content: string;
  summary: string;
  tokens: number;
  language: string;
  embedding: Float32Array;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResult {
  document: ContextDocument;
  similarity: number;
  relevanceScore: number;
}

export interface SearchOptions {
  appId?: number;
  excludeAppIds?: number[];
  maxResults?: number;
  minSimilarity?: number;
  fileTypes?: string[];
  excludePaths?: string[];
}

export class VectorStore {
  private db: Database.Database;
  private initialized = false;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.db.pragma("cache_size = 1000");
    this.db.pragma("temp_store = memory");
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create tables if they don't exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS context_documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          app_id INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          content_hash TEXT NOT NULL,
          content TEXT NOT NULL,
          summary TEXT,
          tokens INTEGER DEFAULT 0,
          language TEXT,
          embedding BLOB,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          UNIQUE(app_id, file_path)
        );

        CREATE INDEX IF NOT EXISTS idx_context_documents_app_id ON context_documents(app_id);
        CREATE INDEX IF NOT EXISTS idx_context_documents_file_path ON context_documents(file_path);
        CREATE INDEX IF NOT EXISTS idx_context_documents_language ON context_documents(language);
        CREATE INDEX IF NOT EXISTS idx_context_documents_updated_at ON context_documents(updated_at);

        CREATE TABLE IF NOT EXISTS context_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          query_text TEXT NOT NULL,
          similarity REAL NOT NULL,
          accepted BOOLEAN NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (document_id) REFERENCES context_documents (id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_context_usage_document_id ON context_usage(document_id);
        CREATE INDEX IF NOT EXISTS idx_context_usage_accepted ON context_usage(accepted);
        CREATE INDEX IF NOT EXISTS idx_context_usage_created_at ON context_usage(created_at);

        CREATE TABLE IF NOT EXISTS context_analytics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          app_id INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          usage_count INTEGER DEFAULT 0,
          acceptance_rate REAL DEFAULT 0.0,
          avg_similarity REAL DEFAULT 0.0,
          last_used_at INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          UNIQUE(app_id, file_path)
        );

        CREATE INDEX IF NOT EXISTS idx_context_analytics_app_id ON context_analytics(app_id);
        CREATE INDEX IF NOT EXISTS idx_context_analytics_usage_count ON context_analytics(usage_count);
        CREATE INDEX IF NOT EXISTS idx_context_analytics_acceptance_rate ON context_analytics(acceptance_rate);
      `);

      this.initialized = true;
      logger.info("Vector store initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize vector store:", error);
      throw error;
    }
  }

  async addDocument(doc: Omit<ContextDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    await this.initialize();

    const now = Date.now();
    const embeddingBuffer = Buffer.from(doc.embedding.buffer);

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO context_documents 
        (app_id, file_path, content_hash, content, summary, tokens, language, embedding, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        doc.appId,
        doc.filePath,
        doc.contentHash,
        doc.content,
        doc.summary,
        doc.tokens,
        doc.language,
        embeddingBuffer,
        now,
        now
      );

      logger.debug(`Added document: ${doc.filePath} for app ${doc.appId}`);
      return result.lastInsertRowid as number;
    } catch (error) {
      logger.error(`Failed to add document ${doc.filePath}:`, error);
      throw error;
    }
  }

  async updateDocument(id: number, updates: Partial<Omit<ContextDocument, 'id' | 'createdAt'>>): Promise<void> {
    await this.initialize();

    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        if (key === 'embedding' && value instanceof Float32Array) {
          fields.push('embedding = ?');
          values.push(Buffer.from(value.buffer));
        } else {
          fields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`);
          values.push(value);
        }
      }
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    try {
      const stmt = this.db.prepare(`
        UPDATE context_documents 
        SET ${fields.join(', ')}
        WHERE id = ?
      `);

      stmt.run(...values);
      logger.debug(`Updated document ${id}`);
    } catch (error) {
      logger.error(`Failed to update document ${id}:`, error);
      throw error;
    }
  }

  async deleteDocument(id: number): Promise<void> {
    await this.initialize();

    try {
      const stmt = this.db.prepare('DELETE FROM context_documents WHERE id = ?');
      stmt.run(id);
      logger.debug(`Deleted document ${id}`);
    } catch (error) {
      logger.error(`Failed to delete document ${id}:`, error);
      throw error;
    }
  }

  async deleteDocumentsByApp(appId: number): Promise<void> {
    await this.initialize();

    try {
      const stmt = this.db.prepare('DELETE FROM context_documents WHERE app_id = ?');
      const result = stmt.run(appId);
      logger.info(`Deleted ${result.changes} documents for app ${appId}`);
    } catch (error) {
      logger.error(`Failed to delete documents for app ${appId}:`, error);
      throw error;
    }
  }

  async searchSimilar(queryEmbedding: Float32Array, options: SearchOptions = {}): Promise<SearchResult[]> {
    await this.initialize();

    const {
      appId,
      excludeAppIds = [],
      maxResults = 10,
      minSimilarity = 0.3,
      fileTypes = [],
      excludePaths = []
    } = options;

    try {
      let whereClause = '';
      const params: any[] = [];

      const conditions = [];

      if (appId !== undefined) {
        conditions.push('app_id = ?');
        params.push(appId);
      }

      if (excludeAppIds.length > 0) {
        conditions.push(`app_id NOT IN (${excludeAppIds.map(() => '?').join(', ')})`);
        params.push(...excludeAppIds);
      }

      if (fileTypes.length > 0) {
        conditions.push(`language IN (${fileTypes.map(() => '?').join(', ')})`);
        params.push(...fileTypes);
      }

      if (excludePaths.length > 0) {
        const pathConditions = excludePaths.map(() => 'file_path NOT LIKE ?').join(' AND ');
        conditions.push(`(${pathConditions})`);
        params.push(...excludePaths.map(path => `${path}%`));
      }

      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }

      const stmt = this.db.prepare(`
        SELECT id, app_id, file_path, content_hash, content, summary, tokens, language, embedding, created_at, updated_at
        FROM context_documents
        ${whereClause}
      `);

      const rows = stmt.all(...params);
      const results: SearchResult[] = [];

      for (const row of rows) {
        const embedding = new Float32Array(row.embedding.buffer);
        const similarity = 1 - cosineDistance(queryEmbedding, embedding);

        if (similarity >= minSimilarity) {
          const document: ContextDocument = {
            id: row.id,
            appId: row.app_id,
            filePath: row.file_path,
            contentHash: row.content_hash,
            content: row.content,
            summary: row.summary,
            tokens: row.tokens,
            language: row.language,
            embedding,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
          };

          // Get usage analytics for relevance scoring
          const relevanceScore = await this.calculateRelevanceScore(row.id, similarity);

          results.push({
            document,
            similarity,
            relevanceScore
          });
        }
      }

      // Sort by relevance score (combination of similarity and usage analytics)
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);

      return results.slice(0, maxResults);
    } catch (error) {
      logger.error('Failed to search similar documents:', error);
      throw error;
    }
  }

  async recordUsage(documentId: number, queryText: string, similarity: number, accepted: boolean): Promise<void> {
    await this.initialize();

    try {
      const now = Date.now();

      // Record usage
      const usageStmt = this.db.prepare(`
        INSERT INTO context_usage (document_id, query_text, similarity, accepted, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      usageStmt.run(documentId, queryText, similarity, accepted, now);

      // Update analytics
      await this.updateAnalytics(documentId);

      logger.debug(`Recorded usage for document ${documentId}: ${accepted ? 'accepted' : 'rejected'}`);
    } catch (error) {
      logger.error(`Failed to record usage for document ${documentId}:`, error);
      throw error;
    }
  }

  private async calculateRelevanceScore(documentId: number, similarity: number): Promise<number> {
    try {
      const stmt = this.db.prepare(`
        SELECT usage_count, acceptance_rate, avg_similarity
        FROM context_analytics
        WHERE document_id = (
          SELECT id FROM context_documents WHERE id = ?
        ) AND file_path = (
          SELECT file_path FROM context_documents WHERE id = ?
        ) AND app_id = (
          SELECT app_id FROM context_documents WHERE id = ?
        )
      `);

      const analytics = stmt.get(documentId, documentId, documentId);

      if (!analytics) {
        return similarity; // No usage data yet, just use similarity
      }

      // Combine similarity with usage analytics
      // Higher acceptance rate and usage count boost the score
      const usageBoost = Math.log(analytics.usage_count + 1) * 0.1;
      const acceptanceBoost = analytics.acceptance_rate * 0.2;
      const avgSimilarityBoost = analytics.avg_similarity * 0.1;

      return similarity + usageBoost + acceptanceBoost + avgSimilarityBoost;
    } catch (error) {
      logger.warn(`Failed to calculate relevance score for document ${documentId}:`, error);
      return similarity;
    }
  }

  private async updateAnalytics(documentId: number): Promise<void> {
    try {
      const doc = this.db.prepare('SELECT app_id, file_path FROM context_documents WHERE id = ?').get(documentId);
      if (!doc) return;

      const stats = this.db.prepare(`
        SELECT 
          COUNT(*) as usage_count,
          AVG(CASE WHEN accepted THEN 1.0 ELSE 0.0 END) as acceptance_rate,
          AVG(similarity) as avg_similarity,
          MAX(created_at) as last_used_at
        FROM context_usage
        WHERE document_id IN (
          SELECT id FROM context_documents 
          WHERE app_id = ? AND file_path = ?
        )
      `).get(doc.app_id, doc.file_path);

      if (!stats) return;

      const now = Date.now();
      const analyticsStmt = this.db.prepare(`
        INSERT OR REPLACE INTO context_analytics 
        (app_id, file_path, usage_count, acceptance_rate, avg_similarity, last_used_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 
          COALESCE((SELECT created_at FROM context_analytics WHERE app_id = ? AND file_path = ?), ?),
          ?
        )
      `);

      analyticsStmt.run(
        doc.app_id,
        doc.file_path,
        stats.usage_count,
        stats.acceptance_rate,
        stats.avg_similarity,
        stats.last_used_at,
        doc.app_id,
        doc.file_path,
        now,
        now
      );
    } catch (error) {
      logger.error(`Failed to update analytics for document ${documentId}:`, error);
    }
  }

  async getAnalytics(appId?: number): Promise<any[]> {
    await this.initialize();

    try {
      let whereClause = '';
      const params: any[] = [];

      if (appId !== undefined) {
        whereClause = 'WHERE app_id = ?';
        params.push(appId);
      }

      const stmt = this.db.prepare(`
        SELECT app_id, file_path, usage_count, acceptance_rate, avg_similarity, last_used_at
        FROM context_analytics
        ${whereClause}
        ORDER BY usage_count DESC, acceptance_rate DESC
      `);

      return stmt.all(...params);
    } catch (error) {
      logger.error('Failed to get analytics:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      this.db.close();
      logger.info("Vector store closed");
    } catch (error) {
      logger.error("Failed to close vector store:", error);
      throw error;
    }
  }
}



