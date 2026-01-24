import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BannerAdProps {
    onClose?: () => void;
    isPremium?: boolean;
}

export function BannerAd({ onClose, isPremium }: BannerAdProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Don't show ads for premium users
    if (isPremium) return null;

    return (
        <div
            className={cn(
                "border-t border-border bg-muted/30 transition-all duration-300",
                isCollapsed ? "h-8" : "h-24"
            )}
        >
            {/* Collapse/Expand Header */}
            <div className="flex items-center justify-between px-3 py-1 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                        {isCollapsed ? "Ad (Collapsed)" : "Advertisement"}
                    </span>
                    {!isCollapsed && (
                        <span className="text-[10px] text-muted-foreground/70">
                            • Support Applaa Buddy
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        {isCollapsed ? (
                            <ChevronUp className="h-3 w-3" />
                        ) : (
                            <ChevronDown className="h-3 w-3" />
                        )}
                    </Button>
                    {onClose && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={onClose}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Ad Content */}
            {!isCollapsed && (
                <div className="h-[calc(100%-28px)] flex items-center justify-center p-3">
                    {/* Placeholder for actual ad network integration */}
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-lg border border-border/20">
                        <div className="text-center">
                            <p className="text-sm font-medium text-foreground mb-1">
                                ✨ Upgrade to Premium
                            </p>
                            <p className="text-xs text-muted-foreground mb-2">
                                Remove ads and unlock advanced features
                            </p>
                            <Button
                                size="sm"
                                className="bg-orange-500 hover:bg-orange-600 text-white h-7 text-xs"
                            >
                                Go Premium
                            </Button>
                        </div>
                    </div>

                    {/* 
            TODO: Replace with actual ad network integration
            Options:
            1. Google AdSense: <ins class="adsbygoogle" ...>
            2. Carbon Ads: <script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=..." id="_carbonads_js"></script>
            3. Custom ad server
          */}
                </div>
            )}
        </div>
    );
}

/**
 * AdSense Integration Example:
 * 
 * 1. Add to index.html:
 * <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
 *   crossorigin="anonymous"></script>
 * 
 * 2. Replace placeholder div with:
 * <ins className="adsbygoogle"
 *   style={{ display: 'block' }}
 *   data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
 *   data-ad-slot="XXXXXXXXXX"
 *   data-ad-format="horizontal"
 *   data-full-width-responsive="true"></ins>
 * 
 * 3. Initialize in useEffect:
 * useEffect(() => {
 *   try {
 *     (window.adsbygoogle = window.adsbygoogle || []).push({});
 *   } catch (e) {
 *     console.error('AdSense error:', e);
 *   }
 * }, []);
 */
