import printBlockImg from '@/assets/blocks/print_block.png';
import textBlockImg from '@/assets/blocks/text_block.png';
import playNoteBlockImg from '@/assets/blocks/play_note_block.png';
import createSpriteBlockImg from '@/assets/blocks/create_sprite_block.png';

export interface LessonStep {
    instruction: string;
    description: string;
    image?: string; // Placeholder for image path
    toolboxHighlight?: string; // Block type to glow in toolbox
    checkBlock?: string; // Block type to check for completion
}

export interface Lesson {
    id: string;
    title: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    tags?: string[]; // e.g., 'K5', 'Story', 'Game'
    steps: LessonStep[];
}

export const LESSONS: Lesson[] = [
    // ==========================================
    // MODULE 1: FIRST STEPS (Ages 5-7) 👶
    // Focus: Simple Events, Visual Feedback
    // ==========================================
    {
        id: 'k5_hello',
        title: '1. Hello Friend',
        description: 'Meet your first coding buddy!',
        difficulty: 'beginner',
        tags: ['K5', 'Basics'],
        steps: [
            {
                instruction: 'Open "Start Here"',
                description: 'Click the first category with the Star 🌟.',
                toolboxHighlight: 'category_first_code'
            },
            {
                instruction: 'Show a Character',
                description: 'Drag out the yellow "Show Character" block.',
                checkBlock: 'k5_show_character',
                toolboxHighlight: 'category_first_code'
            },
            {
                instruction: 'Pick a Pet',
                description: 'Click the dropdown and choose a Cat 🐱 or Dog 🐶.',
                checkBlock: 'k5_show_character'
            }
        ]
    },
    {
        id: 'k5_speak',
        title: '2. Make it Speak',
        description: 'Make your character say something.',
        difficulty: 'beginner',
        tags: ['K5', 'Basics'],
        steps: [
            {
                instruction: 'Get the Say Block',
                description: 'Find "Say Hello" in "Start Here".',
                toolboxHighlight: 'category_first_code'
            },
            {
                instruction: 'Connect It',
                description: 'Snap it under your Character block.',
                checkBlock: 'k5_character_say'
            },
            {
                instruction: 'Type a Message',
                description: 'Change "Hello" to your name!',
                checkBlock: 'k5_character_say'
            }
        ]
    },
    {
        id: 'k5_background',
        title: '3. Scene Change',
        description: 'Transport your character to a new place.',
        difficulty: 'beginner',
        tags: ['K5', 'Art'],
        steps: [
            {
                instruction: 'Find Background',
                description: 'Look for the "Background" block.',
                toolboxHighlight: 'category_first_code'
            },
            {
                instruction: 'Change the World',
                description: 'Drag it out and pick "Space" or "Forest".',
                checkBlock: 'k5_change_background'
            }
        ]
    },
    {
        id: 'k5_sound',
        title: '4. Noisy Fun',
        description: 'Add sound effects to your project.',
        difficulty: 'beginner',
        tags: ['K5', 'Sound'],
        steps: [
            {
                instruction: 'Play Sound',
                description: 'Find "Play Sound" and add it to your stack.',
                toolboxHighlight: 'category_first_code',
                checkBlock: 'k5_play_sound'
            }
        ]
    },
    {
        id: 'k5_celebrate',
        title: '5. Party Time',
        description: 'Finish with a celebration!',
        difficulty: 'beginner',
        tags: ['K5', 'Fun'],
        steps: [
            {
                instruction: 'Celebrate!',
                description: 'Find the "Celebrate" block for confetti.',
                toolboxHighlight: 'category_first_code',
                checkBlock: 'k5_celebrate'
            }
        ]
    },

    // ==========================================
    // MODULE 2: STORYTELLER (Ages 7-9) 📖
    // Focus: Sequencing, Text, Logic
    // ==========================================
    {
        id: 'k7_story_start',
        title: '6. My Story',
        description: 'Begin your adventure.',
        difficulty: 'beginner',
        tags: ['K7', 'Story'],
        steps: [
            {
                instruction: 'Open "Story Time"',
                description: 'Click the book icon category.',
                toolboxHighlight: 'category_story'
            },
            {
                instruction: 'Start Story',
                description: 'Drag out "Start Story" and give it a title.',
                checkBlock: 'k7_start_story'
            }
        ]
    },
    {
        id: 'k7_add_actors',
        title: '7. Casting Call',
        description: 'Add a hero and a villain.',
        difficulty: 'beginner',
        tags: ['K7', 'Story'],
        steps: [
            {
                instruction: 'Add Character',
                description: 'Use "Add Character" to create a Hero.',
                checkBlock: 'k7_add_character'
            },
            {
                instruction: 'Name Them',
                description: 'Give your hero a cool name.',
                checkBlock: 'k7_add_character'
            }
        ]
    },
    {
        id: 'k7_dialogue',
        title: '8. Inner Thoughts',
        description: 'Show what characters are thinking.',
        difficulty: 'intermediate',
        tags: ['K7', 'Story'],
        steps: [
            {
                instruction: 'Think Bubble',
                description: 'Use the "Think" block.',
                checkBlock: 'k7_character_think'
            },
            {
                instruction: 'Connect',
                description: 'Make sure the name matches your character!',
            }
        ]
    },
    {
        id: 'k7_movement',
        title: '9. Action!',
        description: 'Move characters across the stage.',
        difficulty: 'intermediate',
        tags: ['K7', 'Story'],
        steps: [
            {
                instruction: 'Move To',
                description: 'Use "Move Character to..."',
                checkBlock: 'k7_character_move_to'
            },
            {
                instruction: 'Pick Spot',
                description: 'Send them to the Left or Right.',
            }
        ]
    },
    {
        id: 'k7_ask',
        title: '10. Interactive',
        description: 'Ask the reader a question.',
        difficulty: 'intermediate',
        tags: ['K7', 'Logic'],
        steps: [
            {
                instruction: 'Ask Question',
                description: 'Use the "Ask Question" block.',
                checkBlock: 'k7_ask_question'
            }
        ]
    },

    // ==========================================
    // MODULE 3: MUSIC & ART (All Ages) 🎨
    // Focus: Creativity, Loops
    // ==========================================
    {
        id: 'art_music_1',
        title: '11. Piano Player',
        description: 'Code a melody.',
        difficulty: 'beginner',
        tags: ['Music'],
        steps: [
            {
                instruction: 'Music Category',
                description: 'Open "Art & Music".',
                toolboxHighlight: 'category_music'
            },
            {
                instruction: 'Play Note',
                description: 'Drag out "Play Note".',
                checkBlock: 'k7_play_note'
            }
        ]
    },
    {
        id: 'art_drums',
        title: '12. Drum Loop',
        description: 'Make a beat that repeats.',
        difficulty: 'intermediate',
        tags: ['Music', 'Loops'],
        steps: [
            {
                instruction: 'Repeat Block',
                description: 'Find "Repeat" in "Loop de Loop" (or Start Here).',
                checkBlock: 'controls_repeat_ext'
            },
            {
                instruction: 'Play Drum',
                description: 'Put "Play Drum" INSIDE the loop.',
                checkBlock: 'k7_play_drum'
            }
        ]
    },
    {
        id: 'art_shape',
        title: '13. Shape Artist',
        description: 'Draw geometric shapes.',
        difficulty: 'beginner',
        tags: ['Art'],
        steps: [
            {
                instruction: 'Draw Shape',
                description: 'Use "Draw Shape" to make a Circle.',
                checkBlock: 'k7_draw_shape'
            }
        ]
    },
    {
        id: 'art_sparkle',
        title: '14. Sparkle Magic',
        description: 'Add visual flair.',
        difficulty: 'beginner',
        tags: ['Art'],
        steps: [
            {
                instruction: 'Add Sparkle',
                description: 'Use the Sparkle block for effect.',
                checkBlock: 'k7_add_sparkle'
            }
        ]
    },

    // ==========================================
    // MODULE 4: GAME MAKER (Ages 9-11) 🎮
    // Focus: Logic, Variables, Physics
    // ==========================================
    {
        id: 'k9_spawn',
        title: '15. Game Hero',
        description: 'Create your main character.',
        difficulty: 'intermediate',
        tags: ['Game', 'K9'],
        steps: [
            {
                instruction: 'Open Arcade',
                description: 'Go to "Arcade Maker".',
                toolboxHighlight: 'category_game'
            },
            {
                instruction: 'Create Sprite',
                description: 'Use "Create Sprite" to make a Hero.',
                checkBlock: 'k9_create_sprite'
            }
        ]
    },
    {
        id: 'k9_pos',
        title: '16. Set Stage',
        description: 'Place your hero in the start signal.',
        difficulty: 'intermediate',
        tags: ['Game'],
        steps: [
            {
                instruction: 'Set Position',
                description: 'Use "Set Position x/y".',
                checkBlock: 'k9_set_position'
            }
        ]
    },
    {
        id: 'k9_control',
        title: '17. Controller',
        description: 'Move using arrow keys.',
        difficulty: 'advanced',
        tags: ['Game', 'Events'],
        steps: [
            {
                instruction: 'When Key Pressed',
                description: 'Drag out "When [Right] Key Pressed" (separate block!).',
                checkBlock: 'k9_on_key_press'
            },
            {
                instruction: 'Set Velocity',
                description: 'Put "Set Velocity" inside to move Right.',
                checkBlock: 'k9_set_velocity'
            }
        ]
    },
    {
        id: 'k9_gravity',
        title: '18. Gravity',
        description: 'Make a platformer game.',
        difficulty: 'advanced',
        tags: ['Game', 'Physics'],
        steps: [
            {
                instruction: 'Add Gravity',
                description: 'Use "Add Gravity" to pull the hero down.',
                checkBlock: 'k9_add_gravity'
            }
        ]
    },
    {
        id: 'k9_score',
        title: '19. High Score',
        description: 'Track player points.',
        difficulty: 'intermediate',
        tags: ['Game'],
        steps: [
            {
                instruction: 'Update Score',
                description: 'Use "Score [Add] 1 point".',
                checkBlock: 'k9_update_score'
            }
        ]
    },
    {
        id: 'k9_collision',
        title: '20. Crash!',
        description: 'Handle collisions.',
        difficulty: 'advanced',
        tags: ['Game', 'Events'],
        steps: [
            {
                instruction: 'On Collision',
                description: 'Use "When [Hero] touches [Coin]".',
                checkBlock: 'k9_on_collision'
            }
        ]
    }
];

/**
 * Lesson Manager 🎓
 * Handles active lesson state and progress.
 */
export class LessonManager {
    static getLessons(): Lesson[] {
        return LESSONS;
    }

    static getLessonById(id: string): Lesson | undefined {
        return LESSONS.find(l => l.id === id);
    }

    static getLessonsByTag(tag: string): Lesson[] {
        return LESSONS.filter(l => l.tags?.includes(tag));
    }
}
