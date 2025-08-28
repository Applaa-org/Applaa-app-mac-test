import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useState } from "react";
import { ImportAppDialog } from "./ImportAppDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ImportAppIcon() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="h-8 px-3 gap-1.5"
          >
            <Upload className="h-4 w-4" />
            <span className="text-xs">Import App</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Import App</TooltipContent>
      </Tooltip>
      <ImportAppDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
