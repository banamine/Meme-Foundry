/**
 * Meme Foundry - Scene Manager
 * Manages the scene graph, layer operations, and scene state
 */

import { Logger } from '@/utils/logger.js';
import { EventEmitter } from '@/utils/event-emitter.js';
import { getDefaultLayer, SceneSchema } from './scene-schema.js';
import { SceneValidator } from './scene-validator.js';
import { Serialization } from './serialization.js';
import { LayerFactory } from './layer-factory.js';

class SceneManager extends EventEmitter {
  constructor() {
    super();
    this.logger = new Logger('SceneManager');
    this.validator = new SceneValidator();
    this.serializer = new Serialization();
    this.layerFactory = new LayerFactory();
    
    this.scene = null;
    this.layerOrder = [];
    this.selectedLayers = new Set();
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 50;
  }

  /**
   * Initialize scene manager
   */
  async initialize(canvasWidth = 1080, canvasHeight = 1080, platform = 'instagram') {
    this.logger.info('Initializing scene manager');
    
    this.scene = this.createEmptyScene(canvasWidth, canvasHeight, platform);
    this.layerOrder = [];
    this.saveHistoryState();
    
    this.emit('scene:initialized', this.scene);
    return this.scene;
  }

  /**
   * Create empty scene
   */
  createEmptyScene(width, height, platform = 'instagram', backgroundColor = '#FFFFFF') {
    return {
      id: crypto.randomUUID(),
      version: SceneSchema.version,
      name: 'Untitled Scene',
      canvas: {
        width,
        height,
        backgroundColor,
        pixelRatio: window.devicePixelRatio || 1
      },
      layers: [],
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        platform,
        version: 1
      }
    };
  }

  /**
   * Add layer to scene
   */
  addLayer(type, properties = {}, position = null) {
    const layer = this.layerFactory.create(type, properties);
    
    if (position !== null && position >= 0 && position <= this.scene.layers.length) {
      this.scene.layers.splice(position, 0, layer);
      this.layerOrder.splice(position, 0, layer.id);
    } else {
      this.scene.layers.push(layer);
      this.layerOrder.push(layer.id);
    }
    
    this.scene.metadata.modified = new Date().toISOString();
    this.scene.metadata.version++;
    
    this.saveHistoryState();
    this.emit('layer:added', { layer, index: this.scene.layers.indexOf(layer) });
    
    return layer;
  }

  /**
   * Remove layer
   */
  removeLayer(layerId) {
    const index = this.findLayerIndex(layerId);
    if (index === -1) return false;
    
    const layer = this.scene.layers[index];
    this.scene.layers.splice(index, 1);
    this.layerOrder = this.layerOrder.filter(id => id !== layerId);
    
    // Remove from selection
    this.selectedLayers.delete(layerId);
    
    this.scene.metadata.modified = new Date().toISOString();
    this.scene.metadata.version++;
    
    this.saveHistoryState();
    this.emit('layer:removed', { layer, index });
    
    return true;
  }

  /**
   * Duplicate layer
   */
  duplicateLayer(layerId) {
    const original = this.getLayer(layerId);
    if (!original) return null;
    
    const duplicate = JSON.parse(JSON.stringify(original));
    duplicate.id = crypto.randomUUID();
    duplicate.name = `${original.name} Copy`;
    
    const index = this.findLayerIndex(layerId);
    this.scene.layers.splice(index + 1, 0, duplicate);
    this.layerOrder.splice(index + 1, 0, duplicate.id);
    
    this.scene.metadata.modified = new Date().toISOString();
    this.scene.metadata.version++;
    
    this.saveHistoryState();
    this.emit('layer:duplicated', { original: layerId, duplicate });
    
    return duplicate;
  }

  /**
   * Move layer to new position
   */
  moveLayer(layerId, newIndex) {
    const currentIndex = this.findLayerIndex(layerId);
    if (currentIndex === -1 || newIndex < 0 || newIndex >= this.scene.layers.length) {
      return false;
    }
    
    // Remove from current position
    const layer = this.scene.layers.splice(currentIndex, 1)[0];
    this.layerOrder.splice(currentIndex, 1);
    
    // Insert at new position
    this.scene.layers.splice(newIndex, 0, layer);
    this.layerOrder.splice(newIndex, 0, layerId);
    
    this.scene.metadata.modified = new Date().toISOString();
    
    this.saveHistoryState();
    this.emit('layer:moved', { layerId, from: currentIndex, to: newIndex });
    
    return true;
  }

  /**
   * Group selected layers
   */
  groupLayers(layerIds) {
    if (layerIds.length < 2) return null;
    
    const layers = layerIds.map(id => this.getLayer(id)).filter(Boolean);
    if (layers.length < 2) return null;
    
    // Create group
    const group = this.layerFactory.create('group', {
      name: `Group ${this.getGroupCount() + 1}`,
      group: {
        children: layers,
        collapsed: false
      }
    });
    
    // Calculate group bounds
    const bounds = this.calculateLayersBounds(layers);
    group.transform = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
      flipH: false,
      flipV: false
    };
    
    // Remove individual layers and add group
    const firstIndex = Math.min(...layerIds.map(id => this.findLayerIndex(id)));
    layerIds.forEach(id => this.removeLayer(id));
    
    this.scene.layers.splice(firstIndex, 0, group);
    this.layerOrder.splice(firstIndex, 0, group.id);
    
    this.scene.metadata.modified = new Date().toISOString();
    this.scene.metadata.version++;
    
    this.saveHistoryState();
    this.emit('layers:grouped', { group, children: layerIds });
    
    return group;
  }

  /**
   * Ungroup layer
   */
  ungroupLayer(groupId) {
    const group = this.getLayer(groupId);
    if (!group || group.type !== 'group') return false;
    
    const groupIndex = this.findLayerIndex(groupId);
    const children = group.group.children || [];
    
    // Remove group
    this.scene.layers.splice(groupIndex, 1);
    this.layerOrder = this.layerOrder.filter(id => id !== groupId);
    
    // Add children at group position
    children.forEach((child, i) => {
      this.scene.layers.splice(groupIndex + i, 0, child);
      this.layerOrder.splice(groupIndex + i, 0, child.id);
    });
    
    this.scene.metadata.modified = new Date().toISOString();
    this.scene.metadata.version++;
    
    this.saveHistoryState();
    this.emit('layer:ungrouped', { groupId, children: children.map(c => c.id) });
    
    return children;
  }

  /**
   * Update layer properties
   */
  updateLayer(layerId, properties) {
    const layer = this.getLayer(layerId);
    if (!layer) return false;
    
    const oldProperties = { ...layer };
    
    // Deep merge properties
    this.deepMerge(layer, properties);
    
    this.scene.metadata.modified = new Date().toISOString();
    
    this.emit('layer:updated', { 
      layerId, 
      changes: properties,
      oldProperties 
    });
    
    return true;
  }

  /**
   * Update layer transform
   */
  updateLayerTransform(layerId, transform) {
    const layer = this.getLayer(layerId);
    if (!layer) return false;
    
    Object.assign(layer.transform, transform);
    
    this.scene.metadata.modified = new Date().toISOString();
    this.emit('layer:transformed', { layerId, transform });
    
    return true;
  }

  /**
   * Set layer visibility
   */
  setLayerVisibility(layerId, visible) {
    return this.updateLayer(layerId, { visible });
  }

  /**
   * Set layer lock state
   */
  setLayerLocked(layerId, locked) {
    return this.updateLayer(layerId, { locked });
  }

  /**
   * Set layer opacity
   */
  setLayerOpacity(layerId, opacity) {
    if (opacity < 0 || opacity > 1) return false;
    return this.updateLayer(layerId, { opacity });
  }

  /**
   * Set layer blend mode
   */
  setLayerBlendMode(layerId, blendMode) {
    return this.updateLayer(layerId, { blendMode });
  }

  /**
   * Select layers
   */
  selectLayers(layerIds, additive = false) {
    if (!additive) {
      this.selectedLayers.clear();
    }
    
    const ids = Array.isArray(layerIds) ? layerIds : [layerIds];
    ids.forEach(id => {
      if (this.getLayer(id)) {
        this.selectedLayers.add(id);
      }
    });
    
    this.emit('selection:changed', Array.from(this.selectedLayers));
  }

  /**
   * Deselect layers
   */
  deselectLayers(layerIds) {
    const ids = Array.isArray(layerIds) ? layerIds : [layerIds];
    ids.forEach(id => this.selectedLayers.delete(id));
    
    this.emit('selection:changed', Array.from(this.selectedLayers));
  }

  /**
   * Clear selection
   */
  clearSelection() {
    this.selectedLayers.clear();
    this.emit('selection:changed', []);
  }

  /**
   * Get layer by ID
   */
  getLayer(layerId) {
    return this.scene.layers.find(l => l.id === layerId) || null;
  }

  /**
   * Find layer index
   */
  findLayerIndex(layerId) {
    return this.scene.layers.findIndex(l => l.id === layerId);
  }

  /**
   * Get all layers of type
   */
  getLayersByType(type) {
    return this.scene.layers.filter(l => l.type === type);
  }

  /**
   * Get visible layers in render order
   */
  getVisibleLayers() {
    return this.scene.layers.filter(l => l.visible && l.opacity > 0);
  }

  /**
   * Calculate bounds of multiple layers
   */
  calculateLayersBounds(layers) {
    if (layers.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    layers.forEach(layer => {
      const t = layer.transform;
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + t.width);
      maxY = Math.max(maxY, t.y + t.height);
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Align layers
   */
  alignLayers(alignment) {
    const selectedLayers = Array.from(this.selectedLayers)
      .map(id => this.getLayer(id))
      .filter(Boolean);
    
    if (selectedLayers.length < 2) return false;
    
    switch (alignment) {
      case 'left':
        const leftX = Math.min(...selectedLayers.map(l => l.transform.x));
        selectedLayers.forEach(l => l.transform.x = leftX);
        break;
      case 'center-h':
        const centerX = this.scene.canvas.width / 2;
        selectedLayers.forEach(l => l.transform.x = centerX - l.transform.width / 2);
        break;
      case 'right':
        const rightX = Math.max(...selectedLayers.map(l => l.transform.x + l.transform.width));
        selectedLayers.forEach(l => l.transform.x = rightX - l.transform.width);
        break;
      case 'top':
        const topY = Math.min(...selectedLayers.map(l => l.transform.y));
        selectedLayers.forEach(l => l.transform.y = topY);
        break;
      case 'center-v':
        const centerY = this.scene.canvas.height / 2;
        selectedLayers.forEach(l => l.transform.y = centerY - l.transform.height / 2);
        break;
      case 'bottom':
        const bottomY = Math.max(...selectedLayers.map(l => l.transform.y + l.transform.height));
        selectedLayers.forEach(l => l.transform.y = bottomY - l.transform.height);
        break;
    }
    
    this.scene.metadata.modified = new Date().toISOString();
    this.emit('layers:aligned', { alignment, layers: selectedLayers.map(l => l.id) });
    
    return true;
  }

  /**
   * Distribute layers evenly
   */
  distributeLayers(direction) {
    const selectedLayers = Array.from(this.selectedLayers)
      .map(id => this.getLayer(id))
      .filter(Boolean);
    
    if (selectedLayers.length < 3) return false;
    
    // Sort by position
    selectedLayers.sort((a, b) => {
      if (direction === 'horizontal') return a.transform.x - b.transform.x;
      return a.transform.y - b.transform.y;
    });
    
    const first = selectedLayers[0];
    const last = selectedLayers[selectedLayers.length - 1];
    
    if (direction === 'horizontal') {
      const totalSpace = last.transform.x - first.transform.x;
      const spacing = totalSpace / (selectedLayers.length - 1);
      
      selectedLayers.forEach((layer, i) => {
        layer.transform.x = first.transform.x + spacing * i;
      });
    } else {
      const totalSpace = last.transform.y - first.transform.y;
      const spacing = totalSpace / (selectedLayers.length - 1);
      
      selectedLayers.forEach((layer, i) => {
        layer.transform.y = first.transform.y + spacing * i;
      });
    }
    
    this.scene.metadata.modified = new Date().toISOString();
    this.emit('layers:distributed', { direction, layers: selectedLayers.map(l => l.id) });
    
    return true;
  }

  /**
   * Get layer tree (for nested groups)
   */
  getLayerTree() {
    return this.scene.layers.map(layer => this.buildTreeNode(layer));
  }

  /**
   * Build tree node recursively
   */
  buildTreeNode(layer) {
    const node = {
      id: layer.id,
      type: layer.type,
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      selected: this.selectedLayers.has(layer.id)
    };
    
    if (layer.type === 'group' && layer.group?.children) {
      node.children = layer.group.children.map(child => this.buildTreeNode(child));
    }
    
    return node;
  }

  /**
   * Save history state for undo
   */
  saveHistoryState() {
    // Remove future states if we're in middle of history
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    
    // Add current state
    const state = this.serializer.serializeScene(this.scene);
    this.history.push(state);
    
    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    
    this.historyIndex = this.history.length - 1;
  }

  /**
   * Undo
   */
  undo() {
    if (this.historyIndex <= 0) return false;
    
    this.historyIndex--;
    this.restoreFromHistory();
    return true;
  }

  /**
   * Redo
   */
  redo() {
    if (this.historyIndex >= this.history.length - 1) return false;
    
    this.historyIndex++;
    this.restoreFromHistory();
    return true;
  }

  /**
   * Restore scene from history
   */
  restoreFromHistory() {
    const state = this.history[this.historyIndex];
    this.scene = this.serializer.deserializeScene(state);
    this.emit('scene:restored', this.scene);
  }

  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  /**
   * Get group count
   */
  getGroupCount() {
    return this.scene.layers.filter(l => l.type === 'group').length;
  }

  /**
   * Validate scene
   */
  validateScene() {
    return this.validator.validate(this.scene);
  }

  /**
   * Export scene to JSON
   */
  toJSON() {
    return this.serializer.serializeScene(this.scene);
  }

  /**
   * Import scene from JSON
   */
  fromJSON(json) {
    try {
      const scene = typeof json === 'string' ? JSON.parse(json) : json;
      const validation = this.validator.validate(scene);
      
      if (!validation.valid) {
        throw new Error(`Invalid scene: ${validation.errors.join(', ')}`);
      }
      
      this.scene = scene;
      this.layerOrder = scene.layers.map(l => l.id);
      this.selectedLayers.clear();
      this.history = [this.serializer.serializeScene(scene)];
      this.historyIndex = 0;
      
      this.emit('scene:loaded', scene);
      return scene;
    } catch (error) {
      this.logger.error('Failed to import scene:', error);
      throw error;
    }
  }

  /**
   * Destroy scene manager
   */
  destroy() {
    this.scene = null;
    this.layerOrder = [];
    this.selectedLayers.clear();
    this.history = [];
    this.historyIndex = -1;
    this.removeAllListeners();
  }
}

export { SceneManager };