/**
 * Test page for the new Minecraft 3D viewer
 * Access at: /minecraft-test
 */

import React from 'react';
import { MinecraftDirectEditor } from '@/components/minecraft/MinecraftDirectEditor';

export function MinecraftTestPage() {
    return (
        <div className="h-screen">
            <MinecraftDirectEditor
                appId="test"
                appPath="/test"
            />
        </div>
    );
}

export default MinecraftTestPage;
