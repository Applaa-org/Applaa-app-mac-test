import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, EyeOff, Lock, Mail, User, CheckCircle, AlertCircle, Chrome, LogIn, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { useWordPressAuth } from '../../hooks/useWordPressAuth';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { IpcClient } from '../../ipc/ipc_client';

interface CombinedAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forceOpen?: boolean; // If true, dialog cannot be closed
}

export const CombinedAuthDialog: React.FC<CombinedAuthDialogProps> = ({
  open,
  onOpenChange,
  forceOpen = false,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // WordPress auth
  const {
    login: wpLogin,
    isLoggingIn: isWpLoggingIn,
  } = useWordPressAuth();

  // Supabase auth
  const {
    signIn: supabaseSignIn,
    signUp: supabaseSignUp,
    signInWithGoogle,
    isSigningIn: isSupabaseSigningIn,
    isSigningUp: isSupabaseSigningUp,
    isSigningInWithGoogle,
  } = useSupabaseAuth();

  // Supabase config status
  const { data: supabaseConfig } = useQuery({
    queryKey: ['supabase', 'config'],
    queryFn: async () => {
      return await IpcClient.getInstance().supabaseCheckConfiguration();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Unified form state
  const [signInForm, setSignInForm] = useState({
    emailOrUsername: '',
    password: '',
  });

  const [signUpForm, setSignUpForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });

  // Unified Sign In - tries both Supabase and WordPress
  const handleUnifiedSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError(null);

    const { emailOrUsername, password } = signInForm;

    try {
      // Try Supabase first (uses email)
      if (supabaseConfig?.isConfigured && emailOrUsername.includes('@')) {
        try {
          await supabaseSignIn({
            email: emailOrUsername,
            password: password,
          });
          toast.success('Signed in successfully');
          onOpenChange(false);
          return;
        } catch (supabaseError: any) {
          // If Supabase fails, try WordPress
          console.log('Supabase sign in failed, trying WordPress:', supabaseError.message);
        }
      }

      // Try WordPress (uses username or email)
      try {
        await wpLogin({
          username: emailOrUsername,
          password: password,
        });
        toast.success('Signed in successfully');
        onOpenChange(false);
      } catch (wpError: any) {
        // Both failed
        const errorMessage = wpError?.message || 'Invalid credentials. Please check your email/username and password.';
        setAuthError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Sign in failed. Please try again.';
      setAuthError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Unified Sign Up - creates accounts in BOTH Supabase and WordPress
  const handleUnifiedSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpForm.password !== signUpForm.confirmPassword) {
      setAuthError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    const { email, username, password, firstName, lastName } = signUpForm;
    const finalUsername = username || email.split('@')[0]; // Use email prefix if no username
    const finalFirstName = firstName || '';
    const finalLastName = lastName || '';
    const fullName = [finalFirstName, finalLastName].filter(Boolean).join(' ') || email; // Combine first + last, fallback to email

    let supabaseSuccess = false;
    let wordpressSuccess = false;
    const errors: string[] = [];

    // Try Supabase sign up
    if (supabaseConfig?.isConfigured) {
      try {
        await supabaseSignUp({
          email: email,
          password: password,
          fullName: fullName,
        });
        supabaseSuccess = true;
        console.log('✅ Supabase sign up successful');
      } catch (supabaseError: any) {
        const errorMsg = supabaseError?.message || 'Supabase sign up failed';
        errors.push(errorMsg);
        console.log('❌ Supabase sign up failed:', errorMsg);
        // Continue to try WordPress
      }
    } else {
      console.log('⚠️ Supabase not configured, skipping Supabase sign up');
    }

    // Try WordPress sign up
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.wordpressRegister({
        username: finalUsername,
        email: email,
        password: password,
        first_name: finalFirstName,
        last_name: finalLastName,
      });

      if (result.success) {
        wordpressSuccess = true;
        console.log('✅ WordPress sign up successful');
      } else {
        errors.push(result.error || 'WordPress sign up failed');
      }
    } catch (wpError: any) {
      const errorMsg = wpError?.message || 'WordPress sign up failed';
      errors.push(errorMsg);
      console.log('❌ WordPress sign up failed:', errorMsg);
    }

    // Determine result
    if (supabaseSuccess || wordpressSuccess) {
      // At least one succeeded
      const successMsg = supabaseSuccess && wordpressSuccess
        ? 'Account created successfully in both systems'
        : supabaseSuccess
        ? 'Account created in Supabase' + (errors.length > 0 ? ` (WordPress: ${errors[0]})` : '')
        : 'Account created in WordPress' + (errors.length > 0 ? ` (Supabase: ${errors[0]})` : '');
      
      toast.success(successMsg);

      // Try to sign them in (prefer WordPress if both available, or whichever succeeded)
      try {
        if (wordpressSuccess) {
          await wpLogin({
            username: finalUsername,
            password: password,
          });
        } else if (supabaseSuccess) {
          await supabaseSignIn({
            email: email,
            password: password,
          });
        }
      } catch (loginError) {
        console.log('Auto-login failed, but account was created:', loginError);
      }

      onOpenChange(false);
    } else {
      // Both failed
      const errorMessage = errors.length > 0
        ? errors.join('; ')
        : 'Account creation failed. Please try again.';
      setAuthError(errorMessage);
      toast.error(errorMessage);
    }

    setIsAuthenticating(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (forceOpen && !newOpen) {
      return; // Prevent closing when forceOpen is true
    }
    onOpenChange(newOpen);
  };

  const isLoading = isAuthenticating || isWpLoggingIn || isSupabaseSigningIn || isSupabaseSigningUp;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isSignUp ? 'Create Applaa Account' : 'Sign in to Applaa'}
          </DialogTitle>
          <DialogDescription>
            {forceOpen 
              ? "You've reached the free limit of 3 apps. Please sign in to continue creating apps."
              : isSignUp
              ? 'Create your account to get started'
              : 'Sign in to access your apps and settings'}
          </DialogDescription>
        </DialogHeader>

        {/* Toggle between Sign In and Sign Up */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <Button
            type="button"
            variant={!isSignUp ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => {
              setIsSignUp(false);
              setAuthError(null);
            }}
            disabled={isLoading}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Button>
          <Button
            type="button"
            variant={isSignUp ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => {
              setIsSignUp(true);
              setAuthError(null);
            }}
            disabled={isLoading}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Sign Up
          </Button>
        </div>

        {/* Error Display */}
        {authError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

        {/* Sign In Form */}
        {!isSignUp && (
          <form onSubmit={handleUnifiedSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email-username">Email or Username</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signin-email-username"
                  type="text"
                  placeholder="Enter your email or username"
                  value={signInForm.emailOrUsername}
                  onChange={(e) => setSignInForm((prev) => ({ ...prev, emailOrUsername: e.target.value }))}
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            {/* Google Sign In (only for Supabase) */}
            {supabaseConfig?.isConfigured && (
              <Button
                variant="outline"
                className="w-full"
                type="button"
                disabled={isSigningInWithGoogle}
                onClick={async () => {
                  try {
                    await signInWithGoogle();
                    onOpenChange(false);
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
            )}
          </form>
        )}

        {/* Sign Up Form */}
        {isSignUp && (
          <form onSubmit={handleUnifiedSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  value={signUpForm.email}
                  onChange={(e) => setSignUpForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-username">Username (optional)</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-username"
                  type="text"
                  placeholder="Choose a username (defaults to email)"
                  value={signUpForm.username}
                  onChange={(e) => setSignUpForm((prev) => ({ ...prev, username: e.target.value }))}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">If not provided, username will be derived from your email</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="signup-firstname">First Name (optional)</Label>
                <Input
                  id="signup-firstname"
                  type="text"
                  placeholder="First name"
                  value={signUpForm.firstName}
                  onChange={(e) => setSignUpForm((prev) => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-lastname">Last Name (optional)</Label>
                <Input
                  id="signup-lastname"
                  type="text"
                  placeholder="Last name"
                  value={signUpForm.lastName}
                  onChange={(e) => setSignUpForm((prev) => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={signUpForm.password}
                  onChange={(e) => setSignUpForm((prev) => ({ ...prev, password: e.target.value }))}
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
              <Label htmlFor="signup-confirm-password">Confirm Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={signUpForm.confirmPassword}
                  onChange={(e) => setSignUpForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
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
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By creating an account, you'll be registered in both Supabase and WordPress systems
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
