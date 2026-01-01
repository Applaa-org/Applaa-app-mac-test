import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2, Minimize2, Gamepad2 } from 'lucide-react';
import { GameOption } from '@/hooks/useRandomGame';
import { StreamingGameSelector } from '@/components/StreamingGameSelector';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { useSettings } from '@/hooks/useSettings';
import { ScreenSizeToggle, type ScreenSize, getScreenSizeDimensions } from '@/components/preview_panel/ScreenSizeToggle';

interface GamePopupWindowProps {
  isOpen: boolean;
  onClose: () => void;
  game: GameOption;
  onGameChange: (game: GameOption) => void;
}

export function GamePopupWindow({ isOpen, onClose, game, onGameChange }: GamePopupWindowProps) {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [previousPosition, setPreviousPosition] = useState({ x: 100, y: 100 });
  const [previousSize, setPreviousSize] = useState({ width: 800, height: 600 });
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');
  const popupRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasShownConfirmationRef = useRef(false);
  
  const { updateSettings } = useSettings();
  
  // Show confirmation dialog when game window opens (only once per open)
  useEffect(() => {
    if (isOpen && !hasShownConfirmationRef.current) {
      setShowCloseConfirmation(true);
      hasShownConfirmationRef.current = true;
    }
    
    // Reset flag when window closes
    if (!isOpen) {
      hasShownConfirmationRef.current = false;
    }
  }, [isOpen]);
  
  // Update size when screen size changes (only if not maximized and not manually resized)
  useEffect(() => {
    if (!isMaximized) {
      const dimensions = getScreenSizeDimensions(screenSize);
      setSize({ width: dimensions.width, height: dimensions.height });
    }
  }, [screenSize, isMaximized]);
  
  // Use a stable game state that only updates when the game actually changes
  const [stableGame, setStableGame] = useState(game);
  const [currentGameUrl, setCurrentGameUrl] = useState(game.url);

  // Memoize the game to prevent unnecessary re-renders
  const memoizedGame = useMemo(() => stableGame, [stableGame.id, stableGame.url]);

  // Handle game change from selector
  const handleGameChange = (newGame: GameOption) => {
    setStableGame(newGame);
    setCurrentGameUrl(newGame.url);
    onGameChange(newGame);
  };

  // Only update when game actually changes (by ID, not by reference)
  useEffect(() => {
    if (game.id !== stableGame.id || game.url !== stableGame.url) {
      setStableGame(game);
      setCurrentGameUrl(game.url);
    }
  }, [game.id, game.url, stableGame.id, stableGame.url]);

  // Handle dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && !isMaximized) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, isMaximized]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isMaximized && popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const toggleMaximize = () => {
    if (isMaximized) {
      // Restore previous size and position
      setPosition(previousPosition);
      setSize(previousSize);
      setIsMaximized(false);
    } else {
      // Save current position and size
      setPreviousPosition(position);
      setPreviousSize(size);
      // Maximize
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight });
      setIsMaximized(true);
    }
  };

  const handleClose = () => {
    // Just close the window without showing confirmation
    onClose();
  };

  const handleConfirm = async (enableGameWindow: boolean) => {
    // Update the setting based on user's choice
    await updateSettings({
      enableGameWindowDuringStream: enableGameWindow,
    });
    
    // Close the confirmation dialog
    setShowCloseConfirmation(false);
    
    // If user selected "No", close the game window
    if (!enableGameWindow) {
      onClose();
    }
    // If user selected "Yes", keep the game window open (do nothing)
  };

  // Render game window when open (confirmation dialog can show on top)
  if (!isOpen) return null;

  const content = (
    <div
      ref={popupRef}
      className="fixed z-[9999] bg-white dark:bg-gray-900 rounded-lg shadow-2xl overflow-hidden flex flex-col border-2 border-gray-300 dark:border-gray-700"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        maxWidth: '100vw',
        maxHeight: '100vh',
      }}
    >
      {/* Header - Draggable */}
      <div
        className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5" />
          <span className="text-sm font-semibold">Game Window - {memoizedGame.name}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Screen Size Toggle */}
          <div onClick={(e) => e.stopPropagation()} className="relative z-[10001]">
            <ScreenSizeToggle
              value={screenSize}
              onChange={setScreenSize}
            />
          </div>
          
          {/* Game Selector */}
          <div onClick={(e) => e.stopPropagation()} className="relative z-[10001]">
            <StreamingGameSelector 
              currentGame={memoizedGame}
              onGameChange={handleGameChange}
            />
          </div>

          {/* Maximize/Minimize Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMaximize();
            }}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="p-1.5 hover:bg-red-500 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Game Content */}
      <div className="flex-1 relative bg-white dark:bg-gray-950">
        <iframe
          ref={iframeRef}
          key="game-popup-iframe"
          title={memoizedGame.name}
          className="w-full h-full border-none"
          src={currentGameUrl}
          allow="fullscreen; autoplay; picture-in-picture"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
        />
      </div>

      {/* Resize Handle */}
      {!isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-400 dark:bg-gray-600"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = size.width;
            const startHeight = size.height;

            const handleResize = (e: MouseEvent) => {
              const newWidth = Math.max(400, startWidth + (e.clientX - startX));
              const newHeight = Math.max(300, startHeight + (e.clientY - startY));
              setSize({ width: newWidth, height: newHeight });
            };

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleResize);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />
      )}
    </div>
  );

  return (
    <>
      {isOpen && createPortal(content, document.body)}
      <ConfirmationDialog
        isOpen={showCloseConfirmation}
        title="Game Window Preference"
        message="Do you want to play game while app is building?"
        confirmText="Yes"
        cancelText="No"
        confirmButtonClass="bg-green-600 hover:bg-green-700 focus:ring-green-500"
        onConfirm={() => handleConfirm(true)}
        onCancel={() => handleConfirm(false)}
      />
    </>
  );
}
