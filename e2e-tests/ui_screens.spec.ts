import { test, Timeout } from "./helpers/test_helper";
import { expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const MINIMAL_APP = "minimal-with-ai-rules";

test("app details screen - all sections visible", async ({ po }) => {
  await po.setUp();
  await po.importApp(MINIMAL_APP);
  await po.expectPreviewIframeIsVisible();

  const appName = await po.getCurrentAppName();
  
  // Navigate to app details
  await po.clickAppListItem({ appName });

  // Verify main sections are visible
  await expect(po.page.getByText("App Upgrades")).toBeVisible();
  await expect(po.page.getByText("Preview")).toBeVisible();
  await expect(po.page.getByText("Problems")).toBeVisible();
  await expect(po.page.getByText("Code")).toBeVisible();
  await expect(po.page.getByText("Configure")).toBeVisible();

  // Verify app upgrade buttons
  await expect(po.locateAppUpgradeButton({ upgradeId: "capacitor" })).toBeVisible();
  await expect(po.locateAppUpgradeButton({ upgradeId: "flutter-webview" })).toBeVisible();

  // Verify app controls
  await expect(po.page.getByTestId("app-details-rename-app-button")).toBeVisible();
  await expect(po.page.getByTestId("app-details-more-options-button")).toBeVisible();
});

test("preview screen - functionality", async ({ po }) => {
  await po.setUp();
  await po.importApp(MINIMAL_APP);
  
  // Wait for preview to load
  await po.expectPreviewIframeIsVisible();

  // Test preview controls
  await expect(po.page.getByTestId("preview-refresh-button")).toBeVisible();
  await expect(po.page.getByTestId("preview-more-options-button")).toBeVisible();
  await expect(po.page.getByTestId("toggle-preview-panel-button")).toBeVisible();

  // Test preview refresh
  await po.clickPreviewRefresh();
  await po.expectPreviewIframeIsVisible();

  // Test preview panel toggle
  await po.clickTogglePreviewPanel();
  await expect(po.getPreviewIframeElement()).toBeHidden();
  
  await po.clickTogglePreviewPanel();
  await po.expectPreviewIframeIsVisible();
});

test("problems screen - functionality", async ({ po }) => {
  await po.setUp();
  await po.importApp(MINIMAL_APP);
  await po.expectPreviewIframeIsVisible();

  // Switch to problems mode
  await po.selectPreviewMode("problems");

  // Verify problems pane is visible
  await expect(po.page.getByTestId("problems-pane")).toBeVisible();
  
  // Verify recheck button
  await expect(po.page.getByTestId("recheck-button")).toBeVisible();
  
  // Test recheck functionality
  await po.clickRecheckProblems();
  
  // Should show no problems for a clean app
  await expect(po.page.getByText("No problems found")).toBeVisible({
    timeout: Timeout.MEDIUM,
  });
});

test("code screen - file browser", async ({ po }) => {
  await po.setUp();
  await po.importApp(MINIMAL_APP);
  await po.expectPreviewIframeIsVisible();

  // Switch to code mode
  await po.selectPreviewMode("code");

  // Verify file browser is visible
  await expect(po.page.getByTestId("file-browser")).toBeVisible({
    timeout: Timeout.MEDIUM,
  });

  // Verify some expected files are visible
  await expect(po.page.getByText("src")).toBeVisible();
  await expect(po.page.getByText("package.json")).toBeVisible();
  
  // Click on a file to open it
  await po.page.getByText("App.tsx").click();
  
  // Verify code editor appears
  await expect(po.page.locator(".monaco-editor")).toBeVisible({
    timeout: Timeout.MEDIUM,
  });
});

test("configure screen - environment variables", async ({ po }) => {
  await po.setUp();
  await po.sendPrompt("tc=1"); // Create a simple app
  
  // Switch to configure mode
  await po.selectPreviewMode("configure");

  // Verify configure pane is visible
  await expect(po.page.getByText("Environment Variables")).toBeVisible();
  
  // Verify add button is visible
  await expect(po.page.getByRole("button", { name: "Add Environment Variable" })).toBeVisible();

  // Test adding an environment variable
  await po.page.getByRole("button", { name: "Add Environment Variable" }).click();
  
  // Verify form appears
  await expect(po.page.getByRole("textbox", { name: "Key" })).toBeVisible();
  await expect(po.page.getByRole("textbox", { name: "Value" })).toBeVisible();
  
  // Fill and save
  await po.page.getByRole("textbox", { name: "Key" }).fill("TEST_KEY");
  await po.page.getByRole("textbox", { name: "Value" }).fill("test_value");
  await po.page.getByRole("button", { name: "Save" }).click();

  // Verify the env var appears in the list
  await expect(po.page.getByText("TEST_KEY")).toBeVisible();
  await expect(po.page.getByText("test_value")).toBeVisible();
});

test("chat interface - input controls", async ({ po }) => {
  await po.setUp();
  await po.importApp(MINIMAL_APP);

  // Verify chat input container is visible
  await expect(po.getChatInputContainer()).toBeVisible();
  
  // Verify main input controls
  await expect(po.getChatInput()).toBeVisible();
  await expect(po.page.getByRole("button", { name: "Send message" })).toBeVisible();

  // Verify control buttons
  await expect(po.page.getByTestId("chat-mode-selector")).toBeVisible();
  await expect(po.page.getByRole("button", { name: "Model: Auto" })).toBeVisible();
  
  // Test platform selector
  await expect(po.page.locator('[data-testid*="platform-selector"]')).toBeVisible();
  
  // Test spark mode selector
  await expect(po.page.locator('[data-testid*="spark"]')).toBeVisible();
  
  // Test import app button
  await expect(po.page.getByRole("button", { name: "Import App" })).toBeVisible();
});

test("app list sidebar - categorization", async ({ po }) => {
  await po.setUp();
  await po.importApp(MINIMAL_APP);
  await po.expectPreviewIframeIsVisible();

  // Go to apps tab to see the sidebar
  await po.goToAppsTab();

  // Verify app categories are visible
  await expect(po.page.getByText("Web Apps")).toBeVisible();
  
  // Verify the imported app is listed
  const appName = await po.getCurrentAppName();
  await expect(po.getAppListItem({ appName })).toBeVisible();
  
  // Verify app has display name (not just technical name)
  const appListItem = po.getAppListItem({ appName });
  const appText = await appListItem.textContent();
  expect(appText).toBeTruthy();
  expect(appText?.length).toBeGreaterThan(0);
});

test("settings screen - all sections", async ({ po }) => {
  await po.setUp();

  // Go to settings
  await po.goToSettingsTab();

  // Verify main settings sections
  await expect(po.page.getByText("AI Providers")).toBeVisible();
  await expect(po.page.getByText("General")).toBeVisible();
  
  // Verify some key settings
  await expect(po.page.getByRole("switch", { name: "Auto-approve" })).toBeVisible();
  await expect(po.page.getByRole("switch", { name: "Auto-update" })).toBeVisible();
  
  // Verify provider setup
  await expect(po.page.getByText("test-provider")).toBeVisible();
});

test("navigation between screens", async ({ po }) => {
  await po.setUp();
  await po.importApp(MINIMAL_APP);
  await po.expectPreviewIframeIsVisible();

  // Test navigation between main tabs
  await po.goToSettingsTab();
  await expect(po.page.getByText("AI Providers")).toBeVisible();
  
  await po.goToAppsTab();
  await expect(po.page.getByText("Build your dream app")).toBeVisible();
  
  await po.goToChatTab();
  await expect(po.getChatInputContainer()).toBeVisible();

  // Test navigation between preview modes
  const appName = await po.getCurrentAppName();
  await po.clickAppListItem({ appName });
  
  await po.selectPreviewMode("preview");
  await po.expectPreviewIframeIsVisible();
  
  await po.selectPreviewMode("problems");
  await expect(po.page.getByTestId("problems-pane")).toBeVisible();
  
  await po.selectPreviewMode("code");
  await expect(po.page.getByTestId("file-browser")).toBeVisible({
    timeout: Timeout.MEDIUM,
  });
  
  await po.selectPreviewMode("configure");
  await expect(po.page.getByText("Environment Variables")).toBeVisible();
});

test("responsive layout and UI elements", async ({ po }) => {
  await po.setUp();
  await po.importApp(MINIMAL_APP);
  await po.expectPreviewIframeIsVisible();

  // Verify key UI elements are properly styled and visible
  await expect(po.page.locator("nav")).toBeVisible(); // Main navigation
  await expect(po.page.locator("main")).toBeVisible(); // Main content area
  
  // Verify sidebar is visible
  await expect(po.page.locator('[data-testid*="sidebar"]')).toBeVisible();
  
  // Verify title bar
  await expect(po.getTitleBarAppNameButton()).toBeVisible();
  
  // Test that tooltips work (hover over spark button)
  const sparkButton = po.page.locator('[data-testid*="spark"]').first();
  await sparkButton.hover();
  await expect(po.page.locator('[role="tooltip"]')).toBeVisible({
    timeout: 2000,
  });
});

test("error states and loading states", async ({ po }) => {
  await po.setUp();
  
  // Test loading state when creating an app
  await po.sendPrompt("tc=1");
  
  // Should see loading indicators during generation
  await expect(po.page.getByText("Generating")).toBeVisible({
    timeout: 1000,
  });
  
  // Wait for completion
  await po.expectPreviewIframeIsVisible();
  
  // Test preview loading states
  await po.clickPreviewRefresh();
  
  // Should see loading state briefly
  await expect(po.locateLoadingAppPreview().or(po.locateStartingAppPreview())).toBeVisible({
    timeout: 5000,
  });
  
  // Should eventually show preview
  await po.expectPreviewIframeIsVisible();
});



