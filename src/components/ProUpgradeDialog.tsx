import React from 'react';
import { 
  Crown, 
  Sparkles, 
  Zap, 
  Brain, 
  Infinity, 
  Users, 
  Shield, 
  Rocket,
  Check,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface ProUpgradeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  onUpgrade?: () => void;
}

const PRO_FEATURES = [
  {
    icon: Brain,
    title: 'Advanced AI Models',
    description: 'Access to GPT-4, Claude Sonnet, and other premium models',
    free: 'Basic models only',
    pro: 'All premium models'
  },
  {
    icon: Sparkles,
    title: 'Enhanced Prompt Optimization',
    description: 'Advanced prompt engineering and optimization',
    free: 'Basic enhancement',
    pro: 'Advanced AI-powered optimization'
  },
  {
    icon: Infinity,
    title: 'Unlimited Apps',
    description: 'Create as many apps as you need',
    free: '5 apps maximum',
    pro: 'Unlimited apps'
  },
  {
    icon: Zap,
    title: 'Smart Code Context',
    description: 'Cross-app semantic understanding and suggestions',
    free: 'Limited context',
    pro: 'Full cross-app intelligence'
  },
  {
    icon: Rocket,
    title: 'Premium Templates',
    description: 'Access to advanced app templates and components',
    free: 'Basic templates',
    pro: 'Premium template library'
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Share apps and collaborate with team members',
    free: 'Solo development',
    pro: 'Team collaboration'
  },
  {
    icon: Shield,
    title: 'Priority Support',
    description: 'Get help faster with priority customer support',
    free: 'Community support',
    pro: 'Priority email support'
  }
];

export function ProUpgradeDialog({ 
  isOpen, 
  onClose, 
  feature,
  onUpgrade 
}: ProUpgradeDialogProps) {
  
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Navigate to Applaa Pro settings
      window.location.hash = '/settings/providers/auto';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-4">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Upgrade to Applaa Pro
          </DialogTitle>
          <DialogDescription className="text-lg">
            {feature 
              ? `${feature} requires Applaa Pro. Unlock all premium features and supercharge your development.`
              : 'Unlock all premium features and supercharge your development workflow.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pricing Card */}
          <Card className="border-2 border-gradient-to-r from-purple-200 to-blue-200 bg-gradient-to-br from-purple-50/50 to-blue-50/50">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Limited Time
                </Badge>
              </div>
              <div className="text-3xl font-bold mb-1">$19<span className="text-lg text-gray-600">/month</span></div>
              <p className="text-gray-600 mb-4">Everything you need to build amazing apps</p>
              <Button 
                onClick={handleUpgrade}
                size="lg"
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
              >
                <Crown className="h-4 w-4 mr-2" />
                Start Pro Trial
              </Button>
              <p className="text-xs text-gray-500 mt-2">7-day free trial • Cancel anytime</p>
            </CardContent>
          </Card>

          {/* Features Comparison */}
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold text-center mb-4">What's Included in Pro</h3>
            <div className="grid gap-3">
              {PRO_FEATURES.map((feature, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-lg border bg-white dark:bg-gray-800">
                  <div className="p-2 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg">
                    <feature.icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{feature.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{feature.description}</p>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-500" />
                        <span className="text-gray-500">Free: {feature.free}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-green-700 dark:text-green-400">Pro: {feature.pro}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center pt-4 border-t">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Join thousands of developers building amazing apps with Applaa Pro
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={onClose}>
                Maybe Later
              </Button>
              <Button 
                onClick={handleUpgrade}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
