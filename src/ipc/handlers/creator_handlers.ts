import { ipcMain } from "electron";
import log from "electron-log";
import { generateStarterProject, StarterProjectRequest } from "../../lib/llm-orchestrator";

const logger = log.scope("creator_handlers");

export function registerCreatorHandlers() {

    ipcMain.handle("creator:generate-starter-project", async (_, request: StarterProjectRequest) => {
        try {
            logger.info(`Generating starter project for ${request.frameworkId}`);
            const project = await generateStarterProject(request);
            return project;
        } catch (error) {
            logger.error("Failed to generate starter project:", error);
            throw error;
        }
    });

}
