/**
 * Minecraft Visual Simulator
 * 
 * Shows a visual preview of what the mod will do in Minecraft
 * Uses CSS animations and sprites to simulate mob spawns, effects, and building
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Play,
    Pause,
    RotateCcw,
    Maximize2,
    Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimulatorCommand {
    type: 'spawn' | 'effect' | 'build' | 'say' | 'time' | 'weather' | 'give' | 'teleport';
    entity?: string;
    effect?: string;
    block?: string;
    message?: string;
    position?: { x: number; y: number };
}

interface MinecraftSimulatorProps {
    /** mcfunction commands to simulate */
    mcfunctionCode?: string;
    /** Whether the simulator is running */
    autoPlay?: boolean;
}

// Entity sprites (emoji-based for simplicity)
const ENTITY_SPRITES: Record<string, string> = {
    zombie: '🧟',
    creeper: '💚',
    skeleton: '💀',
    spider: '🕷️',
    enderman: '👾',
    pig: '🐷',
    cow: '🐄',
    sheep: '🐑',
    chicken: '🐔',
    wolf: '🐺',
    cat: '🐱',
    horse: '🐴',
    villager: '👨‍🌾',
    player: '🧑'
};

// Block colors
const BLOCK_COLORS: Record<string, string> = {
    stone: '#888888',
    cobblestone: '#666666',
    planks: '#C4A76C',
    glass: 'rgba(200, 230, 255, 0.5)',
    dirt: '#8B6F47',
    sand: '#E8D4A8',
    gold_block: '#FFD700',
    diamond_block: '#00CED1',
    iron_block: '#D4D4D4',
    brick_block: '#9A4B3D',
    obsidian: '#1A1A2E',
    glowstone: '#FFE566',
    tnt: '#FF4444',
    bedrock: '#333333'
};

// Effect colors
const EFFECT_COLORS: Record<string, string> = {
    speed: '#7FDBFF',
    slowness: '#606060',
    jump_boost: '#22FF22',
    regeneration: '#FF77FF',
    resistance: '#9999FF',
    fire_resistance: '#FF9900',
    water_breathing: '#0099FF',
    invisibility: '#CCCCCC',
    night_vision: '#FFD700',
    strength: '#FF4444',
    levitation: '#CCFFCC',
    slow_falling: '#FFFFCC'
};

// Parse mcfunction code into commands
function parseMcfunction(code: string): SimulatorCommand[] {
    const commands: SimulatorCommand[] = [];
    const lines = code.split('\n').filter(l => l.trim() && !l.startsWith('#'));

    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const cmd = parts[0];

        switch (cmd) {
            case 'summon':
                commands.push({
                    type: 'spawn',
                    entity: parts[1] || 'zombie',
                    position: { x: Math.random() * 80 + 10, y: Math.random() * 60 + 20 }
                });
                break;
            case 'effect':
                commands.push({
                    type: 'effect',
                    effect: parts[2] || 'speed'
                });
                break;
            case 'setblock':
            case 'fill':
                commands.push({
                    type: 'build',
                    block: parts[4] || parts[1] || 'stone',
                    position: { x: 50, y: 50 }
                });
                break;
            case 'say':
                commands.push({
                    type: 'say',
                    message: parts.slice(1).join(' ') || 'Hello!'
                });
                break;
            case 'time':
                commands.push({
                    type: 'time',
                    message: parts[2] || 'day'
                });
                break;
            case 'weather':
                commands.push({
                    type: 'weather',
                    message: parts[1] || 'clear'
                });
                break;
            case 'give':
                commands.push({
                    type: 'give',
                    message: parts[2] || 'diamond'
                });
                break;
        }
    }

    return commands;
}

export function MinecraftSimulator({ mcfunctionCode = '', autoPlay = false }: MinecraftSimulatorProps) {
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [entities, setEntities] = useState<Array<{ id: number; emoji: string; x: number; y: number }>>([]);
    const [blocks, setBlocks] = useState<Array<{ id: number; color: string; x: number; y: number }>>([]);
    const [effects, setEffects] = useState<string[]>([]);
    const [messages, setMessages] = useState<string[]>([]);
    const [timeOfDay, setTimeOfDay] = useState<'day' | 'sunset' | 'night'>('day');
    const [weather, setWeather] = useState<'clear' | 'rain' | 'thunder'>('clear');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [commandIndex, setCommandIndex] = useState(0);

    // Get commands from code
    const commands = parseMcfunction(mcfunctionCode);

    // Execute next command
    const executeCommand = useCallback((cmd: SimulatorCommand) => {
        switch (cmd.type) {
            case 'spawn':
                const emoji = ENTITY_SPRITES[cmd.entity || 'zombie'] || '🧟';
                setEntities(prev => [...prev, {
                    id: Date.now() + Math.random(),
                    emoji,
                    x: cmd.position?.x || 50,
                    y: cmd.position?.y || 50
                }]);
                break;
            case 'effect':
                setEffects(prev => [...prev, cmd.effect || 'speed']);
                setTimeout(() => setEffects(prev => prev.slice(1)), 3000);
                break;
            case 'build':
                const color = BLOCK_COLORS[cmd.block || 'stone'] || '#888888';
                setBlocks(prev => [...prev, {
                    id: Date.now(),
                    color,
                    x: cmd.position?.x || 50,
                    y: cmd.position?.y || 50
                }]);
                break;
            case 'say':
                setMessages(prev => [...prev.slice(-4), cmd.message || 'Hello!']);
                break;
            case 'time':
                if (cmd.message === 'night' || cmd.message === 'midnight') {
                    setTimeOfDay('night');
                } else if (cmd.message === 'sunset') {
                    setTimeOfDay('sunset');
                } else {
                    setTimeOfDay('day');
                }
                break;
            case 'weather':
                setWeather(cmd.message as any || 'clear');
                break;
        }
    }, []);

    // Run simulation
    useEffect(() => {
        if (!isPlaying || commands.length === 0) return;

        const interval = setInterval(() => {
            if (commandIndex < commands.length) {
                executeCommand(commands[commandIndex]);
                setCommandIndex(prev => prev + 1);
            } else {
                setIsPlaying(false);
            }
        }, 800);

        return () => clearInterval(interval);
    }, [isPlaying, commandIndex, commands, executeCommand]);

    // Reset simulation
    const handleReset = () => {
        setIsPlaying(false);
        setEntities([]);
        setBlocks([]);
        setEffects([]);
        setMessages([]);
        setTimeOfDay('day');
        setWeather('clear');
        setCommandIndex(0);
    };

    // Calculate background based on time
    const getBackground = () => {
        switch (timeOfDay) {
            case 'night': return 'linear-gradient(to bottom, #0a0a1a 0%, #1a1a3a 50%, #2a3a2a 100%)';
            case 'sunset': return 'linear-gradient(to bottom, #ff6b35 0%, #f7931e 30%, #5a5a8a 100%)';
            default: return 'linear-gradient(to bottom, #87CEEB 0%, #98D8F0 50%, #5A8A3A 100%)';
        }
    };

    return (
        <div
            className={`relative overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}
            style={{ background: getBackground(), transition: 'background 1s' }}
        >
            {/* Sky overlay for weather */}
            {weather === 'rain' && (
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-0.5 h-4 bg-blue-300 opacity-50"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animation: `rain 0.5s linear infinite`,
                                animationDelay: `${Math.random() * 0.5}s`
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Night stars */}
            {timeOfDay === 'night' && (
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(30)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 40}%`,
                                opacity: 0.5 + Math.random() * 0.5
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Ground */}
            <div
                className="absolute bottom-0 left-0 right-0 h-16"
                style={{
                    background: 'linear-gradient(to bottom, #5A8A3A 0%, #4A7A2A 50%, #3A6A1A 100%)',
                    borderTop: '3px solid #4A7A2A'
                }}
            />

            {/* Placed Blocks */}
            {blocks.map(block => (
                <div
                    key={block.id}
                    className="absolute w-8 h-8 rounded border-2 border-black/20"
                    style={{
                        left: `${block.x}%`,
                        bottom: '64px',
                        backgroundColor: block.color,
                        animation: 'pop 0.3s ease-out'
                    }}
                />
            ))}

            {/* Player */}
            <div
                className="absolute text-4xl"
                style={{
                    left: '50%',
                    bottom: '80px',
                    transform: 'translateX(-50%)',
                    filter: effects.length > 0 ? `drop-shadow(0 0 10px ${EFFECT_COLORS[effects[0]] || '#fff'})` : 'none'
                }}
            >
                🧑
            </div>

            {/* Spawned Entities */}
            {entities.map(entity => (
                <div
                    key={entity.id}
                    className="absolute text-3xl transition-all duration-500"
                    style={{
                        left: `${entity.x}%`,
                        bottom: `${entity.y}px`,
                        animation: 'bounce 0.5s ease-out, wander 3s infinite ease-in-out'
                    }}
                >
                    {entity.emoji}
                </div>
            ))}

            {/* Effect Indicator */}
            {effects.length > 0 && (
                <div
                    className="absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: EFFECT_COLORS[effects[0]] || '#fff' }}
                >
                    ✨ {effects[0].replace(/_/g, ' ')}
                </div>
            )}

            {/* Chat Messages */}
            <div className="absolute top-4 right-4 space-y-1">
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className="bg-black/70 text-white text-sm px-2 py-1 rounded"
                        style={{ animation: 'fadeIn 0.3s ease-out' }}
                    >
                        {msg}
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2">
                <Button
                    size="sm"
                    variant={isPlaying ? "destructive" : "default"}
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="shadow-lg"
                >
                    {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                    {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReset}
                    className="shadow-lg bg-white/90"
                >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="shadow-lg bg-white/90"
                >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
            </div>

            {/* Command counter */}
            <div className="absolute bottom-4 left-4 text-white/80 text-xs bg-black/40 px-2 py-1 rounded">
                Commands: {commandIndex}/{commands.length}
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes rain {
                    from { transform: translateY(-10px); }
                    to { transform: translateY(100vh); }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes wander {
                    0%, 100% { transform: translateX(0); }
                    50% { transform: translateX(20px); }
                }
                @keyframes pop {
                    0% { transform: scale(0); }
                    80% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}

export default MinecraftSimulator;
