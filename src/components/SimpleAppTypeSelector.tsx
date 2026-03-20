/**
 * Simple App Type Selector - MVP Version
 * 
 * Clean, straightforward selection: Web, Mobile (Expo/Flutter)
 * No complex wizards, no confusion - just simple choices.
 */

import React, { useCallback } from 'react';
import { Globe, Smartphone, Gamepad2, Code, GraduationCap, BookMarked, Sparkles, Box, Blocks } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

interface SimpleAppTypeSelectorProps {
  onSelection: (type: 'web' | 'expo' | 'flutter' | 'godot' | 'minecraft' | 'blockly' | 'roblox') => void;
  className?: string;
}

export function SimpleAppTypeSelector({ onSelection, className = '' }: SimpleAppTypeSelectorProps) {
  const navigate = useNavigate();

  const handleWebSelect = useCallback(() => {
    onSelection('web');
  }, [onSelection]);

  const handleAcademySelect = useCallback(() => {
    navigate({ to: '/academy' });
  }, [navigate]);

  const handleLearningAcademySelect = useCallback(() => {
    navigate({ to: '/learning-academy' });
  }, [navigate]);

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

  const handleHubSelect = useCallback(() => {
    navigate({ to: '/hub' });
  }, [navigate]);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="w-full space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Learn */}
          <div className="rounded-2xl border border-sky-200/50 dark:border-sky-800/40 bg-gradient-to-br from-sky-50/60 via-white/70 to-cyan-50/30 dark:from-sky-900/20 dark:via-gray-900/20 dark:to-cyan-900/20 p-5 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-2xl bg-sky-100/70 dark:bg-sky-900/20 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="pt-0.5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Learn</h2>
                <div className="mt-1 h-1.5 w-14 rounded-full bg-gradient-to-r from-sky-500/60 to-cyan-500/40" />
              </div>
            </div>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              Lessons + practice + projects that help you level up fast.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleAcademySelect}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-100/35 via-white/70 to-cyan-50/20 dark:from-sky-900/15 dark:to-cyan-900/20 border border-sky-200/60 dark:border-sky-800/30 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
              >
                <div className="relative z-10 flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/80 dark:bg-gray-800/90 flex items-center justify-center shadow-sm">
                    <GraduationCap className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                      AI Academy
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      Learn programming basics, practice coding.
                    </p>
                    <div className="mt-3 text-xs font-semibold text-sky-700 dark:text-sky-200">
                      Start learning →
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleLearningAcademySelect}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-100/30 via-white/70 to-cyan-50/20 dark:from-teal-900/15 dark:to-cyan-900/20 border border-teal-200/60 dark:border-teal-800/30 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
              >
                <div className="relative z-10 flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/80 dark:bg-gray-800/90 flex items-center justify-center shadow-sm">
                    <BookMarked className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                      Learning Academy
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      UK curriculum for ages 7–11.
                    </p>
                    <div className="mt-3 text-xs font-semibold text-teal-700 dark:text-teal-200">
                      Explore now →
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleBlocklySelect}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-100/30 via-white/70 to-sky-50/20 dark:from-cyan-900/15 dark:to-sky-900/20 border border-cyan-200/60 dark:border-cyan-800/30 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
              >
                <div className="relative z-10 flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/80 dark:bg-gray-800/90 flex items-center justify-center shadow-sm">
                    <Code className="h-6 w-6 text-cyan-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                        Blocklaa
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700/50">
                        Beta
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      Fun based coding with drag &amp; drop blocks (Ages : 7-10 years)
                    </p>
                    <div className="mt-3 text-xs font-semibold text-cyan-700 dark:text-cyan-200">
                      Try Blocklaa →
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Create */}
          <div className="rounded-2xl border border-emerald-200/50 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/60 via-white/70 to-lime-50/30 dark:from-emerald-900/20 dark:via-gray-900/20 dark:to-lime-900/20 p-5 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100/70 dark:bg-emerald-900/20 flex items-center justify-center">
                <Code className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="pt-0.5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Create</h2>
                <div className="mt-1 h-1.5 w-14 rounded-full bg-gradient-to-r from-emerald-500/60 to-lime-500/40" />
              </div>
            </div>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              Turn your ideas into real apps, games, and worlds.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGodotSelect}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100/30 via-white/70 to-lime-50/20 dark:from-emerald-900/15 dark:to-lime-900/20 border border-emerald-200/60 dark:border-emerald-800/30 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
              >
                <div className="relative z-10 flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/80 dark:bg-gray-800/90 flex items-center justify-center shadow-sm">
                    <Gamepad2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                      Applaa Game
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      Build 2D/3D games with AI.
                    </p>
                    <div className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                      Create now →
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleWebSelect}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100/30 via-white/70 to-green-50/20 dark:from-green-900/15 dark:to-emerald-900/20 border border-green-200/60 dark:border-emerald-800/30 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
              >
                <div className="relative z-10 flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/80 dark:bg-gray-800/90 flex items-center justify-center shadow-sm">
                    <Globe className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                      Web app
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      Generate modern web applications.
                    </p>
                    <div className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                      Generate web →
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleMobileSelect}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100/30 via-white/70 to-cyan-50/20 dark:from-emerald-900/15 dark:to-cyan-900/20 border border-emerald-200/60 dark:border-emerald-800/30 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
              >
                <div className="relative z-10 flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/80 dark:bg-gray-800/90 flex items-center justify-center shadow-sm">
                    <Smartphone className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                      Mobile
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      Create native mobile apps.
                    </p>
                    <div className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                      Create mobile →
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleMinecraftSelect}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-100/30 via-white/70 to-yellow-50/20 dark:from-green-900/15 dark:to-yellow-900/20 border border-green-200/60 dark:border-yellow-900/30 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
              >
                <div className="relative z-10 flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/80 dark:bg-gray-800/90 flex items-center justify-center shadow-sm">
                    <Box className="h-6 w-6 text-green-700" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                      Minecraft
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      Code mods and automate your worlds.
                    </p>
                    <div className="mt-3 text-xs font-semibold text-green-700 dark:text-green-200">
                      Start modding →
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                disabled
                aria-disabled="true"
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/30 border border-gray-200/70 dark:border-gray-800/40 p-4 shadow-sm opacity-60 cursor-not-allowed text-left grayscale focus-visible:outline-none"
              >
                <div className="relative z-10 flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/80 dark:bg-gray-800/90 flex items-center justify-center shadow-sm">
                    <Blocks className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                        Roblox
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700/50">
                        Beta
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      Build games with Lua scripts and assets.
                    </p>
                    <div className="mt-3 text-xs font-semibold text-gray-700 dark:text-gray-200">
                      Coming soon →
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Earn */}
        <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800 bg-gradient-to-br from-amber-50/70 via-white/50 to-yellow-50/25 dark:from-amber-900/20 dark:via-gray-900/30 dark:to-yellow-900/20 p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100">Earn</h2>
          </div>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
            Explore what’s possible and get inspired.
          </p>

          <button
            type="button"
            onClick={handleHubSelect}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200/40 dark:border-amber-800/30 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
          >
            <div className="relative z-10 flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/80 dark:bg-gray-800/90 flex items-center justify-center shadow-sm">
                <Sparkles className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                  Hub
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Explore awesome games and applications built by Applaa.
                </p>
                <div className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-200">
                  Explore Hub →
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Old tiles grid (disabled) */}
      <div className="hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
                Create native mobile apps.
              </p>
            </div>
            {/* Decorative Element */}
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 opacity-10 dark:opacity-20 rounded-full transform translate-x-8 translate-y-8 group-hover:scale-110 transition-transform duration-300" />
          </div>
        </div>

        {/* AI Academy Tile */}
        <div
          onClick={handleAcademySelect}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-400 to-indigo-500 opacity-5 group-hover:opacity-10 transition-opacity duration-300" />
          <div className="relative z-10">
            <div className="mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow-sm">
                <GraduationCap className="h-8 w-8 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                AI Academy
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Learn programming basics, practice coding, and build projects.
              </p>
            </div>
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-br from-violet-400 to-indigo-500 opacity-10 rounded-full transform translate-x-8 translate-y-8 group-hover:scale-110 transition-transform duration-300" />
          </div>
        </div>

        {/* Learning Academy Tile */}
        <div
          onClick={handleLearningAcademySelect}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-cyan-500 opacity-5 group-hover:opacity-10 transition-opacity duration-300" />
          <div className="relative z-10">
            <div className="mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow-sm">
                <BookMarked className="h-8 w-8 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                Learning Academy
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                UK curriculum for ages 7–11: Math, Science, CS & more. Lessons, practice & assessments to GCSE.
              </p>
            </div>
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-br from-teal-400 to-cyan-500 opacity-10 rounded-full transform translate-x-8 translate-y-8 group-hover:scale-110 transition-transform duration-300" />
          </div>
        </div>

        {/* Blocklaa Tile */}
        <div
          onClick={handleBlocklySelect}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
        >
          {/* Beta Badge */}
          <div className="absolute top-4 right-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs font-bold px-3 py-1 rounded-full border border-yellow-200 dark:border-yellow-700/50 z-20 shadow-sm">
            Beta
          </div>

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

        {/* Roblox Tile (Disabled / Coming Soon) - moved to position 6 (was Blocklaa) */}
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
      </div>

    </div>
  );
}
