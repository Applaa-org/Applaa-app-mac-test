import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Sparkles, 
  Brain, 
  Search, 
  FileText, 
  Zap, 
  Target,
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { IpcClient } from '../../ipc/ipc_client';

interface AIFeaturesInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (installed: boolean) => void;
}

export function AIFeaturesInstallDialog({ 
  open, 
  onOpenChange, 
  onComplete 
}: AIFeaturesInstallDialogProps) {
  const [isInstalling, setIsInstalling] = useState(false);
  const [installationStatus, setInstallationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const aiFeatures = [
    {
      icon: <Brain className="w-5 h-5 text-purple-500" />,
      title: "Smart Context Suggestions",
      description: "AI analyzes your codebase and automatically suggests relevant files for your chat context",
      badge: "AI-Powered"
    },
    {
      icon: <Search className="w-5 h-5 text-blue-500" />,
      title: "Semantic Code Search",
      description: "Find code by meaning, not just keywords. Search for 'authentication logic' and find relevant auth code",
      badge: "Semantic"
    },
    {
      icon: <Target className="w-5 h-5 text-green-500" />,
      title: "Cross-App Intelligence",
      description: "Automatically discover related code patterns and solutions across all your Applaa projects",
      badge: "Cross-Project"
    },
    {
      icon: <FileText className="w-5 h-5 text-orange-500" />,
      title: "Intelligent File Relevance",
      description: "AI understands which files are most relevant to your current task and prioritizes them",
      badge: "Smart Ranking"
    },
    {
      icon: <Zap className="w-5 h-5 text-yellow-500" />,
      title: "Context Loss Prevention",
      description: "Never lose important context again. AI maintains comprehensive understanding across long conversations",
      badge: "Memory Enhanced"
    }
  ];

  const handleInstall = async () => {
    setIsInstalling(true);
    setInstallationStatus('idle');
    setErrorMessage('');

    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.installAITransformers();
      
      if (result.success) {
        setInstallationStatus('success');
        
        // Double-check that installation was successful
        const verifyResult = await ipcClient.checkAITransformersInstalled();
        
        if (verifyResult.installed) {
          setTimeout(() => {
            onComplete(true);
            onOpenChange(false);
          }, 2000);
        } else {
          setInstallationStatus('error');
          setErrorMessage('Installation completed but package verification failed');
        }
      } else {
        setInstallationStatus('error');
        setErrorMessage(result.message || 'Installation failed');
      }
    } catch (error) {
      setInstallationStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Installation failed');
    } finally {
      setIsInstalling(false);
    }
  };

  const handleSkip = () => {
    onComplete(false);
    onOpenChange(false);
  };

  const renderInstallationStatus = () => {
    if (installationStatus === 'success') {
      return (
        <div className="flex items-center gap-2 text-green-600 font-medium">
          <CheckCircle className="w-5 h-5" />
          Installation completed! AI features are now available.
        </div>
      );
    }

    if (installationStatus === 'error') {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <div>
            <div className="font-medium">Installation failed</div>
            <div className="text-sm text-gray-600">{errorMessage}</div>
          </div>
        </div>
      );
    }

    if (isInstalling) {
      return (
        <div className="flex items-center gap-2 text-blue-600 font-medium">
          <Loader2 className="w-5 h-5 animate-spin" />
          Installing AI features... This may take a moment.
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                Unlock AI-Powered Context Features
              </DialogTitle>
              <DialogDescription className="text-base mt-1">
                Transform your coding experience with intelligent context management
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              What You'll Get
            </h3>
            <div className="space-y-3">
              {aiFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  {feature.icon}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{feature.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {feature.badge}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold mb-2">What happens when you install?</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Downloads the AI transformers package (~100MB)</li>
              <li>• Enables local AI processing (no data sent to external servers)</li>
              <li>• All features work offline once installed</li>
              <li>• You can always disable these features in Settings later</li>
            </ul>
          </div>

          {renderInstallationStatus()}
        </div>

        <DialogFooter className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleSkip}
            disabled={isInstalling}
          >
            Maybe Later
          </Button>
          <Button 
            onClick={handleInstall} 
            disabled={isInstalling || installationStatus === 'success'}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {isInstalling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Installing...
              </>
            ) : installationStatus === 'success' ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Installed!
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Install AI Features
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
