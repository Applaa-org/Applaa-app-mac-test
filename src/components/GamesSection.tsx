/**
 * Games Section Component
 * 
 * Displays a collection of games created with Applaa
 */

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { GameCard } from './GameCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Plus } from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';
import { AddGameDialog } from './AddGameDialog';
import { EditGameDialog } from './EditGameDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { showError, showSuccess } from '@/lib/toast';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { GameStorageBridge } from '@/components/GameStorageBridge';

interface Game {
  id: string;
  name: string;
  imageUrl: string;
  gameUrl: string;
  isDefault?: boolean;
  displayOrder?: number;
  viewCount?: number;
  likeCount?: number;
  userLiked?: boolean;
}

interface GamesSectionProps {
  className?: string;
}

export function GamesSection({ className = '' }: GamesSectionProps) {
  const [selectedGameUrl, setSelectedGameUrl] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedGameName, setSelectedGameName] = useState<string | null>(null);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isAddGameDialogOpen, setIsAddGameDialogOpen] = useState(false);
  const [isEditGameDialogOpen, setIsEditGameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [gameToEdit, setGameToEdit] = useState<Game | null>(null);
  const [gameToDelete, setGameToDelete] = useState<{ id: string; name: string } | null>(null);
  const queryClient = useQueryClient();
  const ipcClient = IpcClient.getInstance();
  const { hasPermission: hasAdminPermission } = useAdminPermission();

  // Expose test function globally for debugging
  useEffect(() => {
    // @ts-ignore
    window.testGameStorage = () => {
      console.log('🧪 Testing Game Storage...');
      const testGameId = 'test-game-' + Date.now();
      const testGameName = 'Test Game';
      
      // Import storage functions
      import('@/services/gameStorage').then(({ saveScore, loadGameData, saveGameData }) => {
        console.log('🧪 Step 1: Saving test score...');
        const saved = saveScore(testGameId, 'Test Player', 100, testGameName);
        console.log('✅ Saved:', saved);
        
        console.log('🧪 Step 2: Loading data back...');
        const loaded = loadGameData(testGameId);
        console.log('✅ Loaded:', loaded);
        
        console.log('🧪 Step 3: Checking localStorage directly...');
        const key = `applaa-game-data-${testGameId}`;
        const raw = localStorage.getItem(key);
        console.log('✅ Raw localStorage:', raw ? JSON.parse(raw) : 'null');
        
        console.log('🧪 Step 4: Listing all game storage keys...');
        const allKeys = Object.keys(localStorage).filter(k => k.startsWith('applaa-game-data-'));
        console.log('✅ All game storage keys:', allKeys);
        allKeys.forEach(k => {
          console.log(`  - ${k}:`, JSON.parse(localStorage.getItem(k) || '{}'));
        });
      });
    };
    
    return () => {
      // @ts-ignore
      delete window.testGameStorage;
    };
  }, []);

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

  const handlePlayGame = (game: Game) => {
    setSelectedGameUrl(game.gameUrl);
    setSelectedGameId(game.id);
    setSelectedGameName(game.name);
    setIsGameModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsGameModalOpen(false);
    setSelectedGameUrl(null);
    setSelectedGameId(null);
    setSelectedGameName(null);
  };

  const handleOpenExternal = () => {
    if (selectedGameUrl) {
      window.open(selectedGameUrl, '_blank');
    }
  };

  const handleGameAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['games'] });
  };

  const handleEditGame = (gameId: string) => {
    const game = allGames.find(g => g.id === gameId);
    if (game) {
      setGameToEdit(game);
      setIsEditGameDialogOpen(true);
    }
  };

  const handleGameUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['games'] });
  };

  const handleDeleteGame = (gameId: string, gameName: string) => {
    setGameToDelete({ id: gameId, name: gameName });
    setIsDeleteDialogOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (gameId: string) => {
      await ipcClient.deleteCustomGame({ id: gameId });
    },
    onSuccess: () => {
      showSuccess('Game deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['games'] });
      setIsDeleteDialogOpen(false);
      setGameToDelete(null);
    },
    onError: (error) => {
      showError(error as Error);
    },
  });

  const handleConfirmDelete = () => {
    if (gameToDelete) {
      deleteMutation.mutate(gameToDelete.id);
    }
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
             Games Hub
          </h2>
          <p className="text-md text-gray-600 dark:text-gray-400">
            Games created with Applaa - click to play
          </p>
          </div>
          {hasAdminPermission && (
            <Button
              onClick={() => setIsAddGameDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Game
            </Button>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allGames.map((game) => (
            <GameCard
              key={game.id}
              id={game.id}
              name={game.name}
              imageUrl={game.imageUrl}
              gameUrl={game.gameUrl}
              viewCount={game.viewCount}
              likeCount={game.likeCount}
              userLiked={game.userLiked}
              onPlay={() => handlePlayGame(game)}
              onEdit={hasAdminPermission && !game.isDefault ? handleEditGame : undefined}
              onDelete={hasAdminPermission && !game.isDefault ? handleDeleteGame : undefined}
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

      {/* Edit Game Dialog */}
      <EditGameDialog
        open={isEditGameDialogOpen}
        onOpenChange={setIsEditGameDialogOpen}
        game={gameToEdit}
        onGameUpdated={handleGameUpdated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Game</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{gameToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setGameToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          
          {selectedGameUrl && selectedGameId && (
            <>
              <GameStorageBridge 
                gameId={selectedGameId} 
                gameName={selectedGameName || undefined}
                iframeRef={iframeRef}
              />
              <div className="flex-1 p-6 pt-0" style={{ height: 'calc(95vh - 120px)' }}>
                <iframe
                  ref={iframeRef}
                  src={selectedGameUrl}
                  className="w-full h-full border-0 rounded-lg"
                  title="Game"
                  allow="fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ height: 'calc(95vh - 120px)' }}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
