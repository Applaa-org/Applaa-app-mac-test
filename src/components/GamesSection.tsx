/**
 * Games Section Component
 * 
 * Displays a collection of games created with Applaa
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GameCard } from './GameCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Plus } from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';
import { AddGameDialog } from './AddGameDialog';

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
  const [isAddGameDialogOpen, setIsAddGameDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const ipcClient = IpcClient.getInstance();

  // Fetch all games from Supabase (includes default + custom games)
  const { data: allGames = [], isLoading, error: gamesError } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      try {
        const games = await ipcClient.listCustomGames();
        console.log('Fetched games from Supabase:', games);
        return games;
      } catch (error) {
        console.error('Error fetching games:', error);
        throw error;
      }
    },
  });

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

  const handleGameAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['games'] });
  };

  // Show error if there's one
  if (gamesError) {
    console.error('Games query error:', gamesError);
  }

  if (allGames.length === 0 && !isLoading) {
    return null;
  }

  return (
    <>
      <section className={`mb-12 ${className}`}>
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Your Games
            </h2>
            <p className="text-md text-gray-600 dark:text-gray-400">
              Games created with Applaa - click to play
            </p>
          </div>
          <Button
            onClick={() => setIsAddGameDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Game
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allGames.map((game) => (
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

      {/* Add Game Dialog */}
      <AddGameDialog
        open={isAddGameDialogOpen}
        onOpenChange={setIsAddGameDialogOpen}
        onGameAdded={handleGameAdded}
      />

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
