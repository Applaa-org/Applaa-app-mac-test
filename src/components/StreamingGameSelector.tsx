import React, { useState } from 'react';
import { useRandomGame, GameOption } from '@/hooks/useRandomGame';
import { Gamepad2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StreamingGameSelectorProps {
  onGameChange: (game: GameOption) => void;
  currentGame: GameOption;
}

export function StreamingGameSelector({ onGameChange, currentGame }: StreamingGameSelectorProps) {
  const { allGames } = useRandomGame();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectGame = (game: GameOption) => {
    // Add small delay to prevent rapid switching
    setTimeout(() => {
      onGameChange(game);
    }, 100);
    setIsOpen(false);
  };


  return (
    <div className="flex items-center gap-2">
      {/* Game Selector Dropdown */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="bg-white/90 hover:bg-white text-gray-700 border-gray-300"
          >
            <Gamepad2 className="w-3 h-3 mr-1" />
            {currentGame.name}
            {isOpen ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {allGames.map((game) => (
            <DropdownMenuItem
              key={game.id}
              onClick={() => handleSelectGame(game)}
              className="flex flex-col items-start p-3 cursor-pointer"
            >
              <div className="font-medium text-sm">{game.name}</div>
              <div className="text-xs text-gray-500 mt-1">{game.description}</div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
