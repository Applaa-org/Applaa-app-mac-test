import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Code, Gamepad2, Zap, Rocket, Star, Clock, Zap as Lightning, Globe, Smartphone, Monitor, Server, Database, ShoppingCart, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComingSoonCardProps {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  rating: number;
  frameworks: string[];
  examples: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  timeRange: string;
  buttonColor: string;
}

const comingSoonItems: ComingSoonCardProps[] = [
  // Original 4 cards
  {
    id: 'python',
    name: 'Python Applications',
    description: 'Build powerful applications with Python, Django, FastAPI and more',
    icon: Code,
    gradient: 'from-yellow-400 to-orange-500',
    rating: 95,
    frameworks: ['Python', 'Django', 'FastAPI', '+2'],
    examples: ['Web Scraper', 'API Service'],
    difficulty: 'Beginner',
    timeRange: '5-30 min',
    buttonColor: 'bg-yellow-500 hover:bg-yellow-600',
  },
  {
    id: 'roblox',
    name: 'Roblox Games',
    description: 'Create immersive experiences on Roblox with Lua scripting',
    icon: Gamepad2,
    gradient: 'from-red-500 to-pink-600',
    rating: 92,
    frameworks: ['Lua', 'Roblox Studio', 'Luau', '+1'],
    examples: ['Obby Game', 'Simulator'],
    difficulty: 'Intermediate',
    timeRange: '10-45 min',
    buttonColor: 'bg-red-500 hover:bg-red-600',
  },
  {
    id: 'ai-tools',
    name: 'AI & Machine Learning',
    description: 'Develop intelligent AI-powered applications with Python, TensorFlow',
    icon: Brain,
    gradient: 'from-purple-500 to-indigo-600',
    rating: 89,
    frameworks: ['Python', 'TensorFlow', 'PyTorch', '+2'],
    examples: ['Chatbot', 'Image Recognition'],
    difficulty: 'Advanced',
    timeRange: '25-90 min',
    buttonColor: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    id: 'blockchain',
    name: 'Blockchain DApps',
    description: 'Innovate with decentralized applications using Web3, Solidity',
    icon: Rocket,
    gradient: 'from-cyan-500 to-blue-600',
    rating: 78,
    frameworks: ['Solidity', 'Web3.js', 'Ethers.js', '+2'],
    examples: ['DeFi App', 'NFT Marketplace'],
    difficulty: 'Advanced',
    timeRange: '30-120 min',
    buttonColor: 'bg-cyan-500 hover:bg-cyan-600',
  },
  // New 4 cards from image
  {
    id: 'web-apps',
    name: 'Web Applications',
    description: 'Modern web apps with React, Vue, Angular, Next.js and more',
    icon: Globe,
    gradient: 'from-blue-400 to-blue-600',
    rating: 95,
    frameworks: ['React', 'Vue.js', 'Angular', '+2'],
    examples: ['SaaS Platform', 'E-commerce Site'],
    difficulty: 'Beginner',
    timeRange: '5-30 min',
    buttonColor: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    id: 'mobile-apps',
    name: 'Mobile Applications',
    description: 'Cross-platform mobile apps with Flutter, React Native, Ionic',
    icon: Smartphone,
    gradient: 'from-purple-500 to-purple-700',
    rating: 92,
    frameworks: ['Flutter', 'React Native', 'Expo', '+2'],
    examples: ['Social App', 'E-commerce App'],
    difficulty: 'Intermediate',
    timeRange: '10-45 min',
    buttonColor: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    id: 'desktop-apps',
    name: 'Desktop Applications',
    description: 'Native desktop apps with Electron, Tauri, Qt, .NET',
    icon: Monitor,
    gradient: 'from-indigo-400 to-indigo-600',
    rating: 78,
    frameworks: ['Electron', 'Tauri', 'Qt', '+2'],
    examples: ['Code Editor', 'Media Player'],
    difficulty: 'Intermediate',
    timeRange: '15-60 min',
    buttonColor: 'bg-indigo-500 hover:bg-indigo-600',
  },
  {
    id: 'apis-backend',
    name: 'APIs & Backend',
    description: 'REST APIs, GraphQL, microservices with Node.js, Django, FastAPI',
    icon: Server,
    gradient: 'from-green-500 to-green-700',
    rating: 88,
    frameworks: ['Node.js', 'Django', 'FastAPI', '+2'],
    examples: ['REST API', 'GraphQL Service'],
    difficulty: 'Intermediate',
    timeRange: '10-40 min',
    buttonColor: 'bg-green-500 hover:bg-green-600',
  },
  // Additional 4 cards to make 12 total
  {
    id: 'cms-websites',
    name: 'CMS & Websites',
    description: 'Content management with WordPress, Ghost, Strapi, Sanity',
    icon: Database,
    gradient: 'from-orange-500 to-orange-700',
    rating: 85,
    frameworks: ['WordPress', 'Ghost', 'Strapi', '+2'],
    examples: ['Blog', 'News Site'],
    difficulty: 'Beginner',
    timeRange: '15-45 min',
    buttonColor: 'bg-orange-500 hover:bg-orange-600',
  },
  {
    id: 'ecommerce',
    name: 'E-commerce Stores',
    description: 'Online stores with Shopify, WooCommerce, Medusa, custom solutions',
    icon: ShoppingCart,
    gradient: 'from-pink-500 to-pink-700',
    rating: 82,
    frameworks: ['Shopify', 'WooCommerce', 'Medusa', '+1'],
    examples: ['Online Store', 'Marketplace'],
    difficulty: 'Intermediate',
    timeRange: '20-60 min',
    buttonColor: 'bg-pink-500 hover:bg-pink-600',
  },
  {
    id: 'games-interactive',
    name: 'Games & Interactive',
    description: 'Games and interactive experiences with Unity, Godot, Phaser',
    icon: Gamepad2,
    gradient: 'from-red-500 to-red-700',
    rating: 75,
    frameworks: ['Unity', 'Godot', 'Phaser.js', '+2'],
    examples: ['2D Platformer', '3D Adventure'],
    difficulty: 'Advanced',
    timeRange: '30-120 min',
    buttonColor: 'bg-red-500 hover:bg-red-600',
  },
  {
    id: 'ai-ml-advanced',
    name: 'AI & Machine Learning',
    description: 'AI-powered apps with Python, TensorFlow, PyTorch, OpenAI',
    icon: Brain,
    gradient: 'from-indigo-600 to-indigo-800',
    rating: 89,
    frameworks: ['Python', 'TensorFlow', 'PyTorch', '+2'],
    examples: ['Chatbot', 'Image Recognition'],
    difficulty: 'Advanced',
    timeRange: '25-90 min',
    buttonColor: 'bg-indigo-600 hover:bg-indigo-700',
  },
];

export function ComingSoonCards({ className = '' }: { className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="text-center space-y-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          Coming Soon
          {isExpanded ? (
            <ChevronUp className="h-6 w-6" />
          ) : (
            <ChevronDown className="h-6 w-6" />
          )}
        </button>
        <p className="text-md text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          We're constantly expanding our platform support. Here's a sneak peek at what's next!
        </p>
      </div>
      
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {comingSoonItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Card
              key={item.id}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full"
            >
              {/* Header with Gradient */}
              <div className={`relative h-20 bg-gradient-to-br ${item.gradient} p-4 flex items-center justify-center flex-shrink-0`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {item.name}
                  </h3>
                </div>
              </div>

              {/* Content */}
              <CardContent className="p-6 space-y-4 flex-1 flex flex-col">
                {/* Description */}
                <div className="flex-shrink-0">
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Popular Frameworks */}
                <div className="flex-shrink-0">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Popular Frameworks
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {item.frameworks.map((framework, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                      >
                        {framework}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Build Examples */}
                <div className="flex-shrink-0">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Build Examples
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {item.examples.map((example, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Spacer to push button to bottom */}
                <div className="flex-1"></div>

                {/* Difficulty & Time */}
                {/* <div className="flex items-center justify-between pt-2 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {item.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Lightning className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {item.timeRange}
                    </span>
                  </div>
                </div> */}

                {/* Build Button */}
                {/* <button
                  className={`w-full py-3 px-4 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2 ${item.buttonColor} hover:opacity-90 transition-opacity flex-shrink-0 mt-4 min-h-[48px]`}
                >
                  <Rocket className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Build {item.name}</span>
                </button> */}
              </CardContent>


            </Card>
          );
        })}
        </div>
      )}
    </div>
  );
}