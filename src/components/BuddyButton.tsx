import React from 'react';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

/**
 * Applaa Buddy Button
 * Navigates to the browser with Applaa Buddy extension
 */
export const BuddyButton: React.FC = () => {
    const navigate = useNavigate();

    const handleLaunch = () => {
        // Navigate to browser-agent page where Buddy extension is loaded
        navigate({ to: '/browser-agent' });
    };

    return (
        <Button
            onClick={handleLaunch}
            className="gap-2"
        >
            <Bot className="h-4 w-4" />
            Open Buddy Browser
        </Button>
    );
};
