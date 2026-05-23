/**
 * Meme Foundry - Scene Serialization
 * Handles scene graph serialization/deserialization with asset management
 */

import { Logger } from '@/utils/logger.js';

class Serialization {
  constructor() {
    this.logger = new Logger('Serialization');
    this.version = '1.0.0';
    this.compressionEnabled = true;
  }

  /**
   * Serialize scene to JSON string
   */
  serializeScene(scene, options = {}) {
    const {
      pretty = false,
      includeAssets = true,
      stripIds = false,
      compress = true
    } = options;

    try {
      // Deep clone to avoid mutation
      const serialized = JSON.parse(JSON.stringify(scene));
      
      // Add serialization metadata
      serialized._serialized = {
        version: this.version,
        timestamp: new Date().toISOString(),
        tool: 'Meme Foundry',
        compressed: compress
      };

      // Process layers for serialization
      if (serialized.layers) {
        serialized.layers = serialized.layers.map(layer => 
          this.serializeLayer(layer, { includeAssets, stripIds })
        );
      }

      // Convert to string
      let jsonString = pretty 
        ? JSON.stringify(serialized, null, 2)
        : JSON.stringify(serialized);

      // Apply compression if enabled
      if (compress && this.compressionEnabled) {
        jsonString = this.compress(jsonString);
      }

      return jsonString;
    } catch (error) {
      this.logger.error('Serialization failed:', error);
      throw new Error(`Failed to serialize scene: ${error.message}`);
    }
  }

  /**
   * Deserialize scene from JSON string
   */
  deserializeScene(jsonString, options = {}) {
    const {
      validate = true,
      migrate = true
    } = options;

    try {
      // Decompress if needed
      let data;
      if (this.isCompressed(jsonString)) {
        jsonString = this.decompress(jsonString);
      }

      data = JSON.parse(jsonString);

      // Check serialization metadata
      if (data._serialized) {
        this.logger.debug(`Deserializing scene version ${data._serialized.version}`);
        
        // Migrate if needed
        if (migrate && data._serialized.version !== this.version) {
          data = this.migrate(data, data._serialized.version, this.version);
        }

        // Remove metadata
        delete data._serialized;
      }

      // Process layers for deserialization
      if (data.layers) {
        data.layers = data.layers.map(layer => this.deserializeLayer(layer));
      }

      // Ensure required fields
      data = this.ensureDefaults(data);

      return data;
    } catch (error) {
      this.logger.error('Deserialization failed:', error);
      throw new Error(`Failed to deserialize scene: ${error.message}`);
    }
  }

  /**
   * Serialize individual layer
   */
  serializeLayer(layer, options = {}) {
    const { includeAssets = true, stripIds = false } = options;
    
    const serialized = { ...layer };

    // Strip IDs if requested
    if (stripIds) {
      delete serialized.id;
      if (serialized.group?.children) {
        serialized.group.children = serialized.group.children.map(child => {
          const { id, ...rest } = child;
          return rest;
        });
      }
    }

    // Handle asset references
    if (!includeAssets) {
      // Remove asset data but keep references
      if (serialized.image?.assetId) {
        serialized.image.src = `asset://${serialized.image.assetId}`;
      }
      if (serialized.video?.assetId) {
        serialized.video.src = `asset://${serialized.video.assetId}`;
      }
    }

    // Serialize group children recursively
    if (serialized.group?.children) {
      serialized.group.children = serialized.group.children.map(child =>
        this.serializeLayer(child, options)
      );
    }

    return serialized;
  }

  /**
   * Deserialize individual layer
   */
  deserializeLayer(layer) {
    // Ensure layer has all required fields
    const deserialized = {
      ...this.getLayerDefaults(layer.type),
      ...layer,
      transform: {
        ...this.getLayerDefaults(layer.type).transform,
        ...layer.transform
      }
    };

    // Deserialize group children recursively
    if (deserialized.group?.children) {
      deserialized.group.children = deserialized.group.children.map(child =>
        this.deserializeLayer(child)
      );
    }

    // Handle asset references
    if (deserialized.image?.src?.startsWith('asset://')) {
      deserialized.image.assetId = deserialized.image.src.replace('asset://', '');
    }
    if (deserialized.video?.src?.startsWith('asset://')) {
      deserialized.video.assetId = deserialized.video.src.replace('asset://', '');
    }

    return deserialized;
  }

  /**
   * Get default values for layer type
   */
  getLayerDefaults(type) {
    const base = {
      id: crypto.randomUUID(),
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      masks: [],
      effects: [],
      timeline: {
        startTime: 0,
        duration: 0,
        keyframes: []
      },
      transform: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        anchorX: 0.5,
        anchorY: 0.5,
        flipH: false,
        flipV: false
      }
    };

    return base;
  }

  /**
   * Ensure scene has all required defaults
   */
  ensureDefaults(scene) {
    return {
      id: scene.id || crypto.randomUUID(),
      version: scene.version || this.version,
      name: scene.name || 'Untitled Scene',
      canvas: {
        width: scene.canvas?.width || 1080,
        height: scene.canvas?.height || 1080,
        backgroundColor: scene.canvas?.backgroundColor || '#FFFFFF',
        pixelRatio: scene.canvas?.pixelRatio || 1
      },
      layers: scene.layers || [],
      metadata: {
        created: scene.metadata?.created || new Date().toISOString(),
        modified: scene.metadata?.modified || new Date().toISOString(),
        platform: scene.metadata?.platform || 'custom',
        version: scene.metadata?.version || 1,
        ...scene.metadata
      }
    };
  }

  /**
   * Compress JSON string
   */
  compress(jsonString) {
    try {
      // Remove whitespace
      return jsonString
        .replace(/\s+/g, '')
        .replace(/"(\w+)":/g, '$1:'); // Minify keys (optional)
    } catch (error) {
      this.logger.warn('Compression failed, returning original:', error);
      return jsonString;
    }
  }

  /**
   * Decompress JSON string
   */
  decompress(compressed) {
    // Add whitespace back for parsing
    return compressed;
  }

  /**
   * Check if string is compressed
   */
  isCompressed(jsonString) {
    return jsonString.indexOf('\n') === -1 && jsonString.length > 100;
  }

  /**
   * Migrate between versions
   */
  migrate(data, fromVersion, toVersion) {
    this.logger.info(`Migrating scene from ${fromVersion} to ${toVersion}`);
    
    let migrated = { ...data };
    
    // Apply migrations sequentially
    const migrations = this.getMigrations();
    const versions = Object.keys(migrations).sort();
    
    for (const version of versions) {
      if (this.compareVersions(version, fromVersion) > 0 && 
          this.compareVersions(version, toVersion) <= 0) {
        migrated = migrations[version](migrated);
      }
    }
    
    return migrated;
  }

  /**
   * Get migration functions
   */
  getMigrations() {
    return {
      '1.0.0': (data) => {
        // Initial version
        return data;
      },
      // Future migrations:
      // '1.1.0': (data) => { ... },
      // '2.0.0': (data) => { ... }
    };
  }

  /**
   * Compare semantic versions
   */
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return 1;
      if (parts1[i] < parts2[i]) return -1;
    }
    
    return 0;
  }

  /**
   * Export scene for sharing (strips local assets)
   */
  exportForSharing(scene) {
    return this.serializeScene(scene, {
      includeAssets: false,
      stripIds: false,
      pretty: true
    });
  }

  /**
   * Create scene thumbnail
   */
  createThumbnail(scene) {
    // Return scene metadata for thumbnail generation
    return {
      id: scene.id,
      name: scene.name,
      canvas: scene.canvas,
      layerCount: scene.layers.length,
      timestamp: scene.metadata.modified
    };
  }

  /**
   * Generate checksum for scene integrity
   */
  generateChecksum(scene) {
    const serialized = this.serializeScene(scene, { compress: false });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < serialized.length; i++) {
      const char = serialized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(16);
  }

  /**
   * Verify scene checksum
   */
  verifyChecksum(scene, checksum) {
    const currentChecksum = this.generateChecksum(scene);
    return currentChecksum === checksum;
  }
}

export { Serialization };