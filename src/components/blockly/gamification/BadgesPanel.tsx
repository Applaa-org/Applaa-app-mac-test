import React from 'react';
import { BadgeManager, Badge } from '@/managers/BadgeManager';

interface BadgesPanelProps {
    onClose: () => void;
}

export const BadgesPanel: React.FC<BadgesPanelProps> = ({ onClose }) => {
    const badges = BadgeManager.getBadges();
    const unlockedCount = badges.filter(b => b.unlocked).length;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white',
                width: '600px',
                maxWidth: '90vw',
                borderRadius: '24px',
                padding: '32px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '28px', color: '#333' }}>🏆 My Achievements</h2>
                        <p style={{ margin: '4px 0 0', color: '#666' }}>
                            You have earned {unlockedCount} out of {badges.length} badges!
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            border: 'none',
                            background: '#F0F0F0',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            cursor: 'pointer',
                            fontSize: '20px',
                            color: '#666'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '20px'
                }}>
                    {badges.map((badge: Badge) => (
                        <div key={badge.id} style={{
                            backgroundColor: badge.unlocked ? '#FFF9C4' : '#F5F5F5',
                            border: badge.unlocked ? '2px solid #FFD700' : '2px solid #EEE',
                            borderRadius: '16px',
                            padding: '16px',
                            textAlign: 'center',
                            opacity: badge.unlocked ? 1 : 0.6,
                            transition: 'all 0.2s',
                            transform: badge.unlocked ? 'scale(1)' : 'scale(0.95)',
                            filter: badge.unlocked ? 'none' : 'grayscale(100%)'
                        }}>
                            <div style={{
                                fontSize: '48px',
                                marginBottom: '8px',
                                textShadow: badge.unlocked ? '0 4px 10px rgba(255, 215, 0, 0.4)' : 'none'
                            }}>
                                {badge.icon}
                            </div>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>{badge.title}</div>
                            <div style={{ fontSize: '11px', color: '#777', lineHeight: '1.3' }}>{badge.description}</div>
                        </div>
                    ))}
                </div>

            </div>
            <style>{`
                @keyframes popIn {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
