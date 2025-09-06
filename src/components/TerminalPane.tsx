import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";

declare global {
  interface Window {
    applaaTerminal: {
      create: (opts?: { cwd?: string }) => Promise<{ id: string }>;
      write: (payload: { id: string; data: string }) => void;
      resize: (payload: { id: string; cols: number; rows: number }) => void;
      kill: (payload: { id: string }) => void;
      onData: (cb: (e: { id: string; data: string }) => void) => void;
      onExit: (cb: (e: { id: string; code?: number }) => void) => void;
      onError: (cb: (e: { id: string; error: string }) => void) => void;
    };
  }
}

interface TerminalPaneProps {
  cwd?: string;
  autoStartGemini?: boolean;
  autoCreate?: boolean;
  onTerminalCreated?: () => void;
  className?: string;
}

export default function TerminalPane({ 
  cwd, 
  autoStartGemini = false,
  autoCreate = false,
  onTerminalCreated,
  className = ""
}: TerminalPaneProps) {
  const [terminalId, setTerminalId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [commandSent, setCommandSent] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal>();
  const fitRef = useRef<FitAddon>();

  // Initialize terminal UI
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
      fontSize: 14,
      theme: {
        background: "#1a1a1a",
        foreground: "#ffffff",
        cursor: "#ffffff",
        selection: "#3e3e3e",
        black: "#000000",
        red: "#ff6b6b",
        green: "#51cf66",
        yellow: "#ffd43b",
        blue: "#74c0fc",
        magenta: "#f06292",
        cyan: "#4dd0e1",
        white: "#ffffff",
        brightBlack: "#666666",
        brightRed: "#ff8a80",
        brightGreen: "#69f0ae",
        brightYellow: "#ffff8d",
        brightBlue: "#82b1ff",
        brightMagenta: "#ff80ab",
        brightCyan: "#84ffff",
        brightWhite: "#ffffff"
      },
      convertEol: true,
    });

    const fit = new FitAddon();
    const webLinks = new WebLinksAddon();
    const search = new SearchAddon();

    term.loadAddon(fit);
    term.loadAddon(webLinks);
    term.loadAddon(search);

    term.open(containerRef.current);
    fit.fit();

    // Handle user input
    term.onData((data) => {
      if (terminalId) {
        window.applaaTerminal.write({ id: terminalId, data });
      }
    });

    // Handle window resize
    const handleResize = () => {
      fit.fit();
      if (terminalId) {
        window.applaaTerminal.resize({
          id: terminalId,
          cols: term.cols,
          rows: term.rows,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    termRef.current = term;
    fitRef.current = fit;

    return () => {
      window.removeEventListener("resize", handleResize);
      term.dispose();
    };
  }, [terminalId]);

  // Handle terminal data events
  useEffect(() => {
    const handleData = ({ id, data }: { id: string; data: string }) => {
      if (id === terminalId && termRef.current) {
        termRef.current.write(data);
        
        // Debug: Log all terminal data to help with prompt detection
        if (autoStartGemini && !commandSent) {
          console.log("Terminal data received:", JSON.stringify(data));
        }
        
        // Auto-execute command when we see the prompt and haven't sent command yet
        if (autoStartGemini && !commandSent) {
          // More robust prompt detection for Windows cmd.exe
          const hasPrompt = data.includes('>') || 
                           data.includes('$') || 
                           data.includes('C:\\') ||
                           data.includes('Microsoft Windows') ||
                           data.includes('(c) Microsoft Corporation') ||
                           data.match(/[A-Z]:\\.+>/);
          
          if (hasPrompt) {
            console.log("Terminal prompt detected, auto-executing bundled Gemini CLI");
            console.log("Detected in data:", data);
            setCommandSent(true);
                      setTimeout(async () => {
            // Use the external GitHub CLI that works with Node.js v22
            const command = "npx https://github.com/google-gemini/gemini-cli\r";
            console.log("Sending command:", JSON.stringify(command));
            try {
              await window.applaaTerminal.write({ 
                id, 
                data: command
              });
              console.log("Command sent successfully to terminal");
            } catch (error) {
              console.error("Failed to send command to terminal:", error);
            }
          }, 500);
          }
        }
      }
    };

    const handleExit = ({ id, code }: { id: string; code?: number }) => {
      if (id === terminalId && termRef.current) {
        termRef.current.write(`\r\n\x1b[31m[Process exited with code ${code ?? 'unknown'}]\x1b[0m\r\n`);
        setTerminalId(null);
      }
    };

    const handleError = ({ id, error }: { id: string; error: string }) => {
      if (id === terminalId && termRef.current) {
        termRef.current.write(`\r\n\x1b[31m[Error: ${error}]\x1b[0m\r\n`);
      }
    };

    window.applaaTerminal.onData(handleData);
    window.applaaTerminal.onExit(handleExit);
    window.applaaTerminal.onError(handleError);

    // Note: No cleanup needed as these are global listeners
  }, [terminalId, autoStartGemini, commandSent]);

  const createTerminal = async () => {
    if (isCreating) return;
    
    setIsCreating(true);
    setCommandSent(false); // Reset command sent state
    try {
      const { id } = await window.applaaTerminal.create({ cwd });
      setTerminalId(id);

      // Auto-start Gemini CLI if requested
      if (autoStartGemini) {
        // Wait for terminal to be fully ready, then send the command
        setTimeout(async () => {
          console.log("Auto-executing bundled Gemini CLI for terminal:", id);
          const command = "npx https://github.com/google-gemini/gemini-cli\r";
          console.log("Primary command:", JSON.stringify(command));
          try {
            await window.applaaTerminal.write({ 
              id, 
              data: command
            });
            console.log("Primary command sent successfully");
          } catch (error) {
            console.error("Primary command failed:", error);
          }
        }, 2000); // Increased timeout to ensure terminal is ready
        
        // Also try sending it again after a bit more time in case the first attempt fails
        setTimeout(async () => {
          console.log("Backup auto-execution attempt for bundled CLI:", id);
          const command = "npx https://github.com/google-gemini/gemini-cli\r";
          console.log("Backup command:", JSON.stringify(command));
          try {
            await window.applaaTerminal.write({ 
              id, 
              data: command
            });
            console.log("Backup command sent successfully");
          } catch (error) {
            console.error("Backup command failed:", error);
          }
        }, 4000);
      }

      // Notify parent that terminal was created
      if (onTerminalCreated) {
        onTerminalCreated();
      }
    } catch (error) {
      console.error("Failed to create terminal:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // Auto-create terminal when requested
  useEffect(() => {
    if (autoCreate && !terminalId && !isCreating) {
      createTerminal();
    }
  }, [autoCreate, terminalId, isCreating]);

  const killTerminal = () => {
    if (terminalId) {
      window.applaaTerminal.kill({ id: terminalId });
      setTerminalId(null);
      setCommandSent(false);
    }
  };

  const executeGeminiCommand = async () => {
    if (terminalId) {
      console.log("Manually executing bundled Gemini CLI");
      const command = "npx https://github.com/google-gemini/gemini-cli\r";
      console.log("Manual command:", JSON.stringify(command));
      try {
        await window.applaaTerminal.write({ 
          id: terminalId, 
          data: command
        });
        console.log("Manual command sent successfully");
        setCommandSent(true);
      } catch (error) {
        console.error("Manual command failed:", error);
      }
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Terminal Controls */}
      <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={createTerminal}
          disabled={isCreating || !!terminalId}
          className="px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
        >
          {isCreating ? "Creating..." : terminalId ? "Terminal Active" : "+ Terminal"}
        </button>
        
        {terminalId && autoStartGemini && !commandSent && (
          <button
            onClick={executeGeminiCommand}
            className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-md font-medium transition-colors"
          >
            Run Gemini CLI
          </button>
        )}
        
        {terminalId && (
          <button
            onClick={killTerminal}
            className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md font-medium transition-colors"
          >
            Close
          </button>
        )}

        <div className="flex-1" />
        
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {terminalId ? `Session: ${terminalId.slice(0, 8)}` : "No active session"}
        </div>
      </div>

      {/* Terminal Display */}
      <div className="flex-1 relative">
        <div
          ref={containerRef}
          className="absolute inset-0 p-2"
          style={{ 
            background: "#1a1a1a",
            fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace"
          }}
        />
        
        {!terminalId && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-lg font-medium mb-2">Terminal</div>
              <div className="text-sm">Click "+ Terminal" to start a new session</div>
              {autoStartGemini && (
                <div className="text-xs mt-2 text-orange-600 dark:text-orange-400">
                  Will auto-start Gemini CLI when created
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
