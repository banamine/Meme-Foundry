/**
 * Meme Foundry - Autosave System
 * Automatic project saving with crash recovery
 */

import { Logger } from '@/utils/logger.js';

class Autosave {
  constructor(state) {
    this.logger = new Logger('Autosave');
    this.state = state;
    
    // Configuration
    this.config = {
      interval: 30000,        // 30 seconds
      maxRetries: 3,          // Max save retries
      retryDelay: 1000,       // 1 second between retries
      saveOnChange: true,     // Save on any change
      debounceDelay: 2000,    // 2 second debounce for change saves
      backupLimit: 5,         // Keep last 5 backups
      recoveryEnabled: true   // Enable crash recovery
    };
    
    // State
    this.intervalId = null;
    this.debounceId = null;
    this.lastSaved = null;
    this.pendingChanges = false;
    this.saveInProgress = false;
    this.retryCount = 0;
    this.backups = [];
  }

  /**
   * Initialize autosave system
   */
  async initialize() {
    this.logger.info('Initializing autosave system');
    
    // Load saved configuration
    await this.loadConfig();
    
    // Check for crash recovery data
    if (this.config.recoveryEnabled) {
      await this.checkRecovery();
    }
    
    // Start periodic saving
    this.startPeriodicSave();
    
    // Listen for changes
    if (this.config.saveOnChange) {
      this.listenForChanges();
    }
    
    // Save before unload
    window.addEventListener('beforeunload', (event) => {
      this.saveBeforeUnload(event);
    });
    
    // Save on visibility change (tab hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveImmediately();
      }
    });
    
    this.emit('autosave:initialized');
  }

  /**
   * Start periodic saving
   */
  startPeriodicSave() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    this.intervalId = setInterval(() => {
      this.saveIfNeeded();
    }, this.config.interval);
    
    this.logger.debug(`Periodic save started (${this.config.interval}ms interval)`);
  }

  /**
   * Listen for state changes
   */
  listenForChanges() {
    // Debounced save on changes
    const originalSetState = this.state.setState.bind(this.state);
    
    this.state.setState = (path, value, options = {}) => {
      originalSetState(path, value, options);
      
      // Only trigger for project-related changes
      if (path.startsWith('project.sceneData') || 
          path.startsWith('canvas') ||
          path.startsWith('media')) {
        this.scheduleChangeSave();
      }
    };
  }

  /**
   * Schedule change-triggered save
   */
  scheduleChangeSave() {
    this.pendingChanges = true;
    
    if (this.debounceId) {
      clearTimeout(this.debounceId);
    }
    
    this.debounceId = setTimeout(() => {
      this.saveIfNeeded();
    }, this.config.debounceDelay);
  }

  /**
   * Save if there are unsaved changes
   */
  async saveIfNeeded(force = false) {
    if (this.saveInProgress) return;
    
    if (!force && !this.pendingChanges && !this.hasRecentChanges()) {
      return;
    }
    
    await this.performSave();
  }

  /**
   * Save immediately
   */
  async saveImmediately() {
    if (this.saveInProgress) {
      // Wait for current save to complete then try again
      await this.waitForSave();
    }
    
    await this.performSave();
  }

  /**
   * Perform actual save operation
   */
  async performSave() {
    if (this.saveInProgress) return;
    
    this.saveInProgress = true;
    
    try {
      // Save project data
      const projectId = await this.state.saveProject();
      
      // Save recovery data
      if (this.config.recoveryEnabled) {
        await this.saveRecoveryData();
      }
      
      // Update state
      this.lastSaved = Date.now();
      this.pendingChanges = false;
      this.retryCount = 0;
      
      // Create backup
      await this.createBackup();
      
      this.emit('autosave:saved', {
        projectId,
        timestamp: this.lastSaved
      });
      
      this.logger.debug('Project saved successfully');
      
    } catch (error) {
      this.logger.error('Save failed:', error);
      this.retryCount++;
      
      if (this.retryCount < this.config.maxRetries) {
        this.logger.info(`Retrying save (${this.retryCount}/${this.config.maxRetries})`);
        setTimeout(() => this.performSave(), this.config.retryDelay);
      } else {
        this.emit('autosave:error', error);
        this.retryCount = 0;
      }
      
    } finally {
      this.saveInProgress = false;
    }
  }

  /**
   * Save recovery data
   */
  async saveRecoveryData() {
    const recoveryData = {
      timestamp: Date.now(),
      projectId: this.state.getState('project.id'),
      projectName: this.state.getState('project.name'),
      sceneData: this.state.getState('project.sceneData'),
      canvas: this.state.getState('canvas'),
      version: '1.0.0'
    };
    
    try {
      localStorage.setItem(
        'meme-foundry-recovery',
        JSON.stringify(recoveryData)
      );
      
      this.logger.debug('Recovery data saved');
      
    } catch (error) {
      this.logger.warn('Failed to save recovery data:', error);
    }
  }

  /**
   * Check for crash recovery data
   */
  async checkRecovery() {
    try {
      const data = localStorage.getItem('meme-foundry-recovery');
      
      if (data) {
        const recoveryData = JSON.parse(data);
        const age = Date.now() - recoveryData.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (age < maxAge) {
          this.logger.info('Recovery data found');
          this.state.setRecoveryData(recoveryData);
        } else {
          // Too old, clear it
          localStorage.removeItem('meme-foundry-recovery');
        }
      }
      
    } catch (error) {
      this.logger.warn('Failed to check recovery data:', error);
    }
  }

  /**
   * Clear recovery data
   */
  async clearRecovery() {
    try {
      localStorage.removeItem('meme-foundry-recovery');
      this.logger.debug('Recovery data cleared');
    } catch (error) {
      this.logger.warn('Failed to clear recovery data:', error);
    }
  }

  /**
   * Create backup
   */
  async createBackup() {
    try {
      const backup = {
        timestamp: Date.now(),
        sceneData: JSON.parse(
          JSON.stringify(this.state.getState('project.sceneData'))
        )
      };
      
      this.backups.push(backup);
      
      // Limit backups
      while (this.backups.length > this.config.backupLimit) {
        this.backups.shift();
      }
      
      // Store backups
      localStorage.setItem(
        'meme-foundry-backups',
        JSON.stringify(this.backups)
      );
      
    } catch (error) {
      this.logger.warn('Failed to create backup:', error);
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(index) {
    if (index < 0 || index >= this.backups.length) {
      throw new Error('Invalid backup index');
    }
    
    const backup = this.backups[index];
    this.state.setState('project.sceneData', backup.sceneData);
    
    this.emit('autosave:restored', backup);
    this.logger.info(`Restored backup from ${new Date(backup.timestamp).toLocaleString()}`);
  }

  /**
   * Save before unload
   */
  async saveBeforeUnload(event) {
    if (this.state.hasUnsavedChanges() && this.pendingChanges) {
      try {
        await this.performSave();
      } catch (error) {
        this.logger.error('Failed to save before unload:', error);
      }
    }
  }

  /**
   * Check if there have been recent changes
   */
  hasRecentChanges() {
    if (!this.lastSaved) return true;
    
    const modified = this.state.getState('project.modified');
    if (modified) {
      const modifiedTime = new Date(modified).getTime();
      return modifiedTime > this.lastSaved;
    }
    
    return false;
  }

  /**
   * Wait for current save to complete
   */
  async waitForSave() {
    if (!this.saveInProgress) return;
    
    return new Promise(resolve => {
      const check = () => {
        if (!this.saveInProgress) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  /**
   * Load saved configuration
   */
  async loadConfig() {
    try {
      const saved = localStorage.getItem('meme-foundry-autosave-config');
      if (saved) {
        const config = JSON.parse(saved);
        this.config = { ...this.config, ...config };
      }
    } catch (error) {
      this.logger.warn('Failed to load autosave config:', error);
    }
  }

  /**
   * Save configuration
   */
  saveConfig() {
    try {
      localStorage.setItem(
        'meme-foundry-autosave-config',
        JSON.stringify(this.config)
      );
    } catch (error) {
      this.logger.warn('Failed to save autosave config:', error);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    
    // Restart periodic save if interval changed
    if (newConfig.interval) {
      this.startPeriodicSave();
    }
  }

  /**
   * Get save status
   */
  getStatus() {
    return {
      lastSaved: this.lastSaved,
      pendingChanges: this.pendingChanges,
      saveInProgress: this.saveInProgress,
      retryCount: this.retryCount,
      backupCount: this.backups.length
    };
  }

  /**
   * Get backup list
   */
  getBackups() {
    return this.backups.map((backup, index) => ({
      index,
      timestamp: backup.timestamp,
      date: new Date(backup.timestamp).toLocaleString()
    }));
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    if (this.debounceId) {
      clearTimeout(this.debounceId);
    }
    
    // Final save
    this.saveImmediately().catch(() => {});
  }
}

// Add EventEmitter functionality
import { EventEmitter } from '@/utils/event-emitter.js';
Object.assign(Autosave.prototype, EventEmitter.prototype);

export { Autosave };