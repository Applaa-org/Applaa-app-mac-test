/**
 * Game Card Component
 * 
 * Displays a game created with Applaa with name, image, and click to run functionality
 */

import React from 'react';
import { Gamepad2, ExternalLink } from 'lucide-react';

interface GameCardProps {
  name: string;
  imageUrl: string;
  gameUrl: string;
  onPlay: (url: string) => void;
  className?: string;
}

export function GameCard({ name, imageUrl, gameUrl, onPlay, className = '' }: GameCardProps) {
  const handleClick = () => {
    onPlay(gameUrl);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${className}`}
    >
      {/* Game Image */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Game Controller Overlay */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/90 dark:bg-gray-800/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Gamepad2 className="h-8 w-8 text-gray-700 dark:text-gray-300" />
          </div>
        </div>
        {/* External Link Icon */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-8 h-8 rounded-full bg-white/90 dark:bg-gray-800/90 flex items-center justify-center shadow-sm">
            <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
        </div>
      </div>

      {/* Game Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Created with Applaa
        </p>
      </div>

      {/* Hover Effect Border */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-blue-500/20 transition-colors duration-300 pointer-events-none" />
    </div>
  );
}
