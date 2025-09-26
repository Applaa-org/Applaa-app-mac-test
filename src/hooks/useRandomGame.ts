import { useState, useCallback, useRef } from 'react';

export interface GameOption {
  id: string;
  name: string;
  url: string;
  description: string;
}

export const GAME_OPTIONS: GameOption[] = [
  {
    id: 'memory-card',
    name: 'Memory Card Game',
    url: 'https://memory-card-game-nu-ecru.vercel.app/',
    description: 'Match pairs of cards in this classic memory game'
  },
  {
    id: 'connect-four',
    name: 'Connect Four',
    url: 'https://connect-four.vercel.app/',
    description: 'Drop discs to connect four in a row'
  },
  {
    id: 'endless-runner',
    name: 'Endless Runner',
    url: 'https://endless-runner.vercel.app/',
    description: 'Run, jump, and dodge obstacles in this endless adventure'
  },
  {
    id: 'maze-game',
    name: 'Maze Game',
    url: 'https://maze-game.vercel.app/',
    description: 'Navigate through challenging mazes'
  },
  {
    id: 'words-puzzle',
    name: 'Words Finding Puzzle',
    url: 'https://words-finding-puzzle-game-new.vercel.app/',
    description: 'Find hidden words in the letter grid'
  },
  {
    id: 'fishing-game',
    name: 'Fishing Game',
    url: 'https://fishing-game-gemini1.vercel.app/',
    description: 'Catch fish and score points in this relaxing game'
  }
];

// Global variable to store the initial random game (only set once)
let initialRandomGame: GameOption | null = null;

export function useRandomGame() {
  const [currentGame, setCurrentGame] = useState<GameOption>(() => {
    // Only generate random game once globally
    if (!initialRandomGame) {
      const randomIndex = Math.floor(Math.random() * GAME_OPTIONS.length);
      initialRandomGame = GAME_OPTIONS[randomIndex];
    }
    return initialRandomGame;
  });

  const lastChangeTime = useRef<number>(0);
  const MIN_CHANGE_DELAY = 1000; // 1 second minimum delay between changes

  const selectRandomGame = useCallback(() => {
    const now = Date.now();
    if (now - lastChangeTime.current < MIN_CHANGE_DELAY) {
      return; // Prevent rapid changes
    }
    
    lastChangeTime.current = now;
    
    // Get all games except the current one
    const otherGames = GAME_OPTIONS.filter(game => game.id !== currentGame.id);
    const randomIndex = Math.floor(Math.random() * otherGames.length);
    setCurrentGame(otherGames[randomIndex]);
  }, [currentGame]);

  const selectSpecificGame = useCallback((gameId: string) => {
    const now = Date.now();
    if (now - lastChangeTime.current < MIN_CHANGE_DELAY) {
      return; // Prevent rapid changes
    }
    
    lastChangeTime.current = now;
    
    const game = GAME_OPTIONS.find(g => g.id === gameId);
    if (game) {
      setCurrentGame(game);
    }
  }, []);

  return {
    currentGame,
    selectRandomGame,
    selectSpecificGame,
    allGames: GAME_OPTIONS
  };
}
