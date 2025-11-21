import React, { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, SendHorizontalIcon, Gamepad2, AlertCircle, CheckCircle } from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';
import { useRouter } from '@tanstack/react-router';
import { useSetAtom } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { showError, showSuccess } from '@/lib/toast';
import { ChatInputControls } from '@/components/ChatInputControls';
import { cn } from '@/lib/utils';

interface GodotGameCreationInputProps {
  onGameCreated?: () => void;
  initialDescription?: string;
}

export function GodotGameCreationInput({ onGameCreated, initialDescription = '' }: GodotGameCreationInputProps) {
  const [gameName, setGameName] = useState('');
  const [gameDescription, setGameDescription] = useState(initialDescription);
  const [isCreating, setIsCreating] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [nameExists, setNameExists] = useState(false);
  const [suggestedName, setSuggestedName] = useState('');
  const router = useRouter();
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const ipcClient = IpcClient.getInstance();

  // Update description when initialDescription changes
  useEffect(() => {
    if (initialDescription) {
      setGameDescription(initialDescription);
    }
  }, [initialDescription]);

  // Real-time name validation
  useEffect(() => {
    const validateName = async () => {
      if (!gameName.trim() || gameName.length < 2) {
        setNameExists(false);
        setSuggestedName('');
        return;
      }

      setIsValidating(true);
      try {
        const normalizedName = gameName.toLowerCase().replace(/\s+/g, '-');
        const result = await ipcClient.checkAppName({ appName: normalizedName });
        
        if (result.exists) {
          setNameExists(true);
          // Generate a suggested alternative
          let counter = 2;
          let suggestion = `${normalizedName}-${counter}`;
          while (counter <= 5) {
            const suggestionResult = await ipcClient.checkAppName({ appName: suggestion });
            if (!suggestionResult.exists) {
              setSuggestedName(suggestion);
              break;
            }
            counter++;
            suggestion = `${normalizedName}-${counter}`;
          }
        } else {
          setNameExists(false);
          setSuggestedName('');
        }
      } catch (error) {
        console.error('Error validating game name:', error);
      } finally {
        setIsValidating(false);
      }
    };

    if (showNameDialog) {
      const debounceTimer = setTimeout(validateName, 500);
      return () => clearTimeout(debounceTimer);
    }
  }, [gameName, showNameDialog, ipcClient]);

  const createGame = useCallback(async () => {
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
      setShowNameDialog(false);
    } catch (error) {
      showError(error as Error);
    } finally {
      setIsCreating(false);
    }
  }, [gameName, gameDescription, ipcClient, router, setSelectedAppId, onGameCreated]);

  const handleCreate = useCallback(async () => {
    // If no game name, show dialog
    if (!gameName.trim()) {
      setShowNameDialog(true);
      return;
    }

    // Proceed with creation
    await createGame();
  }, [gameName, createGame]);

  const handleNameDialogContinue = () => {
    if (!nameExists && gameName.trim()) {
      setShowNameDialog(false);
      createGame();
    }
  };

  const handleNameChange = (value: string) => {
    setGameName(value);
    setNameExists(false);
    setSuggestedName('');
  };

  return (
    <>
      <div className="p-4" data-testid="godot-game-input-container">
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
              disabled={isCreating}
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

      {/* Game Name Dialog - Popup like mobile apps */}
      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-purple-500" />
              Give your game a name
            </DialogTitle>
            <DialogDescription>
              Enter a name for your new game
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Game Name Input */}
            <div className="space-y-2">
              <Label htmlFor="game-name">Game Name</Label>
              <div className="relative">
                <Input
                  id="game-name"
                  value={gameName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Enter game name..."
                  className={cn(
                    "w-full pr-10",
                    nameExists && "border-red-500 focus:border-red-500",
                    gameName && !nameExists && !isValidating && "border-green-500 focus:border-green-500"
                  )}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !nameExists && gameName.trim() && !isValidating) {
                      handleNameDialogContinue();
                    }
                  }}
                />
                {/* Validation Icon */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isValidating && (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  )}
                  {!isValidating && gameName && nameExists && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  {!isValidating && gameName && !nameExists && gameName.length >= 2 && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
              
              {/* Validation Messages */}
              {nameExists && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-red-700 font-medium">Name already exists</p>
                    <p className="text-red-600">A game with this name already exists in your workspace.</p>
                    {suggestedName && (
                      <button
                        onClick={() => handleNameChange(suggestedName)}
                        className="mt-1 text-blue-600 hover:text-blue-800 underline text-sm"
                      >
                        Try "{suggestedName}" instead
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {!nameExists && gameName && gameName.length >= 2 && !isValidating && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Name is available
                </div>
              )}
            </div>

            {/* Preview */}
            {gameName && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Preview:</div>
                <div className="font-medium">{gameName}</div>
                <div className="text-xs text-muted-foreground">
                  {gameName.toLowerCase().replace(/\s+/g, '-')}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowNameDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleNameDialogContinue}
              disabled={nameExists || isValidating || !gameName.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Gamepad2 className="w-4 h-4 mr-2" />
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

