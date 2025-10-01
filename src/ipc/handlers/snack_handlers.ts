import { ipcMain } from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';
import { getDyadAppPath } from '@/paths/paths';
import { Snack } from 'snack-sdk';
import { db } from '@/db/index';
import { apps } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Register Snack-related IPC handlers
 */
export function registerSnackHandlers() {
  console.log('📦 Registering Snack IPC handlers...');

  /**
   * Create a Snack from an Expo app
   */
  ipcMain.handle('snack:create-from-app', async (event, args: { appId: number }) => {
    try {
      const { appId } = args;

      // Get app from database
      const app = await db.select().from(apps).where(eq(apps.id, appId)).get();
      if (!app) {
        throw new Error(`App ${appId} not found`);
      }

      const appPath = getDyadAppPath(app.path);

      if (!fs.existsSync(appPath)) {
        throw new Error(`App path does not exist: ${appPath}`);
      }

      console.log(`📦 Creating Snack from app ${appId} at ${appPath}...`);

      // Read all files recursively
      const files: Record<string, { type: 'CODE'; contents: string }> = {};

      const readDir = async (dir: string, baseDir: string = dir) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

          // Skip node_modules, .git, .expo, etc.
          if (
            entry.name === 'node_modules' ||
            entry.name === '.git' ||
            entry.name === '.expo' ||
            entry.name === 'dist' ||
            entry.name === 'build' ||
            entry.name.startsWith('.')
          ) {
            continue;
          }

          if (entry.isDirectory()) {
            await readDir(fullPath, baseDir);
          } else if (entry.isFile()) {
            // Only include code files
            const ext = path.extname(entry.name);
            if (
              ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', '.css'].includes(ext)
            ) {
              const contents = await fs.readFile(fullPath, 'utf-8');
              files[relativePath] = {
                type: 'CODE',
                contents,
              };
            }
          }
        }
      };

      await readDir(appPath);

      console.log(`📦 Read ${Object.keys(files).length} files for Snack`);

      // Create Snack instance
      const snack = new Snack({
        files,
        name: `Applaa App ${appId}`,
        description: 'Created with Applaa Builder',
        sdkVersion: '51.0.0', // Latest Expo SDK
      });

      // Save the Snack (uploads to Expo servers)
      console.log('🚀 Uploading to Snack...');
      await snack.saveAsync();

      // Get the Snack URLs
      const snackId = snack.id;
      const webUrl = `https://snack.expo.dev/${snackId}`;
      const qrUrl = `exp://exp.host/@snack/${snackId}`;

      console.log('✅ Snack created:', webUrl);

      return {
        success: true,
        snackId,
        webUrl,
        qrUrl,
      };
    } catch (error: any) {
      console.error('❌ Failed to create Snack:', error);
      return {
        success: false,
        error: error?.message ?? 'Failed to create Snack',
      };
    }
  });

  console.log('✅ Snack IPC handlers registered');
}
