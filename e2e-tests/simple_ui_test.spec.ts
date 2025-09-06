/**
 * SIMPLE UI TEST - No fake server dependencies
 */

import { test as base, expect } from "@playwright/test";
import * as eph from "electron-playwright-helpers";
import { ElectronApplication, _electron as electron } from "playwright";
import os from "os";
import path from "path";

// Simple test without the complex PageObject setup
const test = base.extend<{ electronApp: ElectronApplication }>({
  electronApp: async ({}, use) => {
    // Find the latest build
    const latestBuild = eph.findLatestBuild();
    const appInfo = eph.parseElectronApp(latestBuild);
    
    console.log("🚀 Launching Electron app...");
    console.log("Executable:", appInfo.executable);
    console.log("Main:", appInfo.main);
    
    // Set test environment
    process.env.E2E_TEST_BUILD = "true";
    process.env.OPENAI_API_KEY = "sk-test"; // Avoid setup screen
    
    const userDataDir = path.join(os.tmpdir(), `applaa-simple-test-${Date.now()}`);
    
    try {
      const electronApp = await electron.launch({
        args: [
          appInfo.main,
          "--enable-logging",
          `--user-data-dir=${userDataDir}`,
          "--no-sandbox", // Add sandbox disable for testing
          "--disable-dev-shm-usage", // Reduce memory usage
        ],
        executablePath: appInfo.executable,
        timeout: 60000, // Increase timeout to 60 seconds
        // Add environment variables to help with startup
        env: {
          ...process.env,
          NODE_ENV: "test",
          ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
        },
      });
      
      console.log("✅ Electron app launched successfully!");
      
      await use(electronApp);
      
      await electronApp.close();
    } catch (error) {
      console.error("❌ Failed to launch Electron app:", error);
      throw error;
    }
  },
});

test.describe("Simple UI Test", () => {
  
  test("should launch Electron app and show window", async ({ electronApp }) => {
    console.log("🔍 Getting first window...");
    
    const page = await electronApp.firstWindow();
    console.log("✅ Got first window");
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    console.log("✅ DOM content loaded");
    
    // Check basic page properties
    const title = await page.title();
    console.log("Page title:", title);
    
    const url = page.url();
    console.log("Page URL:", url);
    
    // Check if body exists
    const body = page.locator('body');
    await expect(body).toBeVisible({ timeout: 5000 });
    console.log("✅ Body is visible");
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'simple-ui-test.png', fullPage: true });
    console.log("📸 Screenshot saved");
    
    // Check for any text content
    const bodyText = await body.textContent();
    console.log("Body text length:", bodyText?.length || 0);
    
    if (bodyText && bodyText.length > 10) {
      console.log("✅ Page has content");
    } else {
      console.log("⚠️ Page appears empty");
    }
  });
  
});
