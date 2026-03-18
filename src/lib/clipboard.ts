/**
 * Robust clipboard utility for Electron + browser environments.
 * Tries navigator.clipboard first, falls back to execCommand('copy'),
 * then falls back to window.electron IPC if available.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1. Try modern Clipboard API
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to next method
    }
  }

  // 2. Fallback: execCommand (older but works in Electron renderer)
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // Make it invisible and off-screen
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textArea);
    if (success) return true;
  } catch {
    // Fall through to next method
  }

  // 3. Fallback: Electron IPC clipboard write if exposed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  if (win.electron?.clipboard?.writeText) {
    try {
      win.electron.clipboard.writeText(text);
      return true;
    } catch {
      // All methods failed
    }
  }

  return false;
}
