/**
 * Meme Foundry - Timeline Manager
 * Manages animation timeline with keyframes and playback control
 */

import { Logger } from '@/utils/logger.js';
import { EventEmitter } from '@/utils/event-emitter.js';

class TimelineManager extends EventEmitter {
  constructor() {
    super();
    this.logger = new Logger('TimelineManager');
    
    // Timeline state
    this.currentTime = 0;
    this.duration = 10; // Default 10 seconds
    this.fps = 30;
    this.isPlaying = false;
    this.loop = false;
    this.playbackSpeed = 1;
    
    // Animation frame tracking
    this.animationFrameId = null;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    
    // Keyframes
    this.keyframes = new Map(); // layerId -> keyframes[]
    
    // Markers
    this.markers = [];
    
    // Scrubbing
    this.isScrubbing = false;
    
    // Bound methods
    this.tick = this.tick.bind(this);
  }

  /**
   * Initialize timeline
   */
  initialize(options = {}) {
    this.duration = options.duration || 10;
    this.fps = options.fps || 30;
    
    this.logger.info(`Timeline initialized: ${this.duration}s @ ${this.fps}fps`);
  }

  /**
   * Play timeline
   */
  play() {
    if (this.isPlaying) return;
    
    // Reset to start if at end
    if (this.currentTime >= this.duration) {
      this.currentTime = 0;
    }
    
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    
    this.startAnimationLoop();
    
    this.emit('timeline:play', { time: this.currentTime });
  }

  /**
   * Pause timeline
   */
  pause() {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    this.stopAnimationLoop();
    
    this.emit('timeline:pause', { time: this.currentTime });
  }

  /**
   * Toggle play/pause
   */
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Stop and reset
   */
  stop() {
    this.pause();
    this.currentTime = 0;
    
    this.emit('timeline:stop', { time: 0 });
  }

  /**
   * Seek to specific time
   */
  seek(time) {
    const clampedTime = Math.max(0, Math.min(time, this.duration));
    
    if (clampedTime === this.currentTime) return;
    
    this.currentTime = clampedTime;
    
    this.emit('timeline:seek', { time: this.currentTime });
    this.emit('timeline:update', this.getState());
  }

  /**
   * Start animation loop
   */
  startAnimationLoop() {
    if (this.animationFrameId) return;
    
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  /**
   * Stop animation loop
   */
  stopAnimationLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Animation tick
   */
  tick(timestamp) {
    if (!this.isPlaying) return;
    
    // Calculate delta time
    const deltaTime = (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;
    
    // Advance time
    this.currentTime += deltaTime * this.playbackSpeed;
    
    // Handle end of timeline
    if (this.currentTime >= this.duration) {
      if (this.loop) {
        this.currentTime = this.currentTime % this.duration;
        this.emit('timeline:loop');
      } else {
        this.currentTime = this.duration;
        this.pause();
        this.emit('timeline:complete');
        return;
      }
    }
    
    this.frameCount++;
    
    // Emit update
    this.emit('timeline:update', this.getState());
    
    // Continue loop
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  /**
   * Add keyframe for layer
   */
  addKeyframe(layerId, time, properties, easing = 'linear') {
    if (!this.keyframes.has(layerId)) {
      this.keyframes.set(layerId, []);
    }
    
    const keyframe = {
      id: crypto.randomUUID(),
      time: Math.max(0, Math.min(time, this.duration)),
      properties: { ...properties },
      easing
    };
    
    const layerKeyframes = this.keyframes.get(layerId);
    
    // Insert in sorted order
    const insertIndex = layerKeyframes.findIndex(k => k.time > keyframe.time);
    if (insertIndex === -1) {
      layerKeyframes.push(keyframe);
    } else {
      layerKeyframes.splice(insertIndex, 0, keyframe);
    }
    
    this.emit('keyframe:added', { layerId, keyframe });
    
    return keyframe;
  }

  /**
   * Remove keyframe
   */
  removeKeyframe(layerId, keyframeId) {
    const layerKeyframes = this.keyframes.get(layerId);
    if (!layerKeyframes) return false;
    
    const index = layerKeyframes.findIndex(k => k.id === keyframeId);
    if (index === -1) return false;
    
    const removed = layerKeyframes.splice(index, 1)[0];
    
    this.emit('keyframe:removed', { layerId, keyframe: removed });
    
    return true;
  }

  /**
   * Update keyframe
   */
  updateKeyframe(layerId, keyframeId, updates) {
    const layerKeyframes = this.keyframes.get(layerId);
    if (!layerKeyframes) return false;
    
    const keyframe = layerKeyframes.find(k => k.id === keyframeId);
    if (!keyframe) return false;
    
    Object.assign(keyframe, updates);
    
    // Re-sort if time changed
    if (updates.time !== undefined) {
      layerKeyframes.sort((a, b) => a.time - b.time);
    }
    
    this.emit('keyframe:updated', { layerId, keyframe });
    
    return true;
  }

  /**
   * Get keyframes for layer
   */
  getLayerKeyframes(layerId) {
    return this.keyframes.get(layerId) || [];
  }

  /**
   * Get interpolated properties for layer at current time
   */
  getLayerProperties(layerId) {
    const layerKeyframes = this.keyframes.get(layerId);
    if (!layerKeyframes || layerKeyframes.length === 0) {
      return null;
    }
    
    // Find surrounding keyframes
    const time = this.currentTime;
    
    let prevKeyframe = null;
    let nextKeyframe = null;
    
    for (const keyframe of layerKeyframes) {
      if (keyframe.time <= time) {
        prevKeyframe = keyframe;
      } else {
        nextKeyframe = keyframe;
        break;
      }
    }
    
    // Before first keyframe
    if (!prevKeyframe) {
      return nextKeyframe.properties;
    }
    
    // After last keyframe or no next keyframe
    if (!nextKeyframe) {
      return prevKeyframe.properties;
    }
    
    // At exact keyframe
    if (prevKeyframe.time === time) {
      return prevKeyframe.properties;
    }
    
    // Interpolate between keyframes
    const progress = (time - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time);
    const easedProgress = this.applyEasing(progress, prevKeyframe.easing);
    
    return this.interpolateProperties(
      prevKeyframe.properties,
      nextKeyframe.properties,
      easedProgress
    );
  }

  /**
   * Interpolate between two sets of properties
   */
  interpolateProperties(from, to, progress) {
    const result = {};
    
    // Get all property keys
    const keys = new Set([...Object.keys(from), ...Object.keys(to)]);
    
    for (const key of keys) {
      const fromVal = from[key];
      const toVal = to[key];
      
      if (fromVal === undefined) {
        result[key] = toVal;
      } else if (toVal === undefined) {
        result[key] = fromVal;
      } else if (typeof fromVal === 'number' && typeof toVal === 'number') {
        result[key] = fromVal + (toVal - fromVal) * progress;
      } else {
        // Non-numeric properties snap at halfway
        result[key] = progress < 0.5 ? fromVal : toVal;
      }
    }
    
    return result;
  }

  /**
   * Apply easing function
   */
  applyEasing(t, easing = 'linear') {
    switch (easing) {
      case 'linear':
        return t;
        
      case 'ease-in':
        return t * t;
        
      case 'ease-out':
        return t * (2 - t);
        
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        
      case 'ease-out-back':
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        
      case 'ease-in-back':
        const c2 = 1.70158;
        return c2 * t * t * t - (c2 - 1) * t * t;
        
      case 'bounce':
        return this.bounceEase(t);
        
      case 'elastic':
        return this.elasticEase(t);
        
      default:
        return t;
    }
  }

  /**
   * Bounce easing
   */
  bounceEase(t) {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      t -= 1.5 / 2.75;
      return 7.5625 * t * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      t -= 2.25 / 2.75;
      return 7.5625 * t * t + 0.9375;
    } else {
      t -= 2.625 / 2.75;
      return 7.5625 * t * t + 0.984375;
    }
  }

  /**
   * Elastic easing
   */
  elasticEase(t) {
    if (t === 0 || t === 1) return t;
    
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
  }

  /**
   * Add marker
   */
  addMarker(time, label, color = '#e94560') {
    const marker = {
      id: crypto.randomUUID(),
      time: Math.max(0, Math.min(time, this.duration)),
      label,
      color
    };
    
    this.markers.push(marker);
    this.markers.sort((a, b) => a.time - b.time);
    
    this.emit('marker:added', marker);
    
    return marker;
  }

  /**
   * Remove marker
   */
  removeMarker(markerId) {
    const index = this.markers.findIndex(m => m.id === markerId);
    if (index === -1) return false;
    
    const removed = this.markers.splice(index, 1)[0];
    this.emit('marker:removed', removed);
    
    return true;
  }

  /**
   * Get markers
   */
  getMarkers() {
    return [...this.markers];
  }

  /**
   * Get markers in time range
   */
  getMarkersInRange(startTime, endTime) {
    return this.markers.filter(m => m.time >= startTime && m.time <= endTime);
  }

  /**
   * Set duration
   */
  setDuration(duration) {
    this.duration = Math.max(0.1, duration);
    
    // Clamp current time
    if (this.currentTime > this.duration) {
      this.seek(this.duration);
    }
    
    this.emit('timeline:duration-changed', this.duration);
  }

  /**
   * Set FPS
   */
  setFps(fps) {
    this.fps = Math.max(1, Math.min(120, fps));
    this.emit('timeline:fps-changed', this.fps);
  }

  /**
   * Set loop
   */
  setLoop(loop) {
    this.loop = loop;
    this.emit('timeline:loop-changed', loop);
  }

  /**
   * Set playback speed
   */
  setPlaybackSpeed(speed) {
    this.playbackSpeed = Math.max(0.1, Math.min(10, speed));
    this.emit('timeline:speed-changed', this.playbackSpeed);
  }

  /**
   * Get timeline state
   */
  getState() {
    return {
      currentTime: this.currentTime,
      duration: this.duration,
      fps: this.fps,
      isPlaying: this.isPlaying,
      loop: this.loop,
      playbackSpeed: this.playbackSpeed,
      frameCount: this.frameCount,
      currentFrame: Math.floor(this.currentTime * this.fps),
      totalFrames: Math.floor(this.duration * this.fps),
      progress: this.duration > 0 ? this.currentTime / this.duration : 0
    };
  }

  /**
   * Get layer animation state at current time
   */
  getLayerAnimationState(layerId) {
    const properties = this.getLayerProperties(layerId);
    const keyframes = this.getLayerKeyframes(layerId);
    
    return {
      properties,
      hasAnimation: keyframes.length > 0,
      keyframeCount: keyframes.length,
      currentKeyframe: keyframes.findIndex(k => k.time > this.currentTime) - 1,
      isAnimated: properties !== null && keyframes.length > 1
    };
  }

  /**
   * Export timeline data
   */
  exportData() {
    return {
      duration: this.duration,
      fps: this.fps,
      keyframes: Array.from(this.keyframes.entries()).map(([layerId, kfs]) => ({
        layerId,
        keyframes: kfs
      })),
      markers: this.markers
    };
  }

  /**
   * Import timeline data
   */
  importData(data) {
    this.duration = data.duration || 10;
    this.fps = data.fps || 30;
    this.currentTime = 0;
    
    this.keyframes.clear();
    if (data.keyframes) {
      data.keyframes.forEach(({ layerId, keyframes }) => {
        this.keyframes.set(layerId, keyframes);
      });
    }
    
    this.markers = data.markers || [];
    
    this.emit('timeline:imported');
  }

  /**
   * Clean up
   */
  destroy() {
    this.stopAnimationLoop();
    this.keyframes.clear();
    this.markers = [];
    this.removeAllListeners();
  }
}

export { TimelineManager };