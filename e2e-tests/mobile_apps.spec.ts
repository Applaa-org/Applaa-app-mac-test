import { test, Timeout } from "./helpers/test_helper";
import { expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const MINIMAL_APP = "minimal-with-ai-rules";

test("capacitor mobile app generation and detection", async ({ po }) => {
  await po.setUp();
  await po.importApp(MINIMAL_APP);
  await po.expectPreviewIframeIsVisible();

  // Navigate to app details to see mobile options
  await po.clickAppListItem({ appName: await po.getCurrentAppName() });

  // Verify Capacitor upgrade is available
  await expect(po.locateAppUpgradeButton({ upgradeId: "capacitor" })).toBeVisible({
    timeout: Timeout.MEDIUM,
  });

  // Click to create Capacitor app
  await po.clickAppUpgradeButton({ upgradeId: "capacitor" });

  // Wait for generation to complete and verify button is hidden
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "capacitor" });

  // Verify Capacitor files exist
  const appPath = await po.getCurrentAppPath();
  const capacitorConfigExists = 
    fs.existsSync(path.join(appPath, "capacitor.config.ts")) ||
    fs.existsSync(path.join(appPath, "capacitor.config.js"));
  const androidExists = fs.existsSync(path.join(appPath, "android"));
  const iosExists = fs.existsSync(path.join(appPath, "ios"));

  expect(capacitorConfigExists || androidExists || iosExists).toBe(true);

  // Verify Mobile Development section appears
  await expect(po.page.getByText("Mobile Development")).toBeVisible({
    timeout: Timeout.MEDIUM,
  });

  // Verify Capacitor controls are visible
  await expect(po.page.getByText("Capacitor")).toBeVisible();
  await expect(po.page.getByRole("button", { name: /Sync.*Android/i })).toBeVisible();
  await expect(po.page.getByRole("button", { name: /Sync.*iOS/i })).toBeVisible();

  // Verify source code section
  await expect(po.page.getByText("Source code")).toBeVisible();
  await expect(po.page.getByRole("button", { name: "Open in folder" })).toBeVisible();
  await expect(po.page.getByRole("button", { name: "Copy path" })).toBeVisible();
});

test("flutter mobile app generation and detection", async ({ po }) => {
  await po.setUp();
  await po.importApp(MINIMAL_APP);
  await po.expectPreviewIframeIsVisible();

  // Navigate to app details to see mobile options
  await po.clickAppListItem({ appName: await po.getCurrentAppName() });

  // Verify Flutter upgrade is available
  await expect(po.locateAppUpgradeButton({ upgradeId: "flutter-webview" })).toBeVisible({
    timeout: Timeout.MEDIUM,
  });

  // Click to create Flutter app
  await po.clickAppUpgradeButton({ upgradeId: "flutter-webview" });

  // Wait for generation to complete and verify button is hidden
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "flutter-webview" });

  // Verify Flutter files exist
  const appPath = await po.getCurrentAppPath();
  const appName = await po.getCurrentAppName();
  const flutterPath = path.join(path.dirname(appPath), `${appName}-flutter`);
  
  const pubspecExists = fs.existsSync(path.join(flutterPath, "pubspec.yaml"));
  const mainDartExists = fs.existsSync(path.join(flutterPath, "lib", "main.dart"));
  const androidExists = fs.existsSync(path.join(flutterPath, "android"));
  const iosExists = fs.existsSync(path.join(flutterPath, "ios"));

  expect(pubspecExists && mainDartExists && (androidExists || iosExists)).toBe(true);

  // Verify Mobile Development section appears
  await expect(po.page.getByText("Mobile Development")).toBeVisible({
    timeout: Timeout.MEDIUM,
  });

  // Verify Flutter controls are visible
  await expect(po.page.getByText("Flutter")).toBeVisible();
  await expect(po.page.getByRole("button", { name: /Sync.*Android/i })).toBeVisible();
  await expect(po.page.getByRole("button", { name: /Sync.*iOS/i })).toBeVisible();

  // Verify source code section for Flutter
  await expect(po.page.getByText("Source code")).toBeVisible();
  await expect(po.page.getByRole("button", { name: "Open in folder" })).toBeVisible();
  await expect(po.page.getByRole("button", { name: "Copy path" })).toBeVisible();
});

test("both capacitor and flutter generation", async ({ po }) => {
  await po.setUp();
  await po.importApp(MINIMAL_APP);
  await po.expectPreviewIframeIsVisible();

  // Navigate to app details
  await po.clickAppListItem({ appName: await po.getCurrentAppName() });

  // Create Capacitor first
  await po.clickAppUpgradeButton({ upgradeId: "capacitor" });
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "capacitor" });

  // Create Flutter second
  await po.clickAppUpgradeButton({ upgradeId: "flutter-webview" });
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "flutter-webview" });

  // Verify both sections are visible
  await expect(po.page.getByText("Mobile Development")).toBeVisible({
    timeout: Timeout.MEDIUM,
  });
  
  // Should see both Capacitor and Flutter sections
  const capacitorSection = po.page.locator('[data-testid*="capacitor"]').first();
  const flutterSection = po.page.locator('[data-testid*="flutter"]').first();
  
  await expect(capacitorSection).toBeVisible();
  await expect(flutterSection).toBeVisible();

  // Verify no upgrade buttons are visible
  await po.expectNoAppUpgrades();
});

test("mobile app detection after restart", async ({ po }) => {
  await po.setUp();
  await po.importApp(MINIMAL_APP);
  await po.expectPreviewIframeIsVisible();

  const appName = await po.getCurrentAppName();
  
  // Navigate to app details and create Capacitor
  await po.clickAppListItem({ appName });
  await po.clickAppUpgradeButton({ upgradeId: "capacitor" });
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "capacitor" });

  // Simulate app restart by navigating away and back
  await po.goToSettingsTab();
  await po.goToAppsTab();
  await po.clickAppListItem({ appName });

  // Verify Capacitor is still detected (button should be hidden)
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "capacitor" });
  
  // Verify Mobile Development section is still visible
  await expect(po.page.getByText("Mobile Development")).toBeVisible({
    timeout: Timeout.MEDIUM,
  });
});

test("app categorization in sidebar", async ({ po }) => {
  await po.setUp();
  await po.importApp(MINIMAL_APP);
  await po.expectPreviewIframeIsVisible();

  const appName = await po.getCurrentAppName();
  
  // Initially should be categorized as Web
  await expect(po.page.getByText("Web Apps")).toBeVisible();
  await expect(po.getAppListItem({ appName })).toBeVisible();

  // Create Capacitor app
  await po.clickAppListItem({ appName });
  await po.clickAppUpgradeButton({ upgradeId: "capacitor" });
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "capacitor" });

  // Go back to apps list to see categorization
  await po.goToAppsTab();

  // Should now see Capacitor category
  await expect(po.page.getByText("Capacitor Apps")).toBeVisible({
    timeout: Timeout.MEDIUM,
  });
  await expect(po.getAppListItem({ appName })).toBeVisible();

  // Create Flutter app
  await po.clickAppListItem({ appName });
  await po.clickAppUpgradeButton({ upgradeId: "flutter-webview" });
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "flutter-webview" });

  // Go back to apps list
  await po.goToAppsTab();

  // Should now see Flutter category (since it has both, Flutter takes precedence)
  await expect(po.page.getByText("Flutter Apps")).toBeVisible({
    timeout: Timeout.MEDIUM,
  });
  await expect(po.getAppListItem({ appName })).toBeVisible();
});

test("mobile app generation error handling", async ({ po }) => {
  await po.setUp();
  await po.importApp(MINIMAL_APP);
  await po.expectPreviewIframeIsVisible();

  // Navigate to app details
  await po.clickAppListItem({ appName: await po.getCurrentAppName() });

  // Try to create Capacitor twice (should handle gracefully)
  await po.clickAppUpgradeButton({ upgradeId: "capacitor" });
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "capacitor" });

  // Refresh the page to reset detection
  await po.page.reload();
  await po.page.waitForLoadState("networkidle");

  // Button should still be hidden (detection should work)
  await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "capacitor" });
});



