/**
 * Meme Foundry - Audio Normalizer
 * Normalizes audio files and generates waveform data
 */

import { Logger } from '@/utils/logger.js';

class AudioNormalizer {
  constructor() {
    this.logger = new Logger('AudioNormalizer');
    
    // Audio context (created on demand)
    this.audioContext = null;
    
    // Target specifications
    this.targetSpecs = {
      sampleRate: 44100,
      channels: 2,
      maxDuration: 1800, // 30 minutes
      peakLevel: -3,     // dB
      loudnessTarget: -16 // LUFS (for podcasts/social)
    };
    
    // Waveform generation
    this.waveformConfig = {
      width: 800,
      height: 100,
      barWidth: 2,
      barGap: 1,
      color: '#e94560',
      backgroundColor: 'transparent'
    };
  }

  /**
   * Initialize audio context
   */
  getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.targetSpecs.sampleRate
      });
    }
    return this.audioContext;
  }

  /**
   * Check if audio needs normalization
   */
  async checkAudio(audioElement) {
    const issues = [];
    
    // Check duration
    if (audioElement.duration > this.targetSpecs.maxDuration) {
      issues.push({
        type: 'duration',
        message: 'Audio duration exceeds maximum',
        current: audioElement.duration,
        recommended: this.targetSpecs.maxDuration
      });
    }
    
    return {
      needsNormalization: issues.length > 0,
      issues
    };
  }

  /**
   * Normalize audio file
   */
  async normalize(file, options = {}) {
    const {
      targetLevel = this.targetSpecs.peakLevel,
      format = 'mp3',
      bitrate = '128k',
      onProgress = null
    } = options;

    try {
      this.logger.info(`Normalizing audio: ${file.name}`);
      
      if (onProgress) onProgress(10);
      
      // Decode audio file
      const audioBuffer = await this.decodeAudioFile(file);
      
      if (onProgress) onProgress(40);
      
      // Analyze current levels
      const analysis = this.analyzeAudio(audioBuffer);
      
      if (onProgress) onProgress(60);
      
      // Apply normalization
      const normalizedBuffer = this.applyNormalization(audioBuffer, targetLevel);
      
      if (onProgress) onProgress(80);
      
      // Encode back to blob
      const blob = await this.encodeAudio(normalizedBuffer, format, bitrate);
      
      if (onProgress) onProgress(100);
      
      this.logger.info(`Audio normalized: ${file.name}`);
      
      return {
        blob,
        url: URL.createObjectURL(blob),
        originalSize: file.size,
        normalizedSize: blob.size,
        analysis,
        duration: normalizedBuffer.duration
      };
      
    } catch (error) {
      this.logger.error('Audio normalization failed:', error);
      
      return {
        blob: file,
        url: URL.createObjectURL(file),
        originalSize: file.size,
        normalizedSize: file.size,
        fallback: true
      };
    }
  }

  /**
   * Decode audio file to AudioBuffer
   */
  async decodeAudioFile(file) {
    const context = this.getAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    return context.decodeAudioData(arrayBuffer);
  }

  /**
   * Analyze audio buffer
   */
  analyzeAudio(audioBuffer) {
    const channelData = audioBuffer.getChannelData(0);
    let peak = 0;
    let sumSquares = 0;
    
    for (let i = 0; i < channelData.length; i++) {
      const abs = Math.abs(channelData[i]);
      if (abs > peak) peak = abs;
      sumSquares += channelData[i] * channelData[i];
    }
    
    const rms = Math.sqrt(sumSquares / channelData.length);
    const rmsDb = 20 * Math.log10(rms || 0.00001);
    const peakDb = 20 * Math.log10(peak || 0.00001);
    
    return {
      peak,
      peakDb,
      rms,
      rmsDb,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      needsNormalization: peakDb < this.targetSpecs.peakLevel - 3
    };
  }

  /**
   * Apply normalization to audio buffer
   */
  applyNormalization(audioBuffer, targetDb = -3) {
    const context = this.getAudioContext();
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    
    // Create new buffer
    const normalizedBuffer = context.createBuffer(
      channels,
      length,
      audioBuffer.sampleRate
    );
    
    // Find peak across all channels
    let peak = 0;
    for (let channel = 0; channel < channels; channel++) {
      const data = audioBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
      }
    }
    
    // Calculate gain
    const targetLinear = Math.pow(10, targetDb / 20);
    const gain = peak > 0 ? targetLinear / peak : 1;
    
    // Apply gain with soft clipping
    for (let channel = 0; channel < channels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = normalizedBuffer.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        let sample = inputData[i] * gain;
        
        // Soft clipping
        if (sample > 1) {
          sample = 1 - Math.exp(-(sample - 1));
        } else if (sample < -1) {
          sample = -1 + Math.exp(sample + 1);
        }
        
        outputData[i] = sample;
      }
    }
    
    return normalizedBuffer;
  }

  /**
   * Encode AudioBuffer to blob
   */
  async encodeAudio(audioBuffer, format = 'mp3', bitrate = '128k') {
    // Use MediaRecorder or OfflineAudioContext for encoding
    const context = this.getAudioContext();
    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    // Create buffer source
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    
    // Render
    const renderedBuffer = await offlineCtx.startRendering();
    
    // Convert to WAV (simplest format)
    const wavBlob = this.audioBufferToWav(renderedBuffer);
    
    return wavBlob;
  }

  /**
   * Convert AudioBuffer to WAV blob
   */
  audioBufferToWav(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    
    // WAV header
    const buffer = new ArrayBuffer(44 + length * numChannels * 2);
    const view = new DataView(buffer);
    
    // RIFF header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length * numChannels * 2, true);
    this.writeString(view, 8, 'WAVE');
    
    // fmt chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    
    // data chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, length * numChannels * 2, true);
    
    // Write interleaved samples
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Write string to DataView
   */
  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Generate waveform data from audio file
   */
  async generateWaveform(file, config = {}) {
    const waveformConfig = { ...this.waveformConfig, ...config };
    
    try {
      // Decode audio
      const audioBuffer = await this.decodeAudioFile(file);
      
      // Get channel data
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      
      // Calculate number of bars
      const barCount = Math.floor(waveformConfig.width / (waveformConfig.barWidth + waveformConfig.barGap));
      const samplesPerBar = Math.floor(channelData.length / barCount);
      
      // Generate waveform data
      const waveform = [];
      
      for (let bar = 0; bar < barCount; bar++) {
        const start = bar * samplesPerBar;
        const end = start + samplesPerBar;
        
        let maxAmplitude = 0;
        let sumAmplitude = 0;
        
        for (let i = start; i < end && i < channelData.length; i++) {
          const amplitude = Math.abs(channelData[i]);
          if (amplitude > maxAmplitude) maxAmplitude = amplitude;
          sumAmplitude += amplitude;
        }
        
        const avgAmplitude = sumAmplitude / (end - start);
        
        waveform.push({
          index: bar,
          max: maxAmplitude,
          avg: avgAmplitude,
          time: start / sampleRate
        });
      }
      
      return {
        waveform,
        duration: audioBuffer.duration,
        sampleRate,
        barCount,
        config: waveformConfig
      };
      
    } catch (error) {
      this.logger.error('Waveform generation failed:', error);
      return null;
    }
  }

  /**
   * Render waveform to canvas
   */
  renderWaveform(canvas, waveformData, config = {}) {
    const { waveform, duration } = waveformData;
    const {
      width = 800,
      height = 100,
      barWidth = 2,
      barGap = 1,
      color = '#e94560',
      backgroundColor = 'transparent',
      progress = 0,
      progressColor = '#ffffff'
    } = { ...this.waveformConfig, ...config };
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    
    // Background
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }
    
    // Draw waveform bars
    const barCount = waveform.length;
    const totalBarWidth = barWidth + barGap;
    const centerY = height / 2;
    const progressBarCount = Math.floor(barCount * progress);
    
    waveform.forEach((bar, index) => {
      const x = index * totalBarWidth;
      const barHeight = bar.max * (height / 2 - 4);
      
      // Color based on progress
      if (index < progressBarCount) {
        ctx.fillStyle = progressColor || color;
      } else {
        ctx.fillStyle = color;
      }
      
      // Draw bar
      ctx.fillRect(x, centerY - barHeight / 2, barWidth, Math.max(1, barHeight));
    });
    
    return canvas;
  }

  /**
   * Detect silence in audio
   */
  detectSilence(audioBuffer, threshold = 0.01, minDuration = 0.5) {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const minSamples = minDuration * sampleRate;
    
    const silentRegions = [];
    let silentStart = null;
    let silentSamples = 0;
    
    for (let i = 0; i < channelData.length; i++) {
      const isSilent = Math.abs(channelData[i]) < threshold;
      
      if (isSilent) {
        if (silentStart === null) silentStart = i;
        silentSamples++;
      } else {
        if (silentSamples >= minSamples) {
          silentRegions.push({
            start: silentStart / sampleRate,
            end: i / sampleRate,
            duration: silentSamples / sampleRate
          });
        }
        silentStart = null;
        silentSamples = 0;
      }
    }
    
    // Check final region
    if (silentSamples >= minSamples) {
      silentRegions.push({
        start: silentStart / sampleRate,
        end: channelData.length / sampleRate,
        duration: silentSamples / sampleRate
      });
    }
    
    return silentRegions;
  }

  /**
   * Trim silence from audio
   */
  async trimSilence(file, threshold = 0.01, padding = 0.1) {
    const audioBuffer = await this.decodeAudioFile(file);
    const silentRegions = this.detectSilence(audioBuffer, threshold);
    const duration = audioBuffer.duration;
    
    // Find start trim (first non-silent region)
    let startTime = 0;
    let endTime = duration;
    
    if (silentRegions.length > 0 && silentRegions[0].start < 0.1) {
      startTime = Math.max(0, silentRegions[0].end - padding);
    }
    
    if (silentRegions.length > 0 && 
        silentRegions[silentRegions.length - 1].end > duration - 0.5) {
      endTime = Math.min(duration, silentRegions[silentRegions.length - 1].start + padding);
    }
    
    // Create trimmed buffer
    const context = this.getAudioContext();
    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    const newLength = endSample - startSample;
    
    const trimmedBuffer = context.createBuffer(
      audioBuffer.numberOfChannels,
      newLength,
      sampleRate
    );
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = trimmedBuffer.getChannelData(channel);
      
      for (let i = 0; i < newLength; i++) {
        outputData[i] = inputData[startSample + i];
      }
    }
    
    // Encode
    const blob = await this.encodeAudio(trimmedBuffer);
    
    return {
      blob,
      url: URL.createObjectURL(blob),
      originalDuration: duration,
      trimmedDuration: trimmedBuffer.duration,
      trimStart: startTime,
      trimEnd: endTime
    };
  }

  /**
   * Clean up audio context
   */
  close() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export { AudioNormalizer };