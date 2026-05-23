/**
 * Meme Foundry - Adaptive Text Layout Engine
 * Automatically adjusts text size and layout to fit within bounds
 */

import { Logger } from '@/utils/logger.js';
import { TextMeasurement } from './text-measurement.js';
import { OverflowHandler } from './overflow-handler.js';

class AdaptiveLayout {
  constructor() {
    this.logger = new Logger('AdaptiveLayout');
    this.measurement = new TextMeasurement();
    this.overflowHandler = new OverflowHandler();
    
    // Configuration
    this.config = {
      minFontSize: 8,
      maxFontSize: 500,
      defaultFontSize: 48,
      scalingMethod: 'binary', // binary | linear | hybrid
      preserveAspectRatio: true,
      allowOverflow: false,
      wordWrap: true,
      letterSpacing: 0,
      lineHeight: 1.2,
      padding: 10,
      safeAreaAware: true
    };
    
    // Cache
    this.layoutCache = new Map();
    this.maxCacheSize = 500;
  }

  /**
   * Calculate optimal text layout
   */
  calculateLayout(text, bounds, fontConfig, options = {}) {
    const config = { ...this.config, ...options };
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(text, bounds, fontConfig, config);
    
    // Check cache
    if (this.layoutCache.has(cacheKey)) {
      return this.layoutCache.get(cacheKey);
    }
    
    const result = {
      fontSize: config.defaultFontSize,
      lines: [],
      lineHeight: 0,
      totalHeight: 0,
      totalWidth: 0,
      fits: true,
      overflow: null,
      adjustments: []
    };
    
    // Handle empty text
    if (!text || text.trim().length === 0) {
      return result;
    }
    
    // Calculate maximum available space
    const availableWidth = bounds.width - config.padding * 2;
    const availableHeight = bounds.height - config.padding * 2;
    
    if (availableWidth <= 0 || availableHeight <= 0) {
      result.fits = false;
      return result;
    }
    
    // Find optimal font size
    const optimalSize = this.findOptimalFontSize(
      text,
      availableWidth,
      availableHeight,
      fontConfig,
      config
    );
    
    result.fontSize = optimalSize;
    
    // Calculate lines with optimal size
    const font = this.buildFontString(fontConfig, optimalSize);
    const metrics = this.measurement.measureText(text, font, availableWidth, config);
    
    result.lines = metrics.lines;
    result.lineHeight = metrics.lineHeight;
    result.totalHeight = metrics.height;
    result.totalWidth = metrics.width;
    result.fits = metrics.height <= availableHeight && metrics.width <= availableWidth;
    
    // Check for overflow
    if (!result.fits) {
      result.overflow = this.overflowHandler.detectOverflow(
        text, metrics, availableWidth, availableHeight
      );
    }
    
    // Cache result
    this.cacheLayout(cacheKey, result);
    
    return result;
  }

  /**
   * Find optimal font size using various methods
   */
  findOptimalFontSize(text, maxWidth, maxHeight, fontConfig, config) {
    switch (config.scalingMethod) {
      case 'binary':
        return this.binarySearchFontSize(text, maxWidth, maxHeight, fontConfig, config);
        
      case 'linear':
        return this.linearScaleFontSize(text, maxWidth, maxHeight, fontConfig, config);
        
      case 'hybrid':
        // Try linear first, fallback to binary
        const linearSize = this.linearScaleFontSize(text, maxWidth, maxHeight, fontConfig, config);
        if (this.testFontSize(text, linearSize, maxWidth, maxHeight, fontConfig, config).fits) {
          return linearSize;
        }
        return this.binarySearchFontSize(text, maxWidth, maxHeight, fontConfig, config);
        
      default:
        return config.defaultFontSize;
    }
  }

  /**
   * Binary search for optimal font size
   */
  binarySearchFontSize(text, maxWidth, maxHeight, fontConfig, config) {
    let low = config.minFontSize;
    let high = config.maxFontSize;
    let bestSize = config.minFontSize;
    let iterations = 0;
    const maxIterations = 30; // Prevent infinite loops
    
    while (low <= high && iterations < maxIterations) {
      const mid = Math.floor((low + high) / 2);
      const result = this.testFontSize(text, mid, maxWidth, maxHeight, fontConfig, config);
      
      if (result.fits) {
        bestSize = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
      
      iterations++;
    }
    
    return bestSize;
  }

  /**
   * Linear scale font size (faster but less precise)
   */
  linearScaleFontSize(text, maxWidth, maxHeight, fontConfig, config) {
    const baseFont = config.defaultFontSize;
    const baseResult = this.testFontSize(text, baseFont, maxWidth, maxHeight, fontConfig, config);
    
    if (baseResult.fits) {
      // Scale up
      const widthRatio = maxWidth / baseResult.width;
      const heightRatio = maxHeight / baseResult.height;
      const scaleRatio = Math.min(widthRatio, heightRatio);
      return Math.min(config.maxFontSize, Math.floor(baseFont * scaleRatio));
    } else {
      // Scale down
      const widthRatio = maxWidth / baseResult.width;
      const heightRatio = maxHeight / baseResult.height;
      const scaleRatio = Math.min(widthRatio, heightRatio);
      return Math.max(config.minFontSize, Math.floor(baseFont * scaleRatio));
    }
  }

  /**
   * Test if text fits at given font size
   */
  testFontSize(text, fontSize, maxWidth, maxHeight, fontConfig, config) {
    const font = this.buildFontString(fontConfig, fontSize);
    const metrics = this.measurement.measureText(text, font, maxWidth, config);
    
    return {
      fits: metrics.width <= maxWidth && metrics.height <= maxHeight,
      width: metrics.width,
      height: metrics.height,
      lines: metrics.lines.length,
      fontSize
    };
  }

  /**
   * Calculate text position within bounds
   */
  calculatePosition(layout, bounds, alignment = {}) {
    const {
      horizontal = 'center',
      vertical = 'middle'
    } = alignment;
    
    const position = {
      x: bounds.x + this.config.padding,
      y: bounds.y + this.config.padding
    };
    
    // Horizontal alignment
    switch (horizontal) {
      case 'center':
        position.x = bounds.x + (bounds.width - layout.totalWidth) / 2;
        break;
      case 'right':
        position.x = bounds.x + bounds.width - layout.totalWidth - this.config.padding;
        break;
    }
    
    // Vertical alignment
    switch (vertical) {
      case 'middle':
        position.y = bounds.y + (bounds.height - layout.totalHeight) / 2;
        break;
      case 'bottom':
        position.y = bounds.y + bounds.height - layout.totalHeight - this.config.padding;
        break;
    }
    
    return position;
  }

  /**
   * Adjust layout for safe areas
   */
  adjustForSafeAreas(layout, bounds, safeAreas) {
    if (!safeAreas || !this.config.safeAreaAware) {
      return layout;
    }
    
    const adjustedBounds = {
      x: bounds.x + (safeAreas.left || 0),
      y: bounds.y + (safeAreas.top || 0),
      width: bounds.width - (safeAreas.left || 0) - (safeAreas.right || 0),
      height: bounds.height - (safeAreas.top || 0) - (safeAreas.bottom || 0)
    };
    
    // Recalculate if bounds changed
    if (adjustedBounds.width !== bounds.width || adjustedBounds.height !== bounds.height) {
      return this.calculateLayout(
        layout.lines.join(' '),
        adjustedBounds,
        { fontSize: layout.fontSize },
        { defaultFontSize: layout.fontSize }
      );
    }
    
    return layout;
  }

  /**
   * Fit text to specific line count
   */
  fitToLineCount(text, maxLines, bounds, fontConfig, options = {}) {
    const config = { ...this.config, ...options };
    
    let fontSize = config.defaultFontSize;
    const font = this.buildFontString(fontConfig, fontSize);
    let metrics = this.measurement.measureText(text, font, bounds.width, config);
    
    // Binary search for size that gives exact line count
    if (metrics.lines.length > maxLines) {
      let low = config.minFontSize;
      let high = fontSize;
      
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const testFont = this.buildFontString(fontConfig, mid);
        const testMetrics = this.measurement.measureText(text, testFont, bounds.width, config);
        
        if (testMetrics.lines.length <= maxLines) {
          fontSize = mid;
          metrics = testMetrics;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
    }
    
    return {
      fontSize,
      lines: metrics.lines,
      lineHeight: metrics.lineHeight,
      totalHeight: metrics.height,
      totalWidth: metrics.width
    };
  }

  /**
   * Auto-scale text for thumbnail readability
   */
  optimizeForThumbnail(text, bounds, fontConfig, options = {}) {
    // Thumbnails need larger minimum text
    const thumbnailConfig = {
      ...options,
      minFontSize: 16,
      scalingMethod: 'binary'
    };
    
    return this.calculateLayout(text, bounds, fontConfig, thumbnailConfig);
  }

  /**
   * Handle text with mixed fonts/weights
   */
  calculateMixedLayout(textSegments, bounds, options = {}) {
    // textSegments: [{ text, fontConfig }, ...]
    const config = { ...this.config, ...options };
    const availableWidth = bounds.width - config.padding * 2;
    
    const lines = [];
    let currentLine = '';
    let currentWidth = 0;
    let maxWidth = 0;
    let totalHeight = 0;
    let maxLineHeight = 0;
    
    for (const segment of textSegments) {
      const words = segment.text.split(' ');
      
      for (const word of words) {
        const font = this.buildFontString(segment.fontConfig, segment.fontConfig.fontSize);
        const wordWidth = this.measurement.measureWordWidth(word, font);
        const spaceWidth = currentLine ? this.measurement.measureWordWidth(' ', font) : 0;
        
        if (currentWidth + spaceWidth + wordWidth > availableWidth && currentLine) {
          // Start new line
          lines.push({
            text: currentLine,
            width: currentWidth,
            fontConfig: segment.fontConfig
          });
          
          totalHeight += maxLineHeight || (segment.fontConfig.fontSize * config.lineHeight);
          maxWidth = Math.max(maxWidth, currentWidth);
          
          currentLine = word;
          currentWidth = wordWidth;
          maxLineHeight = segment.fontConfig.fontSize * config.lineHeight;
        } else {
          currentLine += (currentLine ? ' ' : '') + word;
          currentWidth += (currentLine ? spaceWidth : 0) + wordWidth;
          maxLineHeight = Math.max(maxLineHeight, segment.fontConfig.fontSize * config.lineHeight);
        }
      }
    }
    
    // Add last line
    if (currentLine) {
      lines.push({
        text: currentLine,
        width: currentWidth,
        fontConfig: textSegments[textSegments.length - 1].fontConfig
      });
      totalHeight += maxLineHeight;
      maxWidth = Math.max(maxWidth, currentWidth);
    }
    
    return {
      lines,
      maxWidth,
      totalHeight,
      lineHeight: maxLineHeight || config.defaultFontSize * config.lineHeight
    };
  }

  /**
   * Build font string for canvas
   */
  buildFontString(fontConfig, fontSize) {
    const {
      fontStyle = 'normal',
      fontWeight = 'normal',
      fontFamily = 'Impact, sans-serif'
    } = fontConfig;
    
    return `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  }

  /**
   * Generate cache key
   */
  generateCacheKey(text, bounds, fontConfig, config) {
    return `${text}-${bounds.width}-${bounds.height}-${fontConfig.fontFamily}-${fontConfig.fontWeight}-${config.minFontSize}-${config.maxFontSize}`;
  }

  /**
   * Cache layout result
   */
  cacheLayout(key, result) {
    if (this.layoutCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.layoutCache.keys().next().value;
      this.layoutCache.delete(firstKey);
    }
    
    this.layoutCache.set(key, result);
  }

  /**
   * Clear layout cache
   */
  clearCache() {
    this.layoutCache.clear();
  }

  /**
   * Get suggested font size for platform
   */
  getPlatformFontSize(platform) {
    const sizes = {
      'instagram': 48,
      'facebook': 40,
      'twitter': 36,
      'youtube': 56,
      'tiktok': 44
    };
    
    return sizes[platform] || 48;
  }

  /**
   * Get optimal line length for readability
   */
  getOptimalLineLength(fontSize) {
    // Optimal line length is typically 45-75 characters
    const avgCharWidth = fontSize * 0.5; // Approximate
    return avgCharWidth * 60; // 60 characters per line
  }

  /**
   * Export layout as JSON
   */
  exportLayout(layout) {
    return JSON.parse(JSON.stringify(layout));
  }
}

export { AdaptiveLayout };