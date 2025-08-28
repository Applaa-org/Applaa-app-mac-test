import React from 'react';
import { Crown, Lock, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProFeatureGateProps {
  feature: string;
  description: string;
  children?: React.ReactNode;
  variant?: 'card' | 'inline' | 'banner';
  showUpgrade?: boolean;
  onUpgrade?: () => void;
}

export function ProFeatureGate({ 
  feature, 
  description, 
  children, 
  variant = 'card',
  showUpgrade = true,
  onUpgrade 
}: ProFeatureGateProps) {
  
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Default upgrade action - navigate to settings
      window.location.hash = '/settings/providers/auto';
    }
  };

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <Crown className="h-4 w-4 text-amber-600" />
        <span className="text-sm text-amber-800 dark:text-amber-200">
          <strong>{feature}</strong> requires Applaa Pro
        </span>
        {showUpgrade && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleUpgrade}
            className="ml-auto border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className="p-4 bg-gradient-to-r from-purple-50 via-blue-50 to-cyan-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">{feature}</h3>
              <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                <Crown className="h-3 w-3 mr-1" />
                Pro
              </Badge>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{description}</p>
            {showUpgrade && (
              <Button 
                onClick={handleUpgrade}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                <Zap className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default card variant
  return (
    <Card className="border-2 border-dashed border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-12 h-12 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-3">
          <Lock className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          <Crown className="h-5 w-5 text-amber-600" />
          {feature}
        </CardTitle>
        <CardDescription className="text-center">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        {children}
        {showUpgrade && (
          <Button 
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade to Applaa Pro
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Hook to check if user has Pro
export function useApplaaPro() {
  // This would typically come from your settings/user context
  // For now, return false to show the gates
  return {
    isPro: false,
    hasProKey: false,
    upgradeUrl: '/settings/providers/auto'
  };
}

// Higher-order component to wrap Pro features
export function withProGate<T extends object>(
  Component: React.ComponentType<T>,
  feature: string,
  description: string
) {
  return function ProGatedComponent(props: T) {
    const { isPro } = useApplaaPro();
    
    if (!isPro) {
      return (
        <ProFeatureGate 
          feature={feature} 
          description={description}
          variant="card"
        />
      );
    }
    
    return <Component {...props} />;
  };
}
