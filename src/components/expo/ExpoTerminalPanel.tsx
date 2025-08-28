import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { IpcClient } from '@/ipc/ipc_client';
import { RefreshCw, Terminal } from 'lucide-react';

export function ExpoTerminalPanel() {
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [webUrl, setWebUrl] = useState<string>('');
  const [qr, setQr] = useState<string>('');
  const termRef = useRef<HTMLDivElement>(null);

  const poll = async () => {
    try {
      const status = await IpcClient.getInstance().simpleExpoStatus();
      setIsRunning(!!status.isRunning);
      setOutput(status.terminalOutput || '');
      
      // Prefer tunnel URL, then web, then LAN for display
      const bestWebUrl = status.tunnelUrl || status.webUrl || status.lanUrl || '';
      if (bestWebUrl) setWebUrl(bestWebUrl);
      
      const bestQrUrl = status.tunnelUrl || status.qrUrl || status.lanUrl || '';
      if (bestQrUrl) setQr(bestQrUrl);
    } catch (error) {
      // Silent fail to avoid console spam
    }
  };

  useEffect(() => {
    const id = setInterval(poll, 1500);
    poll();
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [output]);

  const press = async (key: string) => {
    await IpcClient.getInstance().simpleExpoInput(key);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          <span className="text-sm font-medium">Expo CLI</span>
          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500' : 'bg-gray-400'}`} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => press('w\n')} disabled={!isRunning}>w — web</Button>
          <Button size="sm" variant="outline" onClick={() => press('r\n')} disabled={!isRunning}>r — reload</Button>
          <Button size="sm" variant="ghost" onClick={poll}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t">
        <div className="md:col-span-2">
          <div ref={termRef} className="h-56 overflow-y-auto bg-black text-green-400 font-mono text-xs p-4" style={{
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, source-code-pro, monospace',
            lineHeight: '1.4'
          }}>
            {output ? <pre className="whitespace-pre-wrap">{output}</pre> : (
              <div className="text-gray-500">Waiting for Expo output...</div>
            )}
          </div>
        </div>
        <div className="md:border-l p-3 flex flex-col gap-2">
          <div className="text-sm font-medium">Quick Links</div>
          <div className="text-xs text-muted-foreground break-all">Web: {webUrl || '—'}</div>
          <div className="text-xs text-muted-foreground break-all">QR: {qr || '—'}</div>
        </div>
      </div>
    </div>
  );
}
