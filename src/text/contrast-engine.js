/**
 * Meme Foundry - Contrast Engine
 * Ensures text readability with automatic contrast adjustments
 */

import { Logger } from '@/utils/logger.js';

class ContrastEngine {
  constructor() {
    this.logger = new Logger('ContrastEngine');
    
    // WCAG contrast ratio thresholds
    this.thresholds = {
      AA: {
        normal: 4.5,
        large: 3.0,
        enhanced: 7.0
      },
      AAA: {
        normal: 7.0,
        large: 4.5,
        enhanced: 10.0
      }
    };
    
    // Color cache
    this.colorCache = new Map();
    this.maxCacheSize = 1000;
  }

  /**
   * Calculate contrast ratio between two colors
   */
  calculateContrastRatio(color1, color2) {
    const cacheKey = `${color1}-${color2}`;
    
    if (this.colorCache.has(cacheKey)) {
      return this.colorCache.get(cacheKey);
    }
    
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    
    const ratio = (lighter + 0.05) / (darker + 0.05);
    
    this.cacheResult(cacheKey, ratio);
    
    return ratio;
  }

  /**
   * Get relative luminance of a color
   */
  getLuminance(color) {
    const rgb = this.parseColor(color);
    if (!rgb) return 0;
    
    // Convert to sRGB
    const srgb = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    // Calculate luminance
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }

  /**
   * Parse color string to RGB
   */
  parseColor(color) {
    if (!color) return null;
    
    // Handle named colors
    const namedColors = {
      'black': '#000000',
      'white': '#FFFFFF',
      'red': '#FF0000',
      'green': '#008000',
      'blue': '#0000FF',
      'yellow': '#FFFF00',
      'orange': '#FFA500',
      'purple': '#800080',
      'pink': '#FFC0CB',
      'gray': '#808080',
      'grey': '#808080',
      'transparent': 'rgba(0,0,0,0)'
    };
    
    if (namedColors[color.toLowerCase()]) {
      color = namedColors[color.toLowerCase()];
    }
    
    // Handle hex colors
    if (color.startsWith('#')) {
      let hex = color.slice(1);
      
      // Expand shorthand hex
      if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
      }
      
      // Add alpha if missing
      if (hex.length === 6) {
        hex += 'FF';
      }
      
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255
      };
    }
    
    // Handle rgb/rgba
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3]),
        a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1
      };
    }
    
    return null;
  }

  /**
   * Check if contrast meets WCAG standards
   */
  meetsWCAG(color1, color2, level = 'AA', size = 'normal') {
    const ratio = this.calculateContrastRatio(color1, color2);
    const threshold = this.thresholds[level]?.[size] || this.thresholds.AA.normal;
    
    return {
      meets: ratio >= threshold,
      ratio,
      threshold,
      level,
      size
    };
  }

  /**
   * Suggest text color with good contrast
   */
  suggestTextColor(backgroundColor, preferColor = null, level = 'AA', size = 'normal') {
    const threshold = this.thresholds[level]?.[size] || 4.5;
    
    // If preferred color meets contrast, use it
    if (preferColor) {
      const ratio = this.calculateContrastRatio(preferColor, backgroundColor);
      if (ratio >= threshold) {
        return {
          color: preferColor,
          ratio,
          adjusted: false
        };
      }
    }
    
    // Try black and white first
    const whiteRatio = this.calculateContrastRatio('#FFFFFF', backgroundColor);
    const blackRatio = this.calculateContrastRatio('#000000', backgroundColor);
    
    if (whiteRatio >= threshold && whiteRatio >= blackRatio) {
      return { color: '#FFFFFF', ratio: whiteRatio, adjusted: true };
    }
    
    if (blackRatio >= threshold) {
      return { color: '#000000', ratio: blackRatio, adjusted: true };
    }
    
    // Adjust preferred color
    if (preferColor) {
      return this.adjustColorContrast(preferColor, backgroundColor, threshold);
    }
    
    // Last resort: adjust luminance
    const bgLum = this.getLuminance(backgroundColor);
    return {
      color: bgLum > 0.5 ? '#000000' : '#FFFFFF',
      ratio: Math.max(whiteRatio, blackRatio),
      adjusted: true
    };
  }

  /**
   * Adjust color to meet contrast requirements
   */
  adjustColorContrast(color, backgroundColor, targetRatio) {
    const rgb = this.parseColor(color);
    if (!rgb) return { color: '#FFFFFF', ratio: 21, adjusted: true };
    
    const bgLum = this.getLuminance(backgroundColor);
    let step = bgLum > 0.5 ? -0.05 : 0.05;
    let attempts = 0;
    let currentColor = { ...rgb };
    
    while (attempts < 20) {
      const adjustedColor = this.rgbToHex(currentColor);
      const ratio = this.calculateContrastRatio(adjustedColor, backgroundColor);
      
      if (ratio >= targetRatio) {
        return {
          color: adjustedColor,
          ratio,
          adjusted: true
        };
      }
      
      // Adjust luminance
      currentColor.r = Math.max(0, Math.min(255, currentColor.r + step * 255));
      currentColor.g = Math.max(0, Math.min(255, currentColor.g + step * 255));
      currentColor.b = Math.max(0, Math.min(255, currentColor.b + step * 255));
      
      attempts++;
    }
    
    // Fallback
    return {
      color: bgLum > 0.5 ? '#000000' : '#FFFFFF',
      ratio: this.calculateContrastRatio(bgLum > 0.5 ? '#000000' : '#FFFFFF', backgroundColor),
      adjusted: true
    };
  }

  /**
   * Convert RGB to hex
   */
  rgbToHex(rgb) {
    const toHex = (n) => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  /**
   * Suggest stroke/outline for text
   */
  suggestTextStroke(textColor, backgroundColor, level = 'AA') {
    const threshold = this.thresholds[level]?.large || 3.0;
    
    // Check if stroke is needed
    const ratio = this.calculateContrastRatio(textColor, backgroundColor);
    
    if (ratio >= threshold) {
      return {
        needed: false,
        strokeColor: null,
        strokeWidth: 0
      };
    }
    
    // Suggest stroke
    const bgLum = this.getLuminance(backgroundColor);
    const strokeColor = bgLum > 0.5 ? '#000000' : '#FFFFFF';
    const strokeRatio = this.calculateContrastRatio(textColor, strokeColor);
    
    return {
      needed: true,
      strokeColor,
      strokeWidth: Math.max(2, Math.ceil((threshold - ratio) * 2)),
      strokeRatio
    };
  }

  /**
   * Analyze text contrast on image background
   */
  async analyzeImageContrast(imageData, textBounds) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    
    // Get average color behind text
    const textArea = ctx.getImageData(
      textBounds.x, textBounds.y,
      textBounds.width, textBounds.height
    );
    
    const avgColor = this.getAverageColor(textArea.data);
    const bgHex = this.rgbToHex(avgColor);
    
    return {
      averageBackground: bgHex,
      luminance: this.getLuminance(bgHex),
      suggestedTextColor: this.suggestTextColor(bgHex),
      suggestedStroke: this.suggestTextStroke('#FFFFFF', bgHex)
    };
  }

  /**
   * Get average color from pixel data
   */
  getAverageColor(data) {
    let r = 0, g = 0, b = 0, count = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    
    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count)
    };
  }

  /**
   * Generate contrasting color palette
   */
  generateContrastingPalette(baseColor, count = 5) {
    const base = this.parseColor(baseColor);
    if (!base) return [];
    
    const palette = [];
    const baseLum = this.getLuminance(baseColor);
    
    for (let i = 0; i < count; i++) {
      const hue = (i * 360 / count + 30) % 360;
      const lum = baseLum > 0.5 ? 0.2 + (i * 0.15) : 0.8 - (i * 0.15);
      
      palette.push({
        color: this.hslToHex(hue, 0.7, lum),
        contrast: this.calculateContrastRatio(
          this.hslToHex(hue, 0.7, lum),
          baseColor
        )
      });
    }
    
    return palette;
  }

  /**
   * Convert HSL to hex
   */
  hslToHex(h, s, l) {
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  /**
   * Get WCAG contrast level
   */
  getWCAGLevel(ratio, size = 'normal') {
    if (ratio >= this.thresholds.AAA.enhanced) return 'AAA+';
    if (ratio >= this.thresholds.AAA[size]) return 'AAA';
    if (ratio >= this.thresholds.AA[size]) return 'AA';
    return 'Fail';
  }

  /**
   * Check contrast for meme text
   */
  checkMemeTextContrast(textLayer, backgroundColor) {
    const text = textLayer.text;
    if (!text) return null;
    
    const textColor = text.color || '#FFFFFF';
    const strokeColor = text.strokeColor || '#000000';
    const strokeWidth = text.strokeWidth || 2;
    
    const textContrast = this.meetsWCAG(textColor, backgroundColor, 'AA', 'large');
    const strokeContrast = this.meetsWCAG(strokeColor, backgroundColor, 'AA', 'large');
    
    return {
      textContrast,
      strokeContrast,
      readable: textContrast.meets || strokeContrast.meets,
      recommendations: this.generateRecommendations(textContrast, strokeContrast)
    };
  }

  /**
   * Generate contrast recommendations
   */
  generateRecommendations(textContrast, strokeContrast) {
    const recommendations = [];
    
    if (!textContrast.meets && !strokeContrast.meets) {
      recommendations.push({
        type: 'warning',
        message: 'Text may be hard to read',
        action: 'increase-contrast'
      });
      
      recommendations.push({
        type: 'suggestion',
        message: 'Increase stroke width or use contrasting stroke color',
        action: 'adjust-stroke'
      });
    } else if (!textContrast.meets) {
      recommendations.push({
        type: 'suggestion',
        message: 'Text color has low contrast, but stroke provides readability',
        action: 'lighten-text'
      });
    }
    
    if (textContrast.ratio < 3.0) {
      recommendations.push({
        type: 'critical',
        message: 'Text contrast is critically low',
        action: 'fix-contrast'
      });
    }
    
    return recommendations;
  }

  /**
   * Cache result
   */
  cacheResult(key, value) {
    if (this.colorCache.size >= this.maxCacheSize) {
      const firstKey = this.colorCache.keys().next().value;
      this.colorCache.delete(firstKey);
    }
    
    this.colorCache.set(key, value);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.colorCache.clear();
  }

  /**
   * Get contrast report for entire scene
   */
  generateSceneContrastReport(scene) {
    const report = {
      backgroundColor: scene.canvas.backgroundColor,
      layers: [],
      summary: {
        passes: 0,
        warnings: 0,
        failures: 0
      }
    };
    
    scene.layers.forEach(layer => {
      if (layer.type === 'text' && layer.text) {
        const check = this.checkMemeTextContrast(layer, scene.canvas.backgroundColor);
        
        report.layers.push({
          layerId: layer.id,
          layerName: layer.name,
          ...check
        });
        
        if (check.readable) {
          report.summary.passes++;
        } else if (check.textContrast.ratio >= 3.0) {
          report.summary.warnings++;
        } else {
          report.summary.failures++;
        }
      }
    });
    
    return report;
  }
}

export { ContrastEngine };