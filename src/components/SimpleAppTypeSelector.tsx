/**
 * Simple App Type Selector - MVP Version
 * 
 * Clean, straightforward selection: Web, Mobile (Expo/Flutter)
 * No complex wizards, no confusion - just simple choices.
 */

import React, { useCallback } from 'react';
import { Globe, Smartphone, Gamepad2 } from 'lucide-react';

interface SimpleAppTypeSelectorProps {
  onSelection: (type: 'web' | 'expo' | 'flutter' | 'godot') => void;
  className?: string;
}

export function SimpleAppTypeSelector({ onSelection, className = '' }: SimpleAppTypeSelectorProps) {
  const handleWebSelect = useCallback(() => {
    onSelection('web');
  }, [onSelection]);

  const handleMobileSelect = useCallback(() => {
    // Directly select Expo since it's the only mobile framework for MVP
    onSelection('expo');
  }, [onSelection]);

  const handleGodotSelect = useCallback(() => {
    onSelection('godot');
  }, [onSelection]);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* Web App Tile */}
        <div
          onClick={handleWebSelect}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 opacity-5 group-hover:opacity-10 transition-opacity duration-300" />
          {/* Content */}
          <div className="relative z-10">
            {/* Icon */}
            <div className="mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow-sm">
                <Globe className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
            {/* Text */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                Web App
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Build modern web applications. We auto-select React for you.
              </p>
            </div>
            {/* Decorative Element */}
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 opacity-10 rounded-full transform translate-x-8 translate-y-8 group-hover:scale-110 transition-transform duration-300" />
          </div>
        </div>

        {/* Mobile App Tile */}
        <div
          onClick={handleMobileSelect}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 opacity-5 group-hover:opacity-10 transition-opacity duration-300" />
          {/* Content */}
          <div className="relative z-10">
            {/* Icon */}
            <div className="mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow-sm">
                <Smartphone className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            {/* Text */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                Mobile App
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Create native apps with Expo. We auto-select Expo for you.
              </p>
            </div>
            {/* Decorative Element */}
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 opacity-10 rounded-full transform translate-x-8 translate-y-8 group-hover:scale-110 transition-transform duration-300" />
          </div>
        </div>

        {/* Godot Game Tile */}
        <div
          onClick={handleGodotSelect}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-500 opacity-5 group-hover:opacity-10 transition-opacity duration-300" />
          {/* Content */}
          <div className="relative z-10">
            {/* Icon */}
            <div className="mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow-sm">
                <Gamepad2 className="h-8 w-8 text-purple-600" />
              </div>
            </div>
            {/* Text */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                Godot Game
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Create 2D and 3D games with AI-powered generation using Godot Engine.
              </p>
            </div>
            {/* Decorative Element */}
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 opacity-10 rounded-full transform translate-x-8 translate-y-8 group-hover:scale-110 transition-transform duration-300" />
          </div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-500">We auto-select frameworks (Web: React, Mobile: Expo, Games: Godot). You can change later in settings.</p>
      </div>
    </div>
  );
}

