import { test, testWithConfig, Timeout } from "./helpers/test_helper";
import { expect } from "@playwright/test";
import fs from "fs";
import path from "path";

// Test database migration and legacy compatibility
test("legacy database compatibility", testWithConfig({
  preLaunchHook: async ({ userDataDir }) => {
    // Copy a legacy database without new columns
    const legacyDbPath = path.join(__dirname, "fixtures", "backups", "empty-v0.12.0-beta.1.db");
    const targetDbPath = path.join(userDataDir, "sqlite.db");
    
    // Ensure directory exists
    fs.mkdirSync(userDataDir, { recursive: true });
    
    // Copy legacy DB if it exists
    if (fs.existsSync(legacyDbPath)) {
      fs.copyFileSync(legacyDbPath, targetDbPath);
    }
  }
}), async ({ po }) => {
  // App should start successfully with legacy database
  await po.setUp();
  
  // Should be able to create a new app
  await po.sendPrompt("tc=1");
  await po.expectPreviewIframeIsVisible();
  
  // Should be able to list apps (with fallback for missing columns)
  await po.goToAppsTab();
  const appName = await po.getCurrentAppName();
  await expect(po.getAppListItem({ appName })).toBeVisible();
  
  // Should be able to navigate to app details
  await po.clickAppListItem({ appName });
  await expect(po.page.getByText("App Upgrades")).toBeVisible();
  
  // Should be able to create mobile apps
  await po.clickAppUpgradeButton({ upgradeId: "capacitor" });
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "capacitor" });
});

test("database operations with new schema", async ({ po }) => {
  await po.setUp();
  
  // Create an app which should use new schema
  await po.sendPrompt("tc=1");
  await po.expectPreviewIframeIsVisible();
  
  const appName = await po.getCurrentAppName();
  
  // Verify app has proper display name (new schema feature)
  await po.goToAppsTab();
  const appListItem = po.getAppListItem({ appName });
  const appText = await appListItem.textContent();
  
  // Should have a meaningful name, not just random characters
  expect(appText).toBeTruthy();
  expect(appText?.length).toBeGreaterThan(5);
  
  // Navigate to app details
  await po.clickAppListItem({ appName });
  
  // Should be able to perform all operations
  await expect(po.page.getByText("App Upgrades")).toBeVisible();
  
  // Create mobile apps
  await po.clickAppUpgradeButton({ upgradeId: "capacitor" });
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "capacitor" });
  
  await po.clickAppUpgradeButton({ upgradeId: "flutter-webview" });
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "flutter-webview" });
  
  // Verify mobile development section
  await expect(po.page.getByText("Mobile Development")).toBeVisible({
    timeout: Timeout.MEDIUM,
  });
});

test("chat functionality with database", async ({ po }) => {
  await po.setUp();
  await po.sendPrompt("tc=1");
  await po.expectPreviewIframeIsVisible();
  
  // Should be able to send multiple messages
  await po.sendPrompt("Add a button to the app");
  
  // Should be able to view message history
  await po.snapshotMessages();
  
  // Should be able to start new chat
  await po.clickNewChat();
  await po.sendPrompt("Create a simple form");
  
  // Should maintain separate chat history
  await po.snapshotMessages();
});

test("app versioning and git operations", async ({ po }) => {
  await po.setUp();
  await po.sendPrompt("tc=1");
  await po.expectPreviewIframeIsVisible();
  
  // Make some changes
  await po.sendPrompt("Add a header to the app");
  
  // Should be able to access version history
  const appName = await po.getCurrentAppName();
  await po.clickAppListItem({ appName });
  
  // Navigate to code view to see files
  await po.selectPreviewMode("code");
  
  // Should see file changes reflected
  await expect(po.page.getByTestId("file-browser")).toBeVisible({
    timeout: Timeout.MEDIUM,
  });
});

test("settings persistence", async ({ po }) => {
  await po.setUp();
  
  // Change some settings
  await po.goToSettingsTab();
  await po.toggleAutoApprove();
  await po.toggleAutoUpdate();
  
  // Settings should persist (snapshot will verify)
  await po.snapshotSettings();
  
  // Go back to apps and create one
  await po.goToAppsTab();
  await po.sendPrompt("tc=1");
  await po.expectPreviewIframeIsVisible();
  
  // Go back to settings and verify they're still there
  await po.goToSettingsTab();
  
  // Auto-approve should still be enabled
  const autoApproveSwitch = po.page.getByRole("switch", { name: "Auto-approve" });
  await expect(autoApproveSwitch).toBeChecked();
});

test("error recovery and data integrity", async ({ po }) => {
  await po.setUp();
  await po.sendPrompt("tc=1");
  await po.expectPreviewIframeIsVisible();
  
  const appName = await po.getCurrentAppName();
  
  // Simulate some operations that might cause issues
  await po.clickAppListItem({ appName });
  
  // Try to create mobile apps
  await po.clickAppUpgradeButton({ upgradeId: "capacitor" });
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "capacitor" });
  
  // Navigate away and back
  await po.goToSettingsTab();
  await po.goToAppsTab();
  await po.clickAppListItem({ appName });
  
  // Should still show correct state
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "capacitor" });
  await expect(po.page.getByText("Mobile Development")).toBeVisible({
    timeout: Timeout.MEDIUM,
  });
  
  // Should be able to continue working
  await po.clickAppUpgradeButton({ upgradeId: "flutter-webview" });
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "flutter-webview" });
});

test("concurrent operations handling", async ({ po }) => {
  await po.setUp();
  await po.sendPrompt("tc=1");
  await po.expectPreviewIframeIsVisible();
  
  const appName = await po.getCurrentAppName();
  await po.clickAppListItem({ appName });
  
  // Try rapid operations (should be handled gracefully)
  await po.selectPreviewMode("problems");
  await po.selectPreviewMode("code");
  await po.selectPreviewMode("configure");
  await po.selectPreviewMode("preview");
  
  // Should end up in preview mode
  await po.expectPreviewIframeIsVisible();
  
  // Should be able to perform mobile operations
  await po.clickAppUpgradeButton({ upgradeId: "capacitor" });
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "capacitor" });
});

test("large app handling", async ({ po }) => {
  await po.setUp();
  
  // Create a more complex app
  await po.sendPrompt("Create a React app with multiple components, routing, and state management");
  await po.expectPreviewIframeIsVisible();
  
  const appName = await po.getCurrentAppName();
  
  // Should handle large file structures
  await po.selectPreviewMode("code");
  await expect(po.page.getByTestId("file-browser")).toBeVisible({
    timeout: Timeout.LONG, // Longer timeout for complex apps
  });
  
  // Should be able to create mobile versions
  await po.clickAppListItem({ appName });
  await po.clickAppUpgradeButton({ upgradeId: "capacitor" });
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "capacitor" });
  
  // Should handle mobile generation for complex apps
  await expect(po.page.getByText("Mobile Development")).toBeVisible({
    timeout: Timeout.LONG,
  });
});



