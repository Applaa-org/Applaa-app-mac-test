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
import { Sparkles, Crown } from "lucide-react";
import { useApplaaPro } from "@/hooks/useApplaaPro";

export function ProModeSelector() {
  const { isPro, redirectToSubscribe } = useApplaaPro();

  // ✅ SIMPLIFIED: Pro tier is now subscription-based only
  // Spark features (Lazy Edits, Smart Context) have been removed
  // as they depended on the Applaa gateway infrastructure

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (!isPro) {
              redirectToSubscribe();
            }
          }}
          className={`has-[>svg]:px-1.5 flex items-center gap-1.5 h-8 ${
            isPro 
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-purple-500' 
              : 'border-gray-300 hover:bg-gray-100'
          } shadow-md transition-all`}
        >
          {isPro ? (
            <>
              <Crown className="h-4 w-4 text-white" />
              <span className="text-white font-medium text-xs-sm">Pro</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span className="font-medium text-xs-sm">Upgrade</span>
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isPro 
          ? 'You have Applaa Pro - unlimited apps, deployments & more!' 
          : 'Upgrade to Pro for unlimited apps, deployments & premium features'}
      </TooltipContent>
    </Tooltip>
  );
}
