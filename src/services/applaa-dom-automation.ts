import { BrowserWindow } from 'electron';
import log from 'electron-log/main';

const logger = log.scope("applaa-dom-automation");

export class ApplaaDOMAutomation {
  constructor(private window: BrowserWindow) {}

  /**
   * Execute JavaScript in the renderer to interact with UI
   */
  async clickButton(selector: string): Promise<{ success: boolean; error?: string }> {
    try {
      const script = `
        (function() {
          try {
            const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
            if (element) {
              element.click();
              return { success: true };
            }
            return { success: false, error: 'Element not found: ${selector.replace(/'/g, "\\'")}' };
          } catch (e) {
            return { success: false, error: e.message };
          }
        })();
      `;
      
      const result = await this.window.webContents.executeJavaScript(script);
      if (!result.success) {
        logger.warn(`Failed to click button: ${result.error}`);
      }
      return result;
    } catch (error: any) {
      logger.error(`Error clicking button: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fill a form field
   */
  async fillInput(selector: string, value: string): Promise<{ success: boolean; error?: string }> {
    try {
      const escapedValue = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
      const script = `
        (function() {
          try {
            const input = document.querySelector('${selector.replace(/'/g, "\\'")}');
            if (input) {
              input.value = '${escapedValue}';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              return { success: true };
            }
            return { success: false, error: 'Input not found: ${selector.replace(/'/g, "\\'")}' };
          } catch (e) {
            return { success: false, error: e.message };
          }
        })();
      `;
      
      const result = await this.window.webContents.executeJavaScript(script);
      if (!result.success) {
        logger.warn(`Failed to fill input: ${result.error}`);
      }
      return result;
    } catch (error: any) {
      logger.error(`Error filling input: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Navigate to a page/route using TanStack Router
   */
  async navigate(route: string): Promise<{ success: boolean; error?: string }> {
    try {
      const script = `
        (function() {
          try {
            // Try TanStack Router first
            if (window.__TANSTACK_ROUTER__) {
              window.__TANSTACK_ROUTER__.navigate({ to: '${route.replace(/'/g, "\\'")}' });
              return { success: true };
            }
            // Fallback to window.location
            window.location.hash = '#${route.replace(/'/g, "\\'")}';
            return { success: true };
          } catch (e) {
            return { success: false, error: e.message };
          }
        })();
      `;
      
      const result = await this.window.webContents.executeJavaScript(script);
      if (!result.success) {
        logger.warn(`Failed to navigate: ${result.error}`);
      }
      return result;
    } catch (error: any) {
      logger.error(`Error navigating: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract text from UI element
   */
  async extractText(selector: string): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      const script = `
        (function() {
          try {
            const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
            return { success: true, text: element ? element.textContent : null };
          } catch (e) {
            return { success: false, error: e.message };
          }
        })();
      `;
      
      const result = await this.window.webContents.executeJavaScript(script);
      return result;
    } catch (error: any) {
      logger.error(`Error extracting text: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Wait for element to appear
   */
  async waitForElement(selector: string, timeout: number = 5000): Promise<{ success: boolean; error?: string }> {
    try {
      const script = `
        (function() {
          return new Promise((resolve) => {
            const startTime = Date.now();
            const checkElement = () => {
              const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
              if (element) {
                resolve({ success: true });
              } else if (Date.now() - startTime > ${timeout}) {
                resolve({ success: false, error: 'Element not found within timeout' });
              } else {
                setTimeout(checkElement, 100);
              }
            };
            checkElement();
          });
        })();
      `;
      
      const result = await this.window.webContents.executeJavaScript(script);
      return result;
    } catch (error: any) {
      logger.error(`Error waiting for element: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

