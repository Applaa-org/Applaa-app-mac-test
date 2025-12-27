import React, { useEffect, useRef, useState } from 'react';

interface ArcadeEditorProps {
    appId: string;
    initialProject?: any;
    onProjectChange?: (project: any) => void;
}

export function ArcadeEditor({ appId, initialProject, onProjectChange }: ArcadeEditorProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);

    // Prepare a valid MakeCode Arcade project structure (Blocks project)
    const initProjectData = initialProject || {
        header: {
            id: `applaa-${Date.now()}`,
            target: 'arcade',
            name: 'My Arcade Game',
            editor: 'blocksprj', // Use Blocks editor by default
            pubId: '',
            pubCurrent: false,
            recentUse: Date.now(),
            modificationTime: Date.now()
        },
        text: {
            'main.blocks': `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="pxt-on-start" x="20" y="20">
    <statement name="HANDLER">
      <block type="game_splash">
        <value name="text">
          <shadow type="text">
            <field name="TEXT">Welcome to Applaa!</field>
          </shadow>
        </value>
      </block>
    </statement>
  </block>
</xml>`,
            // Minimal main.ts that matches the blocks
            'main.ts': `
// Auto-generated from blocks
game.splash("Welcome to Applaa!")
`,
            'pxt.json': JSON.stringify({
                name: 'My Arcade Game',
                dependencies: {
                    device: '*'
                },
                files: [
                    'main.blocks',
                    'main.ts',
                    'README.md'
                ]
            }, null, 2),
            'README.md': '# My Arcade Game\n\nCreated with Applaa!'
        }
    };

    const initializeEditor = () => {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow) {
            console.log('Sending importproject message...', initProjectData);
            iframe.contentWindow.postMessage({
                type: 'pxteditor',
                action: 'importproject',
                project: initProjectData,
                response: true
            }, '*');
            setIsReady(true);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Listen for messages from MakeCode
        const handleMessage = (event: MessageEvent) => {
            const data = event.data;
            // Debug logging
            if (typeof data === 'object' && data.type) {
                // console.log('Received Message:', data.type, data.action || '');
            }

            if (data.type === 'pxteditor') {
                if (data.action === 'ready') {
                    console.log('MakeCode editor is ready! Initializing...');
                    initializeEditor();
                }

                // Handle project changes
                if (data.action === 'workspacesave' && data.project) {
                    console.log('Project saved:', data.project);
                    onProjectChange?.(data.project);
                }
            }
        };

        window.addEventListener('message', handleMessage);

        // Fallback: If 'ready' never comes (sometimes missed if iframe loads fast), try forcing init after 3s
        const fallbackTimer = setTimeout(() => {
            if (isLoading) {
                console.log('Fallback: Force initializing editor...');
                initializeEditor();
            }
        }, 5000); // 5 seconds fallback

        return () => {
            window.removeEventListener('message', handleMessage);
            clearTimeout(fallbackTimer);
        };
    }, [isLoading, onProjectChange]);

    const handleIframeLoad = () => {
        console.log('Iframe loaded');
    };

    return (
        <div className="relative w-full h-full bg-white">
            {/* Loading Indicator */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading Arcade Editor...</p>
                        <p className="text-xs text-gray-400 mt-2">Initializing MakeCode...</p>
                        <button
                            onClick={initializeEditor}
                            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                        >
                            Force Initialize
                        </button>
                    </div>
                </div>
            )}

            {/* MakeCode Arcade Editor */}
            <iframe
                ref={iframeRef}
                src={`https://arcade.makecode.com/?controller=1&rpc=1&t=${Date.now()}`}
                className="w-full h-full border-0"
                allow="usb; serial; hid; bluetooth"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
                onLoad={handleIframeLoad}
                title="MakeCode Arcade Editor"
            />
        </div>
    );
}
