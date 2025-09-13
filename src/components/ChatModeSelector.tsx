import {
  MiniSelectTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSettings } from "@/hooks/useSettings";
import type { ChatMode } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { Hammer, MessageCircleQuestion, ChevronDown } from "lucide-react";

export function ChatModeSelector() {
  const { settings, updateSettings } = useSettings();

  const selectedMode = settings?.selectedChatMode || "build";

  const handleModeChange = (value: string) => {
    updateSettings({ selectedChatMode: value as ChatMode });
  };

  const getModeDisplayName = (mode: ChatMode) => {
    switch (mode) {
      case "build":
        return "Build";
      case "ask":
        return "Ask";
      default:
        return "Build";
    }
  };

  return (
    <Select value={selectedMode} onValueChange={handleModeChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <MiniSelectTrigger
            data-testid="chat-mode-selector"
            className={cn(
              "h-6 w-fit px-1 py-0 text-xs font-medium shadow-none gap-0.5",
              selectedMode === "build"
                ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-orange-500 shadow-sm"
                : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-green-500 shadow-sm",
            )}
            size="sm"
          >
            <div className="flex items-center gap-0.5">
              {selectedMode === "build" ? (
                <Hammer className="h-2.5 w-2.5" />
              ) : (
                <MessageCircleQuestion className="h-2.5 w-2.5" />
              )}
              <SelectValue>{getModeDisplayName(selectedMode)}</SelectValue>
              <ChevronDown className="h-2 w-2 opacity-70" />
            </div>
          </MiniSelectTrigger>
        </TooltipTrigger>
        <TooltipContent>Open mode menu</TooltipContent>
      </Tooltip>
      <SelectContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <SelectItem value="build">
          <div className="flex items-start gap-2">
            <Hammer className="h-4 w-4 mt-0.5 text-orange-500" />
            <div className="flex flex-col items-start">
              <span className="font-medium">Build</span>
              <span className="text-xs text-muted-foreground">
                Generate and edit code
              </span>
            </div>
          </div>
        </SelectItem>
        <SelectItem value="ask">
          <div className="flex items-start gap-2">
            <MessageCircleQuestion className="h-4 w-4 mt-0.5 text-green-500" />
            <div className="flex flex-col items-start">
              <span className="font-medium">Ask</span>
              <span className="text-xs text-muted-foreground">
                Ask questions about the app
              </span>
            </div>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
