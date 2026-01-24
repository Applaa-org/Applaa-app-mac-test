const squid = require('flying-squid');
const mineflayer = require('mineflayer');
const { mineflayer: prismarineViewer } = require('prismarine-viewer');
const fs = require('fs');
const path = require('path');

// Configuration
const SERVER_PORT = 25565;
const VIEWER_PORT = 3003;
const VERSION = '1.16.1'; // 1.16.1 is well supported by flying-squid and viewer

let server = null;
let bot = null;

// Notify parent process
const send = (type, payload) => {
    if (process.send) {
        process.send({ type, payload });
    } else {
        console.log(`[IPC] ${type}:`, payload);
    }
};

async function startServer() {
    try {
        send('status', 'Starting Minecraft Server...');

        // 1. Start Flying-Squid Server
        server = squid.createMCServer({
            'online-mode': false,
            encryption: false,
            host: '0.0.0.0',
            port: SERVER_PORT,
            version: VERSION,
            'view-distance': 4,
            'max-players': 10,
            logging: false // Reduce noise
        });

        server.on('error', (err) => {
            send('error', `Server error: ${err.message}`);
        });

        server.on('listening', () => {
            send('status', `Server listening on ${SERVER_PORT}`);
            connectBot(); // Connect bot once server is ready
        });

    } catch (err) {
        send('error', `Failed to start server: ${err.message}`);
    }
}

function connectBot() {
    send('status', 'Connecting Bot...');

    // 2. Start Mineflayer Bot
    bot = mineflayer.createBot({
        host: 'localhost',
        port: SERVER_PORT,
        username: 'PreviewBot',
        version: VERSION
    });

    bot.once('spawn', () => {
        send('status', 'Bot spawned! Starting Viewer...');
        startViewer();
    });

    bot.on('error', (err) => {
        send('error', `Bot error: ${err.message}`);
    });

    bot.on('kicked', (reason) => {
        send('error', `Bot kicked: ${reason}`);
    });
}

function startViewer() {
    try {
        // 3. Start Prismarine Viewer
        prismarineViewer(bot, { port: VIEWER_PORT, firstPerson: false });
        send('ready', {
            serverPort: SERVER_PORT,
            viewerPort: VIEWER_PORT,
            viewerUrl: `http://localhost:${VIEWER_PORT}`
        });
        send('status', 'Sandbox Ready!');
    } catch (err) {
        send('error', `Viewer error: ${err.message}`);
    }
}

// Handle messages from parent
process.on('message', (msg) => {
    if (msg.type === 'START') {
        startServer();
    } else if (msg.type === 'STOP') {
        process.exit(0); // Cleanest way to kill everything
    } else if (msg.type === 'LOAD_MOD') {
        loadModLogic(msg.payload); // { name, listeners: [...] }
    }
});

function loadModLogic(modData) {
    if (!bot) return;

    send('status', `Loading mod: ${modData.name}`);
    console.log('[Child] Loading actions:', JSON.stringify(modData.listeners));

    // Clear previous listeners if needed (complex without re-creating bot)
    // For now, we just add new ones. In a real app, we might respawn the bot.

    modData.listeners.forEach(listener => {
        if (listener.type === 'onChat') {
            bot.on('chat', (username, message) => {
                if (username === bot.username) return; // Ignore self

                // Check trigger
                if (message.toLowerCase() === listener.trigger.toLowerCase()) {
                    executeActions(listener.actions, username);
                }
            });
            send('status', `Registered command: ${listener.trigger}`);
        }
        else if (listener.type === 'onJoin') {
            // If bot is already spawned, trigger immediately
            executeActions(listener.actions, 'Player');
        }
    });

    send('status', 'Mod logic active!');
}

function executeActions(actions, targetPlayer) {
    actions.forEach(action => {
        switch (action.type) {
            case 'sendMessage':
                bot.chat(action.params.message);
                break;
            case 'consoleLog':
                console.log(`[Mod Log] ${action.params.message}`);
                break;
            case 'giveItem':
                // Creative mode give
                // This requires the bot to have permissions or use creative inventory
                const itemType = action.params.item; // e.g. 'diamond'
                bot.chat(`/give ${targetPlayer} ${itemType} ${action.params.count || 1}`);
                break;
        }
    });
}

// Auto-start if run directly for testing
if (require.main === module && !process.send) {
    startServer();
}

// Handle startup
send('status', 'Child process initialized');
