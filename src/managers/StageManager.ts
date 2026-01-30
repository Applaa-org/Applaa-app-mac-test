export interface Sprite {
    id: string;
    name: string;
    type: string; // 'HERO', 'ENEMY', 'COIN', etc.
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    scale: number;
    visible: boolean;
    image?: HTMLImageElement;
    text?: string; // For emoji/text sprites
    color?: string; // For text color
}

export interface Shape {
    id: string;
    type: 'SQUARE' | 'CIRCLE' | 'TRIANGLE' | 'STAR';
    x: number;
    y: number;
    color: string;
    size: number;
}

/**
 * Stage Manager 🎨
 * Handles the visual game stage, sprites, and rendering.
 */
export class StageManager {
    private static sprites: Sprite[] = [];
    private static shapes: Shape[] = [];
    private static background: string = '#FFFFFF';
    /** Latest output from "Say" / math blocks to show on Stage */
    private static outputLines: string[] = [];
    private static canvas: HTMLCanvasElement | null = null;
    private static ctx: CanvasRenderingContext2D | null = null;
    private static listeners: (() => void)[] = [];
    /** Called when two sprites overlap (nameA, nameB). Set by parent to postMessage to sandbox. */
    private static onCollision: ((nameA: string, nameB: string) => void) | null = null;

    static setOnCollision(cb: ((nameA: string, nameB: string) => void) | null) {
        this.onCollision = cb;
    }

    // --- State Management ---

    static setCanvas(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.startLoop();
    }

    static clearStage() {
        this.sprites = [];
        this.shapes = [];
        this.background = '#FFFFFF';
        this.outputLines = [];
        (this as any)._lastCollision = {};
        this.notifyListeners();
    }

    /** Show output from "Say" block (and math blocks) on the Stage. Keeps last few lines. */
    static showOutput(text: string) {
        const str = String(text).trim();
        if (!str) return;
        this.outputLines.push(str);
        // Keep last 5 lines so Stage doesn't get crowded
        if (this.outputLines.length > 5) this.outputLines = this.outputLines.slice(-5);
        this.notifyListeners();
    }

    static setBackground(color: string) {
        this.background = color;
        this.notifyListeners();
    }

    static addSprite(name: string, type: string) {
        // Remove existing if name matches (simple replacement)
        this.sprites = this.sprites.filter(s => s.name !== name);

        const sprite: Sprite = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            type,
            x: 200, // Center-ish
            y: 200,
            vx: 0,
            vy: 0,
            rotation: 0,
            scale: 1,
            visible: true
        };

        // Load image based on type (Placeholder logic)
        // In real app, we'd preload these
        const img = new Image();
        if (type === 'HERO') img.src = 'https://img.icons8.com/color/96/superman.png';
        else if (type === 'SNAKE') img.src = 'https://img.icons8.com/color/96/snake.png';
        else if (type === 'APPLE') img.src = 'https://img.icons8.com/color/96/apple.png';
        else if (type === 'ENEMY') img.src = 'https://img.icons8.com/color/96/ghost.png';
        else if (type === 'COIN') img.src = 'https://img.icons8.com/color/96/coin-wallet.png';
        else if (type === 'PLATFORM') img.src = 'https://img.icons8.com/color/96/brick-wall.png';
        else if (type === 'BALL') img.src = 'https://img.icons8.com/color/96/soccer-ball.png';
        else if (type.includes('http')) img.src = type; // Support custom URLs
        else {
            // Assume it's an emoji or text if not a known type
            sprite.text = type;
            sprite.color = 'black';
        }

        sprite.image = img;
        this.sprites.push(sprite);
        this.notifyListeners();
        console.log(`🎨 Stage: Added sprite ${name} (${type})`);
    }

    static setSpritePosition(name: string, x: number, y: number) {
        const sprite = this.sprites.find(s => s.name === name);
        if (sprite) {
            sprite.x = x;
            sprite.y = y;
            this.notifyListeners();
        }
    }

    static moveSprite(name: string, dx: number, dy: number) {
        const sprite = this.sprites.find(s => s.name === name);
        if (sprite) {
            sprite.x += dx;
            sprite.y += dy;
            this.notifyListeners();
        }
    }

    /** Set velocity (pixels per frame). Applied every frame in the render loop so the sprite keeps moving. */
    static setSpriteVelocity(name: string, vx: number, vy: number) {
        const sprite = this.sprites.find(s => s.name === name);
        if (sprite) {
            sprite.vx = vx;
            sprite.vy = vy;
            this.notifyListeners();
        }
    }

    static addShape(type: 'SQUARE' | 'CIRCLE' | 'TRIANGLE' | 'STAR', color: string = '#FF66CC') {
        const shape: Shape = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            x: Math.random() * 300 + 50, // Random pos
            y: Math.random() * 200 + 50,
            color,
            size: 50
        };
        this.shapes.push(shape);
        this.notifyListeners();
        console.log(`🎨 Stage: Drew ${type}`);
    }

    // --- Rendering Loop ---

    private static startLoop() {
        const loop = () => {
            if (this.canvas && this.ctx) {
                this.render(this.ctx);
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    private static render(ctx: CanvasRenderingContext2D) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        // Apply velocity each frame so sprites keep moving
        let moved = false;
        this.sprites.forEach(sprite => {
            if (sprite.vx !== 0 || sprite.vy !== 0) {
                sprite.x += sprite.vx;
                sprite.y += sprite.vy;
                // Wrap around stage edges (snake-style continuous play)
                if (sprite.x < -32) sprite.x = w + 32;
                if (sprite.x > w + 32) sprite.x = -32;
                if (sprite.y < -32) sprite.y = h + 32;
                if (sprite.y > h + 32) sprite.y = -32;
                moved = true;
            }
        });
        if (moved) this.notifyListeners();

        // Collision check: overlapping sprites (hitbox ~40px), debounced per pair
        if (this.onCollision && this.sprites.length >= 2) {
            const hit = 40;
            const now = Date.now();
            const debounceMs = 400;
            if (!(this as any)._lastCollision) (this as any)._lastCollision = {} as Record<string, number>;
            const lastCollision = (this as any)._lastCollision as Record<string, number>;
            for (let i = 0; i < this.sprites.length; i++) {
                for (let j = i + 1; j < this.sprites.length; j++) {
                    const a = this.sprites[i];
                    const b = this.sprites[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    if (dx * dx + dy * dy < hit * hit) {
                        const key = [a.name, b.name].sort().join('|');
                        if (now - (lastCollision[key] || 0) > debounceMs) {
                            lastCollision[key] = now;
                            this.onCollision(a.name, b.name);
                        }
                    }
                }
            }
        }

        // Clear
        ctx.fillStyle = this.background;
        ctx.fillRect(0, 0, w, h);

        // Grid (Optional help)
        this.drawGrid(ctx);

        // Shapes
        this.shapes.forEach(shape => {
            ctx.fillStyle = shape.color;
            ctx.beginPath();
            if (shape.type === 'SQUARE') {
                ctx.fillRect(shape.x - shape.size / 2, shape.y - shape.size / 2, shape.size, shape.size);
            } else if (shape.type === 'CIRCLE') {
                ctx.arc(shape.x, shape.y, shape.size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (shape.type === 'TRIANGLE') {
                ctx.moveTo(shape.x, shape.y - shape.size / 2);
                ctx.lineTo(shape.x + shape.size / 2, shape.y + shape.size / 2);
                ctx.lineTo(shape.x - shape.size / 2, shape.y + shape.size / 2);
                ctx.fill();
            } else if (shape.type === 'STAR') {
                // Simple star placeholder
                ctx.arc(shape.x, shape.y, shape.size / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'yellow';
                ctx.fillText("⭐", shape.x, shape.y);
            }
        });

        // Output from "Say" / math blocks (bottom of Stage)
        if (this.outputLines.length > 0) {
            const pad = 12;
            const lineHeight = 20;
            const totalH = this.outputLines.length * lineHeight + pad * 2;
            const y0 = ctx.canvas.height - totalH - 8;
            const w = Math.min(ctx.canvas.width - 24, 320);
            const x0 = (ctx.canvas.width - w) / 2;
            ctx.fillStyle = 'rgba(40, 44, 52, 0.95)';
            ctx.strokeStyle = 'rgba(100, 100, 100, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x0, y0, w, totalH, 10);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#E6E6E6';
            ctx.font = '16px system-ui, Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            this.outputLines.forEach((line, i) => {
                const y = y0 + pad + lineHeight / 2 + i * lineHeight;
                ctx.fillText(line.length > 40 ? line.slice(0, 37) + '...' : line, x0 + pad, y, w - pad * 2);
            });
        }

        // Sprites
        this.sprites.forEach(sprite => {
            if (!sprite.visible) return;

            ctx.save();
            ctx.translate(sprite.x, sprite.y);
            ctx.rotate((sprite.rotation * Math.PI) / 180);
            ctx.scale(sprite.scale, sprite.scale);

            if (sprite.image && sprite.image.complete && sprite.image.src) {
                // Draw centered
                ctx.drawImage(sprite.image, -32, -32, 64, 64);
            } else if (sprite.text) {
                // Draw Emoji/Text
                ctx.font = '48px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(sprite.text, 0, 0);
            } else {
                // Fallback shape
                ctx.fillStyle = 'red';
                ctx.beginPath();
                ctx.arc(0, 0, 20, 0, Math.PI * 2);
                ctx.fill();

                // Name label
                ctx.fillStyle = 'black';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(sprite.name, 0, 40);
            }

            ctx.restore();
        });
    }

    private static drawGrid(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        ctx.lineWidth = 1;

        for (let x = 0; x < ctx.canvas.width; x += 50) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ctx.canvas.height); ctx.stroke();
        }
        for (let y = 0; y < ctx.canvas.height; y += 50) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ctx.canvas.width, y); ctx.stroke();
        }
    }

    // --- Subscription ---
    static subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private static notifyListeners() {
        this.listeners.forEach(l => l());
    }

    static getItemCount(): number {
        return this.sprites.length + this.shapes.length + this.outputLines.length;
    }
}
