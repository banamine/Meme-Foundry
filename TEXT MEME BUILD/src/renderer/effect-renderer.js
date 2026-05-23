/**
 * Meme Foundry - Effect Renderer
 * Applies visual effects to layers including shadows, glows, blurs, and more
 */

import { Logger } from '@/utils/logger.js';

class EffectRenderer {
  constructor() {
    this.logger = new Logger('EffectRenderer');
    this.effectCache = new Map();
  }

  /**
   * Apply all enabled effects to a layer
   */
  async applyEffects(ctx, layer, config) {
    if (!layer.effects || layer.effects.length === 0) return;
    
    const enabledEffects = layer.effects.filter(e => e.enabled);
    if (enabledEffects.length === 0) return;
    
    ctx.save();
    
    // Apply effects in order (bottom to top)
    for (const effect of enabledEffects) {
      await this.applyEffect(ctx, effect, layer, config);
    }
    
    ctx.restore();
  }

  /**
   * Apply single effect
   */
  async applyEffect(ctx, effect, layer, config) {
    switch (effect.type) {
      case 'drop-shadow':
        this.applyDropShadow(ctx, effect, layer);
        break;
        
      case 'inner-shadow':
        this.applyInnerShadow(ctx, effect, layer);
        break;
        
      case 'glow':
        this.applyGlow(ctx, effect, layer);
        break;
        
      case 'inner-glow':
        this.applyInnerGlow(ctx, effect, layer);
        break;
        
      case 'bevel':
        this.applyBevel(ctx, effect, layer);
        break;
        
      case 'blur':
        this.applyBlur(ctx, effect, layer);
        break;
        
      case 'sharpen':
        this.applySharpen(ctx, effect, layer);
        break;
        
      case 'noise':
        this.applyNoise(ctx, effect, layer);
        break;
        
      case 'color-overlay':
        this.applyColorOverlay(ctx, effect, layer);
        break;
        
      case 'gradient-overlay':
        this.applyGradientOverlay(ctx, effect, layer);
        break;
        
      case 'stroke':
        this.applyStroke(ctx, effect, layer);
        break;
        
      case 'pixelate':
        this.applyPixelate(ctx, effect, layer);
        break;
        
      case 'vignette':
        this.applyVignette(ctx, effect, layer);
        break;
        
      default:
        this.logger.warn(`Unknown effect type: ${effect.type}`);
    }
  }

  /**
   * Apply drop shadow effect
   */
  applyDropShadow(ctx, effect, layer) {
    const {
      color = '#000000',
      opacity = 0.5,
      angle = 135,
      distance = 5,
      blur = 5,
      spread = 0
    } = effect.settings || {};

    const radians = (angle - 90) * Math.PI / 180;
    const offsetX = Math.cos(radians) * distance;
    const offsetY = Math.sin(radians) * distance;

    ctx.save();
    ctx.shadowColor = this.hexToRgba(color, opacity);
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = offsetX;
    ctx.shadowOffsetY = offsetY;

    // If spread is specified, we need to draw a larger shape
    if (spread > 0) {
      ctx.lineWidth = spread * 2;
      ctx.strokeStyle = this.hexToRgba(color, opacity);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Apply inner shadow effect
   */
  applyInnerShadow(ctx, effect, layer) {
    const {
      color = '#000000',
      opacity = 0.5,
      angle = 135,
      distance = 5,
      blur = 5,
      choke = 0
    } = effect.settings || {};

    // Inner shadow is complex with Canvas2D
    // Simplified version using shadow and compositing
    ctx.save();
    
    // Create a mask of the layer
    ctx.globalCompositeOperation = 'source-atop';
    
    const radians = (angle - 90) * Math.PI / 180;
    const offsetX = Math.cos(radians) * distance;
    const offsetY = Math.sin(radians) * distance;

    ctx.shadowColor = this.hexToRgba(color, opacity);
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = offsetX;
    ctx.shadowOffsetY = offsetY;

    // Draw inverted shape
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000000';
    ctx.fill();
    
    ctx.restore();
  }

  /**
   * Apply outer glow effect
   */
  applyGlow(ctx, effect, layer) {
    const {
      color = '#FFFFFF',
      opacity = 0.75,
      blur = 10,
      spread = 0,
      quality = 1
    } = effect.settings || {};

    ctx.save();
    ctx.shadowColor = this.hexToRgba(color, opacity);
    ctx.shadowBlur = blur * quality;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Multiple passes for stronger glow
    for (let i = 0; i < quality; i++) {
      ctx.fillStyle = this.hexToRgba(color, opacity / quality);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Apply inner glow effect
   */
  applyInnerGlow(ctx, effect, layer) {
    const {
      color = '#FFFFFF',
      opacity = 0.75,
      blur = 10,
      source = 'center'
    } = effect.settings || {};

    ctx.save();
    
    // Create inner glow using compositing
    ctx.globalCompositeOperation = 'source-atop';
    ctx.shadowColor = this.hexToRgba(color, opacity);
    ctx.shadowBlur = blur;
    
    // Draw based on source
    if (source === 'center') {
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else {
      // Edge glow - approximate
      ctx.shadowOffsetX = blur / 2;
      ctx.shadowOffsetY = blur / 2;
    }

    ctx.fillStyle = this.hexToRgba(color, opacity);
    ctx.fill();
    
    ctx.restore();
  }

  /**
   * Apply bevel and emboss effect
   */
  applyBevel(ctx, effect, layer) {
    const {
      style = 'inner-bevel',
      depth = 100,
      direction = 'up',
      blur = 0,
      angle = 135,
      altitude = 30,
      highlightColor = '#FFFFFF',
      highlightOpacity = 0.75,
      shadowColor = '#000000',
      shadowOpacity = 0.75
    } = effect.settings || {};

    const radians = (angle - 90) * Math.PI / 180;
    const offsetX = Math.cos(radians) * (depth / 10);
    const offsetY = Math.sin(radians) * (depth / 10);

    ctx.save();

    // Highlight
    ctx.shadowColor = this.hexToRgba(highlightColor, highlightOpacity);
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = -offsetX;
    ctx.shadowOffsetY = -offsetY;
    ctx.fill();

    // Shadow
    ctx.shadowColor = this.hexToRgba(shadowColor, shadowOpacity);
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = offsetX;
    ctx.shadowOffsetY = offsetY;
    ctx.fill();

    ctx.restore();
  }

  /**
   * Apply blur effect
   */
  applyBlur(ctx, effect, layer) {
    const { amount = 5 } = effect.settings || {};
    
    if (amount <= 0) return;
    
    ctx.save();
    ctx.filter = `blur(${amount}px)`;
    // Re-render the layer content would be needed here
    // This is a simplified version
    ctx.restore();
  }

  /**
   * Apply sharpen effect
   */
  applySharpen(ctx, effect, layer) {
    const { amount = 50 } = effect.settings || {};
    
    // Canvas2D doesn't have native sharpen
    // Using contrast as approximation
    ctx.save();
    ctx.filter = `contrast(${100 + amount}%)`;
    ctx.restore();
  }

  /**
   * Apply noise/grain effect
   */
  applyNoise(ctx, effect, layer) {
    const {
      amount = 10,
      distribution = 'uniform',
      monochromatic = false
    } = effect.settings || {};

    const { width, height } = ctx.canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = distribution === 'gaussian'
        ? this.gaussianRandom() * amount
        : (Math.random() * 2 - 1) * amount;

      if (monochromatic) {
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      } else {
        data[i] = Math.min(255, Math.max(0, data[i] + (Math.random() * 2 - 1) * amount));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + (Math.random() * 2 - 1) * amount));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + (Math.random() * 2 - 1) * amount));
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Apply color overlay effect
   */
  applyColorOverlay(ctx, effect, layer) {
    const {
      color = '#000000',
      opacity = 0.5,
      blendMode = 'normal'
    } = effect.settings || {};

    ctx.save();
    ctx.globalCompositeOperation = blendMode;
    ctx.fillStyle = this.hexToRgba(color, opacity);
    
    const { width, height } = ctx.canvas;
    ctx.fillRect(0, 0, width, height);
    
    ctx.restore();
  }

  /**
   * Apply gradient overlay effect
   */
  applyGradientOverlay(ctx, effect, layer) {
    const {
      gradient = {},
      opacity = 0.5,
      blendMode = 'normal',
      scale = 100
    } = effect.settings || {};

    const { width, height } = ctx.canvas;
    
    ctx.save();
    ctx.globalCompositeOperation = blendMode;
    ctx.globalAlpha = opacity;

    const grad = this.createGradient(ctx, gradient, width, height);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  /**
   * Apply stroke effect
   */
  applyStroke(ctx, effect, layer) {
    const {
      color = '#000000',
      width: strokeWidth = 2,
      position = 'outside',
      opacity = 1
    } = effect.settings || {};

    ctx.save();
    ctx.strokeStyle = this.hexToRgba(color, opacity);
    ctx.lineWidth = strokeWidth * 2; // Double for outside/inside
    ctx.lineJoin = 'round';
    
    if (position === 'center') {
      ctx.lineWidth = strokeWidth;
    }
    
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Apply pixelate effect
   */
  applyPixelate(ctx, effect, layer) {
    const { pixelSize = 10 } = effect.settings || {};
    
    if (pixelSize <= 1) return;

    const { width, height } = ctx.canvas;
    const scaledWidth = Math.ceil(width / pixelSize);
    const scaledHeight = Math.ceil(height / pixelSize);

    // Create temporary canvas for pixelation
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw current state
    tempCtx.drawImage(ctx.canvas, 0, 0);

    // Scale down
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, scaledWidth, scaledHeight);
    
    // Scale back up
    ctx.drawImage(
      ctx.canvas,
      0, 0, scaledWidth, scaledHeight,
      0, 0, width, height
    );
    
    ctx.imageSmoothingEnabled = true;
  }

  /**
   * Apply vignette effect
   */
  applyVignette(ctx, effect, layer) {
    const {
      color = '#000000',
      amount = 0.5,
      feather = 0.5,
      roundness = 0
    } = effect.settings || {};

    const { width, height } = ctx.canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

    ctx.save();
    
    // Create radial gradient
    const gradient = ctx.createRadialGradient(
      centerX, centerY,
      maxRadius * (1 - amount - feather),
      centerX, centerY,
      maxRadius * (1 - amount)
    );

    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.5, this.hexToRgba(color, amount * 0.5));
    gradient.addColorStop(1, this.hexToRgba(color, amount));

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  /**
   * Create gradient from config
   */
  createGradient(ctx, gradientConfig, width, height) {
    const {
      type = 'linear',
      angle = 0,
      stops = [
        { offset: 0, color: '#000000' },
        { offset: 1, color: '#FFFFFF' }
      ]
    } = gradientConfig;

    let gradient;

    if (type === 'linear') {
      const radians = (angle - 90) * Math.PI / 180;
      const x1 = width / 2 - Math.cos(radians) * width / 2;
      const y1 = height / 2 - Math.sin(radians) * height / 2;
      const x2 = width / 2 + Math.cos(radians) * width / 2;
      const y2 = height / 2 + Math.sin(radians) * height / 2;

      gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    } else if (type === 'radial') {
      gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) / 2
      );
    } else {
      // Fallback to linear
      gradient = ctx.createLinearGradient(0, 0, width, height);
    }

    stops.forEach(stop => {
      gradient.addColorStop(stop.offset, stop.color);
    });

    return gradient;
  }

  /**
   * Convert hex color to rgba string
   */
  hexToRgba(hex, alpha = 1) {
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
      return hex.replace(/[\d.]+\)$/, `${alpha})`);
    }

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Gaussian random number generator
   */
  gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * Get effect preview
   */
  getEffectPreview(effectType, settings = {}) {
    // Return a small canvas showing the effect
    const canvas = document.createElement('canvas');
    canvas.width = 50;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');

    // Draw a sample shape
    ctx.fillStyle = '#3498db';
    ctx.fillRect(10, 10, 30, 30);

    // Apply effect
    this.applyEffect(ctx, {
      type: effectType,
      enabled: true,
      settings
    }, null, {});

    return canvas.toDataURL();
  }

  /**
   * Clear effect cache
   */
  clearCache() {
    this.effectCache.clear();
  }
}

export { EffectRenderer };