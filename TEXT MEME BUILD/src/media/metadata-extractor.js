/**
 * Meme Foundry - Metadata Extractor
 * Extracts comprehensive metadata from media files
 */

import { Logger } from '@/utils/logger.js';

class MetadataExtractor {
  constructor() {
    this.logger = new Logger('MetadataExtractor');
  }

  /**
   * Extract image metadata
   */
  async extractImageMetadata(file) {
    const metadata = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null
    };

    try {
      // Read EXIF data if available
      const exifData = await this.extractExifData(file);
      Object.assign(metadata, exifData);

      // Get image dimensions
      const dimensions = await this.getImageDimensions(file);
      Object.assign(metadata, dimensions);

      // Calculate additional info
      if (metadata.width && metadata.height) {
        metadata.aspectRatio = this.calculateAspectRatio(metadata.width, metadata.height);
        metadata.megapixels = Math.round((metadata.width * metadata.height) / 1000000 * 10) / 10;
        metadata.orientation = this.determineOrientation(metadata.width, metadata.height);
      }

      // Color analysis
      const colorInfo = await this.analyzeImageColors(file);
      Object.assign(metadata, colorInfo);

    } catch (error) {
      this.logger.warn('Failed to extract full image metadata:', error);
    }

    return metadata;
  }

  /**
   * Extract video metadata
   */
  async extractVideoMetadata(file, videoElement = null) {
    const metadata = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null
    };

    try {
      let video = videoElement;
      let url = null;

      if (!video) {
        url = URL.createObjectURL(file);
        video = document.createElement('video');
        
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve;
          video.onerror = reject;
          video.preload = 'metadata';
          video.src = url;
        });
      }

      // Basic video properties
      metadata.width = video.videoWidth;
      metadata.height = video.videoHeight;
      metadata.duration = video.duration;
      metadata.aspectRatio = this.calculateAspectRatio(video.videoWidth, video.videoHeight);
      metadata.orientation = this.determineOrientation(video.videoWidth, video.videoHeight);

      // Audio tracks
      metadata.hasAudio = this.detectAudioPresence(video);
      metadata.audioTracks = video.audioTracks?.length || (metadata.hasAudio ? 1 : 0);
      
      // Video tracks
      metadata.videoTracks = video.videoTracks?.length || 1;

      // Frame rate estimation
      metadata.fps = this.estimateVideoFps(video);

      // Calculate additional info
      if (metadata.duration) {
        metadata.durationFormatted = this.formatDuration(metadata.duration);
        metadata.totalFrames = metadata.fps ? Math.round(metadata.duration * metadata.fps) : null;
      }

      // Calculate file bitrate estimate
      if (metadata.duration > 0) {
        metadata.estimatedBitrate = Math.round((file.size * 8) / metadata.duration);
      }

      // Clean up
      if (url) {
        URL.revokeObjectURL(url);
      }

    } catch (error) {
      this.logger.warn('Failed to extract full video metadata:', error);
    }

    return metadata;
  }

  /**
   * Extract audio metadata
   */
  async extractAudioMetadata(file, audioElement = null) {
    const metadata = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null
    };

    try {
      let audio = audioElement;
      let url = null;

      if (!audio) {
        url = URL.createObjectURL(file);
        audio = new Audio();
        
        await new Promise((resolve, reject) => {
          audio.onloadedmetadata = resolve;
          audio.onerror = reject;
          audio.preload = 'metadata';
          audio.src = url;
        });
      }

      // Basic audio properties
      metadata.duration = audio.duration;
      metadata.durationFormatted = this.formatDuration(metadata.duration);

      // Try to get advanced audio properties using Web Audio API
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        metadata.sampleRate = audioBuffer.sampleRate;
        metadata.channels = audioBuffer.numberOfChannels;
        metadata.length = audioBuffer.length;
        metadata.bitrate = Math.round((file.size * 8) / audioBuffer.duration);
        
        // Channel layout
        metadata.channelLayout = this.getChannelLayout(audioBuffer.numberOfChannels);
        
        audioContext.close();
      } catch (e) {
        // Fallback to basic metadata
        metadata.sampleRate = null;
        metadata.channels = null;
      }

      // Clean up
      if (url) {
        URL.revokeObjectURL(url);
      }

    } catch (error) {
      this.logger.warn('Failed to extract full audio metadata:', error);
    }

    return metadata;
  }

  /**
   * Extract EXIF data from image
   */
  async extractExifData(file) {
    const data = {};
    
    try {
      // Read file as ArrayBuffer
      const buffer = await file.arrayBuffer();
      const view = new DataView(buffer);
      
      // Check for JPEG EXIF
      if (file.type === 'image/jpeg') {
        const exif = this.parseExif(view);
        if (exif) {
          data.exif = exif;
        }
      }
      
      // Get creation date from EXIF or file
      data.dateCreated = data.exif?.dateTimeOriginal || 
                        (file.lastModified ? new Date(file.lastModified).toISOString() : null);
      
    } catch (error) {
      // EXIF extraction is best-effort
    }
    
    return data;
  }

  /**
   * Parse EXIF data from JPEG
   */
  parseExif(view) {
    if (view.getUint16(0, false) !== 0xFFD8) return null;
    
    let offset = 2;
    const length = view.byteLength;
    
    while (offset < length) {
      if (view.getUint16(offset, false) !== 0xFFE1) {
        offset += 2 + view.getUint16(offset + 2, false);
        continue;
      }
      
      // Found EXIF
      const exifStart = offset + 4;
      if (view.getUint32(exifStart, false) !== 0x45786966) return null; // 'Exif'
      
      const tiffStart = exifStart + 6;
      const isBigEndian = view.getUint16(tiffStart, false) === 0x4D4D;
      
      const ifd0Offset = view.getUint32(tiffStart + 4, !isBigEndian);
      const entries = view.getUint16(tiffStart + ifd0Offset, !isBigEndian);
      
      const exif = {};
      const tagMap = {
        0x010F: 'make',
        0x0110: 'model',
        0x0112: 'orientation',
        0x0132: 'dateTime',
        0x9003: 'dateTimeOriginal',
        0x829A: 'exposureTime',
        0x829D: 'fNumber',
        0x8827: 'iso',
        0x920A: 'focalLength',
        0xA002: 'width',
        0xA003: 'height'
      };
      
      for (let i = 0; i < entries; i++) {
        const entryOffset = tiffStart + ifd0Offset + 2 + i * 12;
        const tag = view.getUint16(entryOffset, !isBigEndian);
        
        if (tagMap[tag]) {
          exif[tagMap[tag]] = this.readExifValue(view, entryOffset, !isBigEndian);
        }
      }
      
      return exif;
    }
    
    return null;
  }

  /**
   * Read EXIF value
   */
  readExifValue(view, offset, isLittleEndian) {
    const type = view.getUint16(offset + 2, isLittleEndian);
    const count = view.getUint32(offset + 4, isLittleEndian);
    
    if (type === 2) {
      // ASCII string
      if (count <= 4) {
        let str = '';
        for (let i = 0; i < count - 1; i++) {
          str += String.fromCharCode(view.getUint8(offset + 8 + i));
        }
        return str;
      }
    }
    
    // Return raw value for simple types
    return view.getUint32(offset + 8, isLittleEndian);
  }

  /**
   * Get image dimensions
   */
  getImageDimensions(file) {
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
   * Analyze image colors
   */
  async analyzeImageColors(file) {
    try {
      const img = await this.loadImage(file);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Sample image (resize for performance)
      const sampleSize = Math.min(img.width, img.height, 100);
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
      
      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
      const data = imageData.data;
      
      let totalR = 0, totalG = 0, totalB = 0;
      let pixelCount = 0;
      let hasTransparency = false;
      
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 255) hasTransparency = true;
        totalR += data[i];
        totalG += data[i + 1];
        totalB += data[i + 2];
        pixelCount++;
      }
      
      const avgR = Math.round(totalR / pixelCount);
      const avgG = Math.round(totalG / pixelCount);
      const avgB = Math.round(totalB / pixelCount);
      
      // Calculate brightness
      const brightness = (0.299 * avgR + 0.587 * avgG + 0.114 * avgB) / 255;
      
      return {
        averageColor: `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`,
        averageColorRgb: { r: avgR, g: avgG, b: avgB },
        brightness: Math.round(brightness * 100) / 100,
        isLight: brightness > 0.5,
        isDark: brightness <= 0.5,
        hasTransparency
      };
      
    } catch (error) {
      return {};
    }
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
   * Detect audio presence in video
   */
  detectAudioPresence(video) {
    // Multiple detection methods
    if (video.mozHasAudio !== undefined) return video.mozHasAudio;
    if (video.webkitAudioDecodedByteCount !== undefined) return video.webkitAudioDecodedByteCount > 0;
    if (video.audioTracks) return video.audioTracks.length > 0;
    
    return null; // Unknown
  }

  /**
   * Estimate video FPS
   */
  estimateVideoFps(video) {
    if (video.captureStream) {
      try {
        const stream = video.captureStream();
        const track = stream.getVideoTracks()[0];
        if (track?.getSettings) {
          return track.getSettings().frameRate || null;
        }
      } catch (e) {
        // Not available
      }
    }
    return null;
  }

  /**
   * Calculate aspect ratio
   */
  calculateAspectRatio(width, height) {
    if (!width || !height) return null;
    
    const gcd = this.gcd(width, height);
    const ratioWidth = width / gcd;
    const ratioHeight = height / gcd;
    
    // Simplify common ratios
    const commonRatios = {
      '1:1': 1,
      '4:3': 4/3,
      '3:2': 3/2,
      '16:9': 16/9,
      '9:16': 9/16,
      '3:4': 3/4,
      '2:3': 2/3
    };
    
    const decimal = width / height;
    
    for (const [name, ratio] of Object.entries(commonRatios)) {
      if (Math.abs(decimal - ratio) < 0.01) {
        return name;
      }
    }
    
    return `${ratioWidth}:${ratioHeight}`;
  }

  /**
   * Determine orientation
   */
  determineOrientation(width, height) {
    if (!width || !height) return 'unknown';
    if (width > height) return 'landscape';
    if (height > width) return 'portrait';
    return 'square';
  }

  /**
   * Get channel layout name
   */
  getChannelLayout(channels) {
    const layouts = {
      1: 'Mono',
      2: 'Stereo',
      3: '2.1',
      4: 'Quad',
      5: '5.0',
      6: '5.1',
      7: '6.1',
      8: '7.1'
    };
    return layouts[channels] || `${channels} channels`;
  }

  /**
   * Format duration
   */
  formatDuration(seconds) {
    if (!seconds || !isFinite(seconds)) return 'Unknown';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  /**
   * Greatest common divisor
   */
  gcd(a, b) {
    return b === 0 ? a : this.gcd(b, a % b);
  }

  /**
   * Generate comprehensive metadata summary
   */
  generateSummary(metadata, type) {
    switch (type) {
      case 'image':
        return {
          dimensions: metadata.width ? `${metadata.width}×${metadata.height}` : 'Unknown',
          size: this.formatBytes(metadata.fileSize),
          aspectRatio: metadata.aspectRatio || 'Unknown',
          type: metadata.fileType || 'Unknown'
        };
        
      case 'video':
        return {
          dimensions: metadata.width ? `${metadata.width}×${metadata.height}` : 'Unknown',
          duration: metadata.durationFormatted || 'Unknown',
          size: this.formatBytes(metadata.fileSize),
          fps: metadata.fps ? `${Math.round(metadata.fps)} fps` : 'Unknown',
          hasAudio: metadata.hasAudio ? 'Yes' : 'No',
          aspectRatio: metadata.aspectRatio || 'Unknown'
        };
        
      case 'audio':
        return {
          duration: metadata.durationFormatted || 'Unknown',
          size: this.formatBytes(metadata.fileSize),
          sampleRate: metadata.sampleRate ? `${(metadata.sampleRate / 1000).toFixed(1)} kHz` : 'Unknown',
          channels: metadata.channelLayout || 'Unknown',
          bitrate: metadata.bitrate ? `${Math.round(metadata.bitrate / 1000)} kbps` : 'Unknown'
        };
    }
  }

  /**
   * Format bytes
   */
  formatBytes(bytes) {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }
}

export { MetadataExtractor };