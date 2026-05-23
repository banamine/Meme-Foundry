/**
 * Meme Foundry - Codec Support Detection
 * Browser codec and format compatibility checking
 */

class CodecSupport {
  constructor() {
    // Cache for detection results
    this.cache = new Map();
    
    // Codec definitions
    this.codecs = {
      // Video codecs
      'h264-baseline': {
        mimeType: 'video/mp4;codecs=avc1.42E01E',
        type: 'video',
        description: 'H.264 Baseline'
      },
      'h264-main': {
        mimeType: 'video/mp4;codecs=avc1.4D401E',
        type: 'video',
        description: 'H.264 Main'
      },
      'h264-high': {
        mimeType: 'video/mp4;codecs=avc1.64001E',
        type: 'video',
        description: 'H.264 High'
      },
      'vp8': {
        mimeType: 'video/webm;codecs=vp8',
        type: 'video',
        description: 'VP8'
      },
      'vp9': {
        mimeType: 'video/webm;codecs=vp9',
        type: 'video',
        description: 'VP9'
      },
      'hevc': {
        mimeType: 'video/mp4;codecs=hevc',
        type: 'video',
        description: 'HEVC (H.265)'
      },
      'av1': {
        mimeType: 'video/mp4;codecs=av01',
        type: 'video',
        description: 'AV1'
      },
      'theora': {
        mimeType: 'video/ogg;codecs=theora',
        type: 'video',
        description: 'Theora'
      },
      
      // Audio codecs
      'aac': {
        mimeType: 'audio/mp4;codecs=mp4a.40.2',
        type: 'audio',
        description: 'AAC'
      },
      'mp3': {
        mimeType: 'audio/mpeg',
        type: 'audio',
        description: 'MP3'
      },
      'opus': {
        mimeType: 'audio/webm;codecs=opus',
        type: 'audio',
        description: 'Opus'
      },
      'vorbis': {
        mimeType: 'audio/webm;codecs=vorbis',
        type: 'audio',
        description: 'Vorbis'
      },
      'flac': {
        mimeType: 'audio/flac',
        type: 'audio',
        description: 'FLAC'
      },
      'wav': {
        mimeType: 'audio/wav',
        type: 'audio',
        description: 'WAV'
      },
      'pcm': {
        mimeType: 'audio/wav;codecs=1',
        type: 'audio',
        description: 'PCM'
      }
    };
  }

  /**
   * Check if a specific codec is supported
   */
  checkCodec(codecName) {
    if (this.cache.has(codecName)) {
      return this.cache.get(codecName);
    }
    
    const codec = this.codecs[codecName];
    if (!codec) {
      return { supported: false, reason: 'Unknown codec' };
    }
    
    let supported = false;
    
    if (codec.type === 'video') {
      const video = document.createElement('video');
      supported = video.canPlayType(codec.mimeType) !== '';
    } else if (codec.type === 'audio') {
      const audio = document.createElement('audio');
      supported = audio.canPlayType(codec.mimeType) !== '';
    }
    
    const result = {
      codec: codecName,
      supported,
      mimeType: codec.mimeType,
      type: codec.type,
      description: codec.description,
      probably: this.checkProbably(codec)
    };
    
    this.cache.set(codecName, result);
    return result;
  }

  /**
   * Check if codec is "probably" supported
   */
  checkProbably(codec) {
    const el = codec.type === 'video' 
      ? document.createElement('video')
      : document.createElement('audio');
    
    return el.canPlayType(codec.mimeType) === 'probably';
  }

  /**
   * Check all codecs
   */
  checkAllCodecs() {
    const results = {};
    
    for (const [name, _] of Object.entries(this.codecs)) {
      results[name] = this.checkCodec(name);
    }
    
    return results;
  }

  /**
   * Get supported video codecs
   */
  getSupportedVideoCodecs() {
    return Object.entries(this.codecs)
      .filter(([_, codec]) => codec.type === 'video')
      .map(([name, _]) => this.checkCodec(name))
      .filter(result => result.supported);
  }

  /**
   * Get supported audio codecs
   */
  getSupportedAudioCodecs() {
    return Object.entries(this.codecs)
      .filter(([_, codec]) => codec.type === 'audio')
      .map(([name, _]) => this.checkCodec(name))
      .filter(result => result.supported);
  }

  /**
   * Find best video codec for export
   */
  getBestVideoCodec() {
    // Priority order
    const priority = ['h264-high', 'h264-main', 'h264-baseline', 'vp9', 'vp8'];
    
    for (const codec of priority) {
      const result = this.checkCodec(codec);
      if (result.supported) {
        return result;
      }
    }
    
    return null;
  }

  /**
   * Find best audio codec for export
   */
  getBestAudioCodec() {
    const priority = ['aac', 'opus', 'mp3', 'vorbis'];
    
    for (const codec of priority) {
      const result = this.checkCodec(codec);
      if (result.supported) {
        return result;
      }
    }
    
    return null;
  }

  /**
   * Check if a specific MIME type is supported
   */
  checkMimeType(mimeType) {
    if (mimeType.startsWith('video/')) {
      const video = document.createElement('video');
      return video.canPlayType(mimeType) !== '';
    }
    
    if (mimeType.startsWith('audio/')) {
      const audio = document.createElement('audio');
      return audio.canPlayType(mimeType) !== '';
    }
    
    return false;
  }

  /**
   * Check if file format is supported
   */
  checkFileSupport(file) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type;
    
    const formatMap = {
      // Images
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      
      // Videos
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'ogv': 'video/ogg',
      'mov': 'video/quicktime',
      
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'aac': 'audio/aac',
      'flac': 'audio/flac',
      'm4a': 'audio/mp4'
    };
    
    const expectedMimeType = formatMap[extension];
    
    return {
      extension,
      mimeType,
      expectedMimeType,
      matchesExpectedType: mimeType === expectedMimeType || 
                          mimeType.startsWith(expectedMimeType?.split('/')[0] || ''),
      supportedExtension: !!expectedMimeType,
      supportedMimeType: expectedMimeType ? this.checkMimeType(expectedMimeType) : false
    };
  }

  /**
   * Get supported export formats
   */
  getSupportedExportFormats() {
    const formats = [];
    
    // Image formats (always supported via canvas)
    formats.push({
      id: 'png',
      name: 'PNG',
      extension: '.png',
      mimeType: 'image/png',
      supported: true
    });
    
    formats.push({
      id: 'jpeg',
      name: 'JPEG',
      extension: '.jpg',
      mimeType: 'image/jpeg',
      supported: true
    });
    
    formats.push({
      id: 'webp',
      name: 'WebP',
      extension: '.webp',
      mimeType: 'image/webp',
      supported: this.checkWebPSupport()
    });
    
    // Video formats
    const h264 = this.checkCodec('h264-baseline');
    formats.push({
      id: 'mp4',
      name: 'MP4',
      extension: '.mp4',
      mimeType: 'video/mp4',
      supported: h264.supported
    });
    
    const vp8 = this.checkCodec('vp8');
    formats.push({
      id: 'webm',
      name: 'WebM',
      extension: '.webm',
      mimeType: 'video/webm',
      supported: vp8.supported
    });
    
    return formats;
  }

  /**
   * Check WebP support
   */
  checkWebPSupport() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  }

  /**
   * Check if browser supports MediaRecorder
   */
  checkMediaRecorderSupport() {
    if (typeof MediaRecorder === 'undefined') {
      return { supported: false, mimeTypes: [] };
    }
    
    const mimeTypes = [];
    const typesToCheck = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];
    
    for (const type of typesToCheck) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeTypes.push(type);
      }
    }
    
    return {
      supported: true,
      mimeTypes
    };
  }

  /**
   * Get browser capability report
   */
  getCapabilityReport() {
    const videoCodecs = this.getSupportedVideoCodecs();
    const audioCodecs = this.getSupportedAudioCodecs();
    const mediaRecorder = this.checkMediaRecorderSupport();
    const webp = this.checkWebPSupport();
    
    return {
      browser: {
        name: this.getBrowserName(),
        version: this.getBrowserVersion()
      },
      video: {
        codecs: videoCodecs.map(c => c.codec),
        bestCodec: this.getBestVideoCodec()?.codec || null
      },
      audio: {
        codecs: audioCodecs.map(c => c.codec),
        bestCodec: this.getBestAudioCodec()?.codec || null
      },
      mediaRecorder,
      webp,
      webgl: this.checkWebGLSupport(),
      wasm: typeof WebAssembly !== 'undefined'
    };
  }

  /**
   * Get browser name
   */
  getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  /**
   * Get browser version
   */
  getBrowserVersion() {
    const ua = navigator.userAgent;
    const match = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/(\d+)/);
    return match ? match[2] : 'Unknown';
  }

  /**
   * Check WebGL support
   */
  checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return !!gl;
    } catch {
      return false;
    }
  }

  /**
   * Check if format is recommended for platform
   */
  getRecommendedFormat(platform) {
    const recommendations = {
      'instagram': { format: 'jpeg', quality: 0.92 },
      'facebook': { format: 'jpeg', quality: 0.9 },
      'twitter': { format: 'jpeg', quality: 0.85 },
      'youtube': { format: 'jpeg', quality: 0.95 },
      'tiktok': { format: 'mp4', fps: 30 },
      'web': { format: 'webp', quality: 0.85 }
    };
    
    return recommendations[platform] || { format: 'png', quality: 1 };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export { CodecSupport };