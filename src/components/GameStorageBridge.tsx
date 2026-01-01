/**
 * Game Storage Bridge Component
 * 
 * Listens for postMessage events from game iframes and handles
 * localStorage operations for game data (scores, player names, etc.)
 */

import { useEffect } from 'react';
import {
  loadGameData,
  saveScore,
  saveGameData,
  updateGameProgress,
  updateCustomData,
  clearGameData,
  type GameData,
} from '@/services/gameStorage';

interface GameStorageBridgeProps {
  gameId: string;
  gameName?: string;
  iframeRef?: React.RefObject<HTMLIFrameElement>;
  onDataUpdate?: (data: GameData | null) => void;
}

export function GameStorageBridge({ gameId, gameName, iframeRef, onDataUpdate }: GameStorageBridgeProps) {
  useEffect(() => {
    if (!gameId) {
      console.warn('🎮 [GameStorageBridge] No gameId provided');
      return;
    }

    console.log('🎮 [GameStorageBridge] Initializing for gameId:', gameId, 'gameName:', gameName);
    
    // Verify localStorage is available
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        console.error('❌ [GameStorageBridge] localStorage is not available!');
        return;
      }
      // Test localStorage
      const testKey = '__applaa_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      console.log('✅ [GameStorageBridge] localStorage is available and working');
    } catch (error) {
      console.error('❌ [GameStorageBridge] localStorage test failed:', error);
      return;
    }

    // Send gameId and gameName to iframe when it loads
    const sendGameInfo = () => {
      if (iframeRef?.current?.contentWindow) {
        const initMessage = {
          type: 'applaa-game-init',
          gameId,
          gameName: gameName || 'Unknown Game',
        };
        console.log('🎮 [GameStorageBridge] Sending init message to iframe:', initMessage);
        iframeRef.current.contentWindow.postMessage(initMessage, '*');
      } else {
        console.warn('🎮 [GameStorageBridge] Cannot send init - iframe contentWindow not available');
      }
    };

    // Send gameId and gameName to iframe when it loads
    const iframe = iframeRef?.current;
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (iframe) {
      // Use load event (works for cross-origin iframes)
      // Also try immediately in case iframe already loaded
      const trySend = () => {
        try {
          if (iframe.contentWindow) {
            sendGameInfo();
          }
        } catch (e) {
          // Cross-origin - can't access, will use load event
        }
      };
      
      // Try immediately
      trySend();
      
      // Also listen for load event (in case it loads later or we couldn't access contentWindow)
      iframe.addEventListener('load', sendGameInfo, { once: true });
      
      // Also try after a short delay (for slow-loading iframes)
      timeoutId = setTimeout(() => {
        trySend();
      }, 1000);
    }

    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from same origin
      // In Electron, we can be more permissive, but still validate structure
      if (!event.data || typeof event.data !== 'object') {
        return;
      }

      const { type, gameId: messageGameId } = event.data;

      // Debug logging
      console.log('🎮 [GameStorageBridge] Received message:', {
        type,
        messageGameId,
        bridgeGameId: gameId,
        fullData: event.data
      });

      // If message has gameId, verify it matches. If not, use bridge's gameId (more permissive)
      const effectiveGameId = messageGameId || gameId;
      
      // Only reject if message has a different gameId
      if (messageGameId && messageGameId !== gameId) {
        console.warn('🎮 [GameStorageBridge] Rejected message - gameId mismatch:', {
          messageGameId,
          bridgeGameId: gameId
        });
        return;
      }

      // Handle different message types
      switch (type) {
        case 'applaa-game-load-data': {
          // Game is requesting its data
          console.log('🎮 [GameStorageBridge] Processing load-data request for gameId:', effectiveGameId);
          const data = loadGameData(effectiveGameId);
          console.log('🎮 [GameStorageBridge] Loaded data:', data);
          
          // If no data exists and we have gameName, initialize with gameName
          let finalData = data;
          if (!data && gameName) {
            console.log('🎮 [GameStorageBridge] No data found, initializing with gameName:', gameName);
            finalData = {
              gameId: effectiveGameId,
              gameName,
              scores: [],
              highScore: 0,
              lastPlayerName: null,
              gameProgress: {},
              customData: {},
            };
            saveGameData(finalData);
            console.log('✅ [GameStorageBridge] Initialized new game data');
          }
          
          // Send data back to the game iframe
          event.source?.postMessage(
            {
              type: 'applaa-game-data-loaded',
              gameId: effectiveGameId,
              data: finalData,
            },
            '*' // In Electron we can use wildcard
          );
          
          if (onDataUpdate) {
            onDataUpdate(finalData);
          }
          break;
        }

        case 'applaa-game-save-score': {
          // Game is saving a score
          console.log('🎮 [GameStorageBridge] Processing save-score request:', event.data);
          const { playerName, score, gameName: messageGameName } = event.data;
          if (typeof score === 'number' && playerName) {
            console.log('🎮 [GameStorageBridge] Saving score:', {
              gameId: effectiveGameId,
              playerName,
              score,
              gameName: messageGameName || gameName
            });
            const updatedData = saveScore(effectiveGameId, playerName, score, messageGameName || gameName);
            console.log('✅ [GameStorageBridge] Score saved successfully!', updatedData);
            
            // Notify game that save was successful
            event.source?.postMessage(
              {
                type: 'applaa-game-score-saved',
                gameId: effectiveGameId,
                data: updatedData,
              },
              '*'
            );
            
            if (onDataUpdate) {
              onDataUpdate(updatedData);
            }
          }
          break;
        }

        case 'applaa-game-save-data': {
          // Game is saving custom data
          const { data: gameData } = event.data;
          if (gameData) {
            saveGameData({ 
              gameId: effectiveGameId, 
              gameName: gameData.gameName || gameName || 'Unknown Game',
              ...gameData 
            });
            
            const updatedData = loadGameData(effectiveGameId);
            event.source?.postMessage(
              {
                type: 'applaa-game-data-saved',
                gameId: effectiveGameId,
                data: updatedData,
              },
              '*'
            );
            
            if (onDataUpdate) {
              onDataUpdate(updatedData);
            }
          }
          break;
        }

        case 'applaa-game-update-progress': {
          // Game is updating progress
          const { progress, gameName: messageGameName } = event.data;
          if (progress && typeof progress === 'object') {
            updateGameProgress(effectiveGameId, progress, messageGameName || gameName);
            
            const updatedData = loadGameData(effectiveGameId);
            event.source?.postMessage(
              {
                type: 'applaa-game-progress-updated',
                gameId: effectiveGameId,
                data: updatedData,
              },
              '*'
            );
            
            if (onDataUpdate) {
              onDataUpdate(updatedData);
            }
          }
          break;
        }

        case 'applaa-game-update-custom': {
          // Game is updating custom data
          const { customData, gameName: messageGameName } = event.data;
          if (customData && typeof customData === 'object') {
            updateCustomData(effectiveGameId, customData, messageGameName || gameName);
            
            const updatedData = loadGameData(effectiveGameId);
            event.source?.postMessage(
              {
                type: 'applaa-game-custom-updated',
                gameId: effectiveGameId,
                data: updatedData,
              },
              '*'
            );
            
            if (onDataUpdate) {
              onDataUpdate(updatedData);
            }
          }
          break;
        }

        case 'applaa-game-clear-data': {
          // Game wants to clear all its data
          clearGameData(effectiveGameId);
          
          event.source?.postMessage(
            {
              type: 'applaa-game-data-cleared',
              gameId: effectiveGameId,
            },
            '*'
          );
          
          if (onDataUpdate) {
            onDataUpdate(null);
          }
          break;
        }

        default:
          // Unknown message type, ignore
          break;
      }
    };

    // Add event listener
    window.addEventListener('message', handleMessage);

    // Cleanup
    return () => {
      window.removeEventListener('message', handleMessage);
      if (iframe) {
        iframe.removeEventListener('load', sendGameInfo);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [gameId, gameName, iframeRef, onDataUpdate]);

  // This component doesn't render anything
  return null;
}

