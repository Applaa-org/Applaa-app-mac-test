import { pipeline, env } from '@xenova/transformers';
import log from 'electron-log';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const logger = log.scope('local-brain');

// Configure Transformers.js to run locally
env.allowLocalModels = false; // For now, download from HF hub effectively, but cache locally. 
// Ideally we bundle models, but downloading on first run is easier for setup.
// xenova/all-MiniLM-L6-v2 is small (~80MB).

export class LocalBrain {
    private static instance: LocalBrain;
    private embedder: any = null;
    private isInitializing = false;

    private constructor() { }

    public static getInstance(): LocalBrain {
        if (!LocalBrain.instance) {
            LocalBrain.instance = new LocalBrain();
        }
        return LocalBrain.instance;
    }

    /**
     * Initialize the embedding model
     */
    public async init() {
        if (this.embedder) return;
        if (this.isInitializing) return;

        this.isInitializing = true;
        logger.info('🧠 Initializing Local Brain (Transformers.js)...');

        try {
            // Use a distinct quantized model for speed and size
            this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            logger.info('🧠 Local Brain initialized successfully!');
        } catch (error) {
            logger.error('❌ Failed to initialize Local Brain:', error);
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * Generate embedding for text
     */
    public async embed(text: string): Promise<number[] | null> {
        if (!this.embedder) await this.init();
        if (!this.embedder) return null;

        try {
            const output = await this.embedder(text, { pooling: 'mean', normalize: true });
            // Convert Tensor to standard array
            return Array.from(output.data);
        } catch (error) {
            logger.error('❌ Embedding generation failed:', error);
            return null;
        }
    }

    /**
     * Semantic search for Buddy messages using sqlite-vec
     */
    public async searchBuddyHistory(query: string, limit = 5): Promise<any[]> {
        const queryVector = await this.embed(query);
        if (!queryVector) return [];

        // Using sql fragments for vector search
        // Note: We use Float32Array for the query vector to match sqlite-vec's expectations
        const queryBuffer = Buffer.from(new Float32Array(queryVector).buffer);

        try {
            const results = await db.all(sql`
                SELECT 
                    m.id,
                    m.content,
                    m.role,
                    m.conversation_id as conversationId,
                    m.created_at as createdAt,
                    vec_distance_cosine(me.embedding, ${queryBuffer}) as distance
                FROM buddy_messages m
                JOIN buddy_message_embeddings me ON m.id = me.message_id
                ORDER BY distance ASC
                LIMIT ${limit}
            `);

            return results;
        } catch (error) {
            logger.error('❌ Buddy semantic search failed:', error);
            return [];
        }
    }
}

export const localBrain = LocalBrain.getInstance();
