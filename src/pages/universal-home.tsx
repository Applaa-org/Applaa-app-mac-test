/**
 * Universal Home Page
 * 
 * A demonstration of the revolutionary unlimited app building approach.
 * This shows what the home page could become when we remove all limitations.
 */

import React, { useState } from 'react';
import { 
  UniversalAppBuilder, 
  UniversalFrameworkShowcase,
  EnhancedHomeInterface 
} from '@/components/universal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Target, 
  Zap, 
  Infinity, 
  Rocket,
  Globe,
  Smartphone,
  Monitor,
  Server,
  Database,
  Gamepad2,
  Brain,
  Code,
  Users,
  TrendingUp
} from 'lucide-react';

export default function UniversalHomePage() {
  const [selectedExample, setSelectedExample] = useState<string | null>(null);

  const examples = [
    {
      id: 'startup-mvp',
      title: '🚀 Startup MVP',
      description: 'Full-stack application with all the essentials',
      prompt: 'Build a SaaS platform with user authentication, subscription billing, admin dashboard, API, and mobile app using React, Node.js, and React Native',
      complexity: 'Complex',
      time: '2-3 days',
      frameworks: ['React', 'Node.js', 'React Native', 'PostgreSQL'],
      features: ['Authentication', 'Payments', 'Admin Panel', 'API', 'Mobile App']
    },
    {
      id: 'ecommerce-empire',
      title: '🛍️ E-commerce Empire',
      description: 'Complete online marketplace with all the bells and whistles',
      prompt: 'Create a multi-vendor e-commerce marketplace with product catalog, vendor dashboards, payment processing, inventory management, mobile apps, and analytics using Next.js, Django, Flutter, and Stripe',
      complexity: 'Complex',
      time: '3-5 days',
      frameworks: ['Next.js', 'Django', 'Flutter', 'PostgreSQL', 'Redis'],
      features: ['Multi-vendor', 'Payments', 'Inventory', 'Analytics', 'Mobile Apps']
    },
    {
      id: 'game-studio',
      title: '🎮 Game Studio',
      description: '2D/3D games for multiple platforms',
      prompt: 'Build a 2D platformer game with physics, animations, sound effects, leaderboards, and multiplayer support using Unity for mobile, web, and desktop platforms',
      complexity: 'Complex',
      time: '4-7 days',
      frameworks: ['Unity', 'C#', 'Photon Network'],
      features: ['Physics', 'Animations', 'Multiplayer', 'Leaderboards', 'Cross-platform']
    },
    {
      id: 'ai-powered-app',
      title: '🤖 AI-Powered Application',
      description: 'Machine learning and AI integration',
      prompt: 'Create an AI-powered content creation tool with natural language processing, image generation, sentiment analysis, and chatbot features using Python, TensorFlow, OpenAI API, and React',
      complexity: 'Complex',
      time: '3-5 days',
      frameworks: ['Python', 'TensorFlow', 'React', 'OpenAI API'],
      features: ['NLP', 'Image Generation', 'Chatbot', 'Sentiment Analysis', 'AI Models']
    },
    {
      id: 'iot-system',
      title: '🌐 IoT System',
      description: 'Internet of Things with real-time monitoring',
      prompt: 'Build an IoT monitoring system with sensor data collection, real-time dashboards, alerts, mobile app, and device management using Node.js, React, Flutter, MQTT, and InfluxDB',
      complexity: 'Complex',
      time: '4-6 days',
      frameworks: ['Node.js', 'React', 'Flutter', 'MQTT', 'InfluxDB'],
      features: ['Real-time Data', 'Alerts', 'Device Management', 'Mobile Control', 'Analytics']
    },
    {
      id: 'simple-blog',
      title: '📝 Simple Blog',
      description: 'Clean, fast blog with modern features',
      prompt: 'Create a personal blog with markdown support, comments, SEO optimization, and admin panel using Next.js and Sanity CMS',
      complexity: 'Simple',
      time: '2-4 hours',
      frameworks: ['Next.js', 'Sanity CMS'],
      features: ['Markdown', 'Comments', 'SEO', 'Admin Panel']
    }
  ];

  const stats = [
    { label: 'Supported Frameworks', value: '100+', icon: Code },
    { label: 'Programming Languages', value: '25+', icon: Globe },
    { label: 'Platform Targets', value: '15+', icon: Target },
    { label: 'Project Templates', value: '500+', icon: Rocket }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-6 mb-12">
          <div className="flex items-center justify-center space-x-3">
            <Infinity className="h-12 w-12 text-blue-600" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Applaa Universal
            </h1>
          </div>
          
          <p className="text-2xl text-gray-700 max-w-4xl mx-auto">
            The world's first <strong>unlimited app builder</strong>. 
            Build <strong>anything</strong> with <strong>any framework</strong>. 
            No restrictions. No boundaries. Just pure creative freedom.
          </p>
          
          <div className="flex flex-wrap justify-center gap-3">
            <Badge className="bg-blue-100 text-blue-800 text-lg px-4 py-2">
              <Globe className="h-4 w-4 mr-2" />
              Web Apps
            </Badge>
            <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">
              <Smartphone className="h-4 w-4 mr-2" />
              Mobile Apps
            </Badge>
            <Badge className="bg-purple-100 text-purple-800 text-lg px-4 py-2">
              <Monitor className="h-4 w-4 mr-2" />
              Desktop Apps
            </Badge>
            <Badge className="bg-orange-100 text-orange-800 text-lg px-4 py-2">
              <Server className="h-4 w-4 mr-2" />
              APIs & Services
            </Badge>
            <Badge className="bg-red-100 text-red-800 text-lg px-4 py-2">
              <Gamepad2 className="h-4 w-4 mr-2" />
              Games
            </Badge>
            <Badge className="bg-indigo-100 text-indigo-800 text-lg px-4 py-2">
              <Brain className="h-4 w-4 mr-2" />
              AI/ML Apps
            </Badge>
            <Badge className="bg-gray-100 text-gray-800 text-lg px-4 py-2">
              <Infinity className="h-4 w-4 mr-2" />
              Anything!
            </Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Card key={index} className="text-center">
                <CardContent className="p-6">
                  <IconComponent className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Universal Builder */}
        <Card className="mb-12 border-2 border-blue-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardTitle className="text-2xl flex items-center space-x-2">
              <Sparkles className="h-6 w-6" />
              <span>Universal App Builder</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <UniversalAppBuilder 
              onCreateProject={(framework, projectName, userPrompt) => {
                alert(`🚀 Creating ${framework.name} project: "${projectName}"!\n\nFramework: ${framework.name}\nLanguage: ${framework.language}\nCategory: ${framework.category}\n\nThis would integrate with the full Applaa system!`);
              }}
            />
          </CardContent>
        </Card>

        {/* Example Projects */}
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Incredible Project Examples</h2>
            <p className="text-gray-600 text-lg">
              See what's possible when you remove all limitations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {examples.map((example) => (
              <Card 
                key={example.id}
                className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                  selectedExample === example.id ? 'ring-2 ring-blue-500 border-blue-300' : ''
                }`}
                onClick={() => setSelectedExample(example.id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{example.title}</CardTitle>
                  <CardDescription>{example.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <Badge variant={
                      example.complexity === 'Simple' ? 'default' : 
                      example.complexity === 'Medium' ? 'secondary' : 'destructive'
                    }>
                      {example.complexity}
                    </Badge>
                    <span className="text-gray-600">{example.time}</span>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Frameworks:</p>
                    <div className="flex flex-wrap gap-1">
                      {example.frameworks.map((framework, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {framework}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {example.features.slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {example.features.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{example.features.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Would integrate with UniversalAppBuilder
                      alert(`Building: ${example.title}\n\n${example.prompt}`);
                    }}
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    Build This Project
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Framework Showcase */}
        <div className="mt-12">
          <UniversalFrameworkShowcase />
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12 p-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Build the Impossible?</h2>
          <p className="text-xl mb-6 opacity-90">
            Join the revolution. Break free from limitations. Build anything you can imagine.
          </p>
          <Button 
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-4"
          >
            <Infinity className="h-5 w-5 mr-2" />
            Start Building Now
          </Button>
        </div>
      </div>
    </div>
  );
}


