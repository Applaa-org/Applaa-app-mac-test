import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Sparkles } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useTrialStatus } from '@/hooks/useSubscription';

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRO_PLAN_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly'; // Should be set in env
const TRIAL_DAYS = 14;

export function SubscriptionDialog({ open, onOpenChange }: SubscriptionDialogProps) {
  const { tier, isPro, subscription, createCheckout, isCreatingCheckout } = useSubscription();
  const { isInTrial, daysRemaining } = useTrialStatus();
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro'>('pro');

  const handleUpgrade = async () => {
    try {
      await createCheckout({
        priceId: PRO_PLAN_PRICE_ID,
        trialDays: TRIAL_DAYS,
      });
    } catch (error) {
      console.error('Failed to create checkout:', error);
    }
  };

  const proFeatures = [
    'Unlimited apps',
    'Advanced AI models (GPT-4, Claude Sonnet)',
    'GitHub integration',
    'Vercel deployment',
    'Custom domains',
    'Flutter mobile apps',
    'Spark AI Context Engine',
    'Priority support',
    'Usage analytics',
    'No ads',
  ];

  const freeFeatures = [
    '5 apps per month',
    'Basic AI models',
    'Community support',
    'Standard templates',
    'Local preview only',
    'Applaa branding',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Subscription Plans
          </DialogTitle>
          <DialogDescription>
            Choose the plan that's right for you. Upgrade anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Free Plan */}
          <Card className={tier === 'free' ? 'border-2 border-primary' : ''}>
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>Perfect for getting started</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {freeFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              {tier === 'free' && (
                <Badge variant="secondary" className="w-full justify-center">
                  Current Plan
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className={`relative ${tier === 'pro' ? 'border-2 border-amber-500' : 'border-2 border-primary'}`}>
            {tier === 'pro' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-amber-500 text-white">
                  <Crown className="h-3 w-3 mr-1" />
                  Current Plan
                </Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Pro
                {isInTrial && (
                  <Badge variant="outline" className="ml-2">
                    Trial ({daysRemaining} days left)
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>For professional developers</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold">$19</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {proFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              {tier === 'pro' ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button
                  className="w-full bg-amber-500 hover:bg-amber-600"
                  onClick={handleUpgrade}
                  disabled={isCreatingCheckout}
                >
                  {isCreatingCheckout ? 'Processing...' : `Start ${TRIAL_DAYS}-Day Free Trial`}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {subscription && tier === 'pro' && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Subscription</p>
                <p className="text-sm text-muted-foreground">
                  {subscription.status === 'trialing' && 'Trial period'}
                  {subscription.status === 'active' && 'Active'}
                  {subscription.cancelAtPeriodEnd && 'Cancels at period end'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Open portal for subscription management
                  // This would be handled by a separate component
                }}
              >
                Manage
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
