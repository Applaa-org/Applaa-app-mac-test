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
import { Zap, ChevronDown, Sparkles } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

export function SparkModeSelector() {
  const { settings, updateSettings } = useSettings();

  const toggleSparkEdits = () => {
    updateSettings({
      enableSparkEditsMode: !settings?.enableSparkEditsMode,
    });
  };

  const toggleSparkContext = () => {
    updateSettings({
      enableSparkContextMode: !settings?.enableSparkContextMode,
    });
  };

  const isAnySparkEnabled = settings?.enableSparkEditsMode || settings?.enableSparkContextMode;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`has-[>svg]:px-1.5 flex items-center gap-1.5 h-8 transition-all ${
                isAnySparkEnabled
                  ? "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white border-yellow-500 shadow-md"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-300"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span className="font-medium text-xs-sm">Spark</span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Configure Applaa Spark features</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80 border-yellow-200">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-medium flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-600 font-medium">Applaa Spark</span>
            </h4>
            <div className="h-px bg-gradient-to-r from-yellow-500/50 via-yellow-500/20 to-transparent" />
            <p className="text-xs text-muted-foreground">
              AI efficiency features for faster development
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start justify-between space-x-3">
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="spark-edits"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Spark Edits
                </Label>
                <p className="text-xs text-muted-foreground">
                  Makes file edits faster and cheaper
                </p>
              </div>
              <Switch
                id="spark-edits"
                checked={settings?.enableSparkEditsMode ?? false}
                onCheckedChange={toggleSparkEdits}
              />
            </div>

            <div className="flex items-start justify-between space-x-3">
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="spark-context"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Spark Context
                </Label>
                <p className="text-xs text-muted-foreground">
                  Optimizes your AI's code context
                </p>
              </div>
              <Switch
                id="spark-context"
                checked={settings?.enableSparkContextMode ?? false}
                onCheckedChange={toggleSparkContext}
              />
            </div>
          </div>

          <div className="text-xs text-muted-foreground border-t pt-3">
            <p>
              💡 <strong>Tip:</strong> Spark features reduce LLM costs and improve response speed
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
