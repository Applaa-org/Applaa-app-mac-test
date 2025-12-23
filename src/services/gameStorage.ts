/**
 * Game Storage Service
 * 
 * Manages localStorage for game data (scores, player names, etc.)
 * Each game has isolated storage using gameId as the key prefix
 */

// Check if localStorage is available
function getLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return null;
  } catch (error) {
    console.error('❌ [gameStorage] localStorage not available:', error);
    return null;
  }
}

export interface GameScore {
  playerName: string;
  score: number;
  timestamp: string;
}

export interface GameData {
  gameId: string;
  gameName: string;
  scores: GameScore[];
  highScore: number;
  lastPlayerName: string | null;
  gameProgress?: Record<string, unknown>;
  customData?: Record<string, unknown>;
}

const STORAGE_PREFIX = 'applaa-game-data-';

/**
 * Get storage key for a specific game
 */
function getStorageKey(gameId: string): string {
  return `${STORAGE_PREFIX}${gameId}`;
}

/**
 * Load game data from localStorage
 */
export function loadGameData(gameId: string): GameData | null {
  try {
    const storage = getLocalStorage();
    if (!storage) {
      console.error('❌ [gameStorage] localStorage not available in loadGameData');
      return null;
    }

    const key = getStorageKey(gameId);
    console.log('💾 [gameStorage] loadGameData - key:', key);
    const stored = storage.getItem(key);
    console.log('💾 [gameStorage] loadGameData - stored value:', stored ? 'exists' : 'null');
    
    if (!stored) {
      console.log('💾 [gameStorage] No stored data for key:', key);
      return null;
    }
    
    const data = JSON.parse(stored) as GameData;
    console.log('💾 [gameStorage] Parsed data:', data);
    
    // Ensure required fields exist
    return {
      gameId: data.gameId || gameId,
      gameName: data.gameName || 'Unknown Game',
      scores: data.scores || [],
      highScore: data.highScore || 0,
      lastPlayerName: data.lastPlayerName || null,
      gameProgress: data.gameProgress || {},
      customData: data.customData || {},
    };
  } catch (error) {
    console.error(`❌ [gameStorage] Failed to load game data for ${gameId}:`, error);
    return null;
  }
}

/**
 * Save game data to localStorage
 */
export function saveGameData(gameData: Partial<GameData> & { gameId: string }): void {
  try {
    const storage = getLocalStorage();
    if (!storage) {
      console.error('❌ [gameStorage] localStorage not available in saveGameData');
      throw new Error('localStorage is not available');
    }

    const key = getStorageKey(gameData.gameId);
    console.log('💾 [gameStorage] saveGameData - key:', key);
    
    // Load existing data first
    const existing = loadGameData(gameData.gameId);
    console.log('💾 [gameStorage] Existing data before merge:', existing);
    
    // Merge with new data
    const updated: GameData = {
      gameId: gameData.gameId,
      gameName: gameData.gameName ?? existing?.gameName ?? 'Unknown Game',
      scores: gameData.scores ?? existing?.scores ?? [],
      highScore: gameData.highScore ?? existing?.highScore ?? 0,
      lastPlayerName: gameData.lastPlayerName ?? existing?.lastPlayerName ?? null,
      gameProgress: { ...existing?.gameProgress, ...gameData.gameProgress },
      customData: { ...existing?.customData, ...gameData.customData },
    };
    
    console.log('💾 [gameStorage] Merged data to save:', updated);
    const jsonData = JSON.stringify(updated);
    console.log('💾 [gameStorage] JSON string length:', jsonData.length);
    
    storage.setItem(key, jsonData);
    console.log('✅ [gameStorage] Data saved to localStorage with key:', key);
    
    // Verify immediately
    const verify = storage.getItem(key);
    console.log('💾 [gameStorage] Verification - localStorage.getItem returned:', verify ? 'data exists (' + verify.length + ' chars)' : 'null');
    
    if (!verify) {
      throw new Error('Data was not saved - verification failed');
    }
  } catch (error) {
    console.error(`❌ [gameStorage] Failed to save game data for ${gameData.gameId}:`, error);
    throw error;
  }
}

/**
 * Save a new score for a game
 */
export function saveScore(gameId: string, playerName: string, score: number, gameName?: string): GameData {
  console.log('💾 [gameStorage] saveScore called:', { gameId, playerName, score, gameName });
  const existing = loadGameData(gameId);
  console.log('💾 [gameStorage] Existing data:', existing);
  const scores = existing?.scores || [];
  
  // Add new score
  const newScore: GameScore = {
    playerName,
    score,
    timestamp: new Date().toISOString(),
  };
  
  const updatedScores = [...scores, newScore]
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .slice(0, 100); // Keep top 100 scores
  
  const highScore = Math.max(...updatedScores.map(s => s.score));
  
  const gameData: GameData = {
    gameId,
    gameName: gameName ?? existing?.gameName ?? 'Unknown Game',
    scores: updatedScores,
    highScore,
    lastPlayerName: playerName,
    gameProgress: existing?.gameProgress,
    customData: existing?.customData,
  };
  
  console.log('💾 [gameStorage] Saving gameData:', gameData);
  saveGameData(gameData);
  
  // Verify it was saved
  const verify = loadGameData(gameId);
  console.log('💾 [gameStorage] Verification - data after save:', verify);
  
  return gameData;
}

/**
 * Update game progress
 */
export function updateGameProgress(
  gameId: string,
  progress: Record<string, unknown>,
  gameName?: string
): void {
  const existing = loadGameData(gameId);
  saveGameData({
    gameId,
    gameName: gameName ?? existing?.gameName ?? 'Unknown Game',
    gameProgress: { ...existing?.gameProgress, ...progress },
    scores: existing?.scores,
    highScore: existing?.highScore,
    lastPlayerName: existing?.lastPlayerName,
    customData: existing?.customData,
  });
}

/**
 * Update custom data
 */
export function updateCustomData(
  gameId: string,
  customData: Record<string, unknown>,
  gameName?: string
): void {
  const existing = loadGameData(gameId);
  saveGameData({
    gameId,
    gameName: gameName ?? existing?.gameName ?? 'Unknown Game',
    customData: { ...existing?.customData, ...customData },
    scores: existing?.scores,
    highScore: existing?.highScore,
    lastPlayerName: existing?.lastPlayerName,
    gameProgress: existing?.gameProgress,
  });
}

/**
 * Clear all game data for a specific game
 */
export function clearGameData(gameId: string): void {
  try {
    const storage = getLocalStorage();
    if (!storage) {
      console.error('❌ [gameStorage] localStorage not available in clearGameData');
      return;
    }
    const key = getStorageKey(gameId);
    storage.removeItem(key);
    console.log('💾 [gameStorage] Cleared data for key:', key);
  } catch (error) {
    console.error(`❌ [gameStorage] Failed to clear game data for ${gameId}:`, error);
  }
}

/**
 * Get high score for a game
 */
export function getHighScore(gameId: string): number {
  const data = loadGameData(gameId);
  return data?.highScore ?? 0;
}

/**
 * Get top scores for a game
 */
export function getTopScores(gameId: string, limit: number = 10): GameScore[] {
  const data = loadGameData(gameId);
  return data?.scores.slice(0, limit) ?? [];
}

