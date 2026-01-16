import { useState, useEffect, useMemo } from 'react';
import { X, Save, Type, Palette, Layout, Square, Maximize2, Layers, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAtom } from 'jotai';
import { selectedVisualElementAtom, visualEditingChangesAtom } from '@/atoms/previewAtoms';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { IpcClient } from '@/ipc/ipc_client';

interface VisualEditingToolbarProps {
  onClose: () => void;
}

export function VisualEditingToolbar({ onClose }: VisualEditingToolbarProps) {
  const [selectedElement, setSelectedVisualElement] = useAtom(selectedVisualElementAtom);
  const [changes, setChanges] = useAtom(visualEditingChangesAtom);
  const [selectedAppId] = useAtom(selectedAppIdAtom);
  const [isSaving, setIsSaving] = useState(false);
  // Local state for text content input to avoid sync issues
  const [textContentValue, setTextContentValue] = useState<string>('');

  // Sync textContentValue with selectedElement.textContent when element changes
  useEffect(() => {
    if (selectedElement) {
      setTextContentValue(selectedElement.textContent || '');
    }
  }, [selectedElement?.id, selectedElement?.textContent]);

  // Debug: Log when element changes
  useEffect(() => {
    if (selectedElement) {
      console.log('🎨 VisualEditingToolbar: Element changed', {
        id: selectedElement.id,
        stylesCount: Object.keys(selectedElement.styles || {}).length,
        styles: selectedElement.styles,
        hasWidth: !!selectedElement.styles?.width,
        hasHeight: !!selectedElement.styles?.height,
        width: selectedElement.styles?.width,
        height: selectedElement.styles?.height,
        stylesKeys: Object.keys(selectedElement.styles || {}),
      });
    }
  }, [selectedElement?.id, selectedElement?.styles]);

  // Use useMemo to ensure currentStyles updates when selectedElement.styles changes
  // This ensures React detects the change even if the styles object reference changes
  const currentStyles = useMemo(() => {
    return selectedElement?.styles || {};
  }, [selectedElement?.styles]);

  if (!selectedElement) return null;

  const handlePropertyChange = (property: string, value: string) => {
    if (!selectedElement.selector) return;
    
    // Use file from selectedElement if available
    // If no file path, we can still apply live preview changes, but can't save to file
    const filePath = selectedElement.file;

    // Apply live preview changes even without file path
    const iframe = document.querySelector('iframe[data-testid="preview-iframe-element"]') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      try {
        const element = iframe.contentWindow.document.querySelector(selectedElement.selector || '');
        if (element) {
          (element as HTMLElement).style[property as any] = value;
        }
      } catch (error) {
        // Cross-origin iframe - cannot apply live preview
        console.debug('Cannot apply live preview (cross-origin):', error);
      }
    }

    // Only add to changes map if we have a file path (so we can save)
    if (filePath) {
      const changeId = `${selectedElement.id}-${property}`;
      const newChanges = new Map(changes);
      newChanges.set(changeId, {
        property,
        value,
        file: filePath,
        selector: selectedElement.selector,
        line: selectedElement.line,
      });
      setChanges(newChanges);
    } else {
      console.warn('Visual editing change applied (live preview only). File path not found, so changes cannot be saved to source files.');
    }
  };

  const handleTextContentChange = (textContent: string) => {
    if (!selectedElement.selector) return;
    
    // Update local state immediately for responsive UI
    setTextContentValue(textContent);
    
    const filePath = selectedElement.file;

    // Apply live preview changes even without file path
    const iframe = document.querySelector('iframe[data-testid="preview-iframe-element"]') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      try {
        const element = iframe.contentWindow.document.querySelector(selectedElement.selector || '');
        if (element) {
          // Check if element has non-text child nodes (like nested elements)
          const hasNonTextChildren = Array.from(element.childNodes).some(
            node => node.nodeType !== Node.TEXT_NODE
          );
          
          if (hasNonTextChildren) {
            // Element has child elements - only replace text nodes, preserve structure
            const textNodes: Node[] = [];
            const nonTextNodes: Node[] = [];
            
            // Separate text nodes from non-text nodes
            for (let i = 0; i < element.childNodes.length; i++) {
              const node = element.childNodes[i];
              if (node.nodeType === Node.TEXT_NODE) {
                textNodes.push(node);
              } else {
                nonTextNodes.push(node);
              }
            }
            
            // Remove all text nodes
            textNodes.forEach(node => node.remove());
            
            // Add new text node at the beginning (before other elements)
            // Always add text node, even if empty, so user can see their typing
            const textNode = iframe.contentWindow.document.createTextNode(textContent);
            if (element.firstChild) {
              element.insertBefore(textNode, element.firstChild);
            } else {
              element.appendChild(textNode);
            }
          } else {
            // Element only has text nodes or is empty - use textContent directly for better performance
            // This handles empty strings and all text content properly
            element.textContent = textContent;
          }
          
          // Update the selected element's textContent for UI (but don't trigger re-render that resets input)
          // We'll update this after a debounce or on blur
        }
      } catch (error) {
        // Cross-origin iframe - cannot apply live preview
        console.debug('Cannot apply text content preview (cross-origin):', error);
      }
    }

    // Only add to changes map if we have a file path (so we can save)
    if (filePath) {
      const changeId = `${selectedElement.id}-textContent`;
      const newChanges = new Map(changes);
      
      // Log the text content being saved for debugging
      console.log(`[VisualEditing] Updating text content: "${textContent}" (length: ${textContent.length}, file: ${filePath}, line: ${selectedElement.line})`);
      
      newChanges.set(changeId, {
        property: 'textContent',
        value: textContent, // Ensure we're passing the full text content
        file: filePath,
        selector: selectedElement.selector,
        line: selectedElement.line,
        isTextContent: true,
      });
      setChanges(newChanges);
      
      // Update the atom with the new text content (for other parts of the UI)
      setSelectedVisualElement({
        ...selectedElement,
        textContent: textContent,
      });
    } else {
      console.warn('Text content change applied (live preview only). File path not found, so changes cannot be saved to source files.');
    }
  };

  const handleSave = async () => {
    // Prevent multiple simultaneous saves
    if (isSaving) {
      return;
    }

    if (!selectedAppId) {
      alert('Cannot save: No app selected.');
      return;
    }

    if (changes.size === 0) {
      // Check if we have changes that can't be saved (no file path)
      if (selectedElement && !selectedElement.file) {
        alert('Cannot save changes: File path not found for this element. Changes are only applied to the live preview.');
        return;
      }
      alert('No changes to save.');
      return;
    }

    setIsSaving(true);
    try {
      const changesArray = Array.from(changes.values());
      // Filter out changes without file paths
      const validChanges = changesArray.filter(change => change.file);
      
      if (validChanges.length === 0) {
        alert('Cannot save changes: No valid file paths found. Changes are only applied to the live preview.');
        setIsSaving(false);
        return;
      }
      
      const result = await IpcClient.getInstance().applyVisualEditingChanges({
        appId: selectedAppId,
        changes: validChanges,
      });
      
      if (result.success) {
        // Clear changes after successful save
        setChanges(new Map());
        onClose();
      } else {
        // Show error if some files failed
        const failedFiles = result.results.filter(r => !r.success);
        if (failedFiles.length > 0) {
          alert(`Failed to save changes to some files: ${failedFiles.map(f => f.file).join(', ')}`);
        } else {
          alert('Failed to save changes. Please try again.');
        }
      }
    } catch (error) {
      console.error('Failed to save visual editing changes:', error);
      alert(`Failed to save changes: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Helper to parse pixel values
  const parsePixelValue = (value: string): number => {
    if (!value) return 0;
    const num = parseInt(value.replace('px', ''), 10);
    return isNaN(num) ? 0 : num;
  };

  // Helper to get current value with fallback
  const getStyleValue = (property: string, defaultValue: string = '') => {
    return currentStyles[property] || defaultValue;
  };

  // Check if element has file path (can save changes)
  const canSaveChanges = selectedElement?.file ? true : false;
  
  // Check if a specific style property is available
  const hasStyle = (property: string) => {
    return currentStyles[property] && currentStyles[property] !== '' && currentStyles[property] !== 'none' && currentStyles[property] !== 'initial';
  };

  return (
    <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[360px] max-w-[420px] max-h-[85vh] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-sm">Edit Styles</h3>
          {selectedElement.file && (
            <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={selectedElement.file}>
              {selectedElement.file.split('/').pop()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {changes.size > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSave();
              }}
              disabled={isSaving || changes.size === 0 || !canSaveChanges}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white h-7 px-2 text-xs"
              title={!canSaveChanges ? 'Cannot save: File path not found' : changes.size === 0 ? 'No changes to save' : `Save ${changes.size} change${changes.size === 1 ? '' : 's'}`}
            >
              <Save className="w-3 h-3 mr-1" />
              {isSaving ? 'Saving...' : `Save ${changes.size}`}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="text" className="text-xs">
              <Type className="w-3 h-3 mr-1" />
              Text
            </TabsTrigger>
            <TabsTrigger value="effects" className="text-xs">
              <Palette className="w-3 h-3 mr-1" />
              Effects
            </TabsTrigger>
            <TabsTrigger value="layout" className="text-xs">
              <Layout className="w-3 h-3 mr-1" />
              Layout
            </TabsTrigger>
            <TabsTrigger value="spacing" className="text-xs">
              <Square className="w-3 h-3 mr-1" />
              Spacing
            </TabsTrigger>
          </TabsList>

          {/* Layout Tab */}
          <TabsContent value="layout" className="space-y-4">
            {/* Size */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-2">
                <Maximize2 className="w-3 h-3" />
                Size
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Width</Label>
                  <Input
                    type="number"
                    placeholder="auto"
                    value={parsePixelValue(getStyleValue('width', '')) || ''}
                    onChange={(e) => handlePropertyChange('width', e.target.value ? `${e.target.value}px` : 'auto')}
                    disabled={!canSaveChanges}
                    className="h-9 text-sm border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-900 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    title={!canSaveChanges ? 'File path not found - cannot save changes' : 'Width'}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Height</Label>
                  <Input
                    type="number"
                    placeholder="auto"
                    value={parsePixelValue(getStyleValue('height', '')) || ''}
                    onChange={(e) => handlePropertyChange('height', e.target.value ? `${e.target.value}px` : 'auto')}
                    disabled={!canSaveChanges}
                    className="h-9 text-sm border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-900 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    title={!canSaveChanges ? 'File path not found - cannot save changes' : 'Height'}
                  />
                </div>
              </div>
            </div>

            {/* Display */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-2">
                <Layers className="w-3 h-3" />
                Display
              </Label>
              <select
                value={getStyleValue('display', 'block')}
                onChange={(e) => handlePropertyChange('display', e.target.value)}
                className="w-full h-9 text-sm rounded-md border-2 border-input bg-background px-3 py-1 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSaveChanges}
                title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
              >
                <option value="block">Block</option>
                <option value="inline">Inline</option>
                <option value="inline-block">Inline Block</option>
                <option value="flex">Flex</option>
                <option value="inline-flex">Inline Flex</option>
                <option value="grid">Grid</option>
                <option value="none">None</option>
              </select>
            </div>

            {/* Flexbox (if display is flex) */}
            {(getStyleValue('display', '').includes('flex')) && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Flex Direction</Label>
                <select
                  value={getStyleValue('flexDirection', 'row')}
                  onChange={(e) => handlePropertyChange('flexDirection', e.target.value)}
                  className="w-full h-9 text-sm rounded-md border-2 border-input bg-background px-3 py-1 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSaveChanges}
                title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                >
                  <option value="row">Row</option>
                  <option value="column">Column</option>
                  <option value="row-reverse">Row Reverse</option>
                  <option value="column-reverse">Column Reverse</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Justify</Label>
                    <select
                      value={getStyleValue('justifyContent', 'flex-start')}
                      onChange={(e) => handlePropertyChange('justifyContent', e.target.value)}
                      className="w-full h-9 text-sm rounded-md border-2 border-input bg-background px-3 py-1 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSaveChanges}
                title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                    >
                      <option value="flex-start">Start</option>
                      <option value="center">Center</option>
                      <option value="flex-end">End</option>
                      <option value="space-between">Between</option>
                      <option value="space-around">Around</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Align</Label>
                    <select
                      value={getStyleValue('alignItems', 'flex-start')}
                      onChange={(e) => handlePropertyChange('alignItems', e.target.value)}
                      className="w-full h-9 text-sm rounded-md border-2 border-input bg-background px-3 py-1 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSaveChanges}
                title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                    >
                      <option value="flex-start">Start</option>
                      <option value="center">Center</option>
                      <option value="flex-end">End</option>
                      <option value="stretch">Stretch</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Position */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Position</Label>
              <select
                value={getStyleValue('position', 'static')}
                onChange={(e) => handlePropertyChange('position', e.target.value)}
                className="w-full h-9 text-sm rounded-md border-2 border-input bg-background px-3 py-1 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSaveChanges}
                title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
              >
                <option value="static">Static</option>
                <option value="relative">Relative</option>
                <option value="absolute">Absolute</option>
                <option value="fixed">Fixed</option>
                <option value="sticky">Sticky</option>
              </select>
            </div>
          </TabsContent>

          {/* Spacing Tab */}
          <TabsContent value="spacing" className="space-y-4">
            {/* Margin */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-2">
                <Layout className="w-3 h-3" />
                Margin
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Top</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={parsePixelValue(getStyleValue('marginTop', '')) || 0}
                    onChange={(e) => handlePropertyChange('marginTop', `${e.target.value}px`)}
                    className="h-9 text-sm border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-900 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canSaveChanges}
                    title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Right</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={parsePixelValue(getStyleValue('marginRight', '')) || 0}
                    onChange={(e) => handlePropertyChange('marginRight', `${e.target.value}px`)}
                    className="h-9 text-sm border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-900 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canSaveChanges}
                    title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Bottom</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={parsePixelValue(getStyleValue('marginBottom', '')) || 0}
                    onChange={(e) => handlePropertyChange('marginBottom', `${e.target.value}px`)}
                    className="h-9 text-sm border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-900 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canSaveChanges}
                    title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Left</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={parsePixelValue(getStyleValue('marginLeft', '')) || 0}
                    onChange={(e) => handlePropertyChange('marginLeft', `${e.target.value}px`)}
                    className="h-9 text-sm border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-900 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canSaveChanges}
                    title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                  />
                </div>
              </div>
            </div>

            {/* Padding */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-2">
                <Layout className="w-3 h-3" />
                Padding
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Top</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={parsePixelValue(getStyleValue('paddingTop', '')) || 0}
                    onChange={(e) => handlePropertyChange('paddingTop', `${e.target.value}px`)}
                    className="h-9 text-sm border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-900 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canSaveChanges}
                    title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Right</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={parsePixelValue(getStyleValue('paddingRight', '')) || 0}
                    onChange={(e) => handlePropertyChange('paddingRight', `${e.target.value}px`)}
                    className="h-9 text-sm border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-900 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canSaveChanges}
                    title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Bottom</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={parsePixelValue(getStyleValue('paddingBottom', '')) || 0}
                    onChange={(e) => handlePropertyChange('paddingBottom', `${e.target.value}px`)}
                    className="h-9 text-sm border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-900 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canSaveChanges}
                    title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Left</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={parsePixelValue(getStyleValue('paddingLeft', '')) || 0}
                    onChange={(e) => handlePropertyChange('paddingLeft', `${e.target.value}px`)}
                    className="h-9 text-sm border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-900 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canSaveChanges}
                    title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                  />
                </div>
              </div>
            </div>

            {/* Border */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-2">
                <Square className="w-3 h-3" />
                Border
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Width</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={parsePixelValue(getStyleValue('borderWidth', '')) || 0}
                    onChange={(e) => handlePropertyChange('borderWidth', `${e.target.value}px`)}
                    className="h-9 text-sm border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-900 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canSaveChanges}
                    title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Radius</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={parsePixelValue(getStyleValue('borderRadius', '')) || 0}
                    onChange={(e) => handlePropertyChange('borderRadius', `${e.target.value}px`)}
                    className="h-9 text-sm border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-900 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canSaveChanges}
                    title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Color</Label>
                <Input
                  type="color"
                  value={getStyleValue('borderColor', '#000000')}
                  onChange={(e) => handlePropertyChange('borderColor', e.target.value)}
                    className="h-10 p-1 w-full border-2 border-gray-300 dark:border-gray-600 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canSaveChanges}
                    title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                />
              </div>
            </div>
          </TabsContent>

          {/* Text Tab */}
          <TabsContent value="text" className="space-y-4">
            {selectedElement.tagName && ['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'button', 'a', 'label'].includes(selectedElement.tagName.toLowerCase()) && (
              <>
                {/* Text Content Editor */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-2">
                    <Type className="w-3 h-3" />
                    Text Content
                  </Label>
                  <Input
                    type="text"
                    placeholder="Enter text content..."
                    value={textContentValue}
                    onChange={(e) => handleTextContentChange(e.target.value)}
                    onBlur={() => {
                      // Update the atom on blur to ensure final value is synced
                      if (selectedElement) {
                        setSelectedVisualElement({
                          ...selectedElement,
                          textContent: textContentValue,
                        });
                      }
                    }}
                    className="h-9 text-sm border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-900 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canSaveChanges}
                    title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-2">
                    <Type className="w-3 h-3" />
                    Font
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Size</Label>
                      <Input
                        type="number"
                        placeholder="16"
                        value={parsePixelValue(getStyleValue('fontSize', '')) || 16}
                        onChange={(e) => handlePropertyChange('fontSize', `${e.target.value}px`)}
                        className="h-9 text-sm border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-900 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canSaveChanges}
                    title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Weight</Label>
                      <select
                        value={getStyleValue('fontWeight', '400')}
                        onChange={(e) => handlePropertyChange('fontWeight', e.target.value)}
                        className="w-full h-9 text-sm rounded-md border-2 border-input bg-background px-3 py-1 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSaveChanges}
                title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                      >
                        <option value="100">100 - Thin</option>
                        <option value="200">200 - Extra Light</option>
                        <option value="300">300 - Light</option>
                        <option value="400">400 - Normal</option>
                        <option value="500">500 - Medium</option>
                        <option value="600">600 - Semi Bold</option>
                        <option value="700">700 - Bold</option>
                        <option value="800">800 - Extra Bold</option>
                        <option value="900">900 - Black</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Text Color</Label>
                  <Input
                    type="color"
                    value={getStyleValue('color', '#000000')}
                    onChange={(e) => handlePropertyChange('color', e.target.value)}
                    className="h-10 p-1 w-full border-2 border-gray-300 dark:border-gray-600 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSaveChanges}
                title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Text Align</Label>
                  <select
                    value={getStyleValue('textAlign', 'left')}
                    onChange={(e) => handlePropertyChange('textAlign', e.target.value)}
                    className="w-full h-9 text-sm rounded-md border-2 border-input bg-background px-3 py-1 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSaveChanges}
                title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                    <option value="justify">Justify</option>
                  </select>
                </div>
              </>
            )}
            {selectedElement.tagName && ['input', 'textarea'].includes(selectedElement.tagName.toLowerCase()) && (
              <div className="text-xs text-muted-foreground text-center py-4">
                Text content editing is not available for form inputs. Use placeholder or value attributes instead.
              </div>
            )}
            {!selectedElement.tagName || !['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'button', 'a', 'label', 'input', 'textarea'].includes(selectedElement.tagName.toLowerCase()) && (
              <div className="text-xs text-muted-foreground text-center py-4">
                Text styles are not applicable to this element
              </div>
            )}
          </TabsContent>

          {/* Effects Tab */}
          <TabsContent value="effects" className="space-y-4">
            {/* Background */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-2">
                <Palette className="w-3 h-3" />
                Background
              </Label>
              <Input
                type="color"
                value={getStyleValue('backgroundColor') || '#ffffff'}
                onChange={(e) => handlePropertyChange('backgroundColor', e.target.value)}
                className="h-10 p-1 w-full border-2 border-gray-300 dark:border-gray-600 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSaveChanges}
                title={!canSaveChanges ? 'File path not found - cannot save changes' : undefined}
              />
            </div>

            {/* Opacity */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Opacity</Label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.1"
                placeholder="1"
                value={parseFloat(getStyleValue('opacity', '1')) || 1}
                onChange={(e) => handlePropertyChange('opacity', e.target.value)}
                className="h-9 text-sm border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-900"
              />
            </div>

            {/* Box Shadow */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Box Shadow</Label>
              <Input
                type="text"
                placeholder="0 2px 4px rgba(0,0,0,0.1)"
                value={getStyleValue('boxShadow', '')}
                onChange={(e) => handlePropertyChange('boxShadow', e.target.value)}
                className="h-9 text-sm border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-900"
              />
            </div>

            {/* Z-Index */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Z-Index</Label>
              <Input
                type="number"
                placeholder="auto"
                value={getStyleValue('zIndex', '') || ''}
                onChange={(e) => handlePropertyChange('zIndex', e.target.value || 'auto')}
                className="h-9 text-sm border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-900"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}