import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'signin' | 'signup' | 'setup';
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ 
  open, 
  onOpenChange, 
  defaultTab = 'signin' 
}) => {
  const {
    signIn,
    signUp,
    resetPassword,
    saveCredentials,
    isSigningIn,
    isSigningUp,
    isResettingPassword,
    isSavingCredentials,
    error,
  } = useSupabaseAuth();

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [signInForm, setSignInForm] = useState({
    email: '',
    password: '',
  });

  const [signUpForm, setSignUpForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });

  const [resetForm, setResetForm] = useState({
    email: '',
  });

  const [setupForm, setSetupForm] = useState({
    url: '',
    anonKey: '',
    serviceRoleKey: '',
  });

  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Handle sign in
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn({
        email: signInForm.email,
        password: signInForm.password,
      });
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // Handle sign up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpForm.password !== signUpForm.confirmPassword) {
      return; // Should show error
    }

    try {
      await signUp({
        email: signUpForm.email,
        password: signUpForm.password,
        fullName: signUpForm.fullName || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword({ email: resetForm.email });
      setResetEmailSent(true);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // Handle setup
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveCredentials({
        url: setupForm.url,
        anonKey: setupForm.anonKey,
        serviceRoleKey: setupForm.serviceRoleKey || undefined,
      });
      setActiveTab('signin');
    } catch (error) {
      // Error is handled by the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Applaa Cloud Authentication</DialogTitle>
          <DialogDescription>
            Sign in to sync your apps and settings across devices
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="setup">Setup</TabsTrigger>
          </TabsList>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Sign In Tab */}
          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signInForm.email}
                    onChange={(e) => setSignInForm(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={signInForm.password}
                    onChange={(e) => setSignInForm(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSigningIn}>
                {isSigningIn ? 'Signing In...' : 'Sign In'}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setActiveTab('reset')}
                  className="text-sm"
                >
                  Forgot your password?
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Sign Up Tab */}
          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name (Optional)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={signUpForm.fullName}
                    onChange={(e) => setSignUpForm(prev => ({ ...prev, fullName: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signUpForm.email}
                    onChange={(e) => setSignUpForm(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={signUpForm.password}
                    onChange={(e) => setSignUpForm(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={signUpForm.confirmPassword}
                    onChange={(e) => setSignUpForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="pl-10 pr-10"
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
                {signUpForm.password && signUpForm.confirmPassword && signUpForm.password !== signUpForm.confirmPassword && (
                  <p className="text-sm text-red-500">Passwords do not match</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSigningUp || signUpForm.password !== signUpForm.confirmPassword}
              >
                {isSigningUp ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </TabsContent>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Supabase Configuration</CardTitle>
                <CardDescription>
                  Configure your Supabase project credentials to enable cloud features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSetup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="setup-url">Supabase URL</Label>
                    <Input
                      id="setup-url"
                      type="url"
                      placeholder="https://your-project-id.supabase.co"
                      value={setupForm.url}
                      onChange={(e) => setSetupForm(prev => ({ ...prev, url: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="setup-anon-key">Anonymous Key</Label>
                    <Input
                      id="setup-anon-key"
                      type="password"
                      placeholder="Your Supabase anonymous key"
                      value={setupForm.anonKey}
                      onChange={(e) => setSetupForm(prev => ({ ...prev, anonKey: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="setup-service-key">Service Role Key (Optional)</Label>
                    <Input
                      id="setup-service-key"
                      type="password"
                      placeholder="Your Supabase service role key"
                      value={setupForm.serviceRoleKey}
                      onChange={(e) => setSetupForm(prev => ({ ...prev, serviceRoleKey: e.target.value }))}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSavingCredentials}>
                    {isSavingCredentials ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reset Password Tab */}
          <TabsContent value="reset" className="space-y-4">
            {resetEmailSent ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Password reset email sent! Check your inbox and follow the instructions.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your email"
                      value={resetForm.email}
                      onChange={(e) => setResetForm(prev => ({ ...prev, email: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isResettingPassword}>
                  {isResettingPassword ? 'Sending...' : 'Send Reset Email'}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setActiveTab('signin')}
                    className="text-sm"
                  >
                    Back to Sign In
                  </Button>
                </div>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

