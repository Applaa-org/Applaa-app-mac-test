import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { useWordPressAuth } from '../../hooks/useWordPressAuth';
import { IpcClient } from '../../ipc/ipc_client';
import { useQuery } from '@tanstack/react-query';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle, UserPlus, LogIn, Loader2 } from 'lucide-react';

interface WordPressAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WordPressAuthDialog: React.FC<WordPressAuthDialogProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const {
    login,
    logout,
    isLoggingIn,
    isLoggingOut,
    error,
  } = useWordPressAuth();

  // No configuration check needed for API-based authentication

  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
  });
  const [signupForm, setSignupForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });

  // Handle WordPress login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({
        username: loginForm.username,
        password: loginForm.password,
      });
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // Handle WordPress signup
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupForm.password !== signupForm.confirmPassword) {
      // Handle password mismatch error
      return;
    }
    setIsSigningUp(true);
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.wordpressRegister({
        username: signupForm.username,
        email: signupForm.email,
        password: signupForm.password,
        first_name: signupForm.firstName,
        last_name: signupForm.lastName,
      });
      
      if (result.success) {
        // Registration successful, now log them in
        await login({
          username: signupForm.username,
          password: signupForm.password,
        });
        onOpenChange(false);
      }
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setIsSigningUp(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isSignUp ? 'Create Applaa Account' : 'Applaa Authentication'}
          </DialogTitle>
          <DialogDescription>
            {isSignUp 
              ? 'Create a new Applaa account to access the app'
              : 'Sign in with your Applaa account to access the app'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Configuration Status - Always show as configured for API-based auth */}
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Sign in with your Applaa account to access the app.
          </AlertDescription>
        </Alert>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Toggle between Login and Signup */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <Button
            type="button"
            variant={!isSignUp ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setIsSignUp(false)}
            disabled={isLoggingIn || isSigningUp}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Button>
          <Button
            type="button"
            variant={isSignUp ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setIsSignUp(true)}
            disabled={isLoggingIn || isSigningUp}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Sign Up
          </Button>
        </div>

        {/* Login Form */}
        {!isSignUp && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username or Email</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your Applaa username or email"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your Applaa password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
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

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isLoggingIn ? 'Signing In...' : 'Sign In with Applaa'}
            </Button>
          </form>
        )}

        {/* Signup Form */}
        {isSignUp && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signup-firstname">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-firstname"
                    type="text"
                    placeholder="First name"
                    value={signupForm.firstName}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-lastname">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-lastname"
                    type="text"
                    placeholder="Last name"
                    value={signupForm.lastName}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-username"
                  type="text"
                  placeholder="Choose a username"
                  value={signupForm.username}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, username: e.target.value }))}
                  className="pl-10"
                  required
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
                  placeholder="Enter your email address"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
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
                  value={signupForm.password}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
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
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={signupForm.confirmPassword}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSigningUp}
            >
              {isSigningUp ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              {isSigningUp ? 'Creating Account...' : 'Create Applaa Account'}
            </Button>
          </form>
        )}

      </DialogContent>
    </Dialog>
  );
};
