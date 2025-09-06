/**
 * UI STARTUP DEBUG TEST
 * 
 * This test diagnoses why the UI isn't loading properly
 */

import { test, expect, Timeout } from "./helpers/test_helper";

test.describe("🔍 UI Startup Diagnosis", () => {
  
  test("should start Electron app and show main window", async ({ po }) => {
    console.log("🚀 Starting Electron app...");
    
    // Wait for the app to be ready
    await po.page.waitForTimeout(5000);
    
    console.log("📱 Checking if main window is visible...");
    console.log("Current URL:", po.page.url());
    
    // Check if the page loaded at all
    const title = await po.page.title();
    console.log("Page title:", title);
    
    // Check for basic HTML elements
    const body = po.page.locator('body');
    await expect(body).toBeVisible({ timeout: 10000 });
    console.log("✅ Body element is visible");
    
    // Check for React root
    const reactRoot = po.page.locator('#root');
    if (await reactRoot.isVisible()) {
      console.log("✅ React root found");
    } else {
      console.log("❌ React root NOT found");
    }
    
    // Check for any error messages
    const errorElements = po.page.locator('text="Error"');
    const errorCount = await errorElements.count();
    console.log(`Error elements found: ${errorCount}`);
    
    // Check console errors
    po.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🚨 Console Error:', msg.text());
      }
    });
    
    // Take a screenshot for debugging
    await po.page.screenshot({ path: 'debug-ui-startup.png', fullPage: true });
    console.log("📸 Screenshot saved as debug-ui-startup.png");
    
    // Try to find any visible text
    const pageContent = await po.page.textContent('body');
    console.log("Page content length:", pageContent?.length || 0);
    if (pageContent && pageContent.length > 0) {
      console.log("First 200 chars:", pageContent.substring(0, 200));
    }
  });
  
  test("should check for basic navigation elements", async ({ po }) => {
    console.log("🧭 Checking for navigation elements...");
    
    await po.page.waitForTimeout(5000);
    
    // Look for common navigation elements
    const navElements = [
      'text="Apps"',
      'text="Chat"', 
      'text="Settings"',
      'text="Hub"',
      '[data-testid="nav"]',
      'nav',
      '.nav',
      '#nav'
    ];
    
    for (const selector of navElements) {
      const element = po.page.locator(selector);
      const isVisible = await element.isVisible();
      console.log(`${selector}: ${isVisible ? '✅ Found' : '❌ Not found'}`);
    }
    
    // Check for main app container
    const appContainers = [
      '#app',
      '#root', 
      '.app',
      '[data-testid="app"]',
      'main'
    ];
    
    for (const selector of appContainers) {
      const element = po.page.locator(selector);
      const isVisible = await element.isVisible();
      console.log(`App container ${selector}: ${isVisible ? '✅ Found' : '❌ Not found'}`);
    }
  });
  
});

