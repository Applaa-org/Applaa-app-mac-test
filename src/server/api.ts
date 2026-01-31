
import express from 'express';
import cors from 'cors';
import { db } from '../db';
import { apps, chats, messages, appKnowledge } from '../db/schema';
import crypto from 'crypto';
import { eq, desc, sql } from 'drizzle-orm';
import log from 'electron-log';


import { BrowserWindow, shell } from 'electron';


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

// Start the Server
export function startLocalServer() {
    try {
        app.listen(PORT, '127.0.0.1', () => {
        });
    } catch (error) {
        logger.error('Failed to start local API server', error);
    }
}
