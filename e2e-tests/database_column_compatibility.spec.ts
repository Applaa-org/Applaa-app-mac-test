import { test, expect } from "@playwright/test";
import { ElectronApplication, Page } from "playwright";
import { 
  startElectronApp, 
  stopElectronApp, 
  createTestApp, 
  waitForAppToLoad,
  expectNoConsoleErrors 
} from "./helpers/test_helper";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

let electronApp: ElectronApplication;
let page: Page;

test.describe("Database Column Compatibility", () => {
  test.beforeEach(async () => {
    ({ electronApp, page } = await startElectronApp());
    await waitForAppToLoad(page);
  });

  test.afterEach(async () => {
    await stopElectronApp(electronApp);
  });

  test("should handle legacy database without display_name column", async () => {
    // Create a legacy database structure
    const userDataPath = path.join(process.cwd(), "userData");
    const dbPath = path.join(userDataPath, "sqlite.db");
    
    // Backup current database if it exists
    let backupPath: string | null = null;
    if (fs.existsSync(dbPath)) {
      backupPath = dbPath + ".backup";
      fs.copyFileSync(dbPath, backupPath);
    }

    try {
      // Create a legacy database without new columns
      const db = new Database(dbPath);
      
      // Create legacy apps table structure
      db.exec(`
        DROP TABLE IF EXISTS apps;
        CREATE TABLE apps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          path TEXT NOT NULL,
          created_at INTEGER,
          github_org TEXT,
          github_repo TEXT,
          github_branch TEXT,
          supabase_project_id TEXT,
          neon_project_id TEXT,
          neon_development_branch_id TEXT,
          neon_preview_branch_id TEXT,
          vercel_project_id TEXT,
          vercel_project_name TEXT,
          vercel_team_id TEXT,
          vercel_deployment_url TEXT,
          chat_context TEXT
        );
      `);

      // Insert a test app
      db.prepare(`
        INSERT INTO apps (name, path, created_at) 
        VALUES (?, ?, ?)
      `).run("legacy-test-app", "legacy-test-app", Math.floor(Date.now() / 1000));

      db.close();

      // Restart the app to load the legacy database
      await stopElectronApp(electronApp);
      ({ electronApp, page } = await startElectronApp());
      await waitForAppToLoad(page);

      // Test that the app loads without errors
      await expect(page.locator('[data-testid="app-list"]')).toBeVisible({ timeout: 10000 });
      
      // Verify the legacy app appears in the list
      await expect(page.locator('text=legacy-test-app')).toBeVisible();

      // Test creating a new app (should work with legacy database)
      await createTestApp(page, "new-app-on-legacy-db");
      await expect(page.locator('text=new-app-on-legacy-db')).toBeVisible();

      // Test chat functionality (this was the main issue)
      await page.locator('text=new-app-on-legacy-db').click();
      await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
      
      // Send a simple message to test chat streaming
      await page.fill('[data-testid="chat-input"]', "Create a simple hello world component");
      await page.press('[data-testid="chat-input"]', "Enter");
      
      // Wait for response without errors
      await expect(page.locator('[data-testid="chat-message"]')).toBeVisible({ timeout: 30000 });

      // Check that no console errors occurred
      await expectNoConsoleErrors(page, [
        "display_name",
        "updated_at",
        "package_id", 
        "slug"
      ]);

    } finally {
      // Restore backup if it existed
      if (backupPath && fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, dbPath);
        fs.unlinkSync(backupPath);
      }
    }
  });

  test("should handle proposal approval with legacy database", async () => {
    // Similar setup as above but focused on proposal approval
    const userDataPath = path.join(process.cwd(), "userData");
    const dbPath = path.join(userDataPath, "sqlite.db");
    
    let backupPath: string | null = null;
    if (fs.existsSync(dbPath)) {
      backupPath = dbPath + ".backup";
      fs.copyFileSync(dbPath, backupPath);
    }

    try {
      // Create legacy database structure
      const db = new Database(dbPath);
      
      db.exec(`
        DROP TABLE IF EXISTS apps;
        CREATE TABLE apps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          path TEXT NOT NULL,
          created_at INTEGER,
          github_org TEXT,
          github_repo TEXT,
          github_branch TEXT,
          supabase_project_id TEXT,
          neon_project_id TEXT,
          neon_development_branch_id TEXT,
          neon_preview_branch_id TEXT,
          vercel_project_id TEXT,
          vercel_project_name TEXT,
          vercel_team_id TEXT,
          vercel_deployment_url TEXT,
          chat_context TEXT
        );

        DROP TABLE IF EXISTS chats;
        CREATE TABLE chats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT,
          app_id INTEGER NOT NULL,
          created_at INTEGER,
          FOREIGN KEY (app_id) REFERENCES apps (id) ON DELETE CASCADE
        );

        DROP TABLE IF EXISTS messages;
        CREATE TABLE messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          chat_id INTEGER NOT NULL,
          created_at INTEGER,
          approval_state TEXT DEFAULT 'pending',
          commit_hash TEXT,
          FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE
        );
      `);

      const appId = db.prepare(`
        INSERT INTO apps (name, path, created_at) 
        VALUES (?, ?, ?)
      `).run("proposal-test-app", "proposal-test-app", Math.floor(Date.now() / 1000)).lastInsertRowid;

      const chatId = db.prepare(`
        INSERT INTO chats (title, app_id, created_at)
        VALUES (?, ?, ?)
      `).run("Test Chat", appId, Math.floor(Date.now() / 1000)).lastInsertRowid;

      db.prepare(`
        INSERT INTO messages (role, content, chat_id, created_at)
        VALUES (?, ?, ?, ?)
      `).run("assistant", "I'll create a simple component for you.\n\n<dyad-write path=\"src/Hello.tsx\">\nexport default function Hello() {\n  return <div>Hello World!</div>;\n}\n</dyad-write>", chatId, Math.floor(Date.now() / 1000));

      db.close();

      // Restart app with legacy database
      await stopElectronApp(electronApp);
      ({ electronApp, page } = await startElectronApp());
      await waitForAppToLoad(page);

      // Navigate to the app and chat
      await page.locator('text=proposal-test-app').click();
      await expect(page.locator('[data-testid="chat-message"]')).toBeVisible();

      // Look for and click approve button (this was failing before)
      const approveButton = page.locator('button:has-text("Approve")').first();
      if (await approveButton.isVisible()) {
        await approveButton.click();
        
        // Wait for approval to complete without errors
        await expect(page.locator('text=Approved')).toBeVisible({ timeout: 15000 });
      }

      // Check for no database column errors
      await expectNoConsoleErrors(page, [
        "display_name",
        "updated_at", 
        "package_id",
        "slug"
      ]);

    } finally {
      if (backupPath && fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, dbPath);
        fs.unlinkSync(backupPath);
      }
    }
  });

  test("should handle Fix All functionality with legacy database", async () => {
    const userDataPath = path.join(process.cwd(), "userData");
    const dbPath = path.join(userDataPath, "sqlite.db");
    
    let backupPath: string | null = null;
    if (fs.existsSync(dbPath)) {
      backupPath = dbPath + ".backup";
      fs.copyFileSync(dbPath, backupPath);
    }

    try {
      // Create legacy database
      const db = new Database(dbPath);
      
      db.exec(`
        DROP TABLE IF EXISTS apps;
        CREATE TABLE apps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          path TEXT NOT NULL,
          created_at INTEGER,
          github_org TEXT,
          github_repo TEXT,
          github_branch TEXT,
          supabase_project_id TEXT,
          neon_project_id TEXT,
          neon_development_branch_id TEXT,
          neon_preview_branch_id TEXT,
          vercel_project_id TEXT,
          vercel_project_name TEXT,
          vercel_team_id TEXT,
          vercel_deployment_url TEXT,
          chat_context TEXT
        );
      `);

      db.prepare(`
        INSERT INTO apps (name, path, created_at) 
        VALUES (?, ?, ?)
      `).run("fix-all-test-app", "fix-all-test-app", Math.floor(Date.now() / 1000));

      db.close();

      // Restart app
      await stopElectronApp(electronApp);
      ({ electronApp, page } = await startElectronApp());
      await waitForAppToLoad(page);

      // Create the test app and navigate to it
      await createTestApp(page, "fix-all-legacy-test");
      await page.locator('text=fix-all-legacy-test').click();

      // Send a message that would trigger Fix All
      await page.fill('[data-testid="chat-input"]', "Create a component with a TypeScript error");
      await page.press('[data-testid="chat-input"]', "Enter");
      
      // Wait for response
      await expect(page.locator('[data-testid="chat-message"]')).toBeVisible({ timeout: 30000 });

      // Look for Fix All button and click it (this was the main failing scenario)
      const fixAllButton = page.locator('button:has-text("Fix All")').first();
      if (await fixAllButton.isVisible()) {
        await fixAllButton.click();
        
        // Wait for Fix All to complete
        await page.waitForTimeout(5000);
      }

      // Verify no database column errors occurred
      await expectNoConsoleErrors(page, [
        "display_name",
        "updated_at",
        "package_id",
        "slug"
      ]);

    } finally {
      if (backupPath && fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, dbPath);
        fs.unlinkSync(backupPath);
      }
    }
  });

  test("should handle app operations with legacy database", async () => {
    const userDataPath = path.join(process.cwd(), "userData");
    const dbPath = path.join(userDataPath, "sqlite.db");
    
    let backupPath: string | null = null;
    if (fs.existsSync(dbPath)) {
      backupPath = dbPath + ".backup";
      fs.copyFileSync(dbPath, backupPath);
    }

    try {
      // Create legacy database
      const db = new Database(dbPath);
      
      db.exec(`
        DROP TABLE IF EXISTS apps;
        CREATE TABLE apps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          path TEXT NOT NULL,
          created_at INTEGER
        );
      `);

      db.close();

      // Restart app
      await stopElectronApp(electronApp);
      ({ electronApp, page } = await startElectronApp());
      await waitForAppToLoad(page);

      // Test various app operations that could trigger database queries
      
      // 1. Create app
      await createTestApp(page, "ops-test-app");
      await expect(page.locator('text=ops-test-app')).toBeVisible();

      // 2. Navigate to app (triggers various handlers)
      await page.locator('text=ops-test-app').click();
      await expect(page.locator('[data-testid="app-details"]')).toBeVisible();

      // 3. Check problems (triggers problems handler)
      const problemsTab = page.locator('[data-testid="problems-tab"]');
      if (await problemsTab.isVisible()) {
        await problemsTab.click();
        await page.waitForTimeout(2000);
      }

      // 4. Check versions (triggers version handler)
      const versionsTab = page.locator('[data-testid="versions-tab"]');
      if (await versionsTab.isVisible()) {
        await versionsTab.click();
        await page.waitForTimeout(2000);
      }

      // 5. Go back to chat and send message (triggers chat handlers)
      const chatTab = page.locator('[data-testid="chat-tab"]');
      if (await chatTab.isVisible()) {
        await chatTab.click();
      }
      
      await page.fill('[data-testid="chat-input"]', "Hello");
      await page.press('[data-testid="chat-input"]', "Enter");
      await expect(page.locator('[data-testid="chat-message"]')).toBeVisible({ timeout: 15000 });

      // Verify no database errors
      await expectNoConsoleErrors(page, [
        "display_name",
        "updated_at",
        "package_id",
        "slug",
        "no such column"
      ]);

    } finally {
      if (backupPath && fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, dbPath);
        fs.unlinkSync(backupPath);
      }
    }
  });
});



