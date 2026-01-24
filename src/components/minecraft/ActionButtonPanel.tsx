/**
 * ActionButtonPanel - Interactive buttons for 3D preview
 * Displays action buttons from behaviors.json
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import type { ActionButton } from '@/types/MinecraftBehaviorSchema';
import { Zap, Flame, Bomb, Moon, Cloud, Sparkles } from 'lucide-react';

interface ActionButtonPanelProps {
    actions: ActionButton[];
    onActionClick: (action: ActionButton) => void;
}

const iconMap: Record<string, React.ReactNode> = {
    zombie: '🧟',
    skeleton: '💀',
    flame: <Flame className="w-4 h-4" />,
    explode: <Bomb className="w-4 h-4" />,
    night: <Moon className="w-4 h-4" />,
    weather: <Cloud className="w-4 h-4" />,
    sparkle: <Sparkles className="w-4 h-4" />,
    default: <Zap className="w-4 h-4" />,
};

function getIcon(iconName?: string) {
    if (!iconName) return iconMap.default;
    return iconMap[iconName] || iconMap.default;
}

export function ActionButtonPanel({ actions, onActionClick }: ActionButtonPanelProps) {
    if (!actions || actions.length === 0) return null;

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-xl p-3 shadow-2xl">
                <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-400 mr-2">Actions:</span>
                    {actions.map((action) => (
                        <Button
                            key={action.id}
                            onClick={() => onActionClick(action)}
                            size="sm"
                            className="bg-emerald-600/20 hover:bg-emerald-600 text-white border border-emerald-500/30 hover:border-emerald-500"
                            title={action.description}
                        >
                            {action.icon && <span className="mr-1">{getIcon(action.icon)}</span>}
                            <span className="text-sm">{action.label}</span>
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ActionButtonPanel;
