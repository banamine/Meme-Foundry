/**
 * Meme Foundry - Undo/Redo System
 * Manages command history for undo/redo operations
 */

import { Logger } from '@/utils/logger.js';

class UndoRedo {
  constructor(state) {
    this.logger = new Logger('UndoRedo');
    this.state = state;
    
    // Command history
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 50;
    
    // Transaction support
    this.currentTransaction = null;
    this.transactionCommands = [];
    
    // Bound methods
    this.undo = this.undo.bind(this);
    this.redo = this.redo.bind(this);
  }

  /**
   * Initialize undo/redo system
   */
  initialize() {
    this.logger.info('Initializing undo/redo system');
    
    // Register keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        this.redo();
      }
    });
  }

  /**
   * Execute a command and add to undo stack
   */
  execute(command) {
    if (!command || !command.execute) {
      throw new Error('Invalid command: missing execute method');
    }
    
    // Execute the command
    command.execute();
    
    // Add to undo stack
    this.addToUndoStack(command);
    
    // Clear redo stack (new action invalidates redo)
    this.redoStack = [];
    
    this.logger.debug(`Executed: ${command.name || 'unnamed command'}`);
    this.emit('history:changed', this.getHistoryState());
  }

  /**
   * Add command to undo stack
   */
  addToUndoStack(command) {
    this.undoStack.push({
      command,
      timestamp: Date.now()
    });
    
    // Limit history size
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  /**
   * Undo last command
   */
  undo() {
    if (this.undoStack.length === 0) {
      this.logger.debug('Nothing to undo');
      return false;
    }
    
    const entry = this.undoStack.pop();
    const command = entry.command;
    
    try {
      if (command.undo) {
        command.undo();
      }
      
      this.redoStack.push(entry);
      
      this.logger.debug(`Undone: ${command.name || 'unnamed command'}`);
      this.emit('history:changed', this.getHistoryState());
      return true;
      
    } catch (error) {
      this.logger.error('Undo failed:', error);
      // Put it back
      this.undoStack.push(entry);
      return false;
    }
  }

  /**
   * Redo last undone command
   */
  redo() {
    if (this.redoStack.length === 0) {
      this.logger.debug('Nothing to redo');
      return false;
    }
    
    const entry = this.redoStack.pop();
    const command = entry.command;
    
    try {
      if (command.redo) {
        command.redo();
      } else if (command.execute) {
        command.execute();
      }
      
      this.undoStack.push(entry);
      
      this.logger.debug(`Redone: ${command.name || 'unnamed command'}`);
      this.emit('history:changed', this.getHistoryState());
      return true;
      
    } catch (error) {
      this.logger.error('Redo failed:', error);
      this.redoStack.push(entry);
      return false;
    }
  }

  /**
   * Begin a transaction (group multiple commands)
   */
  beginTransaction(name = 'Transaction') {
    if (this.currentTransaction) {
      this.logger.warn('Transaction already in progress');
      return;
    }
    
    this.currentTransaction = name;
    this.transactionCommands = [];
    
    this.logger.debug(`Transaction started: ${name}`);
  }

  /**
   * Add command to current transaction
   */
  addToTransaction(command) {
    if (!this.currentTransaction) {
      this.execute(command);
      return;
    }
    
    // Execute immediately
    command.execute();
    this.transactionCommands.push(command);
  }

  /**
   * Commit current transaction
   */
  commitTransaction() {
    if (!this.currentTransaction) {
      this.logger.warn('No transaction in progress');
      return;
    }
    
    // Create a composite command
    const compositeCommand = this.createCompositeCommand(
      this.currentTransaction,
      this.transactionCommands
    );
    
    this.addToUndoStack(compositeCommand);
    this.redoStack = [];
    
    this.currentTransaction = null;
    this.transactionCommands = [];
    
    this.logger.debug('Transaction committed');
    this.emit('history:changed', this.getHistoryState());
  }

  /**
   * Rollback current transaction
   */
  rollbackTransaction() {
    if (!this.currentTransaction) return;
    
    // Undo all commands in reverse order
    for (let i = this.transactionCommands.length - 1; i >= 0; i--) {
      const command = this.transactionCommands[i];
      if (command.undo) {
        command.undo();
      }
    }
    
    this.currentTransaction = null;
    this.transactionCommands = [];
    
    this.logger.debug('Transaction rolled back');
  }

  /**
   * Create composite command from multiple commands
   */
  createCompositeCommand(name, commands) {
    return {
      name,
      execute: () => {
        commands.forEach(cmd => cmd.execute());
      },
      undo: () => {
        // Undo in reverse order
        for (let i = commands.length - 1; i >= 0; i--) {
          if (commands[i].undo) {
            commands[i].undo();
          }
        }
      },
      redo: () => {
        commands.forEach(cmd => {
          if (cmd.redo) {
            cmd.redo();
          } else if (cmd.execute) {
            cmd.execute();
          }
        });
      }
    };
  }

  /**
   * Create a layer add command
   */
  createAddLayerCommand(sceneManager, layer) {
    return {
      name: `Add ${layer.type} layer`,
      layerId: layer.id,
      execute: () => {
        sceneManager.addLayer(layer.type, layer);
      },
      undo: () => {
        sceneManager.removeLayer(layer.id);
      }
    };
  }

  /**
   * Create a layer remove command
   */
  createRemoveLayerCommand(sceneManager, layer) {
    return {
      name: `Remove ${layer.type} layer`,
      layerData: JSON.parse(JSON.stringify(layer)),
      execute: () => {
        sceneManager.removeLayer(layer.id);
      },
      undo: () => {
        sceneManager.addLayer(layer.type, this.layerData);
      }
    };
  }

  /**
   * Create a layer update command
   */
  createUpdateLayerCommand(sceneManager, layerId, newProperties, oldProperties) {
    return {
      name: 'Update layer',
      layerId,
      newProperties,
      oldProperties,
      execute: () => {
        sceneManager.updateLayer(layerId, this.newProperties);
      },
      undo: () => {
        sceneManager.updateLayer(layerId, this.oldProperties);
      }
    };
  }

  /**
   * Create a layer transform command
   */
  createTransformCommand(sceneManager, layerId, newTransform, oldTransform) {
    return {
      name: 'Transform layer',
      layerId,
      newTransform,
      oldTransform,
      execute: () => {
        sceneManager.updateLayerTransform(layerId, this.newTransform);
      },
      undo: () => {
        sceneManager.updateLayerTransform(layerId, this.oldTransform);
      }
    };
  }

  /**
   * Create a layer reorder command
   */
  createReorderCommand(sceneManager, layerId, fromIndex, toIndex) {
    return {
      name: 'Reorder layer',
      layerId,
      fromIndex,
      toIndex,
      execute: () => {
        sceneManager.moveLayer(layerId, this.toIndex);
      },
      undo: () => {
        sceneManager.moveLayer(layerId, this.fromIndex);
      }
    };
  }

  /**
   * Get history state
   */
  getHistoryState() {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length
    };
  }

  /**
   * Get history entries
   */
  getHistory() {
    return {
      undoStack: this.undoStack.map(entry => ({
        name: entry.command.name || 'Unnamed',
        timestamp: entry.timestamp
      })),
      redoStack: this.redoStack.map(entry => ({
        name: entry.command.name || 'Unnamed',
        timestamp: entry.timestamp
      }))
    };
  }

  /**
   * Clear all history
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.currentTransaction = null;
    this.transactionCommands = [];
    
    this.emit('history:changed', this.getHistoryState());
  }

  /**
   * Set maximum history size
   */
  setMaxHistory(max) {
    this.maxHistory = Math.max(1, max);
    
    // Trim stacks if needed
    while (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    while (this.redoStack.length > this.maxHistory) {
      this.redoStack.shift();
    }
  }

  /**
   * Clean up
   */
  destroy() {
    this.clear();
  }
}

// Add EventEmitter functionality
import { EventEmitter } from '@/utils/event-emitter.js';
Object.assign(UndoRedo.prototype, EventEmitter.prototype);

export { UndoRedo };