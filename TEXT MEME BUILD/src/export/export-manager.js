/**
 * Meme Foundry - Export Manager
 * Orchestrates all export operations with queue management and progress tracking
 */

import { Logger } from '@/utils/logger.js';
import { EventEmitter } from '@/utils/event-emitter.js';
import { ImageExport } from './image-export.js';
import { VideoExport } from './video-export.js';
import { HtmlBundleExport } from './html-bundle-export.js';
import { PresetManager } from './preset-manager.js';
import { FilenameGenerator } from './filename-generator.js';

class ExportManager extends EventEmitter {
  constructor(sceneManager, canvasRenderer) {
    super();
    this.logger = new Logger('ExportManager');
    this.sceneManager = sceneManager;
    this.canvasRenderer = canvasRenderer;
    
    // Export modules
    this.imageExport = new ImageExport(canvasRenderer);
    this.videoExport = new VideoExport(canvasRenderer);
    this.htmlExport = new HtmlBundleExport(sceneManager);
    this.presetManager = new PresetManager();
    this.filenameGen = new FilenameGenerator();
    
    // Export queue
    this.queue = [];
    this.currentExport = null;
    this.isProcessing = false;
    this.maxConcurrent = 2;
    
    // History
    this.exportHistory = [];
    this.maxHistory = 50;
    
    // Abort controllers
    this.abortControllers = new Map();
  }

  /**
   * Add export job to queue
   */
  async addToQueue(exportConfig) {
    const job = {
      id: crypto.randomUUID(),
      config: this.validateConfig(exportConfig),
      status: 'queued',
      progress: 0,
      added: new Date().toISOString(),
      started: null,
      completed: null,
      result: null,
      error: null
    };
    
    // Apply presets
    if (job.config.preset) {
      job.config = await this.presetManager.applyPreset(job.config);
    }
    
    this.queue.push(job);
    
    this.emit('export:queued', job);
    this.logger.info(`Export queued: ${job.id} - ${job.config.format}`);
    
    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    return job.id;
  }

  /**
   * Process export queue
   */
  async processQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const activeJobs = this.queue.filter(j => j.status === 'processing');
      
      if (activeJobs.length >= this.maxConcurrent) {
        await this.waitForSlot();
        continue;
      }
      
      // Get next queued job
      const job = this.queue.find(j => j.status === 'queued');
      if (!job) break;
      
      // Process job
      await this.processJob(job);
    }
    
    this.isProcessing = false;
  }

  /**
   * Process single export job
   */
  async processJob(job) {
    job.status = 'processing';
    job.started = new Date().toISOString();
    
    this.currentExport = job;
    this.emit('export:started', job);
    
    try {
      const result = await this.executeExport(job);
      
      job.status = 'completed';
      job.progress = 100;
      job.completed = new Date().toISOString();
      job.result = result;
      
      // Add to history
      this.addToHistory(job);
      
      this.emit('export:completed', job);
      this.logger.info(`Export completed: ${job.id}`);
      
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      
      this.emit('export:failed', job);
      this.logger.error(`Export failed: ${job.id}`, error);
      
      // Retry logic
      if (job.config.retryCount < (job.config.maxRetries || 2)) {
        job.config.retryCount = (job.config.retryCount || 0) + 1;
        job.status = 'queued';
        this.logger.info(`Retrying export ${job.id} (attempt ${job.config.retryCount})`);
      }
    } finally {
      this.currentExport = null;
    }
  }

  /**
   * Execute export based on format
   */
  async executeExport(job) {
    const { format, options = {} } = job.config;
    
    // Create abort controller
    const controller = new AbortController();
    this.abortControllers.set(job.id, controller);
    
    try {
      let result;
      
      switch (format) {
        case 'png':
        case 'jpeg':
        case 'webp':
          result = await this.imageExport.export(format, {
            ...options,
            signal: controller.signal,
            onProgress: (progress) => {
              job.progress = progress;
              this.emit('export:progress', job);
            }
          });
          break;
          
        case 'mp4':
        case 'webm':
          result = await this.videoExport.export(format, {
            ...options,
            signal: controller.signal,
            onProgress: (progress) => {
              job.progress = progress;
              this.emit('export:progress', job);
            }
          });
          break;
          
        case 'html':
          result = await this.htmlExport.export(options);
          break;
          
        case 'metadata':
          result = await this.exportMetadata(options);
          break;
          
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
      
      // Generate filename
      result.filename = this.filenameGen.generate(job.config);
      
      // Trigger download if requested
      if (options.download !== false) {
        await this.downloadExport(result);
      }
      
      return result;
      
    } finally {
      this.abortControllers.delete(job.id);
    }
  }

  /**
   * Export image (PNG, JPEG, WebP)
   */
  async exportImage(format, options = {}) {
    const config = {
      format,
      preset: options.platform || null,
      options: {
        quality: options.quality || 0.92,
        width: options.width,
        height: options.height,
        download: options.download !== false,
        ...options
      }
    };
    
    return this.addToQueue(config);
  }

  /**
   * Export video (MP4, WebM)
   */
  async exportVideo(format, options = {}) {
    const config = {
      format,
      preset: options.platform || null,
      options: {
        fps: options.fps || 30,
        bitrate: options.bitrate || '5M',
        duration: options.duration,
        includeAudio: options.includeAudio !== false,
        download: options.download !== false,
        ...options
      }
    };
    
    return this.addToQueue(config);
  }

  /**
   * Export HTML bundle
   */
  async exportHtmlBundle(options = {}) {
    const config = {
      format: 'html',
      options: {
        inlineAssets: options.inlineAssets !== false,
        responsive: options.responsive !== false,
        download: options.download !== false,
        ...options
      }
    };
    
    return this.addToQueue(config);
  }

  /**
   * Export metadata
   */
  async exportMetadata(options = {}) {
    const scene = this.sceneManager.scene;
    
    const metadata = {
      title: scene.name,
      description: scene.metadata?.description || '',
      author: scene.metadata?.author || 'Meme Foundry',
      created: scene.metadata?.created,
      modified: scene.metadata?.modified,
      platform: scene.metadata?.platform,
      dimensions: {
        width: scene.canvas.width,
        height: scene.canvas.height
      },
      layers: scene.layers.map(layer => ({
        id: layer.id,
        type: layer.type,
        name: layer.name,
        visible: layer.visible
      })),
      tags: scene.metadata?.tags || [],
      format: options.format || 'json'
    };
    
    if (options.format === 'json') {
      return {
        blob: new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' }),
        filename: `${scene.name}-metadata.json`,
        type: 'application/json'
      };
    }
    
    return metadata;
  }

  /**
   * Download export result
   */
  async downloadExport(result) {
    if (!result.blob && !result.url) {
      throw new Error('No downloadable content');
    }
    
    const url = result.blob 
      ? URL.createObjectURL(result.blob)
      : result.url;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up blob URL
    if (result.blob) {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    
    this.emit('export:downloaded', result);
  }

  /**
   * Cancel export
   */
  cancelExport(jobId) {
    const job = this.queue.find(j => j.id === jobId);
    if (!job) return false;
    
    // Abort if processing
    const controller = this.abortControllers.get(jobId);
    if (controller) {
      controller.abort();
    }
    
    // Remove from queue
    if (job.status === 'queued') {
      this.queue = this.queue.filter(j => j.id !== jobId);
    } else {
      job.status = 'cancelled';
    }
    
    this.emit('export:cancelled', job);
    return true;
  }

  /**
   * Cancel all exports
   */
  cancelAll() {
    this.queue.forEach(job => {
      if (job.status === 'queued' || job.status === 'processing') {
        this.cancelExport(job.id);
      }
    });
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      total: this.queue.length,
      queued: this.queue.filter(j => j.status === 'queued').length,
      processing: this.queue.filter(j => j.status === 'processing').length,
      completed: this.queue.filter(j => j.status === 'completed').length,
      failed: this.queue.filter(j => j.status === 'failed').length,
      current: this.currentExport,
      history: this.exportHistory.slice(-10)
    };
  }

  /**
   * Clear completed exports from queue
   */
  clearCompleted() {
    this.queue = this.queue.filter(j => 
      j.status === 'queued' || j.status === 'processing'
    );
  }

  /**
   * Add to export history
   */
  addToHistory(job) {
    this.exportHistory.push({
      id: job.id,
      format: job.config.format,
      preset: job.config.preset,
      timestamp: job.completed,
      filename: job.result?.filename,
      size: job.result?.blob?.size
    });
    
    // Limit history
    if (this.exportHistory.length > this.maxHistory) {
      this.exportHistory.shift();
    }
  }

  /**
   * Validate export configuration
   */
  validateConfig(config) {
    const validated = {
      format: config.format || 'png',
      preset: config.preset || null,
      options: {
        quality: Math.min(1, Math.max(0, config.options?.quality || 0.92)),
        width: config.options?.width || null,
        height: config.options?.height || null,
        download: config.options?.download !== false,
        retryCount: 0,
        maxRetries: config.options?.maxRetries || 2
      }
    };
    
    // Validate format
    const supportedFormats = ['png', 'jpeg', 'webp', 'mp4', 'webm', 'html', 'metadata'];
    if (!supportedFormats.includes(validated.format)) {
      throw new Error(`Unsupported format: ${validated.format}`);
    }
    
    return validated;
  }

  /**
   * Wait for processing slot
   */
  async waitForSlot() {
    return new Promise(resolve => {
      const check = () => {
        const active = this.queue.filter(j => j.status === 'processing').length;
        if (active < this.maxConcurrent) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  /**
   * Get export presets
   */
  getPresets() {
    return this.presetManager.getPresets();
  }

  /**
   * Get export history
   */
  getHistory() {
    return [...this.exportHistory];
  }

  /**
   * Clean up
   */
  destroy() {
    this.cancelAll();
    this.queue = [];
    this.exportHistory = [];
    this.removeAllListeners();
  }
}

export { ExportManager };