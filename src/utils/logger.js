/**
 * Meme Foundry - Logger
 * Structured logging system with levels and filtering
 */

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
  NONE: 5
};

const LogLevelNames = {
  0: 'DEBUG',
  1: 'INFO',
  2: 'WARN',
  3: 'ERROR',
  4: 'FATAL'
};

const LogColors = {
  DEBUG: '#7f8c8d',
  INFO: '#3498db',
  WARN: '#f39c12',
  ERROR: '#e74c3c',
  FATAL: '#c0392b'
};

class Logger {
  constructor(module = 'App') {
    this.module = module;
    this.level = LogLevel.DEBUG;
    this.enabled = true;
    this.history = [];
    this.maxHistory = 1000;
    this.listeners = [];
    this.useColors = true;
  }

  /**
   * Set log level
   */
  setLevel(level) {
    if (typeof level === 'string') {
      level = LogLevel[level.toUpperCase()] || LogLevel.DEBUG;
    }
    this.level = level;
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Debug log
   */
  debug(...args) {
    this.log(LogLevel.DEBUG, ...args);
  }

  /**
   * Info log
   */
  info(...args) {
    this.log(LogLevel.INFO, ...args);
  }

  /**
   * Warning log
   */
  warn(...args) {
    this.log(LogLevel.WARN, ...args);
  }

  /**
   * Error log
   */
  error(...args) {
    this.log(LogLevel.ERROR, ...args);
  }

  /**
   * Fatal log
   */
  fatal(...args) {
    this.log(LogLevel.FATAL, ...args);
  }

  /**
   * Core log method
   */
  log(level, ...args) {
    if (!this.enabled || level < this.level) return;

    const entry = {
      timestamp: Date.now(),
      level,
      levelName: LogLevelNames[level],
      module: this.module,
      message: args.map(arg => this.formatArg(arg)).join(' '),
      args
    };

    // Add to history
    this.history.push(entry);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Console output
    this.outputToConsole(entry);

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (e) {
        // Prevent infinite loops
      }
    });
  }

  /**
   * Format argument for logging
   */
  formatArg(arg) {
    if (arg instanceof Error) {
      return `${arg.message}\n${arg.stack || ''}`;
    }
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }

  /**
   * Output to browser console
   */
  outputToConsole(entry) {
    const prefix = `[${new Date(entry.timestamp).toISOString()}] [${entry.levelName}] [${entry.module}]`;
    
    const consoleMethod = {
      0: 'debug',
      1: 'info',
      2: 'warn',
      3: 'error',
      4: 'error'
    }[entry.level] || 'log';

    if (this.useColors && console[consoleMethod]) {
      console[consoleMethod](
        `%c${prefix}`,
        `color: ${LogColors[entry.levelName]}; font-weight: bold;`,
        ...entry.args
      );
    } else {
      console[consoleMethod](prefix, ...entry.args);
    }
  }

  /**
   * Subscribe to all log entries
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  /**
   * Get log history
   */
  getHistory(level = LogLevel.DEBUG) {
    return this.history.filter(entry => entry.level >= level);
  }

  /**
   * Get recent logs
   */
  getRecent(count = 50) {
    return this.history.slice(-count);
  }

  /**
   * Search logs
   */
  search(query) {
    const lowerQuery = query.toLowerCase();
    return this.history.filter(entry =>
      entry.message.toLowerCase().includes(lowerQuery) ||
      entry.module.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Export logs as string
   */
  exportLogs() {
    return this.history.map(entry => {
      return `[${new Date(entry.timestamp).toISOString()}] [${entry.levelName}] [${entry.module}] ${entry.message}`;
    }).join('\n');
  }

  /**
   * Download logs as file
   */
  downloadLogs() {
    const content = this.exportLogs();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meme-foundry-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Time a function execution
   */
  time(label, fn) {
    const start = performance.now();
    const result = fn();
    const duration = (performance.now() - start).toFixed(2);
    
    if (result instanceof Promise) {
      return result.then(value => {
        this.debug(`${label}: ${duration}ms`);
        return value;
      }).catch(error => {
        this.debug(`${label}: ${duration}ms (failed)`);
        throw error;
      });
    }
    
    this.debug(`${label}: ${duration}ms`);
    return result;
  }

  /**
   * Create a child logger with sub-module
   */
  child(subModule) {
    const childLogger = new Logger(`${this.module}:${subModule}`);
    childLogger.level = this.level;
    childLogger.enabled = this.enabled;
    return childLogger;
  }

  /**
   * Group related logs
   */
  group(label, fn) {
    console.group(label);
    try {
      fn();
    } finally {
      console.groupEnd();
    }
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Get log statistics
   */
  getStats() {
    const stats = {
      total: this.history.length,
      byLevel: {},
      byModule: {},
      errors: 0,
      warnings: 0
    };

    this.history.forEach(entry => {
      // By level
      stats.byLevel[entry.levelName] = (stats.byLevel[entry.levelName] || 0) + 1;
      
      // By module
      stats.byModule[entry.module] = (stats.byModule[entry.module] || 0) + 1;
      
      // Count errors/warnings
      if (entry.level >= LogLevel.ERROR) stats.errors++;
      if (entry.level === LogLevel.WARN) stats.warnings++;
    });

    return stats;
  }

  /**
   * Measure memory usage (approximate)
   */
  memoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        formatted: this.formatBytes(performance.memory.usedJSHeapSize)
      };
    }
    return null;
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
}

export { Logger, LogLevel };