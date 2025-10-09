import React from 'react';
import { CheckCircle, Upload, X, ExternalLink, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSetAtom } from 'jotai';
import { previewModeAtom } from '@/atoms/appAtoms';

interface PreviewReadyPopupProps {
  isOpen: boolean;
  onClose: () => void;
  appName?: string;
  previewType: 'web' | 'mobile' | null;
}

export function PreviewReadyPopup({ 
  isOpen, 
  onClose, 
  appName = "Your App",
  previewType
}: PreviewReadyPopupProps) {
  const setPreviewMode = useSetAtom(previewModeAtom);

  const handleOpenPublish = () => {
    setPreviewMode("publish");
    onClose();
  };

  if (!isOpen) return null;

  const getIcon = () => {
    if (previewType === 'mobile') return <Smartphone className="h-6 w-6 text-blue-500" />;
    return <ExternalLink className="h-6 w-6 text-green-500" />;
  };

  const getMessage = () => {
    if (previewType === 'mobile') {
      return `Your ${appName} mobile preview is now live and ready. You can now publish it to make it available to users.`;
    }
    return `Your ${appName} web preview is now live and ready. You can now publish it to make it available to users.`;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-lg relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button in top-right corner */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              🎉 App is Ready to Publish!
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {getMessage()}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleOpenPublish}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Upload className="h-4 w-4" />
                Open Publish Tab
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
