/**
 * Meme Foundry - Text Measurement
 * Precise text measurement for layout calculations
 */

import { Logger } from '@/utils/logger.js';

class TextMeasurement {
  constructor() {
    this.logger = new Logger('TextMeasurement');
    
    // Measurement cache
    this.cache = new Map();
    this.maxCacheSize = 1000;
    
    // Canvas for measurements
    this.measureCanvas = null;
    this.measureCtx = null;
    
    // Font metrics cache
    this.fontMetricsCache = new Map();
  }

  /**
   * Get measurement canvas (lazy init)
   */
  getMeasureCanvas() {
    if (!this.measureCanvas) {
      this.measureCanvas = document.createElement('canvas');
      this.measureCtx = this.measureCanvas.getContext('2d');
    }
    return { canvas: this.measureCanvas, ctx: this.measureCtx };
  }

  /**
   * Measure text dimensions
   */
  measureText(text, font, maxWidth = null, options = {}) {
    const {
      lineHeight = 1.2,
      letterSpacing = 0,
      wordSpacing = 0
    } = options;
    
    // Check cache
    const cacheKey = this.getCacheKey(text, font, maxWidth, options);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const { ctx } = this.getMeasureCanvas();
    
    // Apply font
    ctx.font = font;
    
    const fontSize = this.extractFontSize(font);
    const actualLineHeight = fontSize * lineHeight;
    
    // Measure text
    let lines;
    
    if (maxWidth && maxWidth > 0) {
      // Word wrap
      lines = this.wrapText(ctx, text, maxWidth, options);
    } else {
      lines = [text];
    }
    
    // Calculate line widths
    const lineMetrics = lines.map((line, index) => {
      const metrics = ctx.measureText(line);
      
      // Add letter spacing to width
      let width = metrics.width;
      if (letterSpacing !== 0 && line.length > 1) {
        width += letterSpacing * (line.length - 1);
      }
      
      return {
        text: line,
        width,
        height: actualLineHeight,
        lineIndex: index,
        yOffset: index * actualLineHeight,
        metrics
      };
    });
    
    const totalWidth = Math.max(...lineMetrics.map(l => l.width), 0);
    const totalHeight = lineMetrics.length * actualLineHeight;
    
    const result = {
      width: totalWidth,
      height: totalHeight,
      lines: lineMetrics.map(l => l.text),
      lineMetrics,
      lineCount: lineMetrics.length,
      lineHeight: actualLineHeight,
      fontSize,
      font,
      maxWidth
    };
    
    // Cache result
    this.cacheResult(cacheKey, result);
    
    return result;
  }

  /**
   * Measure single word width
   */
  measureWordWidth(word, font) {
    const { ctx } = this.getMeasureCanvas();
    ctx.font = font;
    return ctx.measureText(word).width;
  }

  /**
   * Measure character width
   */
  measureCharWidth(char, font) {
    const { ctx } = this.getMeasureCanvas();
    ctx.font = font;
    return ctx.measureText(char).width;
  }

  /**
   * Wrap text to fit width
   */
  wrapText(ctx, text, maxWidth, options = {}) {
    const { letterSpacing = 0, wordSpacing = 0 } = options;
    
    // Handle newlines
    const paragraphs = text.split('\n');
    const allLines = [];
    
    for (const paragraph of paragraphs) {
      if (paragraph.length === 0) {
        allLines.push('');
        continue;
      }
      
      const words = paragraph.split(' ');
      let currentLine = '';
      let currentWidth = 0;
      
      for (const word of words) {
        const wordWidth = ctx.measureText(word).width;
        const spaceWidth = currentLine ? ctx.measureText(' ').width + wordSpacing : 0;
        
        if (currentWidth + spaceWidth + wordWidth > maxWidth && currentLine) {
          // Start new line
          allLines.push(currentLine);
          currentLine = word;
          currentWidth = wordWidth;
        } else {
          currentLine += (currentLine ? ' ' : '') + word;
          currentWidth += spaceWidth + wordWidth;
        }
      }
      
      if (currentLine) {
        allLines.push(currentLine);
      }
    }
    
    return allLines.length > 0 ? allLines : [''];
  }

  /**
   * Get font metrics (ascender, descender, etc.)
   */
  getFontMetrics(font) {
    if (this.fontMetricsCache.has(font)) {
      return this.fontMetricsCache.get(font);
    }
    
    const { ctx } = this.getMeasureCanvas();
    ctx.font = font;
    
    const metrics = ctx.measureText('Hg');
    
    // Approximate font metrics
    const fontSize = this.extractFontSize(font);
    
    const fontMetrics = {
      fontSize,
      // Approximations based on typical font proportions
      ascender: fontSize * 0.8,
      descender: fontSize * 0.2,
      xHeight: fontSize * 0.5,
      capHeight: fontSize * 0.7,
      lineGap: fontSize * 0.2,
      actualBoundingBoxAscent: metrics.actualBoundingBoxAscent,
      actualBoundingBoxDescent: metrics.actualBoundingBoxDescent,
      width: metrics.width
    };
    
    this.fontMetricsCache.set(font, fontMetrics);
    
    return fontMetrics;
  }

  /**
   * Measure text with emoji support
   */
  measureTextWithEmoji(text, font, maxWidth = null, options = {}) {
    // Emoji can be wider than regular characters
    // Add a multiplier for lines containing emoji
    
    const baseResult = this.measureText(text, font, maxWidth, options);
    
    const hasEmoji = /\p{Emoji}/u.test(text);
    
    if (hasEmoji) {
      // Emoji typically take 2 character widths
      const emojiCount = (text.match(/\p{Emoji}/gu) || []).length;
      const emojiExtraWidth = emojiCount * this.extractFontSize(font) * 0.5;
      
      baseResult.width += emojiExtraWidth;
      baseResult.hasEmoji = true;
      baseResult.emojiCount = emojiCount;
    }
    
    return baseResult;
  }

  /**
   * Check if text will overflow bounds
   */
  checkOverflow(text, font, maxWidth, maxHeight, options = {}) {
    const measurement = this.measureText(text, font, maxWidth, options);
    
    return {
      overflows: measurement.width > maxWidth || measurement.height > maxHeight,
      overflowX: measurement.width > maxWidth,
      overflowY: measurement.height > maxHeight,
      widthOverflow: measurement.width - maxWidth,
      heightOverflow: measurement.height - maxHeight,
      measurement
    };
  }

  /**
   * Find maximum font size that fits
   */
  findMaxFontSize(text, maxWidth, maxHeight, fontFamily, options = {}) {
    const {
      minFontSize = 8,
      maxFontSize = 500,
      fontWeight = 'normal',
      fontStyle = 'normal'
    } = options;
    
    // Binary search for optimal size
    let low = minFontSize;
    let high = maxFontSize;
    let bestSize = minFontSize;
    let iterations = 0;
    
    while (low <= high && iterations < 30) {
      const mid = Math.floor((low + high) / 2);
      const font = `${fontStyle} ${fontWeight} ${mid}px ${fontFamily}`;
      const measurement = this.measureText(text, font, maxWidth, options);
      
      if (measurement.width <= maxWidth && measurement.height <= maxHeight) {
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
   * Calculate optimal line length for readability
   */
  getOptimalLineLength(fontSize) {
    // 45-75 characters per line is optimal
    const avgCharWidth = fontSize * 0.5; // Approximation
    return avgCharWidth * 65;
  }

  /**
   * Extract font size from font string
   */
  extractFontSize(font) {
    const match = font.match(/(\d+(?:\.\d+)?)px/);
    return match ? parseFloat(match[1]) : 16;
  }

  /**
   * Generate cache key
   */
  getCacheKey(text, font, maxWidth, options) {
    const { lineHeight, letterSpacing, wordSpacing } = options;
    return `${text}|${font}|${maxWidth}|${lineHeight}|${letterSpacing}|${wordSpacing}`;
  }

  /**
   * Cache result
   */
  cacheResult(key, result) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, result);
  }

  /**
   * Clear caches
   */
  clearCache() {
    this.cache.clear();
    this.fontMetricsCache.clear();
  }

  /**
   * Get text rect (bounding box)
   */
  getTextRect(text, font, x = 0, y = 0) {
    const measurement = this.measureText(text, font);
    
    return {
      x,
      y,
      width: measurement.width,
      height: measurement.height,
      lineCount: measurement.lineCount,
      lineHeight: measurement.lineHeight
    };
  }

  /**
   * Calculate text position for alignment
   */
  calculateTextPosition(text, font, containerWidth, containerHeight, alignment = {}) {
    const measurement = this.measureText(text, font, containerWidth);
    const {
      horizontal = 'center',
      vertical = 'middle'
    } = alignment;
    
    let x, y;
    
    // Horizontal alignment
    switch (horizontal) {
      case 'left':
        x = 0;
        break;
      case 'center':
        x = (containerWidth - measurement.width) / 2;
        break;
      case 'right':
        x = containerWidth - measurement.width;
        break;
      default:
        x = 0;
    }
    
    // Vertical alignment
    switch (vertical) {
      case 'top':
        y = 0;
        break;
      case 'middle':
        y = (containerHeight - measurement.height) / 2;
        break;
      case 'bottom':
        y = containerHeight - measurement.height;
        break;
      default:
        y = 0;
    }
    
    return {
      x: Math.max(0, x),
      y: Math.max(0, y),
      width: measurement.width,
      height: measurement.height,
      lineCount: measurement.lineCount
    };
  }

  /**
   * Get line positions for rendering
   */
  getLinePositions(text, font, maxWidth, startY = 0, options = {}) {
    const measurement = this.measureText(text, font, maxWidth, options);
    const { lineHeight = 1.2 } = options;
    const fontSize = this.extractFontSize(font);
    const actualLineHeight = fontSize * lineHeight;
    
    return measurement.lineMetrics.map((line, index) => ({
      text: line.text,
      y: startY + index * actualLineHeight + actualLineHeight / 2,
      width: line.width,
      lineIndex: index
    }));
  }

  /**
   * Estimate text area
   */
  estimateTextArea(text, fontSize, maxWidth = null) {
    const avgCharsPerLine = maxWidth ? Math.floor(maxWidth / (fontSize * 0.5)) : 40;
    const lines = Math.ceil(text.length / avgCharsPerLine);
    const lineHeight = fontSize * 1.2;
    
    return {
      width: Math.min(maxWidth || Infinity, text.length * fontSize * 0.5),
      height: lines * lineHeight,
      lines,
      charsPerLine: avgCharsPerLine
    };
  }
}

export { TextMeasurement };