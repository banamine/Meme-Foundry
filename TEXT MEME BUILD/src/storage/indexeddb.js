/**
 * Meme Foundry - IndexedDB Storage
 * Persistent project storage with IndexedDB
 */

import { Logger } from '@/utils/logger.js';
import { openDB } from 'idb';

class IndexedDBStorage {
  constructor() {
    this.logger = new Logger('IndexedDB');
    this.db = null;
    this.dbName = 'meme-foundry-db';
    this.version = 1;
    this.ready = false;
  }

  /**
   * Initialize database
   */
  async initialize() {
    try {
      this.db = await openDB(this.dbName, this.version, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // Create object stores if they don't exist
          if (!db.objectStoreNames.contains('projects')) {
            const projectStore = db.createObjectStore('projects', { 
              keyPath: 'id' 
            });
            projectStore.createIndex('modified', 'modified', { unique: false });
            projectStore.createIndex('name', 'name', { unique: false });
          }
          
          if (!db.objectStoreNames.contains('assets')) {
            const assetStore = db.createObjectStore('assets', { 
              keyPath: 'id' 
            });
            assetStore.createIndex('projectId', 'projectId', { unique: false });
          }
          
          if (!db.objectStoreNames.contains('thumbnails')) {
            db.createObjectStore('thumbnails', { 
              keyPath: 'projectId' 
            });
          }
          
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { 
              keyPath: 'key' 
            });
          }
          
          if (!db.objectStoreNames.contains('exportHistory')) {
            const historyStore = db.createObjectStore('exportHistory', { 
              keyPath: 'id',
              autoIncrement: true
            });
            historyStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        }
      });
      
      this.ready = true;
      this.logger.info('IndexedDB initialized');
      return this;
      
    } catch (error) {
      this.logger.error('Failed to initialize IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Save project
   */
  async saveProject(project) {
    if (!this.ready) throw new Error('Database not initialized');
    
    try {
      const tx = this.db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      
      await store.put(project);
      await tx.done;
      
      this.logger.debug(`Project saved: ${project.id}`);
      return project.id;
      
    } catch (error) {
      this.logger.error('Failed to save project:', error);
      throw error;
    }
  }

  /**
   * Load project by ID
   */
  async loadProject(id) {
    if (!this.ready) throw new Error('Database not initialized');
    
    try {
      const project = await this.db.get('projects', id);
      
      if (!project) {
        throw new Error(`Project not found: ${id}`);
      }
      
      this.logger.debug(`Project loaded: ${id}`);
      return project;
      
    } catch (error) {
      this.logger.error('Failed to load project:', error);
      throw error;
    }
  }

  /**
   * Get all projects (metadata only)
   */
  async getAllProjects() {
    if (!this.ready) throw new Error('Database not initialized');
    
    try {
      const projects = await this.db.getAll('projects');
      
      // Return metadata only (no full scene data)
      return projects.map(p => ({
        id: p.id,
        name: p.name,
        created: p.created,
        modified: p.modified,
        canvas: p.canvas,
        layerCount: p.sceneData?.layers?.length || 0,
        thumbnailUrl: p.thumbnailUrl
      }));
      
    } catch (error) {
      this.logger.error('Failed to get projects:', error);
      throw error;
    }
  }

  /**
   * Delete project
   */
  async deleteProject(id) {
    if (!this.ready) throw new Error('Database not initialized');
    
    try {
      const tx = this.db.transaction(['projects', 'assets', 'thumbnails'], 'readwrite');
      
      // Delete project
      await tx.objectStore('projects').delete(id);
      
      // Delete associated assets
      const assetIndex = tx.objectStore('assets').index('projectId');
      let cursor = await assetIndex.openCursor(IDBKeyRange.only(id));
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      
      // Delete thumbnail
      await tx.objectStore('thumbnails').delete(id);
      
      await tx.done;
      
      this.logger.debug(`Project deleted: ${id}`);
      return true;
      
    } catch (error) {
      this.logger.error('Failed to delete project:', error);
      throw error;
    }
  }

  /**
   * Save asset for project
   */
  async saveAsset(projectId, asset) {
    if (!this.ready) throw new Error('Database not initialized');
    
    try {
      await this.db.put('assets', {
        ...asset,
        projectId
      });
      
      this.logger.debug(`Asset saved: ${asset.id}`);
      return asset.id;
      
    } catch (error) {
      this.logger.error('Failed to save asset:', error);
      throw error;
    }
  }

  /**
   * Get assets for project
   */
  async getProjectAssets(projectId) {
    if (!this.ready) throw new Error('Database not initialized');
    
    try {
      const index = this.db.transaction('assets').store.index('projectId');
      return await index.getAll(projectId);
      
    } catch (error) {
      this.logger.error('Failed to get assets:', error);
      throw error;
    }
  }

  /**
   * Delete asset
   */
  async deleteAsset(id) {
    if (!this.ready) throw new Error('Database not initialized');
    
    try {
      await this.db.delete('assets', id);
      this.logger.debug(`Asset deleted: ${id}`);
      return true;
      
    } catch (error) {
      this.logger.error('Failed to delete asset:', error);
      throw error;
    }
  }

  /**
   * Save thumbnail
   */
  async saveThumbnail(projectId, blob) {
    if (!this.ready) throw new Error('Database not initialized');
    
    try {
      await this.db.put('thumbnails', {
        projectId,
        blob,
        timestamp: Date.now()
      });
      
      this.logger.debug(`Thumbnail saved for project: ${projectId}`);
      
    } catch (error) {
      this.logger.error('Failed to save thumbnail:', error);
      throw error;
    }
  }

  /**
   * Get thumbnail
   */
  async getThumbnail(projectId) {
    if (!this.ready) throw new Error('Database not initialized');
    
    try {
      const entry = await this.db.get('thumbnails', projectId);
      return entry?.blob || null;
      
    } catch (error) {
      this.logger.error('Failed to get thumbnail:', error);
      return null;
    }
  }

  /**
   * Save setting
   */
  async saveSetting(key, value) {
    if (!this.ready) throw new Error('Database not initialized');
    
    try {
      await this.db.put('settings', { key, value });
      
    } catch (error) {
      this.logger.error('Failed to save setting:', error);
      throw error;
    }
  }

  /**
   * Get setting
   */
  async getSetting(key, defaultValue = null) {
    if (!this.ready) throw new Error('Database not initialized');
    
    try {
      const entry = await this.db.get('settings', key);
      return entry?.value ?? defaultValue;
      
    } catch (error) {
      this.logger.error('Failed to get setting:', error);
      return defaultValue;
    }
  }

  /**
   * Get all settings
   */
  async getAllSettings() {
    if (!this.ready) throw new Error('Database not initialized');
    
    try {
      const entries = await this.db.getAll('settings');
      const settings = {};
      entries.forEach(entry => {
        settings[entry.key] = entry.value;
      });
      return settings;
      
    } catch (error) {
      this.logger.error('Failed to get settings:', error);
      return {};
    }
  }

  /**
   * Save export history entry
   */
  async saveExportHistory(entry) {
    if (!this.ready) throw new Error('Database not initialized');
    
    try {
      await this.db.add('exportHistory', {
        ...entry,
        timestamp: Date.now()
      });
      
    } catch (error) {
      this.logger.error('Failed to save export history:', error);
      throw error;
    }
  }

  /**
   * Get export history
   */
  async getExportHistory(limit = 50) {
    if (!this.ready) throw new Error('Database not initialized');
    
    try {
      const index = this.db.transaction('exportHistory').store.index('timestamp');
      const entries = await index.getAll(null, limit);
      return entries.reverse();
      
    } catch (error) {
      this.logger.error('Failed to get export history:', error);
      return [];
    }
  }

  /**
   * Get database size estimate
   */
  async getStorageEstimate() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        percentage: (estimate.usage / estimate.quota) * 100
      };
    }
    return null;
  }

  /**
   * Check if storage is near quota
   */
  async isStorageNearQuota() {
    const estimate = await this.getStorageEstimate();
    if (estimate) {
      return estimate.percentage > 80;
    }
    return false;
  }

  /**
   * Clean up old data
   */
  async cleanup(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
    if (!this.ready) throw new Error('Database not initialized');
    
    const cutoff = Date.now() - maxAge;
    let cleanedCount = 0;
    
    try {
      // Clean old export history
      const tx = this.db.transaction('exportHistory', 'readwrite');
      const index = tx.store.index('timestamp');
      let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoff));
      
      while (cursor) {
        await cursor.delete();
        cleanedCount++;
        cursor = await cursor.continue();
      }
      
      await tx.done;
      
      this.logger.info(`Cleaned up ${cleanedCount} old entries`);
      return cleanedCount;
      
    } catch (error) {
      this.logger.error('Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Clear all data
   */
  async clearAll() {
    if (!this.ready) throw new Error('Database not initialized');
    
    try {
      const stores = ['projects', 'assets', 'thumbnails', 'settings', 'exportHistory'];
      const tx = this.db.transaction(stores, 'readwrite');
      
      for (const storeName of stores) {
        await tx.objectStore(storeName).clear();
      }
      
      await tx.done;
      
      this.logger.info('All data cleared');
      
    } catch (error) {
      this.logger.error('Failed to clear data:', error);
      throw error;
    }
  }

  /**
   * Close database
   */
  close() {
    if (this.db) {
      this.db.close();
      this.ready = false;
      this.logger.info('Database closed');
    }
  }
}

// Singleton
let instance = null;

async function initializeStorage() {
  if (!instance) {
    instance = new IndexedDBStorage();
    await instance.initialize();
  }
  return instance;
}

export { IndexedDBStorage, initializeStorage };