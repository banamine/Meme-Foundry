/**
 * Meme Foundry - Snapping System
 * Provides snap-to-grid and snap-to-object functionality
 */

import { Logger } from '@/utils/logger.js';

class SnappingSystem {
  constructor() {
    this.logger = new Logger('SnappingSystem');
    this.enabled = true;
    this.gridSize = 10;
    this.snapThreshold = 5;
    this.guides = [];
  }

  initialize() {
    this.logger.info('Snapping system initialized');
  }

  snapToGrid(value) {
    if (!this.enabled) return value;
    return Math.round(value / this.gridSize) * this.gridSize;
  }

  snapPosition(x, y) {
    return {
      x: this.snapToGrid(x),
      y: this.snapToGrid(y)
    };
  }

  snapToGuides(x, y, width, height) {
    if (!this.enabled) return { x, y };

    let snappedX = x;
    let snappedY = y;

    const points = [
      { value: x, type: 'left' },
      { value: x + width / 2, type: 'center-x' },
      { value: x + width, type: 'right' },
      { value: y, type: 'top' },
      { value: y + height / 2, type: 'center-y' },
      { value: y + height, type: 'bottom' }
    ];

    for (const point of points) {
      for (const guide of this.guides) {
        const distance = Math.abs(point.value - guide.position);
        
        if (distance < this.snapThreshold) {
          if (point.type.includes('x')) {
            snappedX = guide.position - (point.value - x);
          } else {
            snappedY = guide.position - (point.value - y);
          }
        }
      }
    }

    return { x: snappedX, y: snappedY };
  }

  addGuide(position, orientation = 'horizontal') {
    this.guides.push({ position, orientation });
  }

  clearGuides() {
    this.guides = [];
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  setGridSize(size) {
    this.gridSize = Math.max(1, size);
  }

  destroy() {
    this.guides = [];
  }
}

export { SnappingSystem };