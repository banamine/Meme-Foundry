/**
 * Meme Foundry - Editor UI
 * Main editor interface with toolbar, panels, and canvas viewport
 */

import { Logger } from '@/utils/logger.js';
import { EventEmitter } from '@/utils/event-emitter.js';
import { DragSystem } from './drag-system.js';
import { ResizeSystem } from './resize-system.js';
import { SnappingSystem } from './snapping-system.js';
import { KeyboardShortcuts } from './keyboard-shortcuts.js';
import { UndoRedo } from './undo-redo.js';
import { Autosave } from './autosave.js';
import { SelectionManager } from './selection-manager.js';

class EditorUI extends EventEmitter {
  constructor(state) {
    super();
    this.logger = new Logger('EditorUI');
    this.state = state;
    
    // DOM elements
    this.container = null;
    this.canvasContainer = null;
    this.toolbar = null;
    this.sidebar = null;
    this.timeline = null;
    this.statusBar = null;
    
    // Subsystems
    this.dragSystem = new DragSystem();
    this.resizeSystem = new ResizeSystem();
    this.snappingSystem = new SnappingSystem();
    this.keyboardShortcuts = new KeyboardShortcuts();
    this.undoRedo = new UndoRedo(state);
    this.autosave = new Autosave(state);
    this.selectionManager = new SelectionManager(state);
    
    // UI state
    this.panels = {
      layers: { visible: true, width: 280 },
      properties: { visible: false, width: 280 },
      presets: { visible: false, width: 280 },
      media: { visible: false, width: 280 }
    };
    
    this.activeTool = 'select';
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.showGuides = true;
    this.showSafeAreas = true;
  }

  /**
   * Initialize editor UI
   */
  async initialize() {
    this.logger.info('Initializing editor UI');
    
    // Create UI structure
    this.createLayout();
    
    // Initialize subsystems
    await this.initializeSubsystems();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Apply theme
    this.applyTheme(this.state.getState('ui.theme'));
    
    // Show welcome screen or last project
    this.showInitialState();
    
    this.emit('editor:initialized');
  }

  /**
   * Create editor layout
   */
  createLayout() {
    const app = document.getElementById('app');
    if (!app) return;
    
    // Clear existing content
    app.innerHTML = '';
    
    // Create main layout
    const layout = `
      <div class="editor-layout" role="application" aria-label="Meme Foundry Editor">
        <!-- Toolbar -->
        <header class="editor-toolbar" role="toolbar" aria-label="Main toolbar">
          <div class="toolbar-left">
            <button class="tool-btn" data-tool="select" title="Select (V)" aria-label="Select tool">
              <span class="icon">↖</span>
            </button>
            <button class="tool-btn" data-tool="text" title="Text (T)" aria-label="Text tool">
              <span class="icon">T</span>
            </button>
            <button class="tool-btn" data-tool="shape" title="Shape (S)" aria-label="Shape tool">
              <span class="icon">□</span>
            </button>
            <button class="tool-btn" data-tool="brush" title="Brush (B)" aria-label="Brush tool">
              <span class="icon">🖌</span>
            </button>
            <div class="toolbar-divider"></div>
            <button class="tool-btn" data-action="undo" title="Undo (Ctrl+Z)" aria-label="Undo">
              <span class="icon">↩</span>
            </button>
            <button class="tool-btn" data-action="redo" title="Redo (Ctrl+Y)" aria-label="Redo">
              <span class="icon">↪</span>
            </button>
          </div>
          <div class="toolbar-center">
            <span class="project-name" id="project-name">Untitled Project</span>
          </div>
          <div class="toolbar-right">
            <button class="tool-btn" data-action="zoom-in" title="Zoom In" aria-label="Zoom in">
              <span class="icon">+</span>
            </button>
            <span class="zoom-level" id="zoom-level">100%</span>
            <button class="tool-btn" data-action="zoom-out" title="Zoom Out" aria-label="Zoom out">
              <span class="icon">−</span>
            </button>
            <div class="toolbar-divider"></div>
            <button class="tool-btn" data-panel="layers" title="Layers" aria-label="Toggle layers panel">
              <span class="icon">☰</span>
            </button>
            <button class="tool-btn" data-panel="presets" title="Presets" aria-label="Toggle presets panel">
              <span class="icon">📋</span>
            </button>
            <button class="tool-btn" data-action="export" title="Export" aria-label="Export">
              <span class="icon">⬇</span>
            </button>
          </div>
        </header>
        
        <!-- Main content area -->
        <div class="editor-main">
          <!-- Left sidebar -->
          <aside class="editor-sidebar left" id="left-sidebar" aria-label="Left sidebar">
            <div class="panel-tabs" role="tablist">
              <button class="panel-tab active" data-panel="layers" role="tab" aria-selected="true">Layers</button>
              <button class="panel-tab" data-panel="media" role="tab">Media</button>
              <button class="panel-tab" data-panel="presets" role="tab">Presets</button>
            </div>
            <div class="panel-content" id="left-panel-content">
              <!-- Layer list will be rendered here -->
            </div>
          </aside>
          
          <!-- Canvas viewport -->
          <main class="editor-viewport" id="viewport" aria-label="Canvas area">
            <div class="canvas-wrapper" id="canvas-wrapper">
              <canvas id="main-canvas" aria-label="Main canvas"></canvas>
              <div class="safe-areas-overlay" id="safe-areas-overlay"></div>
              <div class="guides-overlay" id="guides-overlay"></div>
            </div>
          </main>
          
          <!-- Right sidebar -->
          <aside class="editor-sidebar right" id="right-sidebar" aria-label="Right sidebar">
            <div class="panel-tabs" role="tablist">
              <button class="panel-tab active" data-panel="properties" role="tab" aria-selected="true">Properties</button>
            </div>
            <div class="panel-content" id="right-panel-content">
              <!-- Property panel will be rendered here -->
            </div>
          </aside>
        </div>
        
        <!-- Timeline -->
        <footer class="editor-timeline" id="timeline" aria-label="Timeline">
          <div class="timeline-header">
            <span>Timeline</span>
            <button class="timeline-toggle" data-action="toggle-timeline">▼</button>
          </div>
          <div class="timeline-content">
            <!-- Timeline tracks will be rendered here -->
          </div>
        </footer>
        
        <!-- Status bar -->
        <div class="editor-statusbar" role="status" aria-live="polite">
          <span class="status-left">
            <span id="canvas-size">1080 × 1080</span>
            <span class="status-divider">|</span>
            <span id="layer-count">0 layers</span>
          </span>
          <span class="status-center" id="status-message">Ready</span>
          <span class="status-right">
            <span id="zoom-display">100%</span>
            <span class="status-divider">|</span>
            <span id="memory-usage">0 MB</span>
          </span>
        </div>
      </div>
    `;
    
    app.innerHTML = layout;
    
    // Cache DOM references
    this.container = app.querySelector('.editor-layout');
    this.canvasContainer = app.querySelector('#canvas-wrapper');
    this.toolbar = app.querySelector('.editor-toolbar');
    this.sidebar = app.querySelector('#left-sidebar');
    this.timeline = app.querySelector('#timeline');
    this.statusBar = app.querySelector('.editor-statusbar');
  }

  /**
   * Initialize subsystems
   */
  async initializeSubsystems() {
    // Initialize drag system on canvas
    const canvas = document.getElementById('main-canvas');
    this.dragSystem.initialize(canvas);
    
    // Initialize resize system
    this.resizeSystem.initialize();
    
    // Initialize snapping
    this.snappingSystem.initialize();
    
    // Initialize keyboard shortcuts
    this.keyboardShortcuts.initialize();
    
    // Initialize undo/redo
    this.undoRedo.initialize();
    
    // Initialize autosave
    await this.autosave.initialize();
    
    // Initialize selection manager
    this.selectionManager.initialize();
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Tool buttons
    this.toolbar.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        this.setActiveTool(tool);
      });
    });
    
    // Action buttons
    this.toolbar.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.handleAction(action);
      });
    });
    
    // Panel toggles
    this.toolbar.querySelectorAll('[data-panel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.panel;
        this.togglePanel(panel);
      });
    });
    
    // Canvas zoom with mouse wheel
    this.canvasContainer.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoomCanvas(delta);
      }
    });
    
    // Canvas pan with middle mouse button
    this.canvasContainer.addEventListener('mousedown', (e) => {
      if (e.button === 1) { // Middle button
        e.preventDefault();
        this.startPan(e);
      }
    });
    
    // Resize observer for responsive layout
    const resizeObserver = new ResizeObserver(entries => {
      this.handleResize(entries[0].contentRect);
    });
    resizeObserver.observe(this.container);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.keyboardShortcuts.handleKeyDown(e, this);
    });
    
    // State changes
    this.state.on('state:change', (data) => {
      this.handleStateChange(data);
    });
    
    // Before unload warning
    window.addEventListener('beforeunload', (e) => {
      if (this.state.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    });
  }

  /**
   * Set active tool
   */
  setActiveTool(tool) {
    this.activeTool = tool;
    
    // Update toolbar buttons
    this.toolbar.querySelectorAll('[data-tool]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    
    // Update cursor
    const cursors = {
      select: 'default',
      text: 'text',
      shape: 'crosshair',
      brush: 'crosshair',
      crop: 'crosshair'
    };
    this.canvasContainer.style.cursor = cursors[tool] || 'default';
    
    // Notify state
    this.state.setState('editor.activeTool', tool);
    this.emit('tool:changed', tool);
  }

  /**
   * Handle toolbar actions
   */
  handleAction(action) {
    switch (action) {
      case 'undo':
        this.undoRedo.undo();
        break;
      case 'redo':
        this.undoRedo.redo();
        break;
      case 'zoom-in':
        this.zoomCanvas(1.25);
        break;
      case 'zoom-out':
        this.zoomCanvas(0.8);
        break;
      case 'export':
        this.showExportDialog();
        break;
      case 'toggle-timeline':
        this.toggleTimeline();
        break;
    }
  }

  /**
   * Toggle panel visibility
   */
  togglePanel(panel) {
    const panelState = this.panels[panel];
    if (panelState) {
      panelState.visible = !panelState.visible;
      this.updatePanelVisibility(panel);
    }
  }

  /**
   * Update panel visibility
   */
  updatePanelVisibility(panel) {
    const panelState = this.panels[panel];
    const sidebar = document.getElementById('left-sidebar');
    
    if (panelState.visible) {
      sidebar.style.display = 'block';
    } else {
      sidebar.style.display = 'none';
    }
    
    // Update panel tabs
    const tabs = sidebar.querySelectorAll('.panel-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.panel === panel && panelState.visible);
    });
  }

  /**
   * Zoom canvas
   */
  zoomCanvas(factor) {
    this.zoom *= factor;
    this.zoom = Math.min(5, Math.max(0.1, this.zoom));
    
    // Apply zoom transform
    const wrapper = document.getElementById('canvas-wrapper');
    wrapper.style.transform = `scale(${this.zoom})`;
    
    // Update zoom display
    const zoomPercent = Math.round(this.zoom * 100);
    document.getElementById('zoom-level').textContent = `${zoomPercent}%`;
    document.getElementById('zoom-display').textContent = `${zoomPercent}%`;
    
    this.state.setState('editor.zoom', this.zoom);
    this.emit('zoom:changed', this.zoom);
  }

  /**
   * Start panning
   */
  startPan(event) {
    const startX = event.clientX;
    const startY = event.clientY;
    const startPan = { ...this.pan };
    
    const onMouseMove = (e) => {
      this.pan.x = startPan.x + (e.clientX - startX);
      this.pan.y = startPan.y + (e.clientY - startY);
      this.updatePanTransform();
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  /**
   * Update pan transform
   */
  updatePanTransform() {
    const wrapper = document.getElementById('canvas-wrapper');
    wrapper.style.transform = `scale(${this.zoom}) translate(${this.pan.x}px, ${this.pan.y}px)`;
  }

  /**
   * Toggle timeline
   */
  toggleTimeline() {
    const timeline = document.getElementById('timeline');
    timeline.classList.toggle('collapsed');
    this.state.setState('ui.timelineOpen', !timeline.classList.contains('collapsed'));
  }

  /**
   * Show export dialog
   */
  showExportDialog() {
    // Import and show export modal
    import('@/export/export-manager.js').then(({ ExportManager }) => {
      this.renderExportDialog();
    });
  }

  /**
   * Render export dialog
   */
  renderExportDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.innerHTML = `
      <div class="dialog export-dialog">
        <h2>Export Project</h2>
        <div class="export-options">
          <div class="export-format">
            <label>Format</label>
            <select id="export-format">
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
              <option value="mp4">MP4 Video</option>
              <option value="webm">WebM Video</option>
              <option value="html">HTML Bundle</option>
            </select>
          </div>
          <div class="export-preset">
            <label>Preset</label>
            <select id="export-preset">
              <option value="">Custom</option>
              <option value="instagram-post">Instagram Post</option>
              <option value="instagram-story">Instagram Story</option>
              <option value="facebook-post">Facebook Post</option>
              <option value="twitter-post">Twitter/X Post</option>
              <option value="youtube-thumbnail">YouTube Thumbnail</option>
            </select>
          </div>
          <div class="export-quality">
            <label>Quality: <span id="quality-value">92%</span></label>
            <input type="range" id="export-quality" min="1" max="100" value="92">
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn-primary" data-action="export">Export</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Dialog event handlers
    dialog.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      dialog.remove();
    });
    
    dialog.querySelector('[data-action="export"]').addEventListener('click', () => {
      const format = document.getElementById('export-format').value;
      const preset = document.getElementById('export-preset').value;
      const quality = parseInt(document.getElementById('export-quality').value) / 100;
      
      this.emit('export:requested', { format, preset, quality });
      dialog.remove();
    });
    
    // Quality slider update
    document.getElementById('export-quality').addEventListener('input', (e) => {
      document.getElementById('quality-value').textContent = `${e.target.value}%`;
    });
  }

  /**
   * Show initial state
   */
  showInitialState() {
    // Check for recovery data
    const recoveryData = this.state.getState('recovery');
    if (recoveryData) {
      this.showRecoveryDialog(recoveryData);
    }
    
    // Update UI
    this.updateLayerList();
    this.updateStatusBar();
  }

  /**
   * Show recovery dialog
   */
  showRecoveryDialog(data) {
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.innerHTML = `
      <div class="dialog recovery-dialog">
        <h2>Recovered Project Found</h2>
        <p>A previously unsaved project was recovered from ${new Date(data.timestamp).toLocaleString()}</p>
        <div class="dialog-actions">
          <button class="btn-secondary" data-action="discard">Discard</button>
          <button class="btn-primary" data-action="recover">Recover</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('[data-action="recover"]').addEventListener('click', () => {
      this.loadRecoveredProject(data);
      dialog.remove();
    });
    
    dialog.querySelector('[data-action="discard"]').addEventListener('click', () => {
      dialog.remove();
    });
  }

  /**
   * Load recovered project
   */
  loadRecoveredProject(data) {
    this.emit('project:recover', data);
  }

  /**
   * Update layer list panel
   */
  updateLayerList() {
    const panelContent = document.getElementById('left-panel-content');
    if (!panelContent) return;
    
    const layers = this.state.getState('project.sceneData.layers') || [];
    
    panelContent.innerHTML = `
      <div class="layer-list">
        <div class="layer-list-header">
          <span>Layers (${layers.length})</span>
          <button class="icon-btn" data-action="add-layer" title="Add Layer">+</button>
        </div>
        <div class="layer-items">
          ${layers.map((layer, index) => this.renderLayerItem(layer, index)).join('')}
        </div>
      </div>
    `;
    
    // Layer item event handlers
    panelContent.querySelectorAll('.layer-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const layerId = item.dataset.layerId;
        const additive = e.ctrlKey || e.metaKey;
        this.selectionManager.selectLayer(layerId, additive);
      });
    });
  }

  /**
   * Render individual layer item
   */
  renderLayerItem(layer, index) {
    const isSelected = this.state.getState('editor.selectedLayers').includes(layer.id);
    const typeIcons = {
      image: '🖼',
      text: '📝',
      video: '🎬',
      audio: '🔊',
      shape: '⬜',
      group: '📁'
    };
    
    return `
      <div class="layer-item ${isSelected ? 'selected' : ''}" 
           data-layer-id="${layer.id}"
           data-layer-index="${index}">
        <span class="layer-icon">${typeIcons[layer.type] || '❓'}</span>
        <span class="layer-name">${layer.name}</span>
        <span class="layer-visibility">
          <button class="icon-btn" data-action="toggle-visibility">
            ${layer.visible ? '👁' : '👁‍🗨'}
          </button>
        </span>
        <span class="layer-lock">
          <button class="icon-btn" data-action="toggle-lock">
            ${layer.locked ? '🔒' : '🔓'}
          </button>
        </span>
      </div>
    `;
  }

  /**
   * Update status bar
   */
  updateStatusBar() {
    const canvas = this.state.getState('canvas');
    const layers = this.state.getState('project.sceneData.layers') || [];
    
    document.getElementById('canvas-size').textContent = 
      `${canvas.width} × ${canvas.height}`;
    document.getElementById('layer-count').textContent = 
      `${layers.length} layer${layers.length !== 1 ? 's' : ''}`;
  }

  /**
   * Handle state changes
   */
  handleStateChange(data) {
    const { path, newValue } = data;
    
    // Update specific UI elements based on state path
    if (path === 'project.name') {
      document.getElementById('project-name').textContent = newValue;
    }
    
    if (path.startsWith('project.sceneData.layers')) {
      this.updateLayerList();
      this.updateStatusBar();
    }
    
    if (path === 'canvas.width' || path === 'canvas.height') {
      this.updateStatusBar();
    }
    
    if (path === 'ui.theme') {
      this.applyTheme(newValue);
    }
  }

  /**
   * Apply theme
   */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.state.setState('ui.theme', theme);
  }

  /**
   * Handle responsive resize
   */
  handleResize(contentRect) {
    const width = contentRect.width;
    let breakpoint = 'desktop';
    
    if (width < 768) {
      breakpoint = 'mobile';
    } else if (width < 1024) {
      breakpoint = 'tablet';
    }
    
    this.state.setState('ui.responsiveBreakpoint', breakpoint);
    
    // Adjust layout for mobile
    if (breakpoint === 'mobile') {
      document.getElementById('left-sidebar').style.display = 'none';
      document.getElementById('right-sidebar').style.display = 'none';
      document.getElementById('timeline').classList.add('collapsed');
    }
  }

  /**
   * Set status message
   */
  setStatus(message, type = 'info') {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status-${type}`;
    }
  }

  /**
   * Clean up
   */
  destroy() {
    this.dragSystem.destroy();
    this.resizeSystem.destroy();
    this.keyboardShortcuts.destroy();
    this.undoRedo.destroy();
    this.autosave.destroy();
    this.selectionManager.destroy();
    this.removeAllListeners();
  }
}

export { EditorUI };