/**
 * Meme Foundry - Compression Service
 * Image and media compression with quality optimization
 */

import { Logger } from '@/utils/logger.js';

class CompressionService {
  constructor() {
    this.logger = new Logger('CompressionService');
    
    // Compression presets
    this.presets = {
      maximum: {
        quality: 1.0,
        maxWidth: 3840,
        maxHeight: 2160,
        format: 'png'
      },
      high: {
        quality: 0.92,
        maxWidth: 2560,
        maxHeight: 1440,
        format: 'jpeg'
      },
      medium: {
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1080,
        format: 'jpeg'
      },
      low: {
        quality: 0.6,
        maxWidth: 1280,
        maxHeight: 720,
        format: 'jpeg'
      },
      thumbnail: {
        quality: 0.7,
        maxWidth: 300,
        maxHeight: 300,
        format: 'jpeg'
      },
      web: {
        quality: 0.85,
        maxWidth: 1920,
        maxHeight: 1080,
        format: 'webp'
      },
      social: {
        quality: 0.9,
        maxWidth: 1080,
        maxHeight: 1080,
        format: 'jpeg'
      }
    };
    
    // Format-specific settings
    this.formatSettings = {
      'image/jpeg': {
        quality: 0.85,
        progressive: true,
        optimizeCoding: true
      },
      'image/png': {
        compressionLevel: 6,
        palette: false
      },
      'image/webp': {
        quality: 0.85,
        lossless: false,
        alphaQuality: 80
      }
    };
  }

  /**
   * Compress image file
   */
  async compressImage(file, options = {}) {
    const {
      preset = 'medium',
      quality = null,
      maxWidth = null,
      maxHeight = null,
      format = null,
      stripMetadata = false,
      progressive = true
    } = options;
    
    try {
      // Get preset settings
      const presetSettings = this.presets[preset] || this.presets.medium;
      
      // Merge settings
      const settings = {
        quality: quality || presetSettings.quality,
        maxWidth: maxWidth || presetSettings.maxWidth,
        maxHeight: maxHeight || presetSettings.maxHeight,
        format: format || presetSettings.format,
        stripMetadata,
        progressive
      };
      
      // Load image
      const img = await this.loadImage(file);
      
      // Calculate target dimensions
      const dimensions = this.calculateDimensions(
        img.width, img.height,
        settings.maxWidth, settings.maxHeight
      );
      
      // Create canvas for compression
      const canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      
      const ctx = canvas.getContext('2d');
      
      // Set high quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw image
      ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
      
      // Apply strip metadata if needed
      if (stripMetadata) {
        this.stripCanvasMetadata(ctx, dimensions);
      }
      
      // Convert to blob with compression
      const mimeType = this.getMimeType(settings.format);
      const blob = await this.canvasToBlob(canvas, mimeType, settings.quality);
      
      // Calculate compression ratio
      const compressionRatio = file.size / blob.size;
      
      this.logger.debug(
        `Compressed ${file.name}: ${this.formatBytes(file.size)} → ${this.formatBytes(blob.size)} (${compressionRatio.toFixed(2)}x)`
      );
      
      return {
        blob,
        originalSize: file.size,
        compressedSize: blob.size,
        compressionRatio,
        dimensions,
        format: mimeType,
        quality: settings.quality
      };
      
    } catch (error) {
      this.logger.error('Image compression failed:', error);
      throw error;
    }
  }

  /**
   * Compress multiple images
   */
  async compressImages(files, options = {}) {
    const results = [];
    
    for (const file of files) {
      try {
        const result = await this.compressImage(file, options);
        results.push({ success: true, result, file: file.name });
      } catch (error) {
        results.push({ success: false, error, file: file.name });
      }
    }
    
    return results;
  }

  /**
   * Optimize image for specific platform
   */
  async optimizeForPlatform(file, platform, type = 'post') {
    const platformPresets = {
      'instagram-post': { width: 1080, height: 1080, quality: 0.92, format: 'jpeg' },
      'instagram-story': { width: 1080, height: 1920, quality: 0.9, format: 'jpeg' },
      'facebook-post': { width: 1200, height: 630, quality: 0.9, format: 'jpeg' },
      'twitter-post': { width: 1200, height: 675, quality: 0.85, format: 'jpeg' },
      'youtube-thumbnail': { width: 1280, height: 720, quality: 0.95, format: 'jpeg' },
      'tiktok-video': { width: 1080, height: 1920, quality: 0.9, format: 'jpeg' }
    };
    
    const key = `${platform}-${type}`;
    const preset = platformPresets[key] || { width: 1080, height: 1080, quality: 0.9, format: 'jpeg' };
    
    return this.compressImage(file, preset);
  }

  /**
   * Load image from file
   */
  loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target.result;
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Calculate optimal dimensions
   */
  calculateDimensions(srcWidth, srcHeight, maxWidth, maxHeight) {
    let width = srcWidth;
    let height = srcHeight;
    
    // Scale down if too large
    if (maxWidth && width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }
    
    if (maxHeight && height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }
    
    // Round to integers
    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  /**
   * Convert canvas to blob
   */
  canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        mimeType,
        quality
      );
    });
  }

  /**
   * Strip metadata from canvas
   */
  stripCanvasMetadata(ctx, dimensions) {
    // Canvas doesn't preserve metadata, so no action needed
    // This method exists for API consistency
  }

  /**
   * Get MIME type from format
   */
  getMimeType(format) {
    const mimeTypes = {
      'png': 'image/png',
      'jpeg': 'image/jpeg',
      'jpg': 'image/jpeg',
      'webp': 'image/webp',
      'bmp': 'image/bmp'
    };
    
    return mimeTypes[format] || 'image/jpeg';
  }

  /**
   * Detect optimal format for image
   */
  detectOptimalFormat(imageData, options = {}) {
    const { preferTransparency = false, preferLossless = false } = options;
    
    // Check for transparency
    if (preferTransparency || this.hasTransparency(imageData)) {
      return preferLossless ? 'image/png' : 'image/webp';
    }
    
    // Use WebP if available, otherwise JPEG
    const supportsWebP = this.checkWebPSupport();
    return supportsWebP ? 'image/webp' : 'image/jpeg';
  }

  /**
   * Check if image has transparency
   */
  hasTransparency(imageData) {
    if (!imageData) return false;
    
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  }

  /**
   * Check WebP support
   */
  checkWebPSupport() {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Estimate compressed file size
   */
  estimateCompressedSize(width, height, format = 'jpeg', quality = 0.85) {
    const pixelCount = width * height;
    
    const estimates = {
      'jpeg': pixelCount * 0.15 * quality,
      'png': pixelCount * 0.5,
      'webp': pixelCount * 0.1 * quality
    };
    
    return estimates[format] || pixelCount * 0.2;
  }

  /**
   * Find optimal quality to meet target size
   */
  async compressToTargetSize(file, targetSize, options = {}) {
    const { format = 'jpeg', minQuality = 0.1, maxQuality = 1.0 } = options;
    
    let low = minQuality;
    let high = maxQuality;
    let bestResult = null;
    const iterations = 8; // Binary search iterations
    
    for (let i = 0; i < iterations; i++) {
      const quality = (low + high) / 2;
      
      const result = await this.compressImage(file, { quality, format });
      
      if (Math.abs(result.compressedSize - targetSize) / targetSize < 0.05) {
        // Within 5% of target
        return result;
      }
      
      if (result.compressedSize > targetSize) {
        high = quality;
      } else {
        low = quality;
        bestResult = result;
      }
    }
    
    return bestResult;
  }

  /**
   * Create progressive JPEG
   */
  async createProgressiveJPEG(file) {
    return this.compressImage(file, {
      format: 'jpeg',
      progressive: true,
      quality: 0.85
    });
  }

  /**
   * Compress canvas directly
   */
  async compressCanvas(canvas, options = {}) {
    const {
      quality = 0.85,
      format = 'jpeg',
      maxWidth = null,
      maxHeight = null
    } = options;
    
    let targetCanvas = canvas;
    
    // Resize if needed
    if ((maxWidth && canvas.width > maxWidth) || (maxHeight && canvas.height > maxHeight)) {
      const dimensions = this.calculateDimensions(
        canvas.width, canvas.height,
        maxWidth, maxHeight
      );
      
      targetCanvas = document.createElement('canvas');
      targetCanvas.width = dimensions.width;
      targetCanvas.height = dimensions.height;
      
      const ctx = targetCanvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(canvas, 0, 0, dimensions.width, dimensions.height);
    }
    
    const mimeType = this.getMimeType(format);
    const blob = await this.canvasToBlob(targetCanvas, mimeType, quality);
    
    return blob;
  }

  /**
   * Get compression statistics
   */
  getCompressionStats(originalSize, compressedSize) {
    const ratio = originalSize / compressedSize;
    const savings = originalSize - compressedSize;
    const savingsPercent = (savings / originalSize) * 100;
    
    return {
      originalSize: this.formatBytes(originalSize),
      compressedSize: this.formatBytes(compressedSize),
      ratio: ratio.toFixed(2) + 'x',
      savings: this.formatBytes(savings),
      savingsPercent: savingsPercent.toFixed(1) + '%'
    };
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Get preset list
   */
  getPresets() {
    return Object.entries(this.presets).map(([name, settings]) => ({
      name,
      ...settings
    }));
  }
}

export { CompressionService };