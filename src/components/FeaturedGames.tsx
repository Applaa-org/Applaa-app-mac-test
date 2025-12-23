/**
 * Featured Games Component
 *
 * Displays 3 featured games on the main page with the same design as the hub
 */

import React from 'react';
import { GameCard } from './GameCard';

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
  // 3 featured games to showcase on main page
  const featuredGames: Game[] = [
    {
      id: 'snake-game',
      name: 'Snake Game',
      imageUrl: 'https://app.applaa.com/wp-content/uploads/2025/11/as-1-298x300.png', // TODO: Replace with actual Snake Game image URL
      gameUrl: 'https://applaa-snake-2.vercel.app/'
    },
    {
      id: 'typing-invader',
      name: 'Typing Invader',
      imageUrl: 'https://app.applaa.com/wp-content/uploads/2025/10/asdasd-1-205x300.png', // TODO: Replace with actual Typing Invader image URL
      gameUrl: 'https://typing-invaders.applaa.com/' // TODO: Replace with actual Typing Invader game URL
    },
    {
      id: 'fruit-catcher',
      name: 'Fruit Catcher',
      imageUrl: 'https://app.applaa.com/wp-content/uploads/2025/11/k-1-300x244.png', // TODO: Replace with actual Fruit Catcher image URL
      gameUrl: 'https://2d-fruit-catcher.applaa.com/' // TODO: Replace with actual Fruit Catcher game URL
    }
  ];

  const handlePlayGame = (url: string) => {
    if (!url) return;
    // Open game directly in the user's default browser without using an iframe/modal
    window.open(url, '_blank');
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
              id={game.id}
              name={game.name}
              imageUrl={game.imageUrl}
              gameUrl={game.gameUrl}
              onPlay={handlePlayGame}
            />
          ))}
        </div>
      </section>
    </>
  );
}
