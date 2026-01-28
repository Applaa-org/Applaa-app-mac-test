import { Lesson } from '../types';

export const lessonOne: Lesson = {
    id: 'lesson-01-hello',
    title: 'Say Hello!',
    description: 'Learn how to make your character speak.',
    difficulty: 'beginner',
    emoji: '👋',
    steps: [
        {
            title: 'Start the Game',
            description: 'Every program needs a start! Find the "When Game Starts" block.',
            blockType: 'game_start',
            blockImage: '/learn/images/blocks/game_start.png',
            toolboxCategory: '🎮 Game',
            hint: 'Look in the Game category!'
        },
        {
            title: 'Make it Speak',
            description: 'Now let\'s make the character say something. Grab the "Speak" block.',
            blockType: 'applaa_speak',
            blockImage: '/learn/images/blocks/applaa_speak.png',
            toolboxCategory: '📝 Text',
            hint: 'Connect this block under "When Game Starts"'
        },
        {
            title: 'Type Hello',
            description: 'Click inside the text box and type "Hello World!"',
            blockType: 'text',
            blockImage: '/learn/images/blocks/text_hello.png',
            toolboxCategory: '📝 Text',
            hint: 'You might need a text block if it is missing!'
        },
        {
            title: 'Run It!',
            description: 'Click the Green "Run" button to see your code work!',
            blockType: 'run_button',
            blockImage: '/learn/images/ui/run_button.png',
            toolboxCategory: 'UI',
            hint: 'It is at the top of the screen!'
        }
    ]
};
