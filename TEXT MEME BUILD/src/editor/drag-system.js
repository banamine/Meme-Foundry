/**
 * Meme Foundry - Drag System
 * Handles drag and drop for layers and elements
 */

import { Logger } from '@/utils/logger.js';

class DragSystem {
  constructor() {
    this.logger = new Logger('DragSystem');
    
    // Drag state
    this.isDragging = false;
    this.dragTarget = null;
    this.dragType = null; // 'layer', 'resize-handle', 'media'
    this.startPos = { x: 0, y: 0 };
    this.currentPos = { x: 0, y: 0 };
    this.offset = { x: 0, y: 0 };
    this.originalTransform = null;
    
    // Config
    this.threshold = 3; // pixels before drag starts
    this.enabled = true;
    
    // Canvas reference
    this.canvas = null;
    
    // Bound methods
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
  }

  /**
   * Initialize drag system
   */
  initialize(canvas) {
    this.canvas = canvas;
    
    if (canvas) {
      // Mouse events
      canvas.addEventListener('mousedown', this.onMouseDown);
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
      
      // Touch events
      canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
      document.addEventListener('touchmove', this.onTouchMove, { passive: false });
      document.addEventListener('touchend', this.onTouchEnd);
      
      // Prevent default drag behavior
      canvas.addEventListener('dragstart', (e) => e.preventDefault());
    }
  }

  /**
   * Handle mouse down
   */
  onMouseDown(event) {
    if (!this.enabled) return;
    if (event.button !== 0) return; // Only left click
    
    const target = this.findDragTarget(event);
    if (!target) return;
    
    this.startDrag(event, target, 'mouse');
  }

  /**
   * Handle mouse move
   */
  onMouseMove(event) {
    if (!this.isDragging) return;
    
    const pos = { x: event.clientX, y: event.clientY };
    this.updateDrag(pos);
  }

  /**
   * Handle mouse up
   */
  onMouseUp(event) {
    if (!this.isDragging) return;
    
    this.endDrag();
  }

  /**
   * Handle touch start
   */
  onTouchStart(event) {
    if (!this.enabled) return;
    if (event.touches.length !== 1) return;
    
    event.preventDefault();
    
    const touch = event.touches[0];
    const target = this.findDragTarget(touch);
    if (!target) return;
    
    this.startDrag(touch, target, 'touch');
  }

  /**
   * Handle touch move
   */
  onTouchMove(event) {
    if (!this.isDragging) return;
    
    event.preventDefault();
    
    const touch = event.touches[0];
    const pos = { x: touch.clientX, y: touch.clientY };
    this.updateDrag(pos);
  }

  /**
   * Handle touch end
   */
  onTouchEnd(event) {
    if (!this.isDragging) return;
    
    this.endDrag();
  }

  /**
   * Find drag target at position
   */
  findDragTarget(event) {
    // Check if click is on a layer
    const layers = this.getLayers();
    
    // Hit test layers in reverse order (top to bottom)
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible || layer.locked) continue;
      
      if (this.hitTestLayer(layer, event)) {
        return {
          type: 'layer',
          layer: layer,
          index: i
        };
      }
    }
    
    // Check resize handles
    const handle = this.hitTestResizeHandle(event);
    if (handle) {
      return {
        type: 'resize-handle',
        handle: handle
      };
    }
    
    return null;
  }

  /**
   * Hit test a layer
   */
  hitTestLayer(layer, event) {
    const transform = layer.transform;
    if (!transform) return false;
    
    // Convert event position to canvas coordinates
    const canvasPos = this.getCanvasPosition(event);
    
    // Simple bounding box test
    return (
      canvasPos.x >= transform.x &&
      canvasPos.x <= transform.x + transform.width &&
      canvasPos.y >= transform.y &&
      canvasPos.y <= transform.y + transform.height
    );
  }

  /**
   * Hit test resize handles
   */
  hitTestResizeHandle(event) {
    const selectedLayers = this.getSelectedLayers();
    if (selectedLayers.length === 0) return null;
    
    // Check handles of selected layers
    const handleSize = 8;
    const handles = this.getResizeHandles(selectedLayers[0]);
    
    const canvasPos = this.getCanvasPosition(event);
    
    for (const handle of handles) {
      if (
        canvasPos.x >= handle.x - handleSize &&
        canvasPos.x <= handle.x + handleSize &&
        canvasPos.y >= handle.y - handleSize &&
        canvasPos.y <= handle.y + handleSize
      ) {
        return handle;
      }
    }
    
    return null;
  }

  /**
   * Get resize handles for a layer
   */
  getResizeHandles(layer) {
    const t = layer.transform;
    if (!t) return [];
    
    return [
      { type: 'top-left', x: t.x, y: t.y, cursor: 'nw-resize' },
      { type: 'top', x: t.x + t.width / 2, y: t.y, cursor: 'n-resize' },
      { type: 'top-right', x: t.x + t.width, y: t.y, cursor: 'ne-resize' },
      { type: 'right', x: t.x + t.width, y: t.y + t.height / 2, cursor: 'e-resize' },
      { type: 'bottom-right', x: t.x + t.width, y: t.y + t.height, cursor: 'se-resize' },
      { type: 'bottom', x: t.x + t.width / 2, y: t.y + t.height, cursor: 's-resize' },
      { type: 'bottom-left', x: t.x, y: t.y + t.height, cursor: 'sw-resize' },
      { type: 'left', x: t.x, y: t.y + t.height / 2, cursor: 'w-resize' }
    ];
  }

  /**
   * Start dragging
   */
  startDrag(event, target, inputType) {
    this.isDragging = true;
    this.dragTarget = target;
    this.dragType = target.type;
    this.startPos = { x: event.clientX, y: event.clientY };
    this.currentPos = { ...this.startPos };
    
    if (target.type === 'layer') {
      this.originalTransform = { ...target.layer.transform };
    }
    
    // Set cursor
    document.body.style.cursor = target.handle?.cursor || 'move';
    document.body.style.userSelect = 'none';
    
    this.emit('drag:start', {
      target,
      position: this.startPos,
      inputType
    });
  }

  /**
   * Update drag position
   */
  updateDrag(pos) {
    if (!this.isDragging || !this.dragTarget) return;
    
    // Check threshold
    const dx = pos.x - this.startPos.x;
    const dy = pos.y - this.startPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < this.threshold) return;
    
    this.currentPos = pos;
    
    if (this.dragTarget.type === 'layer') {
      this.updateLayerPosition();
    } else if (this.dragTarget.type === 'resize-handle') {
      this.updateLayerResize();
    }
    
    this.emit('drag:move', {
      target: this.dragTarget,
      position: this.currentPos,
      delta: { x: dx, y: dy }
    });
  }

  /**
   * Update layer position during drag
   */
  updateLayerPosition() {
    const layer = this.dragTarget.layer;
    const original = this.originalTransform;
    
    if (!layer || !original) return;
    
    const dx = this.currentPos.x - this.startPos.x;
    const dy = this.currentPos.y - this.startPos.y;
    
    layer.transform.x = original.x + dx;
    layer.transform.y = original.y + dy;
    
    // Apply snapping if enabled
    if (this.snappingEnabled) {
      const snapped = this.applySnapping(layer);
      if (snapped) {
        layer.transform.x = snapped.x;
        layer.transform.y = snapped.y;
      }
    }
  }

  /**
   * Update layer resize during drag
   */
  updateLayerResize() {
    const layer = this.dragTarget.layer;
    const handle = this.dragTarget.handle;
    const original = this.originalTransform;
    
    if (!layer || !handle || !original) return;
    
    const dx = this.currentPos.x - this.startPos.x;
    const dy = this.currentPos.y - this.startPos.y;
    
    switch (handle.type) {
      case 'top-left':
        layer.transform.x = original.x + dx;
        layer.transform.y = original.y + dy;
        layer.transform.width = original.width - dx;
        layer.transform.height = original.height - dy;
        break;
        
      case 'top':
        layer.transform.y = original.y + dy;
        layer.transform.height = original.height - dy;
        break;
        
      case 'top-right':
        layer.transform.y = original.y + dy;
        layer.transform.width = original.width + dx;
        layer.transform.height = original.height - dy;
        break;
        
      case 'right':
        layer.transform.width = original.width + dx;
        break;
        
      case 'bottom-right':
        layer.transform.width = original.width + dx;
        layer.transform.height = original.height + dy;
        break;
        
      case 'bottom':
        layer.transform.height = original.height + dy;
        break;
        
      case 'bottom-left':
        layer.transform.x = original.x + dx;
        layer.transform.width = original.width - dx;
        layer.transform.height = original.height + dy;
        break;
        
      case 'left':
        layer.transform.x = original.x + dx;
        layer.transform.width = original.width - dx;
        break;
    }
    
    // Enforce minimum size
    layer.transform.width = Math.max(10, layer.transform.width);
    layer.transform.height = Math.max(10, layer.transform.height);
  }

  /**
   * End drag operation
   */
  endDrag() {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    
    // Reset cursor
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // Emit drag end event
    this.emit('drag:end', {
      target: this.dragTarget,
      originalTransform: this.originalTransform,
      finalTransform: this.dragTarget?.layer?.transform
    });
    
    this.dragTarget = null;
    this.dragType = null;
    this.originalTransform = null;
  }

  /**
   * Get canvas position from event
   */
  getCanvasPosition(event) {
    if (!this.canvas) return { x: 0, y: 0 };
    
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  /**
   * Get all layers
   */
  getLayers() {
    // This would be injected or accessed via state
    return window.__MEME_FOUNDRY__?.state?.getState('project.sceneData.layers') || [];
  }

  /**
   * Get selected layers
   */
  getSelectedLayers() {
    // This would be injected or accessed via state
    return window.__MEME_FOUNDRY__?.state?.getState('editor.selectedLayers') || [];
  }

  /**
   * Apply snapping
   */
  applySnapping(layer) {
    // This would integrate with snapping system
    return null;
  }

  /**
   * Enable/disable dragging
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.onMouseDown);
      this.canvas.removeEventListener('touchstart', this.onTouchStart);
    }
    
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onTouchEnd);
    
    this.canvas = null;
  }
}

// Add EventEmitter functionality
import { EventEmitter } from '@/utils/event-emitter.js';
Object.assign(DragSystem.prototype, EventEmitter.prototype);

export { DragSystem };