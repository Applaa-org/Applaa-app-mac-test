import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Rocket } from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';
import { useRouter } from '@tanstack/react-router';
import { useSetAtom } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { showError, showSuccess } from '@/lib/toast';
import { ModelPicker } from '@/components/ModelPicker';

interface GodotGameCreationInputProps {
  onGameCreated?: () => void;
  initialDescription?: string;
}

export function GodotGameCreationInput({ onGameCreated, initialDescription = '' }: GodotGameCreationInputProps) {
  const [gameName, setGameName] = useState('');
  const [gameDescription, setGameDescription] = useState(initialDescription);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const ipcClient = IpcClient.getInstance();

  // Update description when initialDescription changes
  useEffect(() => {
    if (initialDescription) {
      setGameDescription(initialDescription);
    }
  }, [initialDescription]);

  const handleCreate = useCallback(async () => {
    if (!gameName.trim()) {
      showError(new Error('Game name is required'));
      return;
    }

    setIsCreating(true);
    try {
      const normalizedName = gameName.trim().toLowerCase().replace(/\s+/g, '-');
      const result = await ipcClient.createAppInstant({
        name: normalizedName,
        displayName: gameName,
        appType: 'godot',
        framework: 'web',
        prompt: gameDescription || `Create a ${gameName} game`
      });

      if (result.app.name !== normalizedName) {
        showSuccess(`App created with name "${result.app.name}" (original name was already taken)`);
      }

      setSelectedAppId(result.app.id);

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

      // Navigate to the chat with initial prompt so it appears in chat history
      // Include both game name and description so users can see what they created
      const finalPrompt = gameDescription.trim() 
        ? `Create a game called "${gameName}"\n\n${gameDescription}`
        : `Create a ${gameName} game`;
      router.navigate({
        to: '/chat',
        search: { 
          id: result.chatId,
          initialPrompt: finalPrompt
        }
      });

      onGameCreated?.();
      setGameName('');
      setGameDescription('');
    } catch (error) {
      showError(error as Error);
    } finally {
      setIsCreating(false);
    }
  }, [gameName, gameDescription, ipcClient, router, setSelectedAppId, onGameCreated]);

  return (
    <div className="p-4" data-testid="godot-game-input-container">
      {/* Game Name - Compact field above main input */}
      <div className="mb-3">
        <Label htmlFor="gameName" className="text-sm font-medium">Game Name</Label>
        <Input
          id="gameName"
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
          placeholder="My Awesome Game"
          disabled={isCreating}
          className="text-base mt-1"
        />
      </div>

      {/* Main Description Input - Large and prominent, clean like web/mobile */}
      <div className="relative flex flex-col space-y-2 border border-border rounded-lg bg-(--background-lighter) shadow-sm">
        <Textarea
          id="gameDescription"
          value={gameDescription}
          onChange={(e) => setGameDescription(e.target.value)}
          placeholder="Describe your game idea... e.g., 'A 2D platformer where the player jumps between platforms, collects coins, and defeats enemies'"
          rows={2}
          disabled={isCreating}
          className="text-base resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px] p-4"
        />

        {/* Controls at bottom of input box - Model selector on left, Build button on right */}
        <div className="pt-2 pb-2 border-t border-border">
          <div className="px-2">
            <div className="flex items-center justify-between">
              {/* Left: Model selector */}
              <ModelPicker />
              
              {/* Right: Build button */}
              <Button
                onClick={handleCreate}
                disabled={!gameName.trim() || isCreating}
                variant="outline"
                className="border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Building...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Build
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Helper text */}
      {/* <p className="text-xs text-muted-foreground mt-2">
        Describe your game and we'll automatically generate the game specification and build the Godot project.
      </p> */}
    </div>
  );
}

