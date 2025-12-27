export interface SampleProject {
    id: string;
    title: string;
    description: string;
    category: 'Games' | 'Art' | 'Math' | 'Logic' | 'Music' | 'Science';
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    workspace: any; // Blockly JSON serialization
}

// Helper to create simple workspaces
const createWorkspace = (blocks: any[]) => ({
    "blocks": {
        "languageVersion": 0,
        "blocks": blocks
    }
});

export const SAMPLE_PROJECTS: SampleProject[] = [
    // --- 🎮 GAMES ---
    {
        id: 'demo_speaking_calc',
        title: '🔊 Speaking Calculator',
        description: 'The computer speaks the answer to 5 + 10!',
        category: 'Math',
        difficulty: 'Beginner',
        workspace: createWorkspace([
            {
                "type": "applaa_speak",
                "x": 50, "y": 50,
                "inputs": {
                    "MESSAGE": {
                        "block": {
                            "type": "math_arithmetic",
                            "fields": { "OP": "ADD" },
                            "inputs": {
                                "A": { "shadow": { "type": "math_number", "fields": { "NUM": 5 } } },
                                "B": { "shadow": { "type": "math_number", "fields": { "NUM": 10 } } }
                            }
                        }
                    }
                }
            }
        ])
    },
    {
        id: 'game_maze_1',
        title: 'Maze Runner: Level 1',
        description: 'Navigate the character through a simple path.',
        category: 'Games',
        difficulty: 'Beginner',
        workspace: createWorkspace([
            {
                "type": "game_start",
                "x": 50, "y": 50,
                "next": {
                    "block": {
                        "type": "maze_move_forward",
                        "next": {
                            "block": { "type": "maze_move_forward" }
                        }
                    }
                }
            }
        ])
    },
    {
        id: 'game_maze_2',
        title: 'Maze Runner: The Turn',
        description: 'Learn to turn corners to solve the maze.',
        category: 'Games',
        difficulty: 'Beginner',
        workspace: createWorkspace([
            {
                "type": "game_start",
                "x": 50, "y": 50,
                "next": {
                    "block": {
                        "type": "maze_move_forward",
                        "next": {
                            "block": {
                                "type": "maze_turn",
                                "fields": { "DIR": "LEFT" },
                                "next": { "block": { "type": "maze_move_forward" } }
                            }
                        }
                    }
                }
            }
        ])
    },
    {
        id: 'game_clicker',
        title: 'Simple Clicker Game',
        description: 'Count how many times you click! (Simulation logic)',
        category: 'Games',
        difficulty: 'Intermediate',
        workspace: createWorkspace([
            {
                "type": "variables_set",
                "x": 50, "y": 50,
                "fields": { "VAR": { "id": "score_var", "name": "score", "type": "" } },
                "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 0 } } } },
                "next": {
                    "block": {
                        "type": "game_start",
                        "next": {
                            "block": {
                                "type": "applaa_log",
                                "inputs": { "MESSAGE": { "shadow": { "type": "text", "fields": { "TEXT": "Game Started! Score: 0" } } } }
                            }
                        }
                    }
                }
            }
        ])
    },

    // --- 🎨 ART ---
    {
        id: 'art_square',
        title: 'Turtle Square',
        description: 'Draw a perfect square using the Turtle.',
        category: 'Art',
        difficulty: 'Beginner',
        workspace: createWorkspace([
            {
                "type": "game_start",
                "x": 50, "y": 50,
                "next": {
                    "block": {
                        "type": "controls_repeat_ext",
                        "inputs": {
                            "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 4 } } },
                            "DO": {
                                "block": {
                                    "type": "turtle_move",
                                    "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 100 } } } },
                                    "next": {
                                        "block": {
                                            "type": "turtle_turn",
                                            "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 90 } } } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ])
    },
    {
        id: 'art_circle',
        title: 'Turtle Circle',
        description: 'Draw a circle by moving and turning slightly many times.',
        category: 'Art',
        difficulty: 'Intermediate',
        workspace: createWorkspace([
            {
                "type": "controls_repeat_ext",
                "x": 50, "y": 50,
                "inputs": {
                    "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 36 } } },
                    "DO": {
                        "block": {
                            "type": "turtle_move",
                            "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 10 } } } },
                            "next": {
                                "block": {
                                    "type": "turtle_turn",
                                    "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 10 } } } }
                                }
                            }
                        }
                    }
                }
            }
        ])
    },
    {
        id: 'art_spiral',
        title: 'Hypnotic Spiral',
        description: 'A spiral pattern that grows with every step.',
        category: 'Art',
        difficulty: 'Advanced',
        workspace: createWorkspace([
            {
                "type": "variables_set",
                "x": 50, "y": 50,
                "fields": { "VAR": { "id": "len_var", "name": "length", "type": "" } },
                "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 10 } } } },
                "next": {
                    "block": {
                        "type": "controls_repeat_ext",
                        "inputs": {
                            "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 20 } } },
                            "DO": {
                                "block": {
                                    "type": "turtle_move",
                                    "inputs": { "VALUE": { "block": { "type": "variables_get", "fields": { "VAR": { "id": "len_var", "name": "length", "type": "" } } } } },
                                    "next": {
                                        "block": {
                                            "type": "turtle_turn",
                                            "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 90 } } } },
                                            "next": {
                                                "block": {
                                                    "type": "math_change",
                                                    "fields": { "VAR": { "id": "len_var", "name": "length", "type": "" } },
                                                    "inputs": { "DELTA": { "shadow": { "type": "math_number", "fields": { "NUM": 5 } } } }
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
        ])
    },

    // --- 🔢 MATH ---
    {
        id: 'math_calculator',
        title: 'Simple Calculator',
        description: 'Perform basic addition and logging.',
        category: 'Math',
        difficulty: 'Beginner',
        workspace: createWorkspace([
            {
                "type": "applaa_log",
                "x": 50, "y": 50,
                "inputs": {
                    "MESSAGE": {
                        "block": {
                            "type": "math_arithmetic",
                            "fields": { "OP": "ADD" },
                            "inputs": {
                                "A": { "shadow": { "type": "math_number", "fields": { "NUM": 5 } } },
                                "B": { "shadow": { "type": "math_number", "fields": { "NUM": 10 } } }
                            }
                        }
                    }
                }
            }
        ])
    },
    {
        id: 'math_evens',
        title: 'Even Number Generator',
        description: 'Print all even numbers from 0 to 20.',
        category: 'Math',
        difficulty: 'Intermediate',
        workspace: createWorkspace([
            {
                "type": "controls_for",
                "x": 50, "y": 50,
                "fields": { "VAR": { "id": "i_var", "name": "i", "type": "" } },
                "inputs": {
                    "FROM": { "shadow": { "type": "math_number", "fields": { "NUM": 0 } } },
                    "TO": { "shadow": { "type": "math_number", "fields": { "NUM": 20 } } },
                    "BY": { "shadow": { "type": "math_number", "fields": { "NUM": 2 } } },
                    "DO": {
                        "block": {
                            "type": "applaa_log",
                            "inputs": { "MESSAGE": { "block": { "type": "variables_get", "fields": { "VAR": { "id": "i_var", "name": "i", "type": "" } } } } }
                        }
                    }
                }
            }
        ])
    },

    // --- 🧩 LOGIC ---
    {
        id: 'logic_voting',
        title: 'Voting Age Checker',
        description: 'Check if a person is old enough to vote.',
        category: 'Logic',
        difficulty: 'Beginner',
        workspace: createWorkspace([
            {
                "type": "variables_set",
                "x": 50, "y": 50,
                "fields": { "VAR": { "id": "age_var", "name": "age", "type": "" } },
                "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 18 } } } },
                "next": {
                    "block": {
                        "type": "controls_if",
                        "extraState": { "hasElse": true },
                        "inputs": {
                            "IF0": {
                                "block": {
                                    "type": "logic_compare",
                                    "fields": { "OP": "GTE" },
                                    "inputs": {
                                        "A": { "block": { "type": "variables_get", "fields": { "VAR": { "id": "age_var", "name": "age", "type": "" } } } },
                                        "B": { "shadow": { "type": "math_number", "fields": { "NUM": 18 } } }
                                    }
                                }
                            },
                            "DO0": {
                                "block": {
                                    "type": "applaa_log",
                                    "inputs": { "MESSAGE": { "shadow": { "type": "text", "fields": { "TEXT": "You can vote!" } } } }
                                }
                            },
                            "ELSE": {
                                "block": {
                                    "type": "applaa_log",
                                    "inputs": { "MESSAGE": { "shadow": { "type": "text", "fields": { "TEXT": "Too young to vote." } } } }
                                }
                            }
                        }
                    }
                }
            }
        ])
    },

    // --- 🧪 SCIENCE ---
    {
        id: 'sci_temp',
        title: 'C to F Converter',
        description: 'Convert Celsius temperature to Fahrenheit.',
        category: 'Science',
        difficulty: 'Intermediate',
        workspace: createWorkspace([
            {
                "type": "variables_set",
                "x": 50, "y": 50,
                "fields": { "VAR": { "id": "c_var", "name": "celsius", "type": "" } },
                "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 25 } } } },
                "next": {
                    "block": {
                        "type": "applaa_log",
                        "inputs": {
                            "MESSAGE": {
                                "block": {
                                    "type": "math_arithmetic",
                                    "fields": { "OP": "ADD" },
                                    "inputs": {
                                        "A": {
                                            "block": {
                                                "type": "math_arithmetic",
                                                "fields": { "OP": "MULTIPLY" },
                                                "inputs": {
                                                    "A": { "block": { "type": "variables_get", "fields": { "VAR": { "id": "c_var", "name": "celsius", "type": "" } } } },
                                                    "B": { "shadow": { "type": "math_number", "fields": { "NUM": 1.8 } } }
                                                }
                                            }
                                        },
                                        "B": { "shadow": { "type": "math_number", "fields": { "NUM": 32 } } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ])
    },

    // --- More GAMES ---
    {
        id: 'game_maze_3',
        title: 'Maze: Complex Path',
        description: 'Navigate through multiple turns and paths.',
        category: 'Games',
        difficulty: 'Intermediate',
        workspace: createWorkspace([
            {
                "type": "game_start",
                "x": 50, "y": 50,
                "next": {
                    "block": {
                        "type": "controls_repeat_ext",
                        "inputs": {
                            "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 3 } } },
                            "DO": {
                                "block": {
                                    "type": "maze_move_forward",
                                    "next": {
                                        "block": {
                                            "type": "maze_turn",
                                            "fields": { "DIR": "RIGHT" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ])
    },
    {
        id: 'game_counter',
        title: 'Score Counter',
        description: 'Track and display a game score.',
        category: 'Games',
        difficulty: 'Beginner',
        workspace: createWorkspace([
            {
                "type": "variables_set",
                "x": 50, "y": 50,
                "fields": { "VAR": { "id": "score", "name": "score", "type": "" } },
                "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 0 } } } },
                "next": {
                    "block": {
                        "type": "controls_repeat_ext",
                        "inputs": {
                            "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 5 } } },
                            "DO": {
                                "block": {
                                    "type": "math_change",
                                    "fields": { "VAR": { "id": "score", "name": "score", "type": "" } },
                                    "inputs": { "DELTA": { "shadow": { "type": "math_number", "fields": { "NUM": 10 } } } },
                                    "next": {
                                        "block": {
                                            "type": "applaa_log",
                                            "inputs": { "MESSAGE": { "block": { "type": "variables_get", "fields": { "VAR": { "id": "score", "name": "score", "type": "" } } } } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ])
    },

    // --- More ART ---
    {
        id: 'art_triangle',
        title: 'Turtle Triangle',
        description: 'Draw an equilateral triangle.',
        category: 'Art',
        difficulty: 'Beginner',
        workspace: createWorkspace([
            {
                "type": "controls_repeat_ext",
                "x": 50, "y": 50,
                "inputs": {
                    "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 3 } } },
                    "DO": {
                        "block": {
                            "type": "turtle_move",
                            "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 100 } } } },
                            "next": {
                                "block": {
                                    "type": "turtle_turn",
                                    "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 120 } } } }
                                }
                            }
                        }
                    }
                }
            }
        ])
    },
    {
        id: 'art_hexagon',
        title: 'Turtle Hexagon',
        description: 'Draw a six-sided polygon.',
        category: 'Art',
        difficulty: 'Intermediate',
        workspace: createWorkspace([
            {
                "type": "controls_repeat_ext",
                "x": 50, "y": 50,
                "inputs": {
                    "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 6 } } },
                    "DO": {
                        "block": {
                            "type": "turtle_move",
                            "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 80 } } } },
                            "next": {
                                "block": {
                                    "type": "turtle_turn",
                                    "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 60 } } } }
                                }
                            }
                        }
                    }
                }
            }
        ])
    },
    {
        id: 'art_star',
        title: 'Five-Point Star',
        description: 'Draw a classic star shape.',
        category: 'Art',
        difficulty: 'Advanced',
        workspace: createWorkspace([
            {
                "type": "controls_repeat_ext",
                "x": 50, "y": 50,
                "inputs": {
                    "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 5 } } },
                    "DO": {
                        "block": {
                            "type": "turtle_move",
                            "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 100 } } } },
                            "next": {
                                "block": {
                                    "type": "turtle_turn",
                                    "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 144 } } } }
                                }
                            }
                        }
                    }
                }
            }
        ])
    },

    // --- More MATH ---
    {
        id: 'math_multiply',
        title: 'Multiplication Table',
        description: 'Print the 5 times table.',
        category: 'Math',
        difficulty: 'Beginner',
        workspace: createWorkspace([
            {
                "type": "controls_for",
                "x": 50, "y": 50,
                "fields": { "VAR": { "id": "i", "name": "i", "type": "" } },
                "inputs": {
                    "FROM": { "shadow": { "type": "math_number", "fields": { "NUM": 1 } } },
                    "TO": { "shadow": { "type": "math_number", "fields": { "NUM": 10 } } },
                    "BY": { "shadow": { "type": "math_number", "fields": { "NUM": 1 } } },
                    "DO": {
                        "block": {
                            "type": "applaa_log",
                            "inputs": {
                                "MESSAGE": {
                                    "block": {
                                        "type": "math_arithmetic",
                                        "fields": { "OP": "MULTIPLY" },
                                        "inputs": {
                                            "A": { "shadow": { "type": "math_number", "fields": { "NUM": 5 } } },
                                            "B": { "block": { "type": "variables_get", "fields": { "VAR": { "id": "i", "name": "i", "type": "" } } } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ])
    },
    {
        id: 'math_fibonacci',
        title: 'Fibonacci Sequence',
        description: 'Generate the first 10 Fibonacci numbers.',
        category: 'Math',
        difficulty: 'Advanced',
        workspace: createWorkspace([
            {
                "type": "variables_set",
                "x": 50, "y": 50,
                "fields": { "VAR": { "id": "a", "name": "a", "type": "" } },
                "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 0 } } } },
                "next": {
                    "block": {
                        "type": "variables_set",
                        "fields": { "VAR": { "id": "b", "name": "b", "type": "" } },
                        "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 1 } } } },
                        "next": {
                            "block": {
                                "type": "controls_repeat_ext",
                                "inputs": {
                                    "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 10 } } },
                                    "DO": {
                                        "block": {
                                            "type": "applaa_log",
                                            "inputs": { "MESSAGE": { "block": { "type": "variables_get", "fields": { "VAR": { "id": "a", "name": "a", "type": "" } } } } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ])
    },
    {
        id: 'math_sum',
        title: 'Sum of Numbers',
        description: 'Calculate the sum of numbers 1 to 100.',
        category: 'Math',
        difficulty: 'Intermediate',
        workspace: createWorkspace([
            {
                "type": "variables_set",
                "x": 50, "y": 50,
                "fields": { "VAR": { "id": "sum", "name": "sum", "type": "" } },
                "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 0 } } } },
                "next": {
                    "block": {
                        "type": "controls_for",
                        "fields": { "VAR": { "id": "i", "name": "i", "type": "" } },
                        "inputs": {
                            "FROM": { "shadow": { "type": "math_number", "fields": { "NUM": 1 } } },
                            "TO": { "shadow": { "type": "math_number", "fields": { "NUM": 100 } } },
                            "BY": { "shadow": { "type": "math_number", "fields": { "NUM": 1 } } },
                            "DO": {
                                "block": {
                                    "type": "math_change",
                                    "fields": { "VAR": { "id": "sum", "name": "sum", "type": "" } },
                                    "inputs": { "DELTA": { "block": { "type": "variables_get", "fields": { "VAR": { "id": "i", "name": "i", "type": "" } } } } }
                                }
                            }
                        },
                        "next": {
                            "block": {
                                "type": "applaa_log",
                                "inputs": { "MESSAGE": { "block": { "type": "variables_get", "fields": { "VAR": { "id": "sum", "name": "sum", "type": "" } } } } }
                            }
                        }
                    }
                }
            }
        ])
    },

    // --- More LOGIC ---
    {
        id: 'logic_password',
        title: 'Password Checker',
        description: 'Check if a password is correct.',
        category: 'Logic',
        difficulty: 'Beginner',
        workspace: createWorkspace([
            {
                "type": "variables_set",
                "x": 50, "y": 50,
                "fields": { "VAR": { "id": "pwd", "name": "password", "type": "" } },
                "inputs": { "VALUE": { "shadow": { "type": "text", "fields": { "TEXT": "secret123" } } } },
                "next": {
                    "block": {
                        "type": "controls_if",
                        "extraState": { "hasElse": true },
                        "inputs": {
                            "IF0": {
                                "block": {
                                    "type": "logic_compare",
                                    "fields": { "OP": "EQ" },
                                    "inputs": {
                                        "A": { "block": { "type": "variables_get", "fields": { "VAR": { "id": "pwd", "name": "password", "type": "" } } } },
                                        "B": { "shadow": { "type": "text", "fields": { "TEXT": "secret123" } } }
                                    }
                                }
                            },
                            "DO0": {
                                "block": {
                                    "type": "applaa_log",
                                    "inputs": { "MESSAGE": { "shadow": { "type": "text", "fields": { "TEXT": "Access Granted!" } } } }
                                }
                            },
                            "ELSE": {
                                "block": {
                                    "type": "applaa_log",
                                    "inputs": { "MESSAGE": { "shadow": { "type": "text", "fields": { "TEXT": "Access Denied!" } } } }
                                }
                            }
                        }
                    }
                }
            }
        ])
    },
    {
        id: 'logic_grade',
        title: 'Grade Calculator',
        description: 'Convert a score to a letter grade.',
        category: 'Logic',
        difficulty: 'Intermediate',
        workspace: createWorkspace([
            {
                "type": "variables_set",
                "x": 50, "y": 50,
                "fields": { "VAR": { "id": "score", "name": "score", "type": "" } },
                "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 85 } } } },
                "next": {
                    "block": {
                        "type": "controls_if",
                        "extraState": { "elseIfCount": 2, "hasElse": true },
                        "inputs": {
                            "IF0": {
                                "block": {
                                    "type": "logic_compare",
                                    "fields": { "OP": "GTE" },
                                    "inputs": {
                                        "A": { "block": { "type": "variables_get", "fields": { "VAR": { "id": "score", "name": "score", "type": "" } } } },
                                        "B": { "shadow": { "type": "math_number", "fields": { "NUM": 90 } } }
                                    }
                                }
                            },
                            "DO0": {
                                "block": {
                                    "type": "applaa_log",
                                    "inputs": { "MESSAGE": { "shadow": { "type": "text", "fields": { "TEXT": "Grade: A" } } } }
                                }
                            }
                        }
                    }
                }
            }
        ])
    },
    {
        id: 'logic_leap_year',
        title: 'Leap Year Checker',
        description: 'Determine if a year is a leap year.',
        category: 'Logic',
        difficulty: 'Advanced',
        workspace: createWorkspace([
            {
                "type": "variables_set",
                "x": 50, "y": 50,
                "fields": { "VAR": { "id": "year", "name": "year", "type": "" } },
                "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 2024 } } } },
                "next": {
                    "block": {
                        "type": "controls_if",
                        "extraState": { "hasElse": true },
                        "inputs": {
                            "IF0": {
                                "block": {
                                    "type": "logic_compare",
                                    "fields": { "OP": "EQ" },
                                    "inputs": {
                                        "A": {
                                            "block": {
                                                "type": "math_modulo",
                                                "inputs": {
                                                    "DIVIDEND": { "block": { "type": "variables_get", "fields": { "VAR": { "id": "year", "name": "year", "type": "" } } } },
                                                    "DIVISOR": { "shadow": { "type": "math_number", "fields": { "NUM": 4 } } }
                                                }
                                            }
                                        },
                                        "B": { "shadow": { "type": "math_number", "fields": { "NUM": 0 } } }
                                    }
                                }
                            },
                            "DO0": {
                                "block": {
                                    "type": "applaa_log",
                                    "inputs": { "MESSAGE": { "shadow": { "type": "text", "fields": { "TEXT": "Leap Year!" } } } }
                                }
                            },
                            "ELSE": {
                                "block": {
                                    "type": "applaa_log",
                                    "inputs": { "MESSAGE": { "shadow": { "type": "text", "fields": { "TEXT": "Not a Leap Year" } } } }
                                }
                            }
                        }
                    }
                }
            }
        ])
    },

    // --- SCIENCE ---
    {
        id: 'sci_distance',
        title: 'Distance Calculator',
        description: 'Calculate distance using speed and time.',
        category: 'Science',
        difficulty: 'Beginner',
        workspace: createWorkspace([
            {
                "type": "variables_set",
                "x": 50, "y": 50,
                "fields": { "VAR": { "id": "speed", "name": "speed", "type": "" } },
                "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 60 } } } },
                "next": {
                    "block": {
                        "type": "variables_set",
                        "fields": { "VAR": { "id": "time", "name": "time", "type": "" } },
                        "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 2 } } } },
                        "next": {
                            "block": {
                                "type": "applaa_log",
                                "inputs": {
                                    "MESSAGE": {
                                        "block": {
                                            "type": "math_arithmetic",
                                            "fields": { "OP": "MULTIPLY" },
                                            "inputs": {
                                                "A": { "block": { "type": "variables_get", "fields": { "VAR": { "id": "speed", "name": "speed", "type": "" } } } },
                                                "B": { "block": { "type": "variables_get", "fields": { "VAR": { "id": "time", "name": "time", "type": "" } } } }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ])
    },
    {
        id: 'sci_bmi',
        title: 'BMI Calculator',
        description: 'Calculate Body Mass Index.',
        category: 'Science',
        difficulty: 'Intermediate',
        workspace: createWorkspace([
            {
                "type": "variables_set",
                "x": 50, "y": 50,
                "fields": { "VAR": { "id": "weight", "name": "weight_kg", "type": "" } },
                "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 70 } } } },
                "next": {
                    "block": {
                        "type": "variables_set",
                        "fields": { "VAR": { "id": "height", "name": "height_m", "type": "" } },
                        "inputs": { "VALUE": { "shadow": { "type": "math_number", "fields": { "NUM": 1.75 } } } }
                    }
                }
            }
        ])
    },

    // --- MUSIC (Conceptual - using logs to simulate notes) ---
    {
        id: 'music_scale',
        title: 'Musical Scale',
        description: 'Play a C major scale (simulated).',
        category: 'Music',
        difficulty: 'Beginner',
        workspace: createWorkspace([
            {
                "type": "applaa_log",
                "x": 50, "y": 50,
                "inputs": { "MESSAGE": { "shadow": { "type": "text", "fields": { "TEXT": "♪ C" } } } },
                "next": {
                    "block": {
                        "type": "applaa_log",
                        "inputs": { "MESSAGE": { "shadow": { "type": "text", "fields": { "TEXT": "♪ D" } } } },
                        "next": {
                            "block": {
                                "type": "applaa_log",
                                "inputs": { "MESSAGE": { "shadow": { "type": "text", "fields": { "TEXT": "♪ E" } } } }
                            }
                        }
                    }
                }
            }
        ])
    },
    {
        id: 'music_rhythm',
        title: 'Rhythm Pattern',
        description: 'Create a simple beat pattern.',
        category: 'Music',
        difficulty: 'Intermediate',
        workspace: createWorkspace([
            {
                "type": "controls_repeat_ext",
                "x": 50, "y": 50,
                "inputs": {
                    "TIMES": { "shadow": { "type": "math_number", "fields": { "NUM": 4 } } },
                    "DO": {
                        "block": {
                            "type": "applaa_log",
                            "inputs": { "MESSAGE": { "shadow": { "type": "text", "fields": { "TEXT": "🥁 BOOM" } } } },
                            "next": {
                                "block": {
                                    "type": "applaa_log",
                                    "inputs": { "MESSAGE": { "shadow": { "type": "text", "fields": { "TEXT": "👏 CLAP" } } } }
                                }
                            }
                        }
                    }
                }
            }
        ])
    }
];
