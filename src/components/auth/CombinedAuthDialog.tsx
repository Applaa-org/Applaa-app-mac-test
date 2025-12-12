import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, EyeOff, Lock, Mail, User, CheckCircle, AlertCircle, Chrome } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { useWordPressAuth } from '../../hooks/useWordPressAuth';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { IpcClient } from '../../ipc/ipc_client';

type AuthTab = 'wordpress' | 'supabase';

interface CombinedAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: AuthTab;
  forceOpen?: boolean; // If true, dialog cannot be closed
}

export const CombinedAuthDialog: React.FC<CombinedAuthDialogProps> = ({
  open,
  onOpenChange,
  defaultTab = 'wordpress',
  forceOpen = false,
}) => {
  const [activeTab, setActiveTab] = useState<AuthTab>(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // WordPress auth
  const {
    login,
    isLoggingIn,
    error: wpError,
  } = useWordPressAuth();
  const [wpLoginForm, setWpLoginForm] = useState({ username: '', password: '' });
  const [wpSignupForm, setWpSignupForm] = useState({ username: '', email: '', password: '', confirmPassword: '', firstName: '', lastName: '' });
  const [isWpSigningUp, setIsWpSigningUp] = useState(false);
  const [isWpSignup, setIsWpSignup] = useState(false);

  // Supabase auth
  const {
    signIn,
    signUp,
    resetPassword,
    signInWithGoogle,
    isSigningIn,
    isSigningUp,
    isResettingPassword,
    isSigningInWithGoogle,
    error: supabaseError,
  } = useSupabaseAuth();
  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({ email: '', password: '', confirmPassword: '', fullName: '' });
  const [resetForm, setResetForm] = useState({ email: '' });
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [supabaseView, setSupabaseView] = useState<'signin' | 'signup' | 'reset'>('signin');

  // Supabase config status
  const { data: supabaseConfig } = useQuery({
    queryKey: ['supabase', 'config'],
    queryFn: async () => {
      return await IpcClient.getInstance().supabaseCheckConfiguration();
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleWpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({
        username: wpLoginForm.username,
        password: wpLoginForm.password,
      });
      onOpenChange(false);
    } catch (error) {
      // handled by hook
    }
  };

  const handleWpSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wpSignupForm.password !== wpSignupForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsWpSigningUp(true);
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.wordpressRegister({
        username: wpSignupForm.username,
        email: wpSignupForm.email,
        password: wpSignupForm.password,
        first_name: wpSignupForm.firstName,
        last_name: wpSignupForm.lastName,
      });
      if (!result.success) {
        throw new Error(result.error || 'Registration failed');
      }
      await login({ username: wpSignupForm.username, password: wpSignupForm.password });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || 'Registration failed');
    } finally {
      setIsWpSigningUp(false);
    }
  };

  const handleSupabaseSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn({
        email: signInForm.email,
        password: signInForm.password,
      });
      onOpenChange(false);
    } catch (error) {
      // handled by hook
    }
  };

  const handleSupabaseSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signUpForm.password !== signUpForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await signUp({
        email: signUpForm.email,
        password: signUpForm.password,
        fullName: signUpForm.fullName || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      // handled by hook
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword({ email: resetForm.email });
      setResetEmailSent(true);
    } catch (error) {
      // handled by hook
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (forceOpen && !newOpen) {
      // Prevent closing when forceOpen is true
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Sign in to Applaa</DialogTitle>
          <DialogDescription>
            {forceOpen 
              ? "You've reached the free limit of 3 apps. Please sign in to continue creating apps."
              : "Select a provider to continue"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AuthTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="wordpress">WordPress</TabsTrigger>
            <TabsTrigger value="supabase">Supabase</TabsTrigger>
          </TabsList>

          {wpError && activeTab === 'wordpress' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{wpError}</AlertDescription>
            </Alert>
          )}

          {supabaseError && activeTab === 'supabase' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{supabaseError}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="wordpress" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {isWpSignup ? 'Create a new WordPress account' : 'Use your WordPress credentials'}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setIsWpSignup(!isWpSignup)}>
                {isWpSignup ? 'Have an account? Sign in' : 'New here? Sign up'}
              </Button>
            </div>

            {!isWpSignup ? (
              <form onSubmit={handleWpLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wp-username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="wp-username"
                      type="text"
                      placeholder="Enter your username"
                      value={wpLoginForm.username}
                      onChange={(e) => setWpLoginForm((prev) => ({ ...prev, username: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wp-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="wp-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={wpLoginForm.password}
                      onChange={(e) => setWpLoginForm((prev) => ({ ...prev, password: e.target.value }))}
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

                <Button type="submit" className="w-full" disabled={isLoggingIn}>
                  {isLoggingIn ? 'Signing in...' : 'Sign in with WordPress'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleWpSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="wp-first-name">First name</Label>
                    <Input
                      id="wp-first-name"
                      type="text"
                      placeholder="First name"
                      value={wpSignupForm.firstName}
                      onChange={(e) => setWpSignupForm(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wp-last-name">Last name</Label>
                    <Input
                      id="wp-last-name"
                      type="text"
                      placeholder="Last name"
                      value={wpSignupForm.lastName}
                      onChange={(e) => setWpSignupForm(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wp-signup-username">Username</Label>
                  <Input
                    id="wp-signup-username"
                    type="text"
                    placeholder="Choose a username"
                    value={wpSignupForm.username}
                    onChange={(e) => setWpSignupForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wp-signup-email">Email</Label>
                  <Input
                    id="wp-signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={wpSignupForm.email}
                    onChange={(e) => setWpSignupForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wp-signup-password">Password</Label>
                  <Input
                    id="wp-signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={wpSignupForm.password}
                    onChange={(e) => setWpSignupForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wp-signup-confirm-password">Confirm password</Label>
                  <Input
                    id="wp-signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={wpSignupForm.confirmPassword}
                    onChange={(e) => setWpSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 mt-[-36px] px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>

                <Button type="submit" className="w-full" disabled={isWpSigningUp}>
                  {isWpSigningUp ? 'Creating account...' : 'Create WordPress account'}
                </Button>
              </form>
            )}
          </TabsContent>

          <TabsContent value="supabase" className="space-y-4">
            {supabaseConfig?.isConfigured ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Supabase is configured. You can sign in or create an account.</AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Authentication is not configured. Please set AUTH_SUPABASE_URL and AUTH_SUPABASE_ANON_KEY in your .env file.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={supabaseView === 'signin' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSupabaseView('signin')}
                >
                  Sign in
                </Button>
                <Button
                  type="button"
                  variant={supabaseView === 'signup' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSupabaseView('signup')}
                >
                  Create account
                </Button>
                <Button
                  type="button"
                  variant={supabaseView === 'reset' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSupabaseView('reset')}
                >
                  Reset password
                </Button>
              </div>

              {supabaseView === 'signin' && (
                <form onSubmit={handleSupabaseSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="supabase-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="supabase-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signInForm.email}
                        onChange={(e) => setSignInForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supabase-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="supabase-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={signInForm.password}
                        onChange={(e) => setSignInForm((prev) => ({ ...prev, password: e.target.value }))}
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
                    {isSigningIn ? 'Signing in...' : 'Sign in with Supabase'}
                  </Button>
                </form>
              )}

              {supabaseView === 'signup' && (
                <form onSubmit={handleSupabaseSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="supabase-signup-email">Email</Label>
                    <Input
                      id="supabase-signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signUpForm.email}
                      onChange={(e) => setSignUpForm((prev) => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supabase-signup-fullname">Full name</Label>
                    <Input
                      id="supabase-signup-fullname"
                      type="text"
                      placeholder="Enter your name"
                      value={signUpForm.fullName}
                      onChange={(e) => setSignUpForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supabase-signup-password">Password</Label>
                    <Input
                      id="supabase-signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      value={signUpForm.password}
                      onChange={(e) => setSignUpForm((prev) => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supabase-signup-confirm-password">Confirm password</Label>
                    <div className="relative">
                      <Input
                        id="supabase-signup-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm password"
                        value={signUpForm.confirmPassword}
                        onChange={(e) => setSignUpForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
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
                  </div>

                  <Button type="submit" className="w-full" disabled={isSigningUp}>
                    {isSigningUp ? 'Creating account...' : 'Create account'}
                  </Button>
                </form>
              )}

              {supabaseView === 'reset' && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="supabase-reset-email">Reset password</Label>
                    <Input
                      id="supabase-reset-email"
                      type="email"
                      placeholder="Enter your email"
                      value={resetForm.email}
                      onChange={(e) => setResetForm((prev) => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isResettingPassword}>
                    {isResettingPassword ? 'Sending reset link...' : 'Send reset link'}
                  </Button>
                  {resetEmailSent && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>Reset email sent. Check your inbox.</AlertDescription>
                    </Alert>
                  )}
                </form>
              )}

              <Button
                variant="outline"
                className="w-full"
                type="button"
                disabled={isSigningInWithGoogle}
                onClick={async () => {
                  try {
                    await signInWithGoogle();
                  } catch (error) {
                    // handled by hook
                  }
                }}
              >
                {isSigningInWithGoogle ? 'Opening Google...' : (
                  <span className="flex items-center gap-2">
                    <Chrome className="h-4 w-4" />
                    Sign in with Google
                  </span>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

