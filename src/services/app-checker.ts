import { db } from '../db';
import { apps } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getBuddyBrowser } from './buddy-browser';
import log from 'electron-log';

const logger = log.scope('app-checker');

export interface AppFeedback {
    appName: string;
    appType: string;
    suggestions: string[];
    positiveNotes: string[];
}

export async function checkApp(appId: number): Promise<AppFeedback | null> {
    try {
        const app = await db.select().from(apps).where(eq(apps.id, appId)).get();
        if (!app) return null;

        const feedback: AppFeedback = {
            appName: app.name,
            appType: app.appType || 'unknown',
            suggestions: [],
            positiveNotes: ['🚀 Your project looks awesome!']
        };

        // Web App Specific Checks
        if (app.appType === 'web') {
            const url = app.vercelDeploymentUrl || app.easDeploymentUrl || 'http://localhost:8081';

            try {
                const buddyBrowser = getBuddyBrowser();
                if (!buddyBrowser.isRunning()) {
                    await buddyBrowser.launch();
                }
                const browser = buddyBrowser.getBrowser();
                if (browser) {
                    const page = await browser.newPage();
                    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

                    const title = await page.title();
                    const buttons = await page.$$('button');
                    const images = await page.$$('img');

                    if (title && title !== 'React App' && title !== 'Vite + React') {
                        feedback.positiveNotes.push(`🏷️ Great job naming your tab: "${title}"!`);
                    } else {
                        feedback.suggestions.push("🏷️ Try giving your app a cool title in the code!");
                    }

                    if (buttons.length > 0) {
                        feedback.positiveNotes.push(`🔘 I see you added ${buttons.length} buttons!`);
                    } else {
                        feedback.suggestions.push("🔘 Maybe add a button to make your app interactive?");
                    }

                    if (images.length === 0) {
                        feedback.suggestions.push("🖼️ Adding some pictures or icons would make it look super cool!");
                    }

                    await page.close();
                }
            } catch (err) {
                logger.error(`Browser check failed for app ${appId}`, err);
                feedback.suggestions.push("🌐 Make sure your app is running so I can see it!");
            }
        }

        // Game Specific Suggestions
        if (app.appType === 'arcade' || app.appType === 'godot') {
            feedback.positiveNotes.push("🎮 Games are the best!");
            feedback.suggestions.push("🎵 Try adding some fun sound effects!");
            feedback.suggestions.push("🏆 A high-score counter would be a great addition!");
            feedback.suggestions.push("⭐ Maybe add some power-ups for the player to collect?");
        }

        // Hardware Specific Suggestions
        if (app.appType === 'microbit') {
            feedback.positiveNotes.push("💡 Hardware projects are like magic!");
            feedback.suggestions.push("🎵 You could use the buzzer to make some music!");
            feedback.suggestions.push("🌡️ Try using the sensors to react to light or temperature!");
        }

        return feedback;

    } catch (error) {
        logger.error(`Failed to check app ${appId}`, error);
        return null;
    }
}
