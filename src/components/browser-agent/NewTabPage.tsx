import { Globe, Plus, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { AddBookmarkDialog } from './AddBookmarkDialog';
import { useBookmarks } from '@/hooks/useBookmarks';

interface Website {
    name: string;
    url: string;
    icon: string;
    color: string;
}

interface NewTabPageProps {
    onNavigate: (url: string) => void;
}

const CURATED_WEBSITES: Website[] = [
    {
        name: 'Applaa',
        url: 'https://applaa.com',
        icon: '🚀',
        color: 'from-orange-500/10 to-amber-500/10',
    },
    {
        name: 'Khan Academy',
        url: 'https://www.khanacademy.org',
        icon: '🎓',
        color: 'from-green-500/10 to-teal-500/10',
    },
    {
        name: 'Scratch',
        url: 'https://scratch.mit.edu',
        icon: '🐱',
        color: 'from-orange-400/10 to-yellow-400/10',
    },
    {
        name: 'Code.org',
        url: 'https://code.org',
        icon: '💻',
        color: 'from-blue-500/10 to-cyan-500/10',
    },
    {
        name: 'Minecraft',
        url: 'https://www.minecraft.net',
        icon: '🧱',
        color: 'from-green-600/10 to-emerald-500/10',
    },
    {
        name: 'Roblox',
        url: 'https://www.roblox.com',
        icon: '🎮',
        color: 'from-red-500/10 to-rose-500/10',
    },
    {
        name: 'Wikipedia',
        url: 'https://www.wikipedia.org',
        icon: '📚',
        color: 'from-gray-500/10 to-slate-500/10',
    },
    {
        name: 'Duolingo',
        url: 'https://www.duolingo.com',
        icon: '🦉',
        color: 'from-green-400/10 to-lime-400/10',
    },
];

export function NewTabPage({ onNavigate }: NewTabPageProps) {
    const { bookmarks, addBookmark, removeBookmark } = useBookmarks();
    const [showAddDialog, setShowAddDialog] = useState(false);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-8 z-50 overflow-y-auto">
            {/* Header */}
            <div className="mb-10 text-center mt-12">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-3xl flex items-center justify-center mb-6 mx-auto hover:scale-105 transition-transform duration-300">
                    <span className="text-5xl">🤖</span>
                </div>
                <h3 className="text-3xl font-bold tracking-tight mb-2">
                    Applaa <span className="text-purple-500">Buddy</span>
                </h3>
                <p className="text-base text-muted-foreground">
                    Your AI-Powered Learning & Automation Assistant
                </p>
            </div>

            {/* Curated Websites */}
            <div className="w-full max-w-3xl">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                        Explore
                    </h4>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setShowAddDialog(true)}
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Bookmark
                    </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {CURATED_WEBSITES.map((site) => (
                        <button
                            key={site.url}
                            onClick={() => onNavigate(site.url)}
                            className="group p-4 rounded-2xl bg-muted/30 hover:bg-muted/60 border border-border/20 transition-all hover:scale-105 hover:shadow-lg active:scale-95 text-left"
                        >
                            <div className={`w-12 h-12 bg-gradient-to-br ${site.color} rounded-xl flex items-center justify-center mb-3 mx-auto group-hover:scale-110 transition-transform`}>
                                <span className="text-2xl">{site.icon}</span>
                            </div>
                            <p className="text-sm font-medium text-center truncate px-1">{site.name}</p>
                        </button>
                    ))}
                </div>

                {/* Custom Bookmarks */}
                {bookmarks.length > 0 && (
                    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-4 px-1">
                            My Bookmarks
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {bookmarks.map((bookmark) => (
                                <div
                                    key={bookmark.id}
                                    className="group relative p-4 rounded-2xl bg-muted/30 hover:bg-muted/60 border border-border/20 transition-all hover:scale-105 hover:shadow-lg cursor-pointer active:scale-95"
                                    onClick={() => onNavigate(bookmark.url)}
                                >
                                    {/* Remove button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeBookmark(bookmark.id);
                                        }}
                                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-destructive/10 hover:bg-destructive/20 transition-all z-10"
                                        title="Remove bookmark"
                                    >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                    </button>

                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl flex items-center justify-center mb-3 mx-auto group-hover:scale-110 transition-transform">
                                        <span className="text-2xl">{bookmark.icon}</span>
                                    </div>
                                    <p className="text-sm font-medium text-center truncate px-1">{bookmark.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="mt-12 flex gap-3">
                <button
                    onClick={() => onNavigate('https://docs.applaa.com')}
                    className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <Star className="h-4 w-4" />
                    Applaa Docs
                </button>
            </div>

            {/* Footer Tip */}
            <div className="mt-8 text-center">
                <p className="text-xs text-muted-foreground">
                    💡 Tip: Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl+T</kbd> to open a new tab
                </p>
            </div>

            {/* Add Bookmark Dialog */}
            <AddBookmarkDialog
                open={showAddDialog}
                onOpenChange={setShowAddDialog}
                onAdd={addBookmark}
            />
        </div>
    );
}
