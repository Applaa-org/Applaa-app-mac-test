import { IpcClient } from '../ipc/ipc_client';
import { getModelClient } from '../ipc/utils/get_model_client';
import { readSettings } from '../main/settings';
import { generateText } from 'ai';
import log from 'electron-log/main';
import type { LargeLanguageModel, UserSettings } from '../lib/schemas';

const logger = log.scope("applaa-automation");

export interface Action {
  type: 'ipc' | 'dom';
  method: string;
  params: Record<string, any>;
}

export interface TaskPlan {
  actions: Action[];
}

export interface AutomationResult {
  success: boolean;
  task: string;
  actions: Array<{
    action: Action;
    result: any;
    success: boolean;
    error?: string;
  }>;
  result?: string;
  error?: string;
}

export class ApplaaAutomationService {
  private ipcClient: IpcClient;
  
  constructor() {
    this.ipcClient = IpcClient.getInstance();
  }

  /**
   * Execute a user task in the Applaa app UI
   * Example: "Create a new web app called 'MyApp'"
   */
  async executeUserTask(task: string, settings: UserSettings): Promise<AutomationResult> {
    try {
      logger.info(`Executing user task: ${task}`);
      
      // Use AI to understand the task and convert it to actions
      const plan = await this.planTask(task, settings);
      
      logger.info(`Task plan created with ${plan.actions.length} actions`);
      
      // Execute the planned actions
      const actionResults = [];
      for (const action of plan.actions) {
        try {
          logger.info(`Executing action: ${action.type}.${action.method}`);
          const result = await this.executeAction(action);
          actionResults.push({
            action,
            result,
            success: true,
          });
        } catch (error: any) {
          logger.error(`Action failed: ${error.message}`);
          actionResults.push({
            action,
            result: null,
            success: false,
            error: error.message,
          });
        }
        
        // Small delay between actions
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      const allSuccessful = actionResults.every(r => r.success);
      
      return {
        success: allSuccessful,
        task,
        actions: actionResults,
        result: this.summarizeResults(actionResults),
      };
    } catch (error: any) {
      logger.error(`Task execution failed: ${error.message}`);
      return {
        success: false,
        task,
        actions: [],
        error: error.message,
      };
    }
  }

  /**
   * Use AI to break down user task into executable actions
   */
  async planTask(task: string, settings: UserSettings): Promise<TaskPlan> {
    const { modelClient } = await getModelClient(
      settings.selectedModel,
      settings,
    );

    // Create a prompt that understands Applaa's capabilities
    const prompt = `You are controlling the Applaa Electron application - an AI-powered app builder.

Available IPC actions (for app operations):
- createApp: { name: string, appType: "web" | "mobile" | "godot", framework: "react" | "nextjs" | "expo" | "flutter" }
- runApp: { appId: number }
- stopApp: { appId: number }
- editFile: { appId: number, filePath: string, content: string }
- listApps: {}
- getApp: { appId: number }
- createChat: { appId: number }
- deleteApp: { appId: number }
- renameApp: { appId: number, appName: string, appPath: string }

Available DOM actions (for UI interactions):
- clickButton: { selector: string } - CSS selector for button element
- fillInput: { selector: string, value: string } - CSS selector for input element
- navigate: { route: string } - Route path like "/", "/app/123", "/app/123/chat"
- extractText: { selector: string } - Extract text from element

Common selectors in Applaa:
- Chat input: textarea[placeholder*="Ask Applaa"], [data-testid="chat-input"]
- Create app button: button with text containing "Create" or "New"
- App list items: [data-testid="app-list"] or similar

Important rules:
1. For app creation/management, prefer IPC actions
2. For UI navigation/interactions, use DOM actions
3. Use listApps first if you need to find an app by name
4. Wait between actions (already handled by service)
5. Return ONLY valid JSON, no markdown formatting

User task: "${task}"

Break this down into a sequence of actions. Return ONLY a JSON object in this format:
{
  "actions": [
    { "type": "ipc", "method": "createApp", "params": { "name": "MyApp", "appType": "web", "framework": "react" } },
    { "type": "dom", "method": "navigate", "params": { "route": "/app/123" } }
  ]
}`;

    try {
      const { text } = await generateText({
        model: modelClient.model,
        prompt,
        maxTokens: 2000,
      });

      // Parse JSON from response (handle markdown code blocks if present)
      let jsonText = text.trim();
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const plan = JSON.parse(jsonText) as TaskPlan;
      
      if (!plan.actions || !Array.isArray(plan.actions)) {
        throw new Error('Invalid plan format: actions array missing');
      }

      return plan;
    } catch (error: any) {
      logger.error(`Failed to plan task: ${error.message}`);
      // Return a simple fallback plan
      return {
        actions: [
          {
            type: 'ipc',
            method: 'listApps',
            params: {},
          },
        ],
      };
    }
  }

  /**
   * Execute a single action using IPC
   */
  private async executeAction(action: Action): Promise<any> {
    if (action.type !== 'ipc') {
      throw new Error('This service only handles IPC actions. DOM actions should be handled separately.');
    }

    switch (action.method) {
      case 'createApp': {
        const { name, appType, framework } = action.params;
        return await this.ipcClient.createApp({
          name,
          appType: appType || 'web',
          framework: framework || 'react',
        });
      }
      
      case 'runApp': {
        const { appId } = action.params;
        return await this.ipcClient.runApp(appId, () => {});
      }
      
      case 'stopApp': {
        const { appId } = action.params;
        return await this.ipcClient.stopApp(appId);
      }
      
      case 'editFile': {
        const { appId, filePath, content } = action.params;
        return await this.ipcClient.editAppFile(appId, filePath, content);
      }
      
      case 'listApps': {
        return await this.ipcClient.listApps();
      }
      
      case 'getApp': {
        const { appId } = action.params;
        return await this.ipcClient.getApp(appId);
      }
      
      case 'createChat': {
        const { appId } = action.params;
        return await this.ipcClient.createChat(appId);
      }
      
      case 'deleteApp': {
        const { appId } = action.params;
        return await this.ipcClient.deleteApp(appId);
      }
      
      case 'renameApp': {
        const { appId, appName, appPath } = action.params;
        return await this.ipcClient.renameApp({
          appId,
          appName,
          appPath,
        });
      }
      
      default:
        throw new Error(`Unknown IPC action: ${action.method}`);
    }
  }

  /**
   * Summarize action results for user
   */
  private summarizeResults(actionResults: AutomationResult['actions']): string {
    const successful = actionResults.filter(r => r.success).length;
    const failed = actionResults.filter(r => !r.success).length;
    
    if (failed === 0) {
      return `✅ All ${successful} actions completed successfully.`;
    }
    
    const errorMessages = actionResults
      .filter(r => !r.success)
      .map(r => r.error)
      .join('; ');
    
    return `⚠️ Completed ${successful} actions, ${failed} failed. Errors: ${errorMessages}`;
  }
}

