/**
 * Meme Foundry - Image Utilities
 * Image processing, manipulation, and optimization helpers
 */

/**
 * Load image from file
 */
export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Load image from URL
 */
export function loadImageFromURL(url, crossOrigin = 'anonymous') {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Create canvas from image
 */
export function imageToCanvas(img, width = null, height = null) {
  const canvas = document.createElement('canvas');
  canvas.width = width || img.naturalWidth || img.width;
  canvas.height = height || img.naturalHeight || img.height;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  return canvas;
}

/**
 * Resize image
 */
export function resizeImage(img, maxWidth, maxHeight, quality = 'high') {
  const canvas = document.createElement('canvas');
  const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = quality;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  return {
    canvas,
    width: canvas.width,
    height: canvas.height,
    scale: ratio
  };
}

/**
 * Crop image
 */
export function cropImage(img, x, y, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
  
  return canvas;
}

/**
 * Rotate image
 */
export function rotateImage(img, degrees) {
  const radians = degrees * Math.PI / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  
  const newWidth = Math.round(img.width * cos + img.height * sin);
  const newHeight = Math.round(img.width * sin + img.height * cos);
  
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.translate(newWidth / 2, newHeight / 2);
  ctx.rotate(radians);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  
  return canvas;
}

/**
 * Flip image
 */
export function flipImage(img, horizontal = false, vertical = false) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  
  const ctx = canvas.getContext('2d');
  
  ctx.save();
  ctx.translate(horizontal ? img.width : 0, vertical ? img.height : 0);
  ctx.scale(horizontal ? -1 : 1, vertical ? -1 : 1);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
  
  return canvas;
}

/**
 * Apply filters to image
 */
export function applyImageFilters(img, filters) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  
  const ctx = canvas.getContext('2d');
  ctx.filter = buildCSSFilter(filters);
  ctx.drawImage(img, 0, 0);
  
  return canvas;
}

/**
 * Build CSS filter string
 */
function buildCSSFilter(filters) {
  const parts = [];
  
  if (filters.brightness !== undefined && filters.brightness !== 100) {
    parts.push(`brightness(${filters.brightness}%)`);
  }
  if (filters.contrast !== undefined && filters.contrast !== 100) {
    parts.push(`contrast(${filters.contrast}%)`);
  }
  if (filters.saturation !== undefined && filters.saturation !== 100) {
    parts.push(`saturate(${filters.saturation}%)`);
  }
  if (filters.hue !== undefined && filters.hue !== 0) {
    parts.push(`hue-rotate(${filters.hue}deg)`);
  }
  if (filters.blur !== undefined && filters.blur > 0) {
    parts.push(`blur(${filters.blur}px)`);
  }
  if (filters.sepia !== undefined && filters.sepia > 0) {
    parts.push(`sepia(${filters.sepia}%)`);
  }
  
  return parts.join(' ');
}

/**
 * Convert image to blob
 */
export function canvasToBlob(canvas, format = 'image/png', quality = 1) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      `image/${format}`,
      quality
    );
  });
}

/**
 * Convert image to data URL
 */
export function canvasToDataURL(canvas, format = 'image/png', quality = 1) {
  return canvas.toDataURL(`image/${format}`, quality);
}

/**
 * Get image data from canvas
 */
export function getImageData(canvas, x = 0, y = 0, width = null, height = null) {
  const ctx = canvas.getContext('2d');
  return ctx.getImageData(
    x, y,
    width || canvas.width,
    height || canvas.height
  );
}

/**
 * Put image data to canvas
 */
export function putImageData(canvas, imageData, x = 0, y = 0) {
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, x, y);
}

/**
 * Get pixel color at position
 */
export function getPixelColor(canvas, x, y) {
  const ctx = canvas.getContext('2d');
  const pixel = ctx.getImageData(x, y, 1, 1).data;
  
  return {
    r: pixel[0],
    g: pixel[1],
    b: pixel[2],
    a: pixel[3] / 255,
    hex: `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`
  };
}

/**
 * Get average color of image
 */
export function getAverageColor(canvas, sampleSize = 10) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  let r = 0, g = 0, b = 0, count = 0;
  
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / sampleSize))) {
    for (let x = 0; x < width; x += Math.max(1, Math.floor(width / sampleSize))) {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      r += pixel[0];
      g += pixel[1];
      b += pixel[2];
      count++;
    }
  }
  
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
    hex: `#${Math.round(r / count).toString(16).padStart(2, '0')}${Math.round(g / count).toString(16).padStart(2, '0')}${Math.round(b / count).toString(16).padStart(2, '0')}`
  };
}

/**
 * Detect dominant colors
 */
export function getDominantColors(canvas, count = 5) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const colorMap = new Map();
  
  // Sample pixels
  const sampleRate = Math.max(1, Math.floor(imageData.data.length / (4 * 10000)));
  
  for (let i = 0; i < imageData.data.length; i += 4 * sampleRate) {
    const r = Math.round(imageData.data[i] / 32) * 32;
    const g = Math.round(imageData.data[i + 1] / 32) * 32;
    const b = Math.round(imageData.data[i + 2] / 32) * 32;
    const key = `${r},${g},${b}`;
    
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }
  
  // Sort by frequency
  return Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key, frequency]) => {
      const [r, g, b] = key.split(',').map(Number);
      return {
        r, g, b,
        hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
        frequency
      };
    });
}

/**
 * Check if image has transparency
 */
export function hasTransparency(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  for (let i = 3; i < imageData.data.length; i += 4) {
    if (imageData.data[i] < 255) return true;
  }
  
  return false;
}

/**
 * Detect image edges (simple edge detection)
 */
export function detectEdges(canvas, threshold = 50) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      
      // Sobel operator (simplified)
      const gx = 
        -data[i - 4 - width * 4] + data[i + 4 - width * 4] +
        -2 * data[i - 4] + 2 * data[i + 4] +
        -data[i - 4 + width * 4] + data[i + 4 + width * 4];
      
      const gy = 
        -data[i - 4 - width * 4] - 2 * data[i - width * 4] - data[i + 4 - width * 4] +
        data[i - 4 + width * 4] + 2 * data[i + width * 4] + data[i + 4 + width * 4];
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      
      if (magnitude > threshold) {
        output[i] = 255;
        output[i + 1] = 255;
        output[i + 2] = 255;
        output[i + 3] = 255;
      } else {
        output[i + 3] = 255;
      }
    }
  }
  
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = width;
  resultCanvas.height = height;
  resultCanvas.getContext('2d').putImageData(
    new ImageData(output, width, height),
    0, 0
  );
  
  return resultCanvas;
}

/**
 * Create circular crop
 */
export function circularCrop(img, size = null) {
  const diameter = size || Math.min(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = diameter;
  canvas.height = diameter;
  
  const ctx = canvas.getContext('2d');
  
  ctx.beginPath();
  ctx.arc(diameter / 2, diameter / 2, diameter / 2, 0, Math.PI * 2);
  ctx.clip();
  
  // Calculate position to center
  const sx = (img.width - diameter) / 2;
  const sy = (img.height - diameter) / 2;
  
  ctx.drawImage(img, sx, sy, diameter, diameter, 0, 0, diameter, diameter);
  
  return canvas;
}

/**
 * Create rounded corner image
 */
export function roundedCorners(img, radius = 20) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  
  const ctx = canvas.getContext('2d');
  
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(img.width - radius, 0);
  ctx.quadraticCurveTo(img.width, 0, img.width, radius);
  ctx.lineTo(img.width, img.height - radius);
  ctx.quadraticCurveTo(img.width, img.height, img.width - radius, img.height);
  ctx.lineTo(radius, img.height);
  ctx.quadraticCurveTo(0, img.height, 0, img.height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.clip();
  
  ctx.drawImage(img, 0, 0);
  
  return canvas;
}

/**
 * Create text watermark on image
 */
export function addWatermark(canvas, text, options = {}) {
  const {
    position = 'bottom-right',
    font = '14px sans-serif',
    color = 'rgba(255, 255, 255, 0.7)',
    margin = 20,
    rotation = 0
  } = options;
  
  const ctx = canvas.getContext('2d');
  ctx.save();
  
  ctx.font = font;
  ctx.fillStyle = color;
  
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = parseInt(font) || 14;
  
  let x, y;
  
  switch (position) {
    case 'top-left':
      x = margin;
      y = margin + textHeight;
      break;
    case 'top-right':
      x = canvas.width - textWidth - margin;
      y = margin + textHeight;
      break;
    case 'bottom-left':
      x = margin;
      y = canvas.height - margin;
      break;
    case 'bottom-right':
      x = canvas.width - textWidth - margin;
      y = canvas.height - margin;
      break;
    case 'center':
      x = (canvas.width - textWidth) / 2;
      y = canvas.height / 2;
      break;
    default:
      x = margin;
      y = canvas.height - margin;
  }
  
  if (rotation) {
    ctx.translate(x + textWidth / 2, y - textHeight / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.fillText(text, -textWidth / 2, textHeight / 2);
  } else {
    ctx.fillText(text, x, y);
  }
  
  ctx.restore();
}

/**
 * Convert image format
 */
export async function convertFormat(canvas, format = 'webp', quality = 0.85) {
  const blob = await canvasToBlob(canvas, format, quality);
  return blob;
}

/**
 * Optimize image for web
 */
export async function optimizeForWeb(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    format = 'webp'
  } = options;
  
  const img = await loadImageFromFile(file);
  const resized = resizeImage(img, maxWidth, maxHeight);
  const blob = await canvasToBlob(resized.canvas, format, quality);
  
  return {
    blob,
    width: resized.width,
    height: resized.height,
    originalSize: file.size,
    optimizedSize: blob.size,
    ratio: file.size / blob.size
  };
}

/**
 * Generate image palette
 */
export function generatePalette(canvas, count = 8) {
  return getDominantColors(canvas, count);
}

/**
 * Compare two images (simple pixel diff)
 */
export function compareImages(canvas1, canvas2, tolerance = 0) {
  if (canvas1.width !== canvas2.width || canvas1.height !== canvas2.height) {
    return { match: false, difference: 100 };
  }
  
  const ctx1 = canvas1.getContext('2d');
  const ctx2 = canvas2.getContext('2d');
  const data1 = ctx1.getImageData(0, 0, canvas1.width, canvas1.height).data;
  const data2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height).data;
  
  let differentPixels = 0;
  
  for (let i = 0; i < data1.length; i += 4) {
    const diff = Math.abs(data1[i] - data2[i]) +
                 Math.abs(data1[i + 1] - data2[i + 1]) +
                 Math.abs(data1[i + 2] - data2[i + 2]);
    
    if (diff > tolerance * 3) {
      differentPixels++;
    }
  }
  
  const totalPixels = canvas1.width * canvas1.height;
  const difference = (differentPixels / totalPixels) * 100;
  
  return {
    match: difference < 1,
    difference: difference.toFixed(2)
  };
}