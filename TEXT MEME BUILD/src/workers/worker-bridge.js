/**
 * Meme Foundry - Worker Bridge
 * Manages communication between main thread and web workers
 */

import { Logger } from '@/utils/logger.js';

class WorkerBridge {
  constructor() {
    this.logger = new Logger('WorkerBridge');
    this.workers = new Map();
    this.taskQueue = [];
    this.activeWorkers = 0;
    this.maxWorkers = navigator.hardwareConcurrency || 4;
    this.pendingTasks = new Map();
    this.taskIdCounter = 0;
  }

  /**
   * Initialize worker pool
   */
  async initialize() {
    this.logger.info(`Initializing worker pool (max: ${this.maxWorkers})`);
    
    try {
      // Create render worker
      await this.createWorker('render', () => new Worker(
        new URL('@/workers/render-worker.js', import.meta.url),
        { type: 'module' }
      ));
      
      // Create resize worker
      await this.createWorker('resize', () => new Worker(
        new URL('@/workers/resize-worker.js', import.meta.url),
        { type: 'module' }
      ));
      
      // Create thumbnail worker
      await this.createWorker('thumbnail', () => new Worker(
        new URL('@/workers/thumbnail-worker.js', import.meta.url),
        { type: 'module' }
      ));
      
      this.logger.info(`Worker pool initialized with ${this.workers.size} worker types`);
      
    } catch (error) {
      this.logger.error('Failed to initialize workers:', error);
      // Continue without workers if not available
    }
  }

  /**
   * Create a worker instance
   */
  async createWorker(type, factory) {
    if (this.workers.has(type)) {
      return this.workers.get(type);
    }
    
    try {
      const worker = factory();
      
      // Set up error handling
      worker.onerror = (event) => {
        this.logger.error(`Worker error (${type}):`, event);
        this.handleWorkerError(type, event);
      };
      
      // Set up message handling
      worker.onmessage = (event) => {
        this.handleWorkerMessage(type, event.data);
      };
      
      const workerInfo = {
        worker,
        type,
        busy: false,
        currentTask: null,
        created: Date.now(),
        taskCount: 0
      };
      
      this.workers.set(type, workerInfo);
      
      // Initialize worker if needed
      await this.sendTask(type, { type: 'init', data: {} });
      
      return workerInfo;
      
    } catch (error) {
      this.logger.warn(`Could not create worker of type ${type}:`, error);
      return null;
    }
  }

  /**
   * Send task to worker
   */
  async sendTask(workerType, message) {
    const workerInfo = this.workers.get(workerType);
    if (!workerInfo) {
      throw new Error(`Worker type not found: ${workerType}`);
    }
    
    const taskId = ++this.taskIdCounter;
    message.id = taskId;
    
    return new Promise((resolve, reject) => {
      // Store pending task
      this.pendingTasks.set(taskId, { resolve, reject, type: message.type });
      
      // Set worker as busy
      workerInfo.busy = true;
      workerInfo.currentTask = taskId;
      workerInfo.taskCount++;
      
      // Send message to worker
      workerInfo.worker.postMessage(message);
      
      // Set timeout
      setTimeout(() => {
        if (this.pendingTasks.has(taskId)) {
          this.pendingTasks.delete(taskId);
          workerInfo.busy = false;
          workerInfo.currentTask = null;
          reject(new Error(`Worker task timeout: ${message.type}`));
        }
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Handle message from worker
   */
  handleWorkerMessage(workerType, data) {
    const { id, type, success, error } = data;
    
    // Handle special messages
    if (type === 'render-result') {
      // Handle ImageBitmap transfer
      this.emit('render-complete', data.imageBitmap);
      return;
    }
    
    if (type === 'region-result') {
      this.emit('region-render-complete', data);
      return;
    }
    
    if (type === 'effects-result') {
      this.emit('effects-complete', data.imageData);
      return;
    }
    
    // Resolve pending task
    const pending = this.pendingTasks.get(id);
    if (pending) {
      this.pendingTasks.delete(id);
      
      // Free worker
      const workerInfo = this.workers.get(workerType);
      if (workerInfo) {
        workerInfo.busy = false;
        workerInfo.currentTask = null;
      }
      
      if (success) {
        pending.resolve(data.data || data);
      } else {
        pending.reject(new Error(error || 'Worker task failed'));
      }
    }
    
    // Process queue
    this.processQueue();
  }

  /**
   * Handle worker error
   */
  handleWorkerError(workerType, event) {
    const workerInfo = this.workers.get(workerType);
    
    // Reject current task
    if (workerInfo?.currentTask) {
      const pending = this.pendingTasks.get(workerInfo.currentTask);
      if (pending) {
        pending.reject(new Error('Worker error'));
        this.pendingTasks.delete(workerInfo.currentTask);
      }
    }
    
    // Try to recreate worker
    this.logger.warn(`Attempting to recreate worker: ${workerType}`);
    this.workers.delete(workerType);
    
    // Recreate based on type
    setTimeout(async () => {
      try {
        await this.createWorker(workerType, () => new Worker(
          new URL(`@/workers/${workerType}-worker.js`, import.meta.url),
          { type: 'module' }
        ));
        this.logger.info(`Worker recreated: ${workerType}`);
      } catch (error) {
        this.logger.error(`Failed to recreate worker: ${workerType}`, error);
      }
    }, 1000);
  }

  /**
   * Queue task for processing
   */
  queueTask(workerType, task) {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        workerType,
        task,
        resolve,
        reject,
        added: Date.now()
      });
      
      this.processQueue();
    });
  }

  /**
   * Process task queue
   */
  processQueue() {
    while (this.taskQueue.length > 0) {
      const nextTask = this.taskQueue[0];
      const workerInfo = this.workers.get(nextTask.workerType);
      
      if (!workerInfo) {
        // No worker available for this type
        nextTask.reject(new Error(`Worker type not available: ${nextTask.workerType}`));
        this.taskQueue.shift();
        continue;
      }
      
      if (workerInfo.busy) {
        // Worker is busy, wait
        break;
      }
      
      // Process task
      this.taskQueue.shift();
      
      this.sendTask(nextTask.workerType, nextTask.task)
        .then(nextTask.resolve)
        .catch(nextTask.reject);
    }
  }

  /**
   * Render scene in worker
   */
  async renderInWorker(layers, options = {}) {
    return this.sendTask('render', {
      type: 'render',
      data: {
        layers,
        time: options.time || 0,
        ...options
      }
    });
  }

  /**
   * Render region in worker
   */
  async renderRegion(layers, region, options = {}) {
    return this.sendTask('render', {
      type: 'render-region',
      data: {
        layers,
        ...region,
        time: options.time || 0
      }
    });
  }

  /**
   * Export frame in worker
   */
  async exportFrame(layers, options = {}) {
    return this.sendTask('render', {
      type: 'export-frame',
      data: {
        layers,
        time: options.time || 0,
        format: options.format || 'image/png',
        quality: options.quality || 1
      }
    });
  }

  /**
   * Apply effects in worker
   */
  async applyEffects(imageData, effects) {
    return this.sendTask('render', {
      type: 'apply-effects',
      data: { imageData, effects }
    });
  }

  /**
   * Measure text in worker
   */
  async measureText(text, font, maxWidth, lineHeight) {
    return this.sendTask('render', {
      type: 'measure-text',
      data: { text, font, maxWidth, lineHeight }
    });
  }

  /**
   * Resize image in worker
   */
  async resizeImage(imageBitmap, width, height, options = {}) {
    return this.sendTask('resize', {
      type: 'resize',
      data: {
        imageBitmap,
        width,
        height,
        quality: options.quality || 'high'
      }
    });
  }

  /**
   * Generate thumbnail in worker
   */
  async generateThumbnail(imageData, maxSize = 300) {
    return this.sendTask('thumbnail', {
      type: 'generate',
      data: { imageData, maxSize }
    });
  }

  /**
   * Get worker status
   */
  getStatus() {
    const status = {};
    
    for (const [type, info] of this.workers) {
      status[type] = {
        busy: info.busy,
        taskCount: info.taskCount,
        currentTask: info.currentTask,
        uptime: Date.now() - info.created
      };
    }
    
    return {
      workers: status,
      queueLength: this.taskQueue.length,
      pendingTasks: this.pendingTasks.size,
      maxWorkers: this.maxWorkers
    };
  }

  /**
   * Terminate all workers
   */
  async terminateAll() {
    for (const [type, info] of this.workers) {
      try {
        info.worker.postMessage({ type: 'terminate' });
        info.worker.terminate();
      } catch (error) {
        this.logger.warn(`Error terminating worker ${type}:`, error);
      }
    }
    
    this.workers.clear();
    this.taskQueue = [];
    this.pendingTasks.clear();
  }

  /**
   * Check if worker type is available
   */
  isWorkerAvailable(type) {
    return this.workers.has(type);
  }

  /**
   * Get available worker types
   */
  getAvailableWorkers() {
    return Array.from(this.workers.keys());
  }
}

// Event emitter mixin
import { EventEmitter } from '@/utils/event-emitter.js';
Object.assign(WorkerBridge.prototype, EventEmitter.prototype);

// Singleton
let instance = null;

async function initializeWorkers() {
  if (!instance) {
    instance = new WorkerBridge();
    await instance.initialize();
  }
  return instance;
}

export { WorkerBridge, initializeWorkers };