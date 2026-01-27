import { useState, useEffect, useCallback } from 'react';
import { ipcClient } from '@/ipc/ipc_client';
import type { BrowserTab } from './TabBar';

/**
 * useBrowserTabs - Manage browser tabs with persistence
 * 
 * Features:
 * - Create/close tabs
 * - Switch active tab
 * - Persist to database
 * - Load tabs on mount
 * - Per-tab chat context
 */
export function useBrowserTabs() {
    const [tabs, setTabs] = useState<BrowserTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    // Load tabs from database on mount
    useEffect(() => {
        loadTabs();
    }, []);

    const loadTabs = async () => {
        try {
            setIsLoading(true);
            const savedTabs = await ipcClient.listTabs();

            if (savedTabs && savedTabs.length > 0) {
                // Convert database tabs to BrowserTab format
                const browserTabs: BrowserTab[] = savedTabs.map((tab: any) => ({
                    id: tab.id.toString(),
                    title: tab.title,
                    url: tab.url,
                    chatId: tab.chatId,
                    faviconUrl: tab.faviconUrl,
                    isActive: tab.isActive,
                }));

                setTabs(browserTabs);

                // Set active tab
                const activeTab = browserTabs.find(t => t.isActive);
                if (activeTab) {
                    setActiveTabId(activeTab.id);
                } else if (browserTabs.length > 0) {
                    setActiveTabId(browserTabs[0].id);
                }
            } else {
                // Create initial tab if none exist
                await createTab();
            }
        } catch (error) {
            console.error('[useBrowserTabs] Failed to load tabs:', error);
            // Create initial tab on error
            await createTab();
        } finally {
            setIsLoading(false);
        }
    };

    const createTab = useCallback(async (url: string = '') => {
        try {
            // Create tab in database
            const newTabId = await ipcClient.createTab({
                url,
                title: 'New Tab'
            });

            const newTab: BrowserTab = {
                id: newTabId.toString(),
                title: 'New Tab',
                url,
                isActive: true,
            };

            // Add to state
            setTabs(prev => {
                // Deactivate all other tabs
                const updated = prev.map(t => ({ ...t, isActive: false }));
                return [...updated, newTab];
            });

            setActiveTabId(newTab.id);

            return newTab.id;
        } catch (error) {
            console.error('[useBrowserTabs] Failed to create tab:', error);
            return null;
        }
    }, []);

    const closeTab = useCallback(async (tabId: string) => {
        try {
            // Don't close if it's the last tab
            if (tabs.length === 1) {
                console.log('[useBrowserTabs] Cannot close last tab');
                return;
            }

            // Delete from database
            await ipcClient.deleteTab({ tabId: parseInt(tabId) });

            // Remove from state
            setTabs(prev => {
                const filtered = prev.filter(t => t.id !== tabId);

                // If closing active tab, activate another
                if (tabId === activeTabId && filtered.length > 0) {
                    const newActiveTab = filtered[filtered.length - 1];
                    setActiveTabId(newActiveTab.id);

                    // Update database
                    ipcClient.setActiveTab({ tabId: parseInt(newActiveTab.id) });
                }

                return filtered;
            });
        } catch (error) {
            console.error('[useBrowserTabs] Failed to close tab:', error);
        }
    }, [tabs.length, activeTabId]);

    const switchTab = useCallback(async (tabId: string) => {
        try {
            // Update state
            setTabs(prev => prev.map(t => ({
                ...t,
                isActive: t.id === tabId,
            })));

            setActiveTabId(tabId);

            // Update database
            await ipcClient.setActiveTab({ tabId: parseInt(tabId) });
        } catch (error) {
            console.error('[useBrowserTabs] Failed to switch tab:', error);
        }
    }, []);

    const updateTab = useCallback(async (
        tabId: string,
        updates: Partial<Omit<BrowserTab, 'id'>>
    ) => {
        try {
            // Update state
            setTabs(prev => prev.map(t =>
                t.id === tabId ? { ...t, ...updates } : t
            ));

            // Update database
            await ipcClient.updateTab({
                tabId: parseInt(tabId),
                ...updates
            });
        } catch (error) {
            console.error('[useBrowserTabs] Failed to update tab:', error);
        }
    }, []);

    const activeTab = tabs.find(t => t.id === activeTabId);

    return {
        tabs,
        activeTabId,
        activeTab,
        isLoading,
        createTab,
        closeTab,
        switchTab,
        updateTab,
    };
}
