/**
 * Meme Foundry - Queue Worker
 * Manages task queue processing in a Web Worker
 */

// Task queue
let taskQueue = [];
let isProcessing = false;
let currentTask = null;
let taskIdCounter = 0;

// Worker configuration
const config = {
  maxConcurrent: 1,
  timeoutMs: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

// Message handler
self.onmessage = async function(event) {
  const { type, data, id } = event.data;
  
  try {
    switch (type) {
      case 'init':
        handleInit(data);
        self.postMessage({ id, type: 'init-complete', success: true });
        break;
        
      case 'add-task':
        const taskId = addTask(data);
        self.postMessage({ id, type: 'task-added', success: true, data: { taskId } });
        break;
        
      case 'add-tasks':
        const taskIds = addTasks(data.tasks);
        self.postMessage({ id, type: 'tasks-added', success: true, data: { taskIds } });
        break;
        
      case 'cancel-task':
        cancelTask(data.taskId);
        self.postMessage({ id, type: 'task-cancelled', success: true });
        break;
        
      case 'cancel-all':
        cancelAllTasks();
        self.postMessage({ id, type: 'all-cancelled', success: true });
        break;
        
      case 'pause':
        pauseQueue();
        self.postMessage({ id, type: 'queue-paused', success: true });
        break;
        
      case 'resume':
        resumeQueue();
        self.postMessage({ id, type: 'queue-resumed', success: true });
        break;
        
      case 'get-status':
        const status = getQueueStatus();
        self.postMessage({ id, type: 'queue-status', success: true, data: status });
        break;
        
      case 'terminate':
        cleanup();
        self.postMessage({ id, type: 'terminated' });
        self.close();
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({ id, type: `${type}-error`, success: false, error: error.message });
  }
};

/**
 * Initialize worker
 */
function handleInit(customConfig = {}) {
  Object.assign(config, customConfig);
}

/**
 * Add single task to queue
 */
function addTask(taskData) {
  const taskId = ++taskIdCounter;
  
  const task = {
    id: taskId,
    type: taskData.type,
    data: taskData.data,
    priority: taskData.priority || 0,
    status: 'queued',
    added: Date.now(),
    started: null,
    completed: null,
    attempts: 0,
    maxAttempts: taskData.maxAttempts || config.retryAttempts,
    timeout: taskData.timeout || config.timeoutMs,
    result: null,
    error: null
  };
  
  taskQueue.push(task);
  
  // Sort by priority (highest first)
  taskQueue.sort((a, b) => b.priority - a.priority);
  
  // Start processing if not already
  if (!isProcessing) {
    processQueue();
  }
  
  // Report queue update
  reportQueueUpdate();
  
  return taskId;
}

/**
 * Add multiple tasks
 */
function addTasks(tasks) {
  return tasks.map(taskData => addTask(taskData));
}

/**
 * Cancel specific task
 */
function cancelTask(taskId) {
  const index = taskQueue.findIndex(t => t.id === taskId);
  
  if (index === -1) {
    if (currentTask?.id === taskId) {
      currentTask.status = 'cancelled';
      reportTaskUpdate(currentTask);
    }
    return;
  }
  
  const task = taskQueue[index];
  task.status = 'cancelled';
  taskQueue.splice(index, 1);
  
  reportTaskUpdate(task);
}

/**
 * Cancel all tasks
 */
function cancelAllTasks() {
  taskQueue.forEach(task => {
    task.status = 'cancelled';
    reportTaskUpdate(task);
  });
  
  taskQueue = [];
  
  if (currentTask) {
    currentTask.status = 'cancelled';
    reportTaskUpdate(currentTask);
    currentTask = null;
  }
  
  isProcessing = false;
  reportQueueUpdate();
}

/**
 * Pause queue processing
 */
function pauseQueue() {
  isProcessing = false;
}

/**
 * Resume queue processing
 */
function resumeQueue() {
  if (!isProcessing && taskQueue.length > 0) {
    processQueue();
  }
}

/**
 * Process task queue
 */
async function processQueue() {
  if (isProcessing) return;
  
  isProcessing = true;
  
  while (taskQueue.length > 0 && isProcessing) {
    // Get next task
    const task = taskQueue.shift();
    currentTask = task;
    
    // Process task
    await processTask(task);
    
    currentTask = null;
  }
  
  isProcessing = false;
}

/**
 * Process individual task
 */
async function processTask(task) {
  task.status = 'processing';
  task.started = Date.now();
  task.attempts++;
  
  reportTaskUpdate(task);
  
  try {
    // Execute task with timeout
    const result = await executeWithTimeout(task);
    
    task.status = 'completed';
    task.completed = Date.now();
    task.result = result;
    task.duration = task.completed - task.started;
    
    reportTaskUpdate(task);
    
  } catch (error) {
    // Handle error and retry
    if (task.attempts < task.maxAttempts) {
      task.status = 'retrying';
      task.error = error.message;
      
      reportTaskUpdate(task);
      
      // Wait before retry
      await sleep(config.retryDelay * task.attempts);
      
      // Re-add to front of queue
      taskQueue.unshift(task);
    } else {
      task.status = 'failed';
      task.completed = Date.now();
      task.error = error.message;
      task.duration = task.completed - task.started;
      
      reportTaskUpdate(task);
    }
  }
}

/**
 * Execute task with timeout
 */
async function executeWithTimeout(task) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Task timeout after ${task.timeout}ms`));
    }, task.timeout);
    
    try {
      const result = executeTask(task);
      
      if (result instanceof Promise) {
        result.then(value => {
          clearTimeout(timeout);
          resolve(value);
        }).catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
      } else {
        clearTimeout(timeout);
        resolve(result);
      }
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

/**
 * Execute task based on type
 */
function executeTask(task) {
  switch (task.type) {
    case 'render':
      return executeRenderTask(task.data);
      
    case 'export':
      return executeExportTask(task.data);
      
    case 'compress':
      return executeCompressTask(task.data);
      
    case 'process-image':
      return executeImageTask(task.data);
      
    case 'custom':
      // For custom tasks, the data should contain the function code
      // This is handled by posting back to main thread
      self.postMessage({
        type: 'execute-custom',
        taskId: task.id,
        data: task.data
      });
      return new Promise((resolve, reject) => {
        const handler = (event) => {
          if (event.data.type === 'custom-result' && event.data.taskId === task.id) {
            self.removeEventListener('message', handler);
            if (event.data.success) {
              resolve(event.data.result);
            } else {
              reject(new Error(event.data.error));
            }
          }
        };
        self.addEventListener('message', handler);
      });
      
    default:
      throw new Error(`Unknown task type: ${task.type}`);
  }
}

/**
 * Execute render task
 */
function executeRenderTask(data) {
  const { layers, width, height, time } = data;
  
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Clear
  ctx.clearRect(0, 0, width, height);
  
  // Render layers
  for (const layer of layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    
    ctx.save();
    
    // Apply transform
    if (layer.transform) {
      const { x, y, width: w, height: h, rotation, scaleX, scaleY } = layer.transform;
      
      ctx.translate(x + w / 2, y + h / 2);
      if (rotation) ctx.rotate((rotation * Math.PI) / 180);
      if (scaleX !== undefined || scaleY !== undefined) {
        ctx.scale(scaleX || 1, scaleY || 1);
      }
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }
    
    ctx.globalAlpha = layer.opacity || 1;
    
    // Render based on type
    if (layer.type === 'image' && layer.imageBitmap) {
      ctx.drawImage(layer.imageBitmap, layer.transform.x, layer.transform.y, 
                    layer.transform.width, layer.transform.height);
    } else if (layer.type === 'text' && layer.text) {
      ctx.font = `${layer.text.fontSize || 48}px ${layer.text.fontFamily || 'sans-serif'}`;
      ctx.fillStyle = layer.text.color || '#FFFFFF';
      ctx.textAlign = layer.text.textAlign || 'center';
      ctx.fillText(layer.text.content, layer.transform.x + layer.transform.width / 2, 
                   layer.transform.y + layer.transform.height / 2);
    }
    
    ctx.restore();
  }
  
  return canvas.transferToImageBitmap();
}

/**
 * Execute export task
 */
function executeExportTask(data) {
  const { canvas: imageBitmap, format, quality } = data;
  
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageBitmap, 0, 0);
  
  return canvas.convertToBlob({ type: `image/${format}`, quality: quality || 1 });
}

/**
 * Execute compress task
 */
function executeCompressTask(data) {
  const { imageBitmap, maxWidth, maxHeight, quality, format } = data;
  
  let width = imageBitmap.width;
  let height = imageBitmap.height;
  
  if (maxWidth && width > maxWidth) {
    height = height * (maxWidth / width);
    width = maxWidth;
  }
  
  if (maxHeight && height > maxHeight) {
    width = width * (maxHeight / height);
    height = maxHeight;
  }
  
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imageBitmap, 0, 0, width, height);
  
  return canvas.convertToBlob({ type: `image/${format || 'jpeg'}`, quality: quality || 0.85 });
}

/**
 * Execute image processing task
 */
function executeImageTask(data) {
  const { imageBitmap, operations } = data;
  
  let canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  let ctx = canvas.getContext('2d');
  ctx.drawImage(imageBitmap, 0, 0);
  
  for (const operation of operations) {
    const resultCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const resultCtx = resultCanvas.getContext('2d');
    
    switch (operation.type) {
      case 'filter':
        resultCtx.filter = operation.value;
        resultCtx.drawImage(canvas, 0, 0);
        break;
        
      case 'resize':
        resultCanvas.width = operation.width;
        resultCanvas.height = operation.height;
        resultCtx.drawImage(canvas, 0, 0, operation.width, operation.height);
        break;
        
      case 'crop':
        resultCanvas.width = operation.width;
        resultCanvas.height = operation.height;
        resultCtx.drawImage(canvas, operation.x, operation.y, 
                           operation.width, operation.height, 0, 0, 
                           operation.width, operation.height);
        break;
    }
    
    canvas = resultCanvas;
    ctx = resultCtx;
  }
  
  return canvas.transferToImageBitmap();
}

/**
 * Report task update
 */
function reportTaskUpdate(task) {
  self.postMessage({
    type: 'task-update',
    data: {
      id: task.id,
      type: task.type,
      status: task.status,
      progress: task.progress,
      attempts: task.attempts,
      duration: task.duration,
      error: task.error
    }
  });
}

/**
 * Report queue update
 */
function reportQueueUpdate() {
  const status = getQueueStatus();
  self.postMessage({
    type: 'queue-update',
    data: status
  });
}

/**
 * Get queue status
 */
function getQueueStatus() {
  return {
    queueLength: taskQueue.length,
    isProcessing,
    currentTask: currentTask ? {
      id: currentTask.id,
      type: currentTask.type,
      status: currentTask.status,
      started: currentTask.started
    } : null,
    tasks: {
      queued: taskQueue.filter(t => t.status === 'queued').length,
      processing: (currentTask && currentTask.status === 'processing') ? 1 : 0,
      retrying: taskQueue.filter(t => t.status === 'retrying').length,
      completed: 0,
      failed: 0,
      cancelled: 0
    }
  };
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cleanup
 */
function cleanup() {
  taskQueue = [];
  currentTask = null;
  isProcessing = false;
}