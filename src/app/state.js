// Add after the destroy() method in AppState class

/**
 * Get storage service
 */
getStorage() {
  if (!this.services.storage) {
    throw new Error('Storage service not initialized');
  }
  return this.services.storage;
}

/**
 * Get worker bridge
 */
getWorkerBridge() {
  if (!this.services.workerBridge) {
    throw new Error('Worker bridge not initialized');
  }
  return this.services.workerBridge;
}

/**
 * Get font manager
 */
getFontManager() {
  if (!this.services.fontManager) {
    throw new Error('Font manager not initialized');
  }
  return this.services.fontManager;
}

/**
 * Get UI instance
 */
getUI() {
  if (!this.services.ui) {
    throw new Error('UI not initialized');
  }
  return this.services.ui;
}

/**
 * Get router
 */
getRouter() {
  if (!this.services.router) {
    throw new Error('Router not initialized');
  }
  return this.services.router;
}

/**
 * Set scene manager
 */
setSceneManager(sceneManager) {
  this.services.sceneManager = sceneManager;
}

/**
 * Get scene manager
 */
getSceneManager() {
  if (!this.services.sceneManager) {
    throw new Error('Scene manager not initialized');
  }
  return this.services.sceneManager;
}

/**
 * Set canvas renderer
 */
setCanvasRenderer(renderer) {
  this.services.canvasRenderer = renderer;
}

/**
 * Get canvas renderer
 */
getCanvasRenderer() {
  if (!this.services.canvasRenderer) {
    throw new Error('Canvas renderer not initialized');
  }
  return this.services.canvasRenderer;
}

/**
 * Set export manager
 */
setExportManager(exportManager) {
  this.services.exportManager = exportManager;
}

/**
 * Get export manager
 */
getExportManager() {
  if (!this.services.exportManager) {
    throw new Error('Export manager not initialized');
  }
  return this.services.exportManager;
}

/**
 * Set timeline manager
 */
setTimelineManager(timelineManager) {
  this.services.timelineManager = timelineManager;
}

/**
 * Get timeline manager
 */
getTimelineManager() {
  if (!this.services.timelineManager) {
    throw new Error('Timeline manager not initialized');
  }
  return this.services.timelineManager;
}