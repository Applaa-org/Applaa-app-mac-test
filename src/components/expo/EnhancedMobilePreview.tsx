/**
 * Enhanced Mobile Preview Component - Temporarily Simplified
 * 
 * This component has been simplified to prevent build issues
 * while we focus on core app functionality
 */

import React from 'react';
import { Card } from '@/components/ui/card';

interface EnhancedMobilePreviewProps {
  appId?: number;
  className?: string;
}

export function EnhancedMobilePreview({ appId, className = '' }: EnhancedMobilePreviewProps) {
  return (
    <div className={`flex h-full ${className}`}>
      <Card className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-2xl text-white">📱</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Mobile Preview
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm">
            Enhanced mobile preview is temporarily disabled while we focus on core functionality.
            {appId && ` App ID: ${appId}`}
          </p>
          <div className="text-sm text-gray-500">
            Coming back soon with improved reliability! 🚀
          </div>
        </div>
      </Card>
    </div>
  );
}

export default EnhancedMobilePreview;

