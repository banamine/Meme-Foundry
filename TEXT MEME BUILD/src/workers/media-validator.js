/**
 * Meme Foundry - Media Validator
 * Validates uploaded media files for type, size, dimensions, and security
 */

import { Logger } from '@/utils/logger.js';

class MediaValidator {
  constructor() {
    this.logger = new Logger('MediaValidator');
    
    // Allowed MIME types
    this.allowedTypes = {
      image: [
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'image/bmp'
      ],
      video: [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime'
      ],
      audio: [
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/aac',
        'audio/flac',
        'audio/webm'
      ]
    };
    
    // Maximum file sizes (bytes)
    this.maxSizes = {
      image: 50 * 1024 * 1024,    // 50MB
      video: 200 * 1024 * 1024,   // 200MB
      audio: 100 * 1024 * 1024    // 100MB
    };
    
    // Maximum dimensions
    this.maxDimensions = {
      width: 8192,
      height: 8192,
      pixels: 67108864 // 64MP
    };
    
    // Maximum durations (seconds)
    this.maxDurations = {
      video: 600,  // 10 minutes
      audio: 1800  // 30 minutes
    };
  }

  /**
   * Validate file before upload
   */
  async validateFile(file) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      metadata: {}
    };
    
    // Basic file checks
    if (!file) {
      result.valid = false;
      result.errors.push('No file provided');
      return result;
    }
    
    // Check file type
    const typeResult = this.validateType(file);
    if (!typeResult.valid) {
      result.valid = false;
      result.errors.push(typeResult.error);
      return result;
    }
    
    result.metadata.type = typeResult.mediaType;
    result.metadata.mimeType = file.type;
    
    // Check file size
    const sizeResult = this.validateSize(file, typeResult.mediaType);
    if (!sizeResult.valid) {
      result.valid = false;
      result.errors.push(sizeResult.error);
      return result;
    }
    
    result.metadata.size = file.size;
    
    // Check file extension
    const extensionResult = this.validateExtension(file);
    if (!extensionResult.valid) {
      result.warnings.push(extensionResult.warning);
    }
    
    // Media-specific validation
    switch (typeResult.mediaType) {
      case 'image':
        const imageResult = await this.validateImage(file);
        Object.assign(result.metadata, imageResult.metadata);
        result.errors.push(...imageResult.errors);
        result.warnings.push(...imageResult.warnings);
        if (imageResult.errors.length > 0) result.valid = false;
        break;
        
      case 'video':
        const videoResult = await this.validateVideo(file);
        Object.assign(result.metadata, videoResult.metadata);
        result.errors.push(...videoResult.errors);
        result.warnings.push(...videoResult.warnings);
        if (videoResult.errors.length > 0) result.valid = false;
        break;
        
      case 'audio':
        const audioResult = await this.validateAudio(file);
        Object.assign(result.metadata, audioResult.metadata);
        result.errors.push(...audioResult.errors);
        result.warnings.push(...audioResult.warnings);
        if (audioResult.errors.length > 0) result.valid = false;
        break;
    }
    
    return result;
  }

  /**
   * Validate file type
   */
  validateType(file) {
    // Check by MIME type
    for (const [mediaType, types] of Object.entries(this.allowedTypes)) {
      if (types.includes(file.type)) {
        return { valid: true, mediaType };
      }
    }
    
    // Check by extension fallback
    const extension = this.getFileExtension(file.name).toLowerCase();
    const extensionMap = {
      'png': 'image',
      'jpg': 'image',
      'jpeg': 'image',
      'webp': 'image',
      'gif': 'image',
      'svg': 'image',
      'bmp': 'image',
      'mp4': 'video',
      'webm': 'video',
      'ogv': 'video',
      'mov': 'video',
      'mp3': 'audio',
      'wav': 'audio',
      'ogg': 'audio',
      'aac': 'audio',
      'flac': 'audio'
    };
    
    const mediaType = extensionMap[extension];
    if (mediaType) {
      return { 
        valid: true, 
        mediaType,
        warning: `MIME type ${file.type} not recognized, using extension fallback`
      };
    }
    
    return {
      valid: false,
      error: `Unsupported file type: ${file.type || extension}`
    };
  }

  /**
   * Validate file size
   */
  validateSize(file, mediaType) {
    const maxSize = this.maxSizes[mediaType] || this.maxSizes.image;
    
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      const fileSizeMB = Math.round(file.size / (1024 * 1024));
      
      return {
        valid: false,
        error: `File too large: ${fileSizeMB}MB (max ${maxSizeMB}MB)`
      };
    }
    
    if (file.size === 0) {
      return {
        valid: false,
        error: 'File is empty'
      };
    }
    
    return { valid: true };
  }

  /**
   * Validate file extension
   */
  validateExtension(file) {
    const name = file.name.toLowerCase();
    const extension = this.getFileExtension(name);
    
    // Check for double extensions (potential security risk)
    const parts = name.split('.');
    if (parts.length > 2) {
      return {
        valid: true,
        warning: 'File has multiple extensions, ensure it is safe'
      };
    }
    
    // Check for executable extensions
    const dangerousExtensions = ['exe', 'dll', 'so', 'dylib', 'sh', 'bat', 'cmd', 'ps1'];
    if (dangerousExtensions.includes(extension)) {
      return {
        valid: false,
        warning: `Potentially dangerous file extension: .${extension}`
      };
    }
    
    return { valid: true };
  }

  /**
   * Validate image file
   */
  async validateImage(file) {
    const result = {
      errors: [],
      warnings: [],
      metadata: {}
    };
    
    try {
      // Read image to check dimensions
      const imageData = await this.readImage(file);
      result.metadata.width = imageData.width;
      result.metadata.height = imageData.height;
      result.metadata.aspectRatio = imageData.width / imageData.height;
      
      // Check dimensions
      if (imageData.width > this.maxDimensions.width) {
        result.errors.push(`Image width ${imageData.width}px exceeds maximum ${this.maxDimensions.width}px`);
      }
      
      if (imageData.height > this.maxDimensions.height) {
        result.errors.push(`Image height ${imageData.height}px exceeds maximum ${this.maxDimensions.height}px`);
      }
      
      const pixels = imageData.width * imageData.height;
      if (pixels > this.maxDimensions.pixels) {
        result.warnings.push(`Large image: ${pixels} pixels (${Math.round(pixels / 1000000)}MP)`);
      }
      
      // Check minimum dimensions
      if (imageData.width < 1 || imageData.height < 1) {
        result.errors.push('Image dimensions too small');
      }
      
      // Check for decompression bomb (simple heuristic)
      const compressionRatio = file.size / (pixels * 4);
      if (compressionRatio < 0.001 && pixels > 1000000) {
        result.warnings.push('File may be a decompression bomb (very high compression ratio)');
      }
      
    } catch (error) {
      result.errors.push(`Failed to read image: ${error.message}`);
    }
    
    return result;
  }

  /**
   * Validate video file
   */
  async validateVideo(file) {
    const result = {
      errors: [],
      warnings: [],
      metadata: {}
    };
    
    try {
      // Create video element for metadata extraction
      const videoData = await this.readVideo(file);
      result.metadata.width = videoData.width;
      result.metadata.height = videoData.height;
      result.metadata.duration = videoData.duration;
      result.metadata.hasAudio = videoData.hasAudio;
      result.metadata.fps = videoData.fps;
      
      // Check dimensions
      if (videoData.width > this.maxDimensions.width) {
        result.errors.push(`Video width ${videoData.width}px exceeds maximum ${this.maxDimensions.width}px`);
      }
      
      if (videoData.height > this.maxDimensions.height) {
        result.errors.push(`Video height ${videoData.height}px exceeds maximum ${this.maxDimensions.height}px`);
      }
      
      // Check duration
      if (videoData.duration > this.maxDurations.video) {
        result.errors.push(`Video duration ${Math.round(videoData.duration)}s exceeds maximum ${this.maxDurations.video}s`);
      }
      
      if (videoData.duration < 0.1) {
        result.errors.push('Video duration too short');
      }
      
      // Check codec support
      if (!await this.checkVideoCodec(file)) {
        result.warnings.push('Video codec may not be supported in all browsers');
      }
      
      // Check for variable frame rate
      if (videoData.fps && videoData.fps < 15) {
        result.warnings.push(`Low frame rate: ${videoData.fps} fps`);
      }
      
    } catch (error) {
      result.errors.push(`Failed to read video: ${error.message}`);
    }
    
    return result;
  }

  /**
   * Validate audio file
   */
  async validateAudio(file) {
    const result = {
      errors: [],
      warnings: [],
      metadata: {}
    };
    
    try {
      const audioData = await this.readAudio(file);
      result.metadata.duration = audioData.duration;
      result.metadata.sampleRate = audioData.sampleRate;
      result.metadata.channels = audioData.channels;
      
      // Check duration
      if (audioData.duration > this.maxDurations.audio) {
        result.errors.push(`Audio duration ${Math.round(audioData.duration)}s exceeds maximum ${this.maxDurations.audio}s`);
      }
      
      if (audioData.duration < 0.1) {
        result.errors.push('Audio duration too short');
      }
      
      // Check sample rate
      if (audioData.sampleRate && audioData.sampleRate < 8000) {
        result.warnings.push(`Low sample rate: ${audioData.sampleRate}Hz`);
      }
      
      // Check channels
      if (audioData.channels > 8) {
        result.warnings.push(`High channel count: ${audioData.channels}`);
      }
      
    } catch (error) {
      result.errors.push(`Failed to read audio: ${error.message}`);
    }
    
    return result;
  }

  /**
   * Read image file for metadata
   */
  readImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }

  /**
   * Read video file for metadata
   */
  readVideo(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      
      video.onloadedmetadata = () => {
        const hasAudio = video.mozHasAudio ?? 
                        video.webkitAudioDecodedByteCount > 0 ??
                        (video.audioTracks?.length > 0);
        
        URL.revokeObjectURL(url);
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration,
          hasAudio,
          fps: this.estimateFps(video)
        });
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video'));
      };
      
      video.preload = 'metadata';
      video.src = url;
    });
  }

  /**
   * Read audio file for metadata
   */
  readAudio(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        
        // Get more metadata using Web Audio API
        fetch(url)
          .then(response => response.arrayBuffer())
          .then(buffer => audioContext.decodeAudioData(buffer))
          .then(decodedData => {
            resolve({
              duration: decodedData.duration,
              sampleRate: decodedData.sampleRate,
              channels: decodedData.numberOfChannels
            });
          })
          .catch(() => {
            // Fallback to basic metadata
            resolve({
              duration: audio.duration,
              sampleRate: null,
              channels: null
            });
          });
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load audio'));
      };
      
      audio.preload = 'metadata';
      audio.src = url;
    });
  }

  /**
   * Estimate video FPS
   */
  estimateFps(video) {
    // Try to get exact FPS from video track
    if (video.captureStream) {
      const stream = video.captureStream();
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack?.getSettings) {
        const settings = videoTrack.getSettings();
        return settings.frameRate || null;
      }
    }
    
    return null;
  }

  /**
   * Check if video codec is supported
   */
  async checkVideoCodec(file) {
    const video = document.createElement('video');
    return video.canPlayType(file.type) !== '';
  }

  /**
   * Get file extension
   */
  getFileExtension(filename) {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  }

  /**
   * Validate multiple files
   */
  async validateFiles(files) {
    const results = [];
    
    for (const file of files) {
      const result = await this.validateFile(file);
      results.push({
        file: file.name,
        ...result
      });
    }
    
    return results;
  }

  /**
   * Check if file is corrupted (basic check)
   */
  async checkCorruption(file) {
    try {
      // Read first few bytes to check magic numbers
      const buffer = await file.slice(0, 16).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      // Check common file signatures
      const signatures = {
        png: [0x89, 0x50, 0x4E, 0x47],
        jpeg: [0xFF, 0xD8, 0xFF],
        gif: [0x47, 0x49, 0x46],
        webp: [0x52, 0x49, 0x46, 0x46],
        mp4: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
        webm: [0x1A, 0x45, 0xDF, 0xA3],
        mp3: [0xFF, 0xFB],
        wav: [0x52, 0x49, 0x46, 0x46]
      };
      
      const extension = this.getFileExtension(file.name);
      const signature = signatures[extension];
      
      if (signature) {
        const matches = signature.every((byte, i) => bytes[i] === byte);
        if (!matches) {
          return {
            corrupted: true,
            warning: 'File signature does not match extension'
          };
        }
      }
      
      return { corrupted: false };
      
    } catch (error) {
      return {
        corrupted: true,
        error: 'Failed to check file integrity'
      };
    }
  }

  /**
   * Get supported formats
   */
  getSupportedFormats() {
    return {
      image: this.allowedTypes.image,
      video: this.allowedTypes.video,
      audio: this.allowedTypes.audio
    };
  }

  /**
   * Update validation settings
   */
  updateSettings(settings) {
    if (settings.maxSizes) {
      Object.assign(this.maxSizes, settings.maxSizes);
    }
    if (settings.maxDimensions) {
      Object.assign(this.maxDimensions, settings.maxDimensions);
    }
    if (settings.maxDurations) {
      Object.assign(this.maxDurations, settings.maxDurations);
    }
  }
}

export { MediaValidator };