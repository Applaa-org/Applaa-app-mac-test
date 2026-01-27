
// Need to look up run-time env vars this way
// otherwise it doesn't work as expected in MacOs apps:
// https://github.com/sindresorhus/shell-env

let _env: Record<string, string> | null = null;

export function getEnvVar(key: string) {
  // Only use shell-env in main process (Node.js environment)
  // In renderer process, return undefined to prevent import errors
  if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
    return undefined;
  }

  // Cache it
  if (!_env) {
    // Dynamic import to prevent bundling in renderer
    try {
      const { shellEnvSync } = require("shell-env");
      _env = shellEnvSync();
    } catch (e) {
      console.warn('shell-env not available, using process.env fallback');
      _env = process.env as Record<string, string>;
    }
  }
  return _env[key];
}
