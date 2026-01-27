import { useState, useRef, useEffect, useCallback } from 'react';
import {
    PanelGroup,
    Panel,
    PanelResizeHandle,
} from "react-resizable-panels";
import {
    Globe,
    ArrowLeft,
    ArrowRight,
    RotateCw,
    Home,
    ShieldCheck,
    Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/ipc/ipc_client';
import { cn } from '@/lib/utils';
import { BuddyChat } from './BuddyChat';
import { TabBar } from './TabBar';
import { BannerAd } from './BannerAd';
import { useBrowserTabs } from './useBrowserTabs';

import { useAtom } from 'jotai';
import {
    browserDisplayUrlAtom,
    browserAddressInputAtom,
    browserIsLoadingAtom,
    browserPageTitleAtom
} from '@/atoms/browserAtoms';
import { NewTabPage } from './NewTabPage';
import { SelectionPanel } from './SelectionPanel';

export function BrowserAgentPanel() {
    const [url, setUrl] = useAtom(browserAddressInputAtom);
    const [displayUrl, setDisplayUrl] = useAtom(browserDisplayUrlAtom);
    const [isLoading, setIsLoading] = useAtom(browserIsLoadingAtom);
    const [pageTitle, setPageTitle] = useAtom(browserPageTitleAtom);

    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [showAds, setShowAds] = useState(true);

    // Annotation mode state
    const [isAnnotationMode, setIsAnnotationMode] = useState(false);
    const [selectedElements, setSelectedElements] = useState<any[]>([]);
    const [annotationInjected, setAnnotationInjected] = useState(false);

    // Automation state
    const [isAutomating, setIsAutomating] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<any>(null);
    const [automationProgress, setAutomationProgress] = useState<string>('');

    const browserContainerRef = useRef<HTMLDivElement>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    // Tab management
    const {
        tabs,
        activeTabId,
        activeTab,
        isLoading: tabsLoading,
        createTab,
        closeTab,
        switchTab,
        updateTab,
    } = useBrowserTabs();

    // Sync browser bounds with the container
    const syncBounds = useCallback(async () => {
        if (!browserContainerRef.current) {
            console.warn('[Applaa Buddy] syncBounds: No container ref');
            return;
        }

        const rect = browserContainerRef.current.getBoundingClientRect();
        console.log('[Applaa Buddy] syncBounds:', {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        });

        await ipcClient.setBrowserBounds({
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        });
    }, []);

    // Update page status from backend
    const updatePageStatus = useCallback(async () => {
        try {
            const info = await ipcClient.getBrowserPageInfo();
            if (info.success) {
                setPageTitle(info.title || 'Applaa Buddy');

                // Only update displayUrl from poller if we're not currently navigating/loading
                // and if the URL is not blank
                if (!isLoading && info.url && info.url !== 'about:blank' && info.url !== 'https://www.google.com/') {
                    setDisplayUrl(info.url);
                }

                setCanGoBack(!!info.canGoBack);
                setCanGoForward(!!info.canGoForward);

                // Update active tab with current page info
                if (activeTabId && info.url && info.url !== 'about:blank') {
                    updateTab(activeTabId, {
                        title: info.title || 'Loading...',
                        url: info.url,
                    });
                }
            }
        } catch (e) {
            // Handle potential connection issues gracefully
        }
    }, [activeTabId, updateTab, isLoading, setPageTitle, setDisplayUrl]);

    useEffect(() => {
        console.log('[Applaa Buddy] Component mounted. Current URL:', displayUrl);

        // Reset loading state on mount to prevent stuck loading from persisted atoms
        setIsLoading(false);

        // Initialize Chromium connection
        const initChromium = async () => {
            try {
                console.log('[Applaa Buddy] Initializing Chromium connection...');
                const result = await window.electron.ipcRenderer.invoke('browser-agent:init');
                if (result.success) {
                    console.log('[Applaa Buddy] ✅ Chromium connected successfully');
                } else {
                    console.error('[Applaa Buddy] ❌ Chromium connection failed:', result.error);
                }
            } catch (error) {
                console.error('[Applaa Buddy] ❌ Error initializing Chromium:', error);
            }
        };

        initChromium();

        return () => {
            console.log('[Applaa Buddy] Component unmounting. State preserved.');
            // Note: We don't destroy Chromium here - it stays running
        };
    }, [setIsLoading]);

    // Polling interval effect
    useEffect(() => {
        const interval = setInterval(updatePageStatus, 2000);
        return () => clearInterval(interval);
    }, [updatePageStatus]);

    // Resize observer effect
    useEffect(() => {
        if (!browserContainerRef.current) return;

        const observer = new ResizeObserver(() => {
            syncBounds();
        });

        observer.observe(browserContainerRef.current);

        return () => observer.disconnect();
    }, [syncBounds]);

    // Hide/show browser view based on displayUrl
    useEffect(() => {
        console.log('[Applaa Buddy] Visibility check:', { tabsLoading, isLoading, displayUrl });

        // If tabs are still loading from DB, don't change visibility yet
        if (tabsLoading) {
            console.log('[Applaa Buddy] Tabs still loading, deferring visibility change');
            return;
        }

        // If we are currently loading a new page, show it
        if (isLoading) {
            console.log('[Applaa Buddy] Loading state active, showing browser');
            ipcClient.showBrowser();
            return;
        }

        if (!displayUrl || displayUrl === 'about:blank' || displayUrl === '') {
            console.log('[Applaa Buddy] No URL, hiding browser to show new tab page');
            // Hide browser view to allow clicks on new tab page
            ipcClient.hideBrowser();
        } else {
            console.log('[Applaa Buddy] URL present, showing browser:', displayUrl);
            // Show browser view when navigating
            ipcClient.showBrowser();
        }
    }, [displayUrl, isLoading, tabsLoading]);

    const handleNavigate = async (targetUrl?: string) => {
        const urlToNavigate = targetUrl || url;
        console.log('[Applaa Buddy] Navigate:', urlToNavigate);
        setIsLoading(true);

        // Safety timeout: reset loading state after 10 seconds if something goes wrong
        const loadingTimeout = setTimeout(() => {
            console.warn('[Applaa Buddy] Navigation timeout - resetting loading state');
            setIsLoading(false);
        }, 10000);

        try {
            // Update displayUrl immediately to hide welcome screen
            setDisplayUrl(urlToNavigate);

            // Sync bounds BEFORE navigation to ensure BrowserView is properly sized
            await syncBounds();
            console.log('[Applaa Buddy] Bounds synced before navigation');

            const result = await ipcClient.navigateBrowser({ url: urlToNavigate });
            console.log('[Applaa Buddy] Navigate result:', result);

            if (result.success) {
                setUrl(result.url || urlToNavigate);
                setDisplayUrl(result.url || urlToNavigate);
                setPageTitle(result.title || 'Loading...');
                await syncBounds();
            } else {
                console.error('[Applaa Buddy] Navigation failed:', result.error);
                // Don't reset displayUrl on error - keep showing browser
            }
        } finally {
            clearTimeout(loadingTimeout);
            setIsLoading(false);
        }
    };

    const handleBack = async () => {
        await ipcClient.goBackBrowser();
        updatePageStatus();
    };

    const handleForward = async () => {
        await ipcClient.goForwardBrowser();
        updatePageStatus();
    };

    const handleReload = async () => {
        setIsLoading(true);
        await ipcClient.reloadBrowser();
        setTimeout(() => setIsLoading(false), 500);
    };

    // Handle tab switching - load the tab's URL
    const handleTabSwitch = async (tabId: string) => {
        switchTab(tabId);

        // Find the tab and navigate to its URL
        const tab = tabs.find(t => t.id === tabId);
        if (tab && tab.url) {
            setUrl(tab.url);
            setDisplayUrl(tab.url);
            if (tab.url !== 'about:blank' && tab.url !== '') {
                await handleNavigate(tab.url);
            }
        }
    };

    // Annotation Mode Handlers
    const handleToggleAnnotation = async () => {
        const newMode = !isAnnotationMode;

        // Inject script on first use
        if (newMode && !annotationInjected) {
            const result = await ipcClient.injectAnnotation();
            if (result.success) {
                setAnnotationInjected(true);
            } else {
                console.error('Failed to inject annotation script');
                return;
            }
        }

        // Toggle mode
        await ipcClient.toggleAnnotation({ enabled: newMode });
        setIsAnnotationMode(newMode);

        // Clear selections when turning off
        if (!newMode) {
            setSelectedElements([]);
        }
    };

    const handleRemoveSelection = async (selector: string) => {
        setSelectedElements(prev => prev.filter(el => el.selector !== selector));
        await ipcClient.clearAnnotationSelection({ selector });
    };

    const handleClearAllSelections = async () => {
        setSelectedElements([]);
        await ipcClient.toggleAnnotation({ enabled: false });
        setIsAnnotationMode(false);
    };

    const handleSendToChat = async () => {
        if (selectedElements.length === 0) return;

        setIsAutomating(true);
        setAutomationProgress('Generating automation plan...');

        try {
            const context = {
                currentUrl: displayUrl,
                selectedElements: selectedElements
            };

            const prompt = `Create an automation plan using these selected elements: ${selectedElements.map(el => el.label || el.selector).join(', ')}`;

            const result = await ipcClient.generateAutomationPlan({ prompt, context });

            if (result.success && result.plan) {
                setCurrentPlan(result.plan);
                setAutomationProgress('Plan ready. Starting execution...');

                // Set up progress listener
                ipcClient.onAutomationProgress((update) => {
                    if (update.type === 'step_started') {
                        setAutomationProgress(`Executing step ${update.index + 1}/${update.total}: ${update.step.description}`);
                    } else if (update.type === 'step_retry') {
                        setAutomationProgress(`Step failed. Retrying... (Attempt ${update.retryCount + 1}) 🔄`);
                    } else if (update.type === 'self_healing_start') {
                        setAutomationProgress(`Element changed? Self-healing selector with Gemini 3 Flash... 🪄`);
                    } else if (update.type === 'self_healing_success') {
                        setAutomationProgress(`Self-healing successful! Proceeding... ✅`);
                    } else if (update.type === 'step_complete') {
                        if (!update.result.success) {
                            setAutomationProgress(`Step failed: ${update.result.error}`);
                        }
                    }
                });

                const execResult = await ipcClient.executeAutomationPlan({ plan: result.plan });

                if (execResult.success && execResult.result?.success) {
                    setAutomationProgress('Automation completed successfully! ✅');
                } else {
                    setAutomationProgress(`Automation failed: ${execResult.error || execResult.result?.error || 'Unknown error'} ❌`);
                }
            } else {
                setAutomationProgress(`Failed to generate plan: ${result.error} ❌`);
            }
        } catch (error) {
            console.error('Automation error:', error);
            setAutomationProgress('An error occurred during automation. ❌');
        } finally {
            setTimeout(() => {
                setIsAutomating(false);
                setAutomationProgress('');
                handleClearAllSelections();
            }, 3000);
        }
    };

    return (
        <div className="flex h-full w-full flex-col bg-background">
            {/* Tab Bar */}
            <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onTabClick={handleTabSwitch}
                onTabClose={closeTab}
                onNewTab={() => createTab()}
            />

            {/* Browser Toolbar */}
            <div className="flex items-center gap-3 bg-background border-b border-border px-4 py-2">
                {/* Navigation Controls */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleBack}
                        disabled={!canGoBack}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleForward}
                        disabled={!canGoForward}
                    >
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleReload}
                    >
                        <RotateCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleNavigate('https://app.applaa.com/')}
                    >
                        <Home className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-4 bg-border/40 mx-1" />
                    <Button
                        variant={isAnnotationMode ? "default" : "ghost"}
                        size="icon"
                        className={cn(
                            "h-8 w-8 transition-all",
                            isAnnotationMode ? "bg-orange-500 hover:bg-orange-600 text-white" : "text-muted-foreground hover:text-orange-500"
                        )}
                        onClick={handleToggleAnnotation}
                        title="Annotate elements for automation"
                    >
                        <Target className={cn("h-4 w-4", isAnnotationMode && "animate-pulse")} />
                    </Button>
                </div>

                {/* Address Bar */}
                <div className="flex-1 flex items-center bg-muted/40 hover:bg-muted/60 border border-border/20 rounded-full px-4 py-1.5 transition-all group">
                    <ShieldCheck className="h-3.5 w-3.5 text-green-500 mr-2 opacity-70 group-hover:opacity-100" />
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                        className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/50"
                        placeholder="Enter URL or search..."
                    />
                </div>
            </div>

            {/* Resizable Panel Layout */}
            <PanelGroup direction="horizontal" className="flex-1">
                {/* Browser Panel */}
                <Panel defaultSize={60} minSize={30}>
                    <div
                        ref={browserContainerRef}
                        className="h-full w-full bg-white dark:bg-zinc-950 relative"
                    >
                        {/* New Tab Page when no URL loaded */}
                        {(!displayUrl || displayUrl === 'about:blank' || displayUrl === '') && (
                            <NewTabPage onNavigate={handleNavigate} />
                        )}

                        {/* Selection Panel */}
                        {isAnnotationMode && (
                            <SelectionPanel
                                selections={selectedElements}
                                onRemove={handleRemoveSelection}
                                onClearAll={handleClearAllSelections}
                                onSendToChat={handleSendToChat}
                            />
                        )}

                        {/* Automation Overlay */}
                        {isAutomating && (
                            <div className="absolute inset-0 z-[100] bg-background/60 backdrop-blur-sm flex items-center justify-center p-6">
                                <div className="bg-background border border-border rounded-xl shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in duration-300">
                                    <div className="flex flex-col items-center gap-6 text-center">
                                        <div className="relative">
                                            <div className="h-16 w-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                                            <Target className="h-6 w-6 text-orange-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-semibold text-foreground">Applaa Agent at Work</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {automationProgress}
                                            </p>
                                        </div>
                                        <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden">
                                            <div className="h-full bg-orange-500 w-2/3 animate-[shimmer_2s_infinite_linear]"
                                                style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Banner Ad */}
                    <BannerAd
                        onClose={() => setShowAds(false)}
                        isPremium={false} // TODO: Check user premium status
                    />
                </Panel>

                {/* Resize Handle */}
                <PanelResizeHandle className="w-1 bg-border hover:bg-orange-500 transition-colors" />

                {/* Chat Panel */}
                <Panel
                    defaultSize={40}
                    minSize={25}
                >
                    <BuddyChat
                        onNavigateToUrl={handleNavigate}
                        tabs={tabs}
                        onTabSwitch={switchTab}
                        onTabCreate={createTab}
                    />
                </Panel>
            </PanelGroup>
        </div>
    );
}
