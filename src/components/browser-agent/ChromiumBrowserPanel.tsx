import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Applaa Buddy - Simple Launch Page
 * Opens full Chromium browser with Applaa Buddy extension
 */
export function ChromiumBrowserPanel() {
        const handleLaunch = async () => {
                try {
                        console.log('[Buddy] Launching full Chromium browser...');
                        const result = await window.electron.ipcRenderer.invoke('buddy:launch');

                        if (result.success) {
                                console.log('[Buddy] ✅ Browser launched with extension!');
                        } else {
                                console.error('[Buddy] ❌ Failed:', result.error);
                                alert(`Failed to launch Buddy browser: ${result.error}`);
                        }
                } catch (error: any) {
                        console.error('[Buddy] Error:', error);
                        alert(`Error: ${error.message}`);
                }
        };

        return (
                <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                        <div className="max-w-2xl mx-auto px-6 text-center space-y-8">
                                {/* Header */}
                                <div className="space-y-4">
                                        <div className="flex justify-center">
                                                <div className="p-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-2xl">
                                                        <Bot className="h-16 w-16 text-white" />
                                                </div>
                                        </div>

                                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                                Applaa Buddy Browser
                                        </h1>

                                        <p className="text-xl text-gray-600 dark:text-gray-300">
                                                Full Chromium browser with AI assistant
                                        </p>
                                </div>

                                {/* Features */}
                                <div className="grid grid-cols-3 gap-4 my-8">
                                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                                                <h3 className="font-semibold text-gray-900 dark:text-white">✅ Tabs</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">Multiple tabs support</p>
                                        </div>

                                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                                                <h3 className="font-semibold text-gray-900 dark:text-white">🔖 Bookmarks</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">Save your favorites</p>
                                        </div>

                                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                                                <h3 className="font-semibold text-gray-900 dark:text-white">🤖 AI Assistant</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">Applaa Buddy extension</p>
                                        </div>
                                </div>

                                {/* Launch Button */}
                                <div className="space-y-4">
                                        <Button
                                                onClick={handleLaunch}
                                                size="lg"
                                                className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-lg px-8 py-6"
                                        >
                                                <Bot className="h-6 w-6" />
                                                Launch Buddy Browser
                                        </Button>

                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Opens a new Chromium window with full browser features
                                        </p>
                                </div>

                                {/* Instructions */}
                                <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md text-left">
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Features:</h3>
                                        <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                                <li>Full Chromium browser with native UI</li>
                                                <li>Multiple tabs, bookmarks, and extensions</li>
                                                <li>Applaa Buddy AI assistant (press Ctrl+Shift+U)</li>
                                                <li>All standard browser features</li>
                                        </ul>
                                </div>
                        </div>
                </div>
        );
}
