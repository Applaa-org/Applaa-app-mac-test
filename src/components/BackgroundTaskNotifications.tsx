import React from "react";
import { useBackgroundTasks } from "../hooks/useBackgroundTasks";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  X, 
  AlertTriangle,
  Play,
  Pause
} from "lucide-react";
import { cn } from "../lib/utils";

interface BackgroundTaskNotificationsProps {
  className?: string;
  showCompleted?: boolean;
  maxTasks?: number;
}

export function BackgroundTaskNotifications({ 
  className, 
  showCompleted = false, 
  maxTasks = 5 
}: BackgroundTaskNotificationsProps) {
  try {
    const { tasks, runningCount, cancelTask } = useBackgroundTasks();

  // Filter tasks based on preferences
  const visibleTasks = tasks
    .filter(task => {
      if (task.status === "running" || task.status === "pending") return true;
      if (showCompleted && (task.status === "completed" || task.status === "failed")) return true;
      return false;
    })
    .sort((a, b) => b.startTime - a.startTime) // Most recent first
    .slice(0, maxTasks);

  if (visibleTasks.length === 0) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "cancelled":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "cancelled":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "pending":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDuration = (startTime: number, endTime?: number) => {
    const duration = (endTime || Date.now()) - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className={cn("space-y-2", className)}>
      {runningCount > 0 && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">
            Background Tasks ({runningCount} running)
          </h3>
        </div>
      )}
      
      {visibleTasks.map((task) => (
        <Card key={task.id} className="border-l-4 border-l-blue-500">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {getStatusIcon(task.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {task.title}
                    </h4>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getStatusColor(task.status))}
                    >
                      {task.status}
                    </Badge>
                  </div>
                  
                  {task.description && (
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {task.description}
                    </p>
                  )}
                  
                  {task.status === "running" && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <Progress value={task.progress} className="h-1" />
                    </div>
                  )}
                  
                  {task.error && (
                    <p className="text-xs text-red-600 mt-1 truncate">
                      Error: {task.error}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {formatDuration(task.startTime, task.endTime)}
                    </span>
                    
                    {task.status === "running" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelTask(task.id)}
                        className="h-6 px-2 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
  } catch (error) {
    console.error("BackgroundTaskNotifications error:", error);
    return null; // Fail silently to prevent UI crashes
  }
}

// Compact version for status bar
export function BackgroundTaskStatusBar() {
  try {
    const { runningCount, getRunningTasks } = useBackgroundTasks();

    if (runningCount === 0) {
      return null;
    }

    const runningTasks = getRunningTasks();
    const primaryTask = runningTasks[0];

    return (
      <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 border-l-2 border-blue-500 text-sm">
        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
        <span className="text-blue-700 font-medium">
          {runningCount === 1 ? (
            <>
              {primaryTask?.title} ({primaryTask?.progress || 0}%)
            </>
          ) : (
            <>
              {runningCount} tasks running
            </>
          )}
        </span>
      </div>
    );
  } catch (error) {
    console.error("BackgroundTaskStatusBar error:", error);
    return null; // Fail silently to prevent UI crashes
  }
}
