/**
 * Meme Foundry - Recovery Manager
 * Crash recovery and data integrity system
 */

import { Logger } from '@/utils/logger.js';

class RecoveryManager {
  constructor(db) {
    this.logger = new Logger('RecoveryManager');
    this.db = db;
    
    // Recovery configuration
    this.config = {
      enabled: true,
      saveInterval: 15000,      // 15 seconds
      maxRecoveryAge: 86400000, // 24 hours
      maxRecoverySize: 10 * 1024 * 1024, // 10MB
      version: '1.0.0'
    };
    
    // Recovery state
    this.lastSave = 0;
    this.saveTimer = null;
    this.recoveryData = null;
    
    // Bound methods
    this.saveRecoveryData = this.saveRecoveryData.bind(this);
  }

  /**
   * Initialize recovery manager
   */
  async initialize() {
    this.logger.info('Initializing recovery manager');
    
    // Load any existing recovery data
    await this.checkForRecovery();
    
    // Start periodic saving
    if (this.config.enabled) {
      this.startPeriodicSave();
    }
    
    // Save on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveRecoveryData();
      }
    });
    
    // Save before unload
    window.addEventListener('beforeunload', () => {
      this.saveRecoveryData();
    });
  }

  /**
   * Start periodic recovery save
   */
  startPeriodicSave() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }
    
    this.saveTimer = setInterval(() => {
      this.saveRecoveryData();
    }, this.config.saveInterval);
  }

  /**
   * Save recovery data
   */
  async saveRecoveryData(sceneData = null) {
    if (!this.config.enabled) return;
    
    try {
      const data = {
        timestamp: Date.now(),
        version: this.config.version,
        projectId: this.getCurrentProjectId(),
        projectName: this.getCurrentProjectName(),
        sceneData: sceneData || this.getCurrentSceneData(),
        canvas: this.getCurrentCanvas(),
        windowLocation: window.location.href,
        userAgent: navigator.userAgent
      };
      
      // Check data size
      const json = JSON.stringify(data);
      if (json.length > this.config.maxRecoverySize) {
        this.logger.warn('Recovery data too large, truncating');
        data.sceneData = this.truncateSceneData(data.sceneData);
      }
      
      // Save to localStorage
      localStorage.setItem('meme-foundry-recovery', JSON.stringify(data));
      
      // Also save to sessionStorage as backup
      try {
        sessionStorage.setItem('meme-foundry-recovery-backup', JSON.stringify(data));
      } catch (e) {
        // Session storage might be full
      }
      
      this.lastSave = Date.now();
      
      this.emit('recovery:saved');
      
    } catch (error) {
      this.logger.error('Failed to save recovery data:', error);
    }
  }

  /**
   * Check for recovery data
   */
  async checkForRecovery() {
    try {
      // Check localStorage
      let data = localStorage.getItem('meme-foundry-recovery');
      
      // Fallback to sessionStorage
      if (!data) {
        data = sessionStorage.getItem('meme-foundry-recovery-backup');
      }
      
      if (!data) return null;
      
      const recoveryData = JSON.parse(data);
      
      // Check age
      const age = Date.now() - recoveryData.timestamp;
      
      if (age > this.config.maxRecoveryAge) {
        // Too old, clear it
        this.clearRecoveryData();
        return null;
      }
      
      this.recoveryData = recoveryData;
      
      this.logger.info(`Recovery data found (${Math.round(age / 1000 / 60)} minutes old)`);
      this.emit('recovery:found', recoveryData);
      
      return recoveryData;
      
    } catch (error) {
      this.logger.error('Failed to check recovery data:', error);
      return null;
    }
  }

  /**
   * Recover project from saved data
   */
  async recover() {
    if (!this.recoveryData) {
      throw new Error('No recovery data available');
    }
    
    this.logger.info('Recovering project from recovery data');
    
    this.emit('recovery:recovering', this.recoveryData);
    
    return this.recoveryData;
  }

  /**
   * Discard recovery data
   */
  discardRecovery() {
    this.clearRecoveryData();
    this.recoveryData = null;
    this.emit('recovery:discarded');
  }

  /**
   * Clear recovery data
   */
  clearRecoveryData() {
    localStorage.removeItem('meme-foundry-recovery');
    sessionStorage.removeItem('meme-foundry-recovery-backup');
  }

  /**
   * Get current project ID
   */
  getCurrentProjectId() {
    try {
      return window.__MEME_FOUNDRY__?.state?.getState('project.id') || null;
    } catch {
      return null;
    }
  }

  /**
   * Get current project name
   */
  getCurrentProjectName() {
    try {
      return window.__MEME_FOUNDRY__?.state?.getState('project.name') || 'Untitled';
    } catch {
      return 'Untitled';
    }
  }

  /**
   * Get current scene data
   */
  getCurrentSceneData() {
    try {
      return window.__MEME_FOUNDRY__?.state?.getState('project.sceneData') || null;
    } catch {
      return null;
    }
  }

  /**
   * Get current canvas settings
   */
  getCurrentCanvas() {
    try {
      return window.__MEME_FOUNDRY__?.state?.getState('canvas') || null;
    } catch {
      return null;
    }
  }

  /**
   * Truncate scene data to fit size limit
   */
  truncateSceneData(sceneData) {
    if (!sceneData) return null;
    
    // Create a simplified version
    const truncated = {
      id: sceneData.id,
      name: sceneData.name,
      canvas: sceneData.canvas,
      metadata: sceneData.metadata,
      layers: (sceneData.layers || []).map(layer => ({
        id: layer.id,
        type: layer.type,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        transform: layer.transform,
        // Include minimal type-specific data
        ...(layer.type === 'text' && { text: { content: layer.text?.content?.substring(0, 100) } })
      }))
    };
    
    return truncated;
  }

  /**
   * Verify data integrity
   */
  verifyIntegrity(data) {
    const checks = [
      { name: 'timestamp', test: () => data.timestamp && data.timestamp > 0 },
      { name: 'version', test: () => data.version === this.config.version },
      { name: 'sceneData', test: () => data.sceneData && typeof data.sceneData === 'object' },
      { name: 'canvas', test: () => data.canvas && data.canvas.width && data.canvas.height }
    ];
    
    const results = checks.map(check => ({
      name: check.name,
      passed: check.test()
    }));
    
    return {
      valid: results.every(r => r.passed),
      results
    };
  }

  /**
   * Get recovery status
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      hasRecoveryData: !!this.recoveryData,
      lastSave: this.lastSave,
      secondsSinceLastSave: this.lastSave ? Math.round((Date.now() - this.lastSave) / 1000) : null,
      recoveryAge: this.recoveryData ? Math.round((Date.now() - this.recoveryData.timestamp) / 1000 / 60) : null
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
    
    if (this.config.enabled) {
      this.startPeriodicSave();
    } else {
      this.stopPeriodicSave();
    }
  }

  /**
   * Stop periodic save
   */
  stopPeriodicSave() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  /**
   * Export recovery data for debugging
   */
  exportRecoveryData() {
    if (!this.recoveryData) return null;
    
    return {
      ...this.recoveryData,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Destroy
   */
  destroy() {
    this.stopPeriodicSave();
    this.recoveryData = null;
  }
}

// Add EventEmitter
import { EventEmitter } from '@/utils/event-emitter.js';
Object.assign(RecoveryManager.prototype, EventEmitter.prototype);

export { RecoveryManager };