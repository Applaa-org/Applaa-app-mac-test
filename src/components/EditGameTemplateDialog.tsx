/**
 * Edit Game Template Dialog Component
 * 
 * Dialog for editing an existing game template
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IpcClient } from '@/ipc/ipc_client';
import { showError, showSuccess } from '@/lib/toast';
import { Loader2 } from 'lucide-react';

interface GameTemplate {
  id: string;
  name: string;
  details: string;
  previewUrl?: string | null;
  imageUrl?: string | null;
  emoji?: string | null;
  appType: 'web' | 'expo' | 'flutter' | 'applaa';
  displayOrder?: number;
}

interface EditGameTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: GameTemplate | null;
  onTemplateUpdated?: () => void;
}

export function EditGameTemplateDialog({ open, onOpenChange, template, onTemplateUpdated }: EditGameTemplateDialogProps) {
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [emoji, setEmoji] = useState('');
  const [appType, setAppType] = useState<'web' | 'expo' | 'flutter' | 'applaa'>('applaa');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ipcClient = IpcClient.getInstance();

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDetails(template.details);
      setPreviewUrl(template.previewUrl || '');
      setImageUrl(template.imageUrl || '');
      setEmoji(template.emoji || '');
      setAppType(template.appType);
      setDisplayOrder(template.displayOrder || 0);
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!template) return;
    
    if (!name.trim() || !details.trim()) {
      showError(new Error('Please fill in name and details'));
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
      await ipcClient.updateGameTemplate({
        id: template.id,
        name: name.trim(),
        details: details.trim(),
        previewUrl: previewUrl.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        emoji: emoji.trim() || undefined,
        appType: appType,
        displayOrder: displayOrder,
      });

      showSuccess('Game template updated successfully!');
      
      onTemplateUpdated?.();
      onOpenChange(false);
    } catch (error) {
      showError(error as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Game Template</DialogTitle>
          <DialogDescription>
            Update the template information. Name and details are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editTemplateName">Template Name</Label>
              <Input
                id="editTemplateName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter template name..."
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editAppType">App Type</Label>
              <Select value={appType} onValueChange={(value) => setAppType(value as typeof appType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="expo">Expo</SelectItem>
                  <SelectItem value="flutter">Flutter</SelectItem>
                  <SelectItem value="applaa">Applaa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editTemplateDetails">Details / Full Prompt</Label>
              <Textarea
                id="editTemplateDetails"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Enter the full prompt/details for this template..."
                disabled={isSubmitting}
                rows={8}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editPreviewUrl">Preview URL (Optional)</Label>
              <Input
                id="editPreviewUrl"
                type="url"
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                placeholder="https://example.com/preview"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editImageUrl">Image URL (Optional)</Label>
              <Input
                id="editImageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editEmoji">Emoji (Optional)</Label>
              <Input
                id="editEmoji"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="🎮"
                disabled={isSubmitting}
                maxLength={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editDisplayOrder">Display Order</Label>
              <Input
                id="editDisplayOrder"
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                placeholder="0"
                disabled={isSubmitting}
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first. Default is 0.
              </p>
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
              {isSubmitting ? 'Updating...' : 'Update Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

