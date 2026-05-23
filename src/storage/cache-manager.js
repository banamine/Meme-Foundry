/**
 * Meme Foundry - Cache Manager
 * Multi-tier caching system for assets, thumbnails, and computed data
 */

import { Logger } from '@/utils/logger.js';

class CacheManager {
  constructor() {
    this.logger = new Logger('CacheManager');
    
    // Memory cache (fastest)
    this.memoryCache = new Map();
    
    // Cache tiers
    this.tiers = {
      memory: {
        name: 'Memory',
        maxSize: 100 * 1024 * 1024, // 100MB
        maxEntries: 1000,
        currentSize: 0,
        hits: 0,
        misses: 0
      },
      disk: {
        name: 'Disk (IndexedDB)',
        maxSize: 500 * 1024 * 1024, // 500MB
        maxEntries: 5000,
        currentSize: 0,
        hits: 0,
        misses: 0
      },
      compute: {
        name: 'Compute',
        maxSize: 50 * 1024 * 1024, // 50MB
        maxEntries: 500,
        currentSize: 0,
        hits: 0,
        misses: 0
      }
    };
    
    // Database reference (set by initialize)
    this.db = null;
    
    // Statistics
    this.stats = {
      totalHits: 0,
      totalMisses: 0,
      evictions: 0,
      expirations: 0
    };
  }

  /**
   * Initialize cache manager
   */
  async initialize(db) {
    this.db = db;
    this.logger.info('Cache manager initialized');
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Get item from cache
   */
  async get(key, tier = 'memory') {
    // Try memory cache first
    if (tier === 'memory' || tier === 'any') {
      const memoryResult = this.getFromMemory(key);
      if (memoryResult !== undefined) {
        this.tiers.memory.hits++;
        this.stats.totalHits++;
        return { value: memoryResult, source: 'memory' };
      }
      this.tiers.memory.misses++;
    }

    // Try disk cache
    if ((tier === 'disk' || tier === 'any') && this.db) {
      const diskResult = await this.getFromDisk(key);
      if (diskResult !== undefined) {
        this.tiers.disk.hits++;
        this.stats.totalHits++;
        
        // Promote to memory cache
        this.setInMemory(key, diskResult);
        
        return { value: diskResult, source: 'disk' };
      }
      this.tiers.disk.misses++;
    }

    this.stats.totalMisses++;
    return { value: undefined, source: null };
  }

  /**
   * Set item in cache
   */
  async set(key, value, options = {}) {
    const {
      tier = 'memory',
      ttl = null, // Time to live in milliseconds
      size = this.estimateSize(value),
      persist = false
    } = options;

    // Store in memory
    this.setInMemory(key, value, ttl, size);

    // Optionally persist to disk
    if (persist && this.db) {
      await this.setInDisk(key, value, ttl, size);
    }
  }

  /**
   * Get from memory cache
   */
  getFromMemory(key) {
    const entry = this.memoryCache.get(key);
    
    if (!entry) return undefined;
    
    // Check expiration
    if (entry.expires && entry.expires < Date.now()) {
      this.memoryCache.delete(key);
      this.tiers.memory.currentSize -= entry.size;
      this.stats.expirations++;
      return undefined;
    }
    
    // Update last access
    entry.lastAccess = Date.now();
    entry.accessCount++;
    
    return entry.value;
  }

  /**
   * Set in memory cache
   */
  setInMemory(key, value, ttl = null, size = null) {
    const actualSize = size || this.estimateSize(value);
    
    // Evict if needed
    while (
      this.tiers.memory.currentSize + actualSize > this.tiers.memory.maxSize ||
      this.memoryCache.size >= this.tiers.memory.maxEntries
    ) {
      this.evictFromMemory();
    }
    
    const entry = {
      value,
      size: actualSize,
      created: Date.now(),
      lastAccess: Date.now(),
      accessCount: 0,
      expires: ttl ? Date.now() + ttl : null
    };
    
    this.memoryCache.set(key, entry);
    this.tiers.memory.currentSize += actualSize;
  }

  /**
   * Get from disk cache (IndexedDB)
   */
  async getFromDisk(key) {
    if (!this.db) return undefined;
    
    try {
      const entry = await this.db.get('cache', key);
      
      if (!entry) return undefined;
      
      // Check expiration
      if (entry.expires && entry.expires < Date.now()) {
        await this.db.delete('cache', key);
        this.stats.expirations++;
        return undefined;
      }
      
      return entry.value;
    } catch (error) {
      this.logger.warn('Disk cache read failed:', error);
      return undefined;
    }
  }

  /**
   * Set in disk cache
   */
  async setInDisk(key, value, ttl = null, size = null) {
    if (!this.db) return;
    
    try {
      const entry = {
        key,
        value,
        size: size || this.estimateSize(value),
        created: Date.now(),
        expires: ttl ? Date.now() + ttl : null
      };
      
      await this.db.put('cache', entry);
      this.tiers.disk.currentSize += entry.size;
      
    } catch (error) {
      this.logger.warn('Disk cache write failed:', error);
    }
  }

  /**
   * Evict entry from memory cache (LRU)
   */
  evictFromMemory() {
    if (this.memoryCache.size === 0) return;
    
    // Find least recently used entry
    let oldestKey = null;
    let oldestAccess = Infinity;
    
    for (const [key, entry] of this.memoryCache) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      const entry = this.memoryCache.get(oldestKey);
      this.tiers.memory.currentSize -= entry.size;
      this.memoryCache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Cache computed results
   */
  async memoize(fn, keyPrefix = '', ttl = null) {
    const cache = this;
    
    return async function(...args) {
      const key = `${keyPrefix}:${JSON.stringify(args)}`;
      
      const result = await cache.get(key, 'compute');
      if (result.value !== undefined) {
        return result.value;
      }
      
      const value = await fn.apply(this, args);
      await cache.set(key, value, { 
        tier: 'memory', 
        ttl 
      });
      
      return value;
    };
  }

  /**
   * Cache API responses
   */
  async cacheResponse(url, response, ttl = 3600000) {
    const cloned = response.clone();
    const blob = await cloned.blob();
    
    await this.set(url, blob, {
      tier: 'disk',
      ttl,
      persist: true,
      size: blob.size
    });
  }

  /**
   * Get cached response
   */
  async getCachedResponse(url) {
    const result = await this.get(url, 'disk');
    
    if (result.value) {
      return new Response(result.value);
    }
    
    return null;
  }

  /**
   * Preload assets into cache
   */
  async preload(urls, tier = 'disk') {
    const results = [];
    
    for (const url of urls) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        
        await this.set(url, blob, {
          tier,
          persist: true,
          size: blob.size
        });
        
        results.push({ url, success: true });
      } catch (error) {
        results.push({ url, success: false, error });
      }
    }
    
    return results;
  }

  /**
   * Clear cache tier
   */
  async clear(tier = 'memory') {
    switch (tier) {
      case 'memory':
        this.memoryCache.clear();
        this.tiers.memory.currentSize = 0;
        break;
        
      case 'disk':
        if (this.db) {
          await this.db.clear('cache');
        }
        this.tiers.disk.currentSize = 0;
        break;
        
      case 'all':
        this.memoryCache.clear();
        this.tiers.memory.currentSize = 0;
        if (this.db) {
          await this.db.clear('cache');
        }
        this.tiers.disk.currentSize = 0;
        break;
    }
    
    this.logger.info(`Cache cleared: ${tier}`);
  }

  /**
   * Clean up expired entries
   */
  async cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    // Memory cache
    for (const [key, entry] of this.memoryCache) {
      if (entry.expires && entry.expires < now) {
        this.memoryCache.delete(key);
        this.tiers.memory.currentSize -= entry.size;
        cleaned++;
      }
    }
    
    this.logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
  }

  /**
   * Estimate size of value
   */
  estimateSize(value) {
    if (value instanceof Blob) {
      return value.size;
    }
    
    if (value instanceof ArrayBuffer) {
      return value.byteLength;
    }
    
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16
    }
    
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value).length * 2;
      } catch (e) {
        return 1024; // Rough estimate
      }
    }
    
    return 64; // Minimum estimate
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memory: {
        entries: this.memoryCache.size,
        maxEntries: this.tiers.memory.maxSize,
        size: this.formatBytes(this.tiers.memory.currentSize),
        maxSize: this.formatBytes(this.tiers.memory.maxSize),
        hits: this.tiers.memory.hits,
        misses: this.tiers.memory.misses,
        hitRate: this.calculateHitRate(this.tiers.memory)
      },
      disk: {
        maxSize: this.formatBytes(this.tiers.disk.maxSize),
        hits: this.tiers.disk.hits,
        misses: this.tiers.disk.misses,
        hitRate: this.calculateHitRate(this.tiers.disk)
      },
      total: {
        hits: this.stats.totalHits,
        misses: this.stats.totalMisses,
        evictions: this.stats.evictions,
        expirations: this.stats.expirations,
        hitRate: this.stats.totalHits + this.stats.totalMisses > 0
          ? (this.stats.totalHits / (this.stats.totalHits + this.stats.totalMisses) * 100).toFixed(1) + '%'
          : '0%'
      }
    };
  }

  /**
   * Calculate hit rate
   */
  calculateHitRate(tier) {
    const total = tier.hits + tier.misses;
    if (total === 0) return '0%';
    return (tier.hits / total * 100).toFixed(1) + '%';
  }

  /**
   * Format bytes
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Destroy cache manager
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.memoryCache.clear();
    this.db = null;
  }
}

export { CacheManager };