import { ipcMain } from "electron";
import { skillExecutor } from "../../services/skill_executor";
import log from "electron-log";

const logger = log.scope("skill-handlers");

export function registerSkillHandlers() {
    logger.info("🧠 Registering Skill Executor IPC handlers...");

    /**
     * Execute a skill by ID
     * Channel: skill:execute
     */
    ipcMain.handle("skill:execute", async (event, skillId: string, userInputs: Record<string, any> = {}) => {
        try {
            logger.info(`🚀 Request to execute skill: ${skillId}`);
            const executionId = await skillExecutor.executeSkill(skillId, userInputs);
            return { success: true, executionId };
        } catch (error) {
            logger.error(`❌ Failed to start skill ${skillId}:`, error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Get execution status
     * Channel: skill:status
     */
    ipcMain.handle("skill:status", async (event, executionId: string) => {
        try {
            const status = skillExecutor.getStatus(executionId);
            if (!status) {
                return { success: false, error: "Execution not found" };
            }
            return { success: true, status };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
}
