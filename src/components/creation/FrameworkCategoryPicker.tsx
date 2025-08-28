/**
 * Framework Category Picker Component
 * 
 * A beautiful, scalable interface for selecting framework categories.
 * Supports Web Apps, Mobile Apps, WordPress CMS, and future expansions.
 */

import React, { useState, useMemo } from 'react';
import { 
  Globe, 
  Smartphone, 
  Database, 
  ShoppingCart, 
  MapPin, 
  Palette,
  Zap,
  Users,
  TrendingUp,
  Star,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Framework category definition
 */
export interface FrameworkCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  gradient: string;
  lightColor: string;
  borderColor: string;
  popularity: number;
  frameworks: {
    id: string;
    name: string;
    description: string;
    icon: string;
    features: string[];
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    buildTime: string;
  }[];
  features: string[];
  useCases: string[];
  comingSoon?: boolean;
}

/**
 * Available framework categories
 */
export const FRAMEWORK_CATEGORIES: FrameworkCategory[] = [
  {
    id: 'web-apps',
    name: 'Web Applications',
    description: 'Modern web apps with React, Next.js, and cutting-edge frameworks',
    icon: Globe,
    gradient: 'from-blue-500 to-cyan-500',
    lightColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    popularity: 95,
    frameworks: [
      {
        id: 'react',
        name: 'React',
        description: 'Modern React apps with TypeScript',
        icon: '⚛️',
        features: ['Component-based', 'Virtual DOM', 'Rich ecosystem'],
        difficulty: 'Intermediate',
        buildTime: '5-15 min'
      },
      {
        id: 'nextjs',
        name: 'Next.js',
        description: 'Full-stack React with SSR/SSG',
        icon: '🔺',
        features: ['Server-side rendering', 'API routes', 'Optimized'],
        difficulty: 'Intermediate',
        buildTime: '10-20 min'
      },
      {
        id: 'vue',
        name: 'Vue.js',
        description: 'Progressive Vue.js applications',
        icon: '💚',
        features: ['Progressive', 'Easy to learn', 'Flexible'],
        difficulty: 'Beginner',
        buildTime: '5-15 min'
      }
    ],
    features: ['Responsive Design', 'SEO Optimized', 'Fast Performance', 'Modern UI'],
    useCases: ['SaaS Platforms', 'E-commerce', 'Dashboards', 'Landing Pages']
  },
  {
    id: 'mobile-apps',
    name: 'Mobile Applications',
    description: 'Native mobile apps for iOS and Android with Flutter and Expo',
    icon: Smartphone,
    gradient: 'from-purple-500 to-pink-500',
    lightColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    popularity: 88,
    frameworks: [
      {
        id: 'flutter',
        name: 'Flutter',
        description: 'Google\'s UI toolkit for native apps',
        icon: '💙',
        features: ['Single codebase', 'Native performance', 'Hot reload'],
        difficulty: 'Intermediate',
        buildTime: '10-25 min'
      },
      {
        id: 'expo',
        name: 'Expo',
        description: 'React Native made easy',
        icon: '⚛️',
        features: ['Instant preview', 'OTA updates', 'Rich tooling'],
        difficulty: 'Beginner',
        buildTime: '5-15 min'
      },
      {
        id: 'react-native',
        name: 'React Native',
        description: 'Native mobile with React',
        icon: '📱',
        features: ['Cross-platform', 'Native modules', 'Code sharing'],
        difficulty: 'Advanced',
        buildTime: '15-30 min'
      }
    ],
    features: ['Cross-platform', 'Native Performance', 'App Store Ready', 'Real-time Updates'],
    useCases: ['Business Apps', 'Social Media', 'E-commerce', 'Games']
  },
  {
    id: 'wordpress-cms',
    name: 'WordPress CMS',
    description: 'Complete WordPress websites with AI-powered plugins and themes',
    icon: Database,
    gradient: 'from-green-500 to-emerald-500',
    lightColor: 'bg-green-50',
    borderColor: 'border-green-200',
    popularity: 92,
    comingSoon: true,
    frameworks: [
      {
        id: 'wordpress-basic',
        name: 'WordPress Site',
        description: 'Complete WordPress CMS',
        icon: '🌐',
        features: ['Content management', 'Plugin ecosystem', 'Theme system'],
        difficulty: 'Beginner',
        buildTime: '15-30 min'
      },
      {
        id: 'wordpress-headless',
        name: 'Headless WordPress',
        description: 'WordPress as API + React frontend',
        icon: '🔌',
        features: ['API-first', 'Modern frontend', 'Flexible'],
        difficulty: 'Advanced',
        buildTime: '20-40 min'
      }
    ],
    features: ['AI-Powered Plugins', 'Custom Themes', 'SEO Optimized', 'Admin Dashboard'],
    useCases: ['Blogs', 'Business Sites', 'News Sites', 'Portfolios']
  },
  {
    id: 'ecommerce',
    name: 'E-commerce Sites',
    description: 'Complete online stores with WooCommerce and modern e-commerce solutions',
    icon: ShoppingCart,
    gradient: 'from-orange-500 to-red-500',
    lightColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    popularity: 85,
    comingSoon: true,
    frameworks: [
      {
        id: 'woocommerce',
        name: 'WooCommerce',
        description: 'WordPress-powered e-commerce',
        icon: '🛍️',
        features: ['Product management', 'Payment gateways', 'Inventory'],
        difficulty: 'Intermediate',
        buildTime: '20-40 min'
      },
      {
        id: 'shopify-app',
        name: 'Shopify Store',
        description: 'Custom Shopify themes and apps',
        icon: '🏪',
        features: ['Shopify ecosystem', 'Liquid templates', 'App extensions'],
        difficulty: 'Intermediate',
        buildTime: '15-30 min'
      },
      {
        id: 'nextjs-commerce',
        name: 'Next.js Commerce',
        description: 'Modern headless e-commerce',
        icon: '🚀',
        features: ['Headless architecture', 'Fast performance', 'Custom checkout'],
        difficulty: 'Advanced',
        buildTime: '25-45 min'
      }
    ],
    features: ['Payment Integration', 'Inventory Management', 'Customer Portal', 'Analytics'],
    useCases: ['Online Stores', 'Marketplaces', 'Digital Products', 'Subscriptions']
  },
  {
    id: 'directory-sites',
    name: 'Directory & Listing Sites',
    description: 'Directory websites with listings, maps, and user management',
    icon: MapPin,
    gradient: 'from-indigo-500 to-purple-500',
    lightColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    popularity: 78,
    comingSoon: true,
    frameworks: [
      {
        id: 'directory-wp',
        name: 'WordPress Directory',
        description: 'Directory with WordPress + plugins',
        icon: '📍',
        features: ['User listings', 'Search & filter', 'Map integration'],
        difficulty: 'Intermediate',
        buildTime: '20-35 min'
      },
      {
        id: 'nextjs-directory',
        name: 'Next.js Directory',
        description: 'Modern directory with Next.js',
        icon: '🗂️',
        features: ['Real-time search', 'User profiles', 'Admin dashboard'],
        difficulty: 'Advanced',
        buildTime: '25-40 min'
      }
    ],
    features: ['Advanced Search', 'Map Integration', 'User Profiles', 'Review System'],
    useCases: ['Business Directories', 'Job Boards', 'Real Estate', 'Restaurant Listings']
  },
  {
    id: 'design-systems',
    name: 'Design Systems',
    description: 'Component libraries and design systems for teams',
    icon: Palette,
    gradient: 'from-pink-500 to-rose-500',
    lightColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    popularity: 72,
    comingSoon: true,
    frameworks: [
      {
        id: 'storybook',
        name: 'Storybook',
        description: 'Component documentation',
        icon: '📚',
        features: ['Component showcase', 'Documentation', 'Testing'],
        difficulty: 'Intermediate',
        buildTime: '15-25 min'
      },
      {
        id: 'design-tokens',
        name: 'Design Tokens',
        description: 'Design system with tokens',
        icon: '🎨',
        features: ['Design tokens', 'Theme system', 'Brand consistency'],
        difficulty: 'Advanced',
        buildTime: '20-35 min'
      }
    ],
    features: ['Component Library', 'Documentation', 'Brand Guidelines', 'Token System'],
    useCases: ['Team Collaboration', 'Brand Systems', 'UI Libraries', 'Style Guides']
  }
];

/**
 * Props for the FrameworkCategoryPicker component
 */
interface FrameworkCategoryPickerProps {
  /** Function called when a category is selected */
  onCategorySelect: (category: FrameworkCategory) => void;
  
  /** Currently selected category */
  selectedCategory?: FrameworkCategory | null;
  
  /** Whether to show only available categories */
  showOnlyAvailable?: boolean;
  
  /** Whether to show in compact mode */
  compact?: boolean;
}

/**
 * Main FrameworkCategoryPicker component
 */
export function FrameworkCategoryPicker({
  onCategorySelect,
  selectedCategory,
  showOnlyAvailable = false,
  compact = false
}: FrameworkCategoryPickerProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Filter categories based on availability
  const availableCategories = useMemo(() => {
    return showOnlyAvailable 
      ? FRAMEWORK_CATEGORIES.filter(cat => !cat.comingSoon)
      : FRAMEWORK_CATEGORIES;
  }, [showOnlyAvailable]);

  // Sort categories by popularity
  const sortedCategories = useMemo(() => {
    return [...availableCategories].sort((a, b) => b.popularity - a.popularity);
  }, [availableCategories]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">
          Choose Your Framework Category
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Select the type of application you want to build. Each category offers specialized 
          frameworks and templates optimized for your specific needs.
        </p>
      </div>

      {/* Category Grid */}
      <div className={`grid gap-6 ${compact ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {sortedCategories.map((category) => {
          const IconComponent = category.icon;
          const isSelected = selectedCategory?.id === category.id;
          const isHovered = hoveredCategory === category.id;

          return (
            <Card
              key={category.id}
              className={`relative cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                category.borderColor
              } border-2 ${
                isSelected 
                  ? 'ring-2 ring-blue-500 border-blue-300 shadow-lg' 
                  : 'hover:border-gray-300'
              } ${
                category.comingSoon ? 'opacity-75' : ''
              }`}
              onMouseEnter={() => setHoveredCategory(category.id)}
              onMouseLeave={() => setHoveredCategory(null)}
              onClick={() => !category.comingSoon && onCategorySelect(category)}
            >
              {/* Coming Soon Badge */}
              {category.comingSoon && (
                <div className="absolute top-3 right-3 z-10">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    Coming Soon
                  </Badge>
                </div>
              )}

              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-3 left-3 z-10">
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                </div>
              )}

              <CardHeader className={`${category.lightColor} relative overflow-hidden`}>
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-5`} />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${category.gradient}`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{category.popularity}%</span>
                      </div>
                      <p className="text-xs text-gray-500">Popular</p>
                    </div>
                  </div>
                  
                  <CardTitle className="text-lg mb-1">{category.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {category.description}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Frameworks Preview */}
                <div>
                  <p className="text-sm font-medium mb-2">Available Frameworks:</p>
                  <div className="flex flex-wrap gap-1">
                    {category.frameworks.slice(0, 3).map((framework) => (
                      <div
                        key={framework.id}
                        className="flex items-center space-x-1 bg-gray-100 rounded-md px-2 py-1"
                      >
                        <span className="text-xs">{framework.icon}</span>
                        <span className="text-xs font-medium">{framework.name}</span>
                      </div>
                    ))}
                    {category.frameworks.length > 3 && (
                      <div className="text-xs text-gray-500 px-2 py-1">
                        +{category.frameworks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>

                {/* Key Features */}
                <div>
                  <p className="text-sm font-medium mb-2">Key Features:</p>
                  <div className="space-y-1">
                    {category.features.slice(0, 3).map((feature, index) => (
                      <div key={index} className="flex items-center text-xs text-gray-600">
                        <Zap className="h-3 w-3 mr-1 text-green-500" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Use Cases */}
                <div>
                  <p className="text-sm font-medium mb-2">Perfect For:</p>
                  <div className="flex flex-wrap gap-1">
                    {category.useCases.slice(0, 2).map((useCase, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {useCase}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                {!category.comingSoon && (
                  <Button
                    className={`w-full mt-4 bg-gradient-to-r ${category.gradient} hover:opacity-90 text-white`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCategorySelect(category);
                    }}
                  >
                    Choose {category.name}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}

                {category.comingSoon && (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    disabled
                  >
                    Coming Soon
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Statistics */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {FRAMEWORK_CATEGORIES.filter(c => !c.comingSoon).length}
            </div>
            <p className="text-sm text-gray-600">Available Now</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {FRAMEWORK_CATEGORIES.filter(c => c.comingSoon).length}
            </div>
            <p className="text-sm text-gray-600">Coming Soon</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {FRAMEWORK_CATEGORIES.reduce((sum, cat) => sum + cat.frameworks.length, 0)}
            </div>
            <p className="text-sm text-gray-600">Total Frameworks</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              ∞
            </div>
            <p className="text-sm text-gray-600">Possibilities</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for smaller spaces
 */
export function CompactFrameworkPicker({
  onCategorySelect,
  selectedCategory
}: {
  onCategorySelect: (category: FrameworkCategory) => void;
  selectedCategory?: FrameworkCategory | null;
}) {
  const availableCategories = FRAMEWORK_CATEGORIES.filter(cat => !cat.comingSoon);

  return (
    <div className="grid grid-cols-2 gap-3">
      {availableCategories.map((category) => {
        const IconComponent = category.icon;
        const isSelected = selectedCategory?.id === category.id;

        return (
          <Card
            key={category.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              category.borderColor
            } border ${
              isSelected ? 'ring-2 ring-blue-500 border-blue-300' : 'hover:border-gray-300'
            }`}
            onClick={() => onCategorySelect(category)}
          >
            <CardContent className="p-4 text-center">
              <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${category.gradient} mb-2`}>
                <IconComponent className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-medium text-sm">{category.name}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {category.frameworks.length} frameworks
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}


