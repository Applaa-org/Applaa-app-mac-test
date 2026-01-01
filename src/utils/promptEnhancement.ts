/**
 * Utility functions for enhancing prompts before submission
 */

/**
 * Detects if a prompt is related to creating a game
 */
function isGamePrompt(prompt: string): boolean {
  const gameKeywords = [
    'game',
    'snake',
    'puzzle',
    'arcade',
    'platformer',
    'rpg',
    'adventure game',
    'racing game',
    'shooter',
    'strategy game',
    'board game',
    'card game',
    'word game',
    'quiz game',
    'trivia',
    'godot',
    'game engine',
    'game development',
    'gameplay',
    'player score',
    'high score',
    'leaderboard',
    'game over',
    'victory',
    'level',
    'character',
    'enemy',
    'boss',
    'power-up',
    'collectible',
  ];
  
  const lowerPrompt = prompt.toLowerCase();
  return gameKeywords.some(keyword => lowerPrompt.includes(keyword));
}

/**
 * Appends localStorage instruction for game data persistence
 */
const LOCAL_STORAGE_INSTRUCTION = `

**MANDATORY: Keep game data in localStorage**
Always save and persist the following game-related data in localStorage using the Applaa Game Storage API:
- High score (automatically calculated and saved)
- Player name (save when player enters name)
- Game scores (save all scores with player names)
- Game progress (levels completed, achievements, etc.)
- Any other game-related data (coins, lives, power-ups, etc.)

Display the high score prominently on:
1. Main menu/start screen (initialize to 0, then update from localStorage)
2. HUD during gameplay (always visible)
3. Game over screen (with comparison to previous high score)

Use the Applaa Game Storage API to save and load this data. The data persists across game sessions.`;

/**
 * Enhances a prompt by appending localStorage instructions if it's a game-related prompt
 */
export function enhancePromptForGameStorage(prompt: string): string {
  if (!prompt.trim()) {
    return prompt;
  }
  
  // Check if this is a game-related prompt
  if (isGamePrompt(prompt)) {
    // Check if localStorage instruction is already present
    if (prompt.includes('localStorage') || prompt.includes('local storage') || prompt.includes('Applaa Game Storage')) {
      // Already has localStorage instruction, don't duplicate
      return prompt;
    }
    
    // Append the localStorage instruction
    return prompt + LOCAL_STORAGE_INSTRUCTION;
  }
  
  return prompt;
}

