import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Zap, Package, Smartphone, Globe } from "lucide-react";
import { useAtomValue } from 'jotai';
import { appUrlAtom } from '@/atoms/appAtoms';
import { AppUpgrade } from '@/ipc/ipc_types';

interface MobileFramework {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  pros: string[];
  cons: string[];
  bundleSize: string;
  setupTime: string;
  performance: 'Good' | 'Excellent';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  bestFor: string;
}

const frameworks: MobileFramework[] = [
  {
    id: 'capacitor',
    name: 'Capacitor',
    icon: <Zap className="w-5 h-5 text-blue-600" />,
    description: 'Native iOS and Android apps with extensive plugin ecosystem',
    pros: [
      'Extensive native plugin ecosystem',
      'Direct integration with existing web app',
      'Full access to native APIs',
      'Mature and stable platform'
    ],
    cons: [
      'Larger bundle size',
      'Requires Xcode/Android Studio for builds',
      'More complex setup process'
    ],
    bundleSize: '~15MB',
    setupTime: '10-15 min',
    performance: 'Good',
    difficulty: 'Medium',
    bestFor: 'Apps needing native features'
  },
  {
    id: 'flutter-webview',
    name: 'Flutter App',
    icon: <Package className="w-5 h-5 text-cyan-600" />,
    description: 'Flutter app, optimized performance and small size',
    pros: [
      'Smallest bundle size',
      'Excellent performance',
      'Beautiful native UI',
      'Single codebase for iOS/Android'
    ],
    cons: [
      'Requires Flutter SDK',
      'Dart learning curve',
      'Less web-specific features'
    ],
    bundleSize: '~8MB',
    setupTime: '8-12 min',
    performance: 'Excellent',
    difficulty: 'Medium',
    bestFor: 'Performance-critical apps'
  }
];

interface MobileUpgradeComparisonProps {
  availableUpgrades: AppUpgrade[];
  onSelectFramework: (frameworkId: string, webUrl?: string) => void;
  isUpgrading: boolean;
  upgradingFramework?: string;
}

export function MobileUpgradeComparison({ 
  availableUpgrades,
  onSelectFramework, 
  isUpgrading, 
  upgradingFramework 
}: MobileUpgradeComparisonProps) {
  const { appUrl } = useAtomValue(appUrlAtom);
  
  // Filter frameworks to only show those that are available for upgrade
  const availableFrameworks = frameworks.filter(framework => 
    availableUpgrades.some(upgrade => upgrade.id === framework.id)
  );
  
  const getPerformanceBadgeColor = (performance: string) => {
    return performance === 'Excellent' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
  };

  const getDifficultyBadgeColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleFrameworkSelect = (frameworkId: string) => {
    // For Capacitor, no URL needed (it modifies the existing app)
    if (frameworkId === 'capacitor') {
      onSelectFramework(frameworkId);
      return;
    }

    // For mobile apps, automatically use the current web app URL
    const webUrl = appUrl || 'http://localhost:5173'; // Fallback to default Vite port
    onSelectFramework(frameworkId, webUrl);
  };

  const getFrameworkButtonStyle = (frameworkId: string, isActive: boolean) => {
    const baseClasses = "w-full text-xs h-8 font-medium transition-all duration-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed";
    
    if (isActive) {
      // Active/upgrading state - darker versions
      switch (frameworkId) {
        case 'capacitor':
          return `${baseClasses} bg-blue-600 hover:bg-blue-700 text-white border-0`;
        case 'flutter-webview':
          return `${baseClasses} bg-cyan-600 hover:bg-cyan-700 text-white border-0`;
        default:
          return `${baseClasses} bg-gray-600 hover:bg-gray-700 text-white border-0`;
      }
    } else {
      // Normal state - colorful but lighter
      switch (frameworkId) {
        case 'capacitor':
          return `${baseClasses} bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 hover:border-blue-300`;
        case 'flutter-webview':
          return `${baseClasses} bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 hover:border-cyan-300`;
        default:
          return `${baseClasses} bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-300`;
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
          <Globe className="w-5 h-5" />
          Choose Your Mobile Framework
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Convert your web app to mobile with one of these frameworks
        </p>
        {appUrl && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
            <Globe className="w-3 h-3" />
            Will use: {appUrl}
          </div>
        )}
      </div>

      <div className={`grid gap-4 ${availableFrameworks.length === 1 ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
        {availableFrameworks.map((framework) => (
          <Card 
            key={framework.id} 
            className="relative hover:shadow-md transition-shadow"
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {framework.icon}
                {framework.name}
              </CardTitle>
              <CardDescription className="text-xs">
                {framework.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-medium">Bundle Size:</span>
                  <div className="text-gray-600">{framework.bundleSize}</div>
                </div>
                <div>
                  <span className="font-medium">Setup Time:</span>
                  <div className="text-gray-600">{framework.setupTime}</div>
                </div>
              </div>

              {/* Badges */}
              <div className="flex gap-2 flex-wrap">
                <Badge className={getPerformanceBadgeColor(framework.performance)}>
                  {framework.performance}
                </Badge>
                <Badge className={getDifficultyBadgeColor(framework.difficulty)}>
                  {framework.difficulty}
                </Badge>
              </div>

              {/* Best For */}
              <div className="text-xs">
                <span className="font-medium text-blue-600">Best for:</span>
                <div className="text-gray-600">{framework.bestFor}</div>
              </div>

              {/* Pros */}
              <div className="space-y-1">
                <div className="text-xs font-medium text-green-600">Pros:</div>
                <ul className="text-xs space-y-1">
                  {framework.pros.slice(0, 2).map((pro, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleFrameworkSelect(framework.id)}
                disabled={isUpgrading}
                className={getFrameworkButtonStyle(
                  framework.id, 
                  isUpgrading && upgradingFramework === framework.id
                )}
              >
                {isUpgrading && upgradingFramework === framework.id ? (
                  <>
                    <Clock className="w-3 h-3 mr-1 animate-spin" />
                    Creating...
                  </>
                ) : (
                  `Create ${framework.name}`
                )}
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Detailed Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Feature</th>
                  <th className="text-center py-2">Capacitor</th>
                  
                  <th className="text-center py-2">Flutter</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b">
                  <td className="py-2 font-medium">Bundle Size</td>
                  <td className="text-center">~15MB</td>
                  <td className="text-center">~8MB</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Performance</td>
                  <td className="text-center">Good</td>
                  <td className="text-center">Excellent</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Native APIs</td>
                  <td className="text-center">Extensive</td>
                  <td className="text-center">Extensive</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Setup Complexity</td>
                  <td className="text-center">Medium</td>
                  <td className="text-center">Medium</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Testing</td>
                  <td className="text-center">Simulator/Device</td>
                  <td className="text-center">Simulator/Device</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
