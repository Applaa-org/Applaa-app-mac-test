/**
 * ApplaaViewer3D - Core 3D Viewer Component
 * 
 * Reusable Three.js viewer for Applaa. Currently supports Minecraft voxel preview.
 * Designed to be extended with adapters for Roblox, Applaa Bit, Robotics in future.
 */

import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Stats } from '@react-three/drei';
import * as THREE from 'three';

// Block type to color mapping (Minecraft-style)
const BLOCK_COLORS: Record<string, string> = {
    'stone': '#8B8B8B',
    'cobblestone': '#7A7A7A',
    'dirt': '#8B6914',
    'grass_block': '#5D9631',
    'planks': '#BC9458',
    'oak_planks': '#BC9458',
    'spruce_planks': '#6B4423',
    'birch_planks': '#D5C98C',
    'wood': '#6B4423',
    'oak_log': '#6B4423',
    'glass': '#C0E4F0',
    'sand': '#E3D59E',
    'gravel': '#8A8A8A',
    'gold_block': '#FCEE4B',
    'iron_block': '#D8D8D8',
    'diamond_block': '#5ADFFA',
    'brick': '#9B4A3B',
    'wool': '#EEEEEE',
    'air': 'transparent',
    'default': '#808080'
};

// Props for a single voxel block
interface VoxelProps {
    position: [number, number, number];
    color: string;
}

// Single voxel block component
function Voxel({ position, color }: VoxelProps) {
    const meshRef = useRef<THREE.Mesh>(null);

    return (
        <mesh ref={meshRef} position={position}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={color} />
        </mesh>
    );
}

// Instanced voxels for better performance with many blocks
interface VoxelGridProps {
    blocks: Array<{ x: number; y: number; z: number; type: string }>;
}

function VoxelGrid({ blocks }: VoxelGridProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    const colorArray = useMemo(() => {
        return blocks.map(block => {
            const color = BLOCK_COLORS[block.type] || BLOCK_COLORS['default'];
            return new THREE.Color(color);
        });
    }, [blocks]);

    useMemo(() => {
        if (!meshRef.current) return;

        const tempObject = new THREE.Object3D();
        blocks.forEach((block, i) => {
            tempObject.position.set(block.x, block.y, block.z);
            tempObject.updateMatrix();
            meshRef.current!.setMatrixAt(i, tempObject.matrix);
            meshRef.current!.setColorAt(i, colorArray[i]);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true;
        }
    }, [blocks, colorArray]);

    if (blocks.length === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, blocks.length]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial />
        </instancedMesh>
    );
}

// Ground plane
function Ground() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial color="#4a7c32" />
        </mesh>
    );
}

// Main viewer props
export interface ApplaaViewer3DProps {
    blocks?: Array<{ x: number; y: number; z: number; type: string }>;
    showGrid?: boolean;
    showStats?: boolean;
    cameraPosition?: [number, number, number];
    onBlockClick?: (block: { x: number; y: number; z: number; type: string }) => void;
}

// Main 3D Viewer Component
export function ApplaaViewer3D({
    blocks = [],
    showGrid = true,
    showStats = false,
    cameraPosition = [10, 10, 10],
}: ApplaaViewer3DProps) {
    return (
        <div style={{ width: '100%', height: '100%', minHeight: '400px' }}>
            <Canvas
                camera={{ position: cameraPosition, fov: 50 }}
                shadows
                style={{ background: 'linear-gradient(to bottom, #87CEEB, #E0F6FF)' }}
            >
                <Suspense fallback={null}>
                    {/* Lighting */}
                    <ambientLight intensity={0.5} />
                    <directionalLight
                        position={[10, 20, 10]}
                        intensity={1}
                        castShadow
                        shadow-mapSize-width={2048}
                        shadow-mapSize-height={2048}
                    />

                    {/* Ground */}
                    <Ground />

                    {/* Grid helper */}
                    {showGrid && (
                        <Grid
                            args={[50, 50]}
                            cellSize={1}
                            cellThickness={0.5}
                            cellColor="#6b6b6b"
                            sectionSize={5}
                            sectionThickness={1}
                            sectionColor="#9d4b4b"
                            fadeDistance={50}
                            fadeStrength={1}
                            position={[0, 0.01, 0]}
                        />
                    )}

                    {/* Voxel blocks */}
                    <VoxelGrid blocks={blocks} />

                    {/* Camera controls */}
                    <OrbitControls
                        enablePan={true}
                        enableZoom={true}
                        enableRotate={true}
                        minDistance={5}
                        maxDistance={50}
                        target={[0, 2, 0]}
                    />

                    {/* Stats overlay for debugging */}
                    {showStats && <Stats />}
                </Suspense>
            </Canvas>
        </div>
    );
}

export default ApplaaViewer3D;
