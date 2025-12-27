import { useState, useEffect } from 'react';

export interface Bookmark {
    id: string;
    name: string;
    url: string;
    icon: string;
}

const STORAGE_KEY = 'applaa_browser_bookmarks';

export function useBookmarks() {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load bookmarks:', error);
            return [];
        }
    });

    // Save to localStorage whenever bookmarks change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
        } catch (error) {
            console.error('Failed to save bookmarks:', error);
        }
    }, [bookmarks]);

    const addBookmark = (bookmark: Omit<Bookmark, 'id'>) => {
        const newBookmark: Bookmark = {
            id: Date.now().toString(),
            ...bookmark,
        };
        setBookmarks((prev) => [...prev, newBookmark]);
    };

    const removeBookmark = (id: string) => {
        setBookmarks((prev) => prev.filter((b) => b.id !== id));
    };

    return {
        bookmarks,
        addBookmark,
        removeBookmark,
    };
}
