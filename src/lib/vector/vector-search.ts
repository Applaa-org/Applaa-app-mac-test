import { db } from '@/db';
import { chatEmbeddings, appKnowledge, automationPlans, messages, apps } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getEmbeddingService } from './embedding-service';

/**
 * Vector Search - Similarity search for RAG (Retrieval Augmented Generation)
 * 
 * This service finds relevant context from the knowledge base using vector similarity.
 */

export interface SearchResult {
    id: number;
    content: string;
    similarity: number;
    metadata?: any;
}

/**
 * Search for relevant chat messages
 * @param query - Search query
 * @param limit - Number of results
 * @returns Relevant messages with similarity scores
 */
export async function searchChatHistory(
    query: string,
    limit: number = 5
): Promise<SearchResult[]> {
    const embeddingService = getEmbeddingService();

    // Generate query embedding
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Get all chat embeddings
    const allEmbeddings = await db.query.chatEmbeddings.findMany({
        with: {
            message: true,
        },
    });

    // Calculate similarities
    const results = allEmbeddings
        .map((item) => {
            const embedding = JSON.parse(item.embedding as string);
            const similarity = embeddingService.cosineSimilarity(queryEmbedding, embedding);

            return {
                id: item.messageId,
                content: item.message.content,
                similarity,
                metadata: {
                    role: item.message.role,
                    createdAt: item.message.createdAt,
                },
            };
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    return results;
}

/**
 * Search for relevant app knowledge (code, errors, patterns)
 * @param query - Search query
 * @param appId - Optional app ID to filter by
 * @param limit - Number of results
 * @returns Relevant knowledge with similarity scores
 */
export async function searchAppKnowledge(
    query: string,
    appId?: number,
    limit: number = 3
): Promise<SearchResult[]> {
    const embeddingService = getEmbeddingService();

    // Generate query embedding
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Get app knowledge
    let knowledgeQuery = db.query.appKnowledge.findMany();

    if (appId) {
        knowledgeQuery = db.query.appKnowledge.findMany({
            where: eq(appKnowledge.appId, appId),
        });
    }

    const allKnowledge = await knowledgeQuery;

    // Calculate similarities
    const results = allKnowledge
        .map((item) => {
            const embedding = JSON.parse(item.embedding as string);
            const similarity = embeddingService.cosineSimilarity(queryEmbedding, embedding);

            return {
                id: item.id,
                content: item.content,
                similarity,
                metadata: {
                    contentType: item.contentType,
                    appId: item.appId,
                    ...JSON.parse(item.metadata as string || '{}'),
                },
            };
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    return results;
}

/**
 * Search for similar automation plans
 * @param query - User's goal/query
 * @param limit - Number of results
 * @returns Similar automation plans
 */
export async function searchAutomationPlans(
    query: string,
    limit: number = 3
): Promise<SearchResult[]> {
    const embeddingService = getEmbeddingService();

    // Generate query embedding
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Get all automation plans with embeddings
    const allPlans = await db.query.automationPlans.findMany({
        where: (plans, { isNotNull }) => isNotNull(plans.embedding),
    });

    // Calculate similarities
    const results = allPlans
        .map((plan) => {
            const embedding = JSON.parse(plan.embedding as string);
            const similarity = embeddingService.cosineSimilarity(queryEmbedding, embedding);

            return {
                id: plan.id,
                content: plan.goal,
                similarity,
                metadata: {
                    name: plan.name,
                    description: plan.description,
                    steps: JSON.parse(plan.steps as string),
                    status: plan.status,
                    scriptType: plan.scriptType,
                },
            };
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    return results;
}

/**
 * Get relevant context for RAG
 * @param query - User's query
 * @param appId - Optional app ID
 * @returns Combined context from all sources
 */
export async function getRelevantContext(
    query: string,
    appId?: number
): Promise<{
    chatHistory: SearchResult[];
    appKnowledge: SearchResult[];
    automationPlans: SearchResult[];
    totalTokensSaved: number;
}> {
    // Search all sources in parallel
    const [chatHistory, appKnowledge, automationPlans] = await Promise.all([
        searchChatHistory(query, 5),
        searchAppKnowledge(query, appId, 3),
        searchAutomationPlans(query, 2),
    ]);

    // Estimate tokens saved
    // Before: ~10,000 tokens (full history)
    // After: ~1,000 tokens (relevant context only)
    const totalTokensSaved = 9000;

    return {
        chatHistory,
        appKnowledge,
        automationPlans,
        totalTokensSaved,
    };
}

/**
 * Format context for LLM prompt
 * @param context - Retrieved context
 * @returns Formatted string for LLM
 */
export function formatContextForLLM(context: {
    chatHistory: SearchResult[];
    appKnowledge: SearchResult[];
    automationPlans: SearchResult[];
}): string {
    let formatted = '';

    if (context.chatHistory.length > 0) {
        formatted += '## Relevant Past Conversations:\n';
        context.chatHistory.forEach((item, i) => {
            formatted += `${i + 1}. [${item.metadata.role}]: ${item.content}\n`;
        });
        formatted += '\n';
    }

    if (context.appKnowledge.length > 0) {
        formatted += '## Relevant Code/Knowledge:\n';
        context.appKnowledge.forEach((item, i) => {
            formatted += `${i + 1}. [${item.metadata.contentType}]: ${item.content}\n`;
        });
        formatted += '\n';
    }

    if (context.automationPlans.length > 0) {
        formatted += '## Similar Automation Plans:\n';
        context.automationPlans.forEach((item, i) => {
            formatted += `${i + 1}. ${item.metadata.name}: ${item.content}\n`;
        });
        formatted += '\n';
    }

    return formatted;
}
