/**
 * Meme Foundry - Image Export
 * Handles high-quality image exports with format-specific optimizations
 */

import { Logger } from '@/utils/logger.js';

class ImageExport {
  constructor(canvasRenderer) {
    this.logger = new Logger('ImageExport');
    this.canvasRenderer = canvasRenderer;
  }

  /**
   * Export image in specified format
   */
  async export(format, options = {}) {
    const {
      quality = 0.92,
      width = null,
      height = null,
      scale = 1,
      platform = null,
      signal = null,
      onProgress = null
    } = options;

    try {
      // Report progress
      if (onProgress) onProgress(10);

      // Get source canvas
      const sourceCanvas = this.canvasRenderer.canvas;
      
      // Check for abort
      if (signal?.aborted) throw new Error('Export aborted');

      // Create export canvas with desired dimensions
      const exportCanvas = await this.prepareExportCanvas(
        sourceCanvas,
        width,
        height,
        scale,
        platform
      );

      if (onProgress) onProgress(50);

      // Check for abort
      if (signal?.aborted) throw new Error('Export aborted');

      // Convert to blob
      const blob = await this.canvasToBlob(exportCanvas, format, quality);

      if (onProgress) onProgress(90);

      // Generate thumbnail
      const thumbnail = await this.generateThumbnail(exportCanvas);

      if (onProgress) onProgress(100);

      return {
        blob,
        thumbnail,
        format: `image/${format}`,
        width: exportCanvas.width,
        height: exportCanvas.height,
        size: blob.size
      };

    } catch (error) {
      if (error.message === 'Export aborted') {
        throw error;
      }
      this.logger.error('Image export failed:', error);
      throw new Error(`Image export failed: ${error.message}`);
    }
  }

  /**
   * Prepare canvas for export with proper dimensions
   */
  async prepareExportCanvas(sourceCanvas, targetWidth, targetHeight, scale, platform) {
    // Create new canvas for export
    const canvas = document.createElement('canvas');
    
    // Determine dimensions
    let exportWidth = targetWidth || sourceCanvas.width;
    let exportHeight = targetHeight || sourceCanvas.height;
    
    // Apply platform presets if specified
    if (platform) {
      const preset = this.getPlatformPreset(platform);
      if (preset) {
        exportWidth = preset.width;
        exportHeight = preset.height;
      }
    }
    
    // Apply scale
    if (scale !== 1) {
      exportWidth = Math.round(exportWidth * scale);
      exportHeight = Math.round(exportHeight * scale);
    }
    
    // Set canvas size
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    
    const ctx = canvas.getContext('2d');
    
    // Set high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw source to export canvas with scaling
    ctx.drawImage(
      sourceCanvas,
      0, 0, sourceCanvas.width, sourceCanvas.height,
      0, 0, exportWidth, exportHeight
    );
    
    return canvas;
  }

  /**
   * Convert canvas to blob with format-specific optimizations
   */
  async canvasToBlob(canvas, format, quality) {
    const mimeTypes = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      webp: 'image/webp'
    };
    
    const mimeType = mimeTypes[format] || 'image/png';
    
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
   * Generate thumbnail from canvas
   */
  async generateThumbnail(canvas, maxSize = 300) {
    const thumbCanvas = document.createElement('canvas');
    const ratio = Math.min(maxSize / canvas.width, maxSize / canvas.height);
    
    thumbCanvas.width = Math.round(canvas.width * ratio);
    thumbCanvas.height = Math.round(canvas.height * ratio);
    
    const ctx = thumbCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    
    return new Promise((resolve, reject) => {
      thumbCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({
              blob,
              width: thumbCanvas.width,
              height: thumbCanvas.height,
              dataUrl: thumbCanvas.toDataURL('image/jpeg', 0.7)
            });
          } else {
            reject(new Error('Failed to create thumbnail'));
          }
        },
        'image/jpeg',
        0.7
      );
    });
  }

  /**
   * Get platform-specific dimensions
   */
  getPlatformPreset(platform) {
    const presets = {
      'instagram-post': { width: 1080, height: 1080 },
      'instagram-story': { width: 1080, height: 1920 },
      'instagram-landscape': { width: 1080, height: 566 },
      'facebook-post': { width: 1200, height: 630 },
      'facebook-cover': { width: 820, height: 312 },
      'facebook-story': { width: 1080, height: 1920 },
      'twitter-post': { width: 1200, height: 675 },
      'twitter-header': { width: 1500, height: 500 },
      'youtube-thumbnail': { width: 1280, height: 720 },
      'youtube-shorts': { width: 1080, height: 1920 },
      'tiktok-video': { width: 1080, height: 1920 }
    };
    
    return presets[platform] || null;
  }

  /**
   * Get supported formats
   */
  getSupportedFormats() {
    return [
      {
        id: 'png',
        name: 'PNG',
        mimeType: 'image/png',
        extension: '.png',
        lossless: true,
        supportsTransparency: true
      },
      {
        id: 'jpeg',
        name: 'JPEG',
        mimeType: 'image/jpeg',
        extension: '.jpg',
        lossless: false,
        supportsTransparency: false
      },
      {
        id: 'webp',
        name: 'WebP',
        mimeType: 'image/webp',
        extension: '.webp',
        lossless: false,
        supportsTransparency: true
      }
    ];
  }

  /**
   * Estimate export file size
   */
  estimateFileSize(width, height, format, quality = 0.92) {
    // Rough estimation based on format and dimensions
    const pixelCount = width * height;
    
    const estimates = {
      png: pixelCount * 0.5, // ~0.5 bytes per pixel (compressed)
      jpeg: pixelCount * 0.15 * quality,
      webp: pixelCount * 0.1 * quality
    };
    
    return estimates[format] || pixelCount * 0.5;
  }
}

export { ImageExport };