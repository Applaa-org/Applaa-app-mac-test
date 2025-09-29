/**
 * Games Section Component
 * 
 * Displays a collection of games created with Applaa
 */

import React, { useState } from 'react';
import { GameCard } from './GameCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface Game {
  id: string;
  name: string;
  imageUrl: string;
  gameUrl: string;
}

interface GamesSectionProps {
  className?: string;
}

export function GamesSection({ className = '' }: GamesSectionProps) {
  const [selectedGameUrl, setSelectedGameUrl] = useState<string | null>(null);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);

  // Your actual games created with Applaa
  const games: Game[] = [
    {
      id: 'endless-runner',
      name: 'Endless Runner',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-27-2025-3_48PM-300x300.png',
      gameUrl: 'https://endless-runner.vercel.app/'
    },
    {
      id: 'math-tutorial',
      name: 'Math Tutorial Class 9',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/ChatGPT-Image-Sep-29-2025-12_05_02-PM-200x300.png',
      gameUrl: 'https://math-tutorial-class9.vercel.app/'
    },
    {
      id: 'solitaire',
      name: 'Solitaire Card Game',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/ChatGPT-Image-Sep-29-2025-12_00_58-PM-200x300.png',
      gameUrl: 'https://solitaire-card-game2.vercel.app/'
    },
    {
      id: 'rock-paper-scissors',
      name: 'Rock Paper Scissors',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-29-2025-11_34AM-233x300.png',
      gameUrl: 'https://rock-paper-scissor-kimi-k2-v1.vercel.app/'
    },
    {
      id: 'connect-four',
      name: 'Connect Four',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-29-2025-11_26AM-233x300.png',
      gameUrl: 'https://connect-four.vercel.app/'
    },
    {
      id: 'spot-the-difference',
      name: 'Spot the Difference',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-29-2025-11_16AM-233x300.png',
      gameUrl: 'https://spot-the-difference.vercel.app/'
    },
    {
      id: 'whack-a-mole',
      name: 'Whack a Mole',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-27-2025-9_37PM-233x300.png',
      gameUrl: 'https://whack-a-mole.vercel.app/'
    },
    {
      id: 'memory-card',
      name: 'Memory Card Game',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-27-2025-5_29PM-300x282.png',
      gameUrl: 'https://memory-card-game-nu-ecru.vercel.app/'
    },
    {
      id: 'dots-and-boxes',
      name: 'Dots and Boxes',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-27-2025-5_21PM-300x219.png',
      gameUrl: 'https://dots-and-boxes-game-two.vercel.app/'
    },
    {
      id: 'words-finding',
      name: 'Words Finding Puzzle',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-27-2025-5_19PM-300x282.png',
      gameUrl: 'https://words-finding-puzzle-game-new.vercel.app/'
    },
    {
      id: 'crossword',
      name: 'Crossword Puzzle',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-27-2025-5_15PM-300x233.png',
      gameUrl: 'https://crossword-puzzle-game-five.vercel.app/'
    },
    {
      id: 'number-link',
      name: 'Number Link Puzzle',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-27-2025-5_12PM-300x300.png',
      gameUrl: 'https://number-link-puzzle.vercel.app/'
    },
    {
      id: 'maze-game',
      name: 'Maze Game',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/maze-1.jpg',
      gameUrl: 'https://maze-game.vercel.app/'
    },
    {
      id: 'breakout',
      name: 'Breakout Arkanoid',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-27-2025-9_47PM-233x300.png',
      gameUrl: 'https://breakout-arkanoid.vercel.app/'
    },
    {
      id: 'tik-tok-toe',
      name: 'Tik Tok Toe',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/maze.jpg',
      gameUrl: 'https://applaa.com/tik-tok-toe/'
    },
    {
      id: 'sliding-puzzle',
      name: 'Sliding Puzzle',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/ChatGPT-Image-Sep-7-2025-05_22_26-PM-2.png',
      gameUrl: 'https://applaa.com/sliding-puzzle/'
    },
    {
      id: 'scape-the-maze',
      name: 'Scape the Maze',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/maze-1.jpg',
      gameUrl: 'https://applaa.com/scape-the-maze/'
    },
    {
      id: 'adventure-map',
      name: 'Adventure Map',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/ChatGPT-Image-Sep-7-2025-05_54_31-PM-1024x683.png',
      gameUrl: 'https://applaa.com/adventure-map/'
    }
  ];

  const handlePlayGame = (url: string) => {
    setSelectedGameUrl(url);
    setIsGameModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsGameModalOpen(false);
    setSelectedGameUrl(null);
  };

  const handleOpenExternal = () => {
    if (selectedGameUrl) {
      window.open(selectedGameUrl, '_blank');
    }
  };

  if (games.length === 0) {
    return null;
  }

  return (
    <>
      <section className={`mb-12 ${className}`}>
        <header className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Your Games
          </h2>
          <p className="text-md text-gray-600 dark:text-gray-400">
            Games created with Applaa - click to play
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <GameCard
              key={game.id}
              name={game.name}
              imageUrl={game.imageUrl}
              gameUrl={game.gameUrl}
              onPlay={handlePlayGame}
            />
          ))}
        </div>
      </section>

      {/* Game Modal */}
      <Dialog open={isGameModalOpen} onOpenChange={setIsGameModalOpen}>
        <DialogContent className="!max-w-none !w-[98vw] !h-[95vh] p-0" style={{ width: '98vw', height: '95vh', maxWidth: 'none', maxHeight: 'none' }}>
          <DialogHeader className="p-6 pb-0 mt-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">
                Playing Game
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenExternal}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </Button>
            </div>
          </DialogHeader>
          
          {selectedGameUrl && (
            <div className="flex-1 p-6 pt-0" style={{ height: 'calc(95vh - 120px)' }}>
              <iframe
                src={selectedGameUrl}
                className="w-full h-full border-0 rounded-lg"
                title="Game"
                allow="fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ height: 'calc(95vh - 120px)' }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
