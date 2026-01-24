import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Suspense, useState, useEffect } from 'react';

function AppyModel() {
    // GLB file is in public/appy/ folder
    const { scene } = useGLTF('/appy/appy.glb');
    return <primitive object={scene} scale={1.5} position={[0, -1, 0]} />;
}

export function AppyViewer() {
    const [position, setPosition] = useState({ x: 85, y: 75 }); // Start bottom-right
    const [isWalking, setIsWalking] = useState(false);

    // Simple walking animation - move Appy around
    useEffect(() => {
        const walkInterval = setInterval(() => {
            setIsWalking(true);

            // Random walk pattern
            setPosition(prev => ({
                x: Math.max(10, Math.min(90, prev.x + (Math.random() - 0.5) * 10)),
                y: Math.max(10, Math.min(90, prev.y + (Math.random() - 0.5) * 10))
            }));

            setTimeout(() => setIsWalking(false), 2000);
        }, 8000); // Walk every 8 seconds

        return () => clearInterval(walkInterval);
    }, []);

    return (
        <div style={{
            width: '200px',
            height: '250px',
            position: 'absolute',
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none', // Don't block clicks on canvas
            zIndex: 1000,
            transition: isWalking ? 'all 2s ease-in-out' : 'none'
        }}>
            <Canvas
                camera={{ position: [0, 0, 5], fov: 50 }}
                style={{ background: 'transparent' }} // Transparent background!
            >
                <ambientLight intensity={0.8} />
                <directionalLight position={[5, 5, 5]} intensity={1.2} />
                <Suspense fallback={null}>
                    <AppyModel />
                    <OrbitControls
                        enableZoom={false}
                        enablePan={false}
                        autoRotate={!isWalking}
                        autoRotateSpeed={1}
                    />
                </Suspense>
            </Canvas>

            {/* Optional: Show name tag */}
            <div style={{
                position: 'absolute',
                bottom: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(102, 126, 234, 0.9)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                pointerEvents: 'auto',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
                🤖 Appy
            </div>
        </div>
    );
}
