/**
 * Meme Foundry - Image Renderer
 * Handles image loading, caching, and rendering with filters
 */

import { Logger } from '@/utils/logger.js';

class ImageRenderer {
  constructor() {
    this.logger = new Logger('ImageRenderer');
    this.imageCache = new Map();
    this.maxCacheSize = 50;
    this.loadingImages = new Map();
    this.filterCanvas = null;
    this.filterCtx = null;
  }

  /**
   * Render image layer
   */
  async render(ctx, layer, bounds, config) {
    const imageData = layer.image;
    if (!imageData) return;
    
    const { x, y, width, height } = bounds;
    
    try {
      // Load image
      const image = await this.loadImage(imageData.src, imageData.assetId);
      
      if (!image) {
        this.renderPlaceholder(ctx, x, y, width, height);
        return;
      }
      
      ctx.save();
      
      // Apply image filters if needed
      if (this.hasFilters(imageData.filters)) {
        const filteredCanvas = await this.applyFilters(image, imageData.filters);
        this.drawImage(ctx, filteredCanvas, x, y, width, height, imageData);
      } else {
        this.drawImage(ctx, image, x, y, width, height, imageData);
      }
      
      ctx.restore();
      
    } catch (error) {
      this.logger.error('Failed to render image:', error);
      this.renderPlaceholder(ctx, x, y, width, height, 'Error loading image');
    }
  }

  /**
   * Load image from URL or cache
   */
  async loadImage(src, assetId) {
    const cacheKey = assetId || src;
    
    // Check cache
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey);
    }
    
    // Check if already loading
    if (this.loadingImages.has(cacheKey)) {
      return this.loadingImages.get(cacheKey);
    }
    
    // Start loading
    const loadPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        this.loadingImages.delete(cacheKey);
        this.cacheImage(cacheKey, img);
        resolve(img);
      };
      
      img.onerror = (error) => {
        this.loadingImages.delete(cacheKey);
        this.logger.error('Failed to load image:', src, error);
        reject(error);
      };
      
      img.src = src;
    });
    
    this.loadingImages.set(cacheKey, loadPromise);
    return loadPromise;
  }

  /**
   * Cache image
   */
  cacheImage(key, image) {
    // Limit cache size
    if (this.imageCache.size >= this.maxCacheSize) {
      const firstKey = this.imageCache.keys().next().value;
      this.imageCache.delete(firstKey);
    }
    
    this.imageCache.set(key, image);
  }

  /**
   * Draw image with fit mode
   */
  drawImage(ctx, image, x, y, width, height, imageData) {
    const fit = imageData?.fit || 'cover';
    const position = imageData?.position || { x: 50, y: 50 };
    
    ctx.save();
    
    // Clip to bounds
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    
    switch (fit) {
      case 'cover':
        this.drawImageCover(ctx, image, x, y, width, height, position);
        break;
        
      case 'contain':
        this.drawImageContain(ctx, image, x, y, width, height);
        break;
        
      case 'fill':
        this.drawImageFill(ctx, image, x, y, width, height);
        break;
        
      case 'scale-down':
        this.drawImageScaleDown(ctx, image, x, y, width, height);
        break;
        
      case 'none':
      default:
        ctx.drawImage(image, x, y);
        break;
    }
    
    ctx.restore();
  }

  /**
   * Cover fit (like CSS object-fit: cover)
   */
  drawImageCover(ctx, image, x, y, width, height, position) {
    const imgRatio = image.width / image.height;
    const boxRatio = width / height;
    
    let sx, sy, sw, sh;
    
    if (imgRatio > boxRatio) {
      // Image is wider than box
      sw = image.height * boxRatio;
      sh = image.height;
      sx = ((image.width - sw) * (position.x / 100));
      sy = 0;
    } else {
      // Image is taller than box
      sw = image.width;
      sh = image.width / boxRatio;
      sx = 0;
      sy = ((image.height - sh) * (position.y / 100));
    }
    
    ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  }

  /**
   * Contain fit (like CSS object-fit: contain)
   */
  drawImageContain(ctx, image, x, y, width, height) {
    const imgRatio = image.width / image.height;
    const boxRatio = width / height;
    
    let dx, dy, dw, dh;
    
    if (imgRatio > boxRatio) {
      // Image is wider - fit to width
      dw = width;
      dh = width / imgRatio;
      dx = x;
      dy = y + (height - dh) / 2;
    } else {
      // Image is taller - fit to height
      dh = height;
      dw = height * imgRatio;
      dx = x + (width - dw) / 2;
      dy = y;
    }
    
    ctx.drawImage(image, dx, dy, dw, dh);
  }

  /**
   * Fill (stretch to fit)
   */
  drawImageFill(ctx, image, x, y, width, height) {
    ctx.drawImage(image, x, y, width, height);
  }

  /**
   * Scale down (contain but only scale down)
   */
  drawImageScaleDown(ctx, image, x, y, width, height) {
    if (image.width <= width && image.height <= height) {
      // Image fits, center it
      const dx = x + (width - image.width) / 2;
      const dy = y + (height - image.height) / 2;
      ctx.drawImage(image, dx, dy);
    } else {
      // Scale down with contain
      this.drawImageContain(ctx, image, x, y, width, height);
    }
  }

  /**
   * Check if image has filters
   */
  hasFilters(filters) {
    if (!filters) return false;
    
    const { brightness, contrast, saturation, hue, blur, sepia } = filters;
    return brightness !== 100 || contrast !== 100 || saturation !== 100 || 
           hue !== 0 || blur > 0 || sepia > 0;
  }

  /**
   * Apply CSS-like filters to image
   */
  async applyFilters(image, filters) {
    // Create filter canvas if needed
    if (!this.filterCanvas) {
      this.filterCanvas = document.createElement('canvas');
      this.filterCtx = this.filterCanvas.getContext('2d');
    }
    
    // Size canvas to image
    this.filterCanvas.width = image.width;
    this.filterCanvas.height = image.height;
    
    // Build filter string
    const filterString = this.buildFilterString(filters);
    
    // Apply filters using CSS filter
    this.filterCtx.filter = filterString;
    this.filterCtx.drawImage(image, 0, 0);
    this.filterCtx.filter = 'none';
    
    return this.filterCanvas;
  }

  /**
   * Build CSS filter string
   */
  buildFilterString(filters) {
    const parts = [];
    
    if (filters.brightness !== undefined && filters.brightness !== 100) {
      parts.push(`brightness(${filters.brightness}%)`);
    }
    
    if (filters.contrast !== undefined && filters.contrast !== 100) {
      parts.push(`contrast(${filters.contrast}%)`);
    }
    
    if (filters.saturation !== undefined && filters.saturation !== 100) {
      parts.push(`saturate(${filters.saturation}%)`);
    }
    
    if (filters.hue !== undefined && filters.hue !== 0) {
      parts.push(`hue-rotate(${filters.hue}deg)`);
    }
    
    if (filters.blur !== undefined && filters.blur > 0) {
      parts.push(`blur(${filters.blur}px)`);
    }
    
    if (filters.sepia !== undefined && filters.sepia > 0) {
      parts.push(`sepia(${filters.sepia}%)`);
    }
    
    return parts.join(' ');
  }

  /**
   * Render placeholder for missing/broken images
   */
  renderPlaceholder(ctx, x, y, width, height, message = 'No Image') {
    ctx.save();
    
    // Draw placeholder background
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(x, y, width, height);
    
    // Draw border
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
    
    // Draw cross pattern
    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y + height);
    ctx.moveTo(x + width, y);
    ctx.lineTo(x, y + height);
    ctx.stroke();
    
    // Draw message
    ctx.fillStyle = '#a0a0b0';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, x + width / 2, y + height / 2);
    
    ctx.restore();
  }

  /**
   * Preload images
   */
  async preloadImages(imageUrls) {
    const promises = imageUrls.map(url => this.loadImage(url));
    
    try {
      await Promise.allSettled(promises);
      this.logger.info(`Preloaded ${this.imageCache.size} images`);
    } catch (error) {
      this.logger.warn('Some images failed to preload:', error);
    }
  }

  /**
   * Clear image cache
   */
  clearCache() {
    this.imageCache.clear();
    this.loadingImages.clear();
    
    if (this.filterCanvas) {
      this.filterCanvas = null;
      this.filterCtx = null;
    }
  }

  /**
   * Get image from cache
   */
  getCachedImage(key) {
    return this.imageCache.get(key) || null;
  }

  /**
   * Check if image is cached
   */
  isImageCached(key) {
    return this.imageCache.has(key);
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.imageCache.size,
      maxSize: this.maxCacheSize,
      loading: this.loadingImages.size,
      keys: Array.from(this.imageCache.keys())
    };
  }
}

export { ImageRenderer };