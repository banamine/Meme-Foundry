/**
 * Meme Foundry - Text Overflow Handler
 * Detects and handles text overflow with various strategies
 */

import { Logger } from '@/utils/logger.js';

class OverflowHandler {
  constructor() {
    this.logger = new Logger('OverflowHandler');
    
    // Overflow strategies
    this.strategies = {
      NONE: 'none',           // Do nothing
      TRUNCATE: 'truncate',   // Cut off with ellipsis
      SHRINK: 'shrink',       // Reduce font size
      WRAP: 'wrap',           // Force word wrap
      SCROLL: 'scroll',       // Scroll (for marquee)
      ADAPT: 'adapt'          // Intelligent adaptation
    };
    
    // Default configuration
    this.config = {
      defaultStrategy: 'shrink',
      minFontSize: 8,
      maxLines: 10,
      ellipsis: '...',
      truncatePosition: 'end', // 'start', 'middle', 'end'
      shrinkStep: 1,
      allowHyphenation: false,
      preserveWords: true
    };
  }

  /**
   * Detect overflow
   */
  detectOverflow(text, measurement, maxWidth, maxHeight) {
    return {
      hasOverflow: measurement.width > maxWidth || measurement.height > maxHeight,
      horizontal: measurement.width > maxWidth,
      vertical: measurement.height > maxHeight,
      overflowX: Math.max(0, measurement.width - maxWidth),
      overflowY: Math.max(0, measurement.height - maxHeight),
      overflowRatio: {
        width: maxWidth > 0 ? measurement.width / maxWidth : 1,
        height: maxHeight > 0 ? measurement.height / maxHeight : 1
      }
    };
  }

  /**
   * Handle overflow with specified strategy
   */
  handleOverflow(text, font, maxWidth, maxHeight, strategy = null, options = {}) {
    const config = { ...this.config, ...options };
    const selectedStrategy = strategy || config.defaultStrategy;
    
    switch (selectedStrategy) {
      case 'truncate':
        return this.truncateText(text, font, maxWidth, maxHeight, config);
        
      case 'shrink':
        return this.shrinkText(text, font, maxWidth, maxHeight, config);
        
      case 'wrap':
        return this.wrapText(text, font, maxWidth, maxHeight, config);
        
      case 'adapt':
        return this.adaptText(text, font, maxWidth, maxHeight, config);
        
      default:
        return { text, fontSize: this.extractFontSize(font), strategy: 'none' };
    }
  }

  /**
   * Truncate text with ellipsis
   */
  truncateText(text, font, maxWidth, maxHeight, config) {
    const measureCanvas = document.createElement('canvas');
    const ctx = measureCanvas.getContext('2d');
    ctx.font = font;
    
    const ellipsis = config.ellipsis;
    const ellipsisWidth = ctx.measureText(ellipsis).width;
    const availableWidth = maxWidth - ellipsisWidth;
    
    if (availableWidth <= 0) {
      return { text: ellipsis, fontSize: this.extractFontSize(font), strategy: 'truncate' };
    }
    
    let truncated = text;
    
    // Binary search for truncation point
    let low = 0;
    let high = text.length;
    let bestLength = 0;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const testText = text.substring(0, mid);
      const width = ctx.measureText(testText).width;
      
      if (width <= availableWidth) {
        bestLength = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    
    // Adjust to preserve whole words
    if (config.preserveWords && bestLength > 0) {
      const spaceIndex = text.lastIndexOf(' ', bestLength);
      if (spaceIndex > 0) {
        bestLength = spaceIndex;
      }
    }
    
    truncated = text.substring(0, bestLength) + ellipsis;
    
    return {
      text: truncated,
      fontSize: this.extractFontSize(font),
      strategy: 'truncate',
      originalLength: text.length,
      truncatedLength: truncated.length
    };
  }

  /**
   * Shrink font size to fit
   */
  shrinkText(text, font, maxWidth, maxHeight, config) {
    const measureCanvas = document.createElement('canvas');
    const ctx = measureCanvas.getContext('2d');
    
    let fontSize = this.extractFontSize(font);
    const originalFontSize = fontSize;
    const fontFamily = this.extractFontFamily(font);
    const fontWeight = this.extractFontWeight(font);
    const fontStyle = this.extractFontStyle(font);
    
    while (fontSize > config.minFontSize) {
      const testFont = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.font = testFont;
      
      const metrics = this.measureWrapped(ctx, text, maxWidth, config);
      
      if (metrics.height <= maxHeight && metrics.maxWidth <= maxWidth) {
        return {
          text,
          fontSize,
          strategy: 'shrink',
          originalFontSize,
          shrunkBy: originalFontSize - fontSize,
          lines: metrics.lines
        };
      }
      
      fontSize -= config.shrinkStep;
    }
    
    // At minimum size, try truncation
    const truncated = this.truncateText(text, font, maxWidth, maxHeight, config);
    return {
      ...truncated,
      fontSize: config.minFontSize,
      strategy: 'shrink+truncate',
      originalFontSize
    };
  }

  /**
   * Force word wrap
   */
  wrapText(text, font, maxWidth, maxHeight, config) {
    const measureCanvas = document.createElement('canvas');
    const ctx = measureCanvas.getContext('2d');
    ctx.font = font;
    
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = ctx.measureText(testLine).width;
      
      if (width > maxWidth && currentLine) {
        // If word itself is too long, break it
        if (ctx.measureText(word).width > maxWidth && config.allowHyphenation) {
          const brokenWord = this.breakWord(ctx, word, maxWidth);
          lines.push(currentLine + ' ' + brokenWord[0] + '-');
          currentLine = brokenWord[1] || '';
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Check if we exceed max lines
    if (lines.length > config.maxLines) {
      lines.length = config.maxLines;
      lines[config.maxLines - 1] = this.truncateLine(
        ctx, lines[config.maxLines - 1], maxWidth, config.ellipsis
      );
    }
    
    return {
      text: lines.join('\n'),
      lines,
      lineCount: lines.length,
      fontSize: this.extractFontSize(font),
      strategy: 'wrap'
    };
  }

  /**
   * Intelligent text adaptation
   */
  adaptText(text, font, maxWidth, maxHeight, config) {
    // Try strategies in order of preference
    const strategies = ['shrink', 'wrap', 'truncate'];
    
    let bestResult = null;
    let bestScore = -Infinity;
    
    for (const strategy of strategies) {
      const result = this.handleOverflow(text, font, maxWidth, maxHeight, strategy, config);
      
      // Score result based on readability
      const score = this.scoreResult(result, text.length);
      
      if (score > bestScore) {
        bestScore = score;
        bestResult = result;
      }
      
      // If we found a good result, stop
      if (score > 0.8) break;
    }
    
    return bestResult;
  }

  /**
   * Score adaptation result
   */
  scoreResult(result, originalLength) {
    let score = 0;
    
    // Prefer less truncation
    if (result.originalLength) {
      const truncationRatio = result.truncatedLength / result.originalLength;
      score += truncationRatio * 0.4;
    } else {
      score += 0.4;
    }
    
    // Prefer less shrinkage
    if (result.shrunkBy !== undefined) {
      const shrinkRatio = 1 - (result.shrunkBy / result.originalFontSize);
      score += Math.max(0, shrinkRatio) * 0.3;
    } else {
      score += 0.3;
    }
    
    // Prefer fewer lines
    if (result.lineCount) {
      score += Math.max(0, (1 - result.lineCount / 10)) * 0.3;
    }
    
    return score;
  }

  /**
   * Break long word with hyphenation
   */
  breakWord(ctx, word, maxWidth) {
    let bestBreak = 0;
    
    for (let i = 1; i < word.length; i++) {
      const prefix = word.substring(0, i);
      if (ctx.measureText(prefix).width <= maxWidth) {
        bestBreak = i;
      } else {
        break;
      }
    }
    
    if (bestBreak === 0) {
      // Can't break, force single character
      return [word.substring(0, 1), word.substring(1)];
    }
    
    return [
      word.substring(0, bestBreak),
      word.substring(bestBreak)
    ];
  }

  /**
   * Truncate single line
   */
  truncateLine(ctx, line, maxWidth, ellipsis) {
    const ellipsisWidth = ctx.measureText(ellipsis).width;
    
    if (ctx.measureText(line).width <= maxWidth) {
      return line;
    }
    
    let truncated = line;
    
    while (ctx.measureText(truncated + ellipsis).width > maxWidth && truncated.length > 0) {
      truncated = truncated.substring(0, truncated.length - 1);
    }
    
    return truncated + ellipsis;
  }

  /**
   * Measure wrapped text
   */
  measureWrapped(ctx, text, maxWidth, config) {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';
    let maxLineWidth = 0;
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = ctx.measureText(testLine).width;
      
      if (width > maxWidth && currentLine) {
        const currentWidth = ctx.measureText(currentLine).width;
        maxLineWidth = Math.max(maxLineWidth, currentWidth);
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      const currentWidth = ctx.measureText(currentLine).width;
      maxLineWidth = Math.max(maxLineWidth, currentWidth);
      lines.push(currentLine);
    }
    
    return {
      lines,
      lineCount: lines.length,
      maxWidth: maxLineWidth,
      height: lines.length * (this.extractFontSize(ctx.font) * 1.2)
    };
  }

  /**
   * Extract font size from font string
   */
  extractFontSize(font) {
    const match = font.match(/(\d+(?:\.\d+)?)px/);
    return match ? parseFloat(match[1]) : 16;
  }

  /**
   * Extract font family from font string
   */
  extractFontFamily(font) {
    const parts = font.split(' ');
    // Remove style, weight, and size
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].includes('px')) {
        return parts.slice(i + 1).join(' ');
      }
    }
    return 'sans-serif';
  }

  /**
   * Extract font weight from font string
   */
  extractFontWeight(font) {
    const weights = ['normal', 'bold', 'bolder', 'lighter', 
                     '100', '200', '300', '400', '500', '600', '700', '800', '900'];
    
    const parts = font.split(' ');
    for (const part of parts) {
      if (weights.includes(part)) {
        return part;
      }
    }
    return 'normal';
  }

  /**
   * Extract font style from font string
   */
  extractFontStyle(font) {
    const styles = ['normal', 'italic', 'oblique'];
    const parts = font.split(' ');
    
    for (const part of parts) {
      if (styles.includes(part)) {
        return part;
      }
    }
    return 'normal';
  }

  /**
   * Check if text needs overflow handling
   */
  needsHandling(text, font, maxWidth, maxHeight) {
    const measureCanvas = document.createElement('canvas');
    const ctx = measureCanvas.getContext('2d');
    ctx.font = font;
    
    const metrics = this.measureWrapped(ctx, text, maxWidth, this.config);
    
    return {
      needsHandling: metrics.maxWidth > maxWidth || metrics.height > maxHeight,
      overflowX: metrics.maxWidth > maxWidth,
      overflowY: metrics.height > maxHeight,
      suggestedStrategy: this.suggestStrategy(metrics, maxWidth, maxHeight)
    };
  }

  /**
   * Suggest best overflow strategy
   */
  suggestStrategy(metrics, maxWidth, maxHeight) {
    const widthRatio = metrics.maxWidth / maxWidth;
    const heightRatio = metrics.height / maxHeight;
    const maxRatio = Math.max(widthRatio, heightRatio);
    
    if (maxRatio <= 1.05) return 'shrink';
    if (maxRatio <= 1.5) return 'wrap';
    if (metrics.lineCount > 3) return 'shrink';
    return 'truncate';
  }
}

export { OverflowHandler };