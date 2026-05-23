/**
 * Meme Foundry - Waveform Generator
 * Generates and renders audio waveforms for visualization
 */

import { Logger } from '@/utils/logger.js';

class WaveformGenerator {
  constructor() {
    this.logger = new Logger('WaveformGenerator');
    
    // Default rendering config
    this.defaultConfig = {
      width: 800,
      height: 100,
      barWidth: 2,
      barGap: 1,
      color: '#e94560',
      progressColor: '#ffffff',
      backgroundColor: 'transparent',
      gradientColors: null,
      mirrored: false,
      centered: true,
      smoothing: true,
      responsive: true
    };
  }

  /**
   * Generate waveform data from audio buffer
   */
  generateWaveformData(audioBuffer, barCount = 200) {
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerBar = Math.floor(channelData.length / barCount);
    const waveform = [];
    
    for (let bar = 0; bar < barCount; bar++) {
      const start = bar * samplesPerBar;
      const end = Math.min(start + samplesPerBar, channelData.length);
      
      let maxAmplitude = 0;
      let sumAmplitude = 0;
      let positiveSum = 0;
      let negativeSum = 0;
      let positiveCount = 0;
      let negativeCount = 0;
      
      for (let i = start; i < end; i++) {
        const amplitude = channelData[i];
        const absAmplitude = Math.abs(amplitude);
        
        if (amplitude > 0) {
          positiveSum += amplitude;
          positiveCount++;
        } else {
          negativeSum += absAmplitude;
          negativeCount++;
        }
        
        if (absAmplitude > maxAmplitude) maxAmplitude = absAmplitude;
        sumAmplitude += absAmplitude;
      }
      
      const sampleCount = end - start;
      const avgAmplitude = sumAmplitude / sampleCount;
      const positiveAvg = positiveCount > 0 ? positiveSum / positiveCount : 0;
      const negativeAvg = negativeCount > 0 ? negativeSum / negativeCount : 0;
      
      waveform.push({
        index: bar,
        max: maxAmplitude,
        avg: avgAmplitude,
        rms: Math.sqrt(sumAmplitude * sumAmplitude / sampleCount),
        positive: positiveAvg,
        negative: negativeAvg,
        time: start / audioBuffer.sampleRate
      });
    }
    
    return {
      waveform,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      barCount,
      peaks: this.findPeaks(waveform),
      maxAmplitude: Math.max(...waveform.map(b => b.max))
    };
  }

  /**
   * Find peaks in waveform
   */
  findPeaks(waveform, threshold = 0.7) {
    const peaks = [];
    
    for (let i = 1; i < waveform.length - 1; i++) {
      if (waveform[i].max > threshold && 
          waveform[i].max > waveform[i - 1].max && 
          waveform[i].max > waveform[i + 1].max) {
        peaks.push({
          index: i,
          amplitude: waveform[i].max,
          time: waveform[i].time
        });
      }
    }
    
    return peaks;
  }

  /**
   * Generate waveform from file
   */
  async generateFromFile(file, barCount = 200) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const waveformData = this.generateWaveformData(audioBuffer, barCount);
      
      audioContext.close();
      
      return waveformData;
      
    } catch (error) {
      this.logger.error('Failed to generate waveform from file:', error);
      return null;
    }
  }

  /**
   * Render waveform to canvas
   */
  renderWaveform(canvas, waveformData, config = {}) {
    const cfg = { ...this.defaultConfig, ...config };
    const { waveform, duration } = waveformData;
    
    // Set canvas size
    canvas.width = cfg.width * (window.devicePixelRatio || 1);
    canvas.height = cfg.height * (window.devicePixelRatio || 1);
    canvas.style.width = `${cfg.width}px`;
    canvas.style.height = `${cfg.height}px`;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    
    // Clear
    if (cfg.backgroundColor === 'transparent') {
      ctx.clearRect(0, 0, cfg.width, cfg.height);
    } else {
      ctx.fillStyle = cfg.backgroundColor;
      ctx.fillRect(0, 0, cfg.width, cfg.height);
    }
    
    // Calculate dimensions
    const barCount = waveform.length;
    const totalBarWidth = cfg.barWidth + cfg.barGap;
    const availableWidth = cfg.width;
    const barsToDraw = Math.min(barCount, Math.floor(availableWidth / totalBarWidth));
    const centerY = cfg.centered ? cfg.height / 2 : cfg.height;
    
    // Create gradient if specified
    let gradient = null;
    if (cfg.gradientColors && cfg.gradientColors.length >= 2) {
      gradient = ctx.createLinearGradient(0, 0, 0, cfg.height);
      cfg.gradientColors.forEach((color, index) => {
        gradient.addColorStop(index / (cfg.gradientColors.length - 1), color);
      });
    }
    
    // Draw bars
    for (let bar = 0; bar < barsToDraw; bar++) {
      const waveformBar = waveform[Math.floor(bar * (barCount / barsToDraw))];
      if (!waveformBar) continue;
      
      const x = bar * totalBarWidth;
      const amplitude = cfg.mirrored ? waveformBar.max : waveformBar.max;
      const barHeight = amplitude * (cfg.height / 2 - 2);
      
      ctx.fillStyle = gradient || cfg.color;
      
      if (cfg.centered) {
        // Draw from center
        if (cfg.mirrored) {
          const topHeight = waveformBar.positive * (cfg.height / 2 - 2);
          const bottomHeight = waveformBar.negative * (cfg.height / 2 - 2);
          
          ctx.fillRect(x, centerY - topHeight, cfg.barWidth, Math.max(1, topHeight));
          ctx.fillRect(x, centerY, cfg.barWidth, Math.max(1, bottomHeight));
        } else {
          ctx.fillRect(x, centerY - barHeight / 2, cfg.barWidth, Math.max(1, barHeight));
        }
      } else {
        // Draw from bottom
        ctx.fillRect(x, cfg.height - barHeight, cfg.barWidth, Math.max(1, barHeight));
      }
    }
    
    return canvas;
  }

  /**
   * Render waveform with progress
   */
  renderWithProgress(canvas, waveformData, progress = 0, config = {}) {
    const cfg = { ...this.defaultConfig, ...config };
    const { waveform } = waveformData;
    
    // Draw full waveform first
    this.renderWaveform(canvas, waveformData, cfg);
    
    const ctx = canvas.getContext('2d');
    const barCount = waveform.length;
    const totalBarWidth = cfg.barWidth + cfg.barGap;
    const barsToDraw = Math.min(barCount, Math.floor(cfg.width / totalBarWidth));
    const progressBar = Math.floor(barsToDraw * progress);
    const centerY = cfg.centered ? cfg.height / 2 : cfg.height;
    
    // Redraw progress portion with progress color
    for (let bar = 0; bar < progressBar; bar++) {
      const waveformBar = waveform[Math.floor(bar * (barCount / barsToDraw))];
      if (!waveformBar) continue;
      
      const x = bar * totalBarWidth;
      const barHeight = waveformBar.max * (cfg.height / 2 - 2);
      
      ctx.fillStyle = cfg.progressColor || '#ffffff';
      
      if (cfg.centered) {
        ctx.fillRect(x, centerY - barHeight / 2, cfg.barWidth, Math.max(1, barHeight));
      } else {
        ctx.fillRect(x, cfg.height - barHeight, cfg.barWidth, Math.max(1, barHeight));
      }
    }
    
    return canvas;
  }

  /**
   * Create waveform image (returns data URL)
   */
  async createWaveformImage(waveformData, config = {}) {
    const canvas = document.createElement('canvas');
    this.renderWaveform(canvas, waveformData, config);
    return canvas.toDataURL('image/png');
  }

  /**
   * Generate waveform SVG
   */
  generateSVG(waveformData, config = {}) {
    const cfg = { ...this.defaultConfig, ...config };
    const { waveform } = waveformData;
    
    const barCount = waveform.length;
    const totalBarWidth = cfg.barWidth + cfg.barGap;
    const barsToDraw = Math.min(barCount, Math.floor(cfg.width / totalBarWidth));
    const centerY = cfg.height / 2;
    
    let rects = '';
    
    for (let bar = 0; bar < barsToDraw; bar++) {
      const waveformBar = waveform[Math.floor(bar * (barCount / barsToDraw))];
      if (!waveformBar) continue;
      
      const x = bar * totalBarWidth;
      const barHeight = waveformBar.max * (cfg.height / 2 - 2);
      const y = centerY - barHeight / 2;
      
      rects += `<rect x="${x}" y="${y}" width="${cfg.barWidth}" height="${Math.max(1, barHeight)}" fill="${cfg.color}" rx="1"/>`;
    }
    
    return `<svg width="${cfg.width}" height="${cfg.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${cfg.backgroundColor}"/>
      ${rects}
    </svg>`;
  }

  /**
   * Resample waveform to different bar count
   */
  resampleWaveform(waveformData, targetBarCount) {
    const { waveform, duration, sampleRate, channels } = waveformData;
    const sourceBarCount = waveform.length;
    const resampled = [];
    
    for (let i = 0; i < targetBarCount; i++) {
      const sourceIndex = Math.floor(i * (sourceBarCount / targetBarCount));
      const sourceBar = waveform[Math.min(sourceIndex, sourceBarCount - 1)];
      
      resampled.push({
        ...sourceBar,
        index: i,
        time: (i / targetBarCount) * duration
      });
    }
    
    return {
      waveform: resampled,
      duration,
      sampleRate,
      channels,
      barCount: targetBarCount,
      peaks: this.findPeaks(resampled),
      maxAmplitude: Math.max(...resampled.map(b => b.max))
    };
  }

  /**
   * Combine multiple waveforms
   */
  combineWaveforms(waveformDataArray) {
    if (waveformDataArray.length === 0) return null;
    if (waveformDataArray.length === 1) return waveformDataArray[0];
    
    const maxDuration = Math.max(...waveformDataArray.map(w => w.duration));
    const barCount = Math.max(...waveformDataArray.map(w => w.barCount));
    
    const combined = [];
    
    for (let i = 0; i < barCount; i++) {
      let maxAmplitude = 0;
      let sumAmplitude = 0;
      
      waveformDataArray.forEach(waveformData => {
        const sourceIndex = Math.floor(i * (waveformData.barCount / barCount));
        const sourceBar = waveformData.waveform[Math.min(sourceIndex, waveformData.barCount - 1)];
        
        if (sourceBar) {
          maxAmplitude = Math.max(maxAmplitude, sourceBar.max);
          sumAmplitude += sourceBar.avg;
        }
      });
      
      combined.push({
        index: i,
        max: maxAmplitude,
        avg: sumAmplitude / waveformDataArray.length,
        time: (i / barCount) * maxDuration
      });
    }
    
    return {
      waveform: combined,
      duration: maxDuration,
      barCount,
      maxAmplitude: Math.max(...combined.map(b => b.max))
    };
  }
}

export { WaveformGenerator };