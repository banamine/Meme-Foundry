/**
 * Meme Foundry - Safe Areas Manager
 * Manages safe area zones for different social platforms
 */

import { PlatformPresets } from './platform-presets.js';

class SafeAreasManager {
  constructor() {
    // Built-in safe area definitions
    this.safeAreas = new Map();
    
    // Custom safe areas
    this.customSafeAreas = new Map();
    
    // Initialize defaults
    this.initializeDefaults();
  }

  /**
   * Initialize default safe areas from platform presets
   */
  initializeDefaults() {
    for (const [platform, data] of Object.entries(PlatformPresets)) {
      for (const [type, preset] of Object.entries(data.types)) {
        if (preset.safeAreas) {
          this.safeAreas.set(`${platform}-${type}`, {
            ...preset.safeAreas,
            textZones: preset.textZones || [],
            overlapZones: preset.overlapZones || []
          });
        }
      }
    }
  }

  /**
   * Get safe areas for platform and type
   */
  getSafeAreas(platform, type = 'post') {
    const key = `${platform}-${type}`;
    
    // Check custom overrides first
    if (this.customSafeAreas.has(key)) {
      return this.customSafeAreas.get(key);
    }
    
    // Fall back to defaults
    return this.safeAreas.get(key) || this.getDefaultSafeAreas();
  }

  /**
   * Get default safe areas
   */
  getDefaultSafeAreas() {
    return {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      textZones: [],
      overlapZones: []
    };
  }

  /**
   * Set custom safe areas
   */
  setCustomSafeAreas(platform, type, safeAreas) {
    const key = `${platform}-${type}`;
    this.customSafeAreas.set(key, safeAreas);
    this.saveCustomSafeAreas();
  }

  /**
   * Remove custom safe areas
   */
  removeCustomSafeAreas(platform, type) {
    const key = `${platform}-${type}`;
    this.customSafeAreas.delete(key);
    this.saveCustomSafeAreas();
  }

  /**
   * Calculate content area within safe zones
   */
  calculateContentArea(canvasWidth, canvasHeight, safeAreas) {
    const { top = 0, bottom = 0, left = 0, right = 0 } = safeAreas;
    
    return {
      x: left,
      y: top,
      width: canvasWidth - left - right,
      height: canvasHeight - top - bottom
    };
  }

  /**
   * Check if point is within safe area
   */
  isPointSafe(x, y, canvasWidth, canvasHeight, safeAreas) {
    const contentArea = this.calculateContentArea(canvasWidth, canvasHeight, safeAreas);
    
    return (
      x >= contentArea.x &&
      x <= contentArea.x + contentArea.width &&
      y >= contentArea.y &&
      y <= contentArea.y + contentArea.height
    );
  }

  /**
   * Check if element is within safe area
   */
  isElementSafe(element, canvasWidth, canvasHeight, safeAreas) {
    const contentArea = this.calculateContentArea(canvasWidth, canvasHeight, safeAreas);
    const transform = element.transform || element;
    
    // Check all four corners
    const corners = [
      { x: transform.x, y: transform.y },
      { x: transform.x + transform.width, y: transform.y },
      { x: transform.x, y: transform.y + transform.height },
      { x: transform.x + transform.width, y: transform.y + transform.height }
    ];
    
    return corners.every(corner =>
      this.isPointSafe(corner.x, corner.y, canvasWidth, canvasHeight, safeAreas)
    );
  }

  /**
   * Get text-safe zones
   */
  getTextSafeZones(canvasWidth, canvasHeight, safeAreas) {
    const zones = [];
    
    // Add predefined text zones
    if (safeAreas.textZones) {
      zones.push(...safeAreas.textZones);
    }
    
    // If no predefined zones, use content area with padding
    if (zones.length === 0) {
      const contentArea = this.calculateContentArea(canvasWidth, canvasHeight, safeAreas);
      const padding = 20;
      
      zones.push({
        x: contentArea.x + padding,
        y: contentArea.y + padding,
        width: contentArea.width - padding * 2,
        height: contentArea.height - padding * 2
      });
    }
    
    return zones;
  }

  /**
   * Get primary text zone (largest available)
   */
  getPrimaryTextZone(canvasWidth, canvasHeight, safeAreas) {
    const zones = this.getTextSafeZones(canvasWidth, canvasHeight, safeAreas);
    
    // Return the largest zone
    return zones.reduce((largest, zone) => {
      const area = zone.width * zone.height;
      const largestArea = largest.width * largest.height;
      return area > largestArea ? zone : largest;
    }, zones[0]);
  }

  /**
   * Get overlap zones (areas covered by UI elements)
   */
  getOverlapZones(canvasWidth, canvasHeight, safeAreas) {
    return safeAreas.overlapZones || [];
  }

  /**
   * Render safe area guides
   */
  renderSafeAreas(ctx, canvasWidth, canvasHeight, safeAreas, style = {}) {
    const {
      fillColor = 'rgba(255, 0, 0, 0.1)',
      strokeColor = 'rgba(255, 0, 0, 0.3)',
      lineWidth = 1,
      dashPattern = [5, 5],
      showTextZones = true,
      showOverlapZones = true
    } = style;

    ctx.save();

    // Render unsafe areas (shaded)
    const { top, bottom, left, right } = safeAreas;
    
    // Top unsafe area
    if (top > 0) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, canvasWidth, top);
    }
    
    // Bottom unsafe area
    if (bottom > 0) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, canvasHeight - bottom, canvasWidth, bottom);
    }
    
    // Left unsafe area
    if (left > 0) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, left, canvasHeight);
    }
    
    // Right unsafe area
    if (right > 0) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(canvasWidth - right, 0, right, canvasHeight);
    }

    // Render safe area border
    const contentArea = this.calculateContentArea(canvasWidth, canvasHeight, safeAreas);
    
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(dashPattern);
    ctx.strokeRect(
      contentArea.x,
      contentArea.y,
      contentArea.width,
      contentArea.height
    );
    ctx.setLineDash([]);

    // Render text zones
    if (showTextZones) {
      const textZones = this.getTextSafeZones(canvasWidth, canvasHeight, safeAreas);
      
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      
      textZones.forEach(zone => {
        ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
        
        // Label
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.font = '11px sans-serif';
        ctx.fillText('Text Safe', zone.x + 5, zone.y + 15);
      });
      
      ctx.setLineDash([]);
    }

    // Render overlap zones
    if (showOverlapZones) {
      const overlapZones = this.getOverlapZones(canvasWidth, canvasHeight, safeAreas);
      
      ctx.fillStyle = 'rgba(255, 165, 0, 0.2)';
      ctx.strokeStyle = 'rgba(255, 165, 0, 0.5)';
      
      overlapZones.forEach(zone => {
        ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
        ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      });
    }

    ctx.restore();
  }

  /**
   * Fit element to safe area
   */
  fitToSafeArea(element, canvasWidth, canvasHeight, safeAreas) {
    const contentArea = this.calculateContentArea(canvasWidth, canvasHeight, safeAreas);
    const transform = element.transform || element;
    
    // Clamp position
    transform.x = Math.max(contentArea.x, Math.min(
      transform.x,
      contentArea.x + contentArea.width - transform.width
    ));
    
    transform.y = Math.max(contentArea.y, Math.min(
      transform.y,
      contentArea.y + contentArea.height - transform.height
    ));
    
    // Scale down if too large
    if (transform.width > contentArea.width) {
      const scale = contentArea.width / transform.width;
      transform.width = contentArea.width;
      transform.height *= scale;
    }
    
    if (transform.height > contentArea.height) {
      const scale = contentArea.height / transform.height;
      transform.height = contentArea.height;
      transform.width *= scale;
    }
    
    return element;
  }

  /**
   * Get safe area warnings for a layer
   */
  checkLayerSafety(layer, canvasWidth, canvasHeight, safeAreas) {
    const warnings = [];
    const transform = layer.transform || layer;
    
    // Check if layer extends into unsafe areas
    if (transform.x < safeAreas.left) {
      warnings.push({
        type: 'overflow-left',
        message: 'Element extends into left unsafe area',
        severity: 'warning',
        adjustment: { x: safeAreas.left }
      });
    }
    
    if (transform.x + transform.width > canvasWidth - safeAreas.right) {
      warnings.push({
        type: 'overflow-right',
        message: 'Element extends into right unsafe area',
        severity: 'warning',
        adjustment: { x: canvasWidth - safeAreas.right - transform.width }
      });
    }
    
    if (transform.y < safeAreas.top) {
      warnings.push({
        type: 'overflow-top',
        message: 'Element extends into top unsafe area',
        severity: 'warning',
        adjustment: { y: safeAreas.top }
      });
    }
    
    if (transform.y + transform.height > canvasHeight - safeAreas.bottom) {
      warnings.push({
        type: 'overflow-bottom',
        message: 'Element extends into bottom unsafe area',
        severity: 'warning',
        adjustment: { y: canvasHeight - safeAreas.bottom - transform.height }
      });
    }
    
    // Check if text layer is in a safe text zone
    if (layer.type === 'text') {
      const textZones = this.getTextSafeZones(canvasWidth, canvasHeight, safeAreas);
      const isInAnyZone = textZones.some(zone => {
        return (
          transform.x >= zone.x &&
          transform.y >= zone.y &&
          transform.x + transform.width <= zone.x + zone.width &&
          transform.y + transform.height <= zone.y + zone.height
        );
      });
      
      if (!isInAnyZone) {
        warnings.push({
          type: 'text-zone',
          message: 'Text element is outside recommended text zones',
          severity: 'info'
        });
      }
    }
    
    return warnings;
  }

  /**
   * Get safe area report for entire scene
   */
  generateSceneReport(scene, platform, type) {
    const safeAreas = this.getSafeAreas(platform, type);
    const canvas = scene.canvas;
    
    const report = {
      safeAreas,
      contentArea: this.calculateContentArea(canvas.width, canvas.height, safeAreas),
      textZones: this.getTextSafeZones(canvas.width, canvas.height, safeAreas),
      layerReports: []
    };
    
    scene.layers.forEach(layer => {
      const warnings = this.checkLayerSafety(layer, canvas.width, canvas.height, safeAreas);
      
      report.layerReports.push({
        layerId: layer.id,
        layerName: layer.name,
        layerType: layer.type,
        isSafe: warnings.length === 0,
        warnings
      });
    });
    
    return report;
  }

  /**
   * Save custom safe areas
   */
  saveCustomSafeAreas() {
    try {
      const data = JSON.stringify([...this.customSafeAreas.entries()]);
      localStorage.setItem('meme-foundry-safe-areas', data);
    } catch (error) {
      console.warn('Failed to save custom safe areas:', error);
    }
  }

  /**
   * Load custom safe areas
   */
  loadCustomSafeAreas() {
    try {
      const data = localStorage.getItem('meme-foundry-safe-areas');
      if (data) {
        const entries = JSON.parse(data);
        this.customSafeAreas = new Map(entries);
      }
    } catch (error) {
      console.warn('Failed to load custom safe areas:', error);
    }
  }

  /**
   * Export safe areas for sharing
   */
  exportSafeAreas(platform, type) {
    return this.getSafeAreas(platform, type);
  }

  /**
   * Import safe areas
   */
  importSafeAreas(platform, type, safeAreas) {
    this.setCustomSafeAreas(platform, type, safeAreas);
  }
}

export { SafeAreasManager };