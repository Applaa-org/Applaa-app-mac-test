import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useCredits } from "@/hooks/useCredits";
import { useSubscriptionSync } from "@/hooks/useSubscriptionSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, User, Mail, Calendar, Crown, Globe, Loader2, RefreshCw, LogOut, Coins, TrendingUp, ExternalLink } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { showError, showSuccess } from "@/lib/toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useWordPressAuth } from "@/hooks/useWordPressAuth";
import { IpcClient } from "@/ipc/ipc_client";

export default function ProfilePage() {
  const router = useRouter();
  const { profile, isLoading, error, refetch, updateProfile, isUpdating } = useProfile();
  const { balance, usageHistory, isLoading: isLoadingCredits, refetch: refetchCredits } = useCredits();
  const { syncSubscription, isSyncing } = useSubscriptionSync();
  const { isAuthenticated: isSupabaseAuthenticated, signOut: supabaseSignOut, isSigningOut: isSupabaseSigningOut } = useSupabaseAuth();
  const { isAuthenticated: isWordPressAuthenticated, logout: wordPressLogout, isLoggingOut: isWordPressLoggingOut } = useWordPressAuth();
  const isAuthenticated = isSupabaseAuthenticated || isWordPressAuthenticated;
  const isLoggingOut = isSupabaseSigningOut || isWordPressLoggingOut;
  const [isRedirecting, setIsRedirecting] = useState(false);

  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      // Username - prioritize username, then wordpress_display_name, then wordpress_username
      setUsername(profile.username || profile.wordpress_display_name || profile.wordpress_username || "");
      
      // Priority 1: Use first_name and last_name if they exist in database
      if (profile.first_name !== null && profile.first_name !== undefined) {
        setFirstName(profile.first_name);
      } else {
        setFirstName("");
      }
      
      if (profile.last_name !== null && profile.last_name !== undefined) {
        setLastName(profile.last_name);
      } else {
        setLastName("");
      }
      
      // Only use full_name as fallback if first_name and last_name are both empty/null
      // AND full_name contains multiple words (likely a real name, not a username)
      if (!profile.first_name && !profile.last_name && profile.full_name) {
        const nameParts = profile.full_name.trim().split(/\s+/);
        // Only split if it has multiple words (likely a real name)
        // Single word might be a username, so don't use it
        if (nameParts.length > 1) {
          setFirstName(nameParts[0] || "");
          setLastName(nameParts.slice(1).join(" ") || "");
        } else {
          // Single word - might be username, leave first/last name empty
          setFirstName("");
          setLastName("");
        }
      }
      
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      showError("Please sign in to update your profile");
      return;
    }

    try {
      await updateProfile({
        username: username || undefined,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        avatar_url: avatarUrl || undefined,
      });
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleLogout = async () => {
    try {
      if (isSupabaseAuthenticated) {
        await supabaseSignOut();
        showSuccess("Signed out successfully");
      } else if (isWordPressAuthenticated) {
        await wordPressLogout();
        showSuccess("Signed out successfully");
      }
      // Navigate to home after logout
      router.navigate({ to: "/" });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to sign out");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-24" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Profile</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "Failed to load profile. Please try again."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button variant="outline" onClick={() => router.navigate({ to: "/" })}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile && !isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>
              Unable to load your profile. Please sign in to view your profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button variant="outline" onClick={() => router.navigate({ to: "/" })}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.navigate({ to: "/" })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-muted-foreground">Manage your account information</p>
          </div>
        </div>

        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your profile details. Changes will be saved to your Supabase account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                />
                <p className="text-xs text-muted-foreground">
                  Your unique username identifier
                </p>
              </div>

              {/* First Name and Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              {/* Avatar URL */}
              <div className="space-y-2">
                <Label htmlFor="avatarUrl" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Avatar URL
                </Label>
                <Input
                  id="avatarUrl"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  URL to your profile picture
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.navigate({ to: "/" })}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating || !isAuthenticated}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Account Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>
              Your account information and subscription status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subscription Tier */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Subscription Tier</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.subscription_tier === "pro" ? "Pro" : "Free"}
                  </p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                profile.subscription_tier === "pro"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
              }`}>
                {profile.subscription_tier === "pro" ? "PRO" : "FREE"}
              </div>
            </div>

            {/* Credit Balance */}
            {isLoadingCredits ? (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <Skeleton className="h-12 w-48" />
                <Skeleton className="h-8 w-24" />
              </div>
            ) : balance ? (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Coins className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium">Remaining Credits</p>
                    <p className="text-sm text-muted-foreground">
                      {balance.remaining.toLocaleString()} of {balance.monthly.toLocaleString()} credits
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {balance.remaining.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {balance.totalUsed.toLocaleString()} used total
                  </p>
                </div>
              </div>
            ) : null}

            {/* Total Tokens Used */}
            {profile.total_tokens_used !== null && profile.total_tokens_used !== undefined && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400">T</span>
                  </div>
                  <div>
                    <p className="font-medium">Total Tokens Used</p>
                    <p className="text-sm text-muted-foreground">
                      Lifetime token usage across all operations
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {profile.total_tokens_used.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">tokens</p>
                </div>
              </div>
            )}

            {/* Credit Usage History */}
            {usageHistory && usageHistory.length > 0 && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Recent Usage</p>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {usageHistory.slice(0, 5).map((usage) => (
                    <div key={usage.id} className="flex items-center justify-between text-sm pb-2 border-b last:border-0">
                      <div>
                        <p className="font-medium capitalize">{usage.operationType.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(usage.createdAt).toLocaleDateString()} {new Date(usage.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        {usage.creditsUsed > 0 && (
                          <p className="font-semibold text-blue-600 dark:text-blue-400">
                            -{usage.creditsUsed} credits
                          </p>
                        )}
                        {usage.tokensUsed > 0 && (
                          <p className="text-xs font-medium text-purple-600 dark:text-purple-400">
                            {usage.tokensUsed.toLocaleString()} tokens
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subscription Management */}
            <div className="p-4 bg-muted rounded-lg border space-y-3">
              <div>
                <Label className="text-sm font-medium">Subscription Management</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Upgrade to Pro or sync your subscription status from the database
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    if (!isAuthenticated) {
                      showError("Please sign in to upgrade to Pro");
                      return;
                    }

                    setIsRedirecting(true);
                    try {
                      const ipcClient = IpcClient.getInstance();
                      await ipcClient.redirectToSubscribe();
                      showSuccess("Opening subscription page in your browser...");
                    } catch (error) {
                      showError(
                        error instanceof Error ? error.message : "Failed to open subscription page"
                      );
                    } finally {
                      setIsRedirecting(false);
                    }
                  }}
                  disabled={!isAuthenticated || isRedirecting}
                  className="flex-1"
                  variant="default"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {isRedirecting ? "Opening..." : "Upgrade to Pro"}
                </Button>
                
                <Button
                  onClick={async () => {
                    if (!isAuthenticated) {
                      showError("Please sign in to sync subscription");
                      return;
                    }

                    try {
                      await syncSubscription();
                      refetch(); // Refresh profile after sync
                    } catch (error) {
                      // Error is already handled in the hook
                    }
                  }}
                  disabled={!isAuthenticated || isSyncing}
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing..." : "Sync Subscription"}
                </Button>
              </div>

              {!isAuthenticated && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Please sign in to manage your subscription
                </p>
              )}

              {/* Top-up Credits Button (Pro+ only) */}
              {(profile.subscription_tier === 'pro' || profile.subscription_tier === 'ultra' || profile.subscription_tier === 'business') && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      // TODO: Implement actual top-up flow with Stripe
                      showError('Credit top-up not yet implemented. Please upgrade your subscription for more credits.');
                    } catch (error: any) {
                      showError(error.message || 'Failed to top up credits');
                    }
                  }}
                  className="w-full"
                >
                  <Coins className="h-4 w-4 mr-2" />
                  Top Up Credits
                </Button>
              )}
            </div>

            {/* WordPress Info (if applicable) */}
            {profile.wordpress_display_name && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Display Name</p>
                <p className="text-sm text-muted-foreground">
                  {profile.wordpress_display_name}
                </p>
                {profile.wordpress_username && (
                  <p className="text-xs text-muted-foreground mt-1">
                    WordPress Username: {profile.wordpress_username}
                  </p>
                )}
              </div>
            )}

            {/* Timestamps */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Account created: {formatDate(profile.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Last updated: {formatDate(profile.updated_at)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logout Button */}
        {isAuthenticated && (
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>
                Sign out of your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing out...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Authentication Status */}
        {!isAuthenticated && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <CardHeader>
              <CardTitle className="text-amber-800 dark:text-amber-200">
                Sign In Required
              </CardTitle>
              <CardDescription className="text-amber-700 dark:text-amber-300">
                Please sign in to update your profile information.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
