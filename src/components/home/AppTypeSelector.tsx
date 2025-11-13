/**
 * Revolutionary App Type Selector
 * 
 * Replaces the old dropdown with a stunning, prominent interface
 * that showcases unlimited possibilities right on the home page.
 */

import React, { useState, useCallback } from 'react';
import { 
  Globe, 
  Smartphone, 
  Monitor, 
  Server, 
  Database, 
  Gamepad2, 
  Brain, 
  ShoppingCart,
  Palette,
  Zap,
  Sparkles,
  ArrowRight,
  Code,
  Infinity,
  Rocket,
  Star,
  TrendingUp,
  Users,
  Target
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// Re-enabled after fixing process.platform issues
import { AppCreationWizard } from '@/components/creation/AppCreationWizard';
import { MobileFrameworkPicker } from '@/components/mobile/MobileFrameworkPicker';
import type { Framework, TemplateOption, Platform } from '@/lib/mobile/types';

interface AppType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  gradient: string;
  lightBg: string;
  borderColor: string;
  textColor: string;
  popularity: number;
  frameworks: string[];
  examples: string[];
  buildTime: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  trending?: boolean;
  new?: boolean;
}

const APP_TYPES: AppType[] = [
  {
    id: 'web-apps',
    name: 'Web Applications',
    description: 'Modern web apps with React, Vue, Angular, Next.js and more',
    icon: Globe,
    gradient: 'from-blue-500 to-cyan-500',
    lightBg: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    popularity: 95,
    frameworks: ['React', 'Vue.js', 'Angular', 'Next.js', 'Svelte'],
    examples: ['SaaS Platform', 'E-commerce Site', 'Dashboard', 'Portfolio'],
    buildTime: '5-30 min',
    difficulty: 'Beginner',
    trending: true
  },
  {
    id: 'mobile-apps',
    name: 'Mobile Applications',
    description: 'Cross-platform mobile apps with Flutter, React Native, Ionic',
    icon: Smartphone,
    gradient: 'from-purple-500 to-pink-500',
    lightBg: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    popularity: 92,
    frameworks: ['Flutter', 'React Native', 'Expo', 'Ionic', 'Xamarin'],
    examples: ['Social App', 'E-commerce App', 'Game', 'Productivity'],
    buildTime: '10-45 min',
    difficulty: 'Intermediate',
    trending: true
  },
  {
    id: 'desktop-apps',
    name: 'Desktop Applications',
    description: 'Native desktop apps with Electron, Tauri, Qt, .NET',
    icon: Monitor,
    gradient: 'from-indigo-500 to-purple-500',
    lightBg: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-700',
    popularity: 78,
    frameworks: ['Electron', 'Tauri', 'Qt', '.NET MAUI', 'Flutter Desktop'],
    examples: ['Code Editor', 'Media Player', 'Productivity Tool', 'Game'],
    buildTime: '15-60 min',
    difficulty: 'Intermediate'
  },
  {
    id: 'api-services',
    name: 'APIs & Backend',
    description: 'REST APIs, GraphQL, microservices with Node.js, Django, FastAPI',
    icon: Server,
    gradient: 'from-green-500 to-emerald-500',
    lightBg: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    popularity: 88,
    frameworks: ['Node.js', 'Django', 'FastAPI', 'Express', 'NestJS'],
    examples: ['REST API', 'GraphQL Service', 'Microservice', 'Auth System'],
    buildTime: '10-40 min',
    difficulty: 'Intermediate'
  },
  {
    id: 'cms-websites',
    name: 'CMS & Websites',
    description: 'Content management with WordPress, Ghost, Strapi, Sanity',
    icon: Database,
    gradient: 'from-orange-500 to-red-500',
    lightBg: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    popularity: 85,
    frameworks: ['WordPress', 'Ghost', 'Strapi', 'Sanity', 'Contentful'],
    examples: ['Blog', 'News Site', 'Portfolio', 'Business Site'],
    buildTime: '15-45 min',
    difficulty: 'Beginner',
    new: true
  },
  {
    id: 'ecommerce',
    name: 'E-commerce Stores',
    description: 'Online stores with Shopify, WooCommerce, Medusa, custom solutions',
    icon: ShoppingCart,
    gradient: 'from-pink-500 to-rose-500',
    lightBg: 'bg-pink-50',
    borderColor: 'border-pink-200',
    textColor: 'text-pink-700',
    popularity: 82,
    frameworks: ['Shopify', 'WooCommerce', 'Medusa', 'Next.js Commerce'],
    examples: ['Online Store', 'Marketplace', 'Digital Products', 'Subscription'],
    buildTime: '20-60 min',
    difficulty: 'Intermediate',
    new: true
  },
  {
    id: 'godot-games',
    name: 'Godot Games',
    description: 'Create 2D and 3D games with AI-powered generation using Godot Engine',
    icon: Gamepad2,
    gradient: 'from-purple-500 to-pink-500',
    lightBg: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    popularity: 80,
    frameworks: ['Godot 4.2+', 'GDScript', 'AI Game Specs', 'Auto-Builder'],
    examples: ['2D Platformer', '3D Adventure', 'Puzzle Game', 'Action Game'],
    buildTime: '15-60 min',
    difficulty: 'Intermediate',
    new: true,
    trending: true
  },
  {
    id: 'games',
    name: 'Games & Interactive',
    description: 'Games and interactive experiences with Unity, Phaser, Three.js',
    icon: Gamepad2,
    gradient: 'from-red-500 to-pink-500',
    lightBg: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    popularity: 75,
    frameworks: ['Unity', 'Phaser.js', 'Three.js', 'Unreal'],
    examples: ['2D Platformer', '3D Adventure', 'Web Game', 'VR Experience'],
    buildTime: '30-120 min',
    difficulty: 'Advanced'
  },
  {
    id: 'ai-ml',
    name: 'AI & Machine Learning',
    description: 'AI-powered apps with Python, TensorFlow, PyTorch, OpenAI',
    icon: Brain,
    gradient: 'from-violet-500 to-purple-500',
    lightBg: 'bg-violet-50',
    borderColor: 'border-violet-200',
    textColor: 'text-violet-700',
    popularity: 89,
    frameworks: ['Python', 'TensorFlow', 'PyTorch', 'OpenAI API', 'Hugging Face'],
    examples: ['Chatbot', 'Image Recognition', 'Data Analysis', 'Recommendation'],
    buildTime: '25-90 min',
    difficulty: 'Advanced',
    trending: true
  }
];

interface AppTypeSelectorProps {
  onTypeSelect: (appType: AppType) => void;
  className?: string;
}

export function AppTypeSelector({ onTypeSelect, className = '' }: AppTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<AppType | null>(null);
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  const handleTypeClick = useCallback((appType: AppType) => {
    setSelectedType(appType);
    onTypeSelect(appType);
  }, [onTypeSelect]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Choose Your App Type</h2>
          <Sparkles className="h-6 w-6 text-purple-600" />
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Select what you want to build. Each type offers specialized frameworks and tools 
          optimized for your specific needs.
        </p>
      </div>

      {/* App Type Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {APP_TYPES.map((appType) => {
          const IconComponent = appType.icon;
          const isHovered = hoveredType === appType.id;
          const isSelected = selectedType?.id === appType.id;

          return (
            <Card
              key={appType.id}
              className={`relative cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.05] ${
                appType.borderColor
              } border-2 ${
                isSelected 
                  ? 'ring-2 ring-blue-500 border-blue-300 shadow-lg' 
                  : 'hover:border-gray-300'
              }`}
              onMouseEnter={() => setHoveredType(appType.id)}
              onMouseLeave={() => setHoveredType(null)}
              onClick={() => handleTypeClick(appType)}
            >
              {/* Badges */}
              <div className="absolute top-3 right-3 flex flex-col space-y-1">
                {appType.trending && (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Trending
                  </Badge>
                )}
                {appType.new && (
                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    New
                  </Badge>
                )}
              </div>

              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-3 left-3 z-10">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <ArrowRight className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}

              {/* Content */}
              <CardContent className="p-4 space-y-4">
                {/* Header */}
                <div className={`${appType.lightBg} rounded-lg p-4 relative overflow-hidden`}>
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${appType.gradient} opacity-10`} />
                  
                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${appType.gradient}`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-xs font-medium">{appType.popularity}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900">{appType.name}</h3>
                      <p className="text-xs text-gray-600 mt-1">{appType.description}</p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3">
                  {/* Frameworks */}
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Popular Frameworks:</p>
                    <div className="flex flex-wrap gap-1">
                      {appType.frameworks.slice(0, 3).map((framework, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {framework}
                        </Badge>
                      ))}
                      {appType.frameworks.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{appType.frameworks.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Examples */}
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Build Examples:</p>
                    <div className="flex flex-wrap gap-1">
                      {appType.examples.slice(0, 2).map((example, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {example}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span className="flex items-center">
                      <Target className="h-3 w-3 mr-1" />
                      {appType.difficulty}
                    </span>
                    <span className="flex items-center">
                      <Zap className="h-3 w-3 mr-1" />
                      {appType.buildTime}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  className={`w-full bg-gradient-to-r ${appType.gradient} hover:opacity-90 text-white text-sm`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTypeClick(appType);
                  }}
                >
                  <Rocket className="h-3 w-3 mr-2" />
                  Build {appType.name}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {APP_TYPES.length}
            </div>
            <p className="text-sm text-gray-600">App Types</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              100+
            </div>
            <p className="text-sm text-gray-600">Frameworks</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              500+
            </div>
            <p className="text-sm text-gray-600">Templates</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              ∞
            </div>
            <p className="text-sm text-gray-600">Possibilities</p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Infinity className="h-5 w-5 text-blue-600" />
          <p className="text-gray-600">
            Can't find what you're looking for? 
          </p>
        </div>
        <Button 
          variant="outline" 
          className="border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50"
        >
          <Code className="h-4 w-4 mr-2" />
          Build with ANY Framework
        </Button>
      </div>
    </div>
  );
}

/**
 * Compact version for smaller spaces
 */
export function CompactAppTypeSelector({ onTypeSelect }: AppTypeSelectorProps) {
  const popularTypes = APP_TYPES.filter(type => type.popularity >= 85).slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Quick Start</h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {popularTypes.map((appType) => {
          const IconComponent = appType.icon;
          
          return (
            <Card
              key={appType.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                appType.borderColor
              } border hover:border-gray-300`}
              onClick={() => onTypeSelect(appType)}
            >
              <CardContent className="p-3 text-center space-y-2">
                <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${appType.gradient}`}>
                  <IconComponent className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{appType.name}</h4>
                  <p className="text-xs text-gray-500">{appType.buildTime}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
