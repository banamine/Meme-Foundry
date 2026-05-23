/**
 * Meme Foundry - General Helpers
 * Miscellaneous utility functions
 */

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry(fn, options = {}) {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 2,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) break;
      
      const waitTime = delay * Math.pow(backoff, attempt - 1);
      
      if (onRetry) {
        onRetry(attempt, waitTime, error);
      }
      
      await sleep(waitTime);
    }
  }

  throw lastError;
}

/**
 * Timeout a promise
 */
export function timeout(promise, ms, errorMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
}

/**
 * Execute function safely (catch errors)
 */
export function safely(fn, fallback = null) {
  try {
    return fn();
  } catch (error) {
    console.warn('Safe execution failed:', error);
    return typeof fallback === 'function' ? fallback(error) : fallback;
  }
}

/**
 * Execute async function safely
 */
export async function safelyAsync(fn, fallback = null) {
  try {
    return await fn();
  } catch (error) {
    console.warn('Safe async execution failed:', error);
    return typeof fallback === 'function' ? fallback(error) : fallback;
  }
}

/**
 * Deep clone an object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj);
  if (obj instanceof Map) return new Map(deepClone(Array.from(obj)));
  if (obj instanceof Set) return new Set(deepClone(Array.from(obj)));
  if (obj instanceof Blob) return obj.slice(0, obj.size);
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  
  const clone = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clone[key] = deepClone(obj[key]);
    }
  }
  return clone;
}

/**
 * Deep merge objects
 */
export function deepMerge(target, ...sources) {
  for (const source of sources) {
    if (!source) continue;
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const targetVal = target[key];
        const sourceVal = source[key];
        
        if (isObject(targetVal) && isObject(sourceVal)) {
          target[key] = deepMerge({}, targetVal, sourceVal);
        } else {
          target[key] = deepClone(sourceVal);
        }
      }
    }
  }
  return target;
}

/**
 * Check if value is a plain object
 */
export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Pick specified keys from object
 */
export function pick(obj, keys) {
  const result = {};
  keys.forEach(key => {
    if (obj.hasOwnProperty(key)) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Omit specified keys from object
 */
export function omit(obj, keys) {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`;
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  
  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  if (m > 0) {
    return `${m}:${pad(s)}`;
  }
  if (s > 0) {
    return `${s}.${String(ms).padStart(3, '0')}s`;
  }
  return `${ms}ms`;
}

/**
 * Pad number with leading zeros
 */
function pad(num, size = 2) {
  return String(num).padStart(size, '0');
}

/**
 * Format date to string
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Format relative time
 */
export function timeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str, maxLength = 50, ellipsis = '...') {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Slugify string
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}

/**
 * Generate random string
 */
export function randomString(length = 8, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * Generate random ID
 */
export function randomId() {
  return crypto.randomUUID();
}

/**
 * Chunk array into smaller arrays
 */
export function chunk(array, size = 10) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Shuffle array (Fisher-Yates)
 */
export function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Unique array values
 */
export function unique(array) {
  return [...new Set(array)];
}

/**
 * Group array by key
 */
export function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const value = typeof key === 'function' ? key(item) : item[key];
    (groups[value] = groups[value] || []).push(item);
    return groups;
  }, {});
}

/**
 * Sort array by key
 */
export function sortBy(array, key, direction = 'asc') {
  return [...array].sort((a, b) => {
    const valA = typeof key === 'function' ? key(a) : a[key];
    const valB = typeof key === 'function' ? key(b) : b[key];
    
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Debounce function
 */
export function debounce(func, wait = 250) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle(func, wait = 250) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= wait) {
      lastCall = now;
      func.apply(this, args);
    }
  };
}

/**
 * Memoize function results
 */
export function memoize(fn, maxCache = 100) {
  const cache = new Map();
  
  return function(...args) {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn.apply(this, args);
    
    if (cache.size >= maxCache) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    cache.set(key, result);
    return result;
  };
}

/**
 * Pipe functions
 */
export function pipe(...fns) {
  return (value) => fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * Compose functions (right to left)
 */
export function compose(...fns) {
  return pipe(...fns.reverse());
}

/**
 * No operation function
 */
export function noop() {}

/**
 * Identity function
 */
export function identity(value) {
  return value;
}

/**
 * Check if running in browser
 */
export function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if running in Node.js
 */
export function isNode() {
  return typeof process !== 'undefined' && process.versions?.node;
}

/**
 * Check if running in production
 */
export function isProduction() {
  return typeof import.meta !== 'undefined' && import.meta.env?.PROD;
}

/**
 * Check if running in development
 */
export function isDevelopment() {
  return typeof import.meta !== 'undefined' && import.meta.env?.DEV;
}

/**
 * Get environment variable
 */
export function env(key, defaultValue = null) {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || defaultValue;
  }
  return defaultValue;
}