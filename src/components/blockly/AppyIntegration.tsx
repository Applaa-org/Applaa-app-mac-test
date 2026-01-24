/**
 * Appy Integration Wrapper
 * Connects AppyCore with BlocklyEditor and AppyAnimated
 */

import React, { useRef, useEffect, useState } from 'react';
import type * as Blockly from 'blockly';
import { AppyCore } from './appy/AppyCore';
import { AppyMovement, type AppyPosition } from './appy/AppyMovement';
import { AppyAnimated, type AppyAnimatedRef } from './AppyAnimated';
import { AppyChat } from './appy/AppyChat';
import { AppyQuickActions } from './appy/AppyQuickActions';

interface AppyIntegrationProps {
    workspace: Blockly.WorkspaceSvg | null;
}

export const AppyIntegration: React.FC<AppyIntegrationProps> = ({ workspace }) => {
    const appyRef = useRef<AppyAnimatedRef>(null);
    const appyCoreRef = useRef<AppyCore | null>(null);
    const movementRef = useRef<AppyMovement | null>(null);
    const [isTeaching, setIsTeaching] = useState(false);

    // Initialize Appy systems
    useEffect(() => {
        if (!workspace) return;

        // Create movement system
        movementRef.current = new AppyMovement({
            onAnimate: (animation: string) => {
                appyRef.current?.setAnimation(animation);
            },
            onPositionChange: (position: AppyPosition) => {
                appyRef.current?.setPosition(position);
            },
            walkSpeed: 100, // pixels per second
            runSpeed: 200,
            turnDuration: 300 // milliseconds
        });

        // Create Appy Core
        appyCoreRef.current = new AppyCore({
            onSpeak: (message: string) => {
                appyRef.current?.speak(message);
            },
            onAnimate: (animation: string) => {
                appyRef.current?.setAnimation(animation);
            },
            onMoveTo: async (position: { x: number; y: number }) => {
                await movementRef.current?.moveTo(position);
            }
        });

        // Initialize with workspace
        appyCoreRef.current.initialize(workspace);

        return () => {
            // Cleanup if needed
        };
    }, [workspace]);

    // Handle chat messages
    const handleChatMessage = async (message: string) => {
        if (!appyCoreRef.current) return;

        // All help, explain, show, and tour requests go through startTeaching
        // which now has smart routing for interactive help
        if (message.toLowerCase().includes('help') ||
            message.toLowerCase().includes('explain') ||
            message.toLowerCase().includes('show') ||
            message.toLowerCase().includes('tour') ||
            message.toLowerCase().includes('guide')) {
            await appyCoreRef.current.startTeaching(message);
            return;
        }

        // Check if it's a goal/teaching request
        if (message.toLowerCase().includes('want to') ||
            message.toLowerCase().includes('make') ||
            message.toLowerCase().includes('build') ||
            message.toLowerCase().includes('create')) {
            // Start teaching mode
            await appyCoreRef.current.startTeaching(message);
            setIsTeaching(true);
        } else {
            // Answer question
            await appyCoreRef.current.answerQuestion(message);
        }
    };

    // Update teaching status
    useEffect(() => {
        const interval = setInterval(() => {
            if (appyCoreRef.current) {
                const status = appyCoreRef.current.getTeachingStatus();
                setIsTeaching(status.isTeaching);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            {/* 3D Appy Character */}
            <AppyAnimated ref={appyRef} />

            {/* Quick Action Buttons for Appy */}
            <AppyQuickActions onAskHelp={handleChatMessage} />

            {/* Chat Interface */}
            <AppyChat
                onSendMessage={handleChatMessage}
                isTeaching={isTeaching}
            />
        </>
    );
};
