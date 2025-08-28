import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { InfoIcon, Settings2, Trash2, Sparkles, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useSettings } from "@/hooks/useSettings";
import { useContextPaths } from "@/hooks/useContextPaths";
import { SmartSuggestions } from "./SmartSuggestions";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { chatInputValueAtom } from "@/atoms/chatAtoms";
import type { ContextPathResult } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface SmartContextFilesPickerProps {
  className?: string;
}

export function SmartContextFilesPicker({ className }: SmartContextFilesPickerProps) {
  const { settings } = useSettings();
  const {
    contextPaths,
    smartContextAutoIncludes,
    excludePaths,
    updateContextPaths,
    updateSmartContextAutoIncludes,
    updateExcludePaths,
  } = useContextPaths();
  
  const [isOpen, setIsOpen] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [newAutoIncludePath, setNewAutoIncludePath] = useState("");
  const [newExcludePath, setNewExcludePath] = useState("");
  
  // Get current query and app for smart suggestions
  const currentQuery = useAtomValue(chatInputValueAtom);
  const appId = useAtomValue(selectedAppIdAtom);

  // Check if semantic context is enabled
  const isSemanticEnabled = settings?.semanticContextEnabled ?? true;
  const isCrossAppEnabled = settings?.semanticCrossAppEnabled ?? false;
  // Smart context requires both Applaa Pro and the feature to be enabled
  const isSmartContextEnabled = settings?.enableApplaaPro === true && (settings?.enableProSmartFilesContextMode === true || settings?.semanticContextEnabled === true);

  const addPath = () => {
    if (
      newPath.trim() === "" ||
      contextPaths.find((p: ContextPathResult) => p.globPath === newPath)
    ) {
      setNewPath("");
      return;
    }
    const newPaths = [
      ...contextPaths.map(({ globPath }: ContextPathResult) => ({ globPath })),
      {
        globPath: newPath,
      },
    ];
    updateContextPaths(newPaths);
    setNewPath("");
  };

  const removePath = (pathToRemove: string) => {
    const newPaths = contextPaths
      .filter((p: ContextPathResult) => p.globPath !== pathToRemove)
      .map(({ globPath }: ContextPathResult) => ({ globPath }));
    updateContextPaths(newPaths);
  };

  const addAutoIncludePath = () => {
    if (
      newAutoIncludePath.trim() === "" ||
      smartContextAutoIncludes.find((p: ContextPathResult) => p.globPath === newAutoIncludePath)
    ) {
      setNewAutoIncludePath("");
      return;
    }
    const newPaths = [
      ...smartContextAutoIncludes.map(({ globPath }: ContextPathResult) => ({ globPath })),
      {
        globPath: newAutoIncludePath,
      },
    ];
    updateSmartContextAutoIncludes(newPaths);
    setNewAutoIncludePath("");
  };

  const removeAutoIncludePath = (pathToRemove: string) => {
    const newPaths = smartContextAutoIncludes
      .filter((p: ContextPathResult) => p.globPath !== pathToRemove)
      .map(({ globPath }: ContextPathResult) => ({ globPath }));
    updateSmartContextAutoIncludes(newPaths);
  };

  const addExcludePath = () => {
    if (
      newExcludePath.trim() === "" ||
      excludePaths.find((p: ContextPathResult) => p.globPath === newExcludePath)
    ) {
      setNewExcludePath("");
      return;
    }
    const newPaths = [
      ...excludePaths.map(({ globPath }: ContextPathResult) => ({ globPath })),
      {
        globPath: newExcludePath,
      },
    ];
    updateExcludePaths(newPaths);
    setNewExcludePath("");
  };

  const removeExcludePath = (pathToRemove: string) => {
    const newPaths = excludePaths
      .filter((p: ContextPathResult) => p.globPath !== pathToRemove)
      .map(({ globPath }: ContextPathResult) => ({ globPath }));
    updateExcludePaths(newPaths);
  };

  // Handle smart suggestion actions
  const handleAddSuggestion = (filePath: string) => {
    // Add as a manual context path
    const newPaths = [
      ...contextPaths.map(({ globPath }: ContextPathResult) => ({ globPath })),
      { globPath: filePath },
    ];
    updateContextPaths(newPaths);
  };

  const handleRemoveSuggestion = (filePath: string) => {
    removePath(filePath);
  };

  // Get selected paths for smart suggestions
  const selectedPaths = contextPaths.map((p: ContextPathResult) => p.globPath);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn("has-[>svg]:px-2", className)}
              size="sm"
              data-testid="codebase-context-button"
            >
              <div className="flex items-center gap-1">
                <Settings2 className="size-4" />
                {isSemanticEnabled && (
                  <Sparkles className="size-3 text-blue-500" />
                )}
              </div>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {isSemanticEnabled ? "Smart Context & Files" : "Codebase Context"}
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        className="w-[480px] max-h-[80vh] overflow-y-auto"
        align="start"
      >
        <div className="relative space-y-4">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              Codebase Context
              {isSemanticEnabled && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Smart
                </Badge>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 cursor-help">
                      Select the files to use as context.{" "}
                      <InfoIcon className="size-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px]">
                    {isSmartContextEnabled ? (
                      <p>
                        With Spark Context, Applaa uses the most relevant files as
                        context. Smart suggestions help you find the right files.
                      </p>
                    ) : (
                      <p>By default, Applaa uses your whole codebase. Smart suggestions help you find relevant files.</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </p>
          </div>

          {/* Smart Suggestions Section */}
          {isSemanticEnabled && appId && (
            <>
              <SmartSuggestions
                query={currentQuery}
                appId={appId}
                selectedPaths={selectedPaths}
                onAddPath={handleAddSuggestion}
                onRemovePath={handleRemoveSuggestion}
                maxSuggestions={5}
                includeOtherApps={isCrossAppEnabled}
              />
              <Separator />
            </>
          )}

          {/* Manual Context Files */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">Manual Context Files</h4>
              {isCrossAppEnabled && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Cross-App
                </Badge>
              )}
            </div>
            
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input
                data-testid="manual-context-files-input"
                type="text"
                placeholder="src/**/*.tsx"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addPath();
                  }
                }}
              />
              <Button
                type="submit"
                onClick={addPath}
                data-testid="manual-context-files-add-button"
              >
                Add
              </Button>
            </div>

            <TooltipProvider>
              {contextPaths.length > 0 ? (
                <div className="space-y-2">
                  {contextPaths.map((p: ContextPathResult) => (
                    <div
                      key={p.globPath}
                      className="flex items-center justify-between gap-2 rounded-md border p-2"
                    >
                      <div className="flex flex-1 flex-col overflow-hidden">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate font-mono text-sm">
                              {p.globPath}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{p.globPath}</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-xs text-muted-foreground">
                          {p.files} files, ~{p.tokens} tokens
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePath(p.globPath)}
                          data-testid="manual-context-files-remove-button"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No manual context files added.
                </div>
              )}
            </TooltipProvider>
          </div>

          {/* Auto-Include Section (if Smart Context is enabled) */}
          {isSmartContextEnabled && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Auto-Include Files</h4>
                
                <div className="flex w-full max-w-sm items-center space-x-2">
                  <Input
                    data-testid="auto-include-context-files-input"
                    type="text"
                    placeholder="src/components/**/*.tsx"
                    value={newAutoIncludePath}
                    onChange={(e) => setNewAutoIncludePath(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addAutoIncludePath();
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    onClick={addAutoIncludePath}
                    data-testid="auto-include-context-files-add-button"
                  >
                    Add
                  </Button>
                </div>

                <TooltipProvider>
                  {smartContextAutoIncludes.length > 0 ? (
                    <div className="space-y-2">
                      {smartContextAutoIncludes.map((p: ContextPathResult) => (
                        <div
                          key={p.globPath}
                          className="flex items-center justify-between gap-2 rounded-md border p-2"
                        >
                          <div className="flex flex-1 flex-col overflow-hidden">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate font-mono text-sm">
                                  {p.globPath}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{p.globPath}</p>
                              </TooltipContent>
                            </Tooltip>
                            <span className="text-xs text-muted-foreground">
                              {p.files} files, ~{p.tokens} tokens
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAutoIncludePath(p.globPath)}
                              data-testid="auto-include-context-files-remove-button"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No auto-include files added.
                    </div>
                  )}
                </TooltipProvider>
              </div>
            </>
          )}

          {/* Exclude Files Section */}
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Exclude Files</h4>
            
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input
                data-testid="exclude-context-files-input"
                type="text"
                placeholder="node_modules/**"
                value={newExcludePath}
                onChange={(e) => setNewExcludePath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addExcludePath();
                  }
                }}
              />
              <Button
                type="submit"
                onClick={addExcludePath}
                data-testid="exclude-context-files-add-button"
              >
                Add
              </Button>
            </div>

            <TooltipProvider>
              {excludePaths.length > 0 ? (
                <div className="space-y-2">
                  {excludePaths.map((p: ContextPathResult) => (
                    <div
                      key={p.globPath}
                      className="flex items-center justify-between gap-2 rounded-md border p-2"
                    >
                      <div className="flex flex-1 flex-col overflow-hidden">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate font-mono text-sm">
                              {p.globPath}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{p.globPath}</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-xs text-muted-foreground">
                          {p.files} files excluded
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExcludePath(p.globPath)}
                          data-testid="exclude-context-files-remove-button"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No exclude patterns added.
                </div>
              )}
            </TooltipProvider>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}



