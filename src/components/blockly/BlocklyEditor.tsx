import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Blockly from 'blockly/core';
import * as En from 'blockly/msg/en'; // Import English language
import 'blockly/blocks'; // Import default blocks
import { initCustomBlocks } from './CustomBlocks'; // Import Custom Blocks
import { initK5Blocks } from './blocks/k5-starter-blocks'; // Import Starter Blocks
import { initK7Blocks } from './blocks/k7-story-blocks'; // Import Story Blocks
import { initK9Blocks } from './blocks/k9-game-blocks'; // Import Game Blocks
import { defineStemBlocks } from './blocks/stem-blocks'; // Import STEM Blocks
import { defineStemGenerators } from './generators/javascript/stem_generators'; // Import STEM Generators
// 🚀 OPTIMIZATION: Lazy load heavy components to improve initial load time
import { lazy, Suspense } from 'react';
const SampleHub = lazy(() => import('./SampleHub').then(m => ({ default: m.SampleHub })));
const RobotWelcome = lazy(() => import('./RobotWelcome').then(m => ({ default: m.RobotWelcome })));
const AppyAnimated = lazy(() => import('./AppyAnimated')); // Has default export
const AppyCustomizer = lazy(() => import('./appy/AppyCustomizer').then(m => ({ default: m.AppyCustomizer })));
import { aiBlockAssistant } from '@/services/AiBlockAssistant'; // Import AI Brain
import { MINECRAFT_TOOLBOX_CATEGORY, initMinecraftBlocks } from '@/lib/minecraft/minecraft-blocks'; // Import Minecraft Blocks
// Removed duplicate LearnPanel import
import { WorkspaceSearch } from '@blockly/plugin-workspace-search';
import { Backpack } from '@blockly/workspace-backpack';
import { ZoomToFitControl } from '@blockly/zoom-to-fit';
import { CelebrationManager } from '@/managers/CelebrationManager'; // Import Celebration Manager
import { BadgeManager } from '@/managers/BadgeManager'; // Import Badge Manager
import { AudioManager } from '@/managers/AudioManager'; // Import Audio Manager for music blocks

import { ChallengeManager, Challenge } from '@/managers/ChallengeManager'; // Import Challenge Manager
import { ChallengePanel } from './learning/ChallengePanel'; // Import Challenge Panel UI
import { StageManager } from '@/managers/StageManager'; // Import Stage Manager
import { StageComponent } from './visual/StageComponent'; // Import Stage UI
import { LearnPanel } from './learn/LearnPanel'; // Import Learn Panel

import { BadgeNotification } from './gamification/BadgeNotification'; // Import Badge Notification UI
import { BadgesPanel } from './gamification/BadgesPanel'; // Import Badges Panel UI
import { LessonManager } from '@/managers/LessonManager'; // Import Lesson Manager

// Import Generators
import { javascriptGenerator } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';
import { phpGenerator } from 'blockly/php';
import { luaGenerator } from 'blockly/lua';
import { dartGenerator } from 'blockly/dart';

// Set the locale
Blockly.setLocale(En as any);

/**
 * Applaa Custom Theme
 */
const APPLAA_THEME = Blockly.Theme.defineTheme('applaa', {
    name: 'applaa',
    base: Blockly.Themes.Classic,
    blockStyles: {
        logic_blocks: { colourPrimary: "#4C97FF", colourSecondary: "#CFE4FF", colourTertiary: "#3373CC" },
        loop_blocks: { colourPrimary: "#0FBD8C", colourSecondary: "#CBF0E6", colourTertiary: "#0B8E69" },
        math_blocks: { colourPrimary: "#59C059", colourSecondary: "#DDF4DD", colourTertiary: "#3E913E" },
        text_blocks: { colourPrimary: "#FFBF00", colourSecondary: "#FFF2CC", colourTertiary: "#CC9900" },
        list_blocks: { colourPrimary: "#FF6680", colourSecondary: "#FFCCD6", colourTertiary: "#CC3352" },
        variable_blocks: { colourPrimary: "#FF8C1A", colourSecondary: "#FFDDA6", colourTertiary: "#CC6A00" },
        procedure_blocks: { colourPrimary: "#9966FF", colourSecondary: "#E2D1FF", colourTertiary: "#774DCB" },
        colour_blocks: { colourPrimary: "#CF63CF", colourSecondary: "#EFD1EF", colourTertiary: "#BD42BD" }
    },
    categoryStyles: {
        logic_category: { colour: "#4C97FF" },
        loop_category: { colour: "#0FBD8C" },
        math_category: { colour: "#59C059" },
        text_category: { colour: "#FFBF00" },
        list_category: { colour: "#FF6680" },
        variable_category: { colour: "#FF8C1A" },
        procedure_category: { colour: "#9966FF" },
        colour_category: { colour: "#CF63CF" }
    },
    componentStyles: {
        workspaceBackgroundColour: "#F5F8FA",
        toolboxBackgroundColour: "#FFFFFF",
        toolboxForegroundColour: "#333333",
        flyoutBackgroundColour: "#FFFFFF",
        flyoutOpacity: 1,
        scrollbarColour: "#CCCCCC",
        scrollbarOpacity: 0.4
    },
    fontStyle: {
        family: "Fredoka, 'Segoe UI', cursive, sans-serif",
        weight: "bold",
        size: 12
    }
});

/**
 * Enhanced Applaa Toolbox for Kids
 */
const KIDS_TOOLBOX = {
    kind: 'categoryToolbox',
    contents: [
        {
            kind: 'category',
            name: '🌟 Start Here',
            toolboxitemid: 'category_first_code',
            categorystyle: 'loop_category',
            contents: [
                { kind: 'block', type: 'game_start' },
                { kind: 'block', type: 'k5_show_character' },
                { kind: 'block', type: 'k5_play_sound' },
                { kind: 'block', type: 'k5_wait_seconds' },
                { kind: 'block', type: 'k5_character_say' },
                { kind: 'block', type: 'k5_change_background' },
                { kind: 'block', type: 'k5_celebrate' }
            ]
        },
        {
            kind: 'category',
            name: '📖 Story Time',
            toolboxitemid: 'category_story',
            categorystyle: 'text_category',
            contents: [
                { kind: 'block', type: 'k7_start_story' },
                { kind: 'block', type: 'k7_add_character' },
                { kind: 'block', type: 'k7_character_says' },
                { kind: 'block', type: 'k7_character_think' },
                { kind: 'block', type: 'k7_character_move_to' },
                { kind: 'block', type: 'k7_ask_question' },
                { kind: 'block', type: 'applaa_speak' }
            ]
        },
        {
            kind: 'category',
            name: '🎨 Art & Music',
            toolboxitemid: 'category_music',
            categorystyle: 'colour_category',
            contents: [
                { kind: 'block', type: 'k7_play_note' },
                { kind: 'block', type: 'k7_play_drum' },
                { kind: 'block', type: 'k7_draw_shape' },
                { kind: 'block', type: 'k7_add_sparkle' },
                // Turtle basics
                { kind: 'block', type: 'turtle_move' },
                { kind: 'block', type: 'turtle_turn' }
            ]
        },
        {
            kind: 'category',
            name: '🕹️ Arcade Maker',
            toolboxitemid: 'category_game',
            categorystyle: 'variable_category',
            contents: [
                { kind: 'block', type: 'k9_create_sprite' },
                { kind: 'block', type: 'k9_set_position' },
                { kind: 'block', type: 'k9_move_sprite' },
                { kind: 'block', type: 'k9_update_score' },
                { kind: 'block', type: 'k9_on_key_press' },
                { kind: 'block', type: 'k9_add_gravity' },
                { kind: 'block', type: 'k9_set_velocity' },
                { kind: 'block', type: 'k9_on_collision' },
                { kind: 'block', type: 'k9_set_bounciness' }
            ]
        },
        {
            kind: 'sep',
        },
        {
            kind: 'category',
            name: '🧠 Logic Lab',
            toolboxitemid: 'category_logic',
            categorystyle: 'logic_category',
            contents: [
                { kind: 'block', type: 'controls_if' },
                { kind: 'block', type: 'logic_compare' },
                { kind: 'block', type: 'logic_operation' },
                { kind: 'block', type: 'logic_negate' },
                { kind: 'block', type: 'logic_boolean' }
            ]
        },
        {
            kind: 'category',
            name: '🔄 Loop de Loop',
            toolboxitemid: 'category_loops',
            categorystyle: 'loop_category',
            contents: [
                { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
                { kind: 'block', type: 'controls_whileUntil' },
                { kind: 'block', type: 'controls_for', inputs: { FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } }, BY: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } }
            ]
        },
        {
            kind: 'category',
            name: '🔬 Science Lab',
            toolboxitemid: 'category_stem',
            categorystyle: 'math_category',
            contents: [
                { kind: 'block', type: 'stem_plant_seed' },
                { kind: 'block', type: 'stem_water_plant', inputs: { WATER: { shadow: { type: 'math_number', fields: { NUM: 100 } } } } },
                { kind: 'block', type: 'stem_check_growth' },
                { kind: 'block', type: 'stem_start_reaction' },
                { kind: 'block', type: 'stem_heat_liquid' },
                { kind: 'block', type: 'stem_read_sensor' }
            ]
        },
        {
            kind: 'category',
            name: '🧮 Math Magic',
            toolboxitemid: 'category_math',
            categorystyle: 'math_category',
            contents: [
                { kind: 'block', type: 'math_number', fields: { NUM: 123 } },
                { kind: 'block', type: 'math_arithmetic' },
                { kind: 'block', type: 'math_random_int' },
                { kind: 'block', type: 'math_modulo' }
            ]
        },
        {
            kind: 'category',
            name: '📝 Words',
            toolboxitemid: 'category_text',
            categorystyle: 'text_category',
            contents: [
                { kind: 'block', type: 'text' },
                { kind: 'block', type: 'text_join' },
                { kind: 'block', type: 'applaa_log' }
            ]
        },
        {
            kind: 'sep',
        },
        {
            kind: 'category',
            name: '📦 Storage Box',
            categorystyle: 'variable_category',
            custom: 'VARIABLE'
        },
        {
            kind: 'category',
            name: '⚡ Super Powers',
            categorystyle: 'procedure_category',
            custom: 'PROCEDURE'
        }
    ]
};

interface BlocklyEditorProps {
    appId: number;
    initialWorkspace?: any;
    initialXml?: string;
    activeTab?: string;
    onWorkspaceChange?: (data: {
        workspaceJson: any;
        generatedCode: string;
        generatedCodeMap?: Record<string, string>;
    }) => void;
    onCodeChange?: (code: string) => void;
    onXmlChange?: (xml: string) => void;
    readOnly?: boolean;
    isLoading?: boolean;
}

/**
 * Blockly Editor Component
 * Provides a visual block-based programming interface for kids
 */
// Import Generators
// ... imports ...

export const BlocklyEditor: React.FC<BlocklyEditorProps> = ({
    appId,
    initialWorkspace,
    initialXml,
    readOnly = false,
    activeTab,
    onCodeChange,
    onXmlChange,
    onWorkspaceChange,
    isLoading
}) => {
    // Internal state for tabs if not controlled
    const [internalActiveTab, setInternalActiveTab] = useState(activeTab || 'blocks');
    const currentTab = activeTab || internalActiveTab;
    const setActiveTab = (tab: any) => setInternalActiveTab(tab);

    const [customLesson, setCustomLesson] = useState<any>(null); // For Hub Guides

    const blocklyDivRef = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
    const appyRef = useRef<any>(null); // Reference for Appy Animated
    const [isBadgesOpen, setIsBadgesOpen] = useState(false); // Badges Panel State
    const [isChallengePanelOpen, setIsChallengePanelOpen] = useState(false); // Challenge Panel State
    const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null); // Active Challenge
    const [isStageOpen, setIsStageOpen] = useState(false); // Stage Panel State
    const [isLearnPanelOpen, setIsLearnPanelOpen] = useState(false); // Learn Panel State
    const isRestoring = useRef(false); // Guard to prevent saving during load

    // State for Multi-Language Support
    type Tab = 'blocks' | 'javascript' | 'python' | 'php' | 'lua' | 'dart' | 'xml' | 'json';
    const [generatedCodeMap, setGeneratedCodeMap] = useState<Record<string, string>>({});

    const [generatedCode, setGeneratedCode] = useState<string>(''); // Keep for backward compat
    const [isRunning, setIsRunning] = useState(false);
    const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
    const [showTerminal, setShowTerminal] = useState(false); // Don't auto-open terminal
    const [isHubOpen, setIsHubOpen] = useState(false);
    const [lastSavedXml, setLastSavedXml] = useState<string>('');
    const [showWelcome, setShowWelcome] = useState(() => {
        return !localStorage.getItem('blocklaa-welcome-seen');
    });

    // Highlight Block in Toolbox Logic
    const handleHighlightBlock = (categoryName: string, blockType: string) => {
        if (!workspaceRef.current) return;

        // 1. Handle UI Elements (like Run Button)
        if (categoryName === 'UI') {
            // For UI elements, we can just let Appy speak
            if (appyRef.current) {
                appyRef.current.speak(`Look at the top for the ${blockType === 'run_button' ? 'Green Run Button' : 'button'}!`);
                appyRef.current.setAnimation('Pointing');
            }
            return;
        }

        // 2. Find and Select Category in Toolbox
        const toolbox = workspaceRef.current.getToolbox() as any;
        if (toolbox) {
            const items = toolbox.getToolboxItems();
            // Use getName() if available, fallback to name_ if accessing internal property
            const category = items.find((item: any) => {
                const name = item.getName ? item.getName() : item['name_'];
                // Compare loosely or strictly? Name usually matches the config string (with emoji)
                // We should handle the emoji part if the category name has it but our ID doesn't
                // But in this case, Learn Panel passes '📝 Text' which exactly matches.
                return name === categoryName;
            });

            if (category) {
                // Use setSelectedItem instead of selectItem
                if (toolbox.setSelectedItem) {
                    toolbox.setSelectedItem(category);
                } else if (toolbox.selectItem) {
                    toolbox.selectItem(category);
                }

                // 3. Optional: Appy points to the toolbox
                if (appyRef.current) {
                    appyRef.current.speak(`Here it is! Look in the ${categoryName} category!`);
                    appyRef.current.setPosition({ x: 20, y: 50, facing: 'west' }); // Move Appy near toolbox
                }
            } else {
                console.warn(`Category ${categoryName} not found in toolbox`);
                if (appyRef.current) {
                    appyRef.current.speak(`I couldn't find the ${categoryName} category. maybe checking the wrong place?`);
                }
            }
        }
    };


    // --- Toolbox Highlighting ---
    const highlightedCategoryId = useRef<string | null>(null);

    const handleHighlightCategory = useCallback((categoryId: string | null) => {
        const workspace = workspaceRef.current;
        if (!workspace) return;
        const toolbox = workspace.getToolbox();
        if (!toolbox) return;

        // Clear previous
        if (highlightedCategoryId.current) {
            const prevItem = (toolbox as any).getToolboxItemById(highlightedCategoryId.current);
            if (prevItem) {
                // @ts-ignore
                const div = prevItem.getDiv();
                if (div) div.classList.remove('toolbox-highlight');
            }
        }

        if (categoryId) {
            const item = (toolbox as any).getToolboxItemById(categoryId);
            if (item) {
                // @ts-ignore
                const div = item.getDiv();
                if (div) div.classList.add('toolbox-highlight');
                highlightedCategoryId.current = categoryId;

                // Auto-Open the Category 🚀
                // This makes the tour guide experience much better
                if ((toolbox as any).setSelectedItem) {
                    (toolbox as any).setSelectedItem(item);
                } else if ((toolbox as any).selectItem) {
                    (toolbox as any).selectItem(item);
                }
            }
        } else {
            highlightedCategoryId.current = null;
        }
    }, []);

    // Register Appy and Workspace with the AI Brain
    useEffect(() => {
        if (appyRef.current && workspaceRef.current) {
            aiBlockAssistant.setReferences(appyRef.current, workspaceRef.current);
            console.log("🧠 AI Block Assistant Connected");
        }
    }, [isHubOpen]); // Re-register if hub closes/opens or generally on mount

    // Listen for Sandbox Messages
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (!event.data) return;

            if (event.data.type === 'sandbox_log') {
                setConsoleLogs(prev => [...prev, `> ${event.data.message}`]);
                // Show all output in Appy's speech bubble (popup) like the learn section — including
                // tutorial output (Game Started!, Maze: Moved Forward, etc.) so Levels 1, 2 show pop-up output.
                const msg = event.data.message || '';
                if (msg && appyRef.current?.speak) {
                    appyRef.current.speak(msg);
                }
            } else if (event.data.type === 'sandbox_error') {
                setConsoleLogs(prev => [...prev, `❌ ${event.data.message}`]);

            } else if (event.data.type === 'AUDIO') {
                // Handle Audio proxy from sandbox
                if (event.data.action === 'playNote') {
                    AudioManager.playNote(event.data.note);
                } else if (event.data.action === 'playDrum') {
                    AudioManager.playDrum(event.data.drum);
                } else if (event.data.action === 'playSound') {
                    AudioManager.playSound(event.data.soundId);
                }

            } else if (event.data.type === 'STAGE') {
                // Handle Stage Manager proxy
                const { action } = event.data;
                if (action === 'addSprite') StageManager.addSprite(event.data.name, event.data.spriteType);
                else if (action === 'setPosition') StageManager.setSpritePosition(event.data.name, event.data.x, event.data.y);
                else if (action === 'moveSprite') StageManager.moveSprite(event.data.name, event.data.dx, event.data.dy);
                else if (action === 'setBackground') StageManager.setBackground(event.data.color);
                else if (action === 'addShape') StageManager.addShape(event.data.shapeType, event.data.color);
                else if (action === 'showOutput') StageManager.showOutput(event.data.text);

            } else if (event.data.type === 'CELEBRATION') {
                // Handle Celebration Manager proxy
                const { action } = event.data;
                if (action === 'success') CelebrationManager.celebrateSuccess();
                else if (action === 'magic') CelebrationManager.celebrateMagic();
                else if (action === 'levelup') CelebrationManager.celebrateLevelUp();

            } else if (event.data.type === 'BADGE') {
                // Handle Badge Manager proxy
                if (event.data.action === 'unlock') {
                    BadgeManager.unlockBadge(event.data.badgeId);
                }
            } else if (event.data.type === 'SPEECH') {
                // Handle Speech Manager proxy from sandbox
                if (event.data.action === 'speak' && event.data.text) {
                    // Use browser's speech synthesis API
                    if ('speechSynthesis' in window) {
                        const speakText = () => {
                            const utterance = new SpeechSynthesisUtterance(event.data.text);
                            // Try to find a kid-friendly voice
                            const voices = window.speechSynthesis.getVoices();
                            if (voices.length > 0) {
                                const kidVoice = voices.find(v =>
                                    v.name.includes('Junior') ||
                                    v.name.includes('Samantha') ||
                                    v.name.includes('Google US English') ||
                                    v.name.includes('Microsoft Zira')
                                );
                                if (kidVoice) {
                                    utterance.voice = kidVoice;
                                }
                            }
                            utterance.pitch = 1.2;
                            utterance.rate = 1.1;
                            utterance.volume = 1.0;
                            window.speechSynthesis.speak(utterance);
                            setConsoleLogs(prev => [...prev, `🔊 Speaking: ${event.data.text}`]);
                        };

                        // Wait for voices to load if needed
                        const voices = window.speechSynthesis.getVoices();
                        if (voices.length === 0) {
                            window.speechSynthesis.onvoiceschanged = () => {
                                speakText();
                                window.speechSynthesis.onvoiceschanged = null;
                            };
                        } else {
                            speakText();
                        }
                    } else {
                        setConsoleLogs(prev => [...prev, `⚠️ Speech synthesis not supported in this browser`]);
                    }
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // 🎨 Auto-Open Stage Logic
    useEffect(() => {
        const unsubscribe = StageManager.subscribe(() => {
            // If the stage has items and it's closed, open it to show the magic!
            if (StageManager.getItemCount() > 0 && !isStageOpen) {
                setIsStageOpen(true);
            }
        });
        return unsubscribe;
    }, [isStageOpen]); // Re-bind if isStageOpen changes to ensure we have fresh state


    useEffect(() => {
        // Inject Custom CSS for Kids Toolbox
        const styleId = 'blockly-kids-theme';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                /* Toolbox Container */
                .blocklyToolboxDiv {
                    background-color: #f0f7ff;
                    border-right: 2px solid #ddd;
                }
                
                /* Category Labels */
                .blocklyTreeLabel {
                    font-family: 'Fredoka', 'Comic Sans MS', sans-serif;
                    font-size: 16px;
                    padding: 8px 0;
                    font-weight: 500;
                }
                
                /* Category Rows */
                .blocklyTreeRow {
                    height: 50px !important;
                    line-height: 50px !important;
                    margin-bottom: 4px;
                    border-radius: 0 25px 25px 0;
                    border-left: 5px solid transparent;
                    transition: all 0.2s;
                    padding-left: 12px !important;
                }
                
                /* Selected State */
                .blocklyTreeSelected .blocklyTreeRow {
                    background-color: #e6f3ff !important;
                    border-left: 5px solid #4C97FF;
                    font-weight: bold;
                }
                
                /* Icons in categories (Emojis) */
                .blocklyTreeIcon {
                    display: none; /* Hide default dots if any */
                }
                
                /* Flyout Background */
                .blocklyFlyoutBackground {
                    fill: #f9fcff;
                    fill-opacity: 0.9;
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    // Code generation function (can be called manually)
    const generateAllCode = () => {
        if (!workspaceRef.current) return;

        try {
            // Safety Guard: Don't generate/save if restoring or loading
            if (isRestoring.current || isLoading) {
                console.log('🚧 Skipping save during restoration/loading');
                return;
            }

            // Check if workspace is empty - don't save empty workspaces
            // FIXED: We now allow empty saves as long as we are not restoring/loading
            // This fixes "Clear All" not saving, while isRestoring prevents "Blocks Gone" bug
            const allBlocks = workspaceRef.current.getAllBlocks(false);
            if (allBlocks.length === 0) {
                // Optional: keep logging for debug
                // console.log('Workspace is empty'); 
            }

            // Expose managers to window for block usage
            // Generate code for all languages
            console.log("DEBUG: Generating code for", allBlocks.length, "blocks");

            // Check if generator has the block definitions
            // @ts-ignore
            console.log("DEBUG: k7_play_drum generator exists?", !!javascriptGenerator.forBlock['k7_play_drum']);

            const codeJS = javascriptGenerator.workspaceToCode(workspaceRef.current);
            console.log("DEBUG: Generated JS Code length:", codeJS.length);
            console.log("DEBUG: Generated JS Code:", codeJS);

            // Wrap other generators in try/catch since custom blocks may not have generators for all languages
            let codePy = '';
            let codePHP = '';
            let codeLua = '';
            let codeDart = '';

            try {
                codePy = pythonGenerator.workspaceToCode(workspaceRef.current);
            } catch (e) {
                codePy = `# Python generator error: ${e}`;
            }
            try {
                codePHP = phpGenerator.workspaceToCode(workspaceRef.current);
            } catch (e) {
                codePHP = `// PHP generator error: ${e}`;
            }
            try {
                codeLua = luaGenerator.workspaceToCode(workspaceRef.current);
            } catch (e) {
                codeLua = `-- Lua generator error: ${e}`;
            }
            try {
                codeDart = dartGenerator.workspaceToCode(workspaceRef.current);
            } catch (e) {
                codeDart = `// Dart generator error: ${e}`;
            }

            // Serialize XML/JSON
            const xmlDom = Blockly.Xml.workspaceToDom(workspaceRef.current);
            const codeXML = Blockly.Xml.domToPrettyText(xmlDom);
            const json = JSON.stringify(Blockly.serialization.workspaces.save(workspaceRef.current), null, 2);

            const newCodeMap = {
                'javascript': codeJS,
                'python': codePy,
                'php': codePHP,
                'lua': codeLua,
                'dart': codeDart,
                'xml': codeXML,
                'json': json
            };

            setGeneratedCodeMap(newCodeMap);
            setGeneratedCode(codeJS); // Primary for execution

            if (onWorkspaceChange) {
                onWorkspaceChange({
                    workspaceJson: Blockly.serialization.workspaces.save(workspaceRef.current),
                    generatedCode: codeJS,
                    generatedCodeMap: newCodeMap
                });
            }
        } catch (error) {
            console.error('Error generating code:', error);
        }
    };

    useEffect(() => {
        if (!blocklyDivRef.current) return;

        // Initialize Applaa Custom Blocks
        initCustomBlocks();
        initK5Blocks();
        initK7Blocks();
        initK9Blocks();
        defineStemBlocks(); // Init STEM blocks 🔬
        defineStemGenerators(); // Init STEM generators

        // 🚀 EXPOSE MANAGERS TO GLOBAL SCOPE
        // This allows blocks (which run as strings) to call these functions
        // e.g. window.CelebrationManager.celebrateSuccess()
        // @ts-ignore
        window.CelebrationManager = CelebrationManager;
        // @ts-ignore
        window.BadgeManager = BadgeManager;
        // @ts-ignore
        window.StageManager = StageManager;
        // @ts-ignore
        console.log("🎨 Debug: StageManager exposed. drawShape exists?", typeof StageManager.drawShape);
        // @ts-ignore
        window.AudioManager = AudioManager;

        // Initialize Blockly workspace
        workspaceRef.current = Blockly.inject(blocklyDivRef.current, {
            toolbox: KIDS_TOOLBOX,
            grid: {
                spacing: 20,
                length: 3,
                colour: '#ccc',
                snap: true
            },
            zoom: {
                controls: true,
                wheel: true,
                startScale: 1.0,
                maxScale: 3,
                minScale: 0.3,
                scaleSpeed: 1.2
            },
            trashcan: true,
            sounds: false,
            readOnly: readOnly,
            theme: APPLAA_THEME,
            move: {
                scrollbars: true,
                drag: true,
                wheel: true
            }
        });

        // 🏅 BADGE LOGIC: Real-time checks
        workspaceRef.current.addChangeListener(() => {
            const workspace = workspaceRef.current;
            if (!workspace) return;

            const allBlocks = workspace.getAllBlocks(false);
            const blockCount = allBlocks.length;

            // 1. First Steps (Drag any block)
            if (blockCount > 0) {
                BadgeManager.unlockBadge('first_steps');
            }

            // 2. Loop Master (Use a loop block)
            const loopBlocks = ['controls_repeat_ext', 'controls_whileUntil', 'controls_for', 'controls_forEach'];
            if (allBlocks.some(b => loopBlocks.includes(b.type))) {
                BadgeManager.unlockBadge('loop_master');
            }

            // 3. Story Teller (3+ Character blocks)
            const charBlocks = allBlocks.filter(b => b.type === 'k7_add_character');
            if (charBlocks.length >= 3) {
                BadgeManager.unlockBadge('story_teller');
            }

            // 4. Game Dev (Create a sprite)
            if (allBlocks.some(b => b.type === 'k9_create_sprite')) {
                BadgeManager.unlockBadge('game_dev');
            }

            // 5. Maestro (5+ Note blocks)
            const noteBlocks = allBlocks.filter(b => b.type === 'k7_play_note' || b.type === 'k7_play_drum');
            if (noteBlocks.length >= 5) {
                BadgeManager.unlockBadge('musician');
            }
        });

        // Initialize Plugins

        // 1. Workspace Search
        const workspaceSearch = new WorkspaceSearch(workspaceRef.current);
        workspaceSearch.init();

        // 2. Backpack (Copy/Paste between workspaces)
        const backpackOptions = {
            allowEmptyBackpackOpen: true,
            useFilledBackpackImage: true,
            contextMenu: {
                emptyBackpack: true,
                removeFromBackpack: true,
                copyToBackpack: true,
            }
        };
        const backpack = new Backpack(workspaceRef.current, backpackOptions);
        backpack.init();

        // 3. Zoom to Fit
        const zoomToFit = new ZoomToFitControl(workspaceRef.current);
        zoomToFit.init();

        // Listen for workspace changes
        const changeListener = (e: any) => {
            // Precise Event Filtering to prevent stale code
            // We want to generate code on: BLOCK_CHANGE, BLOCK_MOVE, BLOCK_DELETE, VAR_*, etc.
            // We ignore: UI, CLICK, SELECTED, VIEWPORT_CHANGE
            if (e.type === Blockly.Events.UI ||
                e.type === Blockly.Events.CLICK ||
                e.type === Blockly.Events.SELECTED ||
                e.type === 'viewport_change' ||
                e.type === 'theme_change') {
                return;
            }

            // Debounce or just run? For safety, we run directly but wrapped in a microtask could be better
            // But let's keep it simple and reliable first.
            generateAllCode();
        };

        // Handle Resize to fix layout issues
        const resizeObserver = new ResizeObserver(() => {
            if (workspaceRef.current) {
                Blockly.svgResize(workspaceRef.current);
            }
        });
        resizeObserver.observe(blocklyDivRef.current);

        // Add change listener
        workspaceRef.current.addChangeListener(changeListener);

        // Listen for manual "Force Save" events from the parent UI
        const handleForceSave = () => {
            console.log("⚡ [EDITOR] Force Save triggered manually");
            generateAllCode();
        };
        window.addEventListener('force-save', handleForceSave);

        // Cleanup
        return () => {
            // Safety Guard: Prevent any saves during cleanup/disposal
            isRestoring.current = true;

            window.removeEventListener('force-save', handleForceSave);

            resizeObserver.disconnect();
            if (workspaceRef.current) {
                try {
                    workspaceRef.current.removeChangeListener(changeListener);
                    workspaceRef.current.dispose();
                } catch (e) {
                    console.error('Error disposing workspace:', e);
                }
                workspaceRef.current = null;
            }
        };
    }, [appId, readOnly]);

    // Unified Workspace Loader
    // Handles both initial load and subsequent prop updates
    useEffect(() => {
        if (!workspaceRef.current) return;

        // If no initial workspace is provided (new app), just ensure we are ready
        // But we must NOT clear if it's just undefined (which means "no data loaded yet" vs "empty")
        // However, in blockly.tsx, we pass 'workspace' which is null or object.

        try {
            const hasData = initialWorkspace && Object.keys(initialWorkspace).length > 0;

            if (hasData) {
                isRestoring.current = true;
                console.log('🔵 [LOADER] Loading workspace data...');

                // Clear before load to ensure clean state
                workspaceRef.current.clear();

                Blockly.serialization.workspaces.load(initialWorkspace, workspaceRef.current);
                console.log('✅ [LOADER] Workspace loaded successfully');

                // 🚀 OPTIMIZATION: Use requestAnimationFrame for faster, smoother loading
                // This allows the browser to render before generating code
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        isRestoring.current = false; // Disable guard
                        generateAllCode();
                        console.log('🟢 [LOADER] Ready for interaction');
                    }, 50); // Reduced to 50ms - just enough for DOM to settle
                });
            } else {
                console.log('⚪ [LOADER] No initial workspace data (New App or Cleared)');
                // No delay needed for empty workspace
                isRestoring.current = false;
                generateAllCode();
            }

        } catch (error) {
            isRestoring.current = false;
            console.error('❌ [LOADER] Failed to load workspace:', error);
        }
    }, [initialWorkspace]);


    const handleRunCode = () => {
        if (!generatedCode) {
            alert('No code to run! Add some blocks first.');
            return;
        }
        setIsRunning(true);
        setConsoleLogs([]); // Clear logs
        setShowTerminal(true); // Open terminal
        setIsStageOpen(true); // Open Stage so visual output shows (same as Learn section)

        // Resume AudioContext on user gesture so Play Sound / notes / drums can play
        void AudioManager.resumeAudioContext();

        const sandboxWindow = document.getElementById('blockly-sandbox') as HTMLIFrameElement;
        if (!sandboxWindow?.contentWindow) return;

        // Clear previous output and stage immediately
        sandboxWindow.contentWindow.postMessage({ type: 'clear' }, '*');
        StageManager.clearStage();

        // Defer run so Stage panel mounts and canvas is set before STAGE messages (addSprite/moveSprite) arrive.
        // This ensures the robot appears and moves on the Stage for Hub/Tutorial projects.
        const runCode = () => {
            try {
                sandboxWindow.contentWindow!.postMessage({
                    type: 'run',
                    code: generatedCode
                }, '*');
                setTimeout(() => setIsRunning(false), 500);
            } catch (error) {
                console.error('Failed to run code:', error);
                alert('Failed to run code. Check the console for details.');
                setIsRunning(false);
            }
        };
        requestAnimationFrame(() => requestAnimationFrame(runCode));
    };

    const handleLoadHubSample = (project: any) => {
        if (!workspaceRef.current) return;
        try {
            // Clear workspace first
            workspaceRef.current.clear();

            // Load the sample
            Blockly.serialization.workspaces.load(project.workspace, workspaceRef.current);

            // Load Guide if available — right panel shows "Guide: [title]" and steps (instruction + description)
            if (project.guide) {
                const guideLesson = {
                    id: `guide_${project.id}`,
                    title: `Guide: ${project.title}`,
                    description: project.guide.overview,
                    difficulty: project.difficulty.toLowerCase(),
                    steps: project.guide.steps.map((s: any) => ({
                        instruction: s.title,
                        description: s.explanation,
                        toolboxHighlight: null,
                        checkBlock: null
                    }))
                };
                setCustomLesson(guideLesson);
                setIsLearnPanelOpen(true);
            } else {
                setCustomLesson(null);
            }

            // Keep all blocks editable: ensure workspace is not read-only
            if (workspaceRef.current.options) {
                workspaceRef.current.options.readOnly = false;
            }

            // Regenerate code after load
            setTimeout(() => {
                generateAllCode();
            }, 100); // Small delay to ensure blocks are fully rendered

        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            console.error("Failed to load hub sample", err.message, err.stack, e);
            alert(`Failed to load sample. Please try again.${err.message ? ` (${err.message})` : ""}`);
        }
    };

    // Legacy simple sample loader (deprecated)
    const handleLoadSample = (sampleKey: string) => {
        if (!workspaceRef.current) return;

        if (confirm('Load sample? This will replace your current blocks.')) {
            const sample = SAMPLE_WORKSPACES[sampleKey as keyof typeof SAMPLE_WORKSPACES];
            if (sample) {
                try {
                    Blockly.serialization.workspaces.load(sample, workspaceRef.current);
                } catch (e) {
                    console.error("Failed to load sample", e);
                }
            }
        }
    };

    const handleClear = () => {
        if (workspaceRef.current) {
            if (confirm('Are you sure you want to clear all blocks?')) {
                workspaceRef.current.clear();
            }
        }
    };

    // Initialize Appy Core logic (simulated for now)
    const handleQuickAction = (action: string) => {
        if (!appyRef.current) return;

        if (action === 'run-help') {
            // Manual sequence for Run Help
            appyRef.current.speak("Let me show you how to run code! 🏃");
            // Move to run button (approximate position for now if we don't have full DOM nav)
            appyRef.current.setPosition({ x: 90, y: 10, facing: 'west' }); // Top Right
            setTimeout(() => {
                appyRef.current.speak("Click this Green Button to start your program! ▶️");
                appyRef.current.setAnimation('Pointing');
            }, 2000);
        } else if (action === 'tour') {
            // Tour sequence: Face movement direction while moving, face camera (south) while talking
            appyRef.current.speak("Follow me for a quick tour! 🚀");

            // Step 1: Move to Toolbox (moving left/west)
            setTimeout(() => {
                appyRef.current.setPosition({ x: 10, y: 50, facing: 'west' }); // Face direction of movement
            }, 2000);
            setTimeout(() => {
                appyRef.current.setPosition({ x: 10, y: 50, facing: 'south' }); // Turn to face camera
            }, 5000); // Wait for running to complete
            setTimeout(() => {
                appyRef.current.speak("Here is the Toolbox! Drag blocks from here. 🧱");
            }, 5500);

            // Step 2: Move to Workspace (moving right/east)
            setTimeout(() => {
                appyRef.current.setPosition({ x: 50, y: 50, facing: 'east' }); // Face direction of movement
            }, 8000);
            setTimeout(() => {
                appyRef.current.setPosition({ x: 50, y: 50, facing: 'south' }); // Turn to face camera
            }, 10000); // Wait for running to complete
            setTimeout(() => {
                appyRef.current.speak("Drop them here to build your code! 🧩");
            }, 10500);

            // Step 3: Move to Trash (moving right/east)
            setTimeout(() => {
                appyRef.current.setPosition({ x: 90, y: 90, facing: 'east' }); // Face direction of movement
            }, 14000);
            setTimeout(() => {
                appyRef.current.setPosition({ x: 90, y: 90, facing: 'south' }); // Turn to face camera
            }, 17000); // Wait for running to complete
            setTimeout(() => {
                appyRef.current.speak("Drag bad blocks here to delete them! 🗑️");
            }, 17500);

            // Step 4: Return Home (moving left/west)
            setTimeout(() => {
                appyRef.current.setPosition({ x: 85, y: 75, facing: 'west' }); // Face direction of movement
            }, 20000);
            setTimeout(() => {
                appyRef.current.setPosition({ x: 85, y: 75, facing: 'south' }); // Turn to face camera
            }, 22500); // Wait for walking to complete
            setTimeout(() => {
                appyRef.current.speak("That's it! easy right? 😄");
            }, 23000);
        } else if (action === 'chat-help') {
            appyRef.current.speak("Need more help? Click the 'Ask Appy' button below! 💬");
            // Wiggle
            appyRef.current.setAnimation('Wave');
        }
    };

    return (
        <div className="blockly-editor-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Robot Welcome - Lazy loaded */}
            <Suspense fallback={null}>
                <RobotWelcome
                    isFirstTime={showWelcome}
                    onComplete={() => setShowWelcome(false)}
                />
            </Suspense>

            {/* Learn Panel - interactive tutorials */}
            <LearnPanel
                isOpen={isLearnPanelOpen}
                onClose={() => setIsLearnPanelOpen(false)}
                onHighlightCategory={handleHighlightCategory}
                customLesson={customLesson}
            />

            {/* Appy the AI Teacher - Lazy loaded */}
            <Suspense fallback={null}>
                <AppyAnimated
                    ref={appyRef}
                    onQuickAction={handleQuickAction}
                />
            </Suspense>

            {/* Toolbar */}
            <div className="blockly-toolbar" style={{
                padding: '12px 16px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
                backgroundColor: 'white',
                flexWrap: 'wrap',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                justifyContent: 'space-between'
            }}>
                {/* LEFT: Discovery Group */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setIsLearnPanelOpen(!isLearnPanelOpen)}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: '#EEF2FF',
                            color: '#4F46E5',
                            border: '1px solid #C7D2FE',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                        title="Lesson Guide"
                    >
                        <span>🎓</span> <span>Learn</span>
                    </button>
                    <button
                        onClick={() => setIsHubOpen(true)}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: '#F3E8FF',
                            color: '#9333EA',
                            border: '1px solid #E9D5FF',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                        title="Project Hub"
                    >
                        <span>🚀</span> <span>Hub</span>
                    </button>
                    <button
                        onClick={() => setIsChallengePanelOpen(true)}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: '#E0F2FE',
                            color: '#0284C7',
                            border: '1px solid #BAE6FD',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                        title="Puzzles & Challenges"
                    >
                        <span>🧩</span> <span>Puzzles</span>
                    </button>
                </div>

                {/* CENTER: View Switcher */}
                <div style={{ display: 'flex', justifyContent: 'center', flexGrow: 1 }}>
                    <div style={{
                        display: 'flex',
                        backgroundColor: '#F3F4F6',
                        padding: '4px',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB'
                    }}>
                        <button
                            onClick={() => setActiveTab('blocks')}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: '600',
                                backgroundColor: currentTab === 'blocks' ? 'white' : 'transparent',
                                color: currentTab === 'blocks' ? '#111' : '#6B7280',
                                boxShadow: currentTab === 'blocks' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            🧱 Blocks
                        </button>
                        <div style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            marginLeft: '4px',
                            padding: '0 8px',
                            borderRadius: '6px',
                            backgroundColor: currentTab !== 'blocks' ? 'white' : 'transparent',
                            boxShadow: currentTab !== 'blocks' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s'
                        }}>
                            <span style={{ fontSize: '14px', marginRight: '6px' }}>📝</span>
                            <select
                                value={['javascript', 'python', 'php', 'lua', 'dart', 'xml', 'json'].includes(currentTab) ? currentTab : 'blocks'}
                                onChange={(e) => setActiveTab(e.target.value)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    padding: '6px 20px 6px 0',
                                    fontWeight: '600',
                                    color: currentTab !== 'blocks' ? '#111' : '#6B7280',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    appearance: 'none'
                                }}
                            >
                                <option value="blocks" style={{ display: 'none' }}>View Code</option>
                                <option value="javascript">JavaScript</option>
                                <option value="python">Python</option>
                                <option value="php">PHP</option>
                                <option value="lua">Lua</option>
                                <option value="dart">Dart</option>
                                <option value="xml">XML</option>
                                <option value="json">JSON</option>
                            </select>
                            <span style={{ position: 'absolute', right: '6px', pointerEvents: 'none', fontSize: '10px', color: '#888' }}>▼</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Actions */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                        onClick={() => setIsBadgesOpen(true)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '20px' }}
                        title="Badges"
                    >
                        🏆
                    </button>
                    <button
                        onClick={() => setIsStageOpen(!isStageOpen)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '20px', opacity: isStageOpen ? 1 : 0.5 }}
                        title="Toggle Stage"
                    >
                        🎨
                    </button>
                    <button
                        onClick={handleRunCode}
                        disabled={isRunning || readOnly}
                        style={{
                            padding: '8px 20px',
                            backgroundColor: '#10B981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isRunning ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)'
                        }}
                    >
                        <span>{isRunning ? '⏳' : '▶️'}</span>
                        <span>{isRunning ? 'Running...' : 'Run Code'}</span>
                    </button>
                    <button
                        onClick={() => setShowTerminal(!showTerminal)}
                        style={{
                            padding: '10px',
                            backgroundColor: showTerminal ? '#1F2937' : '#F3F4F6',
                            color: showTerminal ? 'white' : '#4B5563',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Toggle Terminal"
                    >
                        🖥️
                    </button>
                    <div style={{ width: '1px', height: '24px', backgroundColor: '#E5E7EB' }}></div>
                    <button
                        onClick={handleClear}
                        style={{
                            padding: '8px',
                            backgroundColor: 'transparent',
                            color: '#EF4444',
                            border: '1px solid #FECACA',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                        title="Clear Workspace"
                    >
                        🗑️
                    </button>
                </div>
            </div>


            {/* Blockly Workspace or Code View */}
            <div style={{ flex: 1, position: 'relative', minHeight: '400px' }}>

                {/* 🏆 Gamification Layers */}
                <BadgeNotification />
                {isBadgesOpen && <BadgesPanel onClose={() => setIsBadgesOpen(false)} />}
                {isChallengePanelOpen && (
                    <ChallengePanel
                        onClose={() => setIsChallengePanelOpen(false)}
                        onStartChallenge={(challenge) => {
                            setActiveChallenge(challenge);
                            handleClear(); // Start fresh for challenge
                            // Ideally load startBlocks here if they exist
                        }}
                    />
                )}

                {/* 🧩 Active Challenge Widget */}
                {activeChallenge && (
                    <div style={{
                        position: 'absolute',
                        top: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'white',
                        padding: '12px 24px',
                        borderRadius: '30px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        zIndex: 50,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        border: '2px solid #4C97FF'
                    }}>
                        <div>
                            <div style={{ fontSize: '10px', color: '#4C97FF', fontWeight: 'bold', textTransform: 'uppercase' }}>Current Goal</div>
                            <div style={{ fontWeight: 'bold', color: '#333' }}>{activeChallenge.goal}</div>
                        </div>
                        <button
                            onClick={() => {
                                if (workspaceRef.current) {
                                    const passed = ChallengeManager.validateChallenge(activeChallenge.id, workspaceRef.current);
                                    if (passed) {
                                        setTimeout(() => setActiveChallenge(null), 3000);
                                    } else {
                                        alert("Not quite! Try again. 🤔");
                                    }
                                }
                            }}
                            style={{
                                backgroundColor: '#4C97FF',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Check Solution
                        </button>
                        <button
                            onClick={() => setActiveChallenge(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '16px' }}
                        >✕</button>
                    </div>
                )}

                {/* 🎨 Live Preview Stage (Floating) */}
                {isStageOpen && (
                    <div style={{
                        position: 'absolute',
                        top: '80px',
                        right: '20px',
                        zIndex: 40,
                        animation: 'slideInRight 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}>
                        <StageComponent width={400} height={300} />

                        <button
                            onClick={() => setIsStageOpen(false)}
                            style={{
                                position: 'absolute',
                                top: '-10px',
                                right: '-10px',
                                background: '#FF6680',
                                color: 'white',
                                border: '3px solid white',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                            }}
                        >
                            ✕
                        </button>
                        <style>{`
                            @keyframes slideInRight {
                                from { transform: translateX(100%); opacity: 0; }
                                to { transform: translateX(0); opacity: 1; }
                            }
                        `}</style>
                    </div>
                )}



                {/* Visual Editor */}
                <div
                    ref={blocklyDivRef}
                    className="w-full h-full"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: currentTab === 'blocks' ? 'block' : 'none'
                    }}
                />

                {/* Code View (Split Layout) */}
                {currentTab !== 'blocks' && (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        backgroundColor: '#1E1E1E'
                    }}>
                        {/* Source Code Panel */}
                        <div style={{
                            flex: 1,
                            padding: '16px',
                            color: '#d4d4d4',
                            overflow: 'auto',
                            fontFamily: 'Consolas, Monaco, monospace',
                            fontSize: '14px',
                            borderRight: '1px solid #333'
                        }}>
                            <div style={{ color: '#888', marginBottom: '8px', borderBottom: '1px solid #333', paddingBottom: '4px' }}>
                                📄 Source Code ({currentTab})
                            </div>
                            {/* Show friendly error banner if code generation failed for this language */}
                            {generatedCodeMap[currentTab]?.includes('generator error') && (
                                <div style={{
                                    backgroundColor: '#3D2E00',
                                    border: '1px solid #665500',
                                    borderRadius: '8px',
                                    padding: '12px 16px',
                                    marginBottom: '12px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px'
                                }}>
                                    <span style={{ fontSize: '24px' }}>⚠️</span>
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: '#FFD93D', marginBottom: '4px' }}>
                                            Some blocks are not supported in {currentTab.toUpperCase()}
                                        </div>
                                        <div style={{ color: '#CCAA00', fontSize: '12px', lineHeight: '1.5' }}>
                                            The custom blocks you're using (like Music, Story, or Game blocks)
                                            only generate <strong>JavaScript</strong> code. Switch to the
                                            <strong> JavaScript</strong> tab to see the working code!
                                        </div>
                                    </div>
                                </div>
                            )}
                            <pre style={{ margin: 0 }}>{generatedCodeMap[currentTab] || '// No code generated'}</pre>
                        </div>

                        {/* Side-by-Side Output Panel */}
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            backgroundColor: '#151515',
                            borderLeft: '1px solid #333'
                        }}>
                            <div style={{
                                padding: '8px 16px',
                                backgroundColor: '#252526',
                                borderBottom: '1px solid #333',
                                color: '#CCC',
                                fontSize: '12px',
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}>
                                <span>🚀 Execution Output</span>
                                <button onClick={() => setConsoleLogs([])} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#AAA', fontSize: '11px' }}>🚫 Clear</button>
                            </div>
                            <div style={{
                                flex: 1,
                                padding: '16px',
                                overflowY: 'auto',
                                color: '#ddd',
                                fontFamily: 'monospace',
                                fontSize: '13px'
                            }}>
                                {consoleLogs.length === 0 && <span style={{ color: '#666', fontStyle: 'italic' }}>Run code to see output...</span>}
                                {consoleLogs.map((log, i) => (
                                    <div key={i} style={{ marginBottom: '4px', whiteSpace: 'pre-wrap' }}>{log}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Floating Terminal (Only for Blocks View) */}
                {showTerminal && currentTab === 'blocks' && (
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '200px',
                        backgroundColor: '#1E1E1E',
                        color: '#DDD',
                        fontFamily: 'monospace',
                        borderTop: '2px solid #333',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 1000
                    }}>
                        <div style={{
                            padding: '4px 8px',
                            backgroundColor: '#2D2D2D',
                            borderBottom: '1px solid #333',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '12px'
                        }}>
                            <span>🖥️ Output Terminal</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setConsoleLogs([])} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#AAA' }}>🚫 Clear</button>
                                <button onClick={() => setShowTerminal(false)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#AAA' }}>✖️ Close</button>
                            </div>
                        </div>
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '8px',
                            fontSize: '13px'
                        }}>
                            {consoleLogs.length === 0 && <span style={{ color: '#666', fontStyle: 'italic' }}>Ready to run...</span>}
                            {consoleLogs.map((log, i) => (
                                <div key={i} style={{ marginBottom: '4px', whiteSpace: 'pre-wrap' }}>{log}</div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sample Hub Sidebar - Lazy loaded */}
                <Suspense fallback={null}>
                    {isHubOpen && (
                        <SampleHub
                            isOpen={isHubOpen}
                            onClose={() => setIsHubOpen(false)}
                            onLoadSample={handleLoadHubSample}
                        />
                    )}
                </Suspense>
            </div>

            {/* Sandbox iframe for safe code execution */}
            <iframe
                id="blockly-sandbox"
                style={{ display: 'none' }}
                sandbox="allow-scripts"
                srcDoc={SANDBOX_HTML}
            />

            {/* Code Preview (optional, for debugging) */}
            {
                process.env.NODE_ENV === 'development' && (
                    <details style={{ padding: '8px', borderTop: '1px solid #ddd', backgroundColor: '#f9f9f9' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Generated Code (Debug)</summary>
                        <pre style={{
                            margin: '8px 0',
                            padding: '8px',
                            backgroundColor: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '12px',
                            overflow: 'auto',
                            maxHeight: '200px'
                        }}>
                            {generatedCode || '// No code generated yet'}
                        </pre>
                    </details>
                )
            }
        </div >
    );
}

// Sample Workspaces (JSON serialization)
const SAMPLE_WORKSPACES = {
    'maze_1': {
        "blocks": {
            "languageVersion": 0,
            "blocks": [
                {
                    "type": "game_start",
                    "x": 50,
                    "y": 50,
                    "next": {
                        "block": {
                            "type": "maze_move_forward",
                            "next": {
                                "block": {
                                    "type": "maze_move_forward",
                                    "next": {
                                        "block": {
                                            "type": "maze_turn",
                                            "fields": { "DIR": "LEFT" },
                                            "next": {
                                                "block": {
                                                    "type": "maze_move_forward"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ]
        }
    },
    'turtle_1': {
        "blocks": {
            "languageVersion": 0,
            "blocks": [
                {
                    "type": "game_start",
                    "x": 50,
                    "y": 50,
                    "next": {
                        "block": {
                            "type": "controls_repeat_ext",
                            "inputs": {
                                "TIMES": {
                                    "shadow": {
                                        "type": "math_number",
                                        "fields": { "NUM": 4 }
                                    }
                                },
                                "DO": {
                                    "block": {
                                        "type": "turtle_move",
                                        "inputs": {
                                            "VALUE": {
                                                "shadow": {
                                                    "type": "math_number",
                                                    "fields": { "NUM": 50 }
                                                }
                                            }
                                        },
                                        "next": {
                                            "block": {
                                                "type": "turtle_turn",
                                                "inputs": {
                                                    "VALUE": {
                                                        "shadow": {
                                                            "type": "math_number",
                                                            "fields": { "NUM": 90 }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ]
        }
    }
};

/**
 * Safe sandbox HTML for executing generated JavaScript
 */
const SANDBOX_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 10px; }
    #output { white-space: pre-wrap; }
  </style>
</head>
<body>
  <div id="output"></div>
  <script>
    // Override console.log so output shows in the app's Execution Output / Terminal panel.
    // Patch the existing console (don't replace window.console) so it works in Electron/sandboxed iframes
    // where window.console may be read-only.
    const outputDiv = document.getElementById('output');
    function stringifyArg(a) {
      if (a === null) return 'null';
      if (a === undefined) return 'undefined';
      if (typeof a === 'object') return JSON.stringify(a);
      return String(a);
    }
    function sendLog(type, msg) {
      try {
        outputDiv.textContent += (type === 'error' ? 'Error: ' : '') + msg + '\\n';
        window.parent.postMessage({ type: type === 'error' ? 'sandbox_error' : 'sandbox_log', message: msg }, '*');
      } catch (e) {}
    }
    var _log = window.console && window.console.log ? window.console.log.bind(window.console) : function() {};
    var _error = window.console && window.console.error ? window.console.error.bind(window.console) : function() {};
    window.console.log = function(...args) {
      var msg = args.map(stringifyArg).join(' ');
      sendLog('log', msg);
      _log.apply(window.console, args);
    };
    window.console.error = function(...args) {
      var msg = args.map(stringifyArg).join(' ');
      sendLog('error', msg);
      _error.apply(window.console, args);
    };
    
    // Override alert to use console.log
    window.alert = function(msg) {
      console.log('Alert: ' + msg);
    };

    // Stub for AudioManager to proxy calls to parent
    window.AudioManager = {
      playNote: function(note) {
        window.parent.postMessage({ type: 'AUDIO', action: 'playNote', note: note }, '*');
        console.log('🎵 Executing Play Note: ' + note);
      },
      playDrum: function(drum) {
        window.parent.postMessage({ type: 'AUDIO', action: 'playDrum', drum: drum }, '*');
        console.log('🥁 Executing Play Drum: ' + drum);
      },
      playSound: function(soundId) {
        window.parent.postMessage({ type: 'AUDIO', action: 'playSound', soundId: soundId }, '*');
        console.log('🔊 Executing Play Sound: ' + soundId);
      }
    };

    // Proxy for StageManager
    window.StageManager = {
      addSprite: function(name, spriteType) {
        window.parent.postMessage({ type: 'STAGE', action: 'addSprite', name, spriteType }, '*');
        console.log('🎨 Add Sprite: ' + name);
      },
      setSpritePosition: function(name, x, y) {
        window.parent.postMessage({ type: 'STAGE', action: 'setPosition', name, x, y }, '*');
      },
      moveSprite: function(name, dx, dy) {
        window.parent.postMessage({ type: 'STAGE', action: 'moveSprite', name, dx, dy }, '*');
      },
      setBackground: function(color) {
         window.parent.postMessage({ type: 'STAGE', action: 'setBackground', color }, '*');
      },
      addShape: function(shapeType, color) {
         window.parent.postMessage({ type: 'STAGE', action: 'addShape', shapeType, color }, '*');
         console.log('🎨 Add Shape: ' + shapeType);
      },
      showOutput: function(text) {
        window.parent.postMessage({ type: 'STAGE', action: 'showOutput', text: String(text) }, '*');
      }
    };

    // Proxy for CelebrationManager
    window.CelebrationManager = {
      celebrateSuccess: function() {
        window.parent.postMessage({ type: 'CELEBRATION', action: 'success' }, '*');
      },
      celebrateMagic: function() {
        window.parent.postMessage({ type: 'CELEBRATION', action: 'magic' }, '*');
      },
      celebrateLevelUp: function() {
        window.parent.postMessage({ type: 'CELEBRATION', action: 'levelup' }, '*');
      }
    };

    // Proxy for BadgeManager
    window.BadgeManager = {
      unlockBadge: function(badgeId) {
        window.parent.postMessage({ type: 'BADGE', action: 'unlock', badgeId }, '*');
      }
    };

    // Proxy for SpeechManager (Text-to-Speech)
    window.SpeechManager = {
      speak: function(text) {
        window.parent.postMessage({ type: 'SPEECH', action: 'speak', text: text }, '*');
        console.log('🔊 Speaking: ' + text);
      }
    };
    
    // Listen for messages from parent
    window.addEventListener('message', function(event) {
      if (event.data.type === 'run') {
        outputDiv.textContent = '';
        // Wrap code in async IIFE to support await statements (needed for wait blocks)
        (async function() {
          try {
            // Create and execute async function to support await
            const asyncCode = '(async function() {' + event.data.code + '})()';
            await eval(asyncCode);
          } catch (error) {
            const errorMsg = error.message || String(error);
            outputDiv.textContent = 'Error: ' + errorMsg;
            window.parent.postMessage({ type: 'sandbox_error', message: errorMsg }, '*');
          }
        })();
      } else if (event.data.type === 'clear') {
        outputDiv.textContent = '';
      }
    });
  </script>
</body>
</html>
`;
