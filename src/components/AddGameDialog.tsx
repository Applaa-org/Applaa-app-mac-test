/**
 * Add Game Dialog Component
 * 
 * Dialog for adding a new custom game to the games collection
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IpcClient } from '@/ipc/ipc_client';
import { showError, showSuccess } from '@/lib/toast';
import { Loader2 } from 'lucide-react';

interface AddGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGameAdded?: () => void;
}

export function AddGameDialog({ open, onOpenChange, onGameAdded }: AddGameDialogProps) {
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [gameUrl, setGameUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ipcClient = IpcClient.getInstance();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      await ipcClient.createCustomGame({
        name: name.trim(),
        imageUrl: imageUrl.trim(),
        gameUrl: gameUrl.trim(),
      });

      showSuccess('Game added successfully!');
      
      // Reset form
      setName('');
      setImageUrl('');
      setGameUrl('');
      
      onGameAdded?.();
      onOpenChange(false);
    } catch (error) {
      showError(error as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setImageUrl('');
      setGameUrl('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Game</DialogTitle>
          <DialogDescription>
            Add a custom game to your games collection. Provide the game name, image URL, and game URL.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="gameName">Game Name</Label>
              <Input
                id="gameName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter game name..."
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
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
              <Label htmlFor="gameUrl">Game URL</Label>
              <Input
                id="gameUrl"
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
              {isSubmitting ? 'Adding...' : 'Add Game'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

