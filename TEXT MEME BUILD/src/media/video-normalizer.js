/**
 * Meme Foundry - Video Normalizer
 * Normalizes video files for consistent browser playback
 */

import { Logger } from '@/utils/logger.js';

class VideoNormalizer {
  constructor() {
    this.logger = new Logger('VideoNormalizer');
    
    // Target specifications
    this.targetSpecs = {
      maxWidth: 1920,
      maxHeight: 1080,
      preferredFps: 30,
      preferredFormat: 'video/mp4',
      preferredCodec: 'avc1.42E01E',
      maxBitrate: 10000000, // 10 Mbps
      audioSampleRate: 44100,
      audioChannels: 2
    };
    
    // Browser codec support cache
    this.codecSupport = null;
  }

  /**
   * Check if video needs normalization
   */
  async checkVideo(videoElement) {
    const issues = [];
    const recommendations = [];
    
    // Check dimensions
    if (videoElement.videoWidth > this.targetSpecs.maxWidth ||
        videoElement.videoHeight > this.targetSpecs.maxHeight) {
      issues.push({
        type: 'resolution',
        message: `Video resolution ${videoElement.videoWidth}x${videoElement.videoHeight} exceeds maximum`,
        current: { width: videoElement.videoWidth, height: videoElement.videoHeight },
        recommended: { width: this.targetSpecs.maxWidth, height: this.targetSpecs.maxHeight }
      });
    }
    
    // Check duration
    if (videoElement.duration > 600) {
      issues.push({
        type: 'duration',
        message: 'Video duration exceeds 10 minutes',
        current: videoElement.duration,
        recommended: 600
      });
    }
    
    // Check format support
    const formatSupported = await this.checkFormatSupport();
    if (!formatSupported) {
      recommendations.push({
        type: 'format',
        message: 'Video format may not be supported in all browsers',
        action: 'transcode'
      });
    }
    
    // Check for variable frame rate
    const fps = this.estimateFps(videoElement);
    if (fps && (fps < 15 || fps > 60)) {
      recommendations.push({
        type: 'framerate',
        message: `Frame rate ${fps} fps is outside optimal range`,
        current: fps,
        recommended: this.targetSpecs.preferredFps
      });
    }
    
    return {
      needsNormalization: issues.length > 0,
      issues,
      recommendations,
      normalized: issues.length === 0 && recommendations.length === 0
    };
  }

  /**
   * Normalize video file
   */
  async normalize(file, options = {}) {
    const {
      maxWidth = this.targetSpecs.maxWidth,
      maxHeight = this.targetSpecs.maxHeight,
      fps = this.targetSpecs.preferredFps,
      bitrate = '5M',
      format = 'mp4',
      onProgress = null
    } = options;

    try {
      this.logger.info(`Normalizing video: ${file.name}`);
      
      if (onProgress) onProgress(10);
      
      // Use FFmpeg service for normalization
      const { FFmpegService } = await import('@/services/ffmpeg-service.js');
      const ffmpeg = new FFmpegService();
      
      if (!ffmpeg.isAvailable()) {
        await ffmpeg.initialize();
      }
      
      if (onProgress) onProgress(30);
      
      // Calculate target dimensions
      const dimensions = await this.getVideoDimensions(file);
      const targetDimensions = this.calculateTargetDimensions(
        dimensions.width,
        dimensions.height,
        maxWidth,
        maxHeight
      );
      
      if (onProgress) onProgress(50);
      
      // Transcode video
      const normalizedBlob = await ffmpeg.transcodeVideo(file, {
        format,
        width: targetDimensions.width,
        height: targetDimensions.height,
        fps,
        bitrate,
        onProgress: (progress) => {
          if (onProgress) onProgress(50 + progress * 0.5);
        }
      });
      
      if (onProgress) onProgress(100);
      
      this.logger.info(`Video normalized: ${file.name}`);
      
      return {
        blob: normalizedBlob,
        url: URL.createObjectURL(normalizedBlob),
        width: targetDimensions.width,
        height: targetDimensions.height,
        originalSize: file.size,
        normalizedSize: normalizedBlob.size
      };
      
    } catch (error) {
      this.logger.error('Video normalization failed:', error);
      
      // Fallback: use original video
      return {
        blob: file,
        url: URL.createObjectURL(file),
        width: null,
        height: null,
        originalSize: file.size,
        normalizedSize: file.size,
        fallback: true
      };
    }
  }

  /**
   * Get video dimensions from file
   */
  getVideoDimensions(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration
        });
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to read video dimensions'));
      };
      
      video.preload = 'metadata';
      video.src = url;
    });
  }

  /**
   * Calculate target dimensions maintaining aspect ratio
   */
  calculateTargetDimensions(srcWidth, srcHeight, maxWidth, maxHeight) {
    if (!srcWidth || !srcHeight) {
      return { width: maxWidth, height: maxHeight };
    }
    
    const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight, 1);
    
    // Ensure even dimensions (required by some codecs)
    const width = Math.floor(srcWidth * ratio / 2) * 2;
    const height = Math.floor(srcHeight * ratio / 2) * 2;
    
    return { width, height };
  }

  /**
   * Estimate video FPS
   */
  estimateFps(video) {
    if (video.captureStream) {
      try {
        const stream = video.captureStream();
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack?.getSettings) {
          const settings = videoTrack.getSettings();
          return settings.frameRate || null;
        }
      } catch (e) {
        // captureStream may not be available
      }
    }
    return null;
  }

  /**
   * Check browser format support
   */
  async checkFormatSupport() {
    if (this.codecSupport) return this.codecSupport;
    
    const video = document.createElement('video');
    const formats = {
      'video/mp4;codecs=avc1.42E01E': false,
      'video/mp4;codecs=avc1.4D401E': false,
      'video/webm;codecs=vp8': false,
      'video/webm;codecs=vp9': false
    };
    
    for (const [type, _] of Object.entries(formats)) {
      formats[type] = video.canPlayType(type) !== '';
    }
    
    this.codecSupport = formats;
    return formats;
  }

  /**
   * Detect if video has transparency
   */
  async hasTransparency(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.onloadeddata = () => {
        canvas.width = 1;
        canvas.height = 1;
        
        video.currentTime = 0.1;
        
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, 1, 1);
          const pixel = ctx.getImageData(0, 0, 1, 1).data;
          URL.revokeObjectURL(url);
          resolve(pixel[3] < 255);
        };
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };
      
      video.preload = 'auto';
      video.src = url;
    });
  }

  /**
   * Generate video preview frames
   */
  async generatePreviewFrames(file, count = 5, width = 320) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      const frames = [];
      let currentFrame = 0;
      
      video.onloadedmetadata = () => {
        const interval = video.duration / (count + 1);
        
        const captureFrame = () => {
          if (currentFrame >= count) {
            URL.revokeObjectURL(url);
            resolve(frames);
            return;
          }
          
          const time = interval * (currentFrame + 1);
          video.currentTime = time;
        };
        
        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          const ratio = width / video.videoWidth;
          canvas.width = width;
          canvas.height = Math.round(video.videoHeight * ratio);
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          frames.push({
            time: video.currentTime,
            dataUrl: canvas.toDataURL('image/jpeg', 0.6),
            width: canvas.width,
            height: canvas.height
          });
          
          currentFrame++;
          captureFrame();
        };
        
        captureFrame();
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve([]);
      };
      
      video.preload = 'auto';
      video.src = url;
    });
  }

  /**
   * Check for common video issues
   */
  diagnoseIssues(videoElement) {
    const issues = [];
    
    // Check if video is silent
    if (videoElement.mozHasAudio === false ||
        (videoElement.audioTracks && videoElement.audioTracks.length === 0)) {
      issues.push({
        type: 'info',
        message: 'Video has no audio track'
      });
    }
    
    // Check for portrait orientation
    if (videoElement.videoHeight > videoElement.videoWidth) {
      issues.push({
        type: 'info',
        message: 'Video is in portrait orientation'
      });
    }
    
    // Check for very short videos
    if (videoElement.duration < 1) {
      issues.push({
        type: 'warning',
        message: 'Video is very short (< 1 second)'
      });
    }
    
    // Check aspect ratio
    const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
    if (aspectRatio < 0.5 || aspectRatio > 2.5) {
      issues.push({
        type: 'warning',
        message: 'Video has unusual aspect ratio'
      });
    }
    
    return issues;
  }
}

export { VideoNormalizer };