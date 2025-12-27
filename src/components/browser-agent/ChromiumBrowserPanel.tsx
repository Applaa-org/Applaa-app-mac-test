import { useState, useEffect, useRef } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { ChromeTabs, Tab } from './ChromeTabs';
import { AddressBar } from './AddressBar';
import { BrowserControls } from './BrowserControls';
import { BuddyChat } from './BuddyChat';

export function ChromiumBrowserPanel() {
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [currentUrl, setCurrentUrl] = useState('about:blank');
    const [isLoading, setIsLoading] = useState(false);
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const browserContainerRef = useRef<HTMLDivElement>(null);
    const hasInitialized = useRef(false); // Guard against double initialization

    // Initialize Chromium and BrowserView on mount
    useEffect(() => {
        // Prevent double initialization in React Strict Mode
        if (hasInitialized.current) {
            console.log('[Chromium] Already initialized, skipping...');
            return;
        }
        hasInitialized.current = true;

        const initChromium = async () => {
            try {
                console.log('[Chromium] Launching browser...');
                const result = await window.electron.ipcRenderer.invoke('chromium:launch');

                if (result.success) {
                    console.log('[Chromium] ✅ Browser launched successfully');

                    // Initialize BrowserView for display
                    await window.electron.ipcRenderer.invoke('chromium:init-view');

                    // Check for existing tabs first
                    const tabsResult = await window.electron.ipcRenderer.invoke('chromium:get-all-tabs');
                    if (tabsResult.success && tabsResult.tabs.length > 0) {
                        setTabs(tabsResult.tabs);
                        setActiveTabId(tabsResult.activeTabId);

                        // Sync bounds
                        syncBounds();
                    } else {
                        // Create initial tab only if none exist
                        await handleNewTab('https://app.applaa.com');
                    }
                } else {
                    console.error('[Chromium] ❌ Failed to launch:', result.error);
                }
            } catch (error) {
                console.error('[Chromium] ❌ Error launching:', error);
            }
        };

        initChromium();

        // Listen for automation requests to create new tab
        const removeAutomationListener = window.electron.ipcRenderer.on('automation:create-tab', async (_event, url) => {
            const targetUrl = typeof url === 'string' ? url : 'about:blank';
            console.log(`[Chromium] Automation requested new tab: ${targetUrl}`);
            await handleNewTab(targetUrl);
        });

        // Set up resize observer for bounds syncing
        const resizeObserver = new ResizeObserver(() => {
            syncBounds();
        });

        if (browserContainerRef.current) {
            resizeObserver.observe(browserContainerRef.current);
        }

        // Cleanup on unmount
        return () => {
            removeAutomationListener();
            resizeObserver.disconnect();

            // Hide the browser view when leaving the panel
            window.electron.ipcRenderer.invoke('chromium:hide-view');
            console.log('[Chromium] Component unmounting, hidden view');
        };
    }, []);

    // Sync BrowserView bounds with container
    const syncBounds = () => {
        if (!browserContainerRef.current) return;

        const rect = browserContainerRef.current.getBoundingClientRect();
        console.log(`[Chromium] Sync bounds: ${rect.width}x${rect.height} at (${rect.x}, ${rect.y})`);

        window.electron.ipcRenderer.invoke('chromium:set-bounds', {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        });
    };

    // Refresh tabs list
    const refreshTabs = async () => {
        try {
            const result = await window.electron.ipcRenderer.invoke('chromium:get-all-tabs');
            if (result.success) {
                setTabs(result.tabs);
                setActiveTabId(result.activeTabId);

                // Update current tab info
                if (result.activeTabId) {
                    const activeTab = result.tabs.find((t: Tab) => t.id === result.activeTabId);
                    if (activeTab) {
                        setCurrentUrl(activeTab.url);
                    }
                }
            }
        } catch (error) {
            console.error('[Chromium] Error refreshing tabs:', error);
        }
    };

    // Create new tab
    const handleNewTab = async (url?: string) => {
        try {
            const result = await window.electron.ipcRenderer.invoke('chromium:create-tab', { url });
            if (result.success) {
                await refreshTabs();
                syncBounds(); // Ensure BrowserView is visible
            }
        } catch (error) {
            console.error('[Chromium] Error creating tab:', error);
        }
    };

    // Close tab
    const handleCloseTab = async (tabId: string) => {
        try {
            await window.electron.ipcRenderer.invoke('chromium:close-tab', { tabId });
            await refreshTabs();
        } catch (error) {
            console.error('[Chromium] Error closing tab:', error);
        }
    };

    // Switch tab
    const handleSwitchTab = async (tabId: string) => {
        try {
            await window.electron.ipcRenderer.invoke('chromium:switch-tab', { tabId });
            setActiveTabId(tabId);
            await refreshTabs();
            syncBounds();
        } catch (error) {
            console.error('[Chromium] Error switching tab:', error);
        }
    };

    // Navigate
    const handleNavigate = async (url: string) => {
        if (!activeTabId) return;

        try {
            setIsLoading(true);
            const result = await window.electron.ipcRenderer.invoke('chromium:navigate', {
                tabId: activeTabId,
                url
            });

            if (result.success) {
                setCurrentUrl(result.tab.url);
                await refreshTabs();
            }
        } catch (error) {
            console.error('[Chromium] Error navigating:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Go back
    const handleGoBack = async () => {
        if (!activeTabId) return;

        try {
            await window.electron.ipcRenderer.invoke('chromium:go-back', { tabId: activeTabId });
            await refreshTabs();
        } catch (error) {
            console.error('[Chromium] Error going back:', error);
        }
    };

    // Go forward
    const handleGoForward = async () => {
        if (!activeTabId) return;

        try {
            await window.electron.ipcRenderer.invoke('chromium:go-forward', { tabId: activeTabId });
            await refreshTabs();
        } catch (error) {
            console.error('[Chromium] Error going forward:', error);
        }
    };

    // Reload
    const handleReload = async () => {
        if (!activeTabId) return;

        try {
            setIsLoading(true);
            await window.electron.ipcRenderer.invoke('chromium:reload', { tabId: activeTabId });
            await refreshTabs();
        } catch (error) {
            console.error('[Chromium] Error reloading:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Home
    const handleHome = () => {
        handleNavigate('https://www.google.com');
    };

    return (
        <div className="flex flex-col h-full w-full min-w-0 bg-[#202124]">
            {/* Tab Bar */}
            <ChromeTabs
                tabs={tabs}
                activeTabId={activeTabId}
                onTabClick={handleSwitchTab}
                onTabClose={handleCloseTab}
                onNewTab={handleNewTab}
            />

            {/* Controls and Address Bar */}
            <div className="flex items-center gap-2 bg-[#202124] border-b border-gray-700">
                <BrowserControls
                    canGoBack={canGoBack}
                    canGoForward={canGoForward}
                    onGoBack={handleGoBack}
                    onGoForward={handleGoForward}
                    onReload={handleReload}
                    onHome={handleHome}
                />

                <div className="flex-1">
                    <AddressBar
                        url={currentUrl}
                        isLoading={isLoading}
                        onNavigate={handleNavigate}
                        onRefresh={handleReload}
                    />
                </div>
            </div>

            {/* Browser and Chat Layout - 70/30 split */}
            <div className="flex-1 min-h-0">
                <PanelGroup direction="horizontal">
                    {/* Browser Panel - 70% */}
                    <Panel defaultSize={70} minSize={50}>
                        <div
                            ref={browserContainerRef}
                            className="h-full bg-white relative"
                        >
                            {/* BrowserView from Electron will be positioned here */}
                            {tabs.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
                                    <div className="text-center">
                                        <h2 className="text-2xl font-semibold mb-2">Welcome to Applaa Browser</h2>
                                        <p className="text-sm">Powered by Chromium</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Panel>

                    {/* Resize Handle */}
                    <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-blue-500 transition-colors" />

                    {/* Chat Panel - 30% */}
                    <Panel defaultSize={30} minSize={20}>
                        <div className="h-full bg-[#1a1b1e]">
                            <BuddyChat />
                        </div>
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
}
