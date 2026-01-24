/**
 * Appy Chat Interface
 * Simple chat UI for kids to talk to Appy
 */

import React, { useState } from 'react';

interface AppyChatProps {
    onSendMessage: (message: string) => void;
    isTeaching: boolean;
}

export const AppyChat: React.FC<AppyChatProps> = ({ onSendMessage, isTeaching }) => {
    const [message, setMessage] = useState('');
    const [isMinimized, setIsMinimized] = useState(true);

    const handleSend = () => {
        if (message.trim()) {
            onSendMessage(message);
            setMessage('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (isMinimized) {
        return (
            <div
                onClick={() => setIsMinimized(false)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                    fontWeight: 'bold',
                    zIndex: 1000,
                    transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                💬 Ask Appy
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '350px',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            zIndex: 1000,
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '15px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                    🤖 Chat with Appy
                </div>
                <button
                    onClick={() => setIsMinimized(true)}
                    style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        color: 'white',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    −
                </button>
            </div>

            {/* Status */}
            {isTeaching && (
                <div style={{
                    background: '#f0f9ff',
                    padding: '10px 20px',
                    borderBottom: '1px solid #e0e0e0',
                    fontSize: '13px',
                    color: '#667eea'
                }}>
                    🎓 Teaching mode active
                </div>
            )}

            {/* Input */}
            <div style={{
                padding: '20px',
                borderTop: '1px solid #e0e0e0'
            }}>
                <div style={{
                    display: 'flex',
                    gap: '10px'
                }}>
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask for help or say what you want to build..."
                        style={{
                            flex: 1,
                            padding: '12px 16px',
                            border: '2px solid #e0e0e0',
                            borderRadius: '25px',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!message.trim()}
                        style={{
                            background: message.trim() ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e0e0e0',
                            color: 'white',
                            border: 'none',
                            width: '45px',
                            height: '45px',
                            borderRadius: '50%',
                            cursor: message.trim() ? 'pointer' : 'not-allowed',
                            fontSize: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (message.trim()) e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        ➤
                    </button>
                </div>

                {/* Quick suggestions */}
                <div style={{
                    marginTop: '12px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px'
                }}>
                    {[
                        '🎯 Show me a tour',
                        '❓ Help me with the Run button',
                        '🔧 Explain the toolbox',
                        '🎮 Make a guessing game'
                    ].map(suggestion => (
                        <button
                            key={suggestion}
                            onClick={() => setMessage(suggestion)}
                            style={{
                                background: '#f5f5f5',
                                border: '1px solid #e0e0e0',
                                borderRadius: '15px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#667eea';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.borderColor = '#667eea';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#f5f5f5';
                                e.currentTarget.style.color = 'black';
                                e.currentTarget.style.borderColor = '#e0e0e0';
                            }}
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
