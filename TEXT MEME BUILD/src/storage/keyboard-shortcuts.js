/**
 * Meme Foundry - Keyboard Shortcuts System
 * Manages keyboard shortcuts with configurable bindings
 */

import { Logger } from '@/utils/logger.js';

class KeyboardShortcuts {
  constructor() {
    this.logger = new Logger('KeyboardShortcuts');
    
    // Default shortcuts
    this.shortcuts = new Map();
    this.defaultShortcuts = {
      // File operations
      'ctrl+s': { command: 'save', description: 'Save project' },
      'ctrl+shift+s': { command: 'save-as', description: 'Save as...' },
      'ctrl+o': { command: 'open', description: 'Open project' },
      'ctrl+n': { command: 'new', description: 'New project' },
      'ctrl+e': { command: 'export', description: 'Export' },
      'ctrl+shift+e': { command: 'export-as', description: 'Export as...' },
      
      // Edit operations
      'ctrl+z': { command: 'undo', description: 'Undo' },
      'ctrl+shift+z': { command: 'redo', description: 'Redo' },
      'ctrl+y': { command: 'redo', description: 'Redo (alternative)' },
      'ctrl+x': { command: 'cut', description: 'Cut' },
      'ctrl+c': { command: 'copy', description: 'Copy' },
      'ctrl+v': { command: 'paste', description: 'Paste' },
      'ctrl+d': { command: 'duplicate', description: 'Duplicate' },
      'delete': { command: 'delete', description: 'Delete selected' },
      'backspace': { command: 'delete', description: 'Delete selected (alternative)' },
      'ctrl+a': { command: 'select-all', description: 'Select all' },
      'escape': { command: 'deselect', description: 'Deselect all' },
      
      // Tools
      'v': { command: 'tool-select', description: 'Select tool' },
      't': { command: 'tool-text', description: 'Text tool' },
      's': { command: 'tool-shape', description: 'Shape tool' },
      'b': { command: 'tool-brush', description: 'Brush tool' },
      'c': { command: 'tool-crop', description: 'Crop tool' },
      'h': { command: 'tool-hand', description: 'Hand/Pan tool' },
      
      // View operations
      'ctrl+=': { command: 'zoom-in', description: 'Zoom in' },
      'ctrl+-': { command: 'zoom-out', description: 'Zoom out' },
      'ctrl+0': { command: 'zoom-fit', description: 'Fit to screen' },
      'ctrl+1': { command: 'zoom-100', description: 'Zoom to 100%' },
      'ctrl+g': { command: 'toggle-grid', description: 'Toggle grid' },
      'ctrl+shift+g': { command: 'toggle-guides', description: 'Toggle guides' },
      'ctrl+shift+a': { command: 'toggle-safe-areas', description: 'Toggle safe areas' },
      
      // Layer operations
      'ctrl+shift+n': { command: 'new-layer', description: 'New layer' },
      'ctrl+j': { command: 'duplicate-layer', description: 'Duplicate layer' },
      'ctrl+g': { command: 'group-layers', description: 'Group layers' },
      'ctrl+shift+g': { command: 'ungroup-layers', description: 'Ungroup layers' },
      'ctrl+]': { command: 'bring-forward', description: 'Bring forward' },
      'ctrl+[': { command: 'send-backward', description: 'Send backward' },
      'ctrl+shift+]': { command: 'bring-to-front', description: 'Bring to front' },
      'ctrl+shift+[': { command: 'send-to-back', description: 'Send to back' },
      'ctrl+l': { command: 'lock-layer', description: 'Lock/unlock layer' },
      'ctrl+shift+h': { command: 'hide-layer', description: 'Hide/show layer' },
      
      // Alignment
      'alt+arrowleft': { command: 'align-left', description: 'Align left' },
      'alt+arrowright': { command: 'align-right', description: 'Align right' },
      'alt+arrowup': { command: 'align-top', description: 'Align top' },
      'alt+arrowdown': { command: 'align-bottom', description: 'Align bottom' },
      'alt+shift+c': { command: 'align-center-h', description: 'Align center horizontal' },
      'alt+shift+m': { command: 'align-center-v', description: 'Align center vertical' },
      
      // Transform
      'arrowleft': { command: 'nudge-left', description: 'Nudge left' },
      'arrowright': { command: 'nudge-right', description: 'Nudge right' },
      'arrowup': { command: 'nudge-up', description: 'Nudge up' },
      'arrowdown': { command: 'nudge-down', description: 'Nudge down' },
      'shift+arrowleft': { command: 'nudge-left-10', description: 'Nudge left 10px' },
      'shift+arrowright': { command: 'nudge-right-10', description: 'Nudge right 10px' },
      'shift+arrowup': { command: 'nudge-up-10', description: 'Nudge up 10px' },
      'shift+arrowdown': { command: 'nudge-down-10', description: 'Nudge down 10px' },
      
      // Panel toggles
      'ctrl+shift+l': { command: 'toggle-layers-panel', description: 'Toggle layers panel' },
      'ctrl+shift+p': { command: 'toggle-properties-panel', description: 'Toggle properties panel' },
      'ctrl+shift+t': { command: 'toggle-timeline', description: 'Toggle timeline' },
      
      // Help
      'f1': { command: 'help', description: 'Show help' },
      'ctrl+/': { command: 'show-shortcuts', description: 'Show keyboard shortcuts' }
    };
    
    // Command handlers
    this.handlers = new Map();
    
    // State
    this.enabled = true;
    this.modifierKey = this.detectModifierKey();
    
    // Bound handler
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Initialize keyboard shortcuts
   */
  initialize() {
    this.logger.info('Initializing keyboard shortcuts');
    
    // Load default shortcuts
    this.loadDefaults();
    
    // Load custom shortcuts
    this.loadCustomShortcuts();
    
    // Register global handler
    document.addEventListener('keydown', this.handleKeyDown);
    
    this.emit('shortcuts:initialized');
  }

  /**
   * Load default shortcuts
   */
  loadDefaults() {
    for (const [keys, config] of Object.entries(this.defaultShortcuts)) {
      this.shortcuts.set(keys, config);
    }
  }

  /**
   * Load custom shortcuts from storage
   */
  loadCustomShortcuts() {
    try {
      const saved = localStorage.getItem('meme-foundry-shortcuts');
      if (saved) {
        const custom = JSON.parse(saved);
        for (const [keys, config] of Object.entries(custom)) {
          this.shortcuts.set(keys, config);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load custom shortcuts:', error);
    }
  }

  /**
   * Save custom shortcuts
   */
  saveCustomShortcuts() {
    try {
      const custom = {};
      for (const [keys, config] of this.shortcuts) {
        // Only save non-default shortcuts
        if (!this.defaultShortcuts[keys] || 
            this.defaultShortcuts[keys].command !== config.command) {
          custom[keys] = config;
        }
      }
      localStorage.setItem('meme-foundry-shortcuts', JSON.stringify(custom));
    } catch (error) {
      this.logger.warn('Failed to save custom shortcuts:', error);
    }
  }

  /**
   * Handle keydown event
   */
  handleKeyDown(event, editor) {
    if (!this.enabled) return;
    
    // Ignore if focus is in input/textarea
    const target = event.target;
    if (target.isContentEditable || 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT') {
      return;
    }
    
    // Build key combination string
    const combo = this.buildKeyCombo(event);
    if (!combo) return;
    
    // Find matching shortcut
    const shortcut = this.shortcuts.get(combo);
    if (!shortcut) return;
    
    // Prevent default if handled
    event.preventDefault();
    event.stopPropagation();
    
    // Execute command
    this.executeCommand(shortcut.command, editor);
  }

  /**
   * Build key combination string
   */
  buildKeyCombo(event) {
    const parts = [];
    
    if (event.ctrlKey || event.metaKey) {
      parts.push(this.modifierKey === 'meta' ? 'cmd' : 'ctrl');
    }
    
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    
    // Get key name
    let key = event.key.toLowerCase();
    
    // Normalize key names
    const keyMap = {
      'escape': 'escape',
      'delete': 'delete',
      'backspace': 'backspace',
      'arrowleft': 'arrowleft',
      'arrowright': 'arrowright',
      'arrowup': 'arrowup',
      'arrowdown': 'arrowdown',
      ' ': 'space'
    };
    
    key = keyMap[key] || key;
    
    // Don't include modifier keys themselves
    if (['control', 'alt', 'shift', 'meta'].includes(key)) {
      return null;
    }
    
    parts.push(key);
    
    return parts.join('+');
  }

  /**
   * Execute command
   */
  executeCommand(command, editor) {
    const handler = this.handlers.get(command);
    
    if (handler) {
      handler(editor);
      this.emit('command:executed', command);
    } else {
      this.logger.debug(`No handler for command: ${command}`);
    }
  }

  /**
   * Register command handler
   */
  registerHandler(command, handler) {
    this.handlers.set(command, handler);
  }

  /**
   * Unregister command handler
   */
  unregisterHandler(command) {
    this.handlers.delete(command);
  }

  /**
   * Set custom shortcut
   */
  setShortcut(keys, command, description = '') {
    // Remove old shortcut if it exists
    for (const [existingKeys, config] of this.shortcuts) {
      if (config.command === command) {
        this.shortcuts.delete(existingKeys);
      }
    }
    
    this.shortcuts.set(keys, { command, description });
    this.saveCustomShortcuts();
    this.emit('shortcut:changed', { keys, command, description });
  }

  /**
   * Remove shortcut
   */
  removeShortcut(keys) {
    if (this.defaultShortcuts[keys]) {
      // Reset to default
      this.shortcuts.set(keys, this.defaultShortcuts[keys]);
    } else {
      this.shortcuts.delete(keys);
    }
    this.saveCustomShortcuts();
  }

  /**
   * Reset all shortcuts to defaults
   */
  resetToDefaults() {
    this.shortcuts.clear();
    this.loadDefaults();
    this.saveCustomShortcuts();
    this.emit('shortcuts:reset');
  }

  /**
   * Get all shortcuts
   */
  getAllShortcuts() {
    const result = [];
    
    for (const [keys, config] of this.shortcuts) {
      result.push({
        keys,
        command: config.command,
        description: config.description,
        isDefault: !!this.defaultShortcuts[keys]
      });
    }
    
    return result.sort((a, b) => a.command.localeCompare(b.command));
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory() {
    const categories = {
      'File': ['save', 'save-as', 'open', 'new', 'export', 'export-as'],
      'Edit': ['undo', 'redo', 'cut', 'copy', 'paste', 'duplicate', 'delete', 'select-all', 'deselect'],
      'Tools': ['tool-select', 'tool-text', 'tool-shape', 'tool-brush', 'tool-crop', 'tool-hand'],
      'View': ['zoom-in', 'zoom-out', 'zoom-fit', 'zoom-100', 'toggle-grid', 'toggle-guides', 'toggle-safe-areas'],
      'Layers': ['new-layer', 'duplicate-layer', 'group-layers', 'ungroup-layers', 'bring-forward', 'send-backward', 'bring-to-front', 'send-to-back', 'lock-layer', 'hide-layer'],
      'Align': ['align-left', 'align-right', 'align-top', 'align-bottom', 'align-center-h', 'align-center-v'],
      'Transform': ['nudge-left', 'nudge-right', 'nudge-up', 'nudge-down', 'nudge-left-10', 'nudge-right-10', 'nudge-up-10', 'nudge-down-10'],
      'Panels': ['toggle-layers-panel', 'toggle-properties-panel', 'toggle-timeline'],
      'Help': ['help', 'show-shortcuts']
    };
    
    const result = {};
    
    for (const [category, commands] of Object.entries(categories)) {
      result[category] = [];
      
      for (const command of commands) {
        for (const [keys, config] of this.shortcuts) {
          if (config.command === command) {
            result[category].push({ keys, description: config.description });
            break;
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Detect modifier key for platform
   */
  detectModifierKey() {
    return navigator.platform.includes('Mac') ? 'meta' : 'ctrl';
  }

  /**
   * Enable/disable shortcuts
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Check if shortcut exists
   */
  hasShortcut(keys) {
    return this.shortcuts.has(keys);
  }

  /**
   * Find shortcut for command
   */
  findShortcutForCommand(command) {
    for (const [keys, config] of this.shortcuts) {
      if (config.command === command) {
        return keys;
      }
    }
    return null;
  }

  /**
   * Show shortcuts dialog
   */
  showShortcutsDialog() {
    const shortcuts = this.getShortcutsByCategory();
    
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    
    let shortcutsHtml = '';
    for (const [category, items] of Object.entries(shortcuts)) {
      shortcutsHtml += `
        <div class="shortcut-category">
          <h3>${category}</h3>
          ${items.map(item => `
            <div class="shortcut-item">
              <span class="shortcut-keys">${this.formatKeys(item.keys)}</span>
              <span class="shortcut-description">${item.description}</span>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    dialog.innerHTML = `
      <div class="dialog shortcuts-dialog">
        <h2>Keyboard Shortcuts</h2>
        <div class="shortcuts-list">
          ${shortcutsHtml}
        </div>
        <div class="dialog-actions">
          <button class="btn-secondary" data-action="reset">Reset to Defaults</button>
          <button class="btn-primary" data-action="close">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('[data-action="close"]').addEventListener('click', () => {
      dialog.remove();
    });
    
    dialog.querySelector('[data-action="reset"]').addEventListener('click', () => {
      this.resetToDefaults();
      dialog.remove();
      this.showShortcutsDialog();
    });
    
    // Close on backdrop click
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.remove();
      }
    });
  }

  /**
   * Format key combination for display
   */
  formatKeys(keys) {
    return keys
      .split('+')
      .map(key => {
        const displayMap = {
          'ctrl': 'Ctrl',
          'cmd': '⌘',
          'alt': 'Alt',
          'shift': 'Shift',
          'escape': 'Esc',
          'delete': 'Del',
          'backspace': 'Backspace',
          'arrowleft': '←',
          'arrowright': '→',
          'arrowup': '↑',
          'arrowdown': '↓',
          'space': 'Space'
        };
        return displayMap[key] || key.toUpperCase();
      })
      .join(' + ');
  }

  /**
   * Clean up
   */
  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.shortcuts.clear();
    this.handlers.clear();
    this.removeAllListeners();
  }
}

// Add EventEmitter functionality
import { EventEmitter } from '@/utils/event-emitter.js';
Object.assign(KeyboardShortcuts.prototype, EventEmitter.prototype);

export { KeyboardShortcuts };