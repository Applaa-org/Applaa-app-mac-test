import { test, Timeout } from "./helpers/test_helper";
import { expect } from "@playwright/test";

test("smart app naming - meaningful names", async ({ po }) => {
  await po.setUp();
  
  // Create an e-commerce app
  await po.sendPrompt("Create an e-commerce website with product listings, shopping cart, and checkout");
  await po.expectPreviewIframeIsVisible();
  
  const appName = await po.getCurrentAppName();
  
  // Should have a meaningful name related to e-commerce
  expect(appName).toBeTruthy();
  expect(appName.toLowerCase()).toMatch(/(shop|store|commerce|market|cart|buy)/);
  
  // Go to apps list to see display name
  await po.goToAppsTab();
  const appListItem = po.getAppListItem({ appName });
  const displayText = await appListItem.textContent();
  
  // Display name should be meaningful and professional
  expect(displayText).toBeTruthy();
  expect(displayText?.length).toBeGreaterThan(5);
  expect(displayText?.toLowerCase()).toMatch(/(shop|store|commerce|market|cart|buy|retail)/);
});

test("smart app naming - different app types", async ({ po }) => {
  await po.setUp();
  
  // Test different types of apps get appropriate names
  
  // 1. Blog app
  await po.sendPrompt("Create a personal blog website with posts and comments");
  await po.expectPreviewIframeIsVisible();
  
  let appName = await po.getCurrentAppName();
  expect(appName.toLowerCase()).toMatch(/(blog|post|article|journal|write)/);
  
  // 2. Dashboard app
  await po.clickNewChat();
  await po.sendPrompt("Create a business dashboard with charts and analytics");
  await po.expectPreviewIframeIsVisible();
  
  appName = await po.getCurrentAppName();
  expect(appName.toLowerCase()).toMatch(/(dash|board|analytics|chart|metric|report)/);
  
  // 3. Portfolio app
  await po.clickNewChat();
  await po.sendPrompt("Create a portfolio website to showcase my work and projects");
  await po.expectPreviewIframeIsVisible();
  
  appName = await po.getCurrentAppName();
  expect(appName.toLowerCase()).toMatch(/(portfolio|showcase|work|project|gallery)/);
});

test("smart app naming - fallback mechanism", async ({ po }) => {
  // Test with a very generic prompt that might not generate good names
  await po.setUp();
  
  await po.sendPrompt("Create a simple app");
  await po.expectPreviewIframeIsVisible();
  
  const appName = await po.getCurrentAppName();
  
  // Should still get a valid name (either smart or fallback)
  expect(appName).toBeTruthy();
  expect(appName.length).toBeGreaterThan(3);
  
  // Should not contain random animal names (old system)
  expect(appName.toLowerCase()).not.toMatch(/(kraken|griffin|phoenix|dragon|unicorn)/);
});

test("smart app naming - display vs technical names", async ({ po }) => {
  await po.setUp();
  
  await po.sendPrompt("Create a restaurant menu and ordering system");
  await po.expectPreviewIframeIsVisible();
  
  const technicalName = await po.getCurrentAppName();
  
  // Go to apps list to see display name
  await po.goToAppsTab();
  const appListItem = po.getAppListItem({ appName: technicalName });
  const displayText = await appListItem.textContent();
  
  // Both should be meaningful but may be different formats
  expect(technicalName).toBeTruthy();
  expect(displayText).toBeTruthy();
  
  // Technical name should be filesystem-safe (no spaces, special chars)
  expect(technicalName).toMatch(/^[a-zA-Z0-9-_]+$/);
  
  // Display name can have spaces and be more readable
  expect(displayText?.length).toBeGreaterThan(technicalName.length - 5);
});

test("smart app naming - consistency across sessions", async ({ po }) => {
  await po.setUp();
  
  // Create an app
  await po.sendPrompt("Create a task management application with todo lists");
  await po.expectPreviewIframeIsVisible();
  
  const appName = await po.getCurrentAppName();
  expect(appName.toLowerCase()).toMatch(/(task|todo|manage|list|organize)/);
  
  // Navigate away and back
  await po.goToSettingsTab();
  await po.goToAppsTab();
  await po.clickAppListItem({ appName });
  
  // Name should be consistent
  const sameName = await po.getCurrentAppName();
  expect(sameName).toBe(appName);
  
  // Display name should also be consistent
  await po.goToAppsTab();
  const appListItem = po.getAppListItem({ appName });
  const displayText = await appListItem.textContent();
  expect(displayText).toBeTruthy();
});

test("smart app naming - mobile app integration", async ({ po }) => {
  await po.setUp();
  
  await po.sendPrompt("Create a fitness tracking app with workout logs");
  await po.expectPreviewIframeIsVisible();
  
  const appName = await po.getCurrentAppName();
  expect(appName.toLowerCase()).toMatch(/(fit|health|workout|track|exercise)/);
  
  // Create mobile versions
  await po.clickAppListItem({ appName });
  await po.clickAppUpgradeButton({ upgradeId: "capacitor" });
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "capacitor" });
  
  await po.clickAppUpgradeButton({ upgradeId: "flutter-webview" });
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "flutter-webview" });
  
  // Mobile development section should show
  await expect(po.page.getByText("Mobile Development")).toBeVisible({
    timeout: Timeout.MEDIUM,
  });
  
  // App should still be properly categorized
  await po.goToAppsTab();
  await expect(po.page.getByText("Flutter Apps")).toBeVisible({
    timeout: Timeout.MEDIUM,
  });
  await expect(po.getAppListItem({ appName })).toBeVisible();
});

test("smart app naming - special characters handling", async ({ po }) => {
  await po.setUp();
  
  // Test with prompts that might generate names with special characters
  await po.sendPrompt("Create a café & restaurant website with menu and reservations");
  await po.expectPreviewIframeIsVisible();
  
  const appName = await po.getCurrentAppName();
  
  // Technical name should be filesystem-safe
  expect(appName).toMatch(/^[a-zA-Z0-9-_]+$/);
  expect(appName).not.toMatch(/[&@#$%^*()+=\[\]{}|\\:";'<>?,./]/);
  
  // Should still be meaningful
  expect(appName.toLowerCase()).toMatch(/(cafe|restaurant|menu|food|dine)/);
});

test("smart app naming - length constraints", async ({ po }) => {
  await po.setUp();
  
  // Test with very long description
  await po.sendPrompt("Create a comprehensive enterprise resource planning system with inventory management, customer relationship management, human resources, accounting, and project management modules");
  await po.expectPreviewIframeIsVisible();
  
  const appName = await po.getCurrentAppName();
  
  // Should have reasonable length (not too long for filesystem)
  expect(appName.length).toBeLessThan(50);
  expect(appName.length).toBeGreaterThan(5);
  
  // Should still capture the essence
  expect(appName.toLowerCase()).toMatch(/(erp|enterprise|manage|system|resource)/);
});



