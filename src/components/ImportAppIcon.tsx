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
            className="w-8 h-8 p-0 flex items-center justify-center bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-purple-500 shadow-md"
          >
            <Upload className="h-4 w-4" />
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
