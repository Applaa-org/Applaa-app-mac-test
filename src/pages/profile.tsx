import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useCredits } from "@/hooks/useCredits";
import { useSubscriptionSync } from "@/hooks/useSubscriptionSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, User, Mail, Calendar, Crown, Globe, Loader2, RefreshCw, LogOut, Coins, TrendingUp, ExternalLink, Edit } from "lucide-react";
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
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      // Username (Display name) - prioritize username, then wordpress_display_name, then wordpress_username
      setUsername(profile.username || profile.wordpress_display_name || profile.wordpress_username || "");
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
        avatar_url: avatarUrl || undefined,
      });
      setIsEditing(false); // Exit edit mode after successful save
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (profile) {
      setUsername(profile.username || profile.wordpress_display_name || profile.wordpress_username || "");
      setAvatarUrl(profile.avatar_url || "");
    }
    setIsEditing(false);
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
            <div className="flex gap-3">
              <Button onClick={() => refetch()} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.navigate({ to: "/" })}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
            <Button 
              onClick={async () => {
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
              disabled={isRedirecting}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Crown className="h-4 w-4 mr-2" />
              {isRedirecting ? "Opening..." : "Upgrade Subscription"}
            </Button>
            {/* Subscription Management */}
            <Button 
              onClick={async () => {
                setIsRedirecting(true);
                try {
                  await IpcClient.getInstance().redirectToSubscribe();
                  showSuccess("Opening subscription page in your browser...");
                } catch (error) {
                  showError(error instanceof Error ? error.message : "Failed to open subscription page");
                } finally {
                  setIsRedirecting(false);
                }
              }}
              disabled={isRedirecting}
              className="w-full"
              variant="default"
            >
              <Crown className="h-4 w-4 mr-2" />
              {isRedirecting ? "Opening..." : "Upgrade Subscription"}
            </Button>
            {/* Logout Button */}
            {isAuthenticated && (
              <Button 
                variant="destructive" 
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </Button>
            )}
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
            <div className="flex gap-3">
              <Button onClick={() => refetch()} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.navigate({ to: "/" })}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
            <Button 
              onClick={async () => {
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
              disabled={isRedirecting}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Crown className="h-4 w-4 mr-2" />
              {isRedirecting ? "Opening..." : "Upgrade Subscription"}
            </Button>
            {/* Subscription Management */}
            <Button 
              onClick={async () => {
                setIsRedirecting(true);
                try {
                  await IpcClient.getInstance().redirectToSubscribe();
                  showSuccess("Opening subscription page in your browser...");
                } catch (error) {
                  showError(error instanceof Error ? error.message : "Failed to open subscription page");
                } finally {
                  setIsRedirecting(false);
                }
              }}
              disabled={isRedirecting}
              className="w-full"
              variant="default"
            >
              <Crown className="h-4 w-4 mr-2" />
              {isRedirecting ? "Opening..." : "Upgrade Subscription"}
            </Button>
            {/* Logout Button */}
            {isAuthenticated && (
              <Button 
                variant="destructive" 
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </Button>
            )}
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
            {!isEditing ? (
              // View Mode
              <div className="space-y-6">
                {/* Avatar (at top, image only, no label or URL) */}
                <div className="flex justify-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile Avatar"
                      className="h-24 w-24 rounded-full object-cover border-2 border-border"
                      onError={(e) => {
                        // Hide broken image on error
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                      <User className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Display Name (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Display Name
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    disabled
                    className="bg-muted"
                  />
                </div>

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

                {/* Edit Button */}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    disabled={!isAuthenticated}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              </div>
            ) : (
              // Edit Mode
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar (at top, with URL input in edit mode) */}
                <div className="space-y-2">
                  <Label htmlFor="avatarUrl" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Avatar
                  </Label>
                  <div className="flex flex-col items-center gap-4">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile Avatar"
                        className="h-24 w-24 rounded-full object-cover border-2 border-border"
                        onError={(e) => {
                          // Hide broken image on error
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                        <User className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="w-full">
                      <Input
                        id="avatarUrl"
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        URL to your profile picture
                      </p>
                    </div>
                  </div>
                </div>

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

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Display Name
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isUpdating}
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
            )}
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
            {(() => {
              const tier = (profile.subscription_tier || "free") as "free" | "pro" | "ultra" | "business";
              const isPaidTier = tier === "pro" || tier === "ultra" || tier === "business";
              const tierLabel =
                tier === "pro"
                  ? "Pro"
                  : tier === "ultra"
                  ? "Ultra"
                  : tier === "business"
                  ? "Business"
                  : "Free";
              
              const tierColors = {
                free: "from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700",
                pro: "from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30",
                ultra: "from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30",
                business: "from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30",
              };
              
              const tierIconColors = {
                free: "text-gray-600 dark:text-gray-400",
                pro: "text-purple-600 dark:text-purple-400",
                ultra: "text-blue-600 dark:text-blue-400",
                business: "text-yellow-600 dark:text-yellow-400",
              };
              
              return (
                <div className={`relative overflow-hidden rounded-xl border p-5 bg-gradient-to-br ${tierColors[tier]}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm ${tierIconColors[tier]}`}>
                        <Crown className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Subscription Tier</p>
                        <p className="text-2xl font-bold">{tierLabel}</p>
                      </div>
                    </div>
                    <div
                      className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-sm ${
                        isPaidTier
                          ? "bg-yellow-400/90 text-yellow-900 dark:bg-yellow-500 dark:text-yellow-900"
                          : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {tier.toUpperCase()}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Credit Balance */}
            {isLoadingCredits ? (
              <div className="rounded-xl border p-5 bg-muted">
                <Skeleton className="h-20 w-full" />
              </div>
            ) : balance ? (
              <div className="rounded-xl border p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Coins className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Remaining Credits</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {balance.remaining.toLocaleString()} of {balance.monthly.toLocaleString()} available
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {balance.remaining.toLocaleString()}
                    </p>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Usage</span>
                    <span>{balance.totalUsed.toLocaleString()} used</span>
                  </div>
                  <div className="w-full h-2 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((balance.remaining / balance.monthly) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {Math.round(((balance.monthly - balance.remaining) / balance.monthly) * 100)}% used
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {balance.monthly.toLocaleString()} monthly
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Total Tokens Used */}
            {profile.total_tokens_used !== null && profile.total_tokens_used !== undefined && (
              <div className="rounded-xl border p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400">T</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Tokens Used</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Lifetime token usage
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {profile.total_tokens_used.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">tokens</p>
                  </div>
                </div>
              </div>
            )}

            {/* Token Usage Breakdown by App */}
            {usageHistory && usageHistory.length > 0 && (() => {
              // Aggregate tokens by app_id
              const tokensByApp = new Map<string | null, number>();
              const appNames = new Map<string | null, string>();

              usageHistory.forEach((usage) => {
                if (usage.tokensUsed > 0) {
                  const appId = usage.appId || null;
                  const current = tokensByApp.get(appId) || 0;
                  tokensByApp.set(appId, current + usage.tokensUsed);
                  
                  // Try to get app name from metadata
                  if (appId && !appNames.has(appId) && usage.metadata?.appName) {
                    appNames.set(appId, usage.metadata.appName);
                  }
                }
              });

              // Sort by tokens (descending) and take top 10
              const sortedApps = Array.from(tokensByApp.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

              if (sortedApps.length > 0) {
                return (
                  <div className="rounded-xl border p-5 bg-card">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <Globe className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <p className="text-sm font-semibold">Token Usage by App</p>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {sortedApps.map(([appId, tokens], index) => {
                        const percentage = ((tokens / (profile.total_tokens_used || 1)) * 100);
                        return (
                          <div key={appId || 'no-app'} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-semibold text-purple-600 dark:text-purple-400">
                                  {index + 1}
                                </span>
                                <p className="font-medium truncate">
                                  {appId ? (appNames.get(appId) || `App ${appId}`) : 'Other Operations'}
                                </p>
                              </div>
                              {appId && (
                                <p className="text-xs text-muted-foreground ml-8">
                                  ID: {appId}
                                </p>
                              )}
                            </div>
                            <div className="text-right ml-4 flex-shrink-0">
                              <p className="font-semibold text-purple-600 dark:text-purple-400">
                                {tokens.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {percentage.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Credit Usage History */}
            <div className="rounded-xl border p-5 bg-card">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-semibold">Credit Usage History</p>
              </div>
              {isLoadingCredits ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <p className="ml-2 text-sm text-muted-foreground">Loading usage history...</p>
                </div>
              ) : usageHistory && usageHistory.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {usageHistory.slice(0, 10).map((usage) => (
                    <div key={usage.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border-b last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium capitalize mb-1.5">{usage.operationType.replace(/_/g, ' ')}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs text-muted-foreground">
                            {new Date(usage.createdAt).toLocaleDateString()} {new Date(usage.createdAt).toLocaleTimeString()}
                          </p>
                          {usage.appId && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                              App: {usage.metadata?.appName || usage.appId}
                            </span>
                          )}
                          {usage.chatId && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
                              Chat: {usage.chatId}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        {usage.creditsUsed > 0 && (
                          <p className="font-semibold text-blue-600 dark:text-blue-400 mb-0.5">
                            -{usage.creditsUsed}
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
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Coins className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No usage history yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Your credit and token usage will appear here</p>
                </div>
              )}
            </div>

            {/* Subscription Management */}
            <div className="p-4 bg-muted rounded-lg border space-y-3">
              <div>
                <Label className="text-sm font-medium">Subscription Management</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {(() => {
                    const tier = (profile.subscription_tier || "free") as "free" | "pro" | "ultra" | "business";
                    const isPaidTier = tier === "pro" || tier === "ultra" || tier === "business";
                    if (isPaidTier) {
                      return "Manage your subscription or sync your subscription status from the database";
                    }
                    return "Upgrade to Pro, Ultra, or Business tier or sync your subscription status from the database";
                  })()}
                </p>
              </div>
              
              <div className="flex gap-2">
                {(() => {
                  const tier = (profile.subscription_tier || "free") as "free" | "pro" | "ultra" | "business";
                  const isPaidTier = tier === "pro" || tier === "ultra" || tier === "business";
                  
                  // Only show upgrade button for free tier users
                  if (!isPaidTier) {
                    return (
                      <Button
                        onClick={async () => {
                          if (!isAuthenticated) {
                            showError("Please sign in to upgrade your subscription");
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
                        {isRedirecting ? "Opening..." : "Upgrade Subscription"}
                      </Button>
                    );
                  }
                  return null;
                })()}
                
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
                    if (!isAuthenticated) {
                      showError("Please sign in to manage credits");
                      return;
                    }

                    setIsRedirecting(true);
                    try {
                      // Redirect to subscription page where users can upgrade or manage subscription
                      const ipcClient = IpcClient.getInstance();
                      await ipcClient.redirectToSubscribe();
                      showSuccess("Opening subscription page where you can manage your credits...");
                    } catch (error: any) {
                      showError(error.message || 'Failed to open subscription page');
                    } finally {
                      setIsRedirecting(false);
                    }
                  }}
                  disabled={!isAuthenticated || isRedirecting}
                  className="w-full"
                >
                  <Coins className="h-4 w-4 mr-2" />
                  {isRedirecting ? "Opening..." : "Manage Credits"}
                </Button>
              )}
            </div>


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
