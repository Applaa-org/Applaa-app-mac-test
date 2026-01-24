/**
 * Simple App Type Selector - MVP Version
 * 
 * Clean, straightforward selection: Web, Mobile (Expo/Flutter)
 * No complex wizards, no confusion - just simple choices.
 */

import React, { useCallback } from 'react';
import { Globe, Smartphone, Gamepad2, Code, Box, Blocks } from 'lucide-react';

interface SimpleAppTypeSelectorProps {
  onSelection: (type: 'web' | 'expo' | 'flutter' | 'godot' | 'minecraft' | 'blockly' | 'roblox') => void;
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

  const handleMinecraftSelect = useCallback(() => {
    onSelection('minecraft');
  }, [onSelection]);

  const handleBlocklySelect = useCallback(() => {
    onSelection('blockly');
  }, [onSelection]);

  const handleRobloxSelect = useCallback(() => {
    onSelection('roblox');
  }, [onSelection]);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* Applaa Game Tile */}
        <div
          onClick={handleGodotSelect}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-gray-200/50 dark:border-purple-800/30 p-6 shadow-lg hover:shadow-xl dark:hover:shadow-purple-900/20 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-500 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-300" />
          {/* Content */}
          <div className="relative z-10">
            {/* Icon */}
            <div className="mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-gray-800/90 flex items-center justify-center shadow-sm dark:shadow-purple-900/20">
                <Gamepad2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            {/* Text */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-gray-700 dark:group-hover:text-purple-300 transition-colors">
                Applaa Game
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Create 2D and 3D games with AI-powered generation using Applaa Engine.
              </p>
            </div>
            {/* Decorative Element */}
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 opacity-10 dark:opacity-20 rounded-full transform translate-x-8 translate-y-8 group-hover:scale-110 transition-transform duration-300" />
          </div>
        </div>

        {/* Web App Tile */}
        <div
          onClick={handleWebSelect}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-gray-200/50 dark:border-emerald-800/30 p-6 shadow-lg hover:shadow-xl dark:hover:shadow-emerald-900/20 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-300" />
          {/* Content */}
          <div className="relative z-10">
            {/* Icon */}
            <div className="mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-gray-800/90 flex items-center justify-center shadow-sm dark:shadow-emerald-900/20">
                <Globe className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            {/* Text */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-gray-700 dark:group-hover:text-emerald-300 transition-colors">
                Web App
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Build modern web applications. We auto-select React for you.
              </p>
            </div>
            {/* Decorative Element */}
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 opacity-10 dark:opacity-20 rounded-full transform translate-x-8 translate-y-8 group-hover:scale-110 transition-transform duration-300" />
          </div>
        </div>

        {/* Mobile App Tile */}
        <div
          onClick={handleMobileSelect}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-gray-200/50 dark:border-blue-800/30 p-6 shadow-lg hover:shadow-xl dark:hover:shadow-blue-900/20 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-300" />
          {/* Content */}
          <div className="relative z-10">
            {/* Icon */}
            <div className="mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-gray-800/90 flex items-center justify-center shadow-sm dark:shadow-blue-900/20">
                <Smartphone className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            {/* Text */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-gray-700 dark:group-hover:text-blue-300 transition-colors">
                Mobile App
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Create native apps with Expo. We auto-select Expo for you.
              </p>
            </div>
            {/* Decorative Element */}
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 opacity-10 dark:opacity-20 rounded-full transform translate-x-8 translate-y-8 group-hover:scale-110 transition-transform duration-300" />
          </div>
        </div>

        {/* Roblox Tile (Disabled / Coming Soon) */}
        <div
          className="group relative overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-900/20 border border-gray-200/50 dark:border-gray-800/30 p-6 opacity-70 cursor-not-allowed"
        >
          {/* Coming Soon Badge */}
          <div className="absolute top-4 right-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-bold px-3 py-1 rounded-full border border-yellow-200 dark:border-yellow-700/50 z-20 shadow-sm">
            Coming Soon
          </div>

          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 opacity-50 dark:opacity-10 transition-opacity duration-300" />
          <div className="relative z-10 grayscale filter">
            <div className="mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white/50 dark:bg-gray-800/50 flex items-center justify-center shadow-sm">
                <Blocks className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-500 dark:text-gray-500 mb-2">
                Roblox
              </h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
                Build Roblox games with Lua scripts, 3D models, and assets.
              </p>
            </div>
            {/* Decorative Element (Muted) */}
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gray-200 dark:bg-gray-800 opacity-10 rounded-full transform translate-x-8 translate-y-8" />
          </div>
        </div>

        {/* Minecraft Tile */}
        <div
          onClick={handleMinecraftSelect}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-yellow-50 border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-yellow-500 opacity-5 group-hover:opacity-10 transition-opacity duration-300" />
          <div className="relative z-10">
            <div className="mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow-sm">
                <Box className="h-8 w-8 text-green-700" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                Minecraft
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Code mods and automate your worlds in Minecraft Education.
              </p>
            </div>
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400 to-yellow-500 opacity-10 rounded-full transform translate-x-8 translate-y-8 group-hover:scale-110 transition-transform duration-300" />
          </div>
        </div>

        {/* Blockly Tile */}
        <div
          onClick={handleBlocklySelect}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 opacity-5 group-hover:opacity-10 transition-opacity duration-300" />
          <div className="relative z-10">
            <div className="mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow-sm">
                <Code className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                Blocklaa
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Learn programming with drag-and-drop visual logic blocks.
              </p>
            </div>
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500 opacity-10 rounded-full transform translate-x-8 translate-y-8 group-hover:scale-110 transition-transform duration-300" />
          </div>
        </div>
      </div>

    </div>
  );
}
