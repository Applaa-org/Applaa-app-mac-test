import React, { useEffect, useState } from 'react';
import { Badge } from '@/managers/BadgeManager';

export const BadgeNotification: React.FC = () => {
    const [visibleBadge, setVisibleBadge] = useState<Badge | null>(null);

    useEffect(() => {
        const handleUnlock = (event: CustomEvent<Badge>) => {
            setVisibleBadge(event.detail);

            // Hide after 4 seconds
            setTimeout(() => {
                setVisibleBadge(null);
            }, 4000);
        };

        window.addEventListener('badge-unlocked' as any, handleUnlock as any);
        return () => {
            window.removeEventListener('badge-unlocked' as any, handleUnlock as any);
        };
    }, []);

    if (!visibleBadge) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            color: '#fff',
            padding: '16px 24px',
            borderRadius: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            fontFamily: "'Fredoka', sans-serif"
        }}>
            <div style={{ fontSize: '32px' }}>{visibleBadge.icon}</div>
            <div>
                <div style={{ fontSize: '12px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                    New Badge Unlocked!
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                    {visibleBadge.title}
                </div>
            </div>
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%) scale(0.5); opacity: 0; }
                    to { transform: translateX(0) scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
