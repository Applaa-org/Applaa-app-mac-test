/**
 * Tests for Flutter environment IPC handlers
 */

import { vi, describe, test, expect, beforeEach } from 'vitest';
import {
  executeFlutterDoctor,
  checkFlutterSDK,
  getFlutterVersion,
  installFlutterSDK
} from '../flutter_environment_handlers';

// Mock the shell command utility
vi.mock('@/ipc/utils/runShellCommand', () => ({
  execAsync: vi.fn()
}));

const { execAsync } = await import('@/ipc/utils/runShellCommand');
const mockExecAsync = vi.mocked(execAsync);

describe('Flutter Environment Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeFlutterDoctor', () => {
    test('should parse doctor output correctly for successful installation', async () => {
      const mockOutput = `
Doctor summary (to see all details, run flutter doctor -v):
[✓] Flutter (Channel stable, 3.16.0, on macOS 14.0 22A380)
[✓] Android toolchain - develop for Android devices (Android SDK version 34.0.0)
[✓] Xcode - develop for iOS and macOS (Xcode 15.0)
[✓] Chrome - develop for the web
[✓] Android Studio (version 2023.1)
[✓] VS Code (version 1.84.0)
[✓] Connected device (2 available)
[✓] Network resources

• No issues found!
      `;

      mockExecAsync.mockResolvedValue({ stdout: mockOutput, stderr: '' });

      const result = await executeFlutterDoctor();

      expect(result.sdkInstalled).toBe(true);
      expect(result.sdkVersion).toBe('3.16.0');
      expect(result.channel).toBe('stable');
      expect(result.androidToolchain.installed).toBe(true);
      expect(result.iosToolchain.installed).toBe(true);
      expect(result.webSupport).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.ideSupport).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Android Studio', installed: true }),
          expect.objectContaining({ name: 'VS Code', installed: true })
        ])
      );
    });

    test('should parse doctor output with issues', async () => {
      const mockOutput = `
Doctor summary (to see all details, run flutter doctor -v):
[✓] Flutter (Channel stable, 3.16.0, on Windows 10)
[✗] Android toolchain - develop for Android devices
    ✗ Unable to locate Android SDK.
      Install Android Studio from: https://developer.android.com/studio/index.html
[!] Chrome - develop for the web (Cannot find Chrome executable)
[✓] VS Code (version 1.84.0)

! Doctor found issues in 2 categories.
      `;

      mockExecAsync.mockResolvedValue({ stdout: mockOutput, stderr: '' });

      const result = await executeFlutterDoctor();

      expect(result.sdkInstalled).toBe(true);
      expect(result.androidToolchain.installed).toBe(false);
      expect(result.webSupport).toBe(false);
      expect(result.issues).toHaveLength(2);
      
      const androidIssue = result.issues.find(i => i.category === 'Android toolchain');
      expect(androidIssue).toBeDefined();
      expect(androidIssue!.type).toBe('error');
      expect(androidIssue!.message).toContain('Unable to locate Android SDK');
      expect(androidIssue!.suggestion).toContain('Install Android Studio');

      const chromeIssue = result.issues.find(i => i.category === 'Chrome');
      expect(chromeIssue).toBeDefined();
      expect(chromeIssue!.type).toBe('warning');
    });

    test('should handle Flutter command not found', async () => {
      mockExecAsync.mockRejectedValue(new Error('flutter: command not found'));

      const result = await executeFlutterDoctor();

      expect(result.sdkInstalled).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('error');
      expect(result.issues[0].message).toContain('Flutter SDK not found');
      expect(result.issues[0].suggestion).toContain('Install Flutter SDK');
    });

    test('should handle permission errors', async () => {
      mockExecAsync.mockRejectedValue(new Error('Permission denied'));

      const result = await executeFlutterDoctor();

      expect(result.sdkInstalled).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('error');
      expect(result.issues[0].message).toContain('Permission denied');
    });

    test('should parse iOS toolchain correctly on macOS', async () => {
      const mockOutput = `
Doctor summary (to see all details, run flutter doctor -v):
[✓] Flutter (Channel stable, 3.16.0, on macOS 14.0)
[✓] Android toolchain - develop for Android devices (Android SDK version 34.0.0)
[✓] Xcode - develop for iOS and macOS (Xcode 15.0)
      `;

      mockExecAsync.mockResolvedValue({ stdout: mockOutput, stderr: '' });

      const result = await executeFlutterDoctor();

      expect(result.iosToolchain.installed).toBe(true);
      expect(result.iosToolchain.version).toBe('15.0');
    });

    test('should handle missing iOS toolchain on Windows', async () => {
      const mockOutput = `
Doctor summary (to see all details, run flutter doctor -v):
[✓] Flutter (Channel stable, 3.16.0, on Windows 10)
[✓] Android toolchain - develop for Android devices (Android SDK version 34.0.0)
      `;

      mockExecAsync.mockResolvedValue({ stdout: mockOutput, stderr: '' });

      const result = await executeFlutterDoctor();

      expect(result.iosToolchain.installed).toBe(false);
    });
  });

  describe('checkFlutterSDK', () => {
    test('should detect Flutter version correctly', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'Flutter 3.16.0 • channel stable • https://github.com/flutter/flutter.git',
        stderr: ''
      });

      const result = await checkFlutterSDK();

      expect(result.installed).toBe(true);
      expect(result.version).toBe('3.16.0');
      expect(result.channel).toBe('stable');
    });

    test('should handle missing Flutter SDK', async () => {
      mockExecAsync.mockRejectedValue(new Error('command not found'));

      const result = await checkFlutterSDK();

      expect(result.installed).toBe(false);
      expect(result.version).toBeUndefined();
      expect(result.channel).toBeUndefined();
    });

    test('should handle malformed version output', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'Invalid output format',
        stderr: ''
      });

      const result = await checkFlutterSDK();

      expect(result.installed).toBe(false);
      expect(result.version).toBeUndefined();
    });
  });

  describe('getFlutterVersion', () => {
    test('should return detailed version information', async () => {
      const mockOutput = `
Flutter 3.16.0 • channel stable • https://github.com/flutter/flutter.git
Framework • revision db7ef5bf9f (2 weeks ago) • 2023-11-15 11:25:44 -0800
Engine • revision 74d16627b9
Tools • Dart 3.2.0 (build 3.2.0-194.0.dev) • DevTools 2.28.2
      `;

      mockExecAsync.mockResolvedValue({ stdout: mockOutput, stderr: '' });

      const result = await getFlutterVersion();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.flutter).toBe('3.16.0');
      expect(result.data!.channel).toBe('stable');
      expect(result.data!.dart).toBe('3.2.0');
      expect(result.data!.framework).toContain('db7ef5bf9f');
      expect(result.data!.engine).toBe('74d16627b9');
    });

    test('should handle version command failure', async () => {
      mockExecAsync.mockRejectedValue(new Error('Command failed'));

      const result = await getFlutterVersion();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('SDK_NOT_FOUND');
    });
  });

  describe('installFlutterSDK', () => {
    test('should provide installation guidance for Windows', async () => {
      // Mock process.platform
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const result = await installFlutterSDK();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.platform).toBe('windows');
      expect(result.data!.downloadUrl).toContain('windows');
      expect(result.data!.instructions).toContain('Download Flutter SDK for Windows');
      expect(result.data!.requirements).toContain('Git for Windows');

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should provide installation guidance for macOS', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      const result = await installFlutterSDK();

      expect(result.success).toBe(true);
      expect(result.data!.platform).toBe('macos');
      expect(result.data!.downloadUrl).toContain('macos');
      expect(result.data!.instructions).toContain('Download Flutter SDK for macOS');
      expect(result.data!.requirements).toContain('Xcode (for iOS development)');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should provide installation guidance for Linux', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      const result = await installFlutterSDK();

      expect(result.success).toBe(true);
      expect(result.data!.platform).toBe('linux');
      expect(result.data!.downloadUrl).toContain('linux');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should handle unsupported platform', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'freebsd' });

      const result = await installFlutterSDK();

      expect(result.success).toBe(false);
      expect(result.error!.type).toBe('PLATFORM_NOT_SUPPORTED');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('Error handling', () => {
    test('should handle network timeouts gracefully', async () => {
      mockExecAsync.mockRejectedValue(new Error('timeout'));

      const result = await executeFlutterDoctor();

      expect(result.sdkInstalled).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('error');
    });

    test('should handle partial doctor output', async () => {
      const partialOutput = `
Doctor summary (to see all details, run flutter doctor -v):
[✓] Flutter (Channel stable, 3.16.0, on macOS 14.0)
      `;

      mockExecAsync.mockResolvedValue({ stdout: partialOutput, stderr: '' });

      const result = await executeFlutterDoctor();

      expect(result.sdkInstalled).toBe(true);
      expect(result.androidToolchain.installed).toBe(false);
      expect(result.iosToolchain.installed).toBe(false);
    });

    test('should handle stderr warnings', async () => {
      const mockOutput = `
Doctor summary (to see all details, run flutter doctor -v):
[✓] Flutter (Channel stable, 3.16.0, on macOS 14.0)
      `;

      mockExecAsync.mockResolvedValue({ 
        stdout: mockOutput, 
        stderr: 'Warning: Some packages have newer versions available' 
      });

      const result = await executeFlutterDoctor();

      expect(result.sdkInstalled).toBe(true);
      // Stderr warnings should not affect the main result
    });
  });

  describe('Performance', () => {
    test('should complete doctor check within reasonable time', async () => {
      const mockOutput = `
Doctor summary:
[✓] Flutter (Channel stable, 3.16.0)
      `;

      mockExecAsync.mockResolvedValue({ stdout: mockOutput, stderr: '' });

      const startTime = Date.now();
      await executeFlutterDoctor();
      const duration = Date.now() - startTime;

      // Should complete quickly (mocked, but structure should be efficient)
      expect(duration).toBeLessThan(100);
    });
  });
});
