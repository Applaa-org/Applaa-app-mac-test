import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe, Info } from "lucide-react";

interface WebUrlConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
  frameworkName: string;
}

export function WebUrlConfigDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  frameworkName 
}: WebUrlConfigDialogProps) {
  const [webUrl, setWebUrl] = useState('http://localhost:5173');
  const [error, setError] = useState('');

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleConfirm = () => {
    if (!webUrl.trim()) {
      setError('Please enter a web URL');
      return;
    }

    if (!validateUrl(webUrl)) {
      setError('Please enter a valid URL (e.g., http://localhost:5173 or https://myapp.com)');
      return;
    }

    setError('');
    onConfirm(webUrl);
  };

  const handleUrlChange = (value: string) => {
    setWebUrl(value);
    setError('');
  };

  const commonUrls = [
    { label: 'Vite Dev Server', url: 'http://localhost:5173' },
    { label: 'Create React App', url: 'http://localhost:3000' },
    { label: 'Next.js Dev', url: 'http://localhost:3000' },
    { label: 'Vercel Deploy', url: 'https://myapp.vercel.app' },
    { label: 'Netlify Deploy', url: 'https://myapp.netlify.app' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Configure Web URL for {frameworkName}
          </DialogTitle>
          <DialogDescription>
            Enter the URL where your web app is hosted. This will be embedded in the mobile app webview.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webUrl">Web App URL</Label>
            <Input
              id="webUrl"
              value={webUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://myapp.com or http://localhost:5173"
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Development:</strong> Use localhost URLs for testing<br/>
              <strong>Production:</strong> Use your deployed app URL (https://myapp.com)
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Common URLs:</Label>
            <div className="grid grid-cols-1 gap-1">
              {commonUrls.map((item) => (
                <button
                  key={item.url}
                  onClick={() => handleUrlChange(item.url)}
                  className="text-left text-xs p-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="font-medium">{item.label}</div>
                  <div className="text-gray-500">{item.url}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Create {frameworkName} App
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}




