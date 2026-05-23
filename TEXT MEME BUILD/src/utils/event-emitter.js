/**
 * Meme Foundry - Event Emitter
 * Lightweight event system for application-wide communication
 */

class EventEmitter {
  constructor() {
    this.events = new Map();
    this.maxListeners = 50;
    this.enabled = true;
  }

  /**
   * Register event listener
   */
  on(event, listener, options = {}) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    const listeners = this.events.get(event);
    
    // Warn if too many listeners
    if (listeners.size >= this.maxListeners && !options.silent) {
      console.warn(
        `EventEmitter: ${event} has ${listeners.size} listeners. ` +
        `Consider increasing maxListeners or removing unused listeners.`
      );
    }
    
    const listenerObj = {
      fn: listener,
      once: options.once || false,
      priority: options.priority || 0
    };
    
    listeners.add(listenerObj);
    
    return () => this.off(event, listener);
  }

  /**
   * Register one-time event listener
   */
  once(event, listener) {
    return this.on(event, listener, { once: true });
  }

  /**
   * Remove event listener
   */
  off(event, listener) {
    const listeners = this.events.get(event);
    if (!listeners) return;
    
    for (const listenerObj of listeners) {
      if (listenerObj.fn === listener) {
        listeners.delete(listenerObj);
        break;
      }
    }
    
    // Clean up empty event sets
    if (listeners.size === 0) {
      this.events.delete(event);
    }
  }

  /**
   * Remove all listeners for event
   */
  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * Emit event
   */
  emit(event, ...args) {
    if (!this.enabled) return;
    
    const listeners = this.events.get(event);
    if (!listeners || listeners.size === 0) return;
    
    // Sort by priority (highest first)
    const sortedListeners = Array.from(listeners)
      .sort((a, b) => b.priority - a.priority);
    
    // Execute listeners
    for (const listenerObj of sortedListeners) {
      try {
        listenerObj.fn(...args);
      } catch (error) {
        console.error(`EventEmitter: Error in listener for "${event}":`, error);
      }
      
      // Remove once listeners
      if (listenerObj.once) {
        listeners.delete(listenerObj);
      }
    }
    
    // Emit wildcard event
    if (event !== '*') {
      this.emit('*', event, ...args);
    }
  }

  /**
   * Emit event asynchronously
   */
  async emitAsync(event, ...args) {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.emit(event, ...args);
        resolve();
      }, 0);
    });
  }

  /**
   * Get listener count for event
   */
  listenerCount(event) {
    const listeners = this.events.get(event);
    return listeners ? listeners.size : 0;
  }

  /**
   * Get all event names
   */
  eventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * Get all listeners for event
   */
  listeners(event) {
    const listeners = this.events.get(event);
    if (!listeners) return [];
    
    return Array.from(listeners).map(l => l.fn);
  }

  /**
   * Set max listeners
   */
  setMaxListeners(max) {
    this.maxListeners = Math.max(1, max);
  }

  /**
   * Enable/disable emitter
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Pipe events to another emitter
   */
  pipe(event, targetEmitter) {
    return this.on(event, (...args) => {
      targetEmitter.emit(event, ...args);
    });
  }

  /**
   * Create a delayed event
   */
  delayedEmit(event, delay, ...args) {
    setTimeout(() => {
      this.emit(event, ...args);
    }, delay);
  }

  /**
   * Create a debounced event
   */
  debouncedEmit(event, delay) {
    let timeout;
    
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.emit(event, ...args);
      }, delay);
    };
  }

  /**
   * Create a throttled event
   */
  throttledEmit(event, delay) {
    let lastEmit = 0;
    
    return (...args) => {
      const now = Date.now();
      
      if (now - lastEmit >= delay) {
        lastEmit = now;
        this.emit(event, ...args);
      }
    };
  }

  /**
   * Wait for event
   */
  waitFor(event, timeout = 0) {
    return new Promise((resolve, reject) => {
      const unsubscribe = this.once(event, resolve);
      
      if (timeout > 0) {
        setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for event: ${event}`));
        }, timeout);
      }
    });
  }

  /**
   * Create a proxy that emits events on property changes
   */
  createProxy(target, eventPrefix = 'change') {
    const emitter = this;
    
    return new Proxy(target, {
      set(obj, prop, value) {
        const oldValue = obj[prop];
        obj[prop] = value;
        
        if (oldValue !== value) {
          emitter.emit(`${eventPrefix}:${prop}`, value, oldValue);
          emitter.emit(eventPrefix, { property: prop, value, oldValue });
        }
        
        return true;
      },
      
      deleteProperty(obj, prop) {
        const oldValue = obj[prop];
        delete obj[prop];
        
        emitter.emit(`${eventPrefix}:${prop}:deleted`, oldValue);
        emitter.emit(eventPrefix, { property: prop, deleted: true });
        
        return true;
      }
    });
  }
}

export { EventEmitter };