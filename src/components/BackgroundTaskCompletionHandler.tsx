import { useEffect } from "react";
import { useBackgroundTasks } from "../hooks/useBackgroundTasks";
import { useStreamChat } from "../hooks/useStreamChat";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

/**
 * Component that handles background task completions and triggers appropriate actions
 */
export function BackgroundTaskCompletionHandler() {
  const { tasks } = useBackgroundTasks();
  const { streamMessage } = useStreamChat({ hasChatId: false });
  const navigate = useNavigate();

  useEffect(() => {
    // Find recently completed app creation tasks
    const completedAppTasks = tasks.filter(
      task => 
        task.type === "app-creation" && 
        task.status === "completed" && 
        task.result &&
        task.endTime &&
        (Date.now() - task.endTime) < 5000 // Within last 5 seconds
    );

    completedAppTasks.forEach(task => {
      const result = task.result;
      
      if (result.shouldStartChat && result.prompt && result.chatId > 0) {
        console.log(`[BackgroundTaskHandler] Starting chat for completed app creation task ${task.id}`);
        
        try {
          // Start the chat streaming
          streamMessage({
            prompt: result.prompt,
            chatId: result.chatId,
            attachments: result.attachments || [],
          });

          // Show success notification
          toast.success(`App "${task.metadata?.appName}" created successfully!`, {
            description: "AI is now processing your request...",
            action: {
              label: "View Chat",
              onClick: () => navigate({ to: "/chat", search: { id: result.chatId } })
            }
          });

          console.log(`[BackgroundTaskHandler] Started chat streaming for app ${result.app.id}, chat ${result.chatId}`);
        } catch (error) {
          console.error(`[BackgroundTaskHandler] Failed to start chat streaming:`, error);
          
          // Still show success for app creation, but mention chat issue
          toast.success(`App "${task.metadata?.appName}" created successfully!`, {
            description: "However, there was an issue starting the AI chat. You can manually start a chat in the app.",
            action: {
              label: "View App",
              onClick: () => navigate({ to: "/app-details", search: { appId: result.app.id } })
            }
          });
        }
      } else if (task.status === "completed") {
        // App created without chat prompt
        toast.success(`App "${task.metadata?.appName}" created successfully!`, {
          action: {
            label: "View App",
            onClick: () => navigate({ to: "/app-details", search: { appId: result.app.id } })
          }
        });
      }
    });

    // Handle failed tasks
    const failedAppTasks = tasks.filter(
      task => 
        task.type === "app-creation" && 
        task.status === "failed" && 
        task.endTime &&
        (Date.now() - task.endTime) < 5000 // Within last 5 seconds
    );

    failedAppTasks.forEach(task => {
      toast.error(`Failed to create app "${task.metadata?.appName}"`, {
        description: task.error || "Unknown error occurred",
        action: {
          label: "Try Again",
          onClick: () => navigate({ to: "/" })
        }
      });
    });

  }, [tasks, streamMessage, navigate]);

  // This component doesn't render anything
  return null;
}
