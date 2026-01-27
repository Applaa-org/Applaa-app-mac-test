export interface SampleProject {
    id: string;
    title: string;
    description: string;
    category: 'Tutorials' | 'Games' | 'Art' | 'Math' | 'Logic' | 'Music' | 'Science';
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    workspace: any; // Blockly JSON serialization
    guide?: {
        overview: string;
        steps: {
            title: string;
            explanation: string;
        }[];
    };
}

// Helper to create simple workspaces
const createWorkspace = (blocks: any[]) => ({
    "blocks": {
        "languageVersion": 0,
        "blocks": blocks
    }
});

export const SAMPLE_PROJECTS: SampleProject[] = [
    // --- 📚 TUTORIALS ---
    {
        id: 'tutorial_level_1',
        title: 'Level 1: The First Step',
        description: 'Learn how to move the robot forward.',
        category: 'Tutorials',
        difficulty: 'Beginner',
        workspace: createWorkspace([
            {
                "type": "game_start", "x": 50, "y": 50,
                "next": {
                    "block": {
                        "type": "applaa_log",
                        "inputs": { "MESSAGE": { "shadow": { "type": "text", "fields": { "TEXT": "💡 Instruction: Snap a 'Move Forward' block below me!" } } } },
                        "next": { "block": { "type": "maze_move_forward" } }
                    }
                }
            }
        ]),
        guide: {
            overview: "Welcome to coding! Your first mission is simple: Move the robot.",
            steps: [
                { title: "Start Block 🏁", explanation: "The 'Game Start' block runs when you click Play." },
                { title: "Move Block ⬆️", explanation: "The 'Move Forward' block makes the robot take one step." }
            ]
        }
    },
    {
        id: 'tutorial_level_2',
        title: 'Level 2: Looping Magic',
        description: 'Make the robot walk forever using a Loop.',
        category: 'Tutorials',
        difficulty: 'Beginner',
        workspace: createWorkspace([
            {
                "type": "game_start", "x": 50, "y": 50,
                "next": {
                    "block": {
                        "type": "controls_repeat_ext",
                        "inputs": {
                            "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 4 } } },
                            "DO": { "block": { "type": "maze_move_forward" } }
                        }
                    }
                }
            }
        ]),
        guide: {
            overview: "Tired of dragging blocks? Use a Loop to repeat actions!",
            steps: [
                { title: "Repeat Block 🔄", explanation: "This block repeats whatever is inside it 4 times." },
                { title: "Efficiency ⚡", explanation: "Loops save time and make your code shorter." }
            ]
        }
    },

    // --- 🕹️ ARCADE GAMES ---
    {
        id: 'arcade_snake_starter',
        title: '🐍 Snake: Starter',
        description: 'Create a snake that follows your commands.',
        category: 'Games',
        difficulty: 'Intermediate',
        workspace: createWorkspace([
            {
                "type": "game_start", "x": 50, "y": 50,
                "next": {
                    "block": {
                        "type": "k9_create_sprite", "fields": { "NAME": "Snake", "IMG": "HERO" }
                    }
                }
            },
            {
                "type": "k9_on_key_press", "x": 50, "y": 200, "fields": { "KEY": "UP" },
                "inputs": { "DO": { "block": { "type": "k9_set_velocity", "inputs": { "VX": { "shadow": { "type": "math_number", "fields": { "NUM": 0 } } }, "VY": { "shadow": { "type": "math_number", "fields": { "NUM": -5 } } } } } } }
            }
        ]),
        guide: {
            overview: "Build the classic Snake game! Start by making the hero move.",
            steps: [
                { title: "Create Snake 🐍", explanation: "Use 'Create Sprite' to make your hero." },
                { title: "Controls 🎮", explanation: "Use 'When Key Pressed' to change direction." }
            ]
        }
    },
    {
        id: 'arcade_pong',
        title: '🏓 Pong: 2 Player',
        description: 'A bouncing ball game for two players.',
        category: 'Games',
        difficulty: 'Advanced',
        workspace: createWorkspace([
            {
                "type": "game_start", "x": 50, "y": 50,
                "next": {
                    "block": {
                        "type": "k9_create_sprite", "fields": { "NAME": "Paddle1", "IMG": "PLATFORM" },
                        "next": {
                            "block": {
                                "type": "k9_create_sprite", "fields": { "NAME": "Ball", "IMG": "BALL" },
                                "next": {
                                    "block": {
                                        "type": "k9_set_bounciness", "inputs": { "BOUNCE": { "shadow": { "type": "math_number", "fields": { "NUM": 100 } } } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ]),
        guide: {
            overview: "Create a bouncing ball physics game!",
            steps: [
                { title: "Paddles 🧱", explanation: "Create sprites for paddles." },
                { title: "Physics ⚛️", explanation: "Set 'Bounciness' to 100% so the ball never stops!" }
            ]
        }
    },

    // --- 🎨 GENERATIVE ART ---
    {
        id: 'art_spiral_color',
        title: '🌈 Rainbow Spiral',
        description: 'Draw a colorful spiral that changes size.',
        category: 'Art',
        difficulty: 'Intermediate',
        workspace: createWorkspace([
            {
                "type": "game_start", "x": 50, "y": 50,
                "next": {
                    "block": {
                        "type": "controls_repeat_ext",
                        "inputs": {
                            "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 50 } } },
                            "DO": {
                                "block": {
                                    "type": "turtle_move",
                                    "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 10 } } } },
                                    "next": {
                                        "block": {
                                            "type": "turtle_turn",
                                            "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 15 } } } },
                                            "next": {
                                                "block": { "type": "k7_add_sparkle" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ]),
        guide: {
            overview: "Create trippy art with math!",
            steps: [
                { title: "Loop It 🔄", explanation: "Repeat 50 times to make a long path." },
                { title: "Turn Slightly 📐", explanation: "Turning 15 degrees creates a smooth curve." }
            ]
        }
    },
    {
        id: 'art_random_walk',
        title: '🎲 Random Walk',
        description: 'Let the turtle wander randomly.',
        category: 'Art',
        difficulty: 'Beginner',
        workspace: createWorkspace([
            {
                "type": "game_start", "x": 50, "y": 50,
                "next": {
                    "block": {
                        "type": "controls_repeat_ext",
                        "inputs": {
                            "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 100 } } },
                            "DO": {
                                "block": {
                                    "type": "turtle_turn",
                                    "inputs": { "VALUE": { "block": { "type": "math_random_int", "inputs": { "FROM": { "shadow": { "type": "math_number", "fields": { "NUM": 0 } } }, "TO": { "shadow": { "type": "math_number", "fields": { "NUM": 360 } } } } } } },
                                    "next": {
                                        "block": { "type": "turtle_move", "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 20 } } } } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ]),
        guide: {
            overview: "Art created by chance!",
            steps: [
                { title: "Random Turn 🎲", explanation: "Pick a random angle between 0 and 360." },
                { title: "Chaos Pattern 🕸️", explanation: "The turtle draws a chaotic, unique path every time." }
            ]
        }
    },

    // --- 🧮 MATH MAGIC ---
    {
        id: 'math_prime_check',
        title: '🔍 Prime Checker',
        description: 'Check if a number is Prime.',
        category: 'Math',
        difficulty: 'Advanced',
        workspace: createWorkspace([
            {
                "type": "variables_set", "x": 50, "y": 50,
                "fields": { "VAR": { "name": "num", "type": "" } },
                "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 13 } } } },
                "next": {
                    "block": {
                        "type": "applaa_log",
                        "inputs": { "MESSAGE": { "shadow": { "type": "text", "fields": { "TEXT": "Checking..." } } } }
                    }
                }
            }
        ]),
        guide: {
            overview: "Is 13 a prime number? Let's write code to find out.",
            steps: [
                { title: "Input 🔢", explanation: "Set a variable 'num' to test." },
                { title: "Logic 🧠", explanation: "Loop from 2 to num-1 to see if it divides evenly." }
            ]
        }
    },
    {
        id: 'math_factorial',
        title: '❗️ Factorial',
        description: 'Calculate 5! (5*4*3*2*1)',
        category: 'Math',
        difficulty: 'Intermediate',
        workspace: createWorkspace([
            {
                "type": "variables_set", "x": 50, "y": 50,
                "fields": { "VAR": { "name": "result", "type": "" } },
                "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 1 } } } },
                "next": {
                    "block": {
                        "type": "controls_for",
                        "fields": { "VAR": { "name": "i", "type": "" } },
                        "inputs": {
                            "FROM": { "shadow": { "type": "math_number", "fields": { "NUM": 1 } } },
                            "TO": { "shadow": { "type": "math_number", "fields": { "NUM": 5 } } },
                            "DO": {
                                "block": {
                                    "type": "math_change",
                                    "fields": { "VAR": { "name": "result", "type": "" } },
                                    "inputs": { "DELTA": { "block": { "type": "math_arithmetic", "fields": { "OP": "MULTIPLY" }, "inputs": { "B": { "block": { "type": "variables_get", "fields": { "VAR": { "name": "i", "type": "" } } } } } } } }
                                }
                            }
                        },
                        "next": {
                            "block": {
                                "type": "applaa_log",
                                "inputs": { "MESSAGE": { "block": { "type": "variables_get", "fields": { "VAR": { "name": "result", "type": "" } } } } }
                            }
                        }
                    }
                }
            }
        ]),
        guide: {
            overview: "Big numbers! Calculate factorials using a loop.",
            steps: [
                { title: "Start at 1 1️⃣", explanation: "Initialize result to 1." },
                { title: "Multiply Loop ✖️", explanation: "Multiply result by each number from 1 to 5." }
            ]
        }
    },

    // --- 🧪 SCIENCE LAB ---
    {
        id: 'sci_orbit',
        title: '🪐 Orbit Sim',
        description: 'Simulate a planet orbiting a star.',
        category: 'Science',
        difficulty: 'Advanced',
        workspace: createWorkspace([
            {
                "type": "game_start", "x": 50, "y": 50,
                "next": {
                    "block": {
                        "type": "k9_create_sprite", "fields": { "NAME": "Sun", "IMG": "BALL" },
                        "next": {
                            "block": {
                                "type": "k9_create_sprite", "fields": { "NAME": "Earth", "IMG": "HERO" },
                                "next": {
                                    "block": {
                                        "type": "k9_add_gravity", "fields": { "NAME": "Earth", "STR": 1 }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ]),
        guide: {
            overview: "Physics in action! Make a gravity simulation.",
            steps: [
                { title: "Gravity 🍎", explanation: "Apply gravity pulling the Earth towards the Sun." },
                { title: "Velocity 🚀", explanation: "Give Earth sideways speed to start orbiting." }
            ]
        }
    },
    {
        id: 'sci_color_mixer',
        title: '🎨 Color Mixer',
        description: 'Mix Red, Green, and Blue light.',
        category: 'Science',
        difficulty: 'Beginner',
        workspace: createWorkspace([
            {
                "type": "k5_change_background", "fields": { "COLOR": "#FF0000" }, "x": 50, "y": 50,
                "next": {
                    "block": {
                        "type": "k5_wait_seconds", "fields": { "SECONDS": 1 },
                        "next": {
                            "block": { "type": "k5_change_background", "fields": { "COLOR": "#00FF00" } }
                        }
                    }
                }
            }
        ]),
        guide: {
            overview: "See how computers make colors!",
            steps: [
                { title: "RGB 🔴🟢🔵", explanation: "Computers mix Red, Green, and Blue to make all colors." }
            ]
        }
    },

    // --- 🎹 MUSIC STUDIO ---
    {
        id: 'music_drum_machine',
        title: '🥁 Drum Machine',
        description: 'Create a beat loop.',
        category: 'Music',
        difficulty: 'Intermediate',
        workspace: createWorkspace([
            {
                "type": "game_start", "x": 50, "y": 50,
                "next": {
                    "block": {
                        "type": "controls_repeat_ext",
                        "inputs": {
                            "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 4 } } },
                            "DO": {
                                "block": {
                                    "type": "k7_play_drum", "fields": { "DRUM": "KICK" },
                                    "next": {
                                        "block": {
                                            "type": "k5_wait_seconds", "fields": { "SECONDS": 0.5 },
                                            "next": {
                                                "block": { "type": "k7_play_drum", "fields": { "DRUM": "SNARE" } }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ]),
        guide: {
            overview: "Boots and Cats! Make a drum beat.",
            steps: [
                { title: "Kick & Snare 🥁", explanation: "Alternate between Kick and Snare drums." },
                { title: "Timing ⏱️", explanation: "Use 'Wait' blocks to set the tempo." }
            ]
        }
    },
    {
        id: 'music_melody',
        title: '🎵 Melody Maker',
        description: 'Compose a simple song.',
        category: 'Music',
        difficulty: 'Beginner',
        workspace: createWorkspace([
            {
                "type": "game_start", "x": 50, "y": 50,
                "next": {
                    "block": {
                        "type": "k7_play_note", "fields": { "NOTE": "C4" },
                        "next": {
                            "block": {
                                "type": "k7_play_note", "fields": { "NOTE": "E4" },
                                "next": {
                                    "block": {
                                        "type": "k7_play_note", "fields": { "NOTE": "G4" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ]),
        guide: {
            overview: "Write your first song code!",
            steps: [
                { title: "Notes 🎼", explanation: "Stack Note blocks to play a melody." },
                { title: "Chords 🎹", explanation: "Remove 'Wait' blocks to play notes at the same time." }
            ]
        }
    },
    {
        id: 'arcade_breakout',
        title: '🧱 Breakout',
        description: 'Smash bricks with a paddle and ball.',
        category: 'Games',
        difficulty: 'Advanced',
        workspace: createWorkspace([
            {
                "type": "game_start", "x": 50, "y": 50,
                "next": {
                    "block": {
                        "type": "k9_create_sprite", "fields": { "NAME": "Paddle", "IMG": "PLATFORM" },
                        "next": {
                            "block": {
                                "type": "k9_set_position", "inputs": { "X": { "shadow": { "type": "math_number", "fields": { "NUM": 200 } } }, "Y": { "shadow": { "type": "math_number", "fields": { "NUM": 350 } } } },
                                "next": {
                                    "block": {
                                        "type": "k9_create_sprite", "fields": { "NAME": "Ball", "IMG": "BALL" }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                "type": "k9_on_key_press", "x": 50, "y": 300, "fields": { "KEY": "LEFT" },
                "inputs": { "DO": { "block": { "type": "k9_move_sprite", "fields": { "NAME": "Paddle", "DIR": "LEFT", "STEPS": 20 } } } }
            },
            {
                "type": "k9_on_key_press", "x": 300, "y": 300, "fields": { "KEY": "RIGHT" },
                "inputs": { "DO": { "block": { "type": "k9_move_sprite", "fields": { "NAME": "Paddle", "DIR": "RIGHT", "STEPS": 20 } } } }
            }
        ]),
        guide: {
            overview: "Classic arcade action! Break the bricks.",
            steps: [
                { title: "Paddle Control ↔️", explanation: "Use Left/Right keys to move the paddle." },
                { title: "Physics 💥", explanation: "The ball bounces off the paddle and bricks automatically." }
            ]
        }
    },
    {
        id: 'art_mandala',
        title: '🌺 Mandala Maker',
        description: 'Draw complex geometric patterns.',
        category: 'Art',
        difficulty: 'Intermediate',
        workspace: createWorkspace([
            {
                "type": "game_start", "x": 50, "y": 50,
                "next": {
                    "block": {
                        "type": "controls_repeat_ext",
                        "inputs": {
                            "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 12 } } },
                            "DO": {
                                "block": {
                                    "type": "k7_draw_shape", "fields": { "SHAPE": "CIRCLE" },
                                    "next": {
                                        "block": {
                                            "type": "turtle_turn",
                                            "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 30 } } } },
                                            "next": {
                                                "block": { "type": "k7_add_sparkle" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ]),
        guide: {
            overview: "Relax and create beautiful symmetry.",
            steps: [
                { title: "Symmetry ❄️", explanation: "Repeating a shape while turning creates a Mandala." },
                { title: "Sparkles ✨", explanation: "Add magic effects to make it shine!" }
            ]
        }
    }
];
