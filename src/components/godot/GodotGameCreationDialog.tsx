import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Gamepad2, Sparkles } from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';
import { useRouter } from '@tanstack/react-router';
import { useSetAtom } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { showError, showSuccess } from '@/lib/toast';

interface GodotGameCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userPrompt?: string;
}

export function GodotGameCreationDialog({
  isOpen,
  onClose,
  userPrompt = ''
}: GodotGameCreationDialogProps) {
  const [gameName, setGameName] = useState('');
  const [gameDescription, setGameDescription] = useState(userPrompt);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const ipcClient = IpcClient.getInstance();

  const handleCreate = useCallback(async () => {
    if (!gameName.trim()) {
      showError(new Error('Game name is required'));
      return;
    }

    setIsCreating(true);
    try {
      // Use create-app-instant for Godot apps to get background file creation
      const normalizedName = gameName.trim().toLowerCase().replace(/\s+/g, '-');
      const result = await ipcClient.createAppInstant({
        name: normalizedName,
        displayName: gameName,
        appType: 'godot',
        framework: 'web', // Not used for Godot but required by the interface
        prompt: gameDescription || `Create a ${gameName} game`
      });

      // Show notification if name was auto-changed
      if (result.app.name !== normalizedName) {
        showSuccess(`App created with name "${result.app.name}" (original name was already taken)`);
      }

      setSelectedAppId(result.app.id);

      // Note: create-app-instant creates Godot project files in the background
      // We don't need to call createGodotProject separately as it's handled by the background task

      // If user provided a description, generate game spec and build
      if (gameDescription.trim()) {
        try {
          const spec = await ipcClient.generateGameSpec({
            appId: result.app.id,
            prompt: gameDescription
          });

          await ipcClient.buildGodotGameFromSpec({
            appId: result.app.id,
            spec
          });

          showSuccess('Applaa game created and built successfully!');
        } catch (specError) {
          console.error('Failed to generate/build game spec:', specError);
          showError(new Error('Game created but failed to generate game specification. You can add it manually in the chat.'));
        }
      }

      // Navigate to the chat
      router.navigate({
        to: '/chat',
        search: { id: result.chatId }
      });

      onClose();
      setGameName('');
      setGameDescription('');
    } catch (error) {
      showError(error as Error);
    } finally {
      setIsCreating(false);
    }
  }, [gameName, gameDescription, ipcClient, router, setSelectedAppId, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-purple-600" />
            Create Applaa Game
          </DialogTitle>
          <DialogDescription>
            Create a new Applaa game project. Describe your game idea and we'll generate the game specification and build it automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="gameName">Game Name</Label>
            <Input
              id="gameName"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="My Awesome Game"
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gameDescription">Game Description</Label>
            <Textarea
              id="gameDescription"
              value={gameDescription}
              onChange={(e) => setGameDescription(e.target.value)}
              placeholder="Describe your game idea... e.g., 'A 2D platformer where the player jumps between platforms, collects coins, and defeats enemies'"
              rows={5}
              disabled={isCreating}
            />
            {/* <p className="text-xs text-muted-foreground">
              Describe your game and we'll automatically generate the game specification and build the Godot project.
            </p> */}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!gameName.trim() || isCreating}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Create Game
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

