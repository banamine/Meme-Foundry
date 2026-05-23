/**
 * Meme Foundry - FFmpeg WASM Service
 * Integration with ffmpeg-wasm for video encoding and processing
 */

import { Logger } from '@/utils/logger.js';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

class FFmpegService {
  constructor() {
    this.logger = new Logger('FFmpegService');
    this.ffmpeg = null;
    this.isLoaded = false;
    this.isLoading = false;
    this.loadProgress = 0;
    this.queue = [];
    this.isProcessing = false;
    
    // Configuration
    this.config = {
      coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
      wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
      workerURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.worker.js',
      logLevel: 'info',
      timeout: 60000 // 60 seconds
    };
  }

  /**
   * Initialize FFmpeg
   */
  async initialize() {
    if (this.isLoaded) return;
    if (this.isLoading) {
      // Wait for current initialization
      return new Promise((resolve) => {
        const check = () => {
          if (this.isLoaded) {
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    }
    
    this.isLoading = true;
    
    try {
      this.logger.info('Initializing FFmpeg WASM...');
      
      this.ffmpeg = new FFmpeg();
      
      // Set up logging
      this.ffmpeg.on('log', ({ message }) => {
        this.logger.debug('FFmpeg:', message);
      });
      
      // Set up progress
      this.ffmpeg.on('progress', ({ progress, time }) => {
        this.loadProgress = progress * 100;
        this.emit('ffmpeg:progress', {
          progress: this.loadProgress,
          time
        });
      });
      
      // Load FFmpeg
      await this.ffmpeg.load({
        coreURL: await toBlobURL(this.config.coreURL, 'text/javascript'),
        wasmURL: await toBlobURL(this.config.wasmURL, 'application/wasm'),
      });
      
      this.isLoaded = true;
      this.isLoading = false;
      
      this.logger.info('FFmpeg WASM loaded successfully');
      this.emit('ffmpeg:ready');
      
    } catch (error) {
      this.isLoading = false;
      this.logger.error('Failed to initialize FFmpeg:', error);
      this.emit('ffmpeg:error', error);
      throw error;
    }
  }

  /**
   * Encode video from frames
   */
  async encodeVideo(frames, options = {}) {
    if (!this.isLoaded) {
      throw new Error('FFmpeg not initialized');
    }
    
    const {
      format = 'mp4',
      width = 1080,
      height = 1080,
      fps = 30,
      bitrate = '5M',
      codec = 'libx264',
      preset = 'medium',
      crf = 23,
      audioFile = null,
      audioBitrate = '128k',
      onProgress = null
    } = options;
    
    return this.queueOperation(async () => {
      try {
        this.logger.info(`Encoding video: ${width}x${height} @ ${fps}fps`);
        
        // Write frames to virtual filesystem
        await this.writeFrames(frames, width, height);
        
        // Build FFmpeg command
        const args = this.buildEncodeCommand(format, width, height, fps, bitrate, codec, preset, crf);
        
        // Execute encoding
        await this.ffmpeg.exec(args);
        
        // Read output file
        const outputName = `output.${format}`;
        const data = await this.ffmpeg.readFile(outputName);
        
        // Create blob
        const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
        const blob = new Blob([data.buffer], { type: mimeType });
        
        // Clean up
        await this.cleanup();
        
        this.logger.info(`Video encoded: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
        
        return blob;
        
      } catch (error) {
        this.logger.error('Video encoding failed:', error);
        throw error;
      }
    });
  }

  /**
   * Write frames to FFmpeg virtual filesystem
   */
  async writeFrames(frames, width, height) {
    // Create canvas for frame composition
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      
      if (frame instanceof ImageData) {
        ctx.putImageData(frame, 0, 0);
      } else if (frame instanceof ImageBitmap) {
        ctx.drawImage(frame, 0, 0, width, height);
      }
      
      // Convert to PNG blob
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      const buffer = await blob.arrayBuffer();
      
      // Write to virtual filesystem
      const filename = `frame_${String(i).padStart(6, '0')}.png`;
      await this.ffmpeg.writeFile(filename, new Uint8Array(buffer));
    }
  }

  /**
   * Build FFmpeg encode command
   */
  buildEncodeCommand(format, width, height, fps, bitrate, codec, preset, crf) {
    const args = [
      '-framerate', String(fps),
      '-i', 'frame_%06d.png',
      '-c:v', codec,
      '-preset', preset,
      '-crf', String(crf),
      '-b:v', bitrate,
      '-maxrate', bitrate,
      '-bufsize', String(parseInt(bitrate) * 2 || '10M'),
      '-pix_fmt', 'yuv420p',
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
      '-movflags', '+faststart',
      '-y',
      `output.${format}`
    ];
    
    return args;
  }

  /**
   * Transcode video file
   */
  async transcodeVideo(inputFile, options = {}) {
    if (!this.isLoaded) {
      throw new Error('FFmpeg not initialized');
    }
    
    return this.queueOperation(async () => {
      try {
        const {
          format = 'mp4',
          width = null,
          height = null,
          fps = null,
          bitrate = '5M',
          startTime = 0,
          duration = null,
          codec = 'libx264'
        } = options;
        
        // Write input file
        const inputName = 'input.' + (inputFile.name?.split('.').pop() || 'mp4');
        await this.ffmpeg.writeFile(inputName, await fetchFile(inputFile));
        
        // Build command
        const args = ['-i', inputName];
        
        if (startTime > 0) {
          args.push('-ss', String(startTime));
        }
        
        if (duration) {
          args.push('-t', String(duration));
        }
        
        args.push('-c:v', codec);
        args.push('-b:v', bitrate);
        
        if (width && height) {
          args.push('-vf', `scale=${width}:${height}`);
        }
        
        if (fps) {
          args.push('-r', String(fps));
        }
        
        const outputName = `output.${format}`;
        args.push('-y', outputName);
        
        // Execute
        await this.ffmpeg.exec(args);
        
        // Read output
        const data = await this.ffmpeg.readFile(outputName);
        const blob = new Blob([data.buffer], { 
          type: format === 'mp4' ? 'video/mp4' : 'video/webm' 
        });
        
        await this.cleanup();
        
        return blob;
        
      } catch (error) {
        this.logger.error('Transcoding failed:', error);
        throw error;
      }
    });
  }

  /**
   * Extract audio from video
   */
  async extractAudio(inputFile, options = {}) {
    if (!this.isLoaded) {
      throw new Error('FFmpeg not initialized');
    }
    
    return this.queueOperation(async () => {
      try {
        const { format = 'mp3', bitrate = '128k' } = options;
        
        const inputName = 'input.' + (inputFile.name?.split('.').pop() || 'mp4');
        await this.ffmpeg.writeFile(inputName, await fetchFile(inputFile));
        
        const outputName = `output.${format}`;
        
        await this.ffmpeg.exec([
          '-i', inputName,
          '-vn',
          '-acodec', format === 'mp3' ? 'libmp3lame' : 'libvorbis',
          '-ab', bitrate,
          '-y',
          outputName
        ]);
        
        const data = await this.ffmpeg.readFile(outputName);
        const mimeType = format === 'mp3' ? 'audio/mpeg' : 'audio/ogg';
        const blob = new Blob([data.buffer], { type: mimeType });
        
        await this.cleanup();
        
        return blob;
        
      } catch (error) {
        this.logger.error('Audio extraction failed:', error);
        throw error;
      }
    });
  }

  /**
   * Generate video thumbnail
   */
  async generateThumbnail(inputFile, time = 0, width = null, height = null) {
    if (!this.isLoaded) {
      throw new Error('FFmpeg not initialized');
    }
    
    return this.queueOperation(async () => {
      try {
        const inputName = 'input.' + (inputFile.name?.split('.').pop() || 'mp4');
        await this.ffmpeg.writeFile(inputName, await fetchFile(inputFile));
        
        const args = [
          '-ss', String(time),
          '-i', inputName,
          '-vframes', '1'
        ];
        
        if (width && height) {
          args.push('-vf', `scale=${width}:${height}`);
        }
        
        args.push('thumbnail.png', '-y');
        
        await this.ffmpeg.exec(args);
        
        const data = await this.ffmpeg.readFile('thumbnail.png');
        const blob = new Blob([data.buffer], { type: 'image/png' });
        
        await this.cleanup();
        
        return blob;
        
      } catch (error) {
        this.logger.error('Thumbnail generation failed:', error);
        throw error;
      }
    });
  }

  /**
   * Concatenate videos
   */
  async concatenateVideos(files, options = {}) {
    if (!this.isLoaded) {
      throw new Error('FFmpeg not initialized');
    }
    
    return this.queueOperation(async () => {
      try {
        const { format = 'mp4', bitrate = '5M' } = options;
        
        // Write all input files
        for (let i = 0; i < files.length; i++) {
          await this.ffmpeg.writeFile(`input_${i}.mp4`, await fetchFile(files[i]));
        }
        
        // Create concat file list
        const concatList = files.map((_, i) => `file 'input_${i}.mp4'`).join('\n');
        await this.ffmpeg.writeFile('concat.txt', concatList);
        
        const outputName = `output.${format}`;
        
        await this.ffmpeg.exec([
          '-f', 'concat',
          '-safe', '0',
          '-i', 'concat.txt',
          '-c:v', 'libx264',
          '-b:v', bitrate,
          '-y',
          outputName
        ]);
        
        const data = await this.ffmpeg.readFile(outputName);
        const blob = new Blob([data.buffer], { 
          type: format === 'mp4' ? 'video/mp4' : 'video/webm' 
        });
        
        await this.cleanup();
        
        return blob;
        
      } catch (error) {
        this.logger.error('Video concatenation failed:', error);
        throw error;
      }
    });
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(inputFile) {
    if (!this.isLoaded) {
      throw new Error('FFmpeg not initialized');
    }
    
    return this.queueOperation(async () => {
      try {
        const inputName = 'input.' + (inputFile.name?.split('.').pop() || 'mp4');
        await this.ffmpeg.writeFile(inputName, await fetchFile(inputFile));
        
        // Use ffprobe equivalent
        let metadata = '';
        
        this.ffmpeg.on('log', ({ message }) => {
          metadata += message + '\n';
        });
        
        await this.ffmpeg.exec(['-i', inputName, '-f', 'null', '-']);
        
        await this.cleanup();
        
        return this.parseMetadata(metadata);
        
      } catch (error) {
        // FFmpeg returns non-zero for info-only commands
        // Metadata is still captured in logs
        return { error: false };
      }
    });
  }

  /**
   * Parse FFmpeg metadata output
   */
  parseMetadata(output) {
    const metadata = {
      duration: null,
      bitrate: null,
      streams: []
    };
    
    // Parse duration
    const durationMatch = output.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    if (durationMatch) {
      metadata.duration = 
        parseInt(durationMatch[1]) * 3600 +
        parseInt(durationMatch[2]) * 60 +
        parseFloat(durationMatch[3]);
    }
    
    // Parse bitrate
    const bitrateMatch = output.match(/bitrate: (\d+) kb\/s/);
    if (bitrateMatch) {
      metadata.bitrate = parseInt(bitrateMatch[1]);
    }
    
    // Parse streams
    const streamRegex = /Stream #(\d+:\d+).*?: (\w+): (.*)/g;
    let match;
    
    while ((match = streamRegex.exec(output)) !== null) {
      metadata.streams.push({
        id: match[1],
        type: match[2],
        info: match[3]
      });
    }
    
    return metadata;
  }

  /**
   * Queue operation for sequential processing
   */
  async queueOperation(operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        operation,
        resolve,
        reject
      });
      
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process operation queue
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const { operation, resolve, reject } = this.queue.shift();
      
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Clean up virtual filesystem
   */
  async cleanup() {
    try {
      const files = await this.ffmpeg.listDir('/');
      
      for (const file of files) {
        if (file.name !== '.' && file.name !== '..') {
          await this.ffmpeg.deleteFile(file.name);
        }
      }
    } catch (error) {
      this.logger.warn('Cleanup failed:', error);
    }
  }

  /**
   * Check if FFmpeg is available
   */
  isAvailable() {
    return this.isLoaded;
  }

  /**
   * Get supported formats
   */
  getSupportedFormats() {
    return {
      video: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'gif'],
      audio: ['mp3', 'aac', 'ogg', 'wav', 'flac'],
      image: ['png', 'jpg', 'jpeg', 'webp', 'bmp']
    };
  }

  /**
   * Terminate FFmpeg
   */
  async terminate() {
    if (this.ffmpeg) {
      await this.cleanup();
      this.ffmpeg.terminate();
      this.isLoaded = false;
      this.ffmpeg = null;
      this.logger.info('FFmpeg terminated');
    }
  }
}

// Add EventEmitter
import { EventEmitter } from '@/utils/event-emitter.js';
Object.assign(FFmpegService.prototype, EventEmitter.prototype);

export { FFmpegService };