import React, { useRef, useEffect } from 'react';
import { StageManager } from '@/managers/StageManager';

interface StageComponentProps {
    width?: number;
    height?: number;
}

export const StageComponent: React.FC<StageComponentProps> = ({ width = 400, height = 400 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current) {
            // Initialize Manager
            StageManager.setCanvas(canvasRef.current);

            // Set initial size
            canvasRef.current.width = width;
            canvasRef.current.height = height;
        }
        return () => {
            // Stop render loop and clear canvas when stage is closed
            StageManager.unsetCanvas();
        };
    }, []);

    // Handle resize if props change
    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.width = width;
            canvasRef.current.height = height;
        }
    }, [width, height]);

    const [isEmpty, setIsEmpty] = React.useState(true);

    useEffect(() => {
        // Subscribe to changes to update empty state
        const unsubscribe = StageManager.subscribe(() => {
            setIsEmpty(StageManager.getItemCount() === 0);
        });
        return unsubscribe;
    }, []);

    return (
        <div style={{
            width: width,
            height: height,
            backgroundColor: '#fff',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            border: '4px solid #333',
            position: 'relative'
        }}>
            {/* Empty State Hint */}
            {isEmpty && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: '#9CA3AF',
                    pointerEvents: 'none'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '8px', opacity: 0.5 }}>🎨</div>
                    <div style={{ fontWeight: 'bold', fontSize: '18px' }}>The Stage</div>
                    <div style={{ fontSize: '13px' }}>Run your code to see magic happen!</div>
                </div>
            )}

            <canvas
                ref={canvasRef}
                style={{ display: 'block', position: 'relative', zIndex: 1 }}
            />

            {/* Coordinates overlay (optional) */}
            <div style={{
                position: 'absolute',
                bottom: '8px',
                right: '12px',
                backgroundColor: 'rgba(0,0,0,0.5)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '10px',
                pointerEvents: 'none',
                zIndex: 2
            }}>
                Stage: {width}x{height}
            </div>
        </div>
    );
};
