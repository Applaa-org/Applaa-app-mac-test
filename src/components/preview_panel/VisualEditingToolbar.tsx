import { useState, useEffect } from 'react';
import { X, Save, Type, Palette, Layout, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAtom } from 'jotai';
import { selectedVisualElementAtom, visualEditingChangesAtom } from '@/atoms/previewAtoms';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { IpcClient } from '@/ipc/ipc_client';

interface VisualEditingToolbarProps {
  onClose: () => void;
}

export function VisualEditingToolbar({ onClose }: VisualEditingToolbarProps) {
  const [selectedElement] = useAtom(selectedVisualElementAtom);
  const [changes, setChanges] = useAtom(visualEditingChangesAtom);
  const selectedAppId = useAtom(selectedAppIdAtom);
  const [isSaving, setIsSaving] = useState(false);

  if (!selectedElement) return null;

  const handlePropertyChange = (property: string, value: string) => {
    if (!selectedElement.file || !selectedElement.selector) return;

    const changeId = `${selectedElement.id}-${property}`;
    const newChanges = new Map(changes);
    newChanges.set(changeId, {
      property,
      value,
      file: selectedElement.file,
      selector: selectedElement.selector,
      line: selectedElement.line,
    });
    setChanges(newChanges);

    // Apply change to iframe immediately (live preview)
    const iframe = document.querySelector('iframe[data-testid="preview-iframe-element"]') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      try {
        const element = iframe.contentWindow.document.querySelector(selectedElement.selector || '');
        if (element) {
          (element as HTMLElement).style[property as any] = value;
        }
      } catch (error) {
        console.error('Failed to apply style change:', error);
      }
    }
  };

  const handleSave = async () => {
    if (!selectedAppId || changes.size === 0) return;

    setIsSaving(true);
    try {
      const changesArray = Array.from(changes.values());
      await IpcClient.getInstance().applyVisualEditingChanges({
        appId: selectedAppId,
        changes: changesArray,
      });
      
      // Clear changes after successful save
      setChanges(new Map());
      onClose();
    } catch (error) {
      console.error('Failed to save visual editing changes:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentStyles = selectedElement.styles || {};

  return (
    <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 min-w-[320px] max-w-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Edit Styles</h3>
        <div className="flex items-center gap-2">
          {changes.size > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
            >
              <Save className="w-3 h-3 mr-1" />
              Save {changes.size}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {/* Margin */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Layout className="w-4 h-4 text-gray-500" />
            <Label className="text-xs font-medium">Margin</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">X</Label>
              <Input
                type="number"
                placeholder="0"
                defaultValue={parseInt(currentStyles.marginLeft) || 0}
                onChange={(e) => handlePropertyChange('marginLeft', `${e.target.value}px`)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Y</Label>
              <Input
                type="number"
                placeholder="0"
                defaultValue={parseInt(currentStyles.marginTop) || 0}
                onChange={(e) => handlePropertyChange('marginTop', `${e.target.value}px`)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Padding */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Layout className="w-4 h-4 text-gray-500" />
            <Label className="text-xs font-medium">Padding</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">X</Label>
              <Input
                type="number"
                placeholder="0"
                defaultValue={parseInt(currentStyles.paddingLeft) || 0}
                onChange={(e) => handlePropertyChange('paddingLeft', `${e.target.value}px`)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Y</Label>
              <Input
                type="number"
                placeholder="0"
                defaultValue={parseInt(currentStyles.paddingTop) || 0}
                onChange={(e) => handlePropertyChange('paddingTop', `${e.target.value}px`)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Border */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Square className="w-4 h-4 text-gray-500" />
            <Label className="text-xs font-medium">Border</Label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Width</Label>
              <Input
                type="number"
                placeholder="0"
                defaultValue={parseInt(currentStyles.borderWidth) || 0}
                onChange={(e) => handlePropertyChange('borderWidth', `${e.target.value}px`)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Radius</Label>
              <Input
                type="number"
                placeholder="0"
                defaultValue={parseInt(currentStyles.borderRadius) || 0}
                onChange={(e) => handlePropertyChange('borderRadius', `${e.target.value}px`)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Color</Label>
              <Input
                type="color"
                defaultValue={currentStyles.borderColor || '#000000'}
                onChange={(e) => handlePropertyChange('borderColor', e.target.value)}
                className="h-8 p-1"
              />
            </div>
          </div>
        </div>

        {/* Background */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-gray-500" />
            <Label className="text-xs font-medium">Background</Label>
          </div>
          <Input
            type="color"
            defaultValue={currentStyles.backgroundColor || '#ffffff'}
            onChange={(e) => handlePropertyChange('backgroundColor', e.target.value)}
            className="h-8 p-1"
          />
        </div>

        {/* Text Styles (if element has text) */}
        {selectedElement.tagName && ['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'button', 'a'].includes(selectedElement.tagName.toLowerCase()) && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-gray-500" />
                <Label className="text-xs font-medium">Font Size</Label>
              </div>
              <Input
                type="number"
                placeholder="16"
                defaultValue={parseInt(currentStyles.fontSize) || 16}
                onChange={(e) => handlePropertyChange('fontSize', `${e.target.value}px`)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-gray-500" />
                <Label className="text-xs font-medium">Font Weight</Label>
              </div>
              <Input
                type="number"
                placeholder="400"
                defaultValue={parseInt(currentStyles.fontWeight) || 400}
                onChange={(e) => handlePropertyChange('fontWeight', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-gray-500" />
                <Label className="text-xs font-medium">Text Color</Label>
              </div>
              <Input
                type="color"
                defaultValue={currentStyles.color || '#000000'}
                onChange={(e) => handlePropertyChange('color', e.target.value)}
                className="h-8 p-1"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

