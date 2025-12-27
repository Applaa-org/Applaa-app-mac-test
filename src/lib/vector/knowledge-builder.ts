import { getEmbeddingService } from './embedding-service';
import { db } from '@/db';
import { messages, chatEmbeddings } from '@/db/schema';
import { eq, isNull } from 'drizzle-orm';

/**
 * Knowledge Builder - Automatically build and maintain the knowledge base
 * 
 * This service:
 * - Embeds new messages as they're created
 * - Backfills embeddings for existing messages
 * - Maintains the knowledge base
 */

/**
 * Embed a message after it's created
 * @param messageId - Message ID
 * @param content - Message content
 */
export async function embedNewMessage(messageId: number, content: string): Promise<void> {
    const embeddingService = getEmbeddingService();
    await embeddingService.embedMessage(messageId, content);
}

/**
 * Backfill embeddings for existing messages without embeddings
 * This runs in the background to build the knowledge base
 */
export async function backfillMessageEmbeddings(): Promise<void> {
    console.log('[KnowledgeBuilder] Starting backfill of message embeddings...');

    const embeddingService = getEmbeddingService();

    // Find all messages without embeddings
    const allMessages = await db.query.messages.findMany();
    const existingEmbeddings = await db.query.chatEmbeddings.findMany();
    const embeddedMessageIds = new Set(existingEmbeddings.map(e => e.messageId));

    const messagesWithoutEmbeddings = allMessages.filter(
        msg => !embeddedMessageIds.has(msg.id)
    );

    console.log(`[KnowledgeBuilder] Found ${messagesWithoutEmbeddings.length} messages to embed`);

    // Embed in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < messagesWithoutEmbeddings.length; i += batchSize) {
        const batch = messagesWithoutEmbeddings.slice(i, i + batchSize);

        await Promise.all(
            batch.map(msg => embeddingService.embedMessage(msg.id, msg.content))
        );

        console.log(`[KnowledgeBuilder] Embedded batch ${i / batchSize + 1}/${Math.ceil(messagesWithoutEmbeddings.length / batchSize)}`);

        // Wait 1 second between batches to respect rate limits
        if (i + batchSize < messagesWithoutEmbeddings.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log('[KnowledgeBuilder] Backfill complete!');
}

/**
 * Embed code changes for app knowledge
 * @param appId - App ID
 * @param filePath - File path
 * @param diff - Code diff
 */
export async function embedCodeChange(
    appId: number,
    filePath: string,
    diff: string
): Promise<void> {
    const embeddingService = getEmbeddingService();

    await embeddingService.embedAppKnowledge(
        appId,
        'code',
        diff,
        { file_path: filePath }
    );
}

/**
 * Embed error for learning
 * @param appId - App ID
 * @param error - Error message
 * @param solution - Solution (if found)
 */
export async function embedError(
    appId: number,
    error: string,
    solution?: string
): Promise<void> {
    const embeddingService = getEmbeddingService();

    const content = solution
        ? `Error: ${error}\nSolution: ${solution}`
        : `Error: ${error}`;

    await embeddingService.embedAppKnowledge(
        appId,
        'error',
        content
    );
}

/**
 * Embed successful pattern for learning
 * @param appId - App ID
 * @param pattern - Success pattern description
 */
export async function embedSuccessPattern(
    appId: number,
    pattern: string
): Promise<void> {
    const embeddingService = getEmbeddingService();

    await embeddingService.embedAppKnowledge(
        appId,
        'success',
        pattern
    );
}

/**
 * Initialize knowledge base
 * Run this on app startup to ensure knowledge base is up to date
 */
export async function initializeKnowledgeBase(): Promise<void> {
    console.log('[KnowledgeBuilder] Initializing knowledge base...');

    // Check if we need to backfill
    const messageCount = await db.$count(messages);
    const embeddingCount = await db.$count(chatEmbeddings);

    if (embeddingCount < messageCount) {
        console.log(`[KnowledgeBuilder] Knowledge base needs update: ${embeddingCount}/${messageCount} messages embedded`);

        // Run backfill in background (don't await)
        backfillMessageEmbeddings().catch(err => {
            console.error('[KnowledgeBuilder] Backfill failed:', err);
        });
    } else {
        console.log('[KnowledgeBuilder] Knowledge base is up to date!');
    }
}
