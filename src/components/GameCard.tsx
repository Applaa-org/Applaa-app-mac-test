/**
 * Game Card Component
 * 
 * Displays a game created with Applaa with name, image, and click to run functionality
 */

import React, { useState } from 'react';
import { Gamepad2, ExternalLink, Edit2, Trash2, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GameCardProps {
  id: string;
  name: string;
  imageUrl: string;
  gameUrl: string;
  onPlay: (url: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string, name: string) => void;
  className?: string;
}

export function GameCard({ id, name, imageUrl, gameUrl, onPlay, onEdit, onDelete, className = '' }: GameCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleClick = () => {
    onPlay(gameUrl);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(id, name);
  };

  const handleImageError = () => {
    console.warn(`Failed to load image for game "${name}": ${imageUrl}`);
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${className}`}
    >
      {/* Game Image */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
        {!imageError ? (
          <img
            src={imageUrl}
            alt={name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-400 to-gray-600 dark:from-gray-600 dark:to-gray-800">
            <ImageOff className="h-12 w-12 text-white/70 mb-2" />
            <span className="text-white/70 text-sm font-medium">{name}</span>
          </div>
        )}
        {imageLoading && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {/* Game Controller Overlay */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/90 dark:bg-gray-800/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Gamepad2 className="h-8 w-8 text-gray-700 dark:text-gray-300" />
          </div>
        </div>
        {/* Action Buttons */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditClick}
              className="h-8 w-8 p-0 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 shadow-sm"
              title="Edit game"
            >
              <Edit2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              className="h-8 w-8 p-0 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 shadow-sm"
              title="Delete game"
            >
              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
            </Button>
          )}
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
