/**
 * Meme Foundry - Text Renderer
 * Advanced text rendering with adaptive sizing, effects, and safe area awareness
 */

import { Logger } from '@/utils/logger.js';

class TextRenderer {
  constructor() {
    this.logger = new Logger('TextRenderer');
    this.textMeasureCache = new Map();
    this.maxCacheSize = 1000;
  }

  /**
   * Render text layer
   */
  async render(ctx, layer, bounds, config) {
    const text = layer.text;
    if (!text || !text.content) return;
    
    const { x, y, width, height } = bounds;
    const content = text.content;
    
    ctx.save();
    
    // Set up text styles
    this.applyTextStyles(ctx, text);
    
    // Handle adaptive scaling
    let fontSize = text.fontSize;
    if (text.adaptiveScaling && width > 0) {
      fontSize = this.calculateAdaptiveFontSize(
        ctx,
        content,
        width,
        height,
        text.fontFamily,
        text.fontWeight,
        text.fontStyle,
        text.lineHeight,
        text.minFontSize,
        fontSize
      );
    }
    
    // Apply font with calculated size
    ctx.font = this.buildFontString(
      text.fontStyle,
      text.fontWeight,
      fontSize,
      text.fontFamily
    );
    
    // Apply text color
    ctx.fillStyle = text.color || '#FFFFFF';
    
    // Render text shadow
    if (text.shadows?.length > 0) {
      this.applyTextShadows(ctx, text.shadows);
    }
    
    // Render background if specified
    if (text.backgroundColor && text.backgroundColor !== 'transparent') {
      this.renderTextBackground(ctx, content, x, y, width, height, text);
    }
    
    // Render stroke if specified
    if (text.strokeWidth > 0 && text.strokeColor !== 'transparent') {
      this.renderTextStroke(ctx, content, x, y, width, height, text);
    }
    
    // Render main text
    this.renderTextContent(ctx, content, x, y, width, height, text);
    
    ctx.restore();
  }

  /**
   * Apply text styles
   */
  applyTextStyles(ctx, text) {
    ctx.textAlign = text.textAlign || 'center';
    ctx.textBaseline = text.verticalAlign === 'middle' ? 'middle' 
      : text.verticalAlign === 'bottom' ? 'bottom' 
      : 'top';
    ctx.letterSpacing = `${text.letterSpacing || 0}px`;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  /**
   * Build font string
   */
  buildFontString(style = 'normal', weight = 'normal', size = 48, family = 'Impact, sans-serif') {
    return `${style} ${weight} ${size}px ${family}`;
  }

  /**
   * Calculate adaptive font size
   */
  calculateAdaptiveFontSize(ctx, text, maxWidth, maxHeight, fontFamily, fontWeight, fontStyle, lineHeight, minFontSize, maxFontSize) {
    // Binary search for optimal font size
    let low = minFontSize;
    let high = maxFontSize;
    let bestSize = minFontSize;
    const cacheKey = `${text}-${maxWidth}-${maxHeight}-${fontFamily}`;
    
    // Check cache
    if (this.textMeasureCache.has(cacheKey)) {
      return this.textMeasureCache.get(cacheKey);
    }
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      ctx.font = this.buildFontString(fontStyle, fontWeight, mid, fontFamily);
      
      const metrics = this.measureText(ctx, text, maxWidth, lineHeight || 1.2);
      
      if (metrics.width <= maxWidth && metrics.height <= maxHeight) {
        bestSize = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    
    // Cache result
    this.cacheTextMeasure(cacheKey, bestSize);
    
    return bestSize;
  }

  /**
   * Measure text dimensions
   */
  measureText(ctx, text, maxWidth, lineHeight) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    // Word wrapping
    if (maxWidth > 0) {
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
    } else {
      lines.push(text);
    }
    
    // Calculate dimensions
    const lineHeightPx = ctx.fontSize * lineHeight || ctx.fontSize * 1.2;
    const totalHeight = lines.length * lineHeightPx;
    const totalWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    
    return {
      width: totalWidth,
      height: totalHeight,
      lines,
      lineHeight: lineHeightPx
    };
  }

  /**
   * Apply text shadows
   */
  applyTextShadows(ctx, shadows) {
    const shadow = shadows[0]; // Use first shadow (most common for memes)
    ctx.shadowColor = shadow.color || '#000000';
    ctx.shadowBlur = shadow.blur || 0;
    ctx.shadowOffsetX = shadow.offsetX || 0;
    ctx.shadowOffsetY = shadow.offsetY || 0;
    
    // Stack additional shadows (limited browser support)
    if (shadows.length > 1) {
      // Store for manual rendering
      ctx._additionalShadows = shadows.slice(1);
    }
  }

  /**
   * Render text background
   */
  renderTextBackground(ctx, text, x, y, width, height, textConfig) {
    const metrics = this.measureText(ctx, text, width, textConfig.lineHeight);
    const padding = 10;
    
    let bgX = x;
    let bgY = y;
    let bgWidth = metrics.width + padding * 2;
    let bgHeight = metrics.height + padding * 2;
    
    // Adjust position based on text alignment
    if (textConfig.textAlign === 'center') {
      bgX = x + (width - bgWidth) / 2;
    } else if (textConfig.textAlign === 'right') {
      bgX = x + width - bgWidth;
    }
    
    if (textConfig.verticalAlign === 'middle') {
      bgY = y + (height - bgHeight) / 2;
    } else if (textConfig.verticalAlign === 'bottom') {
      bgY = y + height - bgHeight;
    }
    
    ctx.fillStyle = textConfig.backgroundColor;
    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
  }

  /**
   * Render text stroke
   */
  renderTextStroke(ctx, text, x, y, width, height, textConfig) {
    ctx.strokeStyle = textConfig.strokeColor;
    ctx.lineWidth = textConfig.strokeWidth;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    
    const metrics = this.measureText(ctx, text, width, textConfig.lineHeight);
    const lineHeight = metrics.lineHeight;
    
    let startY = y;
    if (textConfig.verticalAlign === 'middle') {
      startY = y + (height - metrics.height) / 2;
    } else if (textConfig.verticalAlign === 'bottom') {
      startY = y + height - metrics.height;
    }
    
    metrics.lines.forEach((line, i) => {
      const lineY = startY + i * lineHeight + lineHeight / 2;
      let lineX = x;
      
      if (textConfig.textAlign === 'center') {
        lineX = x + width / 2;
      } else if (textConfig.textAlign === 'right') {
        lineX = x + width;
      }
      
      ctx.strokeText(line, lineX, lineY);
    });
  }

  /**
   * Render main text content
   */
  renderTextContent(ctx, text, x, y, width, height, textConfig) {
    const metrics = this.measureText(ctx, text, width, textConfig.lineHeight);
    const lineHeight = metrics.lineHeight;
    
    let startY = y;
    if (textConfig.verticalAlign === 'middle') {
      startY = y + (height - metrics.height) / 2;
    } else if (textConfig.verticalAlign === 'bottom') {
      startY = y + height - metrics.height;
    }
    
    // Render additional shadows manually if needed
    if (ctx._additionalShadows) {
      ctx._additionalShadows.forEach(shadow => {
        metrics.lines.forEach((line, i) => {
          const lineY = startY + i * lineHeight + lineHeight / 2;
          let lineX = x;
          
          if (textConfig.textAlign === 'center') {
            lineX = x + width / 2;
          } else if (textConfig.textAlign === 'right') {
            lineX = x + width;
          }
          
          ctx.save();
          ctx.shadowColor = shadow.color;
          ctx.shadowBlur = shadow.blur;
          ctx.shadowOffsetX = shadow.offsetX;
          ctx.shadowOffsetY = shadow.offsetY;
          ctx.fillText(line, lineX, lineY);
          ctx.restore();
        });
      });
      
      delete ctx._additionalShadows;
    }
    
    // Render main text
    metrics.lines.forEach((line, i) => {
      const lineY = startY + i * lineHeight + lineHeight / 2;
      let lineX = x;
      
      if (textConfig.textAlign === 'center') {
        lineX = x + width / 2;
      } else if (textConfig.textAlign === 'right') {
        lineX = x + width;
      }
      
      ctx.fillText(line, lineX, lineY);
    });
  }

  /**
   * Cache text measurement result
   */
  cacheTextMeasure(key, value) {
    if (this.textMeasureCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.textMeasureCache.keys().next().value;
      this.textMeasureCache.delete(firstKey);
    }
    
    this.textMeasureCache.set(key, value);
  }

  /**
   * Clear text measurement cache
   */
  clearCache() {
    this.textMeasureCache.clear();
  }

  /**
   * Detect text overflow
   */
  detectOverflow(ctx, text, maxWidth, maxHeight, fontSize, fontFamily) {
    ctx.font = this.buildFontString('normal', 'normal', fontSize, fontFamily);
    const metrics = this.measureText(ctx, text, maxWidth, 1.2);
    
    return {
      overflows: metrics.width > maxWidth || metrics.height > maxHeight,
      overflowX: metrics.width > maxWidth,
      overflowY: metrics.height > maxHeight,
      measuredWidth: metrics.width,
      measuredHeight: metrics.height,
      lines: metrics.lines.length
    };
  }

  /**
   * Get text metrics for a specific layer
   */
  getTextMetrics(ctx, layer, maxWidth) {
    const text = layer.text;
    if (!text) return null;
    
    ctx.font = this.buildFontString(
      text.fontStyle,
      text.fontWeight,
      text.fontSize,
      text.fontFamily
    );
    
    return this.measureText(ctx, text.content, maxWidth || layer.transform.width, text.lineHeight);
  }
}

export { TextRenderer };