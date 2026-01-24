import OpenAI from 'openai';
import { db } from '@/db';
import { chatEmbeddings, appKnowledge, automationPlans } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * EmbeddingService - Generate and manage vector embeddings
 * 
 * This service handles:
 * - Generating embeddings using OpenAI or local models
 * - Storing embeddings in SQLite
 * - Vector similarity search for RAG
 */
export class EmbeddingService {
    private openai: OpenAI | null = null;
    private model: string = 'text-embedding-3-small';

    constructor() {
        // Initialize OpenAI if API key is available
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
        }
    }

    /**
     * Generate embedding for text
     * @param text - Text to embed
     * @returns Vector embedding (1536 dimensions for text-embedding-3-small)
     */
    async generateEmbedding(text: string): Promise<number[]> {
        if (!this.openai) {
            console.warn('[EmbeddingService] OpenAI not configured, using zero vector');
            // Return zero vector as fallback (1536 dimensions)
            return new Array(1536).fill(0);
        }

        try {
            const response = await this.openai.embeddings.create({
                model: this.model,
                input: text,
                encoding_format: 'float',
            });

            return response.data[0].embedding;
        } catch (error) {
            console.error('[EmbeddingService] Failed to generate embedding:', error);
            // Return zero vector on error
            return new Array(1536).fill(0);
        }
    }

    /**
     * Embed a chat message and store in database
     * @param messageId - Message ID
     * @param content - Message content
     */
    async embedMessage(messageId: number, content: string): Promise<void> {
        try {
            const embedding = await this.generateEmbedding(content);

            await db.insert(chatEmbeddings).values({
                messageId,
                embedding: JSON.stringify(embedding),
                embeddingModel: this.model,
            });

            console.log(`[EmbeddingService] Embedded message ${messageId}`);
        } catch (error) {
            console.error('[EmbeddingService] Failed to embed message:', error);
        }
    }

    /**
     * Embed app knowledge (code, errors, patterns)
     * @param appId - App ID
     * @param contentType - Type of content
     * @param content - Content to embed
     * @param metadata - Additional metadata
     */
    async embedAppKnowledge(
        appId: number,
        contentType: 'code' | 'chat' | 'error' | 'success' | 'pattern',
        content: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        try {
            const embedding = await this.generateEmbedding(content);

            await db.insert(appKnowledge).values({
                appId,
                contentType,
                content,
                embedding: JSON.stringify(embedding),
                metadata: metadata ? JSON.stringify(metadata) : null,
            });

            console.log(`[EmbeddingService] Embedded ${contentType} for app ${appId}`);
        } catch (error) {
            console.error('[EmbeddingService] Failed to embed app knowledge:', error);
        }
    }

    /**
     * Embed an automation plan
     * @param planId - Plan ID
     * @param goal - User's goal
     * @param steps - Plan steps
     */
    async embedAutomationPlan(
        planId: number,
        goal: string,
        steps: any[]
    ): Promise<void> {
        try {
            // Combine goal and steps for embedding
            const text = `${goal}\n${JSON.stringify(steps)}`;
            const embedding = await this.generateEmbedding(text);

            // Update the plan with embedding
            await db.update(automationPlans)
                .set({ embedding: JSON.stringify(embedding) })
                .where(eq(automationPlans.id, planId));

            console.log(`[EmbeddingService] Embedded automation plan ${planId}`);
        } catch (error) {
            console.error('[EmbeddingService] Failed to embed automation plan:', error);
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     * @param a - First vector
     * @param b - Second vector
     * @returns Similarity score (0-1)
     */
    cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('Vectors must have same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

// Singleton instance
let embeddingService: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
    if (!embeddingService) {
        embeddingService = new EmbeddingService();
    }
    return embeddingService;
}
