import confetti from 'canvas-confetti';

/**
 * Celebration Manager 🎊
 * Handles visual effects (confetti) and sound feedback for user achievements.
 */
export class CelebrationManager {

    // --- Visual Effects ---

    /**
     * Triggers a standard confetti explosion from the center.
     */
    static celebrateSuccess() {
        const count = 200;
        const defaults = {
            origin: { y: 0.7 }
        };

        function fire(particleRatio: number, opts: confetti.Options) {
            confetti(Object.assign({}, defaults, opts, {
                particleCount: Math.floor(count * particleRatio)
            }));
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });

        this.playSound('success');
    }

    /**
     * Triggers a "School Pride" dual-cannon confetti effect.
     */
    static celebrateLevelUp() {
        // Safe check for window
        if (typeof window === 'undefined') return;

        const duration = 3000;
        const end = Date.now() + duration;

        (function frame() {
            // launch a few confetti from the left edge
            confetti({
                particleCount: 7,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#FFD700', '#FF69B4'] // Gold & Pink
            });
            // and launch a few from the right edge
            confetti({
                particleCount: 7,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#4C97FF', '#0FBD8C'] // Blue & Green
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());

        this.playSound('levelup');
    }

    /**
     * Triggers a star burst effect.
     */
    static celebrateMagic() {
        const defaults = {
            spread: 360,
            ticks: 50,
            gravity: 0,
            decay: 0.94,
            startVelocity: 30,
            colors: ['FFE400', 'FFBD00', 'E89400', 'FFCA6C', 'FDFFB8']
        };

        function shoot() {
            confetti({
                ...defaults,
                particleCount: 40,
                scalar: 1.2,
                shapes: ['star']
            });

            confetti({
                ...defaults,
                particleCount: 10,
                scalar: 0.75,
                shapes: ['circle']
            });
        }

        setTimeout(shoot, 0);
        setTimeout(shoot, 100);
        setTimeout(shoot, 200);

        this.playSound('magic');
    }

    // --- Sound Effects ---

    static playSound(type: 'success' | 'levelup' | 'magic' | 'click') {
        // Placeholder for real sound assets
        // We will add actual MP3/WAV files in Phase 4
        console.log(`🎵 Sound Effect: ${type.toUpperCase()}`);

        // Simple beep for now using AudioContext if we wanted, 
        // but for now just logging is fine until assets are added.
    }
}
