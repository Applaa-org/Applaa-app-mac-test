import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageSquareText, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SavedTutorChat } from "@/lib/appyTutorChatsStorage";

const MENU_Z = "z-[400]";

export function AppyTutorChatsPicker({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  fullWidth,
}: {
  chats: SavedTutorChat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  fullWidth?: boolean;
}) {
  const active = chats.find((c) => c.id === activeChatId);
  const label = active?.title ?? "Your chats";
  const sorted = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          title={label}
          className={cn(
            "h-8 gap-1.5 border-gray-300 bg-white text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-100 dark:hover:bg-gray-800",
            fullWidth
              ? "w-full max-w-none justify-between px-2.5 text-xs font-normal"
              : "justify-start px-2 text-xs",
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <MessageSquareText className="h-3.5 w-3.5 shrink-0 opacity-80" />
            <span className="truncate font-medium text-left">{label}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn("w-[min(20rem,calc(100vw-2rem))] max-h-[min(20rem,55vh)] overflow-y-auto", MENU_Z)}
        align={fullWidth ? "start" : "end"}
        sideOffset={4}
        collisionPadding={12}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel className="text-xs">Your chats</DropdownMenuLabel>
        <DropdownMenuItem
          className="gap-2 text-xs font-medium cursor-pointer"
          onSelect={() => onNewChat()}
        >
          <Plus className="h-3.5 w-3.5" />
          New chat
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {sorted.length === 0 ? (
          <div className="text-xs text-muted-foreground px-2 py-2">
            No chats yet — send a message to start.
          </div>
        ) : (
          sorted.map((c) => (
            <DropdownMenuItem
              key={c.id}
              className={cn(
                "flex flex-col items-start gap-0.5 text-xs cursor-pointer",
                c.id === activeChatId && "bg-secondary",
              )}
              onSelect={() => onSelectChat(c.id)}
            >
              <span className="font-medium truncate w-full">{c.title}</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(c.updatedAt).toLocaleString(undefined, {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
