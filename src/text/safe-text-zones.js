/**
 * Meme Foundry - Safe Text Zones
 * Manages text-safe areas for social media platforms
 */

import { Logger } from '@/utils/logger.js';

class SafeTextZones {
  constructor() {
    this.logger = new Logger('SafeTextZones');
    
    // Platform-specific text zone definitions
    this.zones = {
      instagram: {
        post: [
          { name: 'Full Area', x: 0, y: 0, width: 1080, height: 1080, priority: 'normal' }
        ],
        story: [
          { name: 'Top Text', x: 40, y: 160, width: 1000, height: 400, priority: 'high' },
          { name: 'Bottom Text', x: 40, y: 1400, width: 1000, height: 400, priority: 'high' },
          { name: 'Center', x: 100, y: 500, width: 880, height: 800, priority: 'normal' }
        ],
        reel: [
          { name: 'Title Area', x: 60, y: 180, width: 960, height: 300, priority: 'high' },
          { name: 'Caption Area', x: 60, y: 1300, width: 880, height: 500, priority: 'high' },
          { name: 'Safe Center', x: 80, y: 400, width: 920, height: 800, priority: 'normal' }
        ]
      },
      
      facebook: {
        post: [
          { name: 'Full Area', x: 0, y: 0, width: 1200, height: 630, priority: 'normal' }
        ],
        story: [
          { name: 'Top Text', x: 40, y: 150, width: 1000, height: 400, priority: 'high' },
          { name: 'Bottom Text', x: 40, y: 1350, width: 1000, height: 400, priority: 'high' }
        ],
        cover: [
          { name: 'Safe Area', x: 170, y: 0, width: 650, height: 312, priority: 'high' }
        ]
      },
      
      twitter: {
        post: [
          { name: 'Full Area', x: 0, y: 0, width: 1200, height: 675, priority: 'normal' }
        ],
        header: [
          { name: 'Safe Area', x: 80, y: 0, width: 1340, height: 500, priority: 'high' }
        ]
      },
      
      youtube: {
        thumbnail: [
          { name: 'Title Area', x: 40, y: 20, width: 1200, height: 600, priority: 'high' },
          { name: 'Bottom Safe', x: 40, y: 560, width: 1150, height: 140, priority: 'normal' }
        ],
        shorts: [
          { name: 'Top Text', x: 40, y: 150, width: 1000, height: 350, priority: 'high' },
          { name: 'Bottom Text', x: 40, y: 1300, width: 1000, height: 450, priority: 'high' }
        ]
      },
      
      tiktok: {
        video: [
          { name: 'Top Area', x: 70, y: 200, width: 940, height: 350, priority: 'high' },
          { name: 'Bottom Area', x: 70, y: 1200, width: 880, height: 500, priority: 'high' },
          { name: 'Safe Center', x: 80, y: 500, width: 920, height: 600, priority: 'normal' }
        ]
      }
    };
  }

  /**
   * Get text zones for platform and type
   */
  getZones(platform, type = 'post') {
    const platformZones = this.zones[platform];
    if (!platformZones) {
      return this.getDefaultZones(1080, 1080);
    }
    
    return platformZones[type] || platformZones.post || [];
  }

  /**
   * Get default safe zones
   */
  getDefaultZones(width = 1080, height = 1080) {
    const margin = Math.round(Math.min(width, height) * 0.05);
    
    return [
      {
        name: 'Full Area',
        x: 0,
        y: 0,
        width,
        height,
        priority: 'normal'
      },
      {
        name: 'Safe Margin',
        x: margin,
        y: margin,
        width: width - margin * 2,
        height: height - margin * 2,
        priority: 'high'
      }
    ];
  }

  /**
   * Get high priority zones only
   */
  getHighPriorityZones(platform, type = 'post') {
    const zones = this.getZones(platform, type);
    return zones.filter(z => z.priority === 'high');
  }

  /**
   * Get primary text zone (largest high-priority)
   */
  getPrimaryZone(platform, type = 'post') {
    const zones = this.getHighPriorityZones(platform, type);
    
    if (zones.length === 0) {
      const allZones = this.getZones(platform, type);
      return allZones.length > 0 ? allZones[0] : this.getDefaultZones()[0];
    }
    
    return zones.reduce((largest, zone) => {
      const area = zone.width * zone.height;
      const largestArea = largest.width * largest.height;
      return area > largestArea ? zone : largest;
    });
  }

  /**
   * Check if position is within any safe zone
   */
  isPositionSafe(x, y, platform, type = 'post') {
    const zones = this.getZones(platform, type);
    
    return zones.some(zone => 
      x >= zone.x && 
      x <= zone.x + zone.width && 
      y >= zone.y && 
      y <= zone.y + zone.height
    );
  }

  /**
   * Check if element fits within safe zones
   */
  isElementSafe(element, platform, type = 'post') {
    const zones = this.getZones(platform, type);
    const transform = element.transform || element;
    
    // Check all corners
    const corners = [
      { x: transform.x, y: transform.y },
      { x: transform.x + transform.width, y: transform.y },
      { x: transform.x, y: transform.y + transform.height },
      { x: transform.x + transform.width, y: transform.y + transform.height }
    ];
    
    return corners.some(corner =>
      zones.some(zone =>
        corner.x >= zone.x &&
        corner.x <= zone.x + zone.width &&
        corner.y >= zone.y &&
        corner.y <= zone.y + zone.height
      )
    );
  }

  /**
   * Find best zone for element
   */
  findBestZone(element, platform, type = 'post') {
    const zones = this.getZones(platform, type);
    const transform = element.transform || element;
    const elementArea = transform.width * transform.height;
    
    let bestZone = null;
    let bestScore = -Infinity;
    
    for (const zone of zones) {
      // Check if element fits in zone
      if (transform.width <= zone.width && transform.height <= zone.height) {
        const zoneArea = zone.width * zone.height;
        
        // Score based on priority and how well element fits
        let score = zoneArea;
        
        if (zone.priority === 'high') score *= 2;
        
        // Prefer zones where element takes up less than 80% of space
        const fillRatio = elementArea / zoneArea;
        if (fillRatio < 0.8) score *= 1.5;
        
        if (score > bestScore) {
          bestScore = score;
          bestZone = zone;
        }
      }
    }
    
    return bestZone;
  }

  /**
   * Snap element to nearest safe zone
   */
  snapToSafeZone(element, platform, type = 'post') {
    const bestZone = this.findBestZone(element, platform, type);
    
    if (!bestZone) return element;
    
    const transform = element.transform || element;
    
    // Center element in zone
    transform.x = bestZone.x + (bestZone.width - transform.width) / 2;
    transform.y = bestZone.y + (bestZone.height - transform.height) / 2;
    
    // Clamp to zone bounds
    transform.x = Math.max(bestZone.x, transform.x);
    transform.y = Math.max(bestZone.y, transform.y);
    
    if (transform.x + transform.width > bestZone.x + bestZone.width) {
      transform.x = bestZone.x + bestZone.width - transform.width;
    }
    
    if (transform.y + transform.height > bestZone.y + bestZone.height) {
      transform.y = bestZone.y + bestZone.height - transform.height;
    }
    
    return element;
  }

  /**
   * Get suggested text position
   */
  getSuggestedPosition(platform, type = 'post', position = 'top') {
    const primaryZone = this.getPrimaryZone(platform, type);
    
    const positions = {
      'top': {
        x: primaryZone.x,
        y: primaryZone.y + 20,
        width: primaryZone.width,
        height: primaryZone.height * 0.3
      },
      'middle': {
        x: primaryZone.x,
        y: primaryZone.y + primaryZone.height * 0.35,
        width: primaryZone.width,
        height: primaryZone.height * 0.3
      },
      'bottom': {
        x: primaryZone.x,
        y: primaryZone.y + primaryZone.height * 0.65,
        width: primaryZone.width,
        height: primaryZone.height * 0.3
      }
    };
    
    return positions[position] || positions.top;
  }

  /**
   * Render safe zones on canvas
   */
  renderZones(ctx, platform, type = 'post', canvasWidth = 1080, canvasHeight = 1080) {
    const zones = this.getZones(platform, type);
    
    ctx.save();
    
    zones.forEach(zone => {
      // Color based on priority
      if (zone.priority === 'high') {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.08)';
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
        ctx.lineWidth = 2;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.05)';
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.lineWidth = 1;
      }
      
      // Fill zone
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      
      // Stroke zone
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      ctx.setLineDash([]);
      
      // Label
      ctx.fillStyle = zone.priority === 'high' ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 255, 0, 0.5)';
      ctx.font = '11px sans-serif';
      ctx.fillText(zone.name, zone.x + 5, zone.y + 15);
    });
    
    ctx.restore();
  }

  /**
   * Add custom zone
   */
  addCustomZone(platform, type, zone) {
    if (!this.zones[platform]) {
      this.zones[platform] = {};
    }
    
    if (!this.zones[platform][type]) {
      this.zones[platform][type] = [];
    }
    
    this.zones[platform][type].push(zone);
  }

  /**
   * Remove custom zone
   */
  removeCustomZone(platform, type, zoneName) {
    if (!this.zones[platform]?.[type]) return false;
    
    const index = this.zones[platform][type].findIndex(z => z.name === zoneName);
    if (index === -1) return false;
    
    this.zones[platform][type].splice(index, 1);
    return true;
  }

  /**
   * Get all zones for all platforms
   */
  getAllZones() {
    const allZones = {};
    
    for (const [platform, types] of Object.entries(this.zones)) {
      allZones[platform] = {};
      for (const [type, zones] of Object.entries(types)) {
        allZones[platform][type] = [...zones];
      }
    }
    
    return allZones;
  }

  /**
   * Validate zone definition
   */
  validateZone(zone) {
    const errors = [];
    
    if (!zone.name) errors.push('Zone name is required');
    if (zone.x === undefined || zone.x < 0) errors.push('Zone x must be >= 0');
    if (zone.y === undefined || zone.y < 0) errors.push('Zone y must be >= 0');
    if (!zone.width || zone.width <= 0) errors.push('Zone width must be > 0');
    if (!zone.height || zone.height <= 0) errors.push('Zone height must be > 0');
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export { SafeTextZones };