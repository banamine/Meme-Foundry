/**
 * Meme Foundry - Video Export
 * Handles video export using Canvas capture and ffmpeg-wasm integration
 */

import { Logger } from '@/utils/logger.js';

class VideoExport {
  constructor(canvasRenderer) {
    this.logger = new Logger('VideoExport');
    this.canvasRenderer = canvasRenderer;
    this.ffmpegService = null;
    this.isFFmpegReady = false;
  }

  /**
   * Initialize ffmpeg service
   */
  async initialize() {
    try {
      const { FFmpegService } = await import('@/services/ffmpeg-service.js');
      this.ffmpegService = new FFmpegService();
      await this.ffmpegService.initialize();
      this.isFFmpegReady = true;
      this.logger.info('FFmpeg service initialized');
    } catch (error) {
      this.logger.warn('FFmpeg not available, falling back to MediaRecorder:', error);
      this.isFFmpegReady = false;
    }
  }

  /**
   * Export video in specified format
   */
  async export(format, options = {}) {
    const {
      fps = 30,
      bitrate = '5M',
      duration = null,
      width = null,
      height = null,
      includeAudio = true,
      codec = null,
      signal = null,
      onProgress = null
    } = options;

    try {
      if (onProgress) onProgress(5);

      // Prepare canvas for video dimensions
      const sourceCanvas = this.canvasRenderer.canvas;
      const exportWidth = width || sourceCanvas.width;
      const exportHeight = height || sourceCanvas.height;

      // Check for abort
      if (signal?.aborted) throw new Error('Export aborted');

      let result;

      // Use ffmpeg-wasm if available for better quality
      if (this.isFFmpegReady && format === 'mp4') {
        result = await this.exportWithFFmpeg(format, exportWidth, exportHeight, fps, bitrate, {
          signal,
          onProgress: (progress) => {
            if (onProgress) onProgress(5 + progress * 0.9);
          }
        });
      } else {
        // Fallback to MediaRecorder
        result = await this.exportWithMediaRecorder(format, exportWidth, exportHeight, fps, bitrate, {
          signal,
          onProgress: (progress) => {
            if (onProgress) onProgress(5 + progress * 0.9);
          }
        });
      }

      if (onProgress) onProgress(100);

      // Generate thumbnail
      const thumbnail = await this.generateVideoThumbnail(sourceCanvas);

      return {
        ...result,
        thumbnail,
        width: exportWidth,
        height: exportHeight,
        fps,
        duration: duration || result.duration
      };

    } catch (error) {
      if (error.message === 'Export aborted') {
        throw error;
      }
      this.logger.error('Video export failed:', error);
      throw new Error(`Video export failed: ${error.message}`);
    }
  }

  /**
   * Export using ffmpeg-wasm for high quality
   */
  async exportWithFFmpeg(format, width, height, fps, bitrate, options = {}) {
    const { signal, onProgress } = options;

    if (!this.ffmpegService) {
      throw new Error('FFmpeg service not initialized');
    }

    // Capture frames from canvas
    const frames = await this.captureFrames(width, height, fps, signal, (progress) => {
      if (onProgress) onProgress(progress * 0.5);
    });

    if (signal?.aborted) throw new Error('Export aborted');

    // Encode with ffmpeg
    const blob = await this.ffmpegService.encodeVideo(frames, {
      format,
      width,
      height,
      fps,
      bitrate,
      codec: format === 'mp4' ? 'libx264' : 'libvpx',
      onProgress: (progress) => {
        if (onProgress) onProgress(50 + progress * 0.5);
      }
    });

    return {
      blob,
      format: `video/${format}`,
      size: blob.size
    };
  }

  /**
   * Export using MediaRecorder API (fallback)
   */
  async exportWithMediaRecorder(format, width, height, fps, bitrate, options = {}) {
    const { signal, onProgress } = options;

    // Create canvas stream
    const canvas = this.createExportCanvas(width, height);
    const stream = canvas.captureStream(fps);

    // Add audio track if available
    if (this.canvasRenderer.audioContext) {
      const audioStream = this.canvasRenderer.audioContext.createMediaStreamDestination();
      const audioTrack = audioStream.stream.getAudioTracks()[0];
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }
    }

    // Configure MediaRecorder
    const mimeType = this.getMimeType(format);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: this.parseBitrate(bitrate)
    });

    const chunks = [];

    return new Promise((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        resolve({
          blob,
          format: mimeType,
          size: blob.size,
          duration: chunks.length / fps
        });
      };

      recorder.onerror = (event) => {
        reject(new Error(`MediaRecorder error: ${event.error}`));
      };

      // Start recording
      recorder.start(1000 / fps); // Keyframe interval

      // Start rendering loop
      this.startRenderLoop(canvas, fps, signal, (progress) => {
        if (onProgress) onProgress(progress);
      }).then(() => {
        recorder.stop();
        stream.getTracks().forEach(track => track.stop());
      }).catch(reject);
    });
  }

  /**
   * Capture frames from canvas
   */
  async captureFrames(width, height, fps, signal, onProgress) {
    const frames = [];
    const canvas = this.createExportCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const frameDuration = 1000 / fps;
    const totalFrames = this.getTotalFrames(fps);
    let frameCount = 0;

    return new Promise((resolve, reject) => {
      const captureFrame = () => {
        if (signal?.aborted) {
          reject(new Error('Export aborted'));
          return;
        }

        // Render scene to canvas
        this.renderFrame(ctx, width, height, frameCount / fps);

        // Capture frame data
        const imageData = ctx.getImageData(0, 0, width, height);
        frames.push(imageData);

        frameCount++;
        if (onProgress) onProgress(frameCount / totalFrames);

        if (frameCount < totalFrames) {
          setTimeout(captureFrame, frameDuration);
        } else {
          resolve(frames);
        }
      };

      captureFrame();
    });
  }

  /**
   * Render a single frame
   */
  renderFrame(ctx, width, height, time) {
    // This would integrate with the scene manager to render at specific time
    // For now, render the current state
    ctx.drawImage(this.canvasRenderer.canvas, 0, 0, width, height);
  }

  /**
   * Start rendering loop for MediaRecorder
   */
  async startRenderLoop(canvas, fps, signal, onProgress) {
    const ctx = canvas.getContext('2d');
    const frameDuration = 1000 / fps;
    const totalFrames = this.getTotalFrames(fps);
    let frameCount = 0;

    return new Promise((resolve, reject) => {
      const render = () => {
        if (signal?.aborted) {
          reject(new Error('Export aborted'));
          return;
        }

        // Clear and render
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.renderFrame(ctx, canvas.width, canvas.height, frameCount / fps);

        frameCount++;
        if (onProgress) onProgress(frameCount / totalFrames);

        if (frameCount < totalFrames) {
          setTimeout(render, frameDuration);
        } else {
          resolve();
        }
      };

      render();
    });
  }

  /**
   * Create export canvas with proper dimensions
   */
  createExportCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /**
   * Get total frames based on timeline or default
   */
  getTotalFrames(fps) {
    // Default to 5 seconds if no timeline
    const duration = 5; // seconds
    return Math.floor(duration * fps);
  }

  /**
   * Get MIME type for format
   */
  getMimeType(format) {
    const types = {
      mp4: 'video/mp4;codecs=avc1.42E01E',
      webm: 'video/webm;codecs=vp8,opus'
    };

    // Check browser support
    const requestedType = types[format];
    if (MediaRecorder.isTypeSupported(requestedType)) {
      return requestedType;
    }

    // Fallback
    return format === 'mp4' ? 'video/webm' : 'video/webm';
  }

  /**
   * Parse bitrate string to number
   */
  parseBitrate(bitrate) {
    const units = { K: 1000, M: 1000000, G: 1000000000 };
    const match = bitrate.match(/^(\d+(?:\.\d+)?)\s*([KMG])?$/i);
    
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2]?.toUpperCase() || 'M';
      return value * (units[unit] || 1000000);
    }
    
    return 5000000; // Default 5Mbps
  }

  /**
   * Generate thumbnail from video frame
   */
  async generateVideoThumbnail(canvas, maxSize = 300) {
    const thumbCanvas = document.createElement('canvas');
    const ratio = Math.min(maxSize / canvas.width, maxSize / canvas.height);
    
    thumbCanvas.width = Math.round(canvas.width * ratio);
    thumbCanvas.height = Math.round(canvas.height * ratio);
    
    const ctx = thumbCanvas.getContext('2d');
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
   * Get supported video formats
   */
  getSupportedFormats() {
    return [
      {
        id: 'mp4',
        name: 'MP4 (H.264)',
        mimeType: 'video/mp4',
        extension: '.mp4',
        requiresFFmpeg: true
      },
      {
        id: 'webm',
        name: 'WebM',
        mimeType: 'video/webm',
        extension: '.webm',
        requiresFFmpeg: false
      }
    ];
  }

  /**
   * Check if format is supported
   */
  isFormatSupported(format) {
    if (format === 'mp4') {
      return this.isFFmpegReady;
    }
    return MediaRecorder.isTypeSupported('video/webm');
  }

  /**
   * Estimate video file size
   */
  estimateFileSize(duration, width, height, fps, bitrate) {
    const bitrateBps = this.parseBitrate(bitrate);
    const uncompressedSize = width * height * 3 * fps * duration;
    const compressedSize = (bitrateBps * duration) / 8;
    
    return Math.min(uncompressedSize, compressedSize);
  }
}

export { VideoExport };