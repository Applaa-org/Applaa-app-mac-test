/**
 * Audio Manager 🎵
 * Handles real audio playback for music blocks using Web Audio API.
 */

// Audio context singleton
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    return audioContext;
};

/** Resume AudioContext (call on user gesture, e.g. Run Code) so playback works. */
export async function resumeAudioContext(): Promise<void> {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
}

// Note frequencies (Hz) for C major scale
const NOTE_FREQUENCIES: Record<string, number> = {
    'C4': 261.63,
    'D4': 293.66,
    'E4': 329.63,
    'F4': 349.23,
    'G4': 392.00,
    'A4': 440.00,
    'B4': 493.88,
    'C5': 523.25,
};

// Drum sound types
type DrumType = 'SNARE' | 'BASS' | 'HIHAT' | 'CLAP' | 'CYMBAL';

// Play Sound block types (simple sfx + notes + drums)
type SimpleSoundType = 'MEOW' | 'WOOF' | 'BEEP' | 'MAGIC' | 'POP';

/**
 * Plays a musical note using Web Audio API oscillator
 */
export function playNote(note: string, duration: number = 0.5): void {
    const ctx = getAudioContext();
    const frequency = NOTE_FREQUENCIES[note] || 440;

    // Create oscillator
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine'; // Pure tone
    oscillator.frequency.value = frequency;

    // Attack-decay envelope
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05); // Attack
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);  // Decay
    gainNode.gain.linearRampToValueAtTime(0, now + duration); // Release

    oscillator.start(now);
    oscillator.stop(now + duration);

    console.log(`🎵 Playing note: ${note} (${frequency}Hz)`);
}

/**
 * Plays a drum sound using noise + filter
 */
export function playDrum(drumType: DrumType): void {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (drumType) {
        case 'SNARE':
            playSnare(ctx, now);
            break;
        case 'BASS':
            playBassDrum(ctx, now);
            break;
        case 'HIHAT':
            playHiHat(ctx, now);
            break;
        case 'CLAP':
            playClap(ctx, now);
            break;
        case 'CYMBAL':
            playCymbal(ctx, now);
            break;
        default:
            playSnare(ctx, now);
    }

    console.log(`🥁 Playing drum: ${drumType}`);
}

// --- Drum Synthesis ---

function playSnare(ctx: AudioContext, time: number): void {
    // Noise for snare body
    const noiseBuffer = createNoiseBuffer(ctx, 0.2);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseGain.gain.setValueAtTime(1, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    noiseSource.start(time);
    noiseSource.stop(time + 0.2);

    // Tone for snare "pop"
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
    oscGain.gain.setValueAtTime(0.7, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    osc.start(time);
    osc.stop(time + 0.1);
}

function playBassDrum(ctx: AudioContext, time: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);

    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    osc.start(time);
    osc.stop(time + 0.3);
}

function playHiHat(ctx: AudioContext, time: number): void {
    const noiseBuffer = createNoiseBuffer(ctx, 0.05);
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;

    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    source.start(time);
    source.stop(time + 0.05);
}

function playClap(ctx: AudioContext, time: number): void {
    // Multiple noise bursts for clap texture
    for (let i = 0; i < 3; i++) {
        const noiseBuffer = createNoiseBuffer(ctx, 0.02);
        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;

        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        const offset = i * 0.01;
        gain.gain.setValueAtTime(0.8, time + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, time + offset + 0.1);

        source.start(time + offset);
        source.stop(time + offset + 0.1);
    }
}

function playCymbal(ctx: AudioContext, time: number): void {
    const noiseBuffer = createNoiseBuffer(ctx, 0.5);
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;

    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

    source.start(time);
    source.stop(time + 0.5);
}

// Helper: Create white noise buffer
function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    return buffer;
}

/**
 * Plays a simple sound effect (Meow, Woof, Beep, Magic, Pop) using Web Audio synthesis.
 */
function playSimpleSound(type: SimpleSoundType): void {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (type) {
        case 'MEOW': {
            // Rising then falling "meow" (pitch sweep)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(800, now + 0.08);
            osc.frequency.linearRampToValueAtTime(500, now + 0.2);
            osc.frequency.linearRampToValueAtTime(300, now + 0.35);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.4, now + 0.02);
            gain.gain.linearRampToValueAtTime(0.25, now + 0.2);
            gain.gain.linearRampToValueAtTime(0, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;
        }
        case 'WOOF': {
            // Low "bark" burst
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
            break;
        }
        case 'BEEP': {
            // Short beep
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 880;
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
            gain.gain.linearRampToValueAtTime(0, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
            break;
        }
        case 'MAGIC': {
            // Sparkly ascending twinkle (3 quick notes)
            const notes = [523.25, 659.25, 783.99];
            notes.forEach((freq, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'sine';
                o.frequency.value = freq;
                o.connect(g);
                g.connect(ctx.destination);
                const t = now + i * 0.1;
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.3, t + 0.03);
                g.gain.linearRampToValueAtTime(0, t + 0.15);
                o.start(t);
                o.stop(t + 0.15);
            });
            break;
        }
        case 'POP': {
            // Quick "pop" (short noise burst)
            const buf = createNoiseBuffer(ctx, 0.06);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1500;
            src.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
            src.start(now);
            src.stop(now + 0.06);
            break;
        }
    }

    console.log(`🔊 Playing sound: ${type}`);
}

/**
 * Play any sound by id: simple (MEOW, WOOF, ...), note (C4–B4), or drum (SNARE, BASS, ...).
 * Used by the "Play Sound" block in School / Start Here & Art & Music.
 */
export function playSound(soundId: string): void {
    const simple: SimpleSoundType[] = ['MEOW', 'WOOF', 'BEEP', 'MAGIC', 'POP'];
    const drums: DrumType[] = ['SNARE', 'BASS', 'HIHAT', 'CLAP', 'CYMBAL'];

    if (simple.includes(soundId as SimpleSoundType)) {
        playSimpleSound(soundId as SimpleSoundType);
    } else if (NOTE_FREQUENCIES[soundId]) {
        playNote(soundId);
    } else if (drums.includes(soundId as DrumType)) {
        playDrum(soundId as DrumType);
    } else {
        console.warn(`Unknown sound: ${soundId}`);
    }
}

// Expose to global window for block execution
if (typeof window !== 'undefined') {
    (window as any).AudioManager = {
        playNote,
        playDrum,
        playSound,
    };
}

export const AudioManager = {
    playNote,
    playDrum,
    playSound,
    resumeAudioContext,
};
