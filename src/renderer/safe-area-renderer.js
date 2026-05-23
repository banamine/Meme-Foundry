/**
 * Meme Foundry - Safe Area Renderer
 * Renders safe area guides, margins, and platform overlays on canvas
 */

import { Logger } from '@/utils/logger.js';

class SafeAreaRenderer {
  constructor() {
    this.logger = new Logger('SafeAreaRenderer');
    
    // Safe area configurations
    this.config = {
      enabled: true,
      opacity: 0.15,
      showGrid: true,
      showLabels: true,
      showTextZones: true,
      showOverlays: true,
      animationDuration: 300
    };
    
    // Platform overlay elements
    this.overlays = {
      'instagram-story': {
        elements: [
          { type: 'rect', x: 20, y: 20, width: 40, height: 40, radius: 20, label: 'Profile' },
          { type: 'rect', x: 0, y: 1840, width: 1080, height: 80, label: 'Reply Bar' }
        ]
      },
      'instagram-reel': {
        elements: [
          { type: 'rect', x: 20, y: 20, width: 80, height: 24, label: 'Username' },
          { type: 'rect', x: 0, y: 1720, width: 1080, height: 200, label: 'Actions' }
        ]
      },
      'tiktok-video': {
        elements: [
          { type: 'rect', x: 16, y: 140, width: 100, height: 20, label: 'Following' },
          { type: 'rect', x: 920, y: 700, width: 48, height: 200, label: 'Buttons' },
          { type: 'rect', x: 16, y: 1650, width: 900, height: 100, label: 'Caption' }
        ]
      },
      'youtube-shorts': {
        elements: [
          { type: 'rect', x: 20, y: 20, width: 120, height: 24, label: 'Channel' },
          { type: 'rect', x: 0, y: 1740, width: 1080, height: 180, label: 'Info' }
        ]
      }
    };
  }

  /**
   * Render safe area guides on canvas
   */
  render(ctx, canvasDimensions, platform = null, type = null) {
    if (!this.config.enabled) return;
    
    const { width, height } = canvasDimensions;
    
    ctx.save();
    
    // Render safe area margins
    this.renderSafeMargins(ctx, width, height, platform, type);
    
    // Render text zones
    if (this.config.showTextZones) {
      this.renderTextZones(ctx, width, height, platform, type);
    }
    
    // Render grid
    if (this.config.showGrid) {
      this.renderGrid(ctx, width, height);
    }
    
    // Render platform overlays
    if (this.config.showOverlays && platform && type) {
      this.renderPlatformOverlay(ctx, width, height, platform, type);
    }
    
    ctx.restore();
  }

  /**
   * Render safe area margins
   */
  renderSafeMargins(ctx, width, height, platform, type) {
    const safeAreas = this.getSafeAreas(width, height, platform, type);
    
    // Render unsafe areas (shaded red)
    ctx.fillStyle = `rgba(255, 0, 0, ${this.config.opacity})`;
    
    // Top unsafe area
    if (safeAreas.top > 0) {
      ctx.fillRect(0, 0, width, safeAreas.top);
      if (this.config.showLabels) {
        this.renderLabel(ctx, safeAreas.top / 2, width / 2, `${safeAreas.top}px`);
      }
    }
    
    // Bottom unsafe area
    if (safeAreas.bottom > 0) {
      ctx.fillRect(0, height - safeAreas.bottom, width, safeAreas.bottom);
      if (this.config.showLabels) {
        this.renderLabel(ctx, height - safeAreas.bottom / 2, width / 2, `${safeAreas.bottom}px`);
      }
    }
    
    // Left unsafe area
    if (safeAreas.left > 0) {
      ctx.fillRect(0, 0, safeAreas.left, height);
      if (this.config.showLabels) {
        this.renderLabel(ctx, height / 2, safeAreas.left / 2, `${safeAreas.left}px`, true);
      }
    }
    
    // Right unsafe area
    if (safeAreas.right > 0) {
      ctx.fillRect(width - safeAreas.right, 0, safeAreas.right, height);
      if (this.config.showLabels) {
        this.renderLabel(ctx, height / 2, width - safeAreas.right / 2, `${safeAreas.right}px`, true);
      }
    }
    
    // Render safe area border
    const contentX = safeAreas.left;
    const contentY = safeAreas.top;
    const contentW = width - safeAreas.left - safeAreas.right;
    const contentH = height - safeAreas.top - safeAreas.bottom;
    
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(contentX, contentY, contentW, contentH);
    ctx.setLineDash([]);
    
    // Render safe area label
    if (this.config.showLabels) {
      ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Safe Area', contentX + 5, contentY + 18);
    }
  }

  /**
   * Render text-safe zones
   */
  renderTextZones(ctx, width, height, platform, type) {
    const zones = this.getTextZones(width, height, platform, type);
    
    zones.forEach((zone, index) => {
      // Fill zone
      ctx.fillStyle = 'rgba(0, 150, 255, 0.05)';
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      
      // Stroke zone
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      ctx.setLineDash([]);
      
      // Label
      if (this.config.showLabels && zone.name) {
        ctx.fillStyle = 'rgba(0, 150, 255, 0.6)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(zone.name, zone.x + 5, zone.y + 14);
      }
    });
  }

  /**
   * Render grid
   */
  renderGrid(ctx, width, height) {
    const gridSize = 50;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 0.5;
    
    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Render thirds guides
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    const thirdX = width / 3;
    const thirdY = height / 3;
    
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(thirdX * i, 0);
      ctx.lineTo(thirdX * i, height);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, thirdY * i);
      ctx.lineTo(width, thirdY * i);
      ctx.stroke();
    }
  }

  /**
   * Render platform overlay
   */
  renderPlatformOverlay(ctx, width, height, platform, type) {
    const key = `${platform}-${type}`;
    const overlay = this.overlays[key];
    
    if (!overlay) return;
    
    overlay.elements.forEach(element => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      
      if (element.type === 'rect') {
        if (element.radius) {
          this.roundRect(ctx, element.x, element.y, element.width, element.height, element.radius);
        } else {
          ctx.fillRect(element.x, element.y, element.width, element.height);
          ctx.strokeRect(element.x, element.y, element.width, element.height);
        }
      } else if (element.type === 'circle') {
        ctx.beginPath();
        ctx.arc(element.x, element.y, element.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      
      // Label
      if (this.config.showLabels && element.label) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          element.label,
          element.x + element.width / 2,
          element.y + element.height / 2 + 3
        );
      }
    });
  }

  /**
   * Draw rounded rectangle path
   */
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  /**
   * Render a centered label
   */
  renderLabel(ctx, y, x, text, vertical = false) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (vertical) {
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(text, 0, 0);
    } else {
      ctx.fillText(text, x, y);
    }
    
    ctx.restore();
  }

  /**
   * Get safe areas for platform
   */
  getSafeAreas(width, height, platform, type) {
    const defaults = { top: 0, bottom: 0, left: 0, right: 0 };
    
    if (!platform || !type) return defaults;
    
    const safeAreas = {
      'instagram-story': { top: 130, bottom: 110, left: 0, right: 0 },
      'instagram-reel': { top: 160, bottom: 220, left: 40, right: 40 },
      'facebook-story': { top: 120, bottom: 100, left: 20, right: 20 },
      'youtube-shorts': { top: 120, bottom: 180, left: 20, right: 20 },
      'tiktok-video': { top: 180, bottom: 230, left: 50, right: 60 }
    };
    
    return safeAreas[`${platform}-${type}`] || defaults;
  }

  /**
   * Get text zones for platform
   */
  getTextZones(width, height, platform, type) {
    if (!platform || !type) {
      return [
        { name: 'Full Area', x: 0, y: 0, width, height }
      ];
    }
    
    const zones = {
      'instagram-story': [
        { name: 'Top Text', x: 40, y: 160, width: 1000, height: 500 },
        { name: 'Bottom Text', x: 40, y: 1320, width: 1000, height: 400 }
      ],
      'instagram-reel': [
        { name: 'Title', x: 60, y: 180, width: 960, height: 300 },
        { name: 'Caption', x: 60, y: 1300, width: 880, height: 500 }
      ],
      'tiktok-video': [
        { name: 'Top', x: 70, y: 200, width: 940, height: 400 },
        { name: 'Bottom', x: 70, y: 1200, width: 880, height: 500 }
      ]
    };
    
    return zones[`${platform}-${type}`] || [
      { name: 'Content Area', x: 20, y: 20, width: width - 40, height: height - 40 }
    ];
  }

  /**
   * Enable/disable safe area rendering
   */
  setEnabled(enabled) {
    this.config.enabled = enabled;
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    Object.assign(this.config, config);
  }
}

export { SafeAreaRenderer };