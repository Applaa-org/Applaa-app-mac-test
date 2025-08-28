import { useState, useEffect, useCallback } from "react";
import { IpcClient } from "../ipc/ipc_client";

export interface BackgroundTask {
  id: string;
  type: "app-creation" | "app-build" | "chat-stream" | "file-operation";
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number; // 0-100
  title: string;
  description?: string;
  startTime: number;
  endTime?: number;
  error?: string;
  result?: any;
  metadata?: Record<string, any>;
}

export interface TaskProgress {
  taskId: string;
  progress: number;
  status: BackgroundTask["status"];
  message?: string;
  result?: any;
  error?: string;
}

export function useBackgroundTasks() {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [runningCount, setRunningCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial tasks
  const loadTasks = useCallback(async () => {
    try {
      // Check if we're in an Electron environment
      if (typeof window === 'undefined' || !window.electronAPI) {
        console.warn("Not in Electron environment - background tasks disabled");
        setTasks([]);
        setRunningCount(0);
        setIsLoading(false);
        return;
      }

      const allTasks = await IpcClient.getInstance().getBackgroundTasks();
      const count = await IpcClient.getInstance().getRunningTasksCount();
      setTasks(allTasks);
      setRunningCount(count);
    } catch (error) {
      console.error("Failed to load background tasks:", error);
      // Set empty state on error to prevent crashes
      setTasks([]);
      setRunningCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle task updates from IPC
  const handleTaskUpdate = useCallback((update: TaskProgress) => {
    setTasks(prevTasks => {
      const existingTaskIndex = prevTasks.findIndex(task => task.id === update.taskId);
      
      if (existingTaskIndex >= 0) {
        // Update existing task
        const updatedTasks = [...prevTasks];
        updatedTasks[existingTaskIndex] = {
          ...updatedTasks[existingTaskIndex],
          status: update.status,
          progress: update.progress,
          description: update.message || updatedTasks[existingTaskIndex].description,
          result: update.result || updatedTasks[existingTaskIndex].result,
          error: update.error || updatedTasks[existingTaskIndex].error,
          endTime: (update.status === "completed" || update.status === "failed" || update.status === "cancelled") 
            ? Date.now() 
            : updatedTasks[existingTaskIndex].endTime,
        };
        return updatedTasks;
      } else {
        // Task not found, reload all tasks
        loadTasks();
        return prevTasks;
      }
    });

    // Update running count
    IpcClient.getInstance().getRunningTasksCount().then(setRunningCount).catch(console.error);
  }, [loadTasks]);

  // Setup IPC listeners
  useEffect(() => {
    loadTasks();

    // Check if we're in an Electron environment
    if (typeof window !== 'undefined' && window.electronAPI?.ipcRenderer) {
      // Listen for task updates
      const handleUpdate = (_: any, update: TaskProgress) => {
        handleTaskUpdate(update);
      };

      window.electronAPI.ipcRenderer.on("background-task:update", handleUpdate);

      return () => {
        window.electronAPI.ipcRenderer.removeListener("background-task:update", handleUpdate);
      };
    } else {
      console.warn("Electron API not available - background task updates disabled");
    }
  }, [loadTasks, handleTaskUpdate]);

  // Cancel a task
  const cancelTask = useCallback(async (taskId: string) => {
    try {
      if (typeof window === 'undefined' || !window.electronAPI) {
        console.warn("Not in Electron environment - cannot cancel task");
        return false;
      }

      const success = await IpcClient.getInstance().cancelBackgroundTask(taskId);
      if (success) {
        await loadTasks(); // Refresh tasks
      }
      return success;
    } catch (error) {
      console.error("Failed to cancel task:", error);
      return false;
    }
  }, [loadTasks]);

  // Get task by ID
  const getTask = useCallback((taskId: string) => {
    return tasks.find(task => task.id === taskId);
  }, [tasks]);

  // Get tasks by type
  const getTasksByType = useCallback((type: BackgroundTask["type"]) => {
    return tasks.filter(task => task.type === type);
  }, [tasks]);

  // Get running tasks
  const getRunningTasks = useCallback(() => {
    return tasks.filter(task => task.status === "running");
  }, [tasks]);

  // Get completed tasks
  const getCompletedTasks = useCallback(() => {
    return tasks.filter(task => task.status === "completed");
  }, [tasks]);

  // Get failed tasks
  const getFailedTasks = useCallback(() => {
    return tasks.filter(task => task.status === "failed");
  }, [tasks]);

  // Clean up old tasks
  const cleanupOldTasks = useCallback(async (maxAge?: number) => {
    try {
      const cleaned = await IpcClient.getInstance().cleanupBackgroundTasks(maxAge);
      if (cleaned > 0) {
        await loadTasks(); // Refresh tasks
      }
      return cleaned;
    } catch (error) {
      console.error("Failed to cleanup tasks:", error);
      return 0;
    }
  }, [loadTasks]);

  // Refresh tasks
  const refresh = useCallback(() => {
    return loadTasks();
  }, [loadTasks]);

  return {
    tasks,
    runningCount,
    isLoading,
    cancelTask,
    getTask,
    getTasksByType,
    getRunningTasks,
    getCompletedTasks,
    getFailedTasks,
    cleanupOldTasks,
    refresh,
  };
}

// Hook for a specific task
export function useBackgroundTask(taskId: string) {
  const { tasks, cancelTask, refresh } = useBackgroundTasks();
  const task = tasks.find(t => t.id === taskId);

  const cancel = useCallback(() => {
    return cancelTask(taskId);
  }, [taskId, cancelTask]);

  return {
    task,
    cancel,
    refresh,
    isRunning: task?.status === "running",
    isCompleted: task?.status === "completed",
    isFailed: task?.status === "failed",
    isCancelled: task?.status === "cancelled",
    progress: task?.progress || 0,
  };
}
