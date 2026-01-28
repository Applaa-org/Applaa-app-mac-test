import React, { useState, useEffect } from 'react';
import { ChallengeManager, Challenge } from '@/managers/ChallengeManager';

interface ChallengePanelProps {
    onClose: () => void;
    onStartChallenge: (challenge: Challenge) => void;
}

export const ChallengePanel: React.FC<ChallengePanelProps> = ({ onClose, onStartChallenge }) => {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        setChallenges(ChallengeManager.getChallenges());
    }, []);

    const activeChallenge = challenges.find(c => c.id === selectedId);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white',
                width: '800px',
                height: '500px',
                maxWidth: '95vw',
                borderRadius: '24px',
                overflow: 'hidden',
                display: 'flex',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }} onClick={e => e.stopPropagation()}>

                {/* Sidebar: List */}
                <div style={{
                    width: '300px',
                    backgroundColor: '#F5F7FA',
                    borderRight: '1px solid #EEE',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid #EEE' }}>
                        <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>🧩 Puzzles</h2>
                        <p style={{ margin: '4px 0 0', color: '#888', fontSize: '12px' }}>Pick a challenge to start!</p>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                        {challenges.map(challenge => (
                            <div
                                key={challenge.id}
                                onClick={() => setSelectedId(challenge.id)}
                                style={{
                                    padding: '16px',
                                    borderRadius: '12px',
                                    marginBottom: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: selectedId === challenge.id ? '#FFF' : 'transparent',
                                    boxShadow: selectedId === challenge.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                    border: selectedId === challenge.id ? '2px solid #4C97FF' : '2px solid transparent',
                                    position: 'relative'
                                }}
                            >
                                <div style={{ fontWeight: 'bold', color: '#333', display: 'flex', justifyContent: 'space-between' }}>
                                    {challenge.title}
                                    {challenge.completed && <span>✅</span>}
                                </div>
                                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                                    {challenge.difficulty.toUpperCase()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main: Details */}
                <div style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>

                    {activeChallenge ? (
                        <>
                            <div style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                background: activeChallenge.difficulty === 'easy' ? '#E6FFFA' : activeChallenge.difficulty === 'medium' ? '#FFFAF0' : '#FFF5F5',
                                color: activeChallenge.difficulty === 'easy' ? '#0FBD8C' : activeChallenge.difficulty === 'medium' ? '#ED8936' : '#F56565',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                alignSelf: 'flex-start',
                                marginBottom: '16px'
                            }}>
                                {activeChallenge.difficulty.toUpperCase()}
                            </div>

                            <h1 style={{ margin: '0 0 16px 0', fontSize: '32px', color: '#2D3748' }}>{activeChallenge.title}</h1>
                            <p style={{ fontSize: '16px', color: '#4A5568', lineHeight: '1.6', flex: 1 }}>
                                {activeChallenge.description}
                                <br /><br />
                                <strong>Goal:</strong> {activeChallenge.goal}
                            </p>

                            <button
                                onClick={() => {
                                    onStartChallenge(activeChallenge);
                                    onClose();
                                }}
                                style={{
                                    padding: '16px',
                                    backgroundColor: '#4C97FF',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '16px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 20px rgba(76, 151, 255, 0.3)',
                                    transition: 'transform 0.1s'
                                }}
                            >
                                Start Challenge 🚀
                            </button>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0AEC0', flexDirection: 'column' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👈</div>
                            Select a puzzle from the list
                        </div>
                    )}
                </div>

            </div>
            <style>{`
                @keyframes popIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
