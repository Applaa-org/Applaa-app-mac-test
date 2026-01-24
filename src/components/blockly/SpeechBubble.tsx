import React, { useEffect } from 'react';

interface SpeechBubbleProps {
    message: string;
    visible: boolean;
    position: { x: number; y: number };
    onComplete?: () => void;
}

export function SpeechBubble({ message, visible, position, onComplete }: SpeechBubbleProps) {
    useEffect(() => {
        if (visible && message && onComplete) {
            // Auto-hide after 3 seconds
            const timer = setTimeout(() => {
                onComplete();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [visible, message, onComplete]);

    if (!visible || !message) return null;

    return (
        <div
            style={{
                position: 'absolute',
                left: `${position.x}%`,
                top: `${position.y - 15}%`,
                transform: 'translate(-50%, -100%)',
                zIndex: 2000,
                pointerEvents: 'auto',
                animation: 'bubbleBounce 0.3s ease-out',
            }}
        >
            {/* Speech bubble */}
            <div
                style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '16px 20px',
                    borderRadius: '20px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    maxWidth: '300px',
                    position: 'relative',
                    border: '3px solid white',
                }}
            >
                {/* Message text */}
                <p
                    style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: '600',
                        lineHeight: '1.5',
                        textAlign: 'center',
                    }}
                >
                    {message}
                </p>


                {/* Bubble tail */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '-12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '15px solid transparent',
                        borderRight: '15px solid transparent',
                        borderTop: '15px solid white',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: '-8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '12px solid transparent',
                        borderRight: '12px solid transparent',
                        borderTop: '12px solid #764ba2',
                    }}
                />
            </div>

            {/* CSS animations */}
            <style>{`
                @keyframes bubbleBounce {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, -100%) scale(0.8);
                    }
                    50% {
                        transform: translate(-50%, -100%) scale(1.05);
                    }
                    100% {
                        opacity: 1;
                        transform: translate(-50%, -100%) scale(1);
                    }
                }
            `}</style>
        </div>
    );
}
