import { useState, useEffect } from 'react';
import { Target, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SelectedElement {
    selector: string;
    tag: string;
    text: string;
    type?: string;
    name?: string;
    id?: string;
    className?: string;
    placeholder?: string;
    timestamp: number;
}

interface SelectionPanelProps {
    selections: SelectedElement[];
    onRemove: (selector: string) => void;
    onClearAll: () => void;
    onSendToChat: () => void;
}

export function SelectionPanel({
    selections,
    onRemove,
    onClearAll,
    onSendToChat,
}: SelectionPanelProps) {
    if (selections.length === 0) {
        return null;
    }

    const getElementLabel = (element: SelectedElement) => {
        // Priority: text > placeholder > name > id > tag
        if (element.text && element.text.length > 0) {
            return element.text.substring(0, 50);
        }
        if (element.placeholder) {
            return `"${element.placeholder}"`;
        }
        if (element.name) {
            return element.name;
        }
        if (element.id) {
            return `#${element.id}`;
        }
        return element.tag;
    };

    const getElementIcon = (element: SelectedElement) => {
        switch (element.tag) {
            case 'button':
                return '🔘';
            case 'input':
                return element.type === 'password' ? '🔒' : '📝';
            case 'a':
                return '🔗';
            case 'img':
                return '🖼️';
            case 'select':
                return '📋';
            default:
                return '📍';
        }
    };

    return (
        <div className="absolute top-16 right-4 w-80 bg-background border border-border rounded-lg shadow-lg z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-500" />
                    <h3 className="text-sm font-semibold">
                        Selected Elements ({selections.length})
                    </h3>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearAll}
                    className="h-7 text-xs"
                >
                    Clear All
                </Button>
            </div>

            {/* Selection List */}
            <div className="max-h-96 overflow-y-auto">
                {selections.map((element, index) => (
                    <div
                        key={element.selector + element.timestamp}
                        className="group p-3 border-b border-border/50 hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex items-start gap-2">
                            {/* Icon */}
                            <span className="text-lg flex-shrink-0">
                                {getElementIcon(element)}
                            </span>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-muted-foreground uppercase">
                                        {element.tag}
                                        {element.type && ` (${element.type})`}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        #{index + 1}
                                    </span>
                                </div>

                                <p className="text-sm font-medium truncate mb-1">
                                    {getElementLabel(element)}
                                </p>

                                <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded block truncate">
                                    {element.selector}
                                </code>
                            </div>

                            {/* Remove Button */}
                            <button
                                onClick={() => onRemove(element.selector)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all flex-shrink-0"
                            >
                                <X className="h-3 w-3 text-destructive" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border">
                <Button
                    onClick={onSendToChat}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    size="sm"
                >
                    <Send className="h-4 w-4 mr-2" />
                    Send to Chat for Automation
                </Button>
            </div>
        </div>
    );
}
