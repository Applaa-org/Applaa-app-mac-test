import React, { useEffect, useRef } from 'react';
import { useIsPro } from '@/hooks/useSubscription';

interface AdSenseProps {
  adSlot: string;
  adFormat?: 'auto' | 'rectangle' | 'vertical' | 'horizontal';
  style?: React.CSSProperties;
  className?: string;
  fullWidthResponsive?: boolean;
}

export function AdSense({ 
  adSlot, 
  adFormat = 'auto',
  style,
  className,
  fullWidthResponsive = true,
}: AdSenseProps) {
  const { isPro } = useIsPro();
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only show ads for free users
    if (isPro) {
      return;
    }

    // Check if adsbygoogle is already loaded
    if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (error) {
        console.error('AdSense error:', error);
      }
    } else {
      // Load AdSense script if not already loaded
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUBLISHER_ID';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        try {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch (error) {
          console.error('AdSense error:', error);
        }
      };
      document.head.appendChild(script);
    }
  }, [isPro, adSlot]);

  // Don't render ads for pro users
  if (isPro) {
    return null;
  }

  return (
    <div
      ref={adRef}
      className={className}
      style={style}
    >
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          ...(fullWidthResponsive ? { width: '100%' } : {}),
        }}
        data-ad-client="ca-pub-YOUR_PUBLISHER_ID"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
      />
    </div>
  );
}

// Sidebar Ad Component
export function AdSenseSidebar() {
  return (
    <div className="w-full p-2">
      <AdSense
        adSlot="YOUR_SIDEBAR_AD_SLOT"
        adFormat="vertical"
        className="min-h-[250px]"
      />
    </div>
  );
}

// Banner Ad Component
export function AdSenseBanner() {
  return (
    <div className="w-full p-2">
      <AdSense
        adSlot="YOUR_BANNER_AD_SLOT"
        adFormat="horizontal"
        className="min-h-[100px]"
      />
    </div>
  );
}

// In-Content Ad Component
export function AdSenseInContent() {
  return (
    <div className="w-full p-4 my-4 flex justify-center">
      <AdSense
        adSlot="YOUR_IN_CONTENT_AD_SLOT"
        adFormat="rectangle"
        className="max-w-md"
      />
    </div>
  );
}
