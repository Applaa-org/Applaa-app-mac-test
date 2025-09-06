/**
 * 🧪 PREVIEW SYSTEM TEST SETUP
 * 
 * Global setup and configuration for preview system tests
 * Provides mocks, utilities, and test environment configuration
 */

import '@testing-library/jest-dom';

// Mock Electron APIs
const mockIpcRenderer = {
  invoke: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn()
};

const mockIpcMain = {
  handle: jest.fn(),
  removeHandler: jest.fn()
};

// Global Electron mock
(global as any).window = {
  ...global.window,
  electronAPI: {
    ipcRenderer: mockIpcRenderer
  }
};

// Mock Electron modules
jest.mock('electron', () => ({
  ipcMain: mockIpcMain,
  ipcRenderer: mockIpcRenderer,
  app: {
    getPath: jest.fn().mockReturnValue('/mock/path'),
    getName: jest.fn().mockReturnValue('Applaa'),
    getVersion: jest.fn().mockReturnValue('1.0.0')
  },
  BrowserWindow: jest.fn(),
  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
    showMessageBox: jest.fn()
  }
}));

// Mock Node.js modules
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    rm: jest.fn()
  }
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn((path) => path.split('/').pop()),
  extname: jest.fn((path) => {
    const parts = path.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  })
}));

jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn(),
  execSync: jest.fn()
}));

// Mock database
jest.mock('../../db', () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([])
        })
      })
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue([])
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([])
      })
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([])
    })
  }
}));

// Mock schema
jest.mock('../../db/schema', () => ({
  apps: {
    id: 'id',
    name: 'name',
    path: 'path',
    displayName: 'displayName'
  }
}));

// Mock paths
jest.mock('../../paths/paths', () => ({
  getDyadAppPath: jest.fn().mockReturnValue('/mock/app/path'),
  getApplaaPath: jest.fn().mockReturnValue('/mock/applaa/path')
}));

// Mock logger
jest.mock('electron-log', () => ({
  scope: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Mock performance
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn().mockReturnValue(Date.now())
  }
});

// Mock crypto for hash generation
Object.defineProperty(global, 'crypto', {
  value: {
    createHash: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mock-hash')
    })
  }
});

// Test utilities
export const createMockChildProcess = () => {
  const EventEmitter = require('events');
  
  class MockChildProcess extends EventEmitter {
    stdout = new EventEmitter();
    stderr = new EventEmitter();
    stdin = new EventEmitter();
    killed = false;
    
    kill() {
      this.killed = true;
      this.emit('exit', 0, 'SIGTERM');
    }
  }
  
  return new MockChildProcess();
};

export const createMockPreviewState = (overrides = {}) => ({
  appId: 1,
  phase: 'preparing',
  progress: 50,
  userMessage: 'Test message',
  motivationalMessage: 'Test motivation',
  dependenciesReady: false,
  metroCacheWarmed: false,
  expoServerReady: false,
  startTime: Date.now(),
  ...overrides
});

export const createMockAppData = (overrides = {}) => ({
  id: 1,
  name: 'test-app',
  displayName: 'Test App',
  path: '/test/app/path',
  createdAt: new Date(),
  ...overrides
});

// Global test configuration
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset mock implementations
  mockIpcRenderer.invoke.mockResolvedValue({ success: true });
  
  // Clear timers
  jest.clearAllTimers();
});

afterEach(() => {
  // Clean up any remaining timers
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Suppress console warnings in tests unless explicitly needed
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Export mocks for use in tests
export {
  mockIpcRenderer,
  mockIpcMain
};
