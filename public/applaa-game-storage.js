/**
 * Applaa Game Storage Helper
 * 
 * Easy-to-use helper library for games to interact with Applaa's localStorage system
 * 
 * IMPORTANT: You don't need to pass gameId anymore! 
 * The gameId is automatically provided via postMessage when the game loads.
 * 
 * Usage:
 *   <script src="/applaa-game-storage.js"></script>
 *   <script>
 *     // Wait for gameId to be provided by Applaa
 *     let storage = null;
 *     window.addEventListener('message', (event) => {
 *       if (event.data.type === 'applaa-game-init') {
 *         storage = new ApplaaGameStorage(event.data.gameId, event.data.gameName);
 *         // Now you can use storage
 *         storage.loadData().then(data => { ... });
 *       }
 *     });
 *     
 *     // Or use without gameId (it will use the one provided by Applaa)
 *     const storage = new ApplaaGameStorage(); // gameId will be auto-detected
 *     storage.saveScore('Player Name', 1250);
 *   </script>
 */

(function() {
  'use strict';
  
  class ApplaaGameStorage {
    constructor(gameId, gameName) {
      this.gameId = gameId || null;
      this.gameName = gameName || null;
      this.messageHandlers = new Map();
      this.setupMessageListener();
      this.setupInitListener();
    }
    
    setupInitListener() {
      // Listen for gameId and gameName from Applaa parent window
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'applaa-game-init') {
          this.gameId = event.data.gameId;
          this.gameName = event.data.gameName;
        }
      });
    }

    setupMessageListener() {
      window.addEventListener('message', (event) => {
        const { type, gameId } = event.data || {};
        
        // Only handle messages for this game
        if (!type || (gameId && gameId !== this.gameId)) {
          return;
        }

        const handler = this.messageHandlers.get(type);
        if (handler) {
          handler(event.data);
        }
      });
    }

    /**
     * Load game data from storage
     * @returns {Promise<Object|null>} Game data or null if no data exists
     */
    loadData() {
      return new Promise((resolve) => {
        if (!this.gameId) {
          // GameId not available yet, try to get it from parent
          const initHandler = (event) => {
            if (event.data?.type === 'applaa-game-init') {
              this.gameId = event.data.gameId;
              this.gameName = event.data.gameName;
              window.removeEventListener('message', initHandler);
              // Try again now that we have gameId
              this.loadData().then(resolve);
            }
          };
          window.addEventListener('message', initHandler);
          // Also try requesting it (legacy games might not receive init message)
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({
              type: 'applaa-game-load-data'
            }, '*');
          }
          return;
        }
        
        const handler = (data) => {
          this.messageHandlers.delete('applaa-game-data-loaded');
          resolve(data.data || null);
        };
        
        this.messageHandlers.set('applaa-game-data-loaded', handler);
        
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'applaa-game-load-data',
            gameId: this.gameId // Optional - bridge will use its own gameId if not provided
          }, '*');
        } else {
          // Not in iframe, resolve with null
          resolve(null);
        }
      });
    }

    /**
     * Save a score
     * @param {string} playerName - Player's name
     * @param {number} score - Score value
     * @returns {Promise<Object>} Updated game data
     */
    saveScore(playerName, score) {
      return new Promise((resolve) => {
        if (!this.gameId && window.parent && window.parent !== window) {
          // Request gameId first
          this.loadData().then(() => {
            if (this.gameId) {
              this.saveScore(playerName, score).then(resolve);
            } else {
              resolve(null);
            }
          });
          return;
        }
        
        const handler = (data) => {
          this.messageHandlers.delete('applaa-game-score-saved');
          resolve(data.data || null);
        };
        
        this.messageHandlers.set('applaa-game-score-saved', handler);
        
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'applaa-game-save-score',
            gameId: this.gameId, // Optional - bridge will use its own gameId if not provided
            gameName: this.gameName, // Include game name
            playerName: playerName,
            score: score
          }, '*');
        } else {
          resolve(null);
        }
      });
    }

    /**
     * Save custom game data
     * @param {Object} data - Custom data to save
     * @returns {Promise<Object>} Updated game data
     */
    saveData(data) {
      return new Promise((resolve) => {
        const handler = (response) => {
          this.messageHandlers.delete('applaa-game-data-saved');
          resolve(response.data || null);
        };
        
        this.messageHandlers.set('applaa-game-data-saved', handler);
        
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'applaa-game-save-data',
            gameId: this.gameId,
            data: data
          }, '*');
        } else {
          resolve(null);
        }
      });
    }

    /**
     * Update game progress
     * @param {Object} progress - Progress data to update
     * @returns {Promise<Object>} Updated game data
     */
    updateProgress(progress) {
      return new Promise((resolve) => {
        const handler = (response) => {
          this.messageHandlers.delete('applaa-game-progress-updated');
          resolve(response.data || null);
        };
        
        this.messageHandlers.set('applaa-game-progress-updated', handler);
        
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'applaa-game-update-progress',
            gameId: this.gameId,
            progress: progress
          }, '*');
        } else {
          resolve(null);
        }
      });
    }

    /**
     * Update custom data fields
     * @param {Object} customData - Custom data to update
     * @returns {Promise<Object>} Updated game data
     */
    updateCustom(customData) {
      return new Promise((resolve) => {
        const handler = (response) => {
          this.messageHandlers.delete('applaa-game-custom-updated');
          resolve(response.data || null);
        };
        
        this.messageHandlers.set('applaa-game-custom-updated', handler);
        
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'applaa-game-update-custom',
            gameId: this.gameId,
            customData: customData
          }, '*');
        } else {
          resolve(null);
        }
      });
    }

    /**
     * Clear all game data
     * @returns {Promise<void>}
     */
    clearData() {
      return new Promise((resolve) => {
        const handler = () => {
          this.messageHandlers.delete('applaa-game-data-cleared');
          resolve();
        };
        
        this.messageHandlers.set('applaa-game-data-cleared', handler);
        
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'applaa-game-clear-data',
            gameId: this.gameId
          }, '*');
        } else {
          resolve();
        }
      });
    }
  }

  // Export to global scope
  if (typeof window !== 'undefined') {
    window.ApplaaGameStorage = ApplaaGameStorage;
  }
})();

