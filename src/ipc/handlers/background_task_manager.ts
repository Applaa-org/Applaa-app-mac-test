import { ipcMain } from "electron";
import { EventEmitter } from "events";
import log from "electron-log";

const logger = log.scope("background-tasks");

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

class BackgroundTaskManager extends EventEmitter {
  private tasks: Map<string, BackgroundTask> = new Map();
  private activeWorkers: Map<string, AbortController> = new Map();

  constructor() {
    super();
    this.setupIpcHandlers();
  }

  /**
   * Create a new background task
   */
  createTask(params: {
    id: string;
    type: BackgroundTask["type"];
    title: string;
    description?: string;
    metadata?: Record<string, any>;
  }): BackgroundTask {
    const task: BackgroundTask = {
      id: params.id,
      type: params.type,
      status: "pending",
      progress: 0,
      title: params.title,
      description: params.description,
      startTime: Date.now(),
      metadata: params.metadata || {},
    };

    this.tasks.set(task.id, task);
    this.emitTaskUpdate(task);
    logger.info(`Created background task: ${task.id} - ${task.title}`);
    
    return task;
  }

  /**
   * Start a background task with a worker function
   */
  async startTask<T = any>(
    taskId: string,
    workerFunction: (
      abortController: AbortController,
      updateProgress: (progress: number, message?: string) => void
    ) => Promise<T>
  ): Promise<T> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status === "running") {
      throw new Error(`Task ${taskId} is already running`);
    }

    // Create abort controller for this task
    const abortController = new AbortController();
    this.activeWorkers.set(taskId, abortController);

    // Update task status
    task.status = "running";
    task.startTime = Date.now();
    this.emitTaskUpdate(task);

    // Progress update function
    const updateProgress = (progress: number, message?: string) => {
      task.progress = Math.max(0, Math.min(100, progress));
      if (message) {
        task.description = message;
      }
      this.emitTaskUpdate(task);
    };

    try {
      logger.info(`Starting background task: ${taskId}`);
      
      // Run the worker function
      const result = await workerFunction(abortController, updateProgress);
      
      // Task completed successfully
      task.status = "completed";
      task.progress = 100;
      task.endTime = Date.now();
      task.result = result;
      
      this.emitTaskUpdate(task);
      this.activeWorkers.delete(taskId);
      
      logger.info(`Completed background task: ${taskId} in ${task.endTime - task.startTime}ms`);
      
      return result;
    } catch (error) {
      // Task failed or was cancelled
      const isAborted = abortController.signal.aborted;
      
      task.status = isAborted ? "cancelled" : "failed";
      task.progress = isAborted ? task.progress : 0;
      task.endTime = Date.now();
      task.error = (error as Error).message;
      
      this.emitTaskUpdate(task);
      this.activeWorkers.delete(taskId);
      
      if (isAborted) {
        logger.info(`Cancelled background task: ${taskId}`);
      } else {
        logger.error(`Failed background task: ${taskId}`, error);
      }
      
      throw error;
    }
  }

  /**
   * Cancel a running task
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    const abortController = this.activeWorkers.get(taskId);

    if (!task) {
      logger.warn(`Cannot cancel task ${taskId}: not found`);
      return false;
    }

    if (task.status !== "running") {
      logger.warn(`Cannot cancel task ${taskId}: not running (status: ${task.status})`);
      return false;
    }

    if (abortController) {
      abortController.abort();
      logger.info(`Cancelled background task: ${taskId}`);
      return true;
    }

    return false;
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): BackgroundTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by type
   */
  getTasksByType(type: BackgroundTask["type"]): BackgroundTask[] {
    return Array.from(this.tasks.values()).filter(task => task.type === type);
  }

  /**
   * Get running tasks
   */
  getRunningTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values()).filter(task => task.status === "running");
  }

  /**
   * Clean up old completed/failed tasks
   */
  cleanupOldTasks(maxAge: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [taskId, task] of this.tasks.entries()) {
      if (
        (task.status === "completed" || task.status === "failed" || task.status === "cancelled") &&
        task.endTime &&
        (now - task.endTime) > maxAge
      ) {
        this.tasks.delete(taskId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old background tasks`);
    }

    return cleaned;
  }

  /**
   * Emit task update to all listeners
   */
  private emitTaskUpdate(task: BackgroundTask) {
    const update: TaskProgress = {
      taskId: task.id,
      progress: task.progress,
      status: task.status,
      message: task.description,
      result: task.result,
      error: task.error,
    };

    this.emit("task-update", update);
    
    // Also emit to IPC for renderer processes
    if (global.mainWindow) {
      global.mainWindow.webContents.send("background-task:update", update);
    }
  }

  /**
   * Setup IPC handlers for renderer communication
   */
  private setupIpcHandlers() {
    // Get all tasks
    ipcMain.handle("background-tasks:list", () => {
      return this.getAllTasks();
    });

    // Get task by ID
    ipcMain.handle("background-tasks:get", (_, taskId: string) => {
      return this.getTask(taskId);
    });

    // Cancel task
    ipcMain.handle("background-tasks:cancel", (_, taskId: string) => {
      return this.cancelTask(taskId);
    });

    // Clean up old tasks
    ipcMain.handle("background-tasks:cleanup", (_, maxAge?: number) => {
      return this.cleanupOldTasks(maxAge);
    });

    // Get running tasks count
    ipcMain.handle("background-tasks:running-count", () => {
      return this.getRunningTasks().length;
    });

    logger.info("Background task manager IPC handlers registered");
  }
}

// Singleton instance
let taskManagerInstance: BackgroundTaskManager | null = null;

export function getBackgroundTaskManager(): BackgroundTaskManager {
  if (!taskManagerInstance) {
    taskManagerInstance = new BackgroundTaskManager();
  }
  return taskManagerInstance;
}

// Register handlers when this module is imported
export function registerBackgroundTaskHandlers() {
  getBackgroundTaskManager();
  logger.info("Background task manager initialized");
}
