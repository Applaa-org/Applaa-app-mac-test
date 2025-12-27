import { ArrowLeft, ArrowRight, RotateCw, Home, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BrowserControlsProps {
    canGoBack: boolean;
    canGoForward: boolean;
    onGoBack: () => void;
    onGoForward: () => void;
    onReload: () => void;
    onHome: () => void;
}

export function BrowserControls({
    canGoBack,
    canGoForward,
    onGoBack,
    onGoForward,
    onReload,
    onHome
}: BrowserControlsProps) {
    return (
        <div className="flex items-center gap-1 px-2 py-1 bg-[#202124]">
            {/* Back button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={onGoBack}
                disabled={!canGoBack}
                className={cn(
                    "p-2 rounded-full transition-all",
                    canGoBack
                        ? "hover:bg-gray-700 text-gray-300"
                        : "text-gray-600 cursor-not-allowed"
                )}
                title="Go back"
            >
                <ArrowLeft className="w-4 h-4" />
            </Button>

            {/* Forward button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={onGoForward}
                disabled={!canGoForward}
                className={cn(
                    "p-2 rounded-full transition-all",
                    canGoForward
                        ? "hover:bg-gray-700 text-gray-300"
                        : "text-gray-600 cursor-not-allowed"
                )}
                title="Go forward"
            >
                <ArrowRight className="w-4 h-4" />
            </Button>

            {/* Reload button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={onReload}
                className="p-2 rounded-full hover:bg-gray-700 text-gray-300 transition-all"
                title="Reload"
            >
                <RotateCw className="w-4 h-4" />
            </Button>

            {/* Home button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={onHome}
                className="p-2 rounded-full hover:bg-gray-700 text-gray-300 transition-all"
                title="Home"
            >
                <Home className="w-4 h-4" />
            </Button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Menu button */}
            <Button
                variant="ghost"
                size="sm"
                className="p-2 rounded-full hover:bg-gray-700 text-gray-300 transition-all"
                title="Menu"
            >
                <MoreVertical className="w-4 h-4" />
            </Button>
        </div>
    );
}
