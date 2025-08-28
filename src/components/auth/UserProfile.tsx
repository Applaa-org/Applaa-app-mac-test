import React, { useState } from 'react';
import { useSupabaseAuth, useSubscriptionTier } from '../../hooks/useSupabaseAuth';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  User, 
  Mail, 
  Calendar, 
  Crown, 
  Settings, 
  LogOut,
  Eye,
  EyeOff,
  Shield,
  CheckCircle
} from 'lucide-react';

export const UserProfile: React.FC = () => {
  const {
    user,
    signOut,
    updateProfile,
    updatePassword,
    isUpdatingProfile,
    isUpdatingPassword,
    isSigningOut,
  } = useSupabaseAuth();

  const { tier, isPro } = useSubscriptionTier();

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    avatarUrl: user?.avatarUrl || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false);

  // Handle profile update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        fullName: profileForm.fullName || undefined,
        avatarUrl: profileForm.avatarUrl || undefined,
      });
      setIsEditing(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // Handle password update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return;
    }

    try {
      await updatePassword({ newPassword: passwordForm.newPassword });
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
      setPasswordUpdateSuccess(true);
      setTimeout(() => setPasswordUpdateSuccess(false), 5000);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Not signed in</p>
        </CardContent>
      </Card>
    );
  }

  const initials = user.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatarUrl} alt={user.fullName || user.email} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">{user.fullName || 'User'}</CardTitle>
                <Badge variant={isPro ? 'default' : 'secondary'}>
                  {isPro && <Crown className="w-3 h-3 mr-1" />}
                  {tier.toUpperCase()}
                </Badge>
              </div>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4" />
                {user.email}
              </CardDescription>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4" />
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {isSigningOut ? 'Signing Out...' : 'Sign Out'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  type="url"
                  value={profileForm.avatarUrl}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, avatarUrl: e.target.value }))}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isUpdatingProfile}>
                  {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setProfileForm({
                      fullName: user.fullName || '',
                      avatarUrl: user.avatarUrl || '',
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Full Name</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {user.fullName || 'Not set'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Password & Security
              </CardTitle>
              <CardDescription>
                Manage your account password and security settings
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              {isChangingPassword ? 'Cancel' : 'Change Password'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {passwordUpdateSuccess && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Password updated successfully!
              </AlertDescription>
            </Alert>
          )}

          {isChangingPassword ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <p className="text-sm text-red-500">Passwords do not match</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isUpdatingPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordForm({ newPassword: '', confirmPassword: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Password</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Last updated {new Date(user.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Subscription
          </CardTitle>
          <CardDescription>
            Your current subscription tier and benefits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={isPro ? 'default' : 'secondary'} className="text-sm">
                  {isPro && <Crown className="w-3 h-3 mr-1" />}
                  {tier.toUpperCase()} PLAN
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {isPro 
                  ? 'Enjoy unlimited cloud storage, advanced features, and priority support.'
                  : 'Upgrade to Pro for unlimited cloud storage and advanced features.'
                }
              </p>
            </div>
            {!isPro && (
              <Button variant="default" className="flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Upgrade to Pro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

