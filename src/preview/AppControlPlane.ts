/**
 * 🎮 APP CONTROL PLANE
 * 
 * Lightweight injection and communication system for user apps
 * Inspired by @quests/shim-client - minimal overhead per app instance
 */

import { EventEmitter } from 'events';
import { AppType, AppState } from './types';

export interface ControlMessage {
  type: 'ping' | 'pong' | 'status' | 'metrics' | 'command' | 'response';
  payload?: any;
  timestamp: number;
  id: string;
}

export interface AppMetrics {
  appId: string;
  memory: number;
  cpu: number;
  network: number;
  errors: number;
  uptime: number;
  lastActivity: number;
  healthScore: number;
}

export interface InjectionConfig {
  enableMetrics: boolean;
  enableCommands: boolean;
  enableHealthCheck: boolean;
  metricsInterval: number;
  healthCheckInterval: number;
  commandTimeout: number;
}

export interface AppControlPlaneState {
  appId: string;
  isInjected: boolean;
  lastPing: number;
  metrics: AppMetrics | null;
  commands: Map<string, any>;
  listeners: Map<string, Function[]>;
}

/**
 * AppControlPlane - Lightweight control plane for user apps
 * 
 * Provides:
 * - Minimal iframe injection
 * - Bidirectional communication
 * - Real-time monitoring
 * - Command execution
 * - Health checking
 */
export class AppControlPlane extends EventEmitter {
  private static instance: AppControlPlane;
  
  private config: InjectionConfig;
  private appStates = new Map<string, AppControlPlaneState>();
  private injectionScript: string;
  private metricsInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  constructor(config: Partial<InjectionConfig> = {}) {
    super();
    
    this.config = {
      enableMetrics: true,
      enableCommands: true,
      enableHealthCheck: true,
      metricsInterval: 5000, // 5 seconds
      healthCheckInterval: 30000, // 30 seconds
      commandTimeout: 10000, // 10 seconds
      ...config
    };
    
    this.injectionScript = this.generateInjectionScript();
    this.startMonitoring();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<InjectionConfig>): AppControlPlane {
    if (!AppControlPlane.instance) {
      AppControlPlane.instance = new AppControlPlane(config);
    }
    return AppControlPlane.instance;
  }
  
  /**
   * Inject control plane into an app's iframe
   */
  public inject(appId: string, iframe: HTMLIFrameElement): void {
    console.log(`🎮 Injecting control plane into app ${appId}`);
    
    try {
      // Create app state
      const appState: AppControlPlaneState = {
        appId,
        isInjected: false,
        lastPing: 0,
        metrics: null,
        commands: new Map(),
        listeners: new Map()
      };
      
      this.appStates.set(appId, appState);
      
      // Wait for iframe to load
      iframe.addEventListener('load', () => {
        this.performInjection(appId, iframe);
      });
      
      // If iframe is already loaded
      if (iframe.contentDocument?.readyState === 'complete') {
        this.performInjection(appId, iframe);
      }
      
    } catch (error) {
      console.error(`❌ Failed to inject control plane into app ${appId}:`, error);
      this.emit('injection:failed', { appId, error });
    }
  }
  
  /**
   * Perform the actual injection
   */
  private performInjection(appId: string, iframe: HTMLIFrameElement): void {
    try {
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) {
        throw new Error('Cannot access iframe document');
      }
      
      // Create script element
      const script = iframeDoc.createElement('script');
      script.textContent = this.injectionScript.replace('{{APP_ID}}', appId);
      
      // Inject into iframe
      iframeDoc.head.appendChild(script);
      
      // Mark as injected
      const appState = this.appStates.get(appId);
      if (appState) {
        appState.isInjected = true;
        appState.lastPing = Date.now();
      }
      
      console.log(`✅ Control plane injected into app ${appId}`);
      this.emit('injection:success', { appId });
      
    } catch (error) {
      console.error(`❌ Injection failed for app ${appId}:`, error);
      this.emit('injection:failed', { appId, error });
    }
  }
  
  /**
   * Communicate with an app
   */
  public async communicate(appId: string, message: ControlMessage): Promise<any> {
    const appState = this.appStates.get(appId);
    if (!appState || !appState.isInjected) {
      throw new Error(`App ${appId} is not injected or not available`);
    }
    
    console.log(`📡 Communicating with app ${appId}:`, message.type);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Communication timeout for app ${appId}`));
      }, this.config.commandTimeout);
      
      // Store the promise resolver
      appState.commands.set(message.id, { resolve, reject, timeout });
      
      // Send message to iframe
      this.sendMessageToIframe(appId, message);
    });
  }
  
  /**
   * Monitor an app's metrics
   */
  public monitor(appId: string): AppMetrics | null {
    const appState = this.appStates.get(appId);
    return appState?.metrics || null;
  }
  
  /**
   * Cleanup an app's control plane
   */
  public cleanup(appId: string): void {
    console.log(`🧹 Cleaning up control plane for app ${appId}`);
    
    const appState = this.appStates.get(appId);
    if (appState) {
      // Clear all pending commands
      for (const [id, command] of appState.commands.entries()) {
        clearTimeout(command.timeout);
        command.reject(new Error('App cleanup'));
      }
      
      // Remove app state
      this.appStates.delete(appId);
    }
    
    this.emit('cleanup:complete', { appId });
  }
  
  /**
   * Send message to iframe
   */
  private sendMessageToIframe(appId: string, message: ControlMessage): void {
    // This would typically use postMessage API
    // For now, simulate the communication
    console.log(`📤 Sending message to app ${appId}:`, message);
    
    // Simulate response after a short delay
    setTimeout(() => {
      this.handleMessageFromIframe(appId, {
        type: 'response',
        payload: { success: true, data: 'Simulated response' },
        timestamp: Date.now(),
        id: message.id
      });
    }, 100);
  }
  
  /**
   * Handle message from iframe
   */
  private handleMessageFromIframe(appId: string, message: ControlMessage): void {
    console.log(`📥 Received message from app ${appId}:`, message.type);
    
    const appState = this.appStates.get(appId);
    if (!appState) {
      return;
    }
    
    // Update last ping
    appState.lastPing = Date.now();
    
    // Handle different message types
    switch (message.type) {
      case 'pong':
        this.handlePong(appId, message);
        break;
      case 'metrics':
        this.handleMetrics(appId, message);
        break;
      case 'response':
        this.handleResponse(appId, message);
        break;
      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }
  
  /**
   * Handle pong message
   */
  private handlePong(appId: string, message: ControlMessage): void {
    this.emit('app:pong', { appId, timestamp: message.timestamp });
  }
  
  /**
   * Handle metrics message
   */
  private handleMetrics(appId: string, message: ControlMessage): void {
    const appState = this.appStates.get(appId);
    if (appState && message.payload) {
      appState.metrics = {
        appId,
        memory: message.payload.memory || 0,
        cpu: message.payload.cpu || 0,
        network: message.payload.network || 0,
        errors: message.payload.errors || 0,
        uptime: message.payload.uptime || 0,
        lastActivity: message.payload.lastActivity || Date.now(),
        healthScore: this.calculateHealthScore(message.payload)
      };
      
      this.emit('app:metrics', { appId, metrics: appState.metrics });
    }
  }
  
  /**
   * Handle response message
   */
  private handleResponse(appId: string, message: ControlMessage): void {
    const appState = this.appStates.get(appId);
    if (appState) {
      const command = appState.commands.get(message.id);
      if (command) {
        clearTimeout(command.timeout);
        command.resolve(message.payload);
        appState.commands.delete(message.id);
      }
    }
  }
  
  /**
   * Calculate health score from metrics
   */
  private calculateHealthScore(metrics: any): number {
    let score = 100;
    
    // Deduct for high memory usage
    if (metrics.memory > 500) score -= 20;
    if (metrics.memory > 1000) score -= 30;
    
    // Deduct for high CPU usage
    if (metrics.cpu > 0.8) score -= 15;
    if (metrics.cpu > 1.0) score -= 25;
    
    // Deduct for errors
    score -= metrics.errors * 5;
    
    // Deduct for long uptime without activity
    const inactivityTime = Date.now() - metrics.lastActivity;
    if (inactivityTime > 300000) score -= 10; // 5 minutes
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Generate injection script
   */
  private generateInjectionScript(): string {
    return `
      (function() {
        const APP_ID = '{{APP_ID}}';
        const CONTROL_PLANE_VERSION = '1.0.0';
        
        // Control plane state
        let isInitialized = false;
        let metricsInterval = null;
        let healthCheckInterval = null;
        let lastActivity = Date.now();
        
        // Initialize control plane
        function initialize() {
          if (isInitialized) return;
          
          console.log('🎮 Control plane initialized for app', APP_ID);
          
          // Set up message listener
          window.addEventListener('message', handleMessage);
          
          // Set up activity tracking
          ['click', 'keydown', 'mousemove', 'scroll'].forEach(event => {
            document.addEventListener(event, () => {
              lastActivity = Date.now();
            });
          });
          
          // Start monitoring
          startMetricsCollection();
          startHealthCheck();
          
          // Send initialization message
          sendMessage({
            type: 'pong',
            payload: { 
              appId: APP_ID, 
              version: CONTROL_PLANE_VERSION,
              initialized: true 
            },
            timestamp: Date.now(),
            id: generateId()
          });
          
          isInitialized = true;
        }
        
        // Handle incoming messages
        function handleMessage(event) {
          if (event.data && event.data.type) {
            const message = event.data;
            
            switch (message.type) {
              case 'ping':
                sendMessage({
                  type: 'pong',
                  payload: { appId: APP_ID },
                  timestamp: Date.now(),
                  id: message.id
                });
                break;
                
              case 'command':
                handleCommand(message);
                break;
                
              case 'request-metrics':
                sendMetrics();
                break;
            }
          }
        }
        
        // Handle commands
        function handleCommand(message) {
          try {
            const result = executeCommand(message.payload);
            sendMessage({
              type: 'response',
              payload: { success: true, result },
              timestamp: Date.now(),
              id: message.id
            });
          } catch (error) {
            sendMessage({
              type: 'response',
              payload: { success: false, error: error.message },
              timestamp: Date.now(),
              id: message.id
            });
          }
        }
        
        // Execute command
        function executeCommand(command) {
          switch (command.type) {
            case 'get-info':
              return {
                appId: APP_ID,
                url: window.location.href,
                title: document.title,
                readyState: document.readyState
              };
              
            case 'get-metrics':
              return getCurrentMetrics();
              
            case 'ping':
              return { pong: true, timestamp: Date.now() };
              
            default:
              throw new Error('Unknown command: ' + command.type);
          }
        }
        
        // Start metrics collection
        function startMetricsCollection() {
          metricsInterval = setInterval(() => {
            sendMetrics();
          }, 5000);
        }
        
        // Send metrics
        function sendMetrics() {
          const metrics = getCurrentMetrics();
          sendMessage({
            type: 'metrics',
            payload: metrics,
            timestamp: Date.now(),
            id: generateId()
          });
        }
        
        // Get current metrics
        function getCurrentMetrics() {
          return {
            memory: performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0,
            cpu: 0, // Would need more sophisticated CPU monitoring
            network: 0, // Would need network monitoring
            errors: window.console.error ? window.console.error.count || 0 : 0,
            uptime: Date.now() - performance.timing.navigationStart,
            lastActivity: lastActivity,
            readyState: document.readyState,
            url: window.location.href
          };
        }
        
        // Start health check
        function startHealthCheck() {
          healthCheckInterval = setInterval(() => {
            // Simple health check - ensure we can still communicate
            sendMessage({
              type: 'pong',
              payload: { appId: APP_ID, healthCheck: true },
              timestamp: Date.now(),
              id: generateId()
            });
          }, 30000);
        }
        
        // Send message to parent
        function sendMessage(message) {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(message, '*');
          }
        }
        
        // Generate unique ID
        function generateId() {
          return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initialize);
        } else {
          initialize();
        }
      })();
    `;
  }
  
  /**
   * Start monitoring intervals
   */
  private startMonitoring(): void {
    // Metrics collection interval
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);
    
    // Health check interval
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }
  
  /**
   * Collect metrics from all apps
   */
  private collectMetrics(): void {
    for (const [appId, appState] of this.appStates.entries()) {
      if (appState.isInjected) {
        this.communicate(appId, {
          type: 'command',
          payload: { type: 'request-metrics' },
          timestamp: Date.now(),
          id: `metrics_${Date.now()}`
        }).catch(error => {
          console.warn(`Failed to collect metrics from app ${appId}:`, error);
        });
      }
    }
  }
  
  /**
   * Perform health check on all apps
   */
  private performHealthCheck(): void {
    const now = Date.now();
    
    for (const [appId, appState] of this.appStates.entries()) {
      if (appState.isInjected) {
        // Check if app is responsive
        const timeSinceLastPing = now - appState.lastPing;
        if (timeSinceLastPing > this.config.healthCheckInterval * 2) {
          console.warn(`⚠️ App ${appId} appears unresponsive`);
          this.emit('app:unresponsive', { appId, timeSinceLastPing });
        }
        
        // Send ping
        this.communicate(appId, {
          type: 'command',
          payload: { type: 'ping' },
          timestamp: now,
          id: `ping_${now}`
        }).catch(error => {
          console.warn(`Health check failed for app ${appId}:`, error);
        });
      }
    }
  }
  
  /**
   * Shutdown the control plane
   */
  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down AppControlPlane...');
    
    // Clear intervals
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Cleanup all apps
    for (const appId of this.appStates.keys()) {
      this.cleanup(appId);
    }
    
    console.log('✅ AppControlPlane shutdown complete');
  }
}

/**
 * Get singleton app control plane instance
 */
export function getAppControlPlane(config?: Partial<InjectionConfig>): AppControlPlane {
  return AppControlPlane.getInstance(config);
}











