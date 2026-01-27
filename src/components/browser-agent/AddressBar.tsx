import { useState, useEffect, KeyboardEvent } from 'react';
import { Search, Lock, Star, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddressBarProps {
    url: string;
    isLoading?: boolean;
    onNavigate: (url: string) => void;
    onRefresh: () => void;
}

export function AddressBar({ url, isLoading, onNavigate, onRefresh }: AddressBarProps) {
    const [inputValue, setInputValue] = useState(url);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            setInputValue(url);
        }
    }, [url, isFocused]);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onNavigate(inputValue);
            (e.target as HTMLInputElement).blur();
        }
    };

    const isSecure = url.startsWith('https://');
    const displayUrl = url.replace(/^https?:\/\//, '');

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#202124]">
            {/* Security indicator */}
            <div className="flex-shrink-0">
                {isSecure ? (
                    <Lock className="w-4 h-4 text-green-500" />
                ) : url ? (
                    <Search className="w-4 h-4 text-gray-400" />
                ) : (
                    <Search className="w-4 h-4 text-gray-400" />
                )}
            </div>

            {/* Address input */}
            <div className="flex-1 relative">
                <input
                    type="text"
                    value={isFocused ? inputValue : displayUrl}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={() => {
                        setIsFocused(true);
                        setInputValue(url);
                    }}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search or enter address"
                    className={cn(
                        "w-full px-3 py-1.5 rounded-full text-sm transition-all",
                        "bg-[#303134] text-gray-200 placeholder-gray-500",
                        "border border-transparent",
                        "focus:outline-none focus:border-blue-500 focus:bg-[#292a2d]",
                        "hover:bg-[#35363a]"
                    )}
                />
            </div>

            {/* Refresh button */}
            <button
                onClick={onRefresh}
                className={cn(
                    "flex-shrink-0 p-1.5 rounded-full transition-all",
                    "hover:bg-gray-700 text-gray-300",
                    isLoading && "animate-spin"
                )}
                title="Reload"
            >
                <RefreshCw className="w-4 h-4" />
            </button>

            {/* Bookmark button */}
            <button
                className="flex-shrink-0 p-1.5 rounded-full hover:bg-gray-700 text-gray-300 transition-all"
                title="Bookmark this page"
            >
                <Star className="w-4 h-4" />
            </button>
        </div>
    );
}
