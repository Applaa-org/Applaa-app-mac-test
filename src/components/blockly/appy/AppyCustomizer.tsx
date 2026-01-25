import React, { useState, useEffect } from 'react';

interface AppyCustomizerProps {
    onColorChange: (color: string) => void;
    currentColor: string;
    onClose: () => void;
}

const PRESET_COLORS = [
    { name: 'Classic Silver', value: '#C0C0C0' },
    { name: 'Sky Blue', value: '#87CEEB' },
    { name: 'Lime Green', value: '#32CD32' },
    { name: 'Hot Pink', value: '#FF69B4' },
    { name: 'Golden', value: '#FFD700' },
    { name: 'Purple', value: '#9370DB' },
];

export const AppyCustomizer: React.FC<AppyCustomizerProps> = ({ onColorChange, currentColor, onClose }) => {
    return (
        <div className="absolute bottom-20 right-4 p-4 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-64 z-50 animate-in fade-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-100">Style Appy! 🎨</h3>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full"
                >
                    ✕
                </button>
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                    {PRESET_COLORS.map((color) => (
                        <button
                            key={color.value}
                            onClick={() => onColorChange(color.value)}
                            className={`w-full h-10 rounded-lg transition-transform hover:scale-105 ${currentColor === color.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                                }`}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                        />
                    ))}
                </div>

                <div className="text-xs text-center text-zinc-500 mt-2">
                    Click a color to change Appy's look!
                </div>
            </div>
        </div>
    );
};
