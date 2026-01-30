
import express from 'express';
import cors from 'cors';
import { db } from '../db';
import { apps, chats, messages, appKnowledge, buddyConversations, buddyMessages } from '../db/schema';
import crypto from 'crypto';
import { eq, desc, sql } from 'drizzle-orm';
import log from 'electron-log';
import { getBuddyBrowser } from '../services/buddy-browser';
import { localBrain } from '../services/local_brain';
import { BrowserWindow, shell } from 'electron';
import { checkApp } from '../services/app-checker';

const logger = log.scope('local-api');
const app = express();
const PORT = 54321;

// Middleware
app.use(cors()); // Allow extensions to call us
app.use(express.json());

// Health Check
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', service: 'Applaa Local API', version: '1.0.0' });
});

// --- Context Endpoints ---

// Get all User Apps
app.get('/api/context/apps', async (req, res) => {
    try {
        const userApps = await db.select().from(apps).orderBy(desc(apps.updatedAt));
        res.json({ apps: userApps });
    } catch (error) {
        logger.error('Failed to fetch apps', error);
        res.status(500).json({ error: 'Failed to fetch apps' });
    }
});

// Get Chat History for a specific App
app.get('/api/context/apps/:appId/chats', async (req, res) => {
    try {
        const appId = parseInt(req.params.appId);
        const appChats = await db.select().from(chats)
            .where(eq(chats.appId, appId))
            .orderBy(desc(chats.createdAt));
        res.json({ chats: appChats });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// Get Knowledge/Context for an App
app.get('/api/context/apps/:appId/knowledge', async (req, res) => {
    try {
        const appId = parseInt(req.params.appId);
        const knowledge = await db.select().from(appKnowledge)
            .where(eq(appKnowledge.appId, appId));
        res.json({ knowledge });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch knowledge' });
    }
});

// Get recent messages (stream of thought)
app.get('/api/context/recent-activity', async (req, res) => {
    try {
        const recentMessages = await db.select({
            id: messages.id,
            role: messages.role,
            content: messages.content,
            createdAt: messages.createdAt,
            chatId: messages.chatId,
            appId: chats.appId,
            appName: apps.name
        })
            .from(messages)
            .innerJoin(chats, eq(messages.chatId, chats.id))
            .innerJoin(apps, eq(chats.appId, apps.id))
            .orderBy(desc(messages.createdAt))
            .limit(50);

        res.json({ activities: recentMessages });
    } catch (error) {
        logger.error('Failed to fetch recent activity', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

// --- Buddy Memory Endpoints ---

// Get all Buddy Conversations
app.get('/api/buddy/conversations', async (req, res) => {
    try {
        const conversations = await db.select().from(buddyConversations).orderBy(desc(buddyConversations.updatedAt));
        res.json({ conversations });
    } catch (error) {
        logger.error('Failed to fetch buddy conversations', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// Create a new Buddy Conversation
app.post('/api/buddy/conversations', async (req, res) => {
    try {
        const { title } = req.body;
        const id = crypto.randomUUID();

        await db.insert(buddyConversations).values({
            id,
            title: title || 'New Conversation',
        });

        res.json({ id, title: title || 'New Conversation' });
    } catch (error) {
        logger.error('Failed to create buddy conversation', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

// Get messages for a specific Buddy Conversation
app.get('/api/buddy/conversations/:id/messages', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const chatMessages = await db.select().from(buddyMessages)
            .where(eq(buddyMessages.conversationId, conversationId))
            .orderBy(buddyMessages.createdAt);
        res.json({ messages: chatMessages });
    } catch (error) {
        logger.error('Failed to fetch buddy messages', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Save a new message to a Buddy Conversation
app.post('/api/buddy/messages', async (req, res) => {
    try {
        const { conversationId, role, content } = req.body;

        if (!conversationId || !role || !content) {
            return res.status(400).json({ error: 'conversationId, role, and content are required' });
        }

        const id = crypto.randomUUID();
        await db.insert(buddyMessages).values({
            id,
            conversationId,
            role,
            content,
        });

        // Update conversation timestamp
        await db.update(buddyConversations)
            // @ts-ignore - Drizzle inferred type is sometimes missing columns from schema
            .set({ updatedAt: sql`(unixepoch())` as any })
            .where(eq(buddyConversations.id, conversationId));

        res.json({ success: true, id });

        // Generate embedding in background
        (async () => {
            try {
                const vector = await localBrain.embed(content);
                if (vector) {
                    await db.insert(require('../db/schema').buddyMessageEmbeddings).values({
                        messageId: id,
                        embedding: Buffer.from(new Float32Array(vector).buffer),
                        createdAt: new Date()
                    });
                    logger.info(`✅ Embedded message ${id}`);
                }
            } catch (err) {
                logger.error(`❌ Background embedding failed for ${id}`, err);
            }
        })();
    } catch (error) {
        logger.error('Failed to save buddy message', error);
        res.status(500).json({ error: 'Failed to save message' });
    }
});

// Search Buddy History (Semantic)
app.post('/api/buddy/search', async (req, res) => {
    try {
        const { query, limit } = req.body;
        if (!query) return res.status(400).json({ error: 'Query is required' });

        const results = await localBrain.searchBuddyHistory(query, limit || 5);
        res.json({ results });
    } catch (error) {
        logger.error('Failed to perform semantic search', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Check App (Heuristic feedback)
app.post('/api/buddy/check-app', async (req, res) => {
    try {
        const { appId } = req.body;
        if (!appId) return res.status(400).json({ error: 'appId is required' });

        const feedback = await checkApp(appId);
        if (!feedback) return res.status(404).json({ error: 'App not found' });

        res.json({ feedback });
    } catch (error) {
        logger.error('Failed to check app', error);
        res.status(500).json({ error: 'Check failed' });
    }
});

// --- Action Endpoints ---

// Open an App in Buddy Browser (for testing)
app.post('/api/actions/open-app', async (req, res) => {
    try {
        const { appId, url } = req.body;
        let targetUrl = url;

        // If no URL provided, try to find it from the app ID
        if (!targetUrl && appId) {
            const app = await db.select().from(apps).where(eq(apps.id, appId)).get();
            if (app) {
                // Prefer deployed URL, fallback to local or dev
                targetUrl = app.vercelDeploymentUrl || app.easDeploymentUrl || `http://localhost:8081`; // fallback
            }
        }

        if (!targetUrl) {
            return res.status(400).json({ error: 'Target URL or valid App ID required' });
        }

        logger.info(`Opening URL in Buddy Browser: ${targetUrl}`);

        // Use the BuddyBrowser service to launch/navigate
        const buddyBrowser = getBuddyBrowser();

        // If not running, launch it
        if (!buddyBrowser.isRunning()) {
            await buddyBrowser.launch();
        }

        const browser = buddyBrowser.getBrowser();
        if (browser) {
            const pages = await browser.pages();
            const page = pages.length > 0 ? pages[0] : await browser.newPage();
            await page.goto(targetUrl);

            // Bring browser to front if possible (platform specific)
            // This is hard from node, but Puppeteer usually handles focus on launch or new page
        }

        res.json({ success: true, url: targetUrl });
    } catch (error) {
        logger.error('Failed to open app', error);
        res.status(500).json({ error: error.message });
    }
});

// Open generic URL in System Browser
app.post('/api/actions/open-system', async (req, res) => {
    try {
        const { url } = req.body;
        if (url) {
            shell.openExternal(url);
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'URL required' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Browser Automation Endpoints ---

// Create browser automation plan
app.post('/api/browser/create-plan', async (req, res) => {
    try {
        const { goal } = req.body;
        const { browserPlanner } = await import('../services/browser-planner');
        const plan = await browserPlanner.createPlan(goal);
        res.json({ success: true, plan });
    } catch (error) {
        logger.error('Failed to create browser plan', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Execute browser automation plan
app.post('/api/browser/execute-plan', async (req, res) => {
    try {
        const { plan } = req.body;
        const { browserExecutor } = await import('../services/browser-executor');
        const result = await browserExecutor.executePlan(plan);
        res.json(result);
    } catch (error) {
        logger.error('Failed to execute browser plan', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get browser status
app.get('/api/browser/status', async (req, res) => {
    try {
        const { BrowserLifecycle } = await import('../services/browser-lifecycle');
        const isRunning = BrowserLifecycle.isRunning();
        res.json({ success: true, isRunning });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Close browser
app.post('/api/browser/close', async (req, res) => {
    try {
        const { BrowserLifecycle } = await import('../services/browser-lifecycle');
        await BrowserLifecycle.closeBrowser();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start the Server
export function startLocalServer() {
    try {
        app.listen(PORT, '127.0.0.1', () => {
        });
    } catch (error) {
        logger.error('Failed to start local API server', error);
    }
}
