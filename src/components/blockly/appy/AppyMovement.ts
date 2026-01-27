/**
 * Appy Movement System
 * Handles realistic 360° movement with directional awareness and turning
 */

export type Direction = 'north' | 'east' | 'south' | 'west';

export interface AppyPosition {
    x: number; // 0-100 (percentage of screen width)
    y: number; // 0-100 (percentage of screen height)
    facing: Direction;
}

export interface MovementConfig {
    onAnimate: (animation: string) => void;
    onPositionChange: (position: AppyPosition) => void;
    walkSpeed: number; // pixels per second
    runSpeed: number; // pixels per second
    turnDuration: number; // milliseconds
}

export class AppyMovement {
    private position: AppyPosition;
    private config: MovementConfig;
    private isMoving: boolean = false;

    constructor(config: MovementConfig, initialPosition?: AppyPosition) {
        this.config = config;
        this.position = initialPosition || {
            x: 85,
            y: 75,
            facing: 'west' // Start facing left
        };
    }

    /**
     * Move to target position with realistic turning
     */
    async moveTo(target: { x: number; y: number }, speed: 'walk' | 'run' = 'walk'): Promise<void> {
        if (this.isMoving) {
            console.warn('Appy is already moving');
            return;
        }

        this.isMoving = true;

        try {
            // 1. Calculate direction to target
            const targetDirection = this.calculateDirection(this.position, target);

            // 2. Turn to face target if needed
            if (targetDirection !== this.position.facing) {
                await this.turnToFace(targetDirection);
            }

            // 3. Walk to target
            await this.walkStraight(target, speed);

            // 4. Return to idle
            this.config.onAnimate('Idle');
        } finally {
            this.isMoving = false;
        }
    }

    /**
     * Calculate which direction to face based on target
     */
    private calculateDirection(from: AppyPosition, to: { x: number; y: number }): Direction {
        const dx = to.x - from.x;
        const dy = to.y - from.y;

        // Determine primary direction (favor horizontal movement)
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'east' : 'west';
        } else {
            return dy > 0 ? 'south' : 'north';
        }
    }

    /**
     * Turn to face a specific direction
     */
    private async turnToFace(targetDirection: Direction): Promise<void> {
        const directions: Direction[] = ['north', 'east', 'south', 'west'];
        const currentIndex = directions.indexOf(this.position.facing);
        const targetIndex = directions.indexOf(targetDirection);

        // Calculate shortest turn
        let turnCount = (targetIndex - currentIndex + 4) % 4;

        // Determine turn direction (clockwise or counter-clockwise)
        const turnRight = turnCount <= 2;
        if (!turnRight) {
            turnCount = 4 - turnCount;
        }

        // Execute turns
        for (let i = 0; i < turnCount; i++) {
            // Play turn animation
            const animation = turnRight ? 'TurnRight' : 'TurnLeft';
            this.config.onAnimate(animation);

            // Update facing direction
            if (turnRight) {
                const nextIndex = (currentIndex + i + 1) % 4;
                this.position.facing = directions[nextIndex];
            } else {
                const nextIndex = (currentIndex - i - 1 + 4) % 4;
                this.position.facing = directions[nextIndex];
            }

            // Wait for turn animation
            await this.sleep(this.config.turnDuration);
        }
    }

    /**
     * Walk straight to target
     */
    private async walkStraight(target: { x: number; y: number }, speed: 'walk' | 'run'): Promise<void> {
        // Calculate distance
        const dx = target.x - this.position.x;
        const dy = target.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate duration based on speed
        const pixelDistance = distance * 10; // Rough conversion
        const speedPxPerSec = speed === 'run' ? this.config.runSpeed : this.config.walkSpeed;
        const duration = (pixelDistance / speedPxPerSec) * 1000; // milliseconds

        // Play walking/running animation
        const animation = speed === 'run' ? 'Running' : 'Walking';
        this.config.onAnimate(animation);

        // Animate position change
        await this.animatePosition(target, duration);

        // Update position
        this.position.x = target.x;
        this.position.y = target.y;
    }

    /**
     * Smoothly animate position change
     */
    private animatePosition(target: { x: number; y: number }, duration: number): Promise<void> {
        return new Promise((resolve) => {
            const startX = this.position.x;
            const startY = this.position.y;
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Ease-in-out function
                const eased = progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

                const currentX = startX + (target.x - startX) * eased;
                const currentY = startY + (target.y - startY) * eased;

                this.config.onPositionChange({
                    x: currentX,
                    y: currentY,
                    facing: this.position.facing
                });

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            animate();
        });
    }

    /**
     * Get current position
     */
    getPosition(): AppyPosition {
        return { ...this.position };
    }

    /**
     * Set position without animation
     */
    setPosition(position: AppyPosition): void {
        this.position = position;
        this.config.onPositionChange(position);
    }

    /**
     * Get rotation angle for current facing direction
     */
    getRotationAngle(): number {
        switch (this.position.facing) {
            case 'north': return 0;
            case 'east': return 90;
            case 'south': return 180;
            case 'west': return 270;
        }
    }

    /**
     * Utility: sleep
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
