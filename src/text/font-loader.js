/**
 * Meme Foundry - Font Loader
 * Manages font loading, caching, and synchronization for deterministic exports
 */

import { Logger } from '@/utils/logger.js';

class FontLoader {
  constructor() {
    this.logger = new Logger('FontLoader');
    
    // Font registry
    this.fonts = new Map();
    this.loadingFonts = new Map();
    this.loadedFonts = new Set();
    this.failedFonts = new Set();
    
    // Default fonts
    this.defaultFonts = [
      {
        family: 'Impact',
        source: 'system',
        fallback: 'sans-serif'
      },
      {
        family: 'Arial',
        source: 'system',
        fallback: 'sans-serif'
      },
      {
        family: 'Times New Roman',
        source: 'system',
        fallback: 'serif'
      },
      {
        family: 'Courier New',
        source: 'system',
        fallback: 'monospace'
      }
    ];
    
    // Google Fonts API
    this.googleFontsApi = 'https://fonts.googleapis.com/css2';
    this.loadedGoogleFonts = new Set();
    
    // Font loading state
    this.isLoading = false;
    this.loadProgress = 0;
    this.totalFonts = 0;
    this.loadedCount = 0;
    
    // Export readiness
    this.exportReady = false;
    this.exportReadyPromise = null;
    this.exportReadyResolve = null;
  }

  /**
   * Initialize font loader
   */
  async initialize() {
    this.logger.info('Initializing font loader');
    
    // Register default fonts
    this.defaultFonts.forEach(font => {
      this.registerFont(font);
    });
    
    // Create export ready promise
    this.exportReadyPromise = new Promise(resolve => {
      this.exportReadyResolve = resolve;
    });
    
    // Load saved font preferences
    await this.loadPreferences();
    
    // Preload critical fonts
    await this.preloadCriticalFonts();
    
    this.exportReady = true;
    this.exportReadyResolve();
    
    this.emit('fonts:initialized', {
      fonts: this.fonts.size,
      loaded: this.loadedFonts.size
    });
  }

  /**
   * Register a font
   */
  registerFont(fontConfig) {
    const { family, source = 'system', url, weight = 'normal', style = 'normal' } = fontConfig;
    
    const fontKey = this.getFontKey(family, weight, style);
    
    if (!this.fonts.has(family)) {
      this.fonts.set(family, {
        family,
        variants: new Map(),
        fallback: fontConfig.fallback || 'sans-serif',
        source
      });
    }
    
    const fontFamily = this.fonts.get(family);
    fontFamily.variants.set(fontKey, {
      weight,
      style,
      url,
      loaded: false
    });
    
    this.emit('font:registered', { family, weight, style });
  }

  /**
   * Load a font
   */
  async loadFont(family, weight = 'normal', style = 'normal') {
    const fontKey = this.getFontKey(family, weight, style);
    
    // Check if already loaded
    if (this.loadedFonts.has(fontKey)) {
      return true;
    }
    
    // Check if loading
    if (this.loadingFonts.has(fontKey)) {
      return this.loadingFonts.get(fontKey);
    }
    
    const fontInfo = this.fonts.get(family);
    if (!fontInfo) {
      this.logger.warn(`Font not registered: ${family}`);
      return false;
    }
    
    const variant = fontInfo.variants.get(fontKey);
    if (!variant) {
      this.logger.warn(`Font variant not found: ${fontKey}`);
      return false;
    }
    
    // Start loading
    const loadPromise = this.loadFontVariant(family, variant);
    this.loadingFonts.set(fontKey, loadPromise);
    
    try {
      await loadPromise;
      this.loadedFonts.add(fontKey);
      this.loadingFonts.delete(fontKey);
      this.loadedCount++;
      this.updateProgress();
      
      this.emit('font:loaded', { family, weight, style });
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to load font: ${fontKey}`, error);
      this.failedFonts.add(fontKey);
      this.loadingFonts.delete(fontKey);
      
      this.emit('font:error', { family, weight, style, error });
      return false;
    }
  }

  /**
   * Load font variant
   */
  async loadFontVariant(family, variant) {
    const fontInfo = this.fonts.get(family);
    
    switch (fontInfo.source) {
      case 'system':
        return this.loadSystemFont(family, variant);
        
      case 'google':
        return this.loadGoogleFont(family, variant);
        
      case 'custom':
        return this.loadCustomFont(family, variant);
        
      default:
        // Try FontFace API
        return this.loadWithFontFace(family, variant);
    }
  }

  /**
   * Load system font (check if available)
   */
  async loadSystemFont(family, variant) {
    // Check if font is available using FontFace API
    try {
      const fontString = `${variant.style} ${variant.weight} 10px ${family}`;
      const isAvailable = await document.fonts.check(fontString);
      
      if (isAvailable) {
        return true;
      }
      
      // Try loading via FontFace
      return this.loadWithFontFace(family, variant);
      
    } catch (error) {
      this.logger.warn(`System font check failed: ${family}`, error);
      return false;
    }
  }

  /**
   * Load Google Font
   */
  async loadGoogleFont(family, variant) {
    if (this.loadedGoogleFonts.has(family)) {
      return true;
    }
    
    try {
      // Build Google Fonts URL
      const params = new URLSearchParams({
        family: `${family}:${variant.weight}`,
        display: 'swap'
      });
      
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `${this.googleFontsApi}?${params.toString()}`;
      
      document.head.appendChild(link);
      
      // Wait for font to load
      await document.fonts.load(`${variant.style} ${variant.weight} 1em ${family}`);
      
      this.loadedGoogleFonts.add(family);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to load Google Font: ${family}`, error);
      return false;
    }
  }

  /**
   * Load custom font from URL
   */
  async loadCustomFont(family, variant) {
    if (!variant.url) {
      throw new Error(`No URL provided for custom font: ${family}`);
    }
    
    return this.loadWithFontFace(family, variant);
  }

  /**
   * Load font using FontFace API
   */
  async loadWithFontFace(family, variant) {
    try {
      const fontFace = new FontFace(
        family,
        variant.url ? `url(${variant.url})` : `local(${family})`,
        {
          weight: variant.weight,
          style: variant.style
        }
      );
      
      const loadedFont = await fontFace.load();
      document.fonts.add(loadedFont);
      
      return true;
      
    } catch (error) {
      this.logger.warn(`FontFace load failed: ${family}`, error);
      
      // If it's a system font, it might still be available
      if (!variant.url) {
        return true; // Assume system font is available
      }
      
      return false;
    }
  }

  /**
   * Preload critical fonts
   */
  async preloadCriticalFonts() {
    const criticalFonts = [
      { family: 'Impact', weight: 'normal', style: 'normal' },
      { family: 'Impact', weight: 'bold', style: 'normal' },
      { family: 'Arial', weight: 'normal', style: 'normal' },
      { family: 'Arial', weight: 'bold', style: 'normal' },
      { family: 'Times New Roman', weight: 'bold', style: 'normal' }
    ];
    
    this.totalFonts = criticalFonts.length;
    this.loadedCount = 0;
    this.isLoading = true;
    
    const loadPromises = criticalFonts.map(font =>
      this.loadFont(font.family, font.weight, font.style)
    );
    
    await Promise.allSettled(loadPromises);
    
    this.isLoading = false;
    this.updateProgress();
    
    this.logger.info(`Preloaded ${this.loadedCount}/${this.totalFonts} critical fonts`);
  }

  /**
   * Load fonts for a project
   */
  async loadProjectFonts(sceneData) {
    const fontsNeeded = new Set();
    
    // Extract fonts from text layers
    const extractFonts = (layers) => {
      layers.forEach(layer => {
        if (layer.type === 'text' && layer.text?.fontFamily) {
          const fontConfig = {
            family: layer.text.fontFamily.split(',')[0].trim(),
            weight: layer.text.fontWeight || 'normal',
            style: layer.text.fontStyle || 'normal'
          };
          fontsNeeded.add(JSON.stringify(fontConfig));
        }
        
        if (layer.type === 'group' && layer.group?.children) {
          extractFonts(layer.group.children);
        }
      });
    };
    
    if (sceneData?.layers) {
      extractFonts(sceneData.layers);
    }
    
    // Load all needed fonts
    const loadPromises = Array.from(fontsNeeded)
      .map(f => JSON.parse(f))
      .map(font => this.loadFont(font.family, font.weight, font.style));
    
    await Promise.allSettled(loadPromises);
  }

  /**
   * Wait for all fonts to be ready
   */
  async waitForFonts() {
    await document.fonts.ready;
    
    if (!this.exportReady) {
      await this.exportReadyPromise;
    }
  }

  /**
   * Check if font is loaded
   */
  isFontLoaded(family, weight = 'normal', style = 'normal') {
    const fontKey = this.getFontKey(family, weight, style);
    return this.loadedFonts.has(fontKey);
  }

  /**
   * Get font fallback
   */
  getFontFallback(family) {
    const fontInfo = this.fonts.get(family);
    return fontInfo?.fallback || 'sans-serif';
  }

  /**
   * Get font stack (with fallbacks)
   */
  getFontStack(family) {
    const fontInfo = this.fonts.get(family);
    if (!fontInfo) return family;
    
    return `${family}, ${fontInfo.fallback}`;
  }

  /**
   * Load Google Fonts list
   */
  async loadGoogleFontsList() {
    try {
      const response = await fetch(
        'https://www.googleapis.com/webfonts/v1/webfonts?key=YOUR_API_KEY&sort=popularity'
      );
      const data = await response.json();
      
      data.items.forEach(font => {
        this.registerFont({
          family: font.family,
          source: 'google',
          fallback: font.category === 'serif' ? 'serif' : 'sans-serif'
        });
      });
      
      return data.items;
      
    } catch (error) {
      this.logger.warn('Failed to load Google Fonts list:', error);
      return [];
    }
  }

  /**
   * Save font preferences
   */
  async savePreferences() {
    try {
      const preferences = {
        loadedFonts: Array.from(this.loadedFonts),
        favoriteFonts: Array.from(this.fonts.keys()),
        lastUpdated: Date.now()
      };
      
      localStorage.setItem('meme-foundry-fonts', JSON.stringify(preferences));
      
    } catch (error) {
      this.logger.warn('Failed to save font preferences:', error);
    }
  }

  /**
   * Load font preferences
   */
  async loadPreferences() {
    try {
      const saved = localStorage.getItem('meme-foundry-fonts');
      if (saved) {
        const preferences = JSON.parse(saved);
        
        // Restore favorite fonts
        if (preferences.favoriteFonts) {
          preferences.favoriteFonts.forEach(family => {
            if (!this.fonts.has(family)) {
              this.registerFont({ family, source: 'system' });
            }
          });
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load font preferences:', error);
    }
  }

  /**
   * Generate font key
   */
  getFontKey(family, weight, style) {
    return `${family}:${weight}:${style}`;
  }

  /**
   * Update loading progress
   */
  updateProgress() {
    if (this.totalFonts > 0) {
      this.loadProgress = (this.loadedCount / this.totalFonts) * 100;
    }
    
    this.emit('fonts:progress', {
      loaded: this.loadedCount,
      total: this.totalFonts,
      progress: this.loadProgress
    });
  }

  /**
   * Get font loading status
   */
  getStatus() {
    return {
      registered: this.fonts.size,
      loaded: this.loadedFonts.size,
      failed: this.failedFonts.size,
      loading: this.loadingFonts.size,
      progress: this.loadProgress,
      exportReady: this.exportReady
    };
  }

  /**
   * Get all available fonts
   */
  getAvailableFonts() {
    const fonts = [];
    
    for (const [family, info] of this.fonts) {
      const variants = [];
      for (const [key, variant] of info.variants) {
        variants.push({
          weight: variant.weight,
          style: variant.style,
          loaded: this.loadedFonts.has(key)
        });
      }
      
      fonts.push({
        family,
        source: info.source,
        fallback: info.fallback,
        variants
      });
    }
    
    return fonts;
  }

  /**
   * Clean up
   */
  destroy() {
    this.fonts.clear();
    this.loadedFonts.clear();
    this.failedFonts.clear();
    this.loadingFonts.clear();
    this.removeAllListeners();
  }
}

// Add EventEmitter functionality
import { EventEmitter } from '@/utils/event-emitter.js';
Object.assign(FontLoader.prototype, EventEmitter.prototype);

// Singleton
let instance = null;

async function initializeFonts() {
  if (!instance) {
    instance = new FontLoader();
    await instance.initialize();
  }
  return instance;
}

export { FontLoader, initializeFonts };