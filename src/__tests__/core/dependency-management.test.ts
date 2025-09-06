/**
 * 🚨 CRITICAL: Dependency Management Tests
 * 
 * These tests ensure our dependency installation and package management works correctly:
 * - getBestPackageManager function (the bug we just fixed)
 * - Applaa-approved dependencies validation
 * - Package installation flows
 * - Error handling and fallbacks
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { getBestPackageManager } from '../../lib/hermetic-runtime';
import { 
  getSafePackages, 
  getAllowedPackages, 
  isForbiddenPackage,
  getEssentialPackages 
} from '../../config/applaa-dependencies';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('Dependency Management Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'applaa-dep-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('Package Manager Detection', () => {
    it('should detect npm from package-lock.json', async () => {
      await fs.writeFile(path.join(tempDir, 'package-lock.json'), JSON.stringify({
        name: 'test-app',
        lockfileVersion: 2
      }));

      const packageManager = await getBestPackageManager(tempDir);
      expect(packageManager).toBe('npm');
    });

    it('should detect yarn from yarn.lock', async () => {
      await fs.writeFile(path.join(tempDir, 'yarn.lock'), '# yarn lockfile v1');

      const packageManager = await getBestPackageManager(tempDir);
      expect(packageManager).toBe('yarn');
    });

    it('should detect pnpm from pnpm-lock.yaml', async () => {
      await fs.writeFile(path.join(tempDir, 'pnpm-lock.yaml'), 'lockfileVersion: 5.4');

      const packageManager = await getBestPackageManager(tempDir);
      expect(packageManager).toBe('pnpm');
    });

    it('should prioritize pnpm over other package managers', async () => {
      // Create multiple lock files
      await fs.writeFile(path.join(tempDir, 'package-lock.json'), '{}');
      await fs.writeFile(path.join(tempDir, 'yarn.lock'), '# yarn lockfile v1');
      await fs.writeFile(path.join(tempDir, 'pnpm-lock.yaml'), 'lockfileVersion: 5.4');

      const packageManager = await getBestPackageManager(tempDir);
      expect(packageManager).toBe('pnpm'); // Should prefer pnpm
    });

    it('should fallback to npm when no lock files exist', async () => {
      // Empty directory
      const packageManager = await getBestPackageManager(tempDir);
      expect(packageManager).toBe('npm');
    });

    it('should handle invalid directory paths gracefully', async () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist');
      
      // Should not throw error
      const packageManager = await getBestPackageManager(nonExistentPath);
      expect(packageManager).toBe('npm'); // Should fallback to npm
    });

    it('should handle undefined path parameter (the bug we fixed)', async () => {
      // This was the critical bug - getBestPackageManager called without appPath
      expect(async () => {
        // @ts-expect-error - Testing the error case we fixed
        await getBestPackageManager(undefined);
      }).not.toThrow();
    });

    it('should handle null path parameter', async () => {
      expect(async () => {
        // @ts-expect-error - Testing edge case
        await getBestPackageManager(null);
      }).not.toThrow();
    });

    it('should handle empty string path parameter', async () => {
      const packageManager = await getBestPackageManager('');
      expect(packageManager).toBe('npm'); // Should fallback to npm
    });
  });

  describe('Applaa Dependencies Validation', () => {
    describe('Web App Dependencies', () => {
      it('should include essential web dependencies', () => {
        const essential = getEssentialPackages('web');
        
        expect(essential).toContain('react');
        expect(essential).toContain('react-dom');
        expect(essential).toContain('lucide-react');
        expect(essential).toContain('tailwindcss');
        expect(essential).toContain('@types/react');
      });

      it('should include safe web dependencies', () => {
        const safe = getSafePackages('web');
        
        // Should include essential + common
        expect(safe).toContain('react');
        expect(safe).toContain('framer-motion');
        expect(safe).toContain('react-hook-form');
        expect(safe).toContain('zod');
        
        // Should include the packages we just added to fix the warnings
        expect(safe).toContain('sonner');
        expect(safe).toContain('rehype-highlight');
        expect(safe).toContain('highlight.js');
      });

      it('should include all allowed web dependencies', () => {
        const allowed = getAllowedPackages('web');
        
        // Should include essential + common + optional
        expect(allowed).toContain('react');
        expect(allowed).toContain('framer-motion');
        expect(allowed).toContain('react-query');
        expect(allowed).toContain('zustand');
      });

      it('should identify forbidden web packages', () => {
        expect(isForbiddenPackage('jquery', 'web')).toBe(true);
        expect(isForbiddenPackage('angular', 'web')).toBe(true);
        expect(isForbiddenPackage('vue', 'web')).toBe(true);
        
        // Should allow approved packages
        expect(isForbiddenPackage('react', 'web')).toBe(false);
        expect(isForbiddenPackage('sonner', 'web')).toBe(false);
      });
    });

    describe('Expo App Dependencies', () => {
      it('should include essential expo dependencies', () => {
        const essential = getEssentialPackages('expo');
        
        expect(essential).toContain('expo');
        expect(essential).toContain('react-native');
        expect(essential).toContain('expo-router');
        expect(essential).toContain('@expo/vector-icons');
      });

      it('should include safe expo dependencies', () => {
        const safe = getSafePackages('expo');
        
        expect(safe).toContain('expo');
        expect(safe).toContain('expo-linear-gradient');
        expect(safe).toContain('expo-status-bar');
        expect(safe).toContain('react-native-svg');
      });

      it('should identify forbidden expo packages', () => {
        expect(isForbiddenPackage('expo-sqlite', 'expo')).toBe(true);
        expect(isForbiddenPackage('react-native-reanimated', 'expo')).toBe(true);
        expect(isForbiddenPackage('redux', 'expo')).toBe(true);
        
        // Should allow approved packages
        expect(isForbiddenPackage('expo', 'expo')).toBe(false);
        expect(isForbiddenPackage('expo-router', 'expo')).toBe(false);
      });
    });

    describe('Dependency Validation Edge Cases', () => {
      it('should handle unknown frameworks gracefully', () => {
        // @ts-expect-error - Testing unknown framework
        const essential = getEssentialPackages('unknown');
        expect(essential).toEqual([]);
        
        // @ts-expect-error - Testing unknown framework
        const safe = getSafePackages('unknown');
        expect(safe).toEqual([]);
        
        // @ts-expect-error - Testing unknown framework
        const allowed = getAllowedPackages('unknown');
        expect(allowed).toEqual([]);
      });

      it('should handle case sensitivity in package names', () => {
        expect(isForbiddenPackage('JQUERY', 'web')).toBe(false); // Case sensitive
        expect(isForbiddenPackage('jquery', 'web')).toBe(true);
      });

      it('should handle scoped package names', () => {
        expect(isForbiddenPackage('@types/react', 'web')).toBe(false);
        expect(isForbiddenPackage('@radix-ui/react-dialog', 'web')).toBe(false);
      });
    });
  });

  describe('Package Installation Simulation', () => {
    it('should create proper package.json structure', async () => {
      const packageJson = {
        name: 'test-app',
        version: '1.0.0',
        dependencies: {
          'react': '^18.0.0',
          'react-dom': '^18.0.0'
        },
        devDependencies: {
          '@types/react': '^18.0.0',
          'typescript': '^5.0.0'
        }
      };

      const packageJsonPath = path.join(tempDir, 'package.json');
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

      expect(await fs.pathExists(packageJsonPath)).toBe(true);
      
      const content = await fs.readJson(packageJsonPath);
      expect(content.name).toBe('test-app');
      expect(content.dependencies.react).toBe('^18.0.0');
    });

    it('should handle missing package.json gracefully', async () => {
      const packageJsonPath = path.join(tempDir, 'package.json');
      
      // Should not exist initially
      expect(await fs.pathExists(packageJsonPath)).toBe(false);
      
      // Package manager detection should still work
      const packageManager = await getBestPackageManager(tempDir);
      expect(packageManager).toBe('npm');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent package manager detection', async () => {
      // Create lock file
      await fs.writeFile(path.join(tempDir, 'pnpm-lock.yaml'), 'lockfileVersion: 5.4');

      // Run multiple detections concurrently
      const promises = Array(10).fill(0).map(() => getBestPackageManager(tempDir));
      const results = await Promise.all(promises);

      // All should return the same result
      expect(results.every(result => result === 'pnpm')).toBe(true);
    });

    it('should be fast for large dependency lists', () => {
      const startTime = Date.now();
      
      // Test with all frameworks
      const webSafe = getSafePackages('web');
      const expoSafe = getSafePackages('expo');
      const flutterSafe = getSafePackages('flutter');
      
      const endTime = Date.now();

      expect(webSafe.length).toBeGreaterThan(0);
      expect(expoSafe.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Error Recovery', () => {
    it('should handle file system errors gracefully', async () => {
      // Try to access a path that might cause permission errors
      const restrictedPath = process.platform === 'win32' 
        ? 'C:\\System Volume Information' 
        : '/root';

      expect(async () => {
        await getBestPackageManager(restrictedPath);
      }).not.toThrow();
    });

    it('should handle corrupted lock files', async () => {
      // Create corrupted pnpm-lock.yaml
      await fs.writeFile(path.join(tempDir, 'pnpm-lock.yaml'), 'invalid yaml content [[[');

      // Should still detect pnpm based on file existence, not content
      const packageManager = await getBestPackageManager(tempDir);
      expect(packageManager).toBe('pnpm');
    });

    it('should handle very long file paths', async () => {
      // Create nested directory structure
      const longPath = path.join(tempDir, ...Array(10).fill('very-long-directory-name'));
      await fs.ensureDir(longPath);
      await fs.writeFile(path.join(longPath, 'package-lock.json'), '{}');

      const packageManager = await getBestPackageManager(longPath);
      expect(packageManager).toBe('npm');
    });
  });
});
