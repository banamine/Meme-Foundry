/**
 * Meme Foundry - Selection Manager
 * Manages layer selection, multi-select, and selection operations
 */

import { Logger } from '@/utils/logger.js';
import { EventEmitter } from '@/utils/event-emitter.js';

class SelectionManager extends EventEmitter {
  constructor(state) {
    super();
    this.logger = new Logger('SelectionManager');
    this.state = state;
    this.selectedLayers = new Set();
    this.lastSelected = null;
    this.selectionBox = null;
    this.isSelecting = false;
  }

  initialize() {
    this.logger.info('Selection manager initialized');
  }

  selectLayer(layerId, additive = false) {
    if (!additive) {
      this.clearSelection();
    }

    this.selectedLayers.add(layerId);
    this.lastSelected = layerId;

    this.emit('selection:changed', {
      layers: Array.from(this.selectedLayers),
      lastSelected: layerId
    });
  }

  deselectLayer(layerId) {
    this.selectedLayers.delete(layerId);
    
    if (this.lastSelected === layerId) {
      this.lastSelected = this.selectedLayers.size > 0 
        ? Array.from(this.selectedLayers)[this.selectedLayers.size - 1] 
        : null;
    }

    this.emit('selection:changed', {
      layers: Array.from(this.selectedLayers),
      lastSelected: this.lastSelected
    });
  }

  toggleSelection(layerId) {
    if (this.selectedLayers.has(layerId)) {
      this.deselectLayer(layerId);
    } else {
      this.selectLayer(layerId, true);
    }
  }

  selectAll(layers) {
    this.clearSelection();
    layers.forEach(layer => this.selectedLayers.add(layer.id));
    this.lastSelected = layers.length > 0 ? layers[layers.length - 1].id : null;

    this.emit('selection:changed', {
      layers: Array.from(this.selectedLayers),
      lastSelected: this.lastSelected
    });
  }

  clearSelection() {
    this.selectedLayers.clear();
    this.lastSelected = null;

    this.emit('selection:changed', {
      layers: [],
      lastSelected: null
    });
  }

  getSelectedLayers() {
    return Array.from(this.selectedLayers);
  }

  isSelected(layerId) {
    return this.selectedLayers.has(layerId);
  }

  getSelectionCount() {
    return this.selectedLayers.size;
  }

  hasSelection() {
    return this.selectedLayers.size > 0;
  }

  deleteSelected() {
    const layers = this.getSelectedLayers();
    this.clearSelection();
    return layers;
  }

  startBoxSelection(x, y) {
    this.isSelecting = true;
    this.selectionBox = { startX: x, startY: y, endX: x, endY: y };
  }

  updateBoxSelection(x, y) {
    if (!this.isSelecting) return;
    this.selectionBox.endX = x;
    this.selectionBox.endY = y;
  }

  endBoxSelection(layers) {
    if (!this.isSelecting) return;

    const box = this.getSelectionBounds();
    
    const selected = layers.filter(layer => {
      const t = layer.transform;
      return !(t.x + t.width < box.x || t.x > box.x + box.width ||
               t.y + t.height < box.y || t.y > box.y + box.height);
    });

    this.clearSelection();
    selected.forEach(layer => this.selectedLayers.add(layer.id));

    this.isSelecting = false;
    this.selectionBox = null;

    this.emit('selection:changed', {
      layers: Array.from(this.selectedLayers),
      lastSelected: this.lastSelected
    });
  }

  getSelectionBounds() {
    if (!this.selectionBox) return null;

    return {
      x: Math.min(this.selectionBox.startX, this.selectionBox.endX),
      y: Math.min(this.selectionBox.startY, this.selectionBox.endY),
      width: Math.abs(this.selectionBox.endX - this.selectionBox.startX),
      height: Math.abs(this.selectionBox.endY - this.selectionBox.startY)
    };
  }

  destroy() {
    this.clearSelection();
    this.removeAllListeners();
  }
}

export { SelectionManager };