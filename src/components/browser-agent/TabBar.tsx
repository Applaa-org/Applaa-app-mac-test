import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface BrowserTab {
    id: string;
    title: string;
    url: string;
    chatId?: number;
    faviconUrl?: string;
    isActive: boolean;
}

interface TabBarProps {
    tabs: BrowserTab[];
    activeTabId: string;
    onTabClick: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onNewTab: () => void;
}

export function TabBar({
    tabs,
    activeTabId,
    onTabClick,
    onTabClose,
    onNewTab,
}: TabBarProps) {
    return (
        <div className="flex items-center bg-muted/30 px-2 py-1 border-b border-border">
            {/* Tabs + New Tab Button */}
            <div className="flex items-center gap-1">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        onClick={() => onTabClick(tab.id)}
                        className={cn(
                            "group flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-pointer transition-colors min-w-[120px] max-w-[200px]",
                            tab.id === activeTabId
                                ? "bg-background border border-b-0 border-border"
                                : "bg-muted/50 hover:bg-muted/70"
                        )}
                    >
                        {/* Favicon */}
                        {tab.faviconUrl ? (
                            <img
                                src={tab.faviconUrl}
                                alt=""
                                className="w-4 h-4 flex-shrink-0"
                                onError={(e) => {
                                    // Hide broken favicons
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        ) : (
                            <div className="w-4 h-4 flex-shrink-0 rounded-sm bg-muted flex items-center justify-center">
                                <span className="text-[8px]">🌐</span>
                            </div>
                        )}

                        {/* Title */}
                        <span className="text-xs truncate flex-1">
                            {tab.title || 'New Tab'}
                        </span>

                        {/* Close Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onTabClose(tab.id);
                            }}
                            className={cn(
                                "flex-shrink-0 p-0.5 rounded hover:bg-muted-foreground/20 transition-colors",
                                tab.id === activeTabId ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ))}

                {/* New Tab Button - right next to last tab */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={onNewTab}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
