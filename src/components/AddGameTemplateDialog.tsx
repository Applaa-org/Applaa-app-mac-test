/**
 * Add Game Template Dialog Component
 * 
 * Dialog for adding a new game template to the templates collection
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IpcClient } from '@/ipc/ipc_client';
import { showError, showSuccess } from '@/lib/toast';
import { Loader2 } from 'lucide-react';

interface AddGameTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appType: 'web' | 'expo' | 'flutter' | 'godot' | 'arcade' | 'microbit' | 'minecraft' | 'blockly';
  onTemplateAdded?: () => void;
}

export function AddGameTemplateDialog({ open, onOpenChange, appType, onTemplateAdded }: AddGameTemplateDialogProps) {
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [emoji, setEmoji] = useState('');
  const [selectedAppType, setSelectedAppType] = useState<'web' | 'expo' | 'flutter' | 'godot' | 'arcade' | 'microbit' | 'minecraft' | 'blockly'>(appType as any);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ipcClient = IpcClient.getInstance();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !details.trim() || !selectedAppType) {
      showError(new Error('Please fill in name, details, and app type'));
      return;
    }

    // Optional URL validation
    if (previewUrl.trim()) {
      try {
        new URL(previewUrl);
      } catch {
        showError(new Error('Please enter a valid preview URL'));
        return;
      }
    }

    if (imageUrl.trim()) {
      try {
        new URL(imageUrl);
      } catch {
        showError(new Error('Please enter a valid image URL'));
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await ipcClient.createGameTemplate({
        name: name.trim(),
        details: details.trim(),
        previewUrl: previewUrl.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        emoji: emoji.trim() || undefined,
        appType: selectedAppType,
      });

      showSuccess('Game template added successfully!');

      // Reset form
      setName('');
      setDetails('');
      setPreviewUrl('');
      setImageUrl('');
      setEmoji('');
      setSelectedAppType(appType);

      onTemplateAdded?.();
      onOpenChange(false);
    } catch (error) {
      showError(error as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setDetails('');
      setPreviewUrl('');
      setImageUrl('');
      setEmoji('');
      setSelectedAppType(appType);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Game Template</DialogTitle>
          <DialogDescription>
            Add a custom game template. Name and details are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter template name..."
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="appType">App Type</Label>
              <Select value={selectedAppType} onValueChange={(value) => setSelectedAppType(value as typeof selectedAppType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="expo">Expo</SelectItem>
                  <SelectItem value="flutter">Flutter</SelectItem>
                  <SelectItem value="godot">Applaa (Godot)</SelectItem>
                  <SelectItem value="arcade">MakeCode Arcade</SelectItem>
                  <SelectItem value="microbit">Applaa:bit</SelectItem>
                  <SelectItem value="minecraft">Minecraft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="templateDetails">Details / Full Prompt</Label>
              <Textarea
                id="templateDetails"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Enter the full prompt/details for this template..."
                disabled={isSubmitting}
                rows={8}
                required
              />
              <p className="text-xs text-muted-foreground">
                The complete prompt that will be used when this template is selected
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="previewUrl">Preview URL (Optional)</Label>
              <Input
                id="previewUrl"
                type="url"
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                placeholder="https://example.com/preview"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="imageUrl">Image URL (Optional)</Label>
              <Input
                id="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="emoji">Emoji (Optional)</Label>
              <Input
                id="emoji"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="🎮"
                disabled={isSubmitting}
                maxLength={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim() || !details.trim()}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? 'Adding...' : 'Add Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

