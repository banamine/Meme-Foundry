// ENSURE all worker creation uses the Vite-compatible pattern:

async createWorker(type, factory) {
  // For Vite, workers must use this pattern:
  const worker = new Worker(
    new URL(`./${type}-worker.js`, import.meta.url),
    { type: 'module' }
  );
  // ... rest of method
}

// INSTEAD of the factory pattern, directly create workers:
async initialize() {
  this.logger.info(`Initializing worker pool (max: ${this.maxWorkers})`);
  
  try {
    // Create render worker
    this.workers.set('render', {
      worker: new Worker(
        new URL('./render-worker.js', import.meta.url),
        { type: 'module' }
      ),
      type: 'render',
      busy: false,
      currentTask: null,
      created: Date.now(),
      taskCount: 0
    });
    
    // Create resize worker
    this.workers.set('resize', {
      worker: new Worker(
        new URL('./resize-worker.js', import.meta.url),
        { type: 'module' }
      ),
      type: 'resize',
      busy: false,
      currentTask: null,
      created: Date.now(),
      taskCount: 0
    });
    
    // Create thumbnail worker
    this.workers.set('thumbnail', {
      worker: new Worker(
        new URL('./thumbnail-worker.js', import.meta.url),
        { type: 'module' }
      ),
      type: 'thumbnail',
      busy: false,
      currentTask: null,
      created: Date.now(),
      taskCount: 0
    });
    
    // Set up message handlers for each worker
    for (const [type, info] of this.workers) {
      info.worker.onmessage = (event) => {
        this.handleWorkerMessage(type, event.data);
      };
      info.worker.onerror = (event) => {
        this.logger.error(`Worker error (${type}):`, event);
        this.handleWorkerError(type, event);
      };
    }
    
    this.logger.info(`Worker pool initialized with ${this.workers.size} workers`);
    
  } catch (error) {
    this.logger.error('Failed to initialize workers:', error);
  }
}