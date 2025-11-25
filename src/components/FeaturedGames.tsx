/**
 * Featured Games Component
 * 
 * Displays 3 featured games on the main page with the same design as the hub
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

interface FeaturedGamesProps {
  className?: string;
}

export function FeaturedGames({ className = '' }: FeaturedGamesProps) {
  const [selectedGameUrl, setSelectedGameUrl] = useState<string | null>(null);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);

  // 3 featured games to showcase on main page
  const featuredGames: Game[] = [
    {
      id: 'snake-game',
      name: 'Snake Game',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/ChatGPT-Image-Sep-29-2025-12_00_58-PM-200x300.png', // TODO: Replace with actual Snake Game image URL
      gameUrl: 'https://applaa-snake-2.vercel.app/'
    },
    {
      id: 'typing-invader',
      name: 'Typing Invader',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-27-2025-3_48PM-300x300.png', // TODO: Replace with actual Typing Invader image URL
      gameUrl: 'https://applaa.com/typing-invader/' // TODO: Replace with actual Typing Invader game URL
    },
    {
      id: 'fruit-catcher',
      name: 'Fruit Catcher',
      imageUrl: 'https://applaa.com/wp-content/uploads/2025/09/ChatGPT-Image-Sep-29-2025-12_05_02-PM-200x300.png', // TODO: Replace with actual Fruit Catcher image URL
      gameUrl: 'https://applaa.com/fruit-catcher/' // TODO: Replace with actual Fruit Catcher game URL
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

  return (
    <>
      <section className={`mb-8 ${className}`}>
        <header className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Featured Games
          </h2>
          <p className="text-md text-gray-600 dark:text-gray-400">
            Try these games created with Applaa
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredGames.map((game) => (
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
