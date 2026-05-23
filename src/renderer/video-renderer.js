/**
 * Meme Foundry - Video Renderer
 * Renders video layers with playback control
 */

import { Logger } from '@/utils/logger.js';

class VideoRenderer {
  constructor() {
    this.logger = new Logger('VideoRenderer');
    this.videoElements = new Map();
  }

  async render(ctx, layer, bounds, config) {
    const video = layer.video;
    if (!video?.src) return;

    const { x, y, width, height } = bounds;
    
    try {
      const videoElement = await this.getVideoElement(layer);
      if (!videoElement) return;

      ctx.save();
      
      // Clip to bounds
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();
      
      // Draw video frame
      if (video.fit === 'cover') {
        this.drawCover(ctx, videoElement, x, y, width, height);
      } else if (video.fit === 'contain') {
        this.drawContain(ctx, videoElement, x, y, width, height);
      } else {
        ctx.drawImage(videoElement, x, y, width, height);
      }
      
      ctx.restore();
    } catch (error) {
      this.logger.error('Failed to render video:', error);
    }
  }

  async getVideoElement(layer) {
    if (this.videoElements.has(layer.id)) {
      return this.videoElements.get(layer.id);
    }

    const video = document.createElement('video');
    video.src = layer.video.src;
    video.muted = layer.video.muted !== false;
    video.loop = layer.video.loop || false;
    video.volume = layer.video.volume || 0;
    
    this.videoElements.set(layer.id, video);
    return video;
  }

  drawCover(ctx, video, x, y, width, height) {
    const vidRatio = video.videoWidth / video.videoHeight;
    const boxRatio = width / height;
    
    let sx, sy, sw, sh;
    
    if (vidRatio > boxRatio) {
      sw = video.videoHeight * boxRatio;
      sh = video.videoHeight;
      sx = (video.videoWidth - sw) / 2;
      sy = 0;
    } else {
      sw = video.videoWidth;
      sh = video.videoWidth / boxRatio;
      sx = 0;
      sy = (video.videoHeight - sh) / 2;
    }
    
    ctx.drawImage(video, sx, sy, sw, sh, x, y, width, height);
  }

  drawContain(ctx, video, x, y, width, height) {
    const vidRatio = video.videoWidth / video.videoHeight;
    const boxRatio = width / height;
    
    let dx, dy, dw, dh;
    
    if (vidRatio > boxRatio) {
      dw = width;
      dh = width / vidRatio;
      dx = x;
      dy = y + (height - dh) / 2;
    } else {
      dh = height;
      dw = height * vidRatio;
      dx = x + (width - dw) / 2;
      dy = y;
    }
    
    ctx.drawImage(video, dx, dy, dw, dh);
  }

  destroy() {
    this.videoElements.clear();
  }
}

export { VideoRenderer };