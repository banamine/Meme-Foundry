/**
 * Meme Foundry - Media Loader
 * Handles loading, preprocessing, and caching of media files
 */

import { Logger } from '@/utils/logger.js';
import { MediaValidator } from './media-validator.js';
import { VideoNormalizer } from './video-normalizer.js';
import { AudioNormalizer } from './audio-normalizer.js';
import { MetadataExtractor } from './metadata-extractor.js';

class MediaLoader {
  constructor() {
    this.logger = new Logger('MediaLoader');
    this.validator = new MediaValidator();
    this.videoNormalizer = new VideoNormalizer();
    this.audioNormalizer = new AudioNormalizer();
    this.metadataExtractor = new MetadataExtractor();
    
    // Asset registry
    this.assets = new Map();
    this.loadingAssets = new Map();
    
    // Configuration
    this.config = {
      maxConcurrentLoads: 3,
      loadTimeout: 30000,
      enablePreprocessing: true,
      generateThumbnails: true,
      thumbnailSize: 300,
      cacheInMemory: true,
      maxMemoryCache: 500 * 1024 * 1024 // 500MB
    };
    
    // Memory tracking
    this.memoryUsage = 0;
  }

  /**
   * Load media file
   */
  async loadMedia(file, options = {}) {
    // Validate file first
    const validation = await this.validator.validateFile(file);
    
    if (!validation.valid) {
      throw new Error(`Invalid file: ${validation.errors.join(', ')}`);
    }
    
    const assetId = crypto.randomUUID();
    const mediaType = validation.metadata.type;
    
    // Create loading entry
    this.loadingAssets.set(assetId, {
      id: assetId,
      file,
      mediaType,
      status: 'loading',
      progress: 0,
      startTime: Date.now()
    });
    
    this.emit('media:loading', { assetId, file, mediaType });
    
    try {
      let asset;
      
      switch (mediaType) {
        case 'image':
          asset = await this.loadImage(file, assetId, options);
          break;
          
        case 'video':
          asset = await this.loadVideo(file, assetId, options);
          break;
          
        case 'audio':
          asset = await this.loadAudio(file, assetId, options);
          break;
          
        default:
          throw new Error(`Unsupported media type: ${mediaType}`);
      }
      
      // Store asset
      this.assets.set(assetId, asset);
      this.loadingAssets.delete(assetId);
      
      // Track memory
      if (asset.size) {
        this.memoryUsage += asset.size;
      }
      
      this.emit('media:loaded', { assetId, asset });
      
      return asset;
      
    } catch (error) {
      this.loadingAssets.delete(assetId);
      
      this.emit('media:error', { assetId, error });
      throw error;
    }
  }

  /**
   * Load image file
   */
  async loadImage(file, assetId, options = {}) {
    const url = URL.createObjectURL(file);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      const timeout = setTimeout(() => {
        reject(new Error('Image load timeout'));
      }, this.config.loadTimeout);
      
      img.onload = async () => {
        clearTimeout(timeout);
        
        // Extract EXIF data
        const metadata = await this.metadataExtractor.extractImageMetadata(file);
        
        // Check for EXIF orientation
        const needsNormalization = metadata.orientation && metadata.orientation !== 1;
        
        const asset = {
          id: assetId,
          type: 'image',
          file,
          url,
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight,
          size: file.size,
          format: file.type,
          metadata,
          needsNormalization,
          element: img
        };
        
        // Generate thumbnail
        if (this.config.generateThumbnails) {
          asset.thumbnail = await this.generateImageThumbnail(img);
        }
        
        // Normalize orientation if needed
        if (needsNormalization && this.config.enablePreprocessing) {
          asset.normalizedUrl = await this.normalizeImageOrientation(img, metadata.orientation);
        }
        
        resolve(asset);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }

  /**
   * Load video file
   */
  async loadVideo(file, assetId, options = {}) {
    const url = URL.createObjectURL(file);
    
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      
      const timeout = setTimeout(() => {
        reject(new Error('Video load timeout'));
      }, this.config.loadTimeout);
      
      video.onloadedmetadata = async () => {
        clearTimeout(timeout);
        
        // Normalize video if needed
        let normalizedUrl = url;
        let needsNormalization = false;
        
        if (this.config.enablePreprocessing) {
          const normalizationResult = await this.videoNormalizer.checkVideo(video);
          if (normalizationResult.needsNormalization) {
            needsNormalization = true;
            normalizedUrl = await this.videoNormalizer.normalize(file);
          }
        }
        
        // Extract metadata
        const metadata = await this.metadataExtractor.extractVideoMetadata(file, video);
        
        const asset = {
          id: assetId,
          type: 'video',
          file,
          url,
          normalizedUrl,
          width: video.videoWidth,
          height: video.videoHeight,
          aspectRatio: video.videoWidth / video.videoHeight,
          duration: video.duration,
          size: file.size,
          format: file.type,
          hasAudio: this.detectVideoAudio(video),
          fps: this.estimateVideoFps(video),
          metadata,
          needsNormalization,
          element: video
        };
        
        // Generate thumbnail
        if (this.config.generateThumbnails) {
          asset.thumbnail = await this.generateVideoThumbnail(video);
        }
        
        resolve(asset);
      };
      
      video.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video'));
      };
      
      video.preload = 'metadata';
      video.src = url;
    });
  }

  /**
   * Load audio file
   */
  async loadAudio(file, assetId, options = {}) {
    const url = URL.createObjectURL(file);
    
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      
      const timeout = setTimeout(() => {
        reject(new Error('Audio load timeout'));
      }, this.config.loadTimeout);
      
      audio.onloadedmetadata = async () => {
        clearTimeout(timeout);
        
        // Generate waveform data
        let waveform = null;
        if (this.config.enablePreprocessing) {
          waveform = await this.audioNormalizer.generateWaveform(file);
        }
        
        // Extract metadata
        const metadata = await this.metadataExtractor.extractAudioMetadata(file, audio);
        
        const asset = {
          id: assetId,
          type: 'audio',
          file,
          url,
          duration: audio.duration,
          size: file.size,
          format: file.type,
          sampleRate: metadata.sampleRate,
          channels: metadata.channels,
          bitrate: metadata.bitrate,
          metadata,
          waveform,
          element: audio
        };
        
        resolve(asset);
      };
      
      audio.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load audio'));
      };
      
      audio.preload = 'metadata';
      audio.src = url;
    });
  }

  /**
   * Load multiple files
   */
  async loadMultiple(files, options = {}) {
    const results = [];
    const queue = [...files];
    const inProgress = new Set();
    
    while (queue.length > 0 || inProgress.size > 0) {
      // Fill up to max concurrent
      while (inProgress.size < this.config.maxConcurrentLoads && queue.length > 0) {
        const file = queue.shift();
        const promise = this.loadMedia(file, options)
          .then(result => {
            inProgress.delete(promise);
            results.push({ success: true, result });
          })
          .catch(error => {
            inProgress.delete(promise);
            results.push({ success: false, error, file: file.name });
          });
        
        inProgress.add(promise);
      }
      
      // Wait for at least one to complete
      if (inProgress.size > 0) {
        await Promise.race(inProgress);
      }
    }
    
    return results;
  }

  /**
   * Load asset from URL
   */
  async loadFromUrl(url, type = 'image', options = {}) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], url.split('/').pop() || 'asset', {
        type: blob.type
      });
      
      return this.loadMedia(file, options);
      
    } catch (error) {
      this.logger.error('Failed to load from URL:', error);
      throw error;
    }
  }

  /**
   * Generate image thumbnail
   */
  async generateImageThumbnail(img, maxSize = 300) {
    const canvas = document.createElement('canvas');
    const ratio = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight);
    
    canvas.width = Math.round(img.naturalWidth * ratio);
    canvas.height = Math.round(img.naturalHeight * ratio);
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    return {
      url: canvas.toDataURL('image/jpeg', 0.7),
      width: canvas.width,
      height: canvas.height
    };
  }

  /**
   * Generate video thumbnail
   */
  async generateVideoThumbnail(video, time = 0, maxSize = 300) {
    return new Promise((resolve) => {
      video.currentTime = time;
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxSize / video.videoWidth, maxSize / video.videoHeight);
        
        canvas.width = Math.round(video.videoWidth * ratio);
        canvas.height = Math.round(video.videoHeight * ratio);
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        resolve({
          url: canvas.toDataURL('image/jpeg', 0.7),
          width: canvas.width,
          height: canvas.height,
          time
        });
      };
    });
  }

  /**
   * Normalize image orientation
   */
  async normalizeImageOrientation(img, orientation) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions based on orientation
    switch (orientation) {
      case 5:
      case 6:
      case 7:
      case 8:
        canvas.width = img.naturalHeight;
        canvas.height = img.naturalWidth;
        break;
      default:
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
    }
    
    // Apply orientation transforms
    ctx.save();
    
    switch (orientation) {
      case 2: ctx.transform(-1, 0, 0, 1, img.naturalWidth, 0); break;
      case 3: ctx.transform(-1, 0, 0, -1, img.naturalWidth, img.naturalHeight); break;
      case 4: ctx.transform(1, 0, 0, -1, 0, img.naturalHeight); break;
      case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
      case 6: ctx.transform(0, 1, -1, 0, img.naturalHeight, 0); break;
      case 7: ctx.transform(0, -1, -1, 0, img.naturalHeight, img.naturalWidth); break;
      case 8: ctx.transform(0, -1, 1, 0, 0, img.naturalWidth); break;
    }
    
    ctx.drawImage(img, 0, 0);
    ctx.restore();
    
    return canvas.toDataURL('image/png');
  }

  /**
   * Detect if video has audio track
   */
  detectVideoAudio(video) {
    return video.mozHasAudio ?? 
           video.webkitAudioDecodedByteCount > 0 ??
           (video.audioTracks?.length > 0);
  }

  /**
   * Estimate video FPS
   */
  estimateVideoFps(video) {
    if (video.captureStream) {
      const stream = video.captureStream();
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack?.getSettings) {
        return videoTrack.getSettings().frameRate || 30;
      }
    }
    return 30;
  }

  /**
   * Get asset by ID
   */
  getAsset(assetId) {
    return this.assets.get(assetId) || null;
  }

  /**
   * Remove asset
   */
  removeAsset(assetId) {
    const asset = this.assets.get(assetId);
    
    if (asset) {
      // Revoke object URLs
      if (asset.url && asset.url.startsWith('blob:')) {
        URL.revokeObjectURL(asset.url);
      }
      if (asset.normalizedUrl && asset.normalizedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(asset.normalizedUrl);
      }
      
      // Update memory tracking
      if (asset.size) {
        this.memoryUsage -= asset.size;
      }
      
      this.assets.delete(assetId);
    }
    
    this.emit('media:removed', { assetId });
  }

  /**
   * Clear all assets
   */
  clearAll() {
    for (const [assetId] of this.assets) {
      this.removeAsset(assetId);
    }
    
    this.assets.clear();
    this.loadingAssets.clear();
    this.memoryUsage = 0;
  }

  /**
   * Get loading progress
   */
  getLoadingProgress() {
    const loading = Array.from(this.loadingAssets.values());
    
    if (loading.length === 0) {
      return { loading: false, progress: 100 };
    }
    
    const progress = loading.reduce((sum, asset) => sum + (asset.progress || 0), 0) / loading.length;
    
    return {
      loading: true,
      progress,
      count: loading.length,
      assets: loading.map(a => ({ id: a.id, type: a.mediaType, progress: a.progress }))
    };
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    return {
      memoryUsage: this.memoryUsage,
      assetCount: this.assets.size,
      formatted: this.formatBytes(this.memoryUsage)
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
   * Check if memory limit exceeded
   */
  isMemoryExceeded() {
    return this.memoryUsage > this.config.maxMemoryCache;
  }
}

// Add EventEmitter functionality
import { EventEmitter } from '@/utils/event-emitter.js';
Object.assign(MediaLoader.prototype, EventEmitter.prototype);

export { MediaLoader };