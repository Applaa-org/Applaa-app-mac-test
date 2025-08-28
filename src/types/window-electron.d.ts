export {};

declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        invoke: (channel: string, ...args: unknown[]) => Promise<any>;
        on: (channel: string, listener: (...args: unknown[]) => void) => () => void;
        removeAllListeners: (channel: string) => void;
        removeListener: (channel: string, listener: (...args: unknown[]) => void) => void;
      };
    };
  }
}
