/**
 * Meme Foundry - Centralized Logger Factory
 */

import { Logger, LogLevel } from './logger.js';

const loggers = new Map();

export function getLogger(moduleName) {
  if (loggers.has(moduleName)) {
    return loggers.get(moduleName);
  }
  
  const logger = new Logger(moduleName);
  
  // Set log level based on environment
  if (import.meta.env.PROD) {
    logger.setLevel(LogLevel.WARN);
  } else {
    logger.setLevel(LogLevel.DEBUG);
  }
  
  loggers.set(moduleName, logger);
  return logger;
}

export function setGlobalLogLevel(level) {
  for (const logger of loggers.values()) {
    logger.setLevel(level);
  }
}

export function enableAllLoggers() {
  for (const logger of loggers.values()) {
    logger.setEnabled(true);
  }
}

export function disableAllLoggers() {
  for (const logger of loggers.values()) {
    logger.setEnabled(false);
  }
}