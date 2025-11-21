import React, { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, SendHorizontalIcon } from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';
import { useRouter } from '@tanstack/react-router';
import { useSetAtom } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { showError, showSuccess } from '@/lib/toast';
import { ChatInputControls } from '@/components/ChatInputControls';

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

      {/* Main Description Input - Large and prominent, matching web input style */}
      <div className="relative flex flex-col space-y-2 border border-border rounded-lg bg-(--background-lighter) shadow-sm">
        <div className="flex items-start space-x-2">
          <Textarea
            id="gameDescription"
            value={gameDescription}
            onChange={(e) => setGameDescription(e.target.value)}
            placeholder='Describe your game idea... (e.g., "A 2D platformer where the player jumps between platforms, collects coins, and defeats enemies")'
            rows={2}
            disabled={isCreating}
            className="flex-1 text-base resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px] p-4"
          />

          {/* Build button on the right, inside input area - matching web input style */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleCreate}
              disabled={!gameName.trim() || isCreating}
              className="px-2 py-2 mt-1 mr-2 hover:bg-(--background-darkest) text-(--sidebar-accent-fg) rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Build game"
            >
              {isCreating ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <SendHorizontalIcon size={20} />
              )}
            </button>
          </div>
        </div>

        {/* Controls at bottom of input box - matching web input style */}
        <div className="pt-2 pb-2 border-t border-border">
          <div className="px-2">
            <ChatInputControls showImportButton={true} showPlatformSelector={false} />
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

