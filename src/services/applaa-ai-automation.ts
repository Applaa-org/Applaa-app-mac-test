import { BrowserWindow } from 'electron';
import { ApplaaAutomationService, Action, AutomationResult } from './applaa-automation-service';
import { ApplaaDOMAutomation } from './applaa-dom-automation';
import { readSettings } from '../main/settings';
import log from 'electron-log/main';

const logger = log.scope("applaa-ai-automation");

export class ApplaaAIAutomation {
  private ipcAutomation: ApplaaAutomationService;
  private domAutomation: ApplaaDOMAutomation;
  private window: BrowserWindow;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.ipcAutomation = new ApplaaAutomationService();
    this.domAutomation = new ApplaaDOMAutomation(window);
  }

  /**
   * Execute user task - automatically chooses IPC or DOM approach
   */
  async executeTask(task: string): Promise<AutomationResult> {
    try {
      logger.info(`Executing Applaa automation task: ${task}`);
      
      const settings = readSettings();
      
      // Use AI to determine the best approach and plan actions
      const plan = await this.planTask(task, settings);
      
      logger.info(`Task plan created with ${plan.actions.length} actions`);
      
      const actionResults = [];
      for (const action of plan.actions) {
        try {
          logger.info(`Executing action: ${action.type}.${action.method}`, action.params);
          
          let result;
          if (action.type === 'ipc') {
            // Use IPC for app-level operations
            result = await this.executeIPCAction(action);
          } else {
            // Use DOM for UI interactions
            result = await this.executeDOMAction(action);
          }
          
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
        
        // Small delay between actions to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 500));
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
   * Plan task using AI - delegates to ApplaaAutomationService
   */
  private async planTask(task: string, settings: any): Promise<{ actions: Action[] }> {
    // Use the IPC automation service's planTask method
    const plan = await this.ipcAutomation.planTask(task, settings);
    return plan;
  }

  /**
   * Execute IPC action
   */
  private async executeIPCAction(action: Action): Promise<any> {
    // Use the IPC automation service - we need to access the private method
    // For now, we'll use a type assertion to access it
    // In a production app, you might want to make executeAction public or create a public wrapper
    const service = this.ipcAutomation as any;
    return await service.executeAction(action);
  }

  /**
   * Execute DOM action
   */
  private async executeDOMAction(action: Action): Promise<any> {
    switch (action.method) {
      case 'clickButton':
        return await this.domAutomation.clickButton(action.params.selector);
      
      case 'fillInput':
        return await this.domAutomation.fillInput(
          action.params.selector,
          action.params.value
        );
      
      case 'navigate':
        return await this.domAutomation.navigate(action.params.route);
      
      case 'extractText':
        return await this.domAutomation.extractText(action.params.selector);
      
      case 'waitForElement':
        return await this.domAutomation.waitForElement(
          action.params.selector,
          action.params.timeout || 5000
        );
      
      default:
        throw new Error(`Unknown DOM action: ${action.method}`);
    }
  }

  /**
   * Summarize results for user
   */
  private summarizeResults(actionResults: AutomationResult['actions']): string {
    const successful = actionResults.filter(r => r.success).length;
    const failed = actionResults.filter(r => !r.success).length;
    
    if (failed === 0) {
      return `✅ Successfully completed ${successful} action(s).`;
    }
    
    const errorMessages = actionResults
      .filter(r => !r.success)
      .map(r => `${r.action.method}: ${r.error}`)
      .join('; ');
    
    return `⚠️ Completed ${successful} action(s), ${failed} failed. Errors: ${errorMessages}`;
  }
}

