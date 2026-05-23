/**
 * Meme Foundry - Project Storage
 * High-level project storage with versioning, thumbnails, and asset management
 */

import { Logger } from '@/utils/logger.js';
import { CacheManager } from './cache-manager.js';

class ProjectStorage {
  constructor(db) {
    this.logger = new Logger('ProjectStorage');
    this.db = db;
    this.cacheManager = new CacheManager();
    
    // Configuration
    this.config = {
      autoSaveDelay: 2000,
      maxProjects: 100,
      thumbnailSize: 300,
      thumbnailQuality: 0.7,
      compressAssets: true,
      backupEnabled: true,
      maxBackups: 5
    };
    
    // In-memory project cache
    this.projectCache = new Map();
    
    // Current project
    this.currentProject = null;
  }

  /**
   * Initialize project storage
   */
  async initialize() {
    await this.cacheManager.initialize(this.db);
    this.logger.info('Project storage initialized');
  }

  /**
   * Create new project
   */
  async createProject(options = {}) {
    const {
      name = 'Untitled Project',
      canvas = { width: 1080, height: 1080 },
      platform = 'instagram',
      backgroundColor = '#FFFFFF'
    } = options;
    
    const project = {
      id: crypto.randomUUID(),
      name,
      version: 1,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      canvas: {
        width: canvas.width,
        height: canvas.height,
        backgroundColor,
        platform
      },
      sceneData: {
        id: crypto.randomUUID(),
        version: '1.0.0',
        name: 'Scene 1',
        canvas: {
          width: canvas.width,
          height: canvas.height,
          backgroundColor,
          pixelRatio: 1
        },
        layers: [],
        metadata: {
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          platform,
          version: 1
        }
      },
      metadata: {
        platform,
        tags: [],
        description: ''
      }
    };
    
    // Save to database
    await this.db.saveProject(project);
    
    // Update cache
    this.projectCache.set(project.id, project);
    this.currentProject = project;
    
    this.logger.info(`Project created: ${project.id}`);
    
    return project;
  }

  /**
   * Save project
   */
  async saveProject(project) {
    if (!project.id) {
      return this.createProject(project);
    }
    
    // Update metadata
    project.modified = new Date().toISOString();
    project.version = (project.version || 0) + 1;
    
    if (project.sceneData?.metadata) {
      project.sceneData.metadata.modified = project.modified;
      project.sceneData.metadata.version = project.version;
    }
    
    // Save to database
    await this.db.saveProject(project);
    
    // Update cache
    this.projectCache.set(project.id, project);
    
    // Create backup if enabled
    if (this.config.backupEnabled) {
      await this.createBackup(project.id);
    }
    
    this.emit('project:saved', project.id);
    
    return project;
  }

  /**
   * Load project
   */
  async loadProject(projectId) {
    // Check cache first
    if (this.projectCache.has(projectId)) {
      const project = this.projectCache.get(projectId);
      this.currentProject = project;
      this.emit('project:loaded', project);
      return project;
    }
    
    // Load from database
    const project = await this.db.loadProject(projectId);
    
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    
    // Update cache
    this.projectCache.set(projectId, project);
    this.currentProject = project;
    
    this.emit('project:loaded', project);
    
    return project;
  }

  /**
   * Delete project
   */
  async deleteProject(projectId) {
    await this.db.deleteProject(projectId);
    
    // Remove from cache
    this.projectCache.delete(projectId);
    
    // Clear current if deleted
    if (this.currentProject?.id === projectId) {
      this.currentProject = null;
    }
    
    // Delete backups
    await this.deleteBackups(projectId);
    
    this.emit('project:deleted', projectId);
    
    return true;
  }

  /**
   * List all projects (metadata only)
   */
  async listProjects() {
    const projects = await this.db.getAllProjects();
    
    // Load thumbnails
    for (const project of projects) {
      const thumbnail = await this.db.getThumbnail(project.id);
      if (thumbnail) {
        project.thumbnail = URL.createObjectURL(thumbnail);
      }
    }
    
    return projects.sort((a, b) => 
      new Date(b.modified) - new Date(a.modified)
    );
  }

  /**
   * Save project thumbnail
   */
  async saveThumbnail(projectId, canvas) {
    try {
      // Resize canvas for thumbnail
      const thumbCanvas = document.createElement('canvas');
      const ratio = Math.min(
        this.config.thumbnailSize / canvas.width,
        this.config.thumbnailSize / canvas.height
      );
      
      thumbCanvas.width = Math.round(canvas.width * ratio);
      thumbCanvas.height = Math.round(canvas.height * ratio);
      
      const ctx = thumbCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      
      // Convert to blob
      const blob = await new Promise(resolve => {
        thumbCanvas.toBlob(resolve, 'image/jpeg', this.config.thumbnailQuality);
      });
      
      // Save to database
      await this.db.saveThumbnail(projectId, blob);
      
      // Invalidate cache
      this.projectCache.delete(projectId);
      
      return true;
    } catch (error) {
      this.logger.error('Failed to save thumbnail:', error);
      return false;
    }
  }

  /**
   * Save project asset
   */
  async saveAsset(projectId, asset) {
    return this.db.saveAsset(projectId, asset);
  }

  /**
   * Get project assets
   */
  async getAssets(projectId) {
    return this.db.getProjectAssets(projectId);
  }

  /**
   * Delete asset
   */
  async deleteAsset(assetId) {
    return this.db.deleteAsset(assetId);
  }

  /**
   * Create backup
   */
  async createBackup(projectId) {
    try {
      const project = await this.loadProject(projectId);
      
      const backup = {
        projectId,
        timestamp: Date.now(),
        data: JSON.parse(JSON.stringify(project.sceneData))
      };
      
      // Get existing backups
      const backups = await this.getBackups(projectId);
      
      // Add new backup
      backups.push(backup);
      
      // Limit backups
      while (backups.length > this.config.maxBackups) {
        backups.shift();
      }
      
      // Save backups
      localStorage.setItem(
        `meme-foundry-backups-${projectId}`,
        JSON.stringify(backups)
      );
      
    } catch (error) {
      this.logger.warn('Failed to create backup:', error);
    }
  }

  /**
   * Get backups for project
   */
  getBackups(projectId) {
    try {
      const data = localStorage.getItem(`meme-foundry-backups-${projectId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(projectId, backupIndex) {
    const backups = this.getBackups(projectId);
    
    if (backupIndex < 0 || backupIndex >= backups.length) {
      throw new Error('Invalid backup index');
    }
    
    const backup = backups[backupIndex];
    const project = await this.loadProject(projectId);
    
    project.sceneData = backup.data;
    await this.saveProject(project);
    
    this.emit('project:restored', projectId);
    
    return project;
  }

  /**
   * Delete backups
   */
  async deleteBackups(projectId) {
    localStorage.removeItem(`meme-foundry-backups-${projectId}`);
  }

  /**
   * Export project as file
   */
  async exportProject(projectId) {
    const project = await this.loadProject(projectId);
    
    const exportData = {
      format: 'meme-foundry-project',
      version: '1.0.0',
      project: {
        name: project.name,
        canvas: project.canvas,
        sceneData: project.sceneData,
        metadata: project.metadata
      }
    };
    
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    
    return {
      blob,
      filename: `${project.name.replace(/[^a-z0-9]/gi, '-')}.meme.json`
    };
  }

  /**
   * Import project from file
   */
  async importProject(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const importData = JSON.parse(e.target.result);
          
          if (importData.format !== 'meme-foundry-project') {
            throw new Error('Invalid project file format');
          }
          
          const project = await this.createProject({
            name: importData.project.name || 'Imported Project',
            canvas: importData.project.canvas
          });
          
          // Import scene data
          project.sceneData = importData.project.sceneData;
          project.metadata = importData.project.metadata || {};
          
          await this.saveProject(project);
          
          resolve(project);
          
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Duplicate project
   */
  async duplicateProject(projectId) {
    const project = await this.loadProject(projectId);
    
    const duplicate = JSON.parse(JSON.stringify(project));
    duplicate.id = crypto.randomUUID();
    duplicate.name = `${project.name} (Copy)`;
    duplicate.created = new Date().toISOString();
    duplicate.modified = new Date().toISOString();
    duplicate.version = 1;
    
    if (duplicate.sceneData) {
      duplicate.sceneData.id = crypto.randomUUID();
      duplicate.sceneData.metadata.created = duplicate.created;
      duplicate.sceneData.metadata.modified = duplicate.modified;
      duplicate.sceneData.metadata.version = 1;
    }
    
    await this.db.saveProject(duplicate);
    this.projectCache.set(duplicate.id, duplicate);
    
    return duplicate;
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    const projects = await this.db.getAllProjects();
    const estimate = await this.db.getStorageEstimate();
    
    return {
      projectCount: projects.length,
      maxProjects: this.config.maxProjects,
      storage: estimate ? {
        used: estimate.usage,
        quota: estimate.quota,
        percentage: estimate.percentage.toFixed(1) + '%'
      } : null,
      cache: this.cacheManager.getStats()
    };
  }

  /**
   * Clean up old data
   */
  async cleanup() {
    await this.cacheManager.cleanup();
  }

  /**
   * Destroy
   */
  destroy() {
    this.cacheManager.destroy();
    this.projectCache.clear();
    this.currentProject = null;
  }
}

// Add EventEmitter
import { EventEmitter } from '@/utils/event-emitter.js';
Object.assign(ProjectStorage.prototype, EventEmitter.prototype);

export { ProjectStorage };