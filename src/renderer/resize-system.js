/**
 * Meme Foundry - Audio Renderer
 * Renders audio visualization and controls
 */

import { Logger } from '@/utils/logger.js';

class AudioRenderer {
  constructor() {
    this.logger = new Logger('AudioRenderer');
    this.audioContext = null;
    this.audioElements = new Map();
  }

  async initialize() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      this.logger.warn('Audio context not available');
    }
  }

  async render(ctx, layer, bounds, config) {
    const audio = layer.audio;
    if (!audio?.src) return;

    const { x, y, width, height } = bounds;
    
    // Render waveform or audio visualization
    if (audio.waveform) {
      this.renderWaveform(ctx, audio.waveform, x, y, width, height);
    } else {
      this.renderPlaceholder(ctx, x, y, width, height);
    }
  }

  renderWaveform(ctx, waveform, x, y, width, height) {
    ctx.save();
    
    const centerY = y + height / 2;
    const barWidth = Math.max(1, width / waveform.length);
    
    waveform.forEach((bar, index) => {
      const barHeight = bar.max * (height / 2 - 2);
      ctx.fillStyle = '#e94560';
      ctx.fillRect(
        x + index * barWidth,
        centerY - barHeight / 2,
        barWidth - 1,
        Math.max(1, barHeight)
      );
    });
    
    ctx.restore();
  }

  renderPlaceholder(ctx, x, y, width, height) {
    ctx.save();
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = '#a0a0b0';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔊 Audio', x + width / 2, y + height / 2);
    ctx.restore();
  }

  async getAudioElement(layer) {
    if (this.audioElements.has(layer.id)) {
      return this.audioElements.get(layer.id);
    }

    const audio = new Audio();
    audio.src = layer.audio.src;
    audio.volume = layer.audio.volume || 1;
    audio.loop = layer.audio.loop || false;
    
    this.audioElements.set(layer.id, audio);
    return audio;
  }

  destroy() {
    this.audioElements.clear();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export { AudioRenderer };