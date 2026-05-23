/**
 * Meme Foundry - Resize Worker
 * Web Worker for image resizing and processing
 */

// Canvas for offscreen operations
let offscreenCanvas = null;
let offscreenCtx = null;

// Message handler
self.onmessage = async function(event) {
  const { type, data, id } = event.data;
  
  try {
    switch (type) {
      case 'init':
        handleInit(data);
        self.postMessage({ id, type: 'init-complete', success: true });
        break;
        
      case 'resize':
        const result = await handleResize(data);
        self.postMessage({ id, type: 'resize-complete', success: true, data: result }, [result.bitmap]);
        break;
        
      case 'resize-batch':
        const results = await handleResizeBatch(data);
        const bitmaps = results.map(r => r.bitmap);
        self.postMessage({ id, type: 'resize-batch-complete', success: true, data: results }, bitmaps);
        break;
        
      case 'crop':
        const cropResult = await handleCrop(data);
        self.postMessage({ id, type: 'crop-complete', success: true, data: cropResult }, [cropResult.bitmap]);
        break;
        
      case 'rotate':
        const rotateResult = await handleRotate(data);
        self.postMessage({ id, type: 'rotate-complete', success: true, data: rotateResult }, [rotateResult.bitmap]);
        break;
        
      case 'flip':
        const flipResult = await handleFlip(data);
        self.postMessage({ id, type: 'flip-complete', success: true, data: flipResult }, [flipResult.bitmap]);
        break;
        
      case 'apply-filters':
        const filterResult = await handleFilters(data);
        self.postMessage({ id, type: 'filters-complete', success: true, data: filterResult }, [filterResult.bitmap]);
        break;
        
      case 'generate-thumbnail':
        const thumbResult = await handleThumbnail(data);
        self.postMessage({ id, type: 'thumbnail-complete', success: true, data: thumbResult }, [thumbResult.bitmap]);
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
function handleInit(config) {
  const { width = 1920, height = 1080 } = config || {};
  
  offscreenCanvas = new OffscreenCanvas(width, height);
  offscreenCtx = offscreenCanvas.getContext('2d', { alpha: true });
}

/**
 * Handle image resize
 */
async function handleResize(data) {
  const { imageBitmap, width, height, quality = 'high' } = data;
  
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = quality;
  
  ctx.drawImage(imageBitmap, 0, 0, width, height);
  
  const bitmap = canvas.transferToImageBitmap();
  
  return { bitmap, width, height };
}

/**
 * Handle batch resize
 */
async function handleResizeBatch(data) {
  const { images, width, height, quality = 'high' } = data;
  
  const results = [];
  
  for (const imageBitmap of images) {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = quality;
    
    ctx.drawImage(imageBitmap, 0, 0, width, height);
    
    const bitmap = canvas.transferToImageBitmap();
    results.push({ bitmap, width, height });
  }
  
  return results;
}

/**
 * Handle image crop
 */
async function handleCrop(data) {
  const { imageBitmap, x, y, width, height } = data;
  
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(imageBitmap, x, y, width, height, 0, 0, width, height);
  
  const bitmap = canvas.transferToImageBitmap();
  
  return { bitmap, width, height };
}

/**
 * Handle image rotation
 */
async function handleRotate(data) {
  const { imageBitmap, degrees } = data;
  
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  
  const srcWidth = imageBitmap.width;
  const srcHeight = imageBitmap.height;
  
  const newWidth = Math.round(srcWidth * cos + srcHeight * sin);
  const newHeight = Math.round(srcWidth * sin + srcHeight * cos);
  
  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext('2d');
  
  ctx.translate(newWidth / 2, newHeight / 2);
  ctx.rotate(radians);
  ctx.drawImage(imageBitmap, -srcWidth / 2, -srcHeight / 2);
  
  const bitmap = canvas.transferToImageBitmap();
  
  return { bitmap, width: newWidth, height: newHeight };
}

/**
 * Handle image flip
 */
async function handleFlip(data) {
  const { imageBitmap, horizontal = false, vertical = false } = data;
  
  const width = imageBitmap.width;
  const height = imageBitmap.height;
  
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  ctx.save();
  ctx.translate(horizontal ? width : 0, vertical ? height : 0);
  ctx.scale(horizontal ? -1 : 1, vertical ? -1 : 1);
  ctx.drawImage(imageBitmap, 0, 0);
  ctx.restore();
  
  const bitmap = canvas.transferToImageBitmap();
  
  return { bitmap, width, height };
}

/**
 * Handle image filters
 */
async function handleFilters(data) {
  const { imageBitmap, filters } = data;
  
  const width = imageBitmap.width;
  const height = imageBitmap.height;
  
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Build CSS filter string
  const filterParts = [];
  
  if (filters.brightness !== undefined && filters.brightness !== 100) {
    filterParts.push(`brightness(${filters.brightness}%)`);
  }
  if (filters.contrast !== undefined && filters.contrast !== 100) {
    filterParts.push(`contrast(${filters.contrast}%)`);
  }
  if (filters.saturation !== undefined && filters.saturation !== 100) {
    filterParts.push(`saturate(${filters.saturation}%)`);
  }
  if (filters.hue !== undefined && filters.hue !== 0) {
    filterParts.push(`hue-rotate(${filters.hue}deg)`);
  }
  if (filters.blur !== undefined && filters.blur > 0) {
    filterParts.push(`blur(${filters.blur}px)`);
  }
  if (filters.sepia !== undefined && filters.sepia > 0) {
    filterParts.push(`sepia(${filters.sepia}%)`);
  }
  
  if (filterParts.length > 0) {
    ctx.filter = filterParts.join(' ');
  }
  
  ctx.drawImage(imageBitmap, 0, 0);
  
  const bitmap = canvas.transferToImageBitmap();
  
  return { bitmap, width, height };
}

/**
 * Handle thumbnail generation
 */
async function handleThumbnail(data) {
  const { imageBitmap, maxSize = 300 } = data;
  
  const ratio = Math.min(maxSize / imageBitmap.width, maxSize / imageBitmap.height);
  const width = Math.round(imageBitmap.width * ratio);
  const height = Math.round(imageBitmap.height * ratio);
  
  return handleResize({ imageBitmap, width, height, quality: 'high' });
}

/**
 * Cleanup
 */
function cleanup() {
  offscreenCanvas = null;
  offscreenCtx = null;
}