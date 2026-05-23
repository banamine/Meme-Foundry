/**
 * Meme Foundry - Application State Manager
 * Centralized state management with reactive updates and persistence
 */

import { Logger } from '@/utils/logger.js';
import { EventEmitter } from '@/utils/event-emitter.js';

class AppState extends EventEmitter {
  constructor() {
    super();
    this.logger = new Logger('State');
    
    // Core state
    this.state = {
      app: {
        status: 'initializing', // initializing | ready | error
        loaded: false,
        version: '1.0.0',
        buildDate: null
      },
      
      project: {
        id: null,
        name: 'Untitled Project',
        created: null,
        modified: null,
        isDirty: false,
        sceneData: null,
        history: [],
        historyIndex: -1,
        maxHistorySize: 50
      },
      
      editor: {
        activeTool: 'select', // select | text | shape | brush | crop
        selectedLayers: [],
        zoom: 1,
        panX: 0,
        panY: 0,
        showGuides: true,
        showSafeAreas: true,
        showGrid: false,
        snapping: true
      },
      
      canvas: {
        width: 1080,
        height: 1080,
        backgroundColor: '#FFFFFF',
        platform: 'instagram',
        exportFormat: 'png'
      },
      
      media: {
        assets: new Map(),
        loading: new Set(),
        errors: new Map()
      },
      
      timeline: {
        currentTime: 0,
        duration: 0,
        isPlaying: false,
        fps: 30,
        loop: false
      },
      
      ui: {
        sidebarOpen: true,
        timelineOpen: false,
        activePanel: 'layers', // layers | properties | presets | media
        theme: 'dark',
        responsiveBreakpoint: 'desktop'
      },
      
      system: {
        memoryUsage: 0,
        fps: 0,
        workerStatus: 'idle', // idle | busy | error
        onlineStatus: navigator.onLine,
        exportQueue: [],
        currentExport: null
      }
    };
    
    // Services references
    this.services = {
      storage: null,
      workerBridge: null,
      fontManager: null,
      ui: null,
      router: null
    };
    
    // State change subscribers
    this.subscribers = new Map();
    
    // State change batching
    this.batchedChanges = [];
    this.batchTimeout = null;
    
    this.setupNetworkListeners();
  }

  /**
   * Initialize state system
   */
  async initialize() {
    this.logger.info('Initializing state system');
    
    // Set initial state
    this.state.app.buildDate = new Date().toISOString();
    
    // Mark as ready
    this.state.app.status = 'ready';
    this.state.app.loaded = true;
    
    this.emit('state:initialized', this.getSnapshot());
  }

  /**
   * Get state value by path
   */
  getState(path, defaultValue = undefined) {
    const keys = path.split('.');
    let value = this.state;
    
    for (const key of keys) {
      if (value == null || typeof value !== 'object') {
        return defaultValue;
      }
      value = value[key];
    }
    
    return value ?? defaultValue;
  }

  /**
   * Set state value with change notification
   */
  setState(path, value, options = {}) {
    const { silent = false, batch = false } = options;
    
    const oldValue = this.getState(path);
    
    // Don't update if value hasn't changed
    if (oldValue === value) return;
    
    const keys = path.split('.');
    let current = this.state;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    
    if (batch) {
      this.batchedChanges.push({ path, oldValue, newValue: value });
      this.scheduleBatch();
    } else if (!silent) {
      this.notifyChange(path, oldValue, value);
    }
    
    // Auto-mark project as dirty for certain changes
    if (path.startsWith('project.sceneData') || 
        path.startsWith('canvas') || 
        path.startsWith('media')) {
      this.markProjectDirty();
    }
  }

  /**
   * Batch multiple state changes
   */
  batch(updates) {
    updates.forEach(({ path, value }) => {
      this.setState(path, value, { batch: true });
    });
  }

  /**
   * Schedule batch notification
   */
  scheduleBatch() {
    if (this.batchTimeout) return;
    
    this.batchTimeout = setTimeout(() => {
      const changes = [...this.batchedChanges];
      this.batchedChanges = [];
      this.batchTimeout = null;
      
      // Notify all batched changes
      this.emit('state:batch-change', changes);
      
      // Also emit individual changes
      changes.forEach(({ path, oldValue, newValue }) => {
        this.notifyChange(path, oldValue, newValue);
      });
    }, 0);
  }

  /**
   * Notify subscribers of state change
   */
  notifyChange(path, oldValue, newValue) {
    this.emit('state:change', { path, oldValue, newValue });
    this.emit(`state:${path}`, { oldValue, newValue });
    
    // Notify specific subscribers
    const subs = this.subscribers.get(path);
    if (subs) {
      subs.forEach(callback => callback(newValue, oldValue));
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(path, callback) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }
    this.subscribers.get(path).add(callback);
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(path);
      if (subs) {
        subs.delete(callback);
      }
    };
  }

  /**
   * Get full state snapshot
   */
  getSnapshot() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Mark project as dirty (unsaved changes)
   */
  markProjectDirty() {
    if (!this.state.project.isDirty) {
      this.state.project.isDirty = true;
      this.state.project.modified = new Date().toISOString();
      this.emit('state:project.dirty', true);
    }
  }

  /**
   * Mark project as saved
   */
  markProjectSaved() {
    this.state.project.isDirty = false;
    this.emit('state:project.dirty', false);
  }

  /**
   * Check if project has unsaved changes
   */
  hasUnsavedChanges() {
    return this.state.project.isDirty;
  }

  /**
   * Add to undo history
   */
  pushHistory(state) {
    const history = this.state.project.history;
    
    // Remove any future states if we're in the middle of history
    if (this.state.project.historyIndex < history.length - 1) {
      history.splice(this.state.project.historyIndex + 1);
    }
    
    // Add new state
    history.push(JSON.parse(JSON.stringify(state)));
    
    // Limit history size
    if (history.length > this.state.project.maxHistorySize) {
      history.shift();
    }
    
    this.state.project.historyIndex = history.length - 1;
  }

  /**
   * Undo last action
   */
  undo() {
    const history = this.state.project.history;
    const index = this.state.project.historyIndex;
    
    if (index > 0) {
      this.state.project.historyIndex--;
      const previousState = history[this.state.project.historyIndex];
      this.restoreState(previousState);
      return true;
    }
    return false;
  }

  /**
   * Redo last undone action
   */
  redo() {
    const history = this.state.project.history;
    const index = this.state.project.historyIndex;
    
    if (index < history.length - 1) {
      this.state.project.historyIndex++;
      const nextState = history[this.state.project.historyIndex];
      this.restoreState(nextState);
      return true;
    }
    return false;
  }

  /**
   * Restore state from history
   */
  restoreState(historicalState) {
    // Deep clone to prevent reference issues
    const state = JSON.parse(JSON.stringify(historicalState));
    
    // Merge historical state
    Object.assign(this.state, state);
    this.markProjectDirty();
    this.emit('state:restored', state);
  }

  /**
   * Save current project
   */
  async saveProject() {
    if (!this.services.storage) {
      throw new Error('Storage service not initialized');
    }
    
    try {
      const projectData = {
        id: this.state.project.id || crypto.randomUUID(),
        name: this.state.project.name,
        created: this.state.project.created || new Date().toISOString(),
        modified: new Date().toISOString(),
        sceneData: this.state.project.sceneData,
        canvas: {
          width: this.state.canvas.width,
          height: this.state.canvas.height,
          backgroundColor: this.state.canvas.backgroundColor,
          platform: this.state.canvas.platform
        },
        media: Array.from(this.state.media.assets.entries())
      };
      
      await this.services.storage.saveProject(projectData);
      
      this.state.project.id = projectData.id;
      this.markProjectSaved();
      
      this.emit('state:project-saved', projectData);
      this.logger.info('Project saved:', projectData.id);
      
      return projectData.id;
    } catch (error) {
      this.logger.error('Failed to save project:', error);
      throw error;
    }
  }

  /**
   * Load project from storage
   */
  async loadProject(projectId) {
    if (!this.services.storage) {
      throw new Error('Storage service not initialized');
    }
    
    try {
      const projectData = await this.services.storage.loadProject(projectId);
      
      // Restore project state
      this.state.project.id = projectData.id;
      this.state.project.name = projectData.name;
      this.state.project.created = projectData.created;
      this.state.project.modified = projectData.modified;
      this.state.project.sceneData = projectData.sceneData;
      
      this.state.canvas.width = projectData.canvas.width;
      this.state.canvas.height = projectData.canvas.height;
      this.state.canvas.backgroundColor = projectData.canvas.backgroundColor;
      this.state.canvas.platform = projectData.canvas.platform;
      
      // Restore media assets
      this.state.media.assets = new Map(projectData.media);
      
      this.markProjectSaved();
      this.emit('state:project-loaded', projectData);
      
      return projectData;
    } catch (error) {
      this.logger.error('Failed to load project:', error);
      throw error;
    }
  }

  /**
   * Add media asset
   */
  addMediaAsset(id, asset) {
    this.state.media.assets.set(id, {
      ...asset,
      added: new Date().toISOString()
    });
    
    this.markProjectDirty();
    this.emit('state:media-added', { id, asset });
  }

  /**
   * Remove media asset
   */
  removeMediaAsset(id) {
    const asset = this.state.media.assets.get(id);
    this.state.media.assets.delete(id);
    
    this.markProjectDirty();
    this.emit('state:media-removed', { id, asset });
  }

  /**
   * Add export to queue
   */
  addToExportQueue(exportConfig) {
    const exportId = crypto.randomUUID();
    
    this.state.system.exportQueue.push({
      id: exportId,
      config: exportConfig,
      status: 'queued',
      added: new Date().toISOString(),
      progress: 0
    });
    
    this.emit('state:export-queued', { id: exportId, config: exportConfig });
    
    return exportId;
  }

  /**
   * Update export progress
   */
  updateExportProgress(exportId, progress, status = 'processing') {
    const exportItem = this.state.system.exportQueue.find(e => e.id === exportId);
    if (exportItem) {
      exportItem.progress = progress;
      exportItem.status = status;
      this.emit('state:export-progress', exportItem);
    }
  }

  /**
   * Set service references
   */
  setStorage(storage) {
    this.services.storage = storage;
  }

  setWorkerBridge(bridge) {
    this.services.workerBridge = bridge;
  }

  setFontManager(manager) {
    this.services.fontManager = manager;
  }

  setUI(ui) {
    this.services.ui = ui;
  }

  setRouter(router) {
    this.services.router = router;
  }

  /**
   * Set recovery data after crash
   */
  setRecoveryData(data) {
    this.state.recovery = data;
    this.emit('state:recovery-available', data);
  }

  /**
   * Network status listeners
   */
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.state.system.onlineStatus = true;
      this.emit('state:online-status', true);
    });
    
    window.addEventListener('offline', () => {
      this.state.system.onlineStatus = false;
      this.emit('state:online-status', false);
    });
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.subscribers.clear();
    this.removeAllListeners();
    
    // Revoke media URLs
    this.state.media.assets.forEach((asset) => {
      if (asset.url && asset.url.startsWith('blob:')) {
        URL.revokeObjectURL(asset.url);
      }
    });
    
    this.state.media.assets.clear();
  }
}

export { AppState };