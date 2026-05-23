/**
 * Meme Foundry - Thumbnail Worker
 * Specialized worker for generating thumbnails from images and videos
 */

// Configuration
const config = {
  maxSize: 300,
  quality: 0.7,
  format: 'image/jpeg'
};

// Message handler
self.onmessage = async function(event) {
  const { type, data, id } = event.data;
  
  try {
    switch (type) {
      case 'init':
        Object.assign(config, data || {});
        self.postMessage({ id, type: 'init-complete', success: true });
        break;
        
      case 'generate':
        const result = await generateThumbnail(data);
        self.postMessage({ 
          id, 
          type: 'generate-complete', 
          success: true, 
          data: result 
        });
        break;
        
      case 'generate-batch':
        const results = await generateBatchThumbnails(data);
        self.postMessage({ 
          id, 
          type: 'generate-batch-complete', 
          success: true, 
          data: results 
        });
        break;
        
      case 'generate-from-video':
        const videoResult = await generateVideoThumbnail(data);
        self.postMessage({ 
          id, 
          type: 'video-thumbnail-complete', 
          success: true, 
          data: videoResult 
        });
        break;
        
      case 'generate-spritesheet':
        const spritesheetResult = await generateSpritesheet(data);
        self.postMessage({ 
          id, 
          type: 'spritesheet-complete', 
          success: true, 
          data: spritesheetResult 
        });
        break;
        
      case 'terminate':
        self.postMessage({ id, type: 'terminated' });
        self.close();
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({ 
      id, 
      type: `${type}-error`, 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * Generate thumbnail from ImageBitmap
 */
async function generateThumbnail(data) {
  const { 
    imageBitmap, 
    maxSize = config.maxSize, 
    quality = config.quality,
    format = config.format,
    fit = 'cover'
  } = data;
  
  // Calculate dimensions
  let { width, height } = calculateThumbnailDimensions(
    imageBitmap.width, 
    imageBitmap.height, 
    maxSize,
    fit
  );
  
  // Create canvas
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Draw image
  if (fit === 'cover') {
    // Cover: crop to fill
    const scale = Math.max(maxSize / imageBitmap.width, maxSize / imageBitmap.height);
    const sw = maxSize / scale;
    const sh = maxSize / scale;
    const sx = (imageBitmap.width - sw) / 2;
    const sy = (imageBitmap.height - sh) / 2;
    
    ctx.drawImage(imageBitmap, sx, sy, sw, sh, 0, 0, width, height);
  } else {
    // Contain: fit within
    ctx.drawImage(imageBitmap, 0, 0, width, height);
  }
  
  // Convert to blob
  const blob = await canvas.convertToBlob({ 
    type: format, 
    quality 
  });
  
  return {
    blob,
    width,
    height,
    format,
    size: blob.size
  };
}

/**
 * Generate batch thumbnails
 */
async function generateBatchThumbnails(data) {
  const { images, maxSize = config.maxSize, quality = config.quality } = data;
  
  const results = [];
  
  for (const imageBitmap of images) {
    try {
      const result = await generateThumbnail({ 
        imageBitmap, 
        maxSize, 
        quality 
      });
      results.push({ success: true, ...result });
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }
  
  return results;
}

/**
 * Generate thumbnail from video frames
 */
async function generateVideoThumbnail(data) {
  const { 
    frames, 
    maxSize = config.maxSize,
    quality = config.quality,
    columns = 5,
    gap = 2
  } = data;
  
  if (!frames || frames.length === 0) {
    throw new Error('No frames provided');
  }
  
  const frameCount = frames.length;
  const rows = Math.ceil(frameCount / columns);
  
  // Calculate individual frame size
  const frameSize = Math.floor((maxSize - gap * (columns + 1)) / columns);
  
  // Calculate spritesheet dimensions
  const sheetWidth = columns * frameSize + gap * (columns + 1);
  const sheetHeight = rows * frameSize + gap * (rows + 1);
  
  const canvas = new OffscreenCanvas(sheetWidth, sheetHeight);
  const ctx = canvas.getContext('2d');
  
  // Fill background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, sheetWidth, sheetHeight);
  
  // Draw each frame
  for (let i = 0; i < frameCount; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    
    const x = gap + col * (frameSize + gap);
    const y = gap + row * (frameSize + gap);
    
    // Calculate frame dimensions maintaining aspect ratio
    const frameDims = calculateThumbnailDimensions(
      frames[i].width, 
      frames[i].height, 
      frameSize,
      'contain'
    );
    
    // Center frame in its slot
    const fx = x + (frameSize - frameDims.width) / 2;
    const fy = y + (frameSize - frameDims.height) / 2;
    
    ctx.drawImage(frames[i], fx, fy, frameDims.width, frameDims.height);
    
    // Draw timestamp
    if (frames[i].timestamp !== undefined) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(x, y + frameSize - 20, frameSize, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.fillText(formatTime(frames[i].timestamp), x + 5, y + frameSize - 6);
    }
  }
  
  // Convert to blob
  const blob = await canvas.convertToBlob({ 
    type: 'image/jpeg', 
    quality 
  });
  
  return {
    blob,
    width: sheetWidth,
    height: sheetHeight,
    columns,
    rows,
    frameCount,
    size: blob.size
  };
}

/**
 * Generate spritesheet from frames
 */
async function generateSpritesheet(data) {
  const { frames, columns = 5, gap = 0 } = data;
  
  if (!frames || frames.length === 0) {
    throw new Error('No frames provided');
  }
  
  // Find maximum frame dimensions
  const maxFrameWidth = Math.max(...frames.map(f => f.width));
  const maxFrameHeight = Math.max(...frames.map(f => f.height));
  
  const rows = Math.ceil(frames.length / columns);
  
  const sheetWidth = columns * maxFrameWidth + gap * (columns + 1);
  const sheetHeight = rows * maxFrameHeight + gap * (rows + 1);
  
  const canvas = new OffscreenCanvas(sheetWidth, sheetHeight);
  const ctx = canvas.getContext('2d');
  
  for (let i = 0; i < frames.length; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    
    const x = gap + col * (maxFrameWidth + gap);
    const y = gap + row * (maxFrameHeight + gap);
    
    ctx.drawImage(frames[i], x, y, maxFrameWidth, maxFrameHeight);
  }
  
  // Generate metadata
  const metadata = {
    frameWidth: maxFrameWidth,
    frameHeight: maxFrameHeight,
    columns,
    rows,
    frameCount: frames.length,
    gap
  };
  
  return {
    bitmap: canvas.transferToImageBitmap(),
    width: sheetWidth,
    height: sheetHeight,
    metadata
  };
}

/**
 * Calculate thumbnail dimensions
 */
function calculateThumbnailDimensions(srcWidth, srcHeight, maxSize, fit = 'contain') {
  if (fit === 'cover') {
    const scale = Math.max(maxSize / srcWidth, maxSize / srcHeight);
    return {
      width: maxSize,
      height: maxSize
    };
  }
  
  // Contain
  const ratio = Math.min(maxSize / srcWidth, maxSize / srcHeight, 1);
  return {
    width: Math.round(srcWidth * ratio),
    height: Math.round(srcHeight * ratio)
  };
}

/**
 * Format time in seconds to string
 */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}