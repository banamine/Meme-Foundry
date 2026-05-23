/**
 * Meme Foundry - Resize System
 * Handles element resize operations
 */

import { Logger } from '@/utils/logger.js';
import { EventEmitter } from '@/utils/event-emitter.js';

class ResizeSystem extends EventEmitter {
  constructor() {
    super();
    this.logger = new Logger('ResizeSystem');
    this.isResizing = false;
    this.resizeTarget = null;
    this.resizeHandle = null;
    this.startBounds = null;
    this.minSize = 10;
  }

  initialize() {
    this.logger.info('Resize system initialized');
  }

  startResize(target, handle, event) {
    this.isResizing = true;
    this.resizeTarget = target;
    this.resizeHandle = handle;
    this.startBounds = { ...target.transform };
    
    this.emit('resize:start', { target, handle, bounds: this.startBounds });
  }

  updateResize(deltaX, deltaY) {
    if (!this.isResizing || !this.resizeTarget) return;

    const transform = this.resizeTarget.transform;
    
    switch (this.resizeHandle) {
      case 'top-left':
        transform.x += deltaX;
        transform.y += deltaY;
        transform.width -= deltaX;
        transform.height -= deltaY;
        break;
      case 'top':
        transform.y += deltaY;
        transform.height -= deltaY;
        break;
      case 'top-right':
        transform.y += deltaY;
        transform.width += deltaX;
        transform.height -= deltaY;
        break;
      case 'right':
        transform.width += deltaX;
        break;
      case 'bottom-right':
        transform.width += deltaX;
        transform.height += deltaY;
        break;
      case 'bottom':
        transform.height += deltaY;
        break;
      case 'bottom-left':
        transform.x += deltaX;
        transform.width -= deltaX;
        transform.height += deltaY;
        break;
      case 'left':
        transform.x += deltaX;
        transform.width -= deltaX;
        break;
    }

    // Enforce minimum size
    if (transform.width < this.minSize) {
      transform.width = this.minSize;
      if (this.resizeHandle.includes('left')) {
        transform.x = this.startBounds.x + this.startBounds.width - this.minSize;
      }
    }
    
    if (transform.height < this.minSize) {
      transform.height = this.minSize;
      if (this.resizeHandle.includes('top')) {
        transform.y = this.startBounds.y + this.startBounds.height - this.minSize;
      }
    }

    this.emit('resize:update', { target: this.resizeTarget, transform });
  }

  endResize() {
    if (!this.isResizing) return;

    this.emit('resize:end', {
      target: this.resizeTarget,
      originalBounds: this.startBounds,
      finalBounds: this.resizeTarget.transform
    });

    this.isResizing = false;
    this.resizeTarget = null;
    this.resizeHandle = null;
    this.startBounds = null;
  }

  destroy() {
    this.removeAllListeners();
  }
}

export { ResizeSystem };