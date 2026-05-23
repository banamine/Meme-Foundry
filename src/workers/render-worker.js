/**
 * Meme Foundry - Render Worker
 * Web Worker for off-main-thread rendering operations
 */

// Worker context - no DOM access
let offscreenCanvas = null;
let offscreenCtx = null;
let renderConfig = null;

// Message handler
self.onmessage = async function(event) {
  const { type, data, id } = event.data;
  
  try {
    switch (type) {
      case 'init':
        await handleInit(data);
        self.postMessage({ id, type: 'init-complete', success: true });
        break;
        
      case 'render':
        await handleRender(data);
        self.postMessage({ id, type: 'render-complete', success: true });
        break;
        
      case 'render-region':
        await handleRenderRegion(data);
        self.postMessage({ id, type: 'render-region-complete', success: true });
        break;
        
      case 'resize':
        await handleResize(data);
        self.postMessage({ id, type: 'resize-complete', success: true });
        break;
        
      case 'export-frame':
        const frameData = await handleExportFrame(data);
        self.postMessage({ 
          id, 
          type: 'export-frame-complete', 
          success: true, 
          data: frameData 
        }, [frameData.buffer]);
        break;
        
      case 'apply-effects':
        await handleApplyEffects(data);
        self.postMessage({ id, type: 'effects-complete', success: true });
        break;
        
      case 'measure-text':
        const metrics = await handleMeasureText(data);
        self.postMessage({ 
          id, 
          type: 'measure-text-complete', 
          success: true, 
          data: metrics 
        });
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
    self.postMessage({ 
      id, 
      type: `${type}-error`, 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * Initialize worker with canvas
 */
async function handleInit(config) {
  renderConfig = {
    width: config.width || 1080,
    height: config.height || 1080,
    pixelRatio: config.pixelRatio || 1,
    backgroundColor: config.backgroundColor || '#FFFFFF',
    antialias: config.antialias !== false
  };
  
  // Create OffscreenCanvas
  offscreenCanvas = new OffscreenCanvas(
    renderConfig.width * renderConfig.pixelRatio,
    renderConfig.height * renderConfig.pixelRatio
  );
  
  offscreenCtx = offscreenCanvas.getContext('2d', {
    alpha: true,
    willReadFrequently: true
  });
  
  if (offscreenCtx) {
    offscreenCtx.scale(renderConfig.pixelRatio, renderConfig.pixelRatio);
  }
}

/**
 * Handle full render
 */
async function handleRender(data) {
  const { layers, time = 0 } = data;
  
  if (!offscreenCtx) throw new Error('Worker not initialized');
  
  // Clear canvas
  offscreenCtx.clearRect(0, 0, renderConfig.width, renderConfig.height);
  
  // Render background
  offscreenCtx.fillStyle = renderConfig.backgroundColor;
  offscreenCtx.fillRect(0, 0, renderConfig.width, renderConfig.height);
  
  // Render layers
  for (const layer of layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    
    offscreenCtx.save();
    
    // Apply transform
    applyTransform(offscreenCtx, layer.transform);
    
    // Apply opacity and blend mode
    offscreenCtx.globalAlpha = layer.opacity || 1;
    offscreenCtx.globalCompositeOperation = layer.blendMode || 'normal';
    
    // Render layer content
    await renderLayer(offscreenCtx, layer, time);
    
    offscreenCtx.restore();
  }
  
  // Transfer canvas to main thread
  const imageBitmap = offscreenCanvas.transferToImageBitmap();
  self.postMessage({ 
    type: 'render-result', 
    imageBitmap 
  }, [imageBitmap]);
}

/**
 * Render specific region of canvas
 */
async function handleRenderRegion(data) {
  const { layers, x, y, width, height, time } = data;
  
  if (!offscreenCtx) throw new Error('Worker not initialized');
  
  // Save current state
  offscreenCtx.save();
  
  // Clip to region
  offscreenCtx.beginPath();
  offscreenCtx.rect(x, y, width, height);
  offscreenCtx.clip();
  
  // Clear region
  offscreenCtx.clearRect(x, y, width, height);
  
  // Render background for region
  offscreenCtx.fillStyle = renderConfig.backgroundColor;
  offscreenCtx.fillRect(x, y, width, height);
  
  // Render layers that intersect region
  for (const layer of layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    if (!layerIntersectsRegion(layer, x, y, width, height)) continue;
    
    offscreenCtx.save();
    applyTransform(offscreenCtx, layer.transform);
    offscreenCtx.globalAlpha = layer.opacity || 1;
    await renderLayer(offscreenCtx, layer, time);
    offscreenCtx.restore();
  }
  
  offscreenCtx.restore();
  
  // Send region as ImageBitmap
  const imageData = offscreenCtx.getImageData(x, y, width, height);
  self.postMessage({ 
    type: 'region-result',
    x, y, width, height,
    imageData
  });
}

/**
 * Resize canvas
 */
async function handleResize(data) {
  const { width, height } = data;
  
  renderConfig.width = width;
  renderConfig.height = height;
  
  offscreenCanvas = new OffscreenCanvas(
    width * renderConfig.pixelRatio,
    height * renderConfig.pixelRatio
  );
  
  offscreenCtx = offscreenCanvas.getContext('2d', {
    alpha: true,
    willReadFrequently: true
  });
  
  offscreenCtx.scale(renderConfig.pixelRatio, renderConfig.pixelRatio);
}

/**
 * Export single frame
 */
async function handleExportFrame(data) {
  const { layers, time, format = 'image/png', quality = 1 } = data;
  
  // Create export canvas
  const exportCanvas = new OffscreenCanvas(
    renderConfig.width * renderConfig.pixelRatio,
    renderConfig.height * renderConfig.pixelRatio
  );
  
  const ctx = exportCanvas.getContext('2d');
  ctx.scale(renderConfig.pixelRatio, renderConfig.pixelRatio);
  
  // Render frame
  ctx.fillStyle = renderConfig.backgroundColor;
  ctx.fillRect(0, 0, renderConfig.width, renderConfig.height);
  
  for (const layer of layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    
    ctx.save();
    applyTransform(ctx, layer.transform);
    ctx.globalAlpha = layer.opacity || 1;
    await renderLayer(ctx, layer, time);
    ctx.restore();
  }
  
  // Convert to blob
  const blob = await exportCanvas.convertToBlob({ 
    type: format, 
    quality 
  });
  
  // Return as ArrayBuffer for transfer
  return await blob.arrayBuffer();
}

/**
 * Apply effects to image data
 */
async function handleApplyEffects(data) {
  const { imageData, effects } = data;
  
  if (!offscreenCtx) throw new Error('Worker not initialized');
  
  // Create temporary canvas for effects
  const tempCanvas = new OffscreenCanvas(imageData.width, imageData.height);
  const tempCtx = tempCanvas.getContext('2d');
  
  // Put image data
  tempCtx.putImageData(imageData, 0, 0);
  
  // Apply each effect
  for (const effect of effects) {
    if (!effect.enabled) continue;
    
    switch (effect.type) {
      case 'blur':
        tempCtx.filter = `blur(${effect.settings?.amount || 5}px)`;
        tempCtx.drawImage(tempCanvas, 0, 0);
        tempCtx.filter = 'none';
        break;
        
      case 'brightness':
        tempCtx.filter = `brightness(${effect.settings?.value || 100}%)`;
        tempCtx.drawImage(tempCanvas, 0, 0);
        tempCtx.filter = 'none';
        break;
        
      case 'contrast':
        tempCtx.filter = `contrast(${effect.settings?.value || 100}%)`;
        tempCtx.drawImage(tempCanvas, 0, 0);
        tempCtx.filter = 'none';
        break;
        
      case 'saturation':
        tempCtx.filter = `saturate(${effect.settings?.value || 100}%)`;
        tempCtx.drawImage(tempCanvas, 0, 0);
        tempCtx.filter = 'none';
        break;
        
      case 'noise':
        applyNoiseEffect(tempCtx, effect.settings);
        break;
    }
  }
  
  // Get processed image data
  const processedData = tempCtx.getImageData(0, 0, imageData.width, imageData.height);
  
  self.postMessage({ 
    type: 'effects-result', 
    imageData: processedData 
  });
}

/**
 * Measure text dimensions
 */
async function handleMeasureText(data) {
  const { text, font, maxWidth, lineHeight } = data;
  
  // Create temporary canvas for text measurement
  const measureCanvas = new OffscreenCanvas(1, 1);
  const measureCtx = measureCanvas.getContext('2d');
  
  measureCtx.font = font;
  
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  if (maxWidth > 0) {
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = measureCtx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  } else {
    lines.push(text);
  }
  
  const lineHeightPx = parseFloat(font) * (lineHeight || 1.2);
  
  return {
    width: Math.max(...lines.map(line => measureCtx.measureText(line).width)),
    height: lines.length * lineHeightPx,
    lines,
    lineHeight: lineHeightPx,
    fontSize: parseFloat(font)
  };
}

/**
 * Apply transform to context
 */
function applyTransform(ctx, transform) {
  if (!transform) return;
  
  const {
    x = 0, y = 0,
    width = 100, height = 100,
    rotation = 0,
    scaleX = 1, scaleY = 1,
    anchorX = 0.5, anchorY = 0.5,
    flipH = false, flipV = false
  } = transform;
  
  const anchorPX = x + width * anchorX;
  const anchorPY = y + height * anchorY;
  
  ctx.translate(anchorPX, anchorPY);
  
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }
  
  ctx.scale(scaleX * (flipH ? -1 : 1), scaleY * (flipV ? -1 : 1));
  ctx.translate(-anchorPX, -anchorPY);
}

/**
 * Render individual layer
 */
async function renderLayer(ctx, layer, time = 0) {
  const transform = layer.transform || {};
  const { x = 0, y = 0, width = 100, height = 100 } = transform;
  
  switch (layer.type) {
    case 'image':
      await renderImage(ctx, layer, x, y, width, height);
      break;
      
    case 'text':
      renderText(ctx, layer, x, y, width, height);
      break;
      
    case 'shape':
      renderShape(ctx, layer, x, y, width, height);
      break;
      
    case 'group':
      if (layer.group?.children) {
        for (const child of layer.group.children) {
          if (!child.visible || child.opacity <= 0) continue;
          ctx.save();
          applyTransform(ctx, child.transform);
          ctx.globalAlpha = child.opacity || 1;
          await renderLayer(ctx, child, time);
          ctx.restore();
        }
      }
      break;
  }
}

/**
 * Render image layer
 */
async function renderImage(ctx, layer, x, y, width, height) {
  if (!layer.image?.src) return;
  
  try {
    // In worker, we'd receive ImageBitmap from main thread
    if (layer.image.bitmap) {
      ctx.drawImage(layer.image.bitmap, x, y, width, height);
    }
  } catch (error) {
    // Render placeholder
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(x, y, width, height);
  }
}

/**
 * Render text layer
 */
function renderText(ctx, layer, x, y, width, height) {
  const text = layer.text;
  if (!text?.content) return;
  
  ctx.save();
  
  // Set font
  ctx.font = `${text.fontStyle || 'normal'} ${text.fontWeight || 'normal'} ${text.fontSize || 48}px ${text.fontFamily || 'Impact, sans-serif'}`;
  ctx.textAlign = text.textAlign || 'center';
  ctx.textBaseline = 'middle';
  
  // Apply text color
  ctx.fillStyle = text.color || '#FFFFFF';
  
  // Apply shadows
  if (text.shadows?.length > 0) {
    const shadow = text.shadows[0];
    ctx.shadowColor = shadow.color || '#000000';
    ctx.shadowBlur = shadow.blur || 0;
    ctx.shadowOffsetX = shadow.offsetX || 0;
    ctx.shadowOffsetY = shadow.offsetY || 0;
  }
  
  // Apply stroke
  if (text.strokeWidth > 0) {
    ctx.strokeStyle = text.strokeColor || '#000000';
    ctx.lineWidth = text.strokeWidth;
    ctx.lineJoin = 'round';
    
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    ctx.strokeText(text.content, centerX, centerY);
  }
  
  // Render text
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  ctx.fillText(text.content, centerX, centerY);
  
  ctx.restore();
}

/**
 * Render shape layer
 */
function renderShape(ctx, layer, x, y, width, height) {
  const shape = layer.shape;
  if (!shape) return;
  
  ctx.beginPath();
  
  switch (shape.shapeType) {
    case 'rectangle':
      if (shape.borderRadius) {
        roundRect(ctx, x, y, width, height, shape.borderRadius);
      } else {
        ctx.rect(x, y, width, height);
      }
      break;
      
    case 'ellipse':
      ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      break;
      
    case 'triangle':
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      break;
  }
  
  if (shape.fill && shape.fill !== 'transparent') {
    ctx.fillStyle = shape.fill;
    ctx.fill();
  }
  
  if (shape.stroke && shape.stroke !== 'transparent') {
    ctx.strokeStyle = shape.stroke;
    ctx.lineWidth = shape.strokeWidth || 1;
    ctx.stroke();
  }
}

/**
 * Draw rounded rectangle
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Check if layer intersects region
 */
function layerIntersectsRegion(layer, rx, ry, rw, rh) {
  const t = layer.transform || {};
  const lx = t.x || 0;
  const ly = t.y || 0;
  const lw = t.width || 100;
  const lh = t.height || 100;
  
  return !(lx + lw < rx || lx > rx + rw || ly + lh < ry || ly > ry + rh);
}

/**
 * Apply noise effect
 */
function applyNoiseEffect(ctx, settings) {
  const { amount = 10 } = settings || {};
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() * 2 - 1) * amount;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Cleanup resources
 */
function cleanup() {
  offscreenCanvas = null;
  offscreenCtx = null;
  renderConfig = null;
}