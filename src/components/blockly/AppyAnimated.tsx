import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense } from 'react';
import { FBXLoader, GLTFLoader } from 'three-stdlib';
import * as THREE from 'three';
import { SpeechBubble } from './SpeechBubble';
import type { AppyPosition } from './appy/AppyMovement';

// Animation mapping for Best Meshy FBX files
const ANIMATION_FILES: Record<string, string> = {
    'Idle': 'Meshy_AI_Animation_Idle_11_withSkin',
    'Walking': 'Meshy_AI_Animation_Walking_withSkin',
    'Running': 'Meshy_AI_Animation_Running_withSkin',
    'TurnLeft': 'Meshy_AI_Animation_Walk_Turn_Left_withSkin',
    'TurnRight': 'Meshy_AI_Animation_Walk_Turn_Right_withSkin',
    'Explaining': 'Meshy_AI_Animation_Talk_with_Right_Hand_Open_withSkin',
    'Waving': 'Meshy_AI_Animation_Big_Wave_Hello_withSkin',
    'Talking': 'Meshy_AI_Animation_Talk_Passionately_withSkin',
    'Pointing': 'Meshy_AI_Animation_Talk_with_Right_Hand_Open_withSkin', // Reuse explaining for pointing
    // Fun Animations
    'Gangnam': 'Meshy_AI_Animation_Gangnam_Groove_withSkin',
    'HipHop': 'Meshy_AI_Animation_Hip_Hop_Dance_3_withSkin',
    'Dozing': 'Meshy_AI_Animation_Dozing_Elderly_withSkin'
};

// Meshy FBX Model with proper animation mixer AND dynamic color support
function AppyModel({ animation, setAnimation, facing, color }: { animation: string, setAnimation: (anim: string) => void, facing: string, color?: string }) {
    // Get correct filename
    const fileName = ANIMATION_FILES[animation] || ANIMATION_FILES['Idle'];
    // Resolve from the built JS location so routing path changes (/blockly) don't break asset fetches.
    const filePath = new URL(`../appy/meshy/${fileName}.fbx`, import.meta.url).toString();

    const groupRef = useRef<THREE.Group>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [fbx, setFbx] = useState<THREE.Group | null>(null);
    const [fallbackScene, setFallbackScene] = useState<THREE.Object3D | null>(null);

    // Load FBX in both dev and packaged builds.
    useEffect(() => {
        let cancelled = false;
        setFbx(null);

        console.log(`🎬 Loading Meshy BestFbx: ${fileName}`);
        const loader = new FBXLoader();
        loader.load(
            filePath,
            (loadedFbx) => {
                if (cancelled) return;
                setFbx(loadedFbx);
            },
            undefined,
            (error) => {
                if (cancelled) return;
                console.error(`❌ Failed to load ${filePath}:`, error);
            }
        );

        return () => {
            cancelled = true;
        };
    }, [fileName, filePath]);

    // Fallback model if FBX is unavailable.
    useEffect(() => {
        if (fbx) return; // Prefer animated model when available

        let cancelled = false;
        const glbPath = new URL('../appy/appy.glb', import.meta.url).toString();
        const loader = new GLTFLoader();

        loader.load(
            glbPath,
            (gltf) => {
                if (cancelled) return;
                setFallbackScene(gltf.scene);
            },
            undefined,
            (error) => {
                if (cancelled) return;
                console.error(`❌ Failed to load ${glbPath}:`, error);
                setFallbackScene(null);
            }
        );

        return () => {
            cancelled = true;
        };
    }, [fbx]);

    // Dynamic Color Application
    useEffect(() => {
        if (!fbx || !color) return;

        // Traverse and clone materials to avoid affecting other instances
        fbx.traverse((child: any) => {
            if (child.isMesh) {
                // Heuristic: identify body/suit mesh parts. Usually named 'Body', 'Suit', or generic mesh
                // For simplicity, we tint the entire skinned mesh or specific known parts if names are consistent
                // Meshy models often have one main mesh. We'll tint it.

                // Clone material to allow unique color per instance
                if (!child.userData.originalMaterial) {
                    child.userData.originalMaterial = child.material;
                }

                // Apply color tint while preserving textures
                const newMat = child.userData.originalMaterial.clone();
                newMat.color.set(color);
                child.material = newMat;
                console.log(`🎨 Applied color ${color} to mesh: ${child.name || 'unnamed mesh'}`);
            }
        });
    }, [fbx, color]);

    // Calibrated Rotation:
    // User confirmed: PI/2 = Right.
    // Therefore (assuming +90 deg rotation):
    // 0 = Front (South)
    // PI = Back (North)
    // -PI/2 = Left (West)
    useEffect(() => {
        if (groupRef.current) {
            let rotationY = 0;
            switch (facing) {
                case 'north': rotationY = Math.PI; break;       // Back
                case 'south': rotationY = 0; break;             // Front
                case 'east': rotationY = Math.PI / 2; break;    // Right
                case 'west': rotationY = -Math.PI / 2; break;   // Left
                default: rotationY = 0;
            }
            console.log(`🧭 Facing: ${facing}, RotationY: ${rotationY} (0=Front Test)`);
            groupRef.current.rotation.y = rotationY;
        }
    }, [facing]);

    // Random idle/dance behavior (Restored 5-10s timer)
    useEffect(() => {
        // Clear existing timer on animation change
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

        // Only schedule random dances if currently Idle
        if (animation === 'Idle') {
            const randomTime = Math.random() * 5000 + 5000;
            idleTimerRef.current = setTimeout(() => {
                const moves = ['Gangnam', 'HipHop', 'Dozing'];
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                setAnimation(randomMove);
            }, randomTime);
        } else if (['Gangnam', 'HipHop', 'Dozing'].includes(animation)) {
            // If dancing, go back to idle after one loop (approx 5-10s depending on clip)
            const danceTime = animation === 'Dozing' ? 5000 : 8000;
            idleTimerRef.current = setTimeout(() => {
                setAnimation('Idle');
            }, danceTime);
        }

        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [animation, setAnimation]);

    // Setup animation mixer (Standard Meshy logic)
    useEffect(() => {
        if (!fbx || !fbx.animations || fbx.animations.length === 0) return;

        const newMixer = new THREE.AnimationMixer(fbx);
        mixerRef.current = newMixer;

        const clip = fbx.animations[0];
        const action = newMixer.clipAction(clip);

        action.reset();
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = false;

        // One-shot animations that should return to idle when finished
        // Running and Walking should loop continuously
        if (['Waving', 'TurnLeft', 'TurnRight', 'Pointing', 'Talking'].includes(animation)) {
            action.loop = THREE.LoopOnce;
            action.clampWhenFinished = true;

            const onFinished = () => setAnimation('Idle');
            newMixer.addEventListener('finished', onFinished);
        }

        action.fadeIn(0.2).play();

        return () => {
            newMixer.stopAllAction();
        };
    }, [fbx, animation, fileName, setAnimation]);

    // Update mixer every frame
    useFrame((_, delta) => mixerRef.current?.update(delta));

    if (!fbx) {
        if (!fallbackScene) return null;
        return (
            <group ref={groupRef}>
                <primitive object={fallbackScene} scale={0.9} position={[0, -1, 0]} />
            </group>
        );
    }

    return (
        <group ref={groupRef}>
            <primitive object={fbx} scale={0.01} position={[0, -1, 0]} />
        </group>
    );
}

export interface AppyAnimatedRef {
    setAnimation: (animation: string) => void;
    setPosition: (position: AppyPosition) => void;
    speak: (message: string) => void;
}

interface AppyAnimatedProps {
    onQuickAction?: (action: string) => void;
    color?: string;
}

export const AppyAnimated = forwardRef<AppyAnimatedRef, AppyAnimatedProps>((props, ref) => {
    // Default to 'south' so he faces Front
    const [position, setPosition] = useState<AppyPosition>({ x: 85, y: 75, facing: 'south' });
    const currentPositionRef = useRef(position);
    const [transitionDuration, setTransitionDuration] = useState(0.5);

    const [currentAnimation, setCurrentAnimation] = useState<string>('Idle');
    const [showBubble, setShowBubble] = useState(false);
    const [bubbleMessage, setBubbleMessage] = useState('');

    // Timer refs to prevent race conditions
    const speechTimerRef = useRef<NodeJS.Timeout | null>(null);
    const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

    const speak = (message: string) => {
        // Clear any pending hide timer so bubble doesn't flicker off
        if (speechTimerRef.current) clearTimeout(speechTimerRef.current);

        setBubbleMessage(message);
        setShowBubble(true);
        setCurrentAnimation('Talking');

        // Set new timer to hide after 4 seconds
        speechTimerRef.current = setTimeout(() => {
            setCurrentAnimation('Idle');
            setShowBubble(false);
            speechTimerRef.current = null; // Clean up
        }, 4000);
    };

    useImperativeHandle(ref, () => ({
        setAnimation: (animation: string) => setCurrentAnimation(animation),
        setPosition: (newPosition: AppyPosition) => {
            const oldPos = currentPositionRef.current;
            // Don't update currentPositionRef yet - calculate distance first

            const dx = newPosition.x - oldPos.x;
            const dy = newPosition.y - oldPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Use Running for long distances, Walking for short
            const isLongDistance = distance > 30;
            const speed = isLongDistance ? 30 : 20; // Run faster than walk

            let duration = distance / speed;
            if (duration < 0.5) duration = 0.5;
            if (duration > 5) duration = 5; // Increased to allow longer movements

            setTransitionDuration(duration);

            if (distance > 5) {
                // Clear any existing animation timer
                if (animationTimerRef.current) {
                    clearTimeout(animationTimerRef.current);
                }

                // Choose animation based on distance
                const animName = isLongDistance ? 'Running' : 'Walking';
                console.log(`🎬 Setting animation to ${animName} for ${duration.toFixed(2)}s (distance: ${distance.toFixed(1)})`);
                setCurrentAnimation(animName);

                // Set new timer to stop animation after movement completes
                animationTimerRef.current = setTimeout(() => {
                    setCurrentAnimation('Idle');
                    animationTimerRef.current = null;
                    // Update position ref AFTER movement completes
                    currentPositionRef.current = newPosition;
                }, duration * 1000);
            } else {
                // For small movements (rotation only), update ref immediately
                currentPositionRef.current = newPosition;
            }

            setPosition(newPosition);
        },
        speak: speak
    }));

    const handleNameTagClick = () => {
        console.log('👆 Name tag clicked!');
        setBubbleMessage("Hi! I'm Appy! Let's code together! 👋");
        setShowBubble(true);
        setCurrentAnimation('Waving');
        setTimeout(() => setCurrentAnimation('Idle'), 2000);
    };

    return (
        <div style={{
            width: '200px',
            height: '250px',
            position: 'absolute',
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 1000,
            transition: `left ${transitionDuration}s linear, top ${transitionDuration}s linear`
        }}>
            <Canvas
                camera={{ position: [0, 0, 5], fov: 50 }}
                style={{ background: 'transparent' }}
            >
                <ambientLight intensity={1.2} />
                <directionalLight position={[5, 5, 5]} intensity={1.5} />
                <pointLight position={[-2, 2, 2]} intensity={0.8} color="#ffffff" />
                <Suspense fallback={null}>
                    <AppyModel
                        animation={currentAnimation}
                        setAnimation={setCurrentAnimation}
                        facing={position.facing || 'south'}
                        color={props.color}
                    />
                </Suspense>
            </Canvas>

            {/* Speech Bubble - Fixed Position: Forces bubble down to head level */}
            <div style={{ position: 'absolute', top: '80px', left: '0', width: '100%', zIndex: 999 }}>
                {showBubble && (
                    <SpeechBubble
                        message={bubbleMessage}
                        visible={showBubble}
                        position={{ x: 50, y: 0 }}
                    />
                )}
            </div>

            {/* Name tag */}
            <div
                onClick={handleNameTagClick}
                style={{
                    position: 'absolute',
                    bottom: '15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(1)'}
            >
                🤖 Appy
            </div>

            {/* Quick Action Buttons - beside Appy */}
            <div style={{
                position: 'absolute',
                bottom: '15px',
                left: '50%',
                transform: 'translateX(45px)', // Position to the right of name tag
                display: 'flex',
                gap: '6px',
                pointerEvents: 'auto'
            }}>
                {[
                    { icon: '▶️', color: '#4CAF50', label: 'Run', action: 'run-help' },
                    { icon: '❓', color: '#2196F3', label: 'Help', action: 'chat-help' },
                    { icon: '🎯', color: '#FF9800', label: 'Tour', action: 'tour' },
                    { icon: '🎨', color: '#9C27B0', label: 'Style', action: 'style' }
                ].map((btn, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            if (props.onQuickAction) {
                                props.onQuickAction(btn.action);
                            } else {
                                speak(`You clicked ${btn.label}!`);
                            }
                        }}
                        title={btn.label}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: '2px solid white',
                            backgroundColor: btn.color,
                            color: 'white',
                            fontSize: '14px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        {btn.icon}
                    </button>
                ))}
            </div>
        </div>
    );
});

AppyAnimated.displayName = 'AppyAnimated';
export default AppyAnimated;
