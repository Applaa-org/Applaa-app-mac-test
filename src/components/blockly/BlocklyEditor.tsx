import React, { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import * as En from 'blockly/msg/en'; // Import English language
import 'blockly/blocks'; // Import default blocks
import { initCustomBlocks } from './CustomBlocks'; // Import Custom Blocks
import { SampleHub } from './SampleHub'; // Import Hub

// Import Generators
import { javascriptGenerator } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';
import { phpGenerator } from 'blockly/php';
import { luaGenerator } from 'blockly/lua';
import { dartGenerator } from 'blockly/dart';

// Set the locale
Blockly.setLocale(En as any);

interface BlocklyEditorProps {
    appId: number;
    initialWorkspace?: any;
    onWorkspaceChange?: (data: { workspaceJson: any; generatedCode: string }) => void;
    readOnly?: boolean;
}

/**
 * Blockly Editor Component
 * Provides a visual block-based programming interface for kids
 */
export function BlocklyEditor({
    appId,
    initialWorkspace,
    onWorkspaceChange,
    readOnly = false
}: BlocklyEditorProps) {
    const blocklyDivRef = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

    // State for Multi-Language Support
    type Tab = 'blocks' | 'javascript' | 'python' | 'php' | 'lua' | 'dart' | 'xml' | 'json';
    const [activeTab, setActiveTab] = useState<Tab>('blocks');
    const [generatedCodeMap, setGeneratedCodeMap] = useState<Record<string, string>>({});

    const [generatedCode, setGeneratedCode] = useState<string>(''); // Keep for backward compat
    const [isRunning, setIsRunning] = useState(false);
    const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
    const [showTerminal, setShowTerminal] = useState(true);
    const [isHubOpen, setIsHubOpen] = useState(false);

    // Listen for Sandbox Messages
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'sandbox_log') {
                setConsoleLogs(prev => [...prev, `> ${event.data.message}`]);
            } else if (event.data?.type === 'sandbox_error') {
                setConsoleLogs(prev => [...prev, `❌ ${event.data.message}`]);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Code generation function (can be called manually)
    const generateAllCode = () => {
        if (!workspaceRef.current) return;

        try {
            // Generate code for all languages
            const codeJS = javascriptGenerator.workspaceToCode(workspaceRef.current);
            const codePy = pythonGenerator.workspaceToCode(workspaceRef.current);
            const codePHP = phpGenerator.workspaceToCode(workspaceRef.current);
            const codeLua = luaGenerator.workspaceToCode(workspaceRef.current);
            const codeDart = dartGenerator.workspaceToCode(workspaceRef.current);

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
                    generatedCode: codeJS
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

        console.log('Available blocks:', Object.keys(Blockly.Blocks));

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
            sounds: false, // Disabled to avoid CSP violations (sounds less critical than UI)
            readOnly: readOnly,
            theme: APPLAA_THEME
        });

        // Load initial workspace if provided
        if (initialWorkspace) {
            try {
                Blockly.serialization.workspaces.load(initialWorkspace, workspaceRef.current);
            } catch (error) {
                console.error('Failed to load workspace:', error);
            }
        }

        // Listen for workspace changes
        const changeListener = () => {
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

        // Cleanup
        return () => {
            resizeObserver.disconnect();
            if (workspaceRef.current) {
                workspaceRef.current.dispose();
                workspaceRef.current = null;
            }
        };
    }, [appId, readOnly]);

    const handleRunCode = () => {
        if (!generatedCode) {
            alert('No code to run! Add some blocks first.');
            return;
        }
        setIsRunning(true);
        setConsoleLogs([]); // Clear logs
        setShowTerminal(true); // Open terminal

        // Run code in a safe sandbox (iframe)
        const sandboxWindow = document.getElementById('blockly-sandbox') as HTMLIFrameElement;
        if (sandboxWindow && sandboxWindow.contentWindow) {
            try {
                // Clear previous output
                sandboxWindow.contentWindow.postMessage({ type: 'clear' }, '*');

                // Run the generated code
                sandboxWindow.contentWindow.postMessage({
                    type: 'run',
                    code: generatedCode
                }, '*');

                setTimeout(() => setIsRunning(false), 500);
            } catch (error) {
                console.error('Failed to run code:', error);
                alert('Failed to run code. Check the console for details.');
                setIsRunning(false);
            }
        }
    };

    const handleLoadHubSample = (sampleWorkspace: any) => {
        if (!workspaceRef.current) return;
        try {
            // Clear workspace first
            workspaceRef.current.clear();

            // Load the sample
            Blockly.serialization.workspaces.load(sampleWorkspace, workspaceRef.current);

            // Ensure workspace is editable (not read-only)
            if (workspaceRef.current.options) {
                workspaceRef.current.options.readOnly = false;
            }

            // Regenerate code after load
            setTimeout(() => {
                generateAllCode();
            }, 100); // Small delay to ensure blocks are fully rendered

        } catch (e) {
            console.error("Failed to load hub sample", e);
            alert("Failed to load sample. Please try again.");
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

    return (
        <div className="blockly-editor-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            <div className="blockly-toolbar" style={{
                padding: '8px',
                borderBottom: '1px solid #ddd',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                backgroundColor: '#f5f5f5',
                flexWrap: 'wrap'
            }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px' }}>
                    {(['blocks', 'javascript', 'python', 'php', 'lua', 'dart', 'xml', 'json'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '6px 12px',
                                border: '1px solid #ddd',
                                borderBottom: activeTab === tab ? '2px solid #4CAF50' : '1px solid #ddd',
                                backgroundColor: activeTab === tab ? '#fff' : '#eee',
                                cursor: 'pointer',
                                fontWeight: activeTab === tab ? 'bold' : 'normal',
                                textTransform: 'capitalize',
                                borderRadius: '4px 4px 0 0'
                            }}
                        >
                            {tab === 'blocks' ? '🧩 Blocks' : tab}
                        </button>
                    ))}
                </div>

                <div style={{ width: '1px', height: '20px', backgroundColor: '#ccc', margin: '0 8px' }}></div>

                <button
                    onClick={handleRunCode}
                    disabled={isRunning || readOnly}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isRunning ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {isRunning ? '▶️ Running...' : '▶️ Run Code'}
                </button>

                {/* Samples Dropdown */}
                <button
                    onClick={() => setIsHubOpen(true)}
                    style={{
                        padding: '8px 12px',
                        backgroundColor: '#673AB7', // Deep Purple for Hub
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '8px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    🚀 Hub
                </button>

                <button
                    onClick={() => setShowTerminal(!showTerminal)}
                    style={{
                        padding: '8px 12px',
                        backgroundColor: showTerminal ? '#333' : '#666',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '8px'
                    }}
                    title={showTerminal ? "Hide Output" : "Show Output"}
                >
                    {showTerminal ? '🖥️' : '💻'} Term
                </button>

                <button
                    onClick={handleClear}
                    disabled={readOnly}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: readOnly ? 'not-allowed' : 'pointer'
                    }}
                >
                    🗑️ Clear All
                </button>

                {/* Language Indicator */}
                <div style={{
                    marginLeft: '8px',
                    padding: '6px 12px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '16px',
                    fontSize: '12px',
                    color: '#555',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    <span>⚡ Generating:</span>
                    <span style={{ fontWeight: 'bold', color: '#f7df1e' }}>JavaScript</span>
                </div>

                <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#666' }}>
                    Drag blocks from the left to build your program
                </div>
            </div>

            {/* Blockly Workspace or Code View */}
            <div style={{ flex: 1, position: 'relative', minHeight: '400px' }}>

                {/* Visual Editor */}
                <div
                    ref={blocklyDivRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: activeTab === 'blocks' ? 'block' : 'none'
                    }}
                />

                {/* Code View (Split Layout) */}
                {activeTab !== 'blocks' && (
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
                                📄 Source Code ({activeTab})
                            </div>
                            <pre style={{ margin: 0 }}>{generatedCodeMap[activeTab] || '// No code generated'}</pre>
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
                {showTerminal && activeTab === 'blocks' && (
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

                {/* Sample Hub Sidebar */}
                <SampleHub
                    isOpen={isHubOpen}
                    onClose={() => setIsHubOpen(false)}
                    onLoadSample={handleLoadHubSample}
                />
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

/**
 * Kid-friendly Blockly toolbox with essential categories
 */
// Applaa Custom Theme
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
            name: '🧩 Logic',
            categorystyle: 'logic_category',
            contents: [
                { kind: 'block', type: 'controls_if' },
                { kind: 'block', type: 'logic_compare' },
                { kind: 'block', type: 'logic_operation' },
                { kind: 'block', type: 'logic_negate' },
                { kind: 'block', type: 'logic_boolean' },
                { kind: 'block', type: 'logic_null' },
                { kind: 'block', type: 'logic_ternary' }
            ]
        },
        {
            kind: 'category',
            name: '🔄 Loops',
            categorystyle: 'loop_category',
            contents: [
                { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
                { kind: 'block', type: 'controls_whileUntil' },
                { kind: 'block', type: 'controls_for', inputs: { FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } }, BY: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
                { kind: 'block', type: 'controls_forEach' },
                { kind: 'block', type: 'controls_flow_statements' }
            ]
        },
        {
            kind: 'category',
            name: '🔢 Math',
            categorystyle: 'math_category',
            contents: [
                { kind: 'block', type: 'math_number', fields: { NUM: 123 } },
                { kind: 'block', type: 'math_arithmetic', inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, B: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
                { kind: 'block', type: 'math_single', inputs: { NUM: { shadow: { type: 'math_number', fields: { NUM: 9 } } } } },
                { kind: 'block', type: 'math_trig', inputs: { NUM: { shadow: { type: 'math_number', fields: { NUM: 45 } } } } },
                { kind: 'block', type: 'math_constant' },
                { kind: 'block', type: 'math_number_property', inputs: { NUMBER_TO_CHECK: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
                { kind: 'block', type: 'math_round', inputs: { NUM: { shadow: { type: 'math_number', fields: { NUM: 3.1 } } } } },
                { kind: 'block', type: 'math_on_list' },
                { kind: 'block', type: 'math_modulo', inputs: { DIVIDEND: { shadow: { type: 'math_number', fields: { NUM: 64 } } }, DIVISOR: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
                { kind: 'block', type: 'math_random_int', inputs: { FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, TO: { shadow: { type: 'math_number', fields: { NUM: 100 } } } } }
            ]
        },
        {
            kind: 'category',
            name: '📝 Text',
            categorystyle: 'text_category',
            contents: [
                { kind: 'block', type: 'text' },
                { kind: 'block', type: 'text_join' },
                { kind: 'block', type: 'text_append' },
                { kind: 'block', type: 'text_length', inputs: { VALUE: { shadow: { type: 'text', fields: { TEXT: 'abc' } } } } },
                { kind: 'block', type: 'text_isEmpty', inputs: { VALUE: { shadow: { type: 'text', fields: { TEXT: '' } } } } },
                { kind: 'block', type: 'text_indexOf', inputs: { VALUE: { block: { type: 'variables_get', fields: { VAR: 'text' } } }, FIND: { shadow: { type: 'text', fields: { TEXT: 'abc' } } } } },
                { kind: 'block', type: 'text_charAt', inputs: { VALUE: { block: { type: 'variables_get', fields: { VAR: 'text' } } } } },
                { kind: 'block', type: 'text_changeCase', inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: 'abc' } } } } },
                { kind: 'block', type: 'text_trim', inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: 'abc' } } } } },
                { kind: 'block', type: 'text_print', inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: 'abc' } } } } },
                { kind: 'block', type: 'applaa_speak' },
                { kind: 'block', type: 'text_prompt_ext', inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: 'abc' } } } } }
            ]
        },
        {
            kind: 'category',
            name: '🎮 Game',
            categorystyle: 'logic_category',
            contents: [
                { kind: 'block', type: 'game_start' },
                { kind: 'block', type: 'game_move_sprite' },
                { kind: 'block', type: 'applaa_log', inputs: { MESSAGE: { shadow: { type: 'text', fields: { TEXT: 'Hello Applaa!' } } } } },
                { kind: 'label', text: 'Maze' },
                { kind: 'block', type: 'maze_move_forward' },
                { kind: 'block', type: 'maze_turn' },
                { kind: 'label', text: 'Turtle' },
                { kind: 'block', type: 'turtle_move', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 50 } } } } },
                { kind: 'block', type: 'turtle_turn', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 90 } } } } }
            ]
        },
        {
            kind: 'sep',
        },
        {
            kind: 'category',
            name: '📋 Lists',
            categorystyle: 'list_category',
            contents: [
                { kind: 'block', type: 'lists_create_with', extraState: { itemCount: 0 } },
                { kind: 'block', type: 'lists_create_with' },
                { kind: 'block', type: 'lists_repeat', inputs: { NUM: { shadow: { type: 'math_number', fields: { NUM: 5 } } } } },
                { kind: 'block', type: 'lists_length' },
                { kind: 'block', type: 'lists_isEmpty' },
                { kind: 'block', type: 'lists_indexOf', inputs: { VALUE: { block: { type: 'variables_get', fields: { VAR: 'list' } } } } },
                { kind: 'block', type: 'lists_getIndex', inputs: { VALUE: { block: { type: 'variables_get', fields: { VAR: 'list' } } } } },
                { kind: 'block', type: 'lists_setIndex', inputs: { LIST: { block: { type: 'variables_get', fields: { VAR: 'list' } } } } },
                { kind: 'block', type: 'lists_getSublist', inputs: { LIST: { block: { type: 'variables_get', fields: { VAR: 'list' } } } } },
                { kind: 'block', type: 'lists_split', inputs: { DELIM: { shadow: { type: 'text', fields: { TEXT: ',' } } } } },
                { kind: 'block', type: 'lists_sort' }
            ]
        },
        {
            kind: 'sep',
        },
        {
            kind: 'category',
            name: '📦 Variables',
            categorystyle: 'variable_category',
            custom: 'VARIABLE'
        },
        {
            kind: 'category',
            name: '⚡ Functions',
            categorystyle: 'procedure_category',
            custom: 'PROCEDURE'
        }
    ]
};

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
    // Override console.log to display in the output div AND send to parent
    const outputDiv = document.getElementById('output');
    
    window.console = {
      log: function(...args) {
        const msg = args.join(' ');
        // Display inside sandbox (optional)
        outputDiv.textContent += msg + '\\n'; 
        // Send to parent
        window.parent.postMessage({ type: 'sandbox_log', message: msg }, '*');
      },
      error: function(...args) {
        const msg = args.join(' ');
        outputDiv.textContent += 'Error: ' + msg + '\\n';
        window.parent.postMessage({ type: 'sandbox_error', message: msg }, '*');
      }
    };
    
    // Override alert to use console.log
    window.alert = function(msg) {
      console.log('Alert: ' + msg);
    };
    
    // Listen for messages from parent
    window.addEventListener('message', function(event) {
      if (event.data.type === 'run') {
        try {
          outputDiv.textContent = '';
          eval(event.data.code);
        } catch (error) {
          outputDiv.textContent = 'Error: ' + error.message;
        }
      } else if (event.data.type === 'clear') {
        outputDiv.textContent = '';
      }
    });
  </script>
</body>
</html>
`;
