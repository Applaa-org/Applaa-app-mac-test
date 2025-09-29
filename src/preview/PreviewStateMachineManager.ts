/**
 * 🔄 STATE MACHINE MANAGER
 * 
 * Inspired by Quests' XState integration
 * Provides robust state management for preview operations
 */

import { createMachine, assign, interpret, StateValue } from 'xstate';

export interface PreviewStateMachineContext {
  appId: number;
  appType: string;
  phase: string;
  progress: number;
  error?: string;
  resources?: any;
  metadata?: any;
}

export interface PreviewStateMachineEvent {
  type: 'START' | 'STOP' | 'SUSPEND' | 'RESUME' | 'ERROR' | 'COMPLETE' | 'PROGRESS';
  payload?: any;
}

/**
 * Preview State Machine - XState integration inspired by Quests
 * 
 * Provides robust state management with:
 * - Predictable state transitions
 * - Error handling and recovery
 * - Resource management
 * - Progress tracking
 */
export class PreviewStateMachineManager {
  private static instance: PreviewStateMachineManager;
  private machines = new Map<number, any>();
  
  private previewMachine = createMachine<PreviewStateMachineContext, PreviewStateMachineEvent>({
    id: 'preview',
    initial: 'idle',
    context: {
      appId: 0,
      appType: '',
      phase: 'idle',
      progress: 0,
    },
    states: {
      idle: {
        on: {
          START: {
            target: 'initializing',
            actions: assign({
              phase: 'initializing',
              progress: 0,
            }),
          },
        },
      },
      initializing: {
        on: {
          PROGRESS: {
            target: 'initializing',
            actions: assign({
              progress: (context, event) => event.payload?.progress || context.progress,
            }),
          },
          COMPLETE: {
            target: 'preparing',
            actions: assign({
              phase: 'preparing',
              progress: 25,
            }),
          },
          ERROR: {
            target: 'error',
            actions: assign({
              error: (context, event) => event.payload?.error,
            }),
          },
        },
      },
      preparing: {
        on: {
          PROGRESS: {
            target: 'preparing',
            actions: assign({
              progress: (context, event) => event.payload?.progress || context.progress,
            }),
          },
          COMPLETE: {
            target: 'building',
            actions: assign({
              phase: 'building',
              progress: 50,
            }),
          },
          ERROR: {
            target: 'error',
            actions: assign({
              error: (context, event) => event.payload?.error,
            }),
          },
        },
      },
      building: {
        on: {
          PROGRESS: {
            target: 'building',
            actions: assign({
              progress: (context, event) => event.payload?.progress || context.progress,
            }),
          },
          COMPLETE: {
            target: 'ready',
            actions: assign({
              phase: 'ready',
              progress: 100,
            }),
          },
          ERROR: {
            target: 'error',
            actions: assign({
              error: (context, event) => event.payload?.error,
            }),
          },
        },
      },
      ready: {
        on: {
          SUSPEND: {
            target: 'suspended',
            actions: assign({
              phase: 'suspended',
            }),
          },
          STOP: {
            target: 'idle',
            actions: assign({
              phase: 'idle',
              progress: 0,
            }),
          },
          ERROR: {
            target: 'error',
            actions: assign({
              error: (context, event) => event.payload?.error,
            }),
          },
        },
      },
      suspended: {
        on: {
          RESUME: {
            target: 'ready',
            actions: assign({
              phase: 'ready',
            }),
          },
          STOP: {
            target: 'idle',
            actions: assign({
              phase: 'idle',
              progress: 0,
            }),
          },
        },
      },
      error: {
        on: {
          START: {
            target: 'initializing',
            actions: assign({
              phase: 'initializing',
              progress: 0,
              error: undefined,
            }),
          },
          STOP: {
            target: 'idle',
            actions: assign({
              phase: 'idle',
              progress: 0,
              error: undefined,
            }),
          },
        },
      },
    },
  });
  
  constructor() {
    // Initialize the state machine manager
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): PreviewStateMachineManager {
    if (!PreviewStateMachineManager.instance) {
      PreviewStateMachineManager.instance = new PreviewStateMachineManager();
    }
    return PreviewStateMachineManager.instance;
  }
  
  /**
   * Create state machine for an app
   */
  public createMachineForApp(appId: number, appType: string): any {
    const machine = interpret(this.previewMachine.withContext({
      appId,
      appType,
      phase: 'idle',
      progress: 0,
    }));
    
    this.machines.set(appId, machine);
    machine.start();
    
    return machine;
  }
  
  /**
   * Send event to app's state machine
   */
  public sendEvent(appId: number, event: PreviewStateMachineEvent): void {
    const machine = this.machines.get(appId);
    if (machine) {
      machine.send(event);
    }
  }
  
  /**
   * Get current state of app's state machine
   */
  public getCurrentState(appId: number): StateValue | null {
    const machine = this.machines.get(appId);
    return machine ? machine.state.value : null;
  }
  
  /**
   * Get current context of app's state machine
   */
  public getCurrentContext(appId: number): PreviewStateMachineContext | null {
    const machine = this.machines.get(appId);
    return machine ? machine.state.context : null;
  }
  
  /**
   * Stop state machine for an app
   */
  public stopMachineForApp(appId: number): void {
    const machine = this.machines.get(appId);
    if (machine) {
      machine.stop();
      this.machines.delete(appId);
    }
  }
  
  /**
   * Get all active state machines
   */
  public getActiveMachines(): Map<number, any> {
    return new Map(this.machines);
  }
}

/**
 * Get singleton state machine manager instance
 */
export function getPreviewStateMachineManager(): PreviewStateMachineManager {
  return PreviewStateMachineManager.getInstance();
}


