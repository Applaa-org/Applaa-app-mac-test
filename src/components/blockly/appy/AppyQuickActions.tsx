/**
 * Appy Quick Actions
 * Floating buttons for kids to quickly ask Appy for help
 */

import React from 'react';

interface AppyQuickActionsProps {
    onAskHelp: (request: string) => void;
}

export const AppyQuickActions: React.FC<AppyQuickActionsProps> = ({ onAskHelp }) => {
    const actionButtons = [
        {
            icon: '▶️',
            label: 'Run',
            color: '#4CAF50',
            request: 'Help me run my code'
        },
        {
            icon: '➕',
            label: 'Add',
            color: '#2196F3',
            request: 'Show me how to add blocks'
        },
        {
            icon: '➖',
            label: 'Remove',
            color: '#FF9800',
            request: 'Help me remove blocks'
        }
    ];

    return (
        <div style={{
            position: 'fixed',
            right: '20px',
            bottom: '120px', // Above the trash can
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 100
        }}>
            {actionButtons.map((action, index) => (
                <button
                    key={index}
                    onClick={() => onAskHelp(action.request)}
                    title={`Ask Appy: ${action.label}`}
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        border: '3px solid white',
                        backgroundColor: action.color,
                        color: 'white',
                        fontSize: '24px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                    }}
                >
                    {action.icon}
                    {/* Tooltip */}
                    <div style={{
                        position: 'absolute',
                        right: '70px',
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                        opacity: 0,
                        pointerEvents: 'none',
                        transition: 'opacity 0.2s'
                    }}
                        className="tooltip"
                    >
                        Ask Appy: {action.label}
                    </div>
                </button>
            ))}

            {/* CSS for tooltip hover */}
            <style>{`
                button:hover .tooltip {
                    opacity: 1 !important;
                }
            `}</style>
        </div>
    );
};
