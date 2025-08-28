import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Crown, ChevronDown, Sparkles, Brain, Zap, Lock } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useApplaaPro } from "@/hooks/useApplaaPro";

export function SparkModeSelector() {
  const { settings, updateSettings } = useSettings();
  const { isPro, hasProKey } = useApplaaPro();

  // Pro feature toggles - only work if user has Pro
  const toggleSparkEdits = () => {
    if (!isPro) return; // Block if not Pro
    updateSettings({
      enableProLazyEditsMode: !settings?.enableProLazyEditsMode,
    });
  };

  const toggleSparkContext = () => {
    if (!isPro) return; // Block if not Pro
    updateSettings({
      enableProSmartFilesContextMode: !settings?.enableProSmartFilesContextMode,
    });
  };

  const toggleSemanticContext = () => {
    if (!isPro) return; // Block if not Pro - this is a unique world-first feature!
    updateSettings({
      semanticContextEnabled: !settings?.semanticContextEnabled,
    });
  };

  // Check if any Pro features are enabled (including our unique SQLite Vector + AI Context!)
  const isAnyProFeatureEnabled = isPro && (
    settings?.enableProLazyEditsMode || 
    settings?.enableProSmartFilesContextMode ||
    settings?.semanticContextEnabled
  );

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`w-8 h-8 p-0 flex items-center justify-center transition-all ${
                isPro
                  ? isAnyProFeatureEnabled
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-purple-500 shadow-md"
                    : "bg-gradient-to-r from-purple-100 to-blue-100 hover:from-purple-200 hover:to-blue-200 text-purple-700 border-purple-300"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-500 border-gray-300"
              }`}
            >
              {isPro ? (
                <Crown className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {isPro 
            ? "Configure Pro features" 
            : hasProKey 
              ? "Enable Applaa Pro to unlock Spark features"
              : "Upgrade to Applaa Pro for advanced features"
          }
        </TooltipContent>
      </Tooltip>
      <PopoverContent className={`w-80 ${isPro ? 'border-purple-200' : 'border-gray-200'}`}>
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-medium flex items-center gap-1.5">
              {isPro ? (
                <>
                  <Crown className="h-4 w-4 text-purple-600" />
                  <span className="text-purple-600 font-medium">Applaa Pro</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-500 font-medium">Pro Features</span>
                </>
              )}
            </h4>
            <div className={`h-px bg-gradient-to-r ${isPro ? 'from-purple-500/50 via-purple-500/20' : 'from-gray-500/50 via-gray-500/20'} to-transparent`} />
            <p className="text-xs text-muted-foreground">
              {isPro 
                ? "Configure your premium AI features"
                : "Upgrade to unlock advanced capabilities"
              }
            </p>
          </div>
          
          {!isPro && !hasProKey && (
            <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Upgrade to Applaa Pro</span>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mb-3">
                Unlock Spark Edits, Smart Context, SQLite Vector AI, and premium models
              </p>
              <Button 
                size="sm" 
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                onClick={() => window.location.hash = '/settings/providers/auto'}
              >
                <Zap className="h-3 w-3 mr-1" />
                Upgrade Now
              </Button>
            </div>
          )}
          
          {!isPro && hasProKey && (
            <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Enable Applaa Pro</span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                You have a Pro key but Pro features are disabled
              </p>
              <Button 
                size="sm" 
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                onClick={() => window.location.hash = '/settings/providers/auto'}
              >
                Enable Pro
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-start justify-between space-x-3">
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="spark-edits"
                  className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1 ${!isPro ? 'text-gray-400' : ''}`}
                >
                  <Zap className="h-3 w-3" />
                  Spark Edits
                  {!isPro && <Lock className="h-3 w-3 text-gray-400" />}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Lightning-fast, efficient code edits
                </p>
              </div>
              <Switch
                id="spark-edits"
                checked={isPro && (settings?.enableProLazyEditsMode || false)}
                onCheckedChange={toggleSparkEdits}
                disabled={!isPro}
              />
            </div>

            <div className="flex items-start justify-between space-x-3">
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="spark-context"
                  className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1 ${!isPro ? 'text-gray-400' : ''}`}
                >
                  <Sparkles className="h-3 w-3" />
                  Spark Context
                  {!isPro && <Lock className="h-3 w-3 text-gray-400" />}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Smart context optimization
                </p>
              </div>
              <Switch
                id="spark-context"
                checked={isPro && (settings?.enableProSmartFilesContextMode || false)}
                onCheckedChange={toggleSparkContext}
                disabled={!isPro}
              />
            </div>

            <div className="flex items-start justify-between space-x-3">
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="semantic-context"
                  className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1 ${!isPro ? 'text-gray-400' : ''}`}
                >
                  <Brain className="h-3 w-3 text-purple-500" />
                  SQLite Vector AI
                  {!isPro && <Lock className="h-3 w-3 text-gray-400" />}
                </Label>
                <p className="text-xs text-muted-foreground">
                  World-first: Local AI transformers + SQLite vectors
                </p>
              </div>
              <Switch
                id="semantic-context"
                checked={isPro && (settings?.semanticContextEnabled ?? false)}
                onCheckedChange={toggleSemanticContext}
                disabled={!isPro}
              />
            </div>
          </div>

          <div className="text-xs text-muted-foreground border-t pt-3">
            <p className="mb-2">
              {isPro ? (
                <>💎 <strong>Pro:</strong> Spark features reduce costs and improve speed</>
              ) : (
                <>🔒 <strong>Upgrade:</strong> Unlock advanced AI capabilities</>
              )}
            </p>
            <p className="text-purple-600">
              🌟 <strong>World-First:</strong> SQLite Vector + Local AI Transformers technology
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
