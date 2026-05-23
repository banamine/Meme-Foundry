/**
 * Meme Foundry - Application Configuration
 * Centralized configuration management with environment-specific settings
 */

import { Logger } from '@/utils/logger.js';

class AppConfig {
  static instance = null;
  
  constructor(initialConfig = {}) {
    if (AppConfig.instance) {
      return AppConfig.instance;
    }
    
    this.logger = new Logger('Config');
    this.config = this.getDefaultConfig();
    this.envConfig = this.getEnvConfig();
    this.runtimeConfig = {};
    
    // Merge configurations
    this.mergeConfig(initialConfig);
    
    AppConfig.instance = this;
    
    if (import.meta.env.DEV) {
      this.logger.debug('Configuration initialized:', this.getPublicConfig());
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      // Application
      app: {
        name: 'Meme Foundry',
        version: '1.0.0',
        buildDate: new Date().toISOString(),
        debug: import.meta.env.DEV || false
      },
      
      // Canvas settings
      canvas: {
        defaultWidth: 1080,
        defaultHeight: 1080,
        maxWidth: 3840,
        maxHeight: 2160,
        minWidth: 320,
        minHeight: 320,
        backgroundColor: '#FFFFFF',
        pixelRatio: window.devicePixelRatio || 1,
        useOffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
        antialias: true,
        imageSmoothingQuality: 'high'
      },
      
      // Export settings
      export: {
        defaultFormat: 'png',
        supportedFormats: ['png', 'jpeg', 'webp', 'mp4', 'webm'],
        maxConcurrentExports: 2,
        png: {
          compressionLevel: 6,
          filters: 0
        },
        jpeg: {
          quality: 0.92,
          progressive: true
        },
        webp: {
          quality: 0.92,
          lossless: false
        },
        video: {
          fps: 30,
          bitrate: '5M',
          codec: 'libx264',
          preset: 'medium'
        }
      },
      
      // Storage
      storage: {
        dbName: 'meme-foundry-db',
        dbVersion: 1,
        maxProjectSize: 500 * 1024 * 1024, // 500MB
        autosaveInterval: 30000, // 30 seconds
        maxRecoveryAge: 24 * 60 * 60 * 1000 // 24 hours
      },
      
      // Editor
      editor: {
        snapThreshold: 5,
        gridSize: 10,
        minFontSize: 8,
        maxFontSize: 500,
        defaultFontSize: 48,
        undoLimit: 50,
        maxLayers: 100,
        safeAreaOpacity: 0.3,
        rulerSize: 20
      },
      
      // Media
      media: {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        maxImageDimensions: 8192,
        maxVideoDuration: 300, // 5 minutes
        supportedImageTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
        supportedVideoTypes: ['video/mp4', 'video/webm'],
        supportedAudioTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac'],
        maxUploadsAtOnce: 10
      },
      
      // Workers
      workers: {
        maxWorkers: navigator.hardwareConcurrency || 4,
        timeoutMs: 30000,
        retryAttempts: 3
      },
      
      // Performance
      performance: {
        fpsTarget: 60,
        renderThrottle: 16, // ~60fps
        maxMemoryUsage: 500 * 1024 * 1024, // 500MB
        garbageCollectInterval: 60000 // 1 minute
      },
      
      // UI
      ui: {
        theme: 'dark',
        language: 'en',
        sidebarWidth: 280,
        timelineHeight: 200,
        responsive: {
          mobile: 768,
          tablet: 1024,
          desktop: 1440
        }
      },
      
      // Social media presets
      presets: {
        defaultPlatform: 'instagram',
        platforms: ['instagram', 'facebook', 'twitter', 'youtube', 'tiktok']
      },
      
      // URLs
      urls: {
        fontsApi: 'https://fonts.googleapis.com/css2',
        docsUrl: '/docs',
        supportUrl: 'https://github.com/yourusername/meme-foundry/issues'
      }
    };
  }

  /**
   * Get environment-specific configuration
   */
  getEnvConfig() {
    return {
      development: {
        app: { debug: true },
        performance: { fpsTarget: 30 }, // Lower for dev tools
        export: { video: { preset: 'ultrafast' } }
      },
      production: {
        app: { debug: false },
        performance: { fpsTarget: 60 },
        export: { video: { preset: 'medium' } }
      },
      test: {
        app: { debug: true },
        storage: { dbName: 'meme-foundry-test' },
        performance: { fpsTarget: 0 }
      }
    }[import.meta.env.MODE] || {};
  }

  /**
   * Merge configuration layers
   */
  mergeConfig(initialConfig) {
    const merge = (target, source) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          merge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    };
    
    merge(this.config, initialConfig);
    merge(this.config, this.envConfig);
  }

  /**
   * Get configuration value
   */
  get(path, defaultValue = undefined) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value == null || typeof value !== 'object') {
        return defaultValue;
      }
      value = value[key];
    }
    
    return value ?? defaultValue;
  }

  /**
   * Set configuration value
   */
  set(path, value) {
    const keys = path.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    this.runtimeConfig[path] = value;
    
    if (import.meta.env.DEV) {
      this.logger.debug(`Config updated: ${path} =`, value);
    }
  }

  /**
   * Get all configuration (public-safe)
   */
  getPublicConfig() {
    // Remove any sensitive data if needed
    const { storage: { dbName, ...storage }, ...rest } = this.config;
    return { ...rest, storage };
  }

  /**
   * Check if feature is enabled
   */
  isEnabled(path) {
    return this.get(path, false) === true;
  }

  /**
   * Reset to defaults
   */
  reset() {
    this.config = this.getDefaultConfig();
    this.envConfig = this.getEnvConfig();
    this.runtimeConfig = {};
    this.mergeConfig({});
  }

  /**
   * Export configuration for serialization
   */
  serialize() {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from serialized data
   */
  deserialize(json) {
    try {
      const config = JSON.parse(json);
      this.mergeConfig(config);
      return true;
    } catch (error) {
      this.logger.error('Failed to deserialize config:', error);
      return false;
    }
  }
}

// Singleton getter
function getConfig() {
  if (!AppConfig.instance) {
    new AppConfig();
  }
  return AppConfig.instance;
}

export { AppConfig, getConfig };