/**
 * Meme Foundry - Canvas Renderer
 * High-performance Canvas2D rendering engine with OffscreenCanvas support
 */

import { Logger } from '@/utils/logger.js';
import { EventEmitter } from '@/utils/event-emitter.js';
import { ImageRenderer } from './image-renderer.js';
import { TextRenderer } from './text-renderer.js';
import { EffectRenderer } from './effect-renderer.js';
import { SafeAreaRenderer } from './safe-area-renderer.js';

class CanvasRenderer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = new Logger('CanvasRenderer');
    
    // Canvas elements
    this.canvas = null;
    this.ctx = null;
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    
    // Configuration
    this.config = {
      width: options.width || 1080,
      height: options.height || 1080,
      backgroundColor: options.backgroundColor || '#FFFFFF',
      pixelRatio: options.pixelRatio || window.devicePixelRatio || 1,
      useOffscreen: options.useOffscreenCanvas !== false && typeof OffscreenCanvas !== 'undefined',
      antialias: options.antialias !== false,
      imageSmoothingQuality: options.imageSmoothingQuality || 'high',
      alpha: options.alpha !== false,
      preserveDrawingBuffer: options.preserveDrawingBuffer || false
    };
    
    // Renderers
    this.imageRenderer = new ImageRenderer();
    this.textRenderer = new TextRenderer();
    this.effectRenderer = new EffectRenderer();
    this.safeAreaRenderer = new SafeAreaRenderer();
    
    // State
    this.scene = null;
    this.renderScheduled = false;
    this.renderInProgress = false;
    this.lastRenderTime = 0;
    this.renderCount = 0;
    this.dirtyRegions = [];
    
    // Performance
    this.fps = 0;
    this.frameCount = 0;
    this.fpsTimer = 0;
    
    // Export mode
    this.isExportMode = false;
  }

  /**
   * Initialize canvas renderer
   */
  async initialize(canvasElement = null) {
    this.logger.info('Initializing canvas renderer');
    
    if (canvasElement) {
      this.canvas = canvasElement;
    } else {
      this.canvas = document.createElement('canvas');
    }
    
    // Configure canvas
    this.configureCanvas();
    
    // Get context
    this.ctx = this.canvas.getContext('2d', {
      alpha: this.config.alpha,
      antialias: this.config.antialias,
      preserveDrawingBuffer: this.config.preserveDrawingBuffer,
      willReadFrequently: false
    });
    
    if (!this.ctx) {
      throw new Error('Failed to get 2D context');
    }
    
    // Initialize OffscreenCanvas if supported
    if (this.config.useOffscreen) {
      await this.initializeOffscreen();
    }
    
    // Start FPS counter
    this.startFPSCounter();
    
    this.emit('renderer:initialized', {
      canvas: this.canvas,
      config: this.config
    });
    
    return this.canvas;
  }

  /**
   * Configure canvas dimensions and pixel ratio
   */
  configureCanvas() {
    const { width, height, pixelRatio } = this.config;
    
    // Set display size
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    // Set actual size in memory (scaled for retina)
    this.canvas.width = width * pixelRatio;
    this.canvas.height = height * pixelRatio;
    
    // Scale context for retina
    if (this.ctx) {
      this.ctx.scale(pixelRatio, pixelRatio);
    }
  }

  /**
   * Initialize OffscreenCanvas for background rendering
   */
  async initializeOffscreen() {
    try {
      this.offscreenCanvas = new OffscreenCanvas(
        this.config.width * this.config.pixelRatio,
        this.config.height * this.config.pixelRatio
      );
      
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
        alpha: this.config.alpha,
        willReadFrequently: false
      });
      
      if (this.offscreenCtx) {
        this.offscreenCtx.scale(this.config.pixelRatio, this.config.pixelRatio);
        this.logger.info('OffscreenCanvas initialized');
      }
    } catch (error) {
      this.logger.warn('OffscreenCanvas initialization failed:', error);
      this.config.useOffscreen = false;
    }
  }

  /**
   * Render scene to canvas
   */
  async render(scene, options = {}) {
    if (!this.ctx || this.renderInProgress) return;
    
    const {
      force = false,
      exportMode = false,
      exportScale = 1,
      renderSafeAreas = true,
      renderGuides = false
    } = options;
    
    const startTime = performance.now();
    this.renderInProgress = true;
    this.isExportMode = exportMode;
    
    try {
      // Choose rendering context
      const ctx = this.config.useOffscreen && !exportMode 
        ? this.offscreenCtx 
        : this.ctx;
      
      // Clear canvas
      this.clear(ctx);
      
      // Render background
      this.renderBackground(ctx, scene);
      
      // Sort layers by render order
      const layers = this.getSortedLayers(scene);
      
      // Render each layer
      for (const layer of layers) {
        if (!layer.visible || layer.opacity <= 0) continue;
        
        ctx.save();
        
        // Apply layer transforms
        this.applyTransform(ctx, layer.transform);
        
        // Apply opacity
        ctx.globalAlpha = layer.opacity;
        
        // Apply blend mode
        ctx.globalCompositeOperation = layer.blendMode || 'normal';
        
        // Apply masks if any
        if (layer.masks?.length > 0) {
          this.applyMasks(ctx, layer.masks);
        }
        
        // Render layer content based on type
        await this.renderLayerContent(ctx, layer, options);
        
        // Apply effects if any
        if (layer.effects?.length > 0) {
          await this.effectRenderer.applyEffects(ctx, layer, this.config);
        }
        
        ctx.restore();
      }
      
      // Render safe areas overlay
      if (renderSafeAreas && !exportMode) {
        this.safeAreaRenderer.render(ctx, scene.canvas);
      }
      
      // Render guides
      if (renderGuides) {
        this.renderGuides(ctx, scene);
      }
      
      // Transfer offscreen to main canvas if needed
      if (this.config.useOffscreen && !exportMode && this.offscreenCanvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(
          this.offscreenCanvas,
          0, 0,
          this.config.width * this.config.pixelRatio,
          this.config.height * this.config.pixelRatio,
          0, 0,
          this.canvas.width,
          this.canvas.height
        );
      }
      
      // Update performance metrics
      this.renderCount++;
      this.frameCount++;
      this.lastRenderTime = performance.now() - startTime;
      
      this.emit('render:complete', {
        renderTime: this.lastRenderTime,
        frameCount: this.renderCount,
        exportMode
      });
      
    } catch (error) {
      this.logger.error('Render failed:', error);
      this.emit('render:error', error);
      throw error;
    } finally {
      this.renderInProgress = false;
    }
  }

  /**
   * Clear canvas
   */
  clear(ctx = this.ctx) {
    ctx.clearRect(
      0, 0,
      this.config.width,
      this.config.height
    );
  }

  /**
   * Render background
   */
  renderBackground(ctx, scene) {
    const bg = scene.canvas.backgroundColor || this.config.backgroundColor;
    
    if (bg === 'transparent') return;
    
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.config.width, this.config.height);
    
    // Draw checkerboard for transparent areas
    if (bg === 'transparent') {
      this.drawCheckerboard(ctx);
    }
  }

  /**
   * Draw transparency checkerboard
   */
  drawCheckerboard(ctx) {
    const size = 20;
    const { width, height } = this.config;
    
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        ctx.fillStyle = ((x + y) / size) % 2 === 0 ? '#FFFFFF' : '#E0E0E0';
        ctx.fillRect(x, y, size, size);
      }
    }
  }

  /**
   * Apply layer transform
   */
  applyTransform(ctx, transform) {
    if (!transform) return;
    
    const {
      x = 0,
      y = 0,
      width = 100,
      height = 100,
      rotation = 0,
      scaleX = 1,
      scaleY = 1,
      anchorX = 0.5,
      anchorY = 0.5,
      flipH = false,
      flipV = false
    } = transform;
    
    // Calculate anchor point
    const anchorPX = x + width * anchorX;
    const anchorPY = y + height * anchorY;
    
    // Translate to anchor point
    ctx.translate(anchorPX, anchorPY);
    
    // Apply rotation
    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }
    
    // Apply scale
    const finalScaleX = scaleX * (flipH ? -1 : 1);
    const finalScaleY = scaleY * (flipV ? -1 : 1);
    
    if (finalScaleX !== 1 || finalScaleY !== 1) {
      ctx.scale(finalScaleX, finalScaleY);
    }
    
    // Translate back
    ctx.translate(-anchorPX, -anchorPY);
  }

  /**
   * Apply masks to context
   */
  applyMasks(ctx, masks) {
    masks.forEach(mask => {
      if (!mask.enabled) return;
      
      ctx.save();
      ctx.beginPath();
      
      switch (mask.type) {
        case 'rectangle':
          ctx.rect(
            mask.x || 0,
            mask.y || 0,
            mask.width || this.config.width,
            mask.height || this.config.height
          );
          break;
          
        case 'ellipse':
          ctx.ellipse(
            mask.cx || this.config.width / 2,
            mask.cy || this.config.height / 2,
            mask.rx || this.config.width / 2,
            mask.ry || this.config.height / 2,
            0, 0, Math.PI * 2
          );
          break;
          
        case 'polygon':
          if (mask.points?.length > 0) {
            ctx.moveTo(mask.points[0].x, mask.points[0].y);
            mask.points.slice(1).forEach(point => {
              ctx.lineTo(point.x, point.y);
            });
            ctx.closePath();
          }
          break;
      }
      
      ctx.clip();
      
      if (mask.inverted) {
        // For inverted masks, we'd need composite operations
        // This is a simplified version
      }
    });
  }

  /**
   * Render layer content by type
   */
  async renderLayerContent(ctx, layer, options) {
    const transform = layer.transform || {};
    const { x, y, width, height } = transform;
    
    switch (layer.type) {
      case 'image':
        await this.imageRenderer.render(ctx, layer, { x, y, width, height }, this.config);
        break;
        
      case 'text':
        await this.textRenderer.render(ctx, layer, { x, y, width, height }, this.config);
        break;
        
      case 'video':
        await this.renderVideoLayer(ctx, layer, { x, y, width, height });
        break;
        
      case 'shape':
        await this.renderShapeLayer(ctx, layer, { x, y, width, height });
        break;
        
      case 'group':
        await this.renderGroupLayer(ctx, layer, options);
        break;
        
      case 'audio':
        // Audio layers don't have visual content
        break;
    }
  }

  /**
   * Render video layer
   */
  async renderVideoLayer(ctx, layer, bounds) {
    if (layer.video?.src) {
      const video = await this.getVideoElement(layer);
      if (video) {
        const { x, y, width, height } = bounds;
        
        if (layer.video.fit === 'cover') {
          this.drawCover(ctx, video, x, y, width, height);
        } else if (layer.video.fit === 'contain') {
          this.drawContain(ctx, video, x, y, width, height);
        } else {
          ctx.drawImage(video, x, y, width, height);
        }
      }
    }
  }

  /**
   * Render shape layer
   */
  async renderShapeLayer(ctx, layer, bounds) {
    const shape = layer.shape;
    if (!shape) return;
    
    const { x, y, width, height } = bounds;
    
    ctx.save();
    
    // Draw shape path
    ctx.beginPath();
    
    switch (shape.shapeType) {
      case 'rectangle':
        if (shape.borderRadius) {
          this.roundRect(ctx, x, y, width, height, shape.borderRadius);
        } else {
          ctx.rect(x, y, width, height);
        }
        break;
        
      case 'ellipse':
        ctx.ellipse(
          x + width / 2,
          y + height / 2,
          width / 2,
          height / 2,
          0, 0, Math.PI * 2
        );
        break;
        
      case 'triangle':
        ctx.moveTo(x + width / 2, y);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x, y + height);
        ctx.closePath();
        break;
        
      case 'star':
        this.drawStar(ctx, x + width / 2, y + height / 2, width / 2, shape.sides || 5);
        break;
        
      case 'polygon':
        if (shape.points?.length > 0) {
          ctx.moveTo(x + shape.points[0].x * width, y + shape.points[0].y * height);
          shape.points.slice(1).forEach(point => {
            ctx.lineTo(x + point.x * width, y + point.y * height);
          });
          ctx.closePath();
        }
        break;
        
      case 'line':
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y + height);
        break;
        
      case 'arrow':
        this.drawArrow(ctx, x, y, x + width, y + height);
        break;
    }
    
    // Apply fill
    if (shape.fill && shape.fill !== 'transparent') {
      if (shape.fill === 'gradient' && shape.gradient) {
        ctx.fillStyle = this.createGradient(ctx, shape.gradient, { x, y, width, height });
      } else {
        ctx.fillStyle = shape.fill;
      }
      ctx.fill();
    }
    
    // Apply stroke
    if (shape.stroke && shape.stroke !== 'transparent' && shape.strokeWidth > 0) {
      ctx.strokeStyle = shape.stroke;
      ctx.lineWidth = shape.strokeWidth;
      ctx.stroke();
    }
    
    ctx.restore();
  }

  /**
   * Render group layer
   */
  async renderGroupLayer(ctx, group, options) {
    if (group.group?.children) {
      for (const child of group.group.children) {
        if (!child.visible || child.opacity <= 0) continue;
        
        ctx.save();
        this.applyTransform(ctx, child.transform);
        ctx.globalAlpha = child.opacity;
        
        await this.renderLayerContent(ctx, child, options);
        
        ctx.restore();
      }
    }
  }

  /**
   * Draw image with cover fit
   */
  drawCover(ctx, image, x, y, width, height) {
    const imgRatio = image.width / image.height;
    const boxRatio = width / height;
    
    let sx, sy, sw, sh;
    
    if (imgRatio > boxRatio) {
      sw = image.height * boxRatio;
      sh = image.height;
      sx = (image.width - sw) / 2;
      sy = 0;
    } else {
      sw = image.width;
      sh = image.width / boxRatio;
      sx = 0;
      sy = (image.height - sh) / 2;
    }
    
    ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  }

  /**
   * Draw image with contain fit
   */
  drawContain(ctx, image, x, y, width, height) {
    const imgRatio = image.width / image.height;
    const boxRatio = width / height;
    
    let dx, dy, dw, dh;
    
    if (imgRatio > boxRatio) {
      dw = width;
      dh = width / imgRatio;
      dx = x;
      dy = y + (height - dh) / 2;
    } else {
      dh = height;
      dw = height * imgRatio;
      dx = x + (width - dw) / 2;
      dy = y;
    }
    
    ctx.drawImage(image, dx, dy, dw, dh);
  }

  /**
   * Draw rounded rectangle path
   */
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Draw star shape
   */
  drawStar(ctx, cx, cy, radius, points = 5) {
    const innerRadius = radius * 0.4;
    const step = Math.PI / points;
    
    ctx.beginPath();
    
    for (let i = 0; i < 2 * points; i++) {
      const r = i % 2 === 0 ? radius : innerRadius;
      const angle = i * step - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.closePath();
  }

  /**
   * Draw arrow
   */
  drawArrow(ctx, fromX, fromY, toX, toY, headLength = 10) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }

  /**
   * Create gradient
   */
  createGradient(ctx, gradientConfig, bounds) {
    const { type = 'linear', angle = 0, stops = [] } = gradientConfig;
    const { x, y, width, height } = bounds;
    
    let gradient;
    
    if (type === 'linear') {
      const radians = (angle - 90) * Math.PI / 180;
      const x1 = x + width / 2 - Math.cos(radians) * width / 2;
      const y1 = y + height / 2 - Math.sin(radians) * height / 2;
      const x2 = x + width / 2 + Math.cos(radians) * width / 2;
      const y2 = y + height / 2 + Math.sin(radians) * height / 2;
      
      gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    } else if (type === 'radial') {
      gradient = ctx.createRadialGradient(
        x + width / 2, y + height / 2, 0,
        x + width / 2, y + height / 2, Math.max(width, height) / 2
      );
    } else if (type === 'conic') {
      // Conic gradients not widely supported in Canvas2D
      gradient = ctx.createLinearGradient(x, y, x + width, y);
    }
    
    stops.forEach(stop => {
      gradient.addColorStop(stop.offset, stop.color);
    });
    
    return gradient;
  }

  /**
   * Get sorted layers for render order
   */
  getSortedLayers(scene) {
    return [...scene.layers].sort((a, b) => {
      const indexA = scene.layers.indexOf(a);
      const indexB = scene.layers.indexOf(b);
      return indexA - indexB;
    });
  }

  /**
   * Get video element for layer
   */
  async getVideoElement(layer) {
    // Video element management would be handled by video renderer
    // This is a placeholder for the integration
    return null;
  }

  /**
   * Render guides (grid, safe areas, etc.)
   */
  renderGuides(ctx, scene) {
    // Render grid
    if (this.config.showGrid) {
      this.renderGrid(ctx);
    }
    
    // Render safe areas
    this.safeAreaRenderer.render(ctx, scene.canvas);
  }

  /**
   * Render grid
   */
  renderGrid(ctx) {
    const gridSize = 50;
    const { width, height } = this.config;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    
    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  /**
   * Export canvas to image
   */
  async exportToImage(format = 'image/png', quality = 1) {
    return new Promise((resolve, reject) => {
      try {
        this.canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Export failed'));
            }
          },
          format,
          quality
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Start FPS counter
   */
  startFPSCounter() {
    this.fpsTimer = setInterval(() => {
      this.fps = this.frameCount;
      this.frameCount = 0;
      
      if (this.fps < 30 && !this.isExportMode) {
        this.emit('performance:low-fps', this.fps);
      }
    }, 1000);
  }

  /**
   * Resize canvas
   */
  resize(width, height) {
    this.config.width = width;
    this.config.height = height;
    this.configureCanvas();
    
    // Recreate offscreen canvas
    if (this.config.useOffscreen) {
      this.initializeOffscreen();
    }
    
    this.emit('renderer:resized', { width, height });
  }

  /**
   * Get canvas data URL
   */
  toDataURL(format = 'image/png', quality = 1) {
    return this.canvas.toDataURL(format, quality);
  }

  /**
   * Get canvas blob
   */
  async toBlob(format = 'image/png', quality = 1) {
    return this.exportToImage(format, quality);
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.fpsTimer) {
      clearInterval(this.fpsTimer);
    }
    
    this.ctx = null;
    this.offscreenCtx = null;
    this.canvas = null;
    this.offscreenCanvas = null;
    this.removeAllListeners();
  }
}

export { CanvasRenderer };