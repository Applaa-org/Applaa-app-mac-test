export type BlockParams = Record<string, string | number | boolean>;

export interface LessonStep {
    title: string;
    description: string;
    blockImage: string; // Path to image in public folder
    blockType: string;
    toolboxCategory: string; // Name of the category in toolbox to highlight
    hint?: string;
    // Optional: logical check properties for future validation
    expectedBlockType?: string;
}

export interface Lesson {
    id: string;
    title: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    emoji: string;
    steps: LessonStep[];
    completed?: boolean;
}
