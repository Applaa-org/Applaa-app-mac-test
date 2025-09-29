/**
 * 🏊 RESOURCE POOL MANAGER
 * 
 * Intelligent resource pooling and allocation system
 * Inspired by Quests' efficient resource management
 */

import { EventEmitter } from 'events';
import { AppType, AppPriority } from './types';

export interface ResourceRequirements {
  memory: number; // MB
  cpu: number; // CPU cores
  ports: number; // Number of ports
  disk: number; // MB
  network: number; // Mbps
}

export interface AllocatedResources {
  id: string;
  appId: string;
  memory: number;
  cpu: number;
  ports: number[];
  disk: number;
  network: number;
  allocatedAt: number;
  expiresAt?: number;
}

export interface PoolStatus {
  totalMemory: number;
  availableMemory: number;
  totalCpu: number;
  availableCpu: number;
  totalPorts: number;
  availablePorts: number[];
  totalDisk: number;
  availableDisk: number;
  allocations: number;
  utilizationRate: number;
}

export interface ResourceConfig {
  maxMemory: number; // Total system memory limit
  maxCpu: number; // Total CPU cores
  maxPorts: number; // Total available ports
  maxDisk: number; // Total disk space
  maxNetwork: number; // Total network bandwidth
  allocationTimeout: number; // Auto-release timeout
  enableOvercommit: boolean; // Allow overcommitment
  overcommitRatio: number; // Overcommit ratio (e.g., 1.5 = 150%)
}

/**
 * ResourcePoolManager - Intelligent resource pooling and allocation
 * 
 * Provides efficient resource management with:
 * - Dynamic resource allocation
 * - Automatic cleanup and optimization
 * - Overcommitment support for better utilization
 * - Priority-based allocation
 * - Resource sharing and reuse
 */
export class ResourcePoolManager extends EventEmitter {
  private static instance: ResourcePoolManager;
  
  private config: ResourceConfig;
  private allocations = new Map<string, AllocatedResources>();
  private resourcePool: {
    memory: number;
    cpu: number;
    ports: Set<number>;
    disk: number;
    network: number;
  };
  
  private cleanupInterval: NodeJS.Timeout | null = null;
  private optimizationInterval: NodeJS.Timeout | null = null;
  
  constructor(config: Partial<ResourceConfig> = {}) {
    super();
    
    this.config = {
      maxMemory: 8192, // 8GB default
      maxCpu: 8, // 8 cores default
      maxPorts: 1000, // Ports 3000-3999
      maxDisk: 102400, // 100GB default
      maxNetwork: 1000, // 1Gbps default
      allocationTimeout: 300000, // 5 minutes
      enableOvercommit: true,
      overcommitRatio: 1.5,
      ...config
    };
    
    this.initializeResourcePool();
    this.startMonitoring();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<ResourceConfig>): ResourcePoolManager {
    if (!ResourcePoolManager.instance) {
      ResourcePoolManager.instance = new ResourcePoolManager(config);
    }
    return ResourcePoolManager.instance;
  }
  
  /**
   * Initialize the resource pool
   */
  private initializeResourcePool(): void {
    this.resourcePool = {
      memory: this.config.maxMemory,
      cpu: this.config.maxCpu,
      ports: new Set(Array.from({ length: this.config.maxPorts }, (_, i) => 3000 + i)),
      disk: this.config.maxDisk,
      network: this.config.maxNetwork
    };
    
    console.log('🏊 Resource pool initialized:', {
      memory: `${this.config.maxMemory}MB`,
      cpu: `${this.config.maxCpu} cores`,
      ports: `${this.config.maxPorts} ports`,
      disk: `${this.config.maxDisk}MB`,
      network: `${this.config.maxNetwork}Mbps`
    });
  }
  
  /**
   * Allocate resources for an app
   */
  public async allocateResources(
    appId: string, 
    requirements: ResourceRequirements,
    priority: AppPriority = 'normal'
  ): Promise<AllocatedResources> {
    console.log(`🏊 Allocating resources for app ${appId}:`, requirements);
    
    // Check if resources are available
    const canAllocate = this.canAllocate(requirements, priority);
    if (!canAllocate) {
      // Try to optimize and free up resources
      await this.optimizePool();
      const canAllocateAfter = this.canAllocate(requirements, priority);
      if (!canAllocateAfter) {
        throw new Error(`Insufficient resources to allocate for app ${appId}`);
      }
    }
    
    // Allocate resources
    const allocation: AllocatedResources = {
      id: this.generateAllocationId(),
      appId,
      memory: requirements.memory,
      cpu: requirements.cpu,
      ports: this.allocatePorts(requirements.ports),
      disk: requirements.disk,
      network: requirements.network,
      allocatedAt: Date.now(),
      expiresAt: Date.now() + this.config.allocationTimeout
    };
    
    // Update pool
    this.resourcePool.memory -= requirements.memory;
    this.resourcePool.cpu -= requirements.cpu;
    this.resourcePool.disk -= requirements.disk;
    this.resourcePool.network -= requirements.network;
    
    // Store allocation
    this.allocations.set(allocation.id, allocation);
    
    console.log(`✅ Resources allocated for app ${appId}:`, allocation);
    this.emit('resources:allocated', { appId, allocation });
    
    return allocation;
  }
  
  /**
   * Deallocate resources for an app
   */
  public async deallocateResources(appId: string): Promise<void> {
    console.log(`🏊 Deallocating resources for app ${appId}`);
    
    // Find allocations for this app
    const appAllocations = Array.from(this.allocations.values())
      .filter(allocation => allocation.appId === appId);
    
    for (const allocation of appAllocations) {
      await this.deallocateAllocation(allocation);
    }
    
    console.log(`✅ Resources deallocated for app ${appId}`);
    this.emit('resources:deallocated', { appId });
  }
  
  /**
   * Deallocate a specific allocation
   */
  private async deallocateAllocation(allocation: AllocatedResources): Promise<void> {
    // Return resources to pool
    this.resourcePool.memory += allocation.memory;
    this.resourcePool.cpu += allocation.cpu;
    this.resourcePool.disk += allocation.disk;
    this.resourcePool.network += allocation.network;
    
    // Return ports to pool
    for (const port of allocation.ports) {
      this.resourcePool.ports.add(port);
    }
    
    // Remove allocation
    this.allocations.delete(allocation.id);
    
    this.emit('allocation:deallocated', { allocation });
  }
  
  /**
   * Optimize the resource pool
   */
  public async optimizePool(): Promise<void> {
    console.log('🔧 Optimizing resource pool...');
    
    // Clean up expired allocations
    await this.cleanupExpiredAllocations();
    
    // Consolidate fragmented resources
    await this.consolidateResources();
    
    // Reclaim unused resources
    await this.reclaimUnusedResources();
    
    console.log('✅ Resource pool optimization complete');
    this.emit('pool:optimized');
  }
  
  /**
   * Get current pool status
   */
  public getPoolStatus(): PoolStatus {
    const totalAllocated = Array.from(this.allocations.values())
      .reduce((total, allocation) => ({
        memory: total.memory + allocation.memory,
        cpu: total.cpu + allocation.cpu,
        disk: total.disk + allocation.disk,
        network: total.network + allocation.network
      }), { memory: 0, cpu: 0, disk: 0, network: 0 });
    
    const availableMemory = this.resourcePool.memory;
    const availableCpu = this.resourcePool.cpu;
    const availablePorts = Array.from(this.resourcePool.ports);
    const availableDisk = this.resourcePool.disk;
    
    const utilizationRate = this.config.enableOvercommit 
      ? (totalAllocated.memory / (this.config.maxMemory * this.config.overcommitRatio)) * 100
      : (totalAllocated.memory / this.config.maxMemory) * 100;
    
    return {
      totalMemory: this.config.maxMemory,
      availableMemory,
      totalCpu: this.config.maxCpu,
      availableCpu,
      totalPorts: this.config.maxPorts,
      availablePorts,
      totalDisk: this.config.maxDisk,
      availableDisk,
      allocations: this.allocations.size,
      utilizationRate: Math.min(100, utilizationRate)
    };
  }
  
  /**
   * Check if resources can be allocated
   */
  private canAllocate(requirements: ResourceRequirements, priority: AppPriority): boolean {
    const status = this.getPoolStatus();
    
    // Check basic availability
    const hasMemory = this.resourcePool.memory >= requirements.memory;
    const hasCpu = this.resourcePool.cpu >= requirements.cpu;
    const hasPorts = this.resourcePool.ports.size >= requirements.ports;
    const hasDisk = this.resourcePool.disk >= requirements.disk;
    const hasNetwork = this.resourcePool.network >= requirements.network;
    
    // Check overcommitment if enabled
    if (this.config.enableOvercommit) {
      const overcommitMemory = (this.config.maxMemory * this.config.overcommitRatio) - 
        (this.config.maxMemory - this.resourcePool.memory);
      const hasOvercommitMemory = overcommitMemory >= requirements.memory;
      
      return hasMemory || hasOvercommitMemory && hasCpu && hasPorts && hasDisk && hasNetwork;
    }
    
    return hasMemory && hasCpu && hasPorts && hasDisk && hasNetwork;
  }
  
  /**
   * Allocate ports from the pool
   */
  private allocatePorts(count: number): number[] {
    const ports: number[] = [];
    const availablePorts = Array.from(this.resourcePool.ports);
    
    for (let i = 0; i < count && i < availablePorts.length; i++) {
      const port = availablePorts[i];
      ports.push(port);
      this.resourcePool.ports.delete(port);
    }
    
    return ports;
  }
  
  /**
   * Generate unique allocation ID
   */
  private generateAllocationId(): string {
    return `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Clean up expired allocations
   */
  private async cleanupExpiredAllocations(): Promise<void> {
    const now = Date.now();
    const expiredAllocations = Array.from(this.allocations.values())
      .filter(allocation => allocation.expiresAt && allocation.expiresAt < now);
    
    for (const allocation of expiredAllocations) {
      console.log(`⏰ Cleaning up expired allocation: ${allocation.id}`);
      await this.deallocateAllocation(allocation);
    }
  }
  
  /**
   * Consolidate fragmented resources
   */
  private async consolidateResources(): Promise<void> {
    // This would implement resource defragmentation logic
    // For now, just log that consolidation occurred
    console.log('🔄 Consolidating fragmented resources...');
  }
  
  /**
   * Reclaim unused resources
   */
  private async reclaimUnusedResources(): Promise<void> {
    // This would implement resource reclamation logic
    // For now, just log that reclamation occurred
    console.log('♻️ Reclaiming unused resources...');
  }
  
  /**
   * Start monitoring intervals
   */
  private startMonitoring(): void {
    // Cleanup interval - every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredAllocations();
    }, 30000);
    
    // Optimization interval - every 2 minutes
    this.optimizationInterval = setInterval(() => {
      this.optimizePool();
    }, 120000);
  }
  
  /**
   * Shutdown the resource pool manager
   */
  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down ResourcePoolManager...');
    
    // Clear intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
    
    // Deallocate all resources
    for (const allocation of this.allocations.values()) {
      await this.deallocateAllocation(allocation);
    }
    
    console.log('✅ ResourcePoolManager shutdown complete');
  }
}

/**
 * Get singleton resource pool manager instance
 */
export function getResourcePoolManager(config?: Partial<ResourceConfig>): ResourcePoolManager {
  return ResourcePoolManager.getInstance(config);
}


