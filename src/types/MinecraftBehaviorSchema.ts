/**
 * Type definitions for Minecraft Bedrock behaviors
 * Used for actionable 3D preview with animations and interactive buttons
 */

export interface EntitySpawn {
    type: string;
    x: number;
    y: number;
    z: number;
    name?: string;
    role?: string;
}

export interface ActionButton {
    id: string;
    label: string;
    icon?: string;
    commands?: string[];
    animation?: 'explode' | 'build' | 'rotate';
    description?: string;
}

export interface ParticleEffect {
    type: string;
    x: number;
    y: number;
    z: number;
    continuous?: boolean;
    duration?: number;
}

export interface PreviewSettings {
    buildAnimation?: boolean;
    buildDuration?: number;
    autoRotate?: boolean;
    lighting?: 'day' | 'night' | 'sunset';
}

export interface MinecraftBehaviors {
    preview?: PreviewSettings;
    entities?: EntitySpawn[];
    actions?: ActionButton[];
    particles?: ParticleEffect[];
}

export interface BuildPlan {
    title: string;
    structure: {
        description: string;
        dimensions?: string;
        materials?: string[];
    };
    entities?: EntitySpawn[];
    actions?: ActionButton[];
    particles?: ParticleEffect[];
    approved?: boolean;
}

export interface MinecraftAsset {
    mcfunction: string;
    behaviors?: MinecraftBehaviors;
    plan?: BuildPlan;
}

export default MinecraftBehaviors;
