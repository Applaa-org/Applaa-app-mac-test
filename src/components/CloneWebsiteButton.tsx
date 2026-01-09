import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CloneWebsiteButtonProps {
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function CloneWebsiteButton({
  isActive,
  onClick,
  disabled = false,
}: CloneWebsiteButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className={`flex items-center gap-1 h-8 px-1 text-xs !bg-white hover:!bg-blue-50 !text-blue-700 hover:!text-blue-700 border-blue-300 shadow-sm ${
            isActive ? "!bg-blue-100 border-blue-500" : ""
          }`}
        >
          <Copy className="h-2.5 w-2.5 text-blue-600" />
          <span className="text-xs text-blue-700">Clone a website</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isActive
          ? "Enter the website URL or name to clone"
          : "Clone an existing website"}
      </TooltipContent>
    </Tooltip>
  );
}

