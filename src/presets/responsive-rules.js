/**
 * Meme Foundry - Responsive Rules
 * Responsive design rules for multi-device rendering
 */

class ResponsiveRules {
  constructor() {
    // Breakpoint definitions
    this.breakpoints = {
      mobile: { min: 0, max: 767 },
      tablet: { min: 768, max: 1023 },
      laptop: { min: 1024, max: 1439 },
      desktop: { min: 1440, max: 2559 },
      wide: { min: 2560, max: Infinity }
    };
    
    // Device-specific adjustments
    this.deviceAdjustments = {
      mobile: {
        scale: 0.5,
        minFontSize: 12,
        safeAreaPadding: 10,
        toolbarCollapsed: true,
        panelStacked: true
      },
      tablet: {
        scale: 0.75,
        minFontSize: 14,
        safeAreaPadding: 15,
        toolbarCollapsed: false,
        panelStacked: false
      },
      laptop: {
        scale: 1,
        minFontSize: 16,
        safeAreaPadding: 20,
        toolbarCollapsed: false,
        panelStacked: false
      },
      desktop: {
        scale: 1,
        minFontSize: 16,
        safeAreaPadding: 20,
        toolbarCollapsed: false,
        panelStacked: false
      },
      wide: {
        scale: 1.25,
        minFontSize: 18,
        safeAreaPadding: 25,
        toolbarCollapsed: false,
        panelStacked: false
      }
    };
    
    // Responsive text scaling rules
    this.textScalingRules = {
      minScale: 0.5,
      maxScale: 2.0,
      scaleSteps: [0.5, 0.625, 0.75, 0.875, 1, 1.25, 1.5, 2],
      preserveLineHeight: true,
      preserveLetterSpacing: true
    };
    
    // Current breakpoint
    this.currentBreakpoint = 'desktop';
  }

  /**
   * Detect current breakpoint from viewport width
   */
  detectBreakpoint(width = window.innerWidth) {
    for (const [name, range] of Object.entries(this.breakpoints)) {
      if (width >= range.min && width <= range.max) {
        return name;
      }
    }
    return 'desktop';
  }

  /**
   * Get current device adjustments
   */
  getCurrentAdjustments() {
    return this.deviceAdjustments[this.currentBreakpoint] || 
           this.deviceAdjustments.desktop;
  }

  /**
   * Update breakpoint
   */
  updateBreakpoint(width) {
    const newBreakpoint = this.detectBreakpoint(width);
    
    if (newBreakpoint !== this.currentBreakpoint) {
      this.currentBreakpoint = newBreakpoint;
      this.emit('breakpoint:changed', {
        breakpoint: newBreakpoint,
        adjustments: this.getCurrentAdjustments()
      });
    }
  }

  /**
   * Scale text size for responsive display
   */
  scaleTextSize(fontSize, adjustments = null) {
    const adj = adjustments || this.getCurrentAdjustments();
    const scaled = fontSize * adj.scale;
    
    return Math.max(adj.minFontSize, scaled);
  }

  /**
   * Get optimal canvas display size for viewport
   */
  getOptimalCanvasSize(canvasWidth, canvasHeight, viewportWidth = window.innerWidth, viewportHeight = window.innerHeight) {
    const padding = 40; // Padding around canvas
    const maxWidth = viewportWidth - padding;
    const maxHeight = viewportHeight - padding;
    
    const widthRatio = maxWidth / canvasWidth;
    const heightRatio = maxHeight / canvasHeight;
    const scale = Math.min(widthRatio, heightRatio, 1);
    
    return {
      width: Math.round(canvasWidth * scale),
      height: Math.round(canvasHeight * scale),
      scale
    };
  }

  /**
   * Calculate responsive layer transform
   */
  calculateResponsiveTransform(layerTransform, canvasSize, displaySize) {
    const scale = displaySize.width / canvasSize.width;
    
    return {
      x: layerTransform.x * scale,
      y: layerTransform.y * scale,
      width: layerTransform.width * scale,
      height: layerTransform.height * scale,
      rotation: layerTransform.rotation,
      scaleX: layerTransform.scaleX,
      scaleY: layerTransform.scaleY,
      anchorX: layerTransform.anchorX,
      anchorY: layerTransform.anchorY
    };
  }

  /**
   * Get responsive font configuration
   */
  getResponsiveFontConfig(textConfig, adjustments = null) {
    const adj = adjustments || this.getCurrentAdjustments();
    
    return {
      ...textConfig,
      fontSize: this.scaleTextSize(textConfig.fontSize, adj),
      minFontSize: adj.minFontSize,
      lineHeight: this.textScalingRules.preserveLineHeight 
        ? textConfig.lineHeight 
        : textConfig.lineHeight * adj.scale,
      letterSpacing: this.textScalingRules.preserveLetterSpacing 
        ? textConfig.letterSpacing 
        : textConfig.letterSpacing * adj.scale
    };
  }

  /**
   * Generate responsive CSS for HTML export
   */
  generateResponsiveCSS(canvasWidth, canvasHeight) {
    return `
      .meme-container {
        width: ${canvasWidth}px;
        height: ${canvasHeight}px;
        max-width: 100vw;
        max-height: 100vh;
      }
      
      @media (max-width: 767px) {
        .meme-container {
          width: 100vw;
          height: ${(canvasHeight / canvasWidth) * 100}vw;
        }
        
        .text-layer {
          font-size: calc(var(--font-size) * 0.5) !important;
        }
      }
      
      @media (min-width: 768px) and (max-width: 1023px) {
        .meme-container {
          width: 90vw;
          height: ${(canvasHeight / canvasWidth) * 90}vw;
          max-width: ${canvasWidth}px;
          max-height: ${canvasHeight}px;
        }
        
        .text-layer {
          font-size: calc(var(--font-size) * 0.75) !important;
        }
      }
      
      @media (min-width: 1024px) {
        .meme-container {
          width: ${Math.min(canvasWidth, 800)}px;
          height: ${Math.min(canvasHeight, 800 * (canvasHeight / canvasWidth))}px;
        }
      }
    `;
  }

  /**
   * Generate responsive HTML meta viewport tag
   */
  generateViewportMeta() {
    return '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">';
  }

  /**
   * Generate responsive image srcset
   */
  generateSrcSet(baseUrl, widths = [320, 640, 768, 1024, 1440, 1920]) {
    return widths
      .map(w => `${baseUrl}?width=${w} ${w}w`)
      .join(', ');
  }

  /**
   * Get responsive thumbnail sizes
   */
  getThumbnailSizes() {
    return {
      small: { width: 150, height: 150, breakpoint: 'mobile' },
      medium: { width: 300, height: 300, breakpoint: 'tablet' },
      large: { width: 600, height: 600, breakpoint: 'laptop' },
      original: { width: null, height: null, breakpoint: 'desktop' }
    };
  }

  /**
   * Optimize image for responsive loading
   */
  getResponsiveImageSizes(canvasWidth) {
    if (canvasWidth <= 600) {
      return {
        displayWidth: canvasWidth,
        loadWidth: Math.min(canvasWidth * 2, 1200),
        quality: 0.8
      };
    } else if (canvasWidth <= 1200) {
      return {
        displayWidth: canvasWidth,
        loadWidth: Math.min(canvasWidth * 1.5, 1800),
        quality: 0.85
      };
    } else {
      return {
        displayWidth: canvasWidth,
        loadWidth: canvasWidth,
        quality: 0.9
      };
    }
  }

  /**
   * Get responsive column layout
   */
  getResponsiveColumns(breakpoint = null) {
    const bp = breakpoint || this.currentBreakpoint;
    
    const columns = {
      mobile: 1,
      tablet: 2,
      laptop: 3,
      desktop: 4,
      wide: 5
    };
    
    return columns[bp] || 4;
  }

  /**
   * Calculate responsive grid
   */
  calculateResponsiveGrid(containerWidth, columnCount, gap = 16) {
    const totalGap = gap * (columnCount - 1);
    const columnWidth = (containerWidth - totalGap) / columnCount;
    
    return {
      columnWidth,
      gap,
      columnCount
    };
  }

  /**
   * Get responsive spacing
   */
  getResponsiveSpacing(type = 'padding') {
    const spacing = {
      mobile: { padding: 8, margin: 4, gap: 8 },
      tablet: { padding: 12, margin: 8, gap: 12 },
      laptop: { padding: 16, margin: 12, gap: 16 },
      desktop: { padding: 20, margin: 16, gap: 20 },
      wide: { padding: 24, margin: 20, gap: 24 }
    };
    
    const bp = this.currentBreakpoint;
    return spacing[bp]?.[type] || spacing.desktop[type];
  }

  /**
   * Apply responsive adjustments to editor layout
   */
  applyResponsiveLayout(editorContainer, breakpoint = null) {
    const bp = breakpoint || this.currentBreakpoint;
    const adj = this.deviceAdjustments[bp];
    
    if (!adj) return;
    
    // Toolbar adjustments
    const toolbar = editorContainer.querySelector('.editor-toolbar');
    if (toolbar) {
      toolbar.classList.toggle('collapsed', adj.toolbarCollapsed);
    }
    
    // Panel adjustments
    const panels = editorContainer.querySelectorAll('.editor-sidebar');
    panels.forEach(panel => {
      panel.classList.toggle('stacked', adj.panelStacked);
    });
    
    // Canvas scaling
    const canvas = editorContainer.querySelector('canvas');
    if (canvas) {
      const scale = adj.scale;
      canvas.style.transform = `scale(${scale})`;
      canvas.style.transformOrigin = 'center center';
    }
  }

  /**
   * Get responsive export dimensions
   */
  getResponsiveExportDimensions(platform, type = 'post') {
    const breakpointDimensions = {
      mobile: {
        'instagram-post': { width: 640, height: 640 },
        'instagram-story': { width: 640, height: 1136 },
        'facebook-post': { width: 800, height: 420 }
      },
      tablet: {
        'instagram-post': { width: 800, height: 800 },
        'instagram-story': { width: 800, height: 1422 },
        'facebook-post': { width: 1000, height: 525 }
      },
      desktop: {
        'instagram-post': { width: 1080, height: 1080 },
        'instagram-story': { width: 1080, height: 1920 },
        'facebook-post': { width: 1200, height: 630 }
      }
    };
    
    const presetKey = `${platform}-${type}`;
    const bp = this.currentBreakpoint;
    
    return breakpointDimensions[bp]?.[presetKey] || 
           breakpointDimensions.desktop?.[presetKey];
  }

  /**
   * Check if layout should switch to mobile
   */
  isMobile() {
    return this.currentBreakpoint === 'mobile';
  }

  /**
   * Check if layout should switch to tablet
   */
  isTablet() {
    return this.currentBreakpoint === 'tablet';
  }

  /**
   * Check if layout is desktop
   */
  isDesktop() {
    return ['laptop', 'desktop', 'wide'].includes(this.currentBreakpoint);
  }
}

// Add EventEmitter
import { EventEmitter } from '@/utils/event-emitter.js';
Object.assign(ResponsiveRules.prototype, EventEmitter.prototype);

export { ResponsiveRules };