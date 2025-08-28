/**
 * Universal App Builder Component
 * 
 * The revolutionary interface that replaces platform/framework limitations
 * with unlimited building possibilities. Users can build ANYTHING.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Search, 
  Sparkles, 
  Zap, 
  ArrowRight, 
  Clock, 
  Target, 
  Lightbulb,
  Code,
  Globe,
  Smartphone,
  Monitor,
  Server,
  Database,
  Gamepad2,
  ShoppingCart,
  Bot,
  Brain,
  Rocket
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  UniversalPromptProcessor, 
  FrameworkSuggestionEngine,
  type ProcessedPrompt 
} from '@/lib/universal/prompt-processor';
import { 
  UNIVERSAL_FRAMEWORKS,
  type UniversalFramework 
} from '@/lib/universal/framework-registry';

interface UniversalAppBuilderProps {
  onCreateProject: (framework: UniversalFramework, projectName: string, userPrompt: string) => void;
  initialPrompt?: string;
}

export function UniversalAppBuilder({ onCreateProject, initialPrompt = '' }: UniversalAppBuilderProps) {
  const [userPrompt, setUserPrompt] = useState(initialPrompt);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processedPrompt, setProcessedPrompt] = useState<ProcessedPrompt | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<UniversalFramework | null>(null);
  const [showAllFrameworks, setShowAllFrameworks] = useState(false);

  // Process the user's prompt
  const analyzePrompt = useCallback(async () => {
    if (!userPrompt.trim()) return;
    
    setIsAnalyzing(true);
    
    // Simulate analysis delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const processed = UniversalPromptProcessor.processPrompt(userPrompt);
    setProcessedPrompt(processed);
    setSelectedFramework(processed.detectedFramework);
    setIsAnalyzing(false);
  }, [userPrompt]);

  // Handle framework selection
  const handleFrameworkSelect = useCallback((framework: UniversalFramework) => {
    setSelectedFramework(framework);
  }, []);

  // Handle project creation
  const handleCreateProject = useCallback(() => {
    if (!selectedFramework || !userPrompt.trim()) return;
    
    const projectName = userPrompt
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .slice(0, 3)
      .join('-') || 'my-project';
    
    onCreateProject(selectedFramework, projectName, userPrompt);
  }, [selectedFramework, userPrompt, onCreateProject]);

  // Get framework icon
  const getFrameworkIcon = (framework: UniversalFramework) => {
    switch (framework.category) {
      case 'web-frontend':
      case 'web-fullstack':
        return Globe;
      case 'mobile-native':
      case 'mobile-hybrid':
      case 'mobile-cross-platform':
        return Smartphone;
      case 'desktop-native':
      case 'desktop-cross-platform':
        return Monitor;
      case 'web-backend':
      case 'api-framework':
      case 'microservices':
        return Server;
      case 'cms':
      case 'ecommerce':
        return Database;
      case 'game-engine':
      case 'game-framework':
        return Gamepad2;
      case 'ai-ml':
        return Brain;
      default:
        return Code;
    }
  };

  // Quick start templates for common use cases
  const quickStarters = [
    {
      title: "🚀 Startup MVP",
      description: "Full-stack web app with auth, database, and payments",
      prompt: "Build a full-stack startup MVP with user authentication, database, payment processing, and admin dashboard using React and Node.js"
    },
    {
      title: "📱 Mobile App",
      description: "Cross-platform mobile app for iOS and Android",
      prompt: "Create a cross-platform mobile app for iOS and Android with user profiles, real-time chat, and push notifications using Flutter"
    },
    {
      title: "🛍️ E-commerce Store",
      description: "Complete online store with shopping cart and payments",
      prompt: "Build an e-commerce website with product catalog, shopping cart, payment integration, and admin panel using Next.js and Stripe"
    },
    {
      title: "📊 Analytics Dashboard",
      description: "Data visualization and business intelligence dashboard",
      prompt: "Create a real-time analytics dashboard with charts, data visualization, and reporting features using React and D3.js"
    },
    {
      title: "🎮 Game Project",
      description: "2D or 3D game for web, mobile, or desktop",
      prompt: "Build a 2D platformer game with physics, animations, and sound effects using Unity for multiple platforms"
    },
    {
      title: "🤖 AI-Powered App",
      description: "Application with machine learning and AI features",
      prompt: "Create an AI-powered chatbot with natural language processing, sentiment analysis, and learning capabilities using Python and TensorFlow"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Sparkles className="h-8 w-8 text-blue-600" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Universal App Builder
          </h1>
        </div>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Build <strong>ANYTHING</strong> with <strong>ANY</strong> framework. 
          Just describe what you want to create, and we'll make it happen.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            <Globe className="h-3 w-3 mr-1" />
            Web Apps
          </Badge>
          <Badge variant="outline" className="text-green-600 border-green-200">
            <Smartphone className="h-3 w-3 mr-1" />
            Mobile Apps
          </Badge>
          <Badge variant="outline" className="text-purple-600 border-purple-200">
            <Monitor className="h-3 w-3 mr-1" />
            Desktop Apps
          </Badge>
          <Badge variant="outline" className="text-orange-600 border-orange-200">
            <Server className="h-3 w-3 mr-1" />
            APIs & Services
          </Badge>
          <Badge variant="outline" className="text-red-600 border-red-200">
            <Gamepad2 className="h-3 w-3 mr-1" />
            Games
          </Badge>
          <Badge variant="outline" className="text-indigo-600 border-indigo-200">
            <Brain className="h-3 w-3 mr-1" />
            AI/ML Apps
          </Badge>
          <Badge variant="outline" className="text-gray-600 border-gray-200">
            <Rocket className="h-3 w-3 mr-1" />
            And More!
          </Badge>
        </div>
      </div>

      {/* Main Input */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <span>What do you want to build?</span>
          </CardTitle>
          <CardDescription>
            Describe your project in natural language. Mention the framework if you have a preference, 
            or let us suggest the best one for your needs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g., 'Build a social media app with React Native', 'Create a REST API with Django', 'Make a 2D game with Unity', 'Build a blog with WordPress'..."
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            className="min-h-[120px] text-lg"
          />
          
          <div className="flex items-center space-x-4">
            <Button 
              onClick={analyzePrompt}
              disabled={!userPrompt.trim() || isAnalyzing}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isAnalyzing ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze & Build
                </>
              )}
            </Button>
            
            {processedPrompt && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Estimated time: {processedPrompt.estimatedTime}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Starters */}
      {!processedPrompt && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-center">Or start with a template</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickStarters.map((starter, index) => (
              <Card 
                key={index}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                onClick={() => setUserPrompt(starter.prompt)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{starter.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{starter.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {processedPrompt && (
        <div className="space-y-6">
          {/* Project Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-green-500" />
                <span>Project Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700">Project Type</h4>
                  <p className="text-lg font-semibold capitalize">
                    {processedPrompt.projectType.replace('-', ' ')}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">Complexity</h4>
                  <Badge variant={
                    processedPrompt.complexity === 'simple' ? 'default' :
                    processedPrompt.complexity === 'medium' ? 'secondary' : 'destructive'
                  }>
                    {processedPrompt.complexity}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">Estimated Time</h4>
                  <p className="text-lg font-semibold">{processedPrompt.estimatedTime}</p>
                </div>
              </div>
              
              {processedPrompt.features.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Detected Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {processedPrompt.features.map((feature, index) => (
                      <Badge key={index} variant="outline">
                        {feature.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {processedPrompt.platforms.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Target Platforms</h4>
                  <div className="flex flex-wrap gap-2">
                    {processedPrompt.platforms.map((platform, index) => (
                      <Badge key={index} variant="outline" className="capitalize">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Framework Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Code className="h-5 w-5 text-blue-500" />
                  <span>Framework Recommendations</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllFrameworks(!showAllFrameworks)}
                >
                  {showAllFrameworks ? 'Show Less' : 'Show All Frameworks'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(showAllFrameworks ? UNIVERSAL_FRAMEWORKS : processedPrompt.suggestedFrameworks).map((framework) => {
                  const IconComponent = getFrameworkIcon(framework);
                  const isSelected = selectedFramework?.id === framework.id;
                  const isDetected = processedPrompt.detectedFramework?.id === framework.id;
                  
                  return (
                    <Card
                      key={framework.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        isSelected 
                          ? 'ring-2 ring-blue-500 border-blue-300' 
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() => handleFrameworkSelect(framework)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <IconComponent className="h-5 w-5 text-blue-600" />
                            <CardTitle className="text-lg">{framework.name}</CardTitle>
                          </div>
                          {isDetected && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Detected
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <CardDescription className="text-sm">
                          {framework.description}
                        </CardDescription>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 capitalize">
                            {framework.category.replace('-', ' ')}
                          </span>
                          <span className="text-gray-500 capitalize">
                            {framework.language}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {framework.platforms.slice(0, 3).map((platform, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                          {framework.platforms.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{framework.platforms.length - 3}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Framework Details & Guidance */}
          {selectedFramework && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  <span>Why {selectedFramework.name}?</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const explanation = FrameworkSuggestionEngine.explainFrameworkChoice(
                    selectedFramework, 
                    processedPrompt.originalPrompt
                  );
                  
                  return (
                    <>
                      <p className="text-gray-700">{explanation.reasoning}</p>
                      
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Key Benefits</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {explanation.benefits.map((benefit, index) => (
                            <li key={index}>{benefit}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {explanation.warning && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-yellow-800 text-sm">{explanation.warning}</p>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Getting Started</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {selectedFramework.gettingStarted.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Guidance */}
          {processedPrompt.guidance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  <span>Recommendations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {processedPrompt.guidance.map((tip, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <ArrowRight className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Create Project Button */}
          <div className="text-center">
            <Button
              onClick={handleCreateProject}
              disabled={!selectedFramework}
              size="lg"
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-3"
            >
              <Rocket className="h-5 w-5 mr-2" />
              Create {selectedFramework?.name} Project
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


