/**
 * Meme Foundry - Performance Monitor
 * Real-time performance monitoring and optimization hints
 */

import { Logger } from '@/utils/logger.js';

class PerformanceMonitor {
  constructor() {
    this.logger = new Logger('PerformanceMonitor');
    
    // Metrics storage
    this.metrics = {
      fps: [],
      frameTime: [],
      memoryUsage: [],
      renderTime: [],
      exportTime: [],
      loadTime: []
    };
    
    // Current values
    this.currentFPS = 0;
    this.averageFPS = 0;
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.fpsUpdateInterval = 1000;
    this.lastFPSUpdate = 0;
    
    // Memory monitoring
    this.memoryInterval = null;
    this.memoryCheckInterval = 5000; // 5 seconds
    
    // Performance marks
    this.marks = new Map();
    this.measures = [];
    
    // Thresholds
    this.thresholds = {
      fps: {
        warning: 30,
        critical: 15
      },
      memory: {
        warning: 300 * 1024 * 1024, // 300MB
        critical: 500 * 1024 * 1024  // 500MB
      },
      renderTime: {
        warning: 32, // ~30fps
        critical: 50 // ~20fps
      }
    };
    
    // Callbacks
    this.warningCallbacks = [];
    this.criticalCallbacks = [];
    
    // Monitoring state
    this.isMonitoring = false;
    this.isPaused = false;
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    
    // Start FPS monitoring
    this.monitorFPS();
    
    // Start memory monitoring
    this.startMemoryMonitoring();
    
    this.logger.info('Performance monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    this.stopMemoryMonitoring();
    this.logger.info('Performance monitoring stopped');
  }

  /**
   * Pause monitoring
   */
  pauseMonitoring() {
    this.isPaused = true;
  }

  /**
   * Resume monitoring
   */
  resumeMonitoring() {
    this.isPaused = false;
    this.lastFrameTime = performance.now();
  }

  /**
   * Monitor FPS using requestAnimationFrame
   */
  monitorFPS() {
    if (!this.isMonitoring) return;
    
    const tick = (timestamp) => {
      if (!this.isMonitoring) return;
      
      if (!this.isPaused) {
        this.frameCount++;
        
        // Calculate frame time
        if (this.lastFrameTime) {
          const frameTime = timestamp - this.lastFrameTime;
          this.metrics.frameTime.push(frameTime);
          
          // Limit history
          if (this.metrics.frameTime.length > 120) {
            this.metrics.frameTime.shift();
          }
        }
        
        this.lastFrameTime = timestamp;
        
        // Update FPS every second
        if (timestamp - this.lastFPSUpdate >= this.fpsUpdateInterval) {
          const elapsed = (timestamp - this.lastFPSUpdate) / 1000;
          this.currentFPS = Math.round(this.frameCount / elapsed);
          
          this.metrics.fps.push(this.currentFPS);
          if (this.metrics.fps.length > 60) {
            this.metrics.fps.shift();
          }
          
          this.calculateAverageFPS();
          
          this.frameCount = 0;
          this.lastFPSUpdate = timestamp;
          
          // Check thresholds
          this.checkFPSThresholds();
        }
      }
      
      requestAnimationFrame(tick);
    };
    
    requestAnimationFrame(tick);
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    if (this.memoryInterval) return;
    
    this.memoryInterval = setInterval(() => {
      if (this.isPaused) return;
      
      this.checkMemory();
    }, this.memoryCheckInterval);
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
  }

  /**
   * Check memory usage
   */
  checkMemory() {
    if (!performance.memory) return;
    
    const memory = {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
      timestamp: Date.now()
    };
    
    this.metrics.memoryUsage.push(memory);
    
    // Limit history
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage.shift();
    }
    
    // Check thresholds
    if (memory.used > this.thresholds.memory.critical) {
      this.triggerCritical('memory', `Critical memory usage: ${this.formatBytes(memory.used)}`);
    } else if (memory.used > this.thresholds.memory.warning) {
      this.triggerWarning('memory', `High memory usage: ${this.formatBytes(memory.used)}`);
    }
  }

  /**
   * Record render time
   */
  recordRenderTime(duration) {
    this.metrics.renderTime.push({
      duration,
      timestamp: Date.now()
    });
    
    if (this.metrics.renderTime.length > 200) {
      this.metrics.renderTime.shift();
    }
    
    // Check threshold
    if (duration > this.thresholds.renderTime.critical) {
      this.triggerCritical('render', `Critical render time: ${duration.toFixed(1)}ms`);
    } else if (duration > this.thresholds.renderTime.warning) {
      this.triggerWarning('render', `Slow render time: ${duration.toFixed(1)}ms`);
    }
  }

  /**
   * Record export time
   */
  recordExportTime(duration, format) {
    this.metrics.exportTime.push({
      duration,
      format,
      timestamp: Date.now()
    });
  }

  /**
   * Mark a performance point
   */
  mark(name) {
    this.marks.set(name, performance.now());
  }

  /**
   * Measure between two marks
   */
  measure(name, startMark, endMark) {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);
    
    if (!start || !end) {
      this.logger.warn(`Cannot measure ${name}: marks not found`);
      return null;
    }
    
    const duration = end - start;
    
    this.measures.push({
      name,
      duration,
      timestamp: Date.now()
    });
    
    if (this.measures.length > 50) {
      this.measures.shift();
    }
    
    return duration;
  }

  /**
   * Calculate average FPS
   */
  calculateAverageFPS() {
    if (this.metrics.fps.length === 0) return 0;
    
    const sum = this.metrics.fps.reduce((a, b) => a + b, 0);
    this.averageFPS = Math.round(sum / this.metrics.fps.length);
    
    return this.averageFPS;
  }

  /**
   * Check FPS thresholds
   */
  checkFPSThresholds() {
    if (this.currentFPS < this.thresholds.fps.critical) {
      this.triggerCritical('fps', `Critical FPS: ${this.currentFPS}`);
    } else if (this.currentFPS < this.thresholds.fps.warning) {
      this.triggerWarning('fps', `Low FPS: ${this.currentFPS}`);
    }
  }

  /**
   * Trigger warning callback
   */
  triggerWarning(type, message) {
    this.logger.warn(`Performance warning: ${message}`);
    this.warningCallbacks.forEach(cb => {
      try { cb(type, message); } catch (e) {}
    });
    this.emit('performance:warning', { type, message });
  }

  /**
   * Trigger critical callback
   */
  triggerCritical(type, message) {
    this.logger.error(`Performance critical: ${message}`);
    this.criticalCallbacks.forEach(cb => {
      try { cb(type, message); } catch (e) {}
    });
    this.emit('performance:critical', { type, message });
  }

  /**
   * Subscribe to warnings
   */
  onWarning(callback) {
    this.warningCallbacks.push(callback);
    return () => {
      const index = this.warningCallbacks.indexOf(callback);
      if (index > -1) this.warningCallbacks.splice(index, 1);
    };
  }

  /**
   * Subscribe to critical alerts
   */
  onCritical(callback) {
    this.criticalCallbacks.push(callback);
    return () => {
      const index = this.criticalCallbacks.indexOf(callback);
      if (index > -1) this.criticalCallbacks.splice(index, 1);
    };
  }

  /**
   * Log an error event
   */
  logError(type, error) {
    this.emit('performance:error', { type, error, timestamp: Date.now() });
  }

  /**
   * Get performance report
   */
  getReport() {
    const avgFrameTime = this.metrics.frameTime.length > 0
      ? this.metrics.frameTime.reduce((a, b) => a + b, 0) / this.metrics.frameTime.length
      : 0;
    
    const avgRenderTime = this.metrics.renderTime.length > 0
      ? this.metrics.renderTime.reduce((a, b) => a + b.duration, 0) / this.metrics.renderTime.length
      : 0;
    
    return {
      fps: {
        current: this.currentFPS,
        average: this.averageFPS,
        min: Math.min(...(this.metrics.fps.length ? this.metrics.fps : [0])),
        max: Math.max(...(this.metrics.fps.length ? this.metrics.fps : [0])),
        history: this.metrics.fps.slice(-10)
      },
      frameTime: {
        average: avgFrameTime.toFixed(2),
        history: this.metrics.frameTime.slice(-10)
      },
      memory: this.metrics.memoryUsage.length > 0
        ? {
            current: this.formatBytes(this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1].used),
            peak: this.formatBytes(Math.max(...this.metrics.memoryUsage.map(m => m.used)))
          }
        : null,
      renderTime: {
        average: avgRenderTime.toFixed(2),
        recent: this.metrics.renderTime.slice(-5)
      },
      marks: Array.from(this.marks.keys()),
      measures: this.measures.slice(-10)
    };
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions() {
    const suggestions = [];
    
    if (this.averageFPS < 30) {
      suggestions.push({
        type: 'fps',
        severity: 'warning',
        message: 'Low frame rate detected. Consider reducing layer count or effects.',
        action: 'Reduce visual complexity'
      });
    }
    
    const latestMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    if (latestMemory && latestMemory.used > this.thresholds.memory.warning) {
      suggestions.push({
        type: 'memory',
        severity: 'warning',
        message: 'High memory usage detected. Consider compressing assets.',
        action: 'Clear unused assets'
      });
    }
    
    const avgRenderTime = this.metrics.renderTime.length > 0
      ? this.metrics.renderTime.reduce((a, b) => a + b.duration, 0) / this.metrics.renderTime.length
      : 0;
    
    if (avgRenderTime > 32) {
      suggestions.push({
        type: 'render',
        severity: 'warning',
        message: 'Slow render times may cause lag during editing.',
        action: 'Enable OffscreenCanvas or reduce canvas size'
      });
    }
    
    return suggestions;
  }

  /**
   * Format bytes
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Reset all metrics
   */
  reset() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = [];
    });
    this.marks.clear();
    this.measures = [];
    this.currentFPS = 0;
    this.averageFPS = 0;
    this.frameCount = 0;
  }

  /**
   * Destroy
   */
  destroy() {
    this.stopMonitoring();
    this.warningCallbacks = [];
    this.criticalCallbacks = [];
    this.reset();
  }
}

// Add EventEmitter
import { EventEmitter } from '@/utils/event-emitter.js';
Object.assign(PerformanceMonitor.prototype, EventEmitter.prototype);

export { PerformanceMonitor };