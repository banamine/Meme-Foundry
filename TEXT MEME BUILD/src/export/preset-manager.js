/**
 * Meme Foundry - Preset Manager
 * Manages platform presets, custom presets, and export configurations
 */

import { Logger } from '@/utils/logger.js';

class PresetManager {
  constructor() {
    this.logger = new Logger('PresetManager');
    this.presets = new Map();
    this.customPresets = new Map();
    this.loadDefaultPresets();
  }

  /**
   * Load built-in presets
   */
  loadDefaultPresets() {
    const defaultPresets = {
      // Instagram presets
      'instagram-post': {
        id: 'instagram-post',
        name: 'Instagram Post',
        platform: 'instagram',
        type: 'image',
        dimensions: { width: 1080, height: 1080 },
        format: 'jpeg',
        quality: 0.92,
        safeAreas: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        },
        metadata: {
          platform: 'instagram',
          type: 'post'
        }
      },
      'instagram-story': {
        id: 'instagram-story',
        name: 'Instagram Story',
        platform: 'instagram',
        type: 'image',
        dimensions: { width: 1080, height: 1920 },
        format: 'jpeg',
        quality: 0.92,
        safeAreas: {
          top: 100, // Profile/header area
          bottom: 100, // Reply bar
          left: 0,
          right: 0
        },
        metadata: {
          platform: 'instagram',
          type: 'story'
        }
      },
      'instagram-reel': {
        id: 'instagram-reel',
        name: 'Instagram Reel',
        platform: 'instagram',
        type: 'video',
        dimensions: { width: 1080, height: 1920 },
        format: 'mp4',
        fps: 30,
        bitrate: '5M',
        duration: 90,
        safeAreas: {
          top: 100,
          bottom: 100,
          left: 0,
          right: 0
        },
        metadata: {
          platform: 'instagram',
          type: 'reel'
        }
      },

      // Facebook presets
      'facebook-post': {
        id: 'facebook-post',
        name: 'Facebook Post',
        platform: 'facebook',
        type: 'image',
        dimensions: { width: 1200, height: 630 },
        format: 'jpeg',
        quality: 0.9,
        safeAreas: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        },
        metadata: {
          platform: 'facebook',
          type: 'post'
        }
      },
      'facebook-cover': {
        id: 'facebook-cover',
        name: 'Facebook Cover',
        platform: 'facebook',
        type: 'image',
        dimensions: { width: 820, height: 312 },
        format: 'jpeg',
        quality: 0.9,
        safeAreas: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        },
        metadata: {
          platform: 'facebook',
          type: 'cover'
        }
      },
      'facebook-story': {
        id: 'facebook-story',
        name: 'Facebook Story',
        platform: 'facebook',
        type: 'image',
        dimensions: { width: 1080, height: 1920 },
        format: 'jpeg',
        quality: 0.9,
        safeAreas: {
          top: 100,
          bottom: 100,
          left: 0,
          right: 0
        },
        metadata: {
          platform: 'facebook',
          type: 'story'
        }
      },

      // Twitter/X presets
      'twitter-post': {
        id: 'twitter-post',
        name: 'Twitter/X Post',
        platform: 'twitter',
        type: 'image',
        dimensions: { width: 1200, height: 675 },
        format: 'jpeg',
        quality: 0.85,
        safeAreas: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        },
        metadata: {
          platform: 'twitter',
          type: 'post'
        }
      },
      'twitter-header': {
        id: 'twitter-header',
        name: 'Twitter/X Header',
        platform: 'twitter',
        type: 'image',
        dimensions: { width: 1500, height: 500 },
        format: 'jpeg',
        quality: 0.9,
        safeAreas: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        },
        metadata: {
          platform: 'twitter',
          type: 'header'
        }
      },

      // YouTube presets
      'youtube-thumbnail': {
        id: 'youtube-thumbnail',
        name: 'YouTube Thumbnail',
        platform: 'youtube',
        type: 'image',
        dimensions: { width: 1280, height: 720 },
        format: 'jpeg',
        quality: 0.95,
        safeAreas: {
          top: 0,
          bottom: 100, // Title/buttons area
          left: 0,
          right: 0
        },
        metadata: {
          platform: 'youtube',
          type: 'thumbnail'
        }
      },
      'youtube-shorts': {
        id: 'youtube-shorts',
        name: 'YouTube Shorts',
        platform: 'youtube',
        type: 'video',
        dimensions: { width: 1080, height: 1920 },
        format: 'mp4',
        fps: 30,
        bitrate: '5M',
        duration: 60,
        safeAreas: {
          top: 100,
          bottom: 150, // Channel info area
          left: 0,
          right: 0
        },
        metadata: {
          platform: 'youtube',
          type: 'shorts'
        }
      },

      // TikTok presets
      'tiktok-video': {
        id: 'tiktok-video',
        name: 'TikTok Video',
        platform: 'tiktok',
        type: 'video',
        dimensions: { width: 1080, height: 1920 },
        format: 'mp4',
        fps: 30,
        bitrate: '5M',
        duration: 180,
        safeAreas: {
          top: 150, // Username/settings
          bottom: 200, // Caption/buttons
          left: 50,
          right: 50
        },
        metadata: {
          platform: 'tiktok',
          type: 'video'
        }
      },

      // Generic presets
      'high-quality-png': {
        id: 'high-quality-png',
        name: 'High Quality PNG',
        platform: 'custom',
        type: 'image',
        format: 'png',
        quality: 1,
        metadata: {
          platform: 'custom',
          type: 'export'
        }
      },
      'web-optimized': {
        id: 'web-optimized',
        name: 'Web Optimized',
        platform: 'custom',
        type: 'image',
        format: 'webp',
        quality: 0.8,
        metadata: {
          platform: 'custom',
          type: 'export'
        }
      },
      'animated-gif': {
        id: 'animated-gif',
        name: 'Animated GIF',
        platform: 'custom',
        type: 'video',
        format: 'webm',
        fps: 15,
        bitrate: '1M',
        duration: 15,
        metadata: {
          platform: 'custom',
          type: 'gif'
        }
      }
    };

    // Add all default presets
    Object.values(defaultPresets).forEach(preset => {
      this.presets.set(preset.id, preset);
    });
  }

  /**
   * Get all presets
   */
  getPresets(category = null) {
    let presets = [...this.presets.values(), ...this.customPresets.values()];
    
    if (category === 'image') {
      presets = presets.filter(p => p.type === 'image');
    } else if (category === 'video') {
      presets = presets.filter(p => p.type === 'video');
    } else if (category) {
      presets = presets.filter(p => p.platform === category);
    }
    
    return presets;
  }

  /**
   * Get presets by platform
   */
  getPresetsByPlatform(platform) {
    return this.getPresets(platform);
  }

  /**
   * Get specific preset
   */
  getPreset(id) {
    return this.presets.get(id) || this.customPresets.get(id) || null;
  }

  /**
   * Add custom preset
   */
  addCustomPreset(preset) {
    if (!preset.id) {
      preset.id = `custom-${crypto.randomUUID()}`;
    }
    
    // Validate preset
    const validated = this.validatePreset(preset);
    
    this.customPresets.set(validated.id, validated);
    this.saveCustomPresets();
    
    return validated;
  }

  /**
   * Update custom preset
   */
  updateCustomPreset(id, updates) {
    const preset = this.customPresets.get(id);
    if (!preset) {
      throw new Error(`Preset not found: ${id}`);
    }
    
    Object.assign(preset, updates);
    this.customPresets.set(id, preset);
    this.saveCustomPresets();
    
    return preset;
  }

  /**
   * Delete custom preset
   */
  deleteCustomPreset(id) {
    if (!this.customPresets.has(id)) {
      return false;
    }
    
    this.customPresets.delete(id);
    this.saveCustomPresets();
    return true;
  }

  /**
   * Apply preset to export configuration
   */
  async applyPreset(config) {
    const presetId = config.preset;
    if (!presetId) return config;
    
    const preset = this.getPreset(presetId);
    if (!preset) {
      this.logger.warn(`Preset not found: ${presetId}`);
      return config;
    }
    
    // Apply preset settings
    const applied = {
      ...config,
      format: preset.format || config.format,
      options: {
        ...config.options,
        quality: preset.quality || config.options?.quality,
        width: preset.dimensions?.width || config.options?.width,
        height: preset.dimensions?.height || config.options?.height,
        fps: preset.fps || config.options?.fps,
        bitrate: preset.bitrate || config.options?.bitrate,
        duration: preset.duration || config.options?.duration,
        platform: preset.platform,
        safeAreas: preset.safeAreas
      }
    };
    
    return applied;
  }

  /**
   * Validate preset configuration
   */
  validatePreset(preset) {
    const required = ['name', 'type', 'format'];
    const missing = required.filter(field => !preset[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    if (!['image', 'video'].includes(preset.type)) {
      throw new Error(`Invalid type: ${preset.type}`);
    }
    
    if (preset.quality !== undefined) {
      preset.quality = Math.min(1, Math.max(0, preset.quality));
    }
    
    if (preset.dimensions) {
      preset.dimensions.width = Math.max(1, preset.dimensions.width || 1080);
      preset.dimensions.height = Math.max(1, preset.dimensions.height || 1080);
    }
    
    return preset;
  }

  /**
   * Save custom presets to localStorage
   */
  saveCustomPresets() {
    try {
      const data = JSON.stringify([...this.customPresets.values()]);
      localStorage.setItem('meme-foundry-presets', data);
    } catch (error) {
      this.logger.warn('Failed to save custom presets:', error);
    }
  }

  /**
   * Load custom presets from localStorage
   */
  loadCustomPresets() {
    try {
      const data = localStorage.getItem('meme-foundry-presets');
      if (data) {
        const presets = JSON.parse(data);
        presets.forEach(preset => {
          this.customPresets.set(preset.id, preset);
        });
      }
    } catch (error) {
      this.logger.warn('Failed to load custom presets:', error);
    }
  }

  /**
   * Export preset as JSON
   */
  exportPreset(id) {
    const preset = this.getPreset(id);
    if (!preset) return null;
    
    return JSON.stringify(preset, null, 2);
  }

  /**
   * Import preset from JSON
   */
  importPreset(json) {
    try {
      const preset = JSON.parse(json);
      return this.addCustomPreset(preset);
    } catch (error) {
      throw new Error(`Failed to import preset: ${error.message}`);
    }
  }

  /**
   * Get preset recommendations based on content
   */
  getRecommendations(scene) {
    const recommendations = [];
    
    // Check aspect ratio
    const ratio = scene.canvas.width / scene.canvas.height;
    
    if (ratio === 1) {
      recommendations.push('instagram-post');
    } else if (ratio === 9/16) {
      recommendations.push('instagram-story', 'tiktok-video');
    } else if (ratio === 16/9) {
      recommendations.push('youtube-thumbnail', 'twitter-post');
    }
    
    // Check if scene has video/audio
    const hasVideo = scene.layers.some(l => l.type === 'video');
    const hasAudio = scene.layers.some(l => l.type === 'audio');
    
    if (hasVideo || hasAudio) {
      recommendations.push('instagram-reel', 'youtube-shorts');
    }
    
    return recommendations.map(id => this.getPreset(id)).filter(Boolean);
  }

  /**
   * Get safe area configuration for preset
   */
  getSafeAreas(presetId) {
    const preset = this.getPreset(presetId);
    return preset?.safeAreas || {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    };
  }
}

export { PresetManager };