import { ipcMain } from "electron";
import { localBrain } from "../../services/local_brain";
import log from "electron-log";

const logger = log.scope("local-brain-handlers");

export function registerLocalBrainHandlers() {

    /**
     * Get semantic similarity search results
     * Channel: local-brain:search
     */
    ipcMain.handle("local-brain:search", async (event, query: string, limit: number = 5) => {
        try {
            logger.info(`🔍 Searching Local Brain for: "${query}"`);
            const results = await localBrain.search(query, limit);
            return { success: true, results };
        } catch (error) {
            logger.error("❌ Search failed:", error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Generate an embedding for a text string
     * Channel: local-brain:embed
     */
    ipcMain.handle("local-brain:embed", async (event, text: string) => {
        try {
            // logger.info("Generating embedding..."); // Verbose
            const embedding = await localBrain.embed(text);
            return { success: true, embedding };
        } catch (error) {
            logger.error("❌ Embedding failed:", error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Initialize the brain explicitly (optional)
     * Channel: local-brain:init
     */
    ipcMain.handle("local-brain:init", async () => {
        try {
            await localBrain.init();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
}
