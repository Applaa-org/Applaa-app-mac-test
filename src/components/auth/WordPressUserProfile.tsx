import React from 'react';
import { useWordPressAuth } from '../../hooks/useWordPressAuth';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  User, 
  Mail, 
  Crown, 
  LogOut, 
  Calendar,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

interface WordPressUserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WordPressUserProfile: React.FC<WordPressUserProfileProps> = ({ isOpen, onClose }) => {
  const { 
    user, 
    logout, 
    isLoggingOut 
  } = useWordPressAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const getRoleBadgeColor = (roles: string[]) => {
    if (roles.includes('administrator')) {
      return 'bg-gradient-to-r from-red-500 to-pink-500 text-white';
    }
    if (roles.includes('editor')) {
      return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
    }
    if (roles.includes('author')) {
      return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getRoleDisplayName = (roles: string[]) => {
    if (roles.includes('administrator')) return 'Administrator';
    if (roles.includes('editor')) return 'Editor';
    if (roles.includes('author')) return 'Author';
    if (roles.includes('contributor')) return 'Contributor';
    return 'Subscriber';
  };

  if (!isOpen || !user) return null;

  return (
    <div className="relative">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Profile Dropdown */}
      <div className="absolute bottom-16 left-2 z-50 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-white/20">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">
                {user.display_name || user.username || 'User'}
              </h3>
              <p className="text-xs text-blue-100 truncate">
                @{user.username}
              </p>
            </div>
            <Badge className={getRoleBadgeColor(user.roles || [])}>
              <Shield className="h-3 w-3 mr-1" />
              {getRoleDisplayName(user.roles || [])}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Profile Info */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Mail className="h-4 w-4" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <User className="h-4 w-4" />
              <span>ID: {user.id}</span>
            </div>
            {user.avatar_url && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <img 
                  src={user.avatar_url} 
                  alt="Avatar" 
                  className="h-4 w-4 rounded-full"
                />
                <span>Avatar available</span>
              </div>
            )}
          </div>

          {/* Capabilities */}
          {user.capabilities && user.capabilities.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Capabilities
              </h4>
              <div className="flex flex-wrap gap-1">
                {user.capabilities.slice(0, 5).map((capability, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {capability}
                  </Badge>
                ))}
                {user.capabilities.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{user.capabilities.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
