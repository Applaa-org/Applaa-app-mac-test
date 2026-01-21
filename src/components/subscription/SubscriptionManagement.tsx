import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Calendar, CreditCard, AlertCircle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useTrialStatus } from '@/hooks/useSubscription';
import { SubscriptionDialog } from './SubscriptionDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function SubscriptionManagement() {
  const {
    subscription,
    isPro,
    tier,
    createPortal,
    cancelSubscription,
    resumeSubscription,
    isCanceling,
    isResuming,
    isCreatingPortal,
  } = useSubscription();
  const { isInTrial, daysRemaining } = useTrialStatus();
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  const handleManageSubscription = async () => {
    try {
      await createPortal(window.location.href);
    } catch (error) {
      console.error('Failed to open portal:', error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    
    try {
      await cancelSubscription({
        subscriptionId: subscription.id,
        cancelAtPeriodEnd: true,
      });
      setShowCancelDialog(false);
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    }
  };

  const handleResumeSubscription = async () => {
    if (!subscription) return;
    
    try {
      await resumeSubscription(subscription.id);
      setShowResumeDialog(false);
    } catch (error) {
      console.error('Failed to resume subscription:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Subscription</h2>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Current Plan
              </CardTitle>
              <CardDescription>
                {tier === 'pro' ? 'Applaa Pro' : 'Free Plan'}
              </CardDescription>
            </div>
            <Badge variant={tier === 'pro' ? 'default' : 'secondary'} className="text-lg px-4 py-2">
              {tier === 'pro' ? 'Pro' : 'Free'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tier === 'free' ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Upgrade to Pro to unlock unlimited apps, advanced AI models, and more.
              </p>
              <Button
                onClick={() => setShowSubscriptionDialog(true)}
                className="bg-amber-500 hover:bg-amber-600"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {isInTrial && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Free Trial Active
                    </p>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {daysRemaining} days remaining in your trial
                  </p>
                </div>
              )}

              {subscription && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge
                      variant={
                        subscription.status === 'active' || subscription.status === 'trialing'
                          ? 'default'
                          : 'destructive'
                      }
                    >
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium">{subscription.planName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {subscription.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'}
                    </span>
                    <span className="font-medium">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={isCreatingPortal}
                  className="flex-1"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {isCreatingPortal ? 'Opening...' : 'Manage Billing'}
                </Button>
                {subscription?.cancelAtPeriodEnd ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowResumeDialog(true)}
                    disabled={isResuming}
                    className="flex-1"
                  >
                    {isResuming ? 'Resuming...' : 'Resume Subscription'}
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={isCanceling}
                    className="flex-1"
                  >
                    {isCanceling ? 'Canceling...' : 'Cancel Subscription'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Dialog */}
      <SubscriptionDialog
        open={showSubscriptionDialog}
        onOpenChange={setShowSubscriptionDialog}
      />

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until the end of the current billing period.
              You'll continue to have access to Pro features until{' '}
              {subscription && new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
              After that, your account will be downgraded to the Free plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSubscription}>
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resume Dialog */}
      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will continue after the current billing period ends.
              You'll be charged the regular monthly fee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Canceled</AlertDialogCancel>
            <AlertDialogAction onClick={handleResumeSubscription}>
              Resume Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
