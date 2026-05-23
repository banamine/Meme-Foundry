/**
 * Meme Foundry - Application Constants
 * Centralized constants and enumerations
 */

export const AppConstants = {
  // Application
  APP_NAME: 'Meme Foundry',
  APP_VERSION: '1.0.0',
  APP_DESCRIPTION: 'Advanced Meme Foundry Media Studio',
  
  // Storage Keys
  STORAGE_KEYS: {
    RECOVERY: 'meme-foundry-recovery',
    BACKUPS: 'meme-foundry-backups',
    PRESETS: 'meme-foundry-presets',
    FONTS: 'meme-foundry-fonts',
    SETTINGS: 'meme-foundry-settings',
    SHORTCUTS: 'meme-foundry-shortcuts',
    SAFE_AREAS: 'meme-foundry-safe-areas',
    AUTOSAVE_CONFIG: 'meme-foundry-autosave-config',
    EXPORT_HISTORY: 'meme-foundry-export-history'
  },
  
  // Database
  DB_NAME: 'meme-foundry-db',
  DB_VERSION: 1,
  DB_STORES: {
    PROJECTS: 'projects',
    ASSETS: 'assets',
    THUMBNAILS: 'thumbnails',
    SETTINGS: 'settings',
    EXPORT_HISTORY: 'exportHistory',
    CACHE: 'cache'
  },

  // Canvas
  CANVAS: {
    DEFAULT_WIDTH: 1080,
    DEFAULT_HEIGHT: 1080,
    MIN_WIDTH: 320,
    MIN_HEIGHT: 320,
    MAX_WIDTH: 3840,
    MAX_HEIGHT: 2160,
    BACKGROUND_COLOR: '#FFFFFF',
    PIXEL_RATIO: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
  },

  // Export Formats
  EXPORT_FORMATS: {
    PNG: {
      id: 'png',
      name: 'PNG',
      extension: '.png',
      mimeType: 'image/png',
      lossless: true,
      supportsTransparency: true,
      maxQuality: 1
    },
    JPEG: {
      id: 'jpeg',
      name: 'JPEG',
      extension: '.jpg',
      mimeType: 'image/jpeg',
      lossless: false,
      supportsTransparency: false,
      maxQuality: 1
    },
    WEBP: {
      id: 'webp',
      name: 'WebP',
      extension: '.webp',
      mimeType: 'image/webp',
      lossless: false,
      supportsTransparency: true,
      maxQuality: 1
    },
    MP4: {
      id: 'mp4',
      name: 'MP4 Video',
      extension: '.mp4',
      mimeType: 'video/mp4',
      videoCodec: 'libx264',
      audioCodec: 'aac'
    },
    WEBM: {
      id: 'webm',
      name: 'WebM Video',
      extension: '.webm',
      mimeType: 'video/webm',
      videoCodec: 'libvpx',
      audioCodec: 'opus'
    },
    HTML: {
      id: 'html',
      name: 'HTML Bundle',
      extension: '.html',
      mimeType: 'text/html'
    }
  },

  // Layer Types
  LAYER_TYPES: {
    IMAGE: 'image',
    TEXT: 'text',
    VIDEO: 'video',
    AUDIO: 'audio',
    SHAPE: 'shape',
    GROUP: 'group',
    EFFECT: 'effect'
  },

  // Blend Modes
  BLEND_MODES: [
    'normal',
    'multiply',
    'screen',
    'overlay',
    'darken',
    'lighten',
    'color-dodge',
    'color-burn',
    'hard-light',
    'soft-light',
    'difference',
    'exclusion',
    'hue',
    'saturation',
    'color',
    'luminosity'
  ],

  // Shape Types
  SHAPE_TYPES: [
    'rectangle',
    'ellipse',
    'triangle',
    'polygon',
    'star',
    'line',
    'arrow'
  ],

  // Effect Types
  EFFECT_TYPES: [
    'drop-shadow',
    'inner-shadow',
    'glow',
    'inner-glow',
    'bevel',
    'blur',
    'sharpen',
    'noise',
    'color-overlay',
    'gradient-overlay',
    'stroke',
    'pixelate',
    'vignette'
  ],

  // Easing Functions
  EASING_FUNCTIONS: [
    { id: 'linear', name: 'Linear' },
    { id: 'ease', name: 'Ease' },
    { id: 'ease-in', name: 'Ease In' },
    { id: 'ease-out', name: 'Ease Out' },
    { id: 'ease-in-out', name: 'Ease In Out' },
    { id: 'ease-out-back', name: 'Ease Out Back' },
    { id: 'ease-in-back', name: 'Ease In Back' },
    { id: 'bounce', name: 'Bounce' },
    { id: 'elastic', name: 'Elastic' },
    { id: 'step', name: 'Step' }
  ],

  // Editor Tools
  TOOLS: {
    SELECT: 'select',
    TEXT: 'text',
    SHAPE: 'shape',
    BRUSH: 'brush',
    CROP: 'crop',
    HAND: 'hand',
    ZOOM: 'zoom'
  },

  // UI Themes
  THEMES: {
    DARK: 'dark',
    LIGHT: 'light'
  },

  // Breakpoints
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1440
  },

  // Media
  MEDIA: {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    MAX_IMAGE_DIMENSIONS: 8192,
    MAX_VIDEO_DURATION: 600, // 10 minutes
    MAX_AUDIO_DURATION: 1800, // 30 minutes
    SUPPORTED_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    SUPPORTED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
    SUPPORTED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac']
  },

  // Workers
  WORKERS: {
    MAX_WORKERS: typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4,
    TASK_TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3
  },

  // Performance
  PERFORMANCE: {
    TARGET_FPS: 60,
    RENDER_THROTTLE: 16, // ~60fps
    AUTOSAVE_INTERVAL: 30000, // 30 seconds
    RECOVERY_INTERVAL: 15000, // 15 seconds
    MEMORY_CHECK_INTERVAL: 5000, // 5 seconds
    CACHE_CLEANUP_INTERVAL: 60000 // 1 minute
  },

  // Limits
  LIMITS: {
    MAX_LAYERS: 100,
    MAX_UNDO_STEPS: 50,
    MAX_PROJECTS: 100,
    MAX_CACHE_ENTRIES: 1000,
    MAX_EXPORT_QUEUE: 10,
    MAX_CONCURRENT_EXPORTS: 2,
    MAX_FONT_SIZE: 500,
    MIN_FONT_SIZE: 8,
    MAX_EFFECTS_PER_LAYER: 10,
    MAX_MASKS_PER_LAYER: 5,
    MAX_SHADOWS_PER_TEXT: 5,
    MAX_KEYFRAMES_PER_LAYER: 100
  },

  // Features
  FEATURES: {
    OFFLINE_SUPPORT: true,
    AUTOSAVE: true,
    CRASH_RECOVERY: true,
    FFMPEG_WASM: true,
    WEB_WORKERS: true,
    OFFSCREEN_CANVAS: true,
    INDEXEDDB: true,
    SERVICE_WORKER: true
  },

  // URLs
  URLS: {
    DOCS: 'https://github.com/meme-foundry/docs',
    SUPPORT: 'https://github.com/meme-foundry/issues',
    WEBSITE: 'https://memefoundry.app',
    GOOGLE_FONTS_API: 'https://fonts.googleapis.com/css2',
    FFMPEG_CORE: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  },

  // Initialize method to set runtime values
  initialize(config) {
    if (config?.canvas?.pixelRatio) {
      this.CANVAS.PIXEL_RATIO = config.canvas.pixelRatio;
    }
    if (config?.workers?.maxWorkers) {
      this.WORKERS.MAX_WORKERS = config.workers.maxWorkers;
    }
  },

  // Get constant value
  get(path, defaultValue) {
    const keys = path.split('.');
    let value = this;
    
    for (const key of keys) {
      if (value == null || typeof value !== 'object') {
        return defaultValue;
      }
      value = value[key];
    }
    
    return value ?? defaultValue;
  }
};

/**
 * Editor panel identifiers
 */
export const Panels = {
  LAYERS: 'layers',
  PROPERTIES: 'properties',
  PRESETS: 'presets',
  MEDIA: 'media',
  HISTORY: 'history',
  COMMENTS: 'comments'
};

/**
 * Export presets
 */
export const ExportPresets = {
  INSTAGRAM_POST: 'instagram-post',
  INSTAGRAM_STORY: 'instagram-story',
  INSTAGRAM_REEL: 'instagram-reel',
  FACEBOOK_POST: 'facebook-post',
  FACEBOOK_COVER: 'facebook-cover',
  FACEBOOK_STORY: 'facebook-story',
  TWITTER_POST: 'twitter-post',
  TWITTER_HEADER: 'twitter-header',
  YOUTUBE_THUMBNAIL: 'youtube-thumbnail',
  YOUTUBE_SHORTS: 'youtube-shorts',
  TIKTOK_VIDEO: 'tiktok-video',
  CUSTOM: 'custom'
};

/**
 * Text presets for memes
 */
export const TextPresets = {
  TOP: 'top',
  BOTTOM: 'bottom',
  MIDDLE: 'middle',
  CAPTION: 'caption',
  WATERMARK: 'watermark'
};

/**
 * Error codes
 */
export const ErrorCodes = {
  STORAGE_FULL: 'STORAGE_FULL',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  EXPORT_FAILED: 'EXPORT_FAILED',
  RENDER_FAILED: 'RENDER_FAILED',
  WORKER_ERROR: 'WORKER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  BROWSER_NOT_SUPPORTED: 'BROWSER_NOT_SUPPORTED',
  CORRUPTED_FILE: 'CORRUPTED_FILE'
};