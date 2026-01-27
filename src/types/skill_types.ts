export type ActionType =
    | 'navigate'
    | 'extract'
    | 'interact'
    | 'type'
    | 'click'
    | 'wait'
    | 'screenshot'
    | 'ai-enhance'
    | 'process'
    | 'compile'
    | 'output';

export interface ActionParams {
    [key: string]: any;
}

export interface WorkflowStep {
    id: string;
    name: string;
    action: ActionType;
    params: ActionParams;
    successCriteria?: {
        elementExists?: string;
        urlContains?: string;
        textContains?: string;
        timeout?: number;
    };
    fallback?: {
        action: ActionType;
        params: ActionParams;
    };
    reasoning?: string;
    kidFriendlyExplanation?: string;
}

export interface SkillMetadata {
    title: string;
    category: string;
    icon: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    ageRange: string;
    estimatedDuration: string;
    tags: string[];
    description: string;
    learningOutcomes: string[];
}

export interface SkillPrerequisites {
    browserState?: string;
    permissions?: string[];
    userInput?: {
        id: string;
        type: 'text' | 'select' | 'boolean';
        prompt: string;
        options?: string[];
        defaultValue?: any;
    }[];
}

export interface ReActConfig {
    enabled: boolean;
    maxIterations: number;
    observationPoints: string[];
    adaptationRules: {
        condition: string;
        reasoning: string;
        action: string;
        params?: any;
    }[];
}

export interface SkillPlan {
    id: string;
    version: string;
    createdBy: string;
    createdAt: string;
    metadata: SkillMetadata;
    objective: string;
    prerequisites?: SkillPrerequisites;
    workflow: {
        steps: WorkflowStep[];
    };
    reactLoop?: ReActConfig;
    errorHandling?: any;
    safety?: any;
}

export interface ExecutionState {
    skillId: string;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
    currentStepId?: string;
    variables: Record<string, any>; // Store extracted data and user inputs
    logs: string[];
    startTime?: number;
    endTime?: number;
    error?: string;
}
