/**
 * Edit Game Dialog Component
 * 
 * Dialog for editing an existing game
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IpcClient } from '@/ipc/ipc_client';
import { showError, showSuccess } from '@/lib/toast';
import { Loader2 } from 'lucide-react';

interface Game {
  id: string;
  name: string;
  imageUrl: string;
  gameUrl: string;
}

interface EditGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: Game | null;
  onGameUpdated?: () => void;
}

export function EditGameDialog({ open, onOpenChange, game, onGameUpdated }: EditGameDialogProps) {
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [gameUrl, setGameUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ipcClient = IpcClient.getInstance();

  useEffect(() => {
    if (game) {
      setName(game.name);
      setImageUrl(game.imageUrl);
      setGameUrl(game.gameUrl);
    }
  }, [game]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!game) return;
    
    if (!name.trim() || !imageUrl.trim() || !gameUrl.trim()) {
      showError(new Error('Please fill in all fields'));
      return;
    }

    // Basic URL validation
    try {
      new URL(imageUrl);
    } catch {
      showError(new Error('Please enter a valid image URL'));
      return;
    }

    try {
      new URL(gameUrl);
    } catch {
      showError(new Error('Please enter a valid game URL'));
      return;
    }

    setIsSubmitting(true);
    try {
      await ipcClient.updateCustomGame({
        id: game.id,
        name: name.trim(),
        imageUrl: imageUrl.trim(),
        gameUrl: gameUrl.trim(),
      });

      showSuccess('Game updated successfully!');
      
      onGameUpdated?.();
      onOpenChange(false);
    } catch (error) {
      showError(error as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  if (!game) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Game</DialogTitle>
          <DialogDescription>
            Update the game information. All fields are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editGameName">Game Name</Label>
              <Input
                id="editGameName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter game name..."
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editImageUrl">Image URL</Label>
              <Input
                id="editImageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/game-image.png"
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-muted-foreground">
                URL to the game's preview image
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editGameUrl">Game URL</Label>
              <Input
                id="editGameUrl"
                type="url"
                value={gameUrl}
                onChange={(e) => setGameUrl(e.target.value)}
                placeholder="https://example.com/game"
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-muted-foreground">
                URL where the game can be played
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim() || !imageUrl.trim() || !gameUrl.trim()}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? 'Updating...' : 'Update Game'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

