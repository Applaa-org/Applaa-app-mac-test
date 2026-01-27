import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Tab {
    id: string;
    title: string;
    url: string;
    favicon?: string;
}

interface ChromeTabsProps {
    tabs: Tab[];
    activeTabId: string | null;
    onTabClick: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onNewTab: () => void;
}

export function ChromeTabs({ tabs, activeTabId, onTabClick, onTabClose, onNewTab }: ChromeTabsProps) {
    return (
        <div className="flex items-center bg-[#202124] border-b border-gray-700 px-2 py-1 gap-1">
            {/* Tabs */}
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    onClick={() => onTabClick(tab.id)}
                    className={cn(
                        "group relative flex items-center gap-2 px-4 py-2 rounded-t-lg cursor-pointer transition-all duration-150 max-w-[240px] min-w-[120px]",
                        activeTabId === tab.id
                            ? "bg-[#292a2d] text-white"
                            : "bg-[#35363a] text-gray-300 hover:bg-[#3c3d41]"
                    )}
                >
                    {/* Favicon */}
                    {tab.favicon ? (
                        <img
                            src={tab.favicon}
                            alt=""
                            className="w-4 h-4 flex-shrink-0"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    ) : (
                        <div className="w-4 h-4 flex-shrink-0 rounded-full bg-gray-600" />
                    )}

                    {/* Title */}
                    <span className="flex-1 truncate text-sm font-normal">
                        {tab.title || 'New Tab'}
                    </span>

                    {/* Close button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTabClose(tab.id);
                        }}
                        className={cn(
                            "flex-shrink-0 p-1 rounded-full transition-all",
                            "opacity-0 group-hover:opacity-100",
                            "hover:bg-gray-600"
                        )}
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ))}

            {/* New Tab Button */}
            <button
                onClick={() => onNewTab()}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-700 transition-colors text-gray-300"
                title="New tab"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>
    );
}
