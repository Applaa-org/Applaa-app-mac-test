import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, BookOpen, ExternalLink } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

interface YouTubeSetupPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const YouTubeSetupPopup: React.FC<YouTubeSetupPopupProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 [YouTubeSetupPopup] isOpen changed:', isOpen);
  }, [isOpen]);

  const handleGoToDocs = () => {
    navigate({ to: '/docs' });
    onClose();
  };

  const handleOpenYouTube = () => {
    window.open('https://youtu.be/XzfIDM3OIBU', '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">Welcome to Applaa! 🎉</DialogTitle>
              <DialogDescription className="text-base mt-2">
                Get started with our comprehensive setup guide and documentation.
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center space-y-6">
            <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-lg p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Applaa Setup Guide</h3>
              <p className="text-lg mb-6">
                Follow our step-by-step documentation to install, configure, and start using Applaa effectively.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleGoToDocs}
                  className="bg-white text-green-600 hover:bg-gray-100 font-semibold px-6 py-3"
                >
                  <BookOpen className="w-5 h-5 mr-2" />
                  Go to Documentation
                </Button>
                <Button
                  onClick={handleOpenYouTube}
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-green-600 font-semibold px-6 py-3"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Watch Video
                </Button>
              </div>
            </div>
            
            <div className="text-left space-y-4">
              <h4 className="text-lg font-semibold">What you'll find in the docs:</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• Step-by-step installation instructions</li>
                <li>• Creating your first web application</li>
                <li>• Setting up mobile apps with Expo</li>
                <li>• Understanding different modes and features</li>
                <li>• Troubleshooting and FAQ</li>
                <li>• Video tutorial at the top of the docs</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              onClick={onClose}
              variant="outline"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleGoToDocs}
              className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Go to Docs
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
