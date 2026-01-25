/**
 * Appy Core Controller
 * Main AI teacher assistant that coordinates all subsystems
 */

import * as Blockly from 'blockly';
import { AppyDOMNavigator } from './AppyDOMNavigator';
import { BlocklyEventMonitor, type BlocklyEventData, type WorkspaceState } from './BlocklyEventMonitor';
import { AppyLLMIntegration, type AppyResponse, type UserGoal } from './AppyLLMIntegration';
import { IpcClient } from '@/ipc/ipc_client';

export interface UserContext {
    appCount: number;
    lastApp?: string;
    userName: string;
}

export class AppyCore {
    private domNavigator: AppyDOMNavigator;
    private eventMonitor: BlocklyEventMonitor;
    private llm: AppyLLMIntegration;
    private config: AppyConfig;
    private userContext: UserContext | null = null;

    private currentGoal: UserGoal | null = null;
    private currentStep: number = 0;
    private isTeaching: boolean = false;

    constructor(config: AppyConfig) {
        this.config = config;
        this.domNavigator = new AppyDOMNavigator();
        this.eventMonitor = new BlocklyEventMonitor();
        this.llm = new AppyLLMIntegration();
    }

    /**
     * Speak using Browser TTS with a kid-friendly voice
     */
    private speakWithVoice(text: string) {
        if (!('speechSynthesis' in window)) {
            console.warn('🔊 TTS not supported in this browser');
            return;
        }

        console.log(`🔊 Appy Speaking: "${text}"`);

        // Cancel existing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Find a suitable voice
        // Prefer "Junior", "Kid", "Samantha", or generally higher pitch voices
        const voices = window.speechSynthesis.getVoices();

        // DEBUG: List voices to see what's available
        if (voices.length === 0) {
            console.warn('🔊 No voices loaded yet. Retrying in 1s...');
            setTimeout(() => this.speakWithVoice(text), 1000); // Retry logic
            return;
        }

        const kidVoice = voices.find(v =>
            v.name.includes('Junior') ||
            v.name.includes('Samantha') ||
            v.name.includes('Google US English')
        );

        if (kidVoice) {
            utterance.voice = kidVoice;
            console.log(`🔊 Using voice: ${kidVoice.name}`);
        } else {
            console.log('🔊 Using default voice');
        }

        // Kid-like characteristics
        utterance.pitch = 1.2; // Higher pitch
        utterance.rate = 1.1;  // Slightly faster / more energetic
        utterance.volume = 1.0;

        window.speechSynthesis.speak(utterance);
    }


    /**
     * Initialize Appy with Blockly workspace
     */
    async initialize(workspace: Blockly.WorkspaceSvg) {
        // Start monitoring workspace events
        this.eventMonitor.initialize(workspace, (event) => {
            this.handleBlocklyEvent(event);
        });

        // Load user context
        await this.fetchUserContext();

        // Greet the user
        this.greet();
    }

    /**
     * Fetch user context from backend
     */
    private async fetchUserContext() {
        try {
            const client = IpcClient.getInstance();
            const { apps } = await client.listApps();
            // Assuming we can get user profile or default to 'Friend'
            // For now, we'll assume the user is "Friend" or try to find a name if stored

            this.userContext = {
                appCount: apps.length,
                lastApp: apps.length > 0 ? apps[0].name : undefined,
                userName: 'Friend'
            };
            console.log('🤖 Appy loaded context:', this.userContext);
        } catch (e) {
            console.error('Failed to load Appy context:', e);
            this.userContext = { appCount: 0, userName: 'Friend' };
        }
    }

    /**
     * Greet the user
     */
    private async greet() {
        this.config.onMoveTo({ x: 50, y: 50 });
        this.config.onAnimate('Waving');

        let message = "Hi! I'm Appy! I'll help you code! 👋";

        if (this.userContext && this.userContext.appCount > 0) {
            message = `Hi ${this.userContext.userName}! Wow, you have ${this.userContext.appCount} apps created! Let's make another one! 🚀`;
        }


        this.config.onSpeak(message);
        this.speakWithVoice(message);
    }

    // ... (rest of file)

    /**
     * Execute an LLM response
     */
    private async executeResponse(response: AppyResponse) {
        // Handle movement
        if (response.action === 'walk_to' && response.target) {
            const element = this.domNavigator.getElement(response.target);
            if (element) {
                const actualPos = this.domNavigator.getActualPosition(response.target);
                if (actualPos) {
                    this.config.onMoveTo(actualPos);
                } else {
                    this.config.onMoveTo(element.position);
                }
            }
        }

        // Handle animation
        const animation = this.getAnimationForEmotion(response.emotion);
        this.config.onAnimate(animation);

        // Speak the message
        this.config.onSpeak(response.message);
        this.speakWithVoice(response.message);

        // Show next steps if available
        if (response.nextSteps && response.nextSteps.length > 0) {
            setTimeout(() => {
                const stepsMessage = "Next steps:\n" + response.nextSteps!.map((s, i) => `${i + 1}. ${s}`).join('\n');
                this.config.onSpeak(stepsMessage);
                // Don't voice the long list of steps, just show them
            }, 3000);
        }
    }
    private async handleBlocklyEvent(event: BlocklyEventData) {
        switch (event.type) {
            case 'create':
                await this.onBlockCreate(event);
                break;
            case 'delete':
                await this.onBlockDelete(event);
                break;
            case 'move':
                await this.onBlockMove(event);
                break;
        }
    }

    /**
     * React to block creation
     */
    private async onBlockCreate(event: BlocklyEventData) {
        if (!event.workspaceState) return;

        // First block celebration
        if (event.isFirstBlock) {
            this.config.onMoveTo({ x: 55, y: 50 });
            this.config.onAnimate('Jumping Up');
            this.config.onSpeak("Amazing! Your first block! 🎉");
            return;
        }

        // If teaching, react to block additions
        if (this.isTeaching && this.currentGoal && event.blockType) {
            const response = await this.llm.reactToBlock(
                event.blockType,
                event.blockCategory || 'other',
                event.workspaceState,
                this.currentGoal
            );

            await this.executeResponse(response);
        }
    }

    /**
     * React to block deletion
     */
    private async onBlockDelete(event: BlocklyEventData) {
        // Optional: React to deletions
    }

    /**
     * React to block movement
     */
    private async onBlockMove(event: BlocklyEventData) {
        // Optional: React to movements
    }

    /**
     * User asks what they want to build
     * Example: "I want to make a prime number checker"
     */
    async startTeaching(userInput: string) {
        const lowerInput = userInput.toLowerCase();

        // 1. Check for interactive help (e.g. "Help me with Run")
        if (lowerInput.includes('help') || lowerInput.includes('explain') || lowerInput.includes('show') || lowerInput.includes('what is')) {
            // Try to find specific element
            const targetElement = this.domNavigator.findElementByKeyword(lowerInput);

            if (targetElement) {
                console.log(`🤖 Interactive Help: Found target '${targetElement.id}'`);
                this.navigateToElement(targetElement.id);
                return;
            }

            // Fallback to general tour if asking for help/tour generally
            if (lowerInput.includes('tour') || lowerInput.includes('around') || lowerInput.includes('guide')) {
                await this.startGuidedTour();
                return;
            }
        }

        const workspaceState = this.eventMonitor.getWorkspaceState();

        // Understand the goal
        this.config.onAnimate('Thinking');
        this.config.onSpeak("Let me think about that... 🤔");

        this.currentGoal = await this.llm.understandGoal(userInput, workspaceState);
        this.currentStep = 0;
        this.isTeaching = true;

        // Start teaching
        await this.provideNextStep();
    }

    /**
     * Start a guided tour of the interface
     */
    async startGuidedTour() {
        this.isTeaching = false; // Disable teaching mode during tour

        // Step 1: Intro
        this.config.onMoveTo({ x: 50, y: 50 });
        this.config.onAnimate('Waving');
        this.config.onSpeak("Hi! Welcome to Blocklaa! I'm Appy! Let me show you around! 🚀");
        await this.sleep(4000);

        // Step 2: Toolbar (Blocks)
        // Note: Coordinates are approximate percentage based on typical layout
        this.config.onMoveTo({ x: 20, y: 50 }); // Close to left toolbar
        await this.sleep(2000); // Wait for walk
        this.config.onAnimate('Explaining'); // Or Pointing
        this.config.onSpeak("This is the Toolbox! You can find all your coding blocks here. Just drag them out! 🧱");
        await this.sleep(5000);

        // Step 3: Workspace (Center)
        this.config.onMoveTo({ x: 50, y: 40 });
        await this.sleep(2000);
        this.config.onAnimate('Explaining');
        this.config.onSpeak("This big white space is your Workspace. Snap blocks together here to build your code! 🧩");
        await this.sleep(5000);

        // Step 4: Trash (Bottom Right)
        this.config.onMoveTo({ x: 80, y: 70 });
        await this.sleep(2000);
        this.config.onAnimate('Explaining');
        this.config.onSpeak("If you make a mistake, just drag blocks to the trash can down here! 🗑️");
        await this.sleep(4000);

        // Step 5: Run Button (Top Right)
        this.config.onMoveTo({ x: 80, y: 20 });
        await this.sleep(2000);
        this.config.onAnimate('Jumping Up');
        this.config.onSpeak("When you're ready, look for the Run button to see your code come to life! ▶️");
        await this.sleep(4000);

        // Step 6: Finish
        this.config.onMoveTo({ x: 85, y: 75 }); // Return to home
        await this.sleep(2000);
        this.config.onAnimate('Robot Hip Hop Dance'); // Celebration
        this.config.onSpeak("That's it! What do you want to build correctly? Just ask me! 🤖");
        await this.sleep(5000);

        // Back to idle
        this.config.onAnimate('Idle');
    }

    /**
     * Utility sleep function
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Provide the next step in the teaching process
     */
    private async provideNextStep() {
        if (!this.currentGoal || this.currentStep >= this.currentGoal.steps.length) {
            this.isTeaching = false;
            this.config.onAnimate('Robot Hip Hop Dance');
            this.config.onSpeak("You did it! Great job! 🎉");
            return;
        }

        const workspaceState = this.eventMonitor.getWorkspaceState();
        const response = await this.llm.provideGuidance(
            this.currentGoal,
            workspaceState,
            this.currentStep
        );

        await this.executeResponse(response);

        this.currentStep++;
    }

    /**
     * User asks a question
     */
    async answerQuestion(question: string) {
        const workspaceState = this.eventMonitor.getWorkspaceState();

        this.config.onAnimate('Thinking');

        const response = await this.llm.answerQuestion(question, workspaceState);
        await this.executeResponse(response);
    }

    /**
     * Execute an LLM response
     */
    private async executeResponse(response: AppyResponse) {
        // Handle movement
        if (response.action === 'walk_to' && response.target) {
            const element = this.domNavigator.getElement(response.target);
            if (element) {
                const actualPos = this.domNavigator.getActualPosition(response.target);
                if (actualPos) {
                    this.config.onMoveTo(actualPos);
                } else {
                    this.config.onMoveTo(element.position);
                }
            }
        }

        // Handle animation
        const animation = this.getAnimationForEmotion(response.emotion);
        this.config.onAnimate(animation);

        // Speak the message
        this.config.onSpeak(response.message);

        // Show next steps if available
        if (response.nextSteps && response.nextSteps.length > 0) {
            setTimeout(() => {
                const stepsMessage = "Next steps:\n" + response.nextSteps!.map((s, i) => `${i + 1}. ${s}`).join('\n');
                this.config.onSpeak(stepsMessage);
            }, 3000);
        }
    }

    /**
     * Get animation for emotion
     */
    private getAnimationForEmotion(emotion: string): string {
        switch (emotion) {
            case 'excited':
            case 'celebrating':
                return 'Jumping Up';
            case 'thinking':
                return 'Idle';
            case 'explaining':
                return 'Pointing';
            case 'encouraging':
                return 'Waving';
            case 'happy':
            default:
                return 'Idle';
        }
    }

    /**
     * Navigate to a specific UI element
     */
    navigateToElement(elementId: string) {
        const element = this.domNavigator.getElement(elementId);
        if (!element) return;

        const actualPos = this.domNavigator.getActualPosition(elementId);
        if (actualPos) {
            this.config.onMoveTo(actualPos);
        } else {
            this.config.onMoveTo(element.position);
        }

        this.config.onAnimate('Pointing');
        this.config.onSpeak(element.helpText);
    }

    /**
     * Get current teaching status
     */
    getTeachingStatus() {
        return {
            isTeaching: this.isTeaching,
            currentGoal: this.currentGoal,
            currentStep: this.currentStep,
            totalSteps: this.currentGoal?.steps.length || 0
        };
    }
}
