/**
 * Meme Foundry - Math Utilities
 * Common math functions for geometry, transforms, and calculations
 */

/**
 * Clamp a value between min and max
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Map a value from one range to another
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Round to nearest multiple
 */
export function roundTo(value, multiple = 1) {
  return Math.round(value / multiple) * multiple;
}

/**
 * Round to decimal places
 */
export function roundToDecimals(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculate distance between two points
 */
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle between two points in radians
 */
export function angleBetween(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Calculate point on circle
 */
export function pointOnCircle(cx, cy, radius, angle) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle)
  };
}

/**
 * Check if point is inside rectangle
 */
export function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * Check if two rectangles overlap
 */
export function rectsOverlap(r1, r2) {
  return !(
    r1.x + r1.width < r2.x ||
    r2.x + r2.width < r1.x ||
    r1.y + r1.height < r2.y ||
    r2.y + r2.height < r1.y
  );
}

/**
 * Get bounding box of rotated rectangle
 */
export function getRotatedBoundingBox(x, y, width, height, rotation) {
  const rad = degToRad(rotation);
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos
  };
}

/**
 * Calculate aspect ratio
 */
export function aspectRatio(width, height) {
  return width / height;
}

/**
 * Fit rectangle within bounds maintaining aspect ratio
 */
export function fitRect(width, height, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio)
  };
}

/**
 * Calculate scale to fit
 */
export function scaleToFit(srcWidth, srcHeight, destWidth, destHeight, mode = 'contain') {
  const srcRatio = srcWidth / srcHeight;
  const destRatio = destWidth / destHeight;
  
  switch (mode) {
    case 'contain':
      return srcRatio > destRatio
        ? destWidth / srcWidth
        : destHeight / srcHeight;
        
    case 'cover':
      return srcRatio > destRatio
        ? destHeight / srcHeight
        : destWidth / srcWidth;
        
    case 'fill':
      return { x: destWidth / srcWidth, y: destHeight / srcHeight };
      
    default:
      return 1;
  }
}

/**
 * Snap value to grid
 */
export function snapToGrid(value, gridSize) {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Calculate centroid of points
 */
export function centroid(points) {
  if (points.length === 0) return { x: 0, y: 0 };
  
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  
  return {
    x: sum.x / points.length,
    y: sum.y / points.length
  };
}

/**
 * Calculate bounding box of points
 */
export function boundingBox(points) {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  points.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Check if value is approximately equal
 */
export function approximately(a, b, epsilon = 0.001) {
  return Math.abs(a - b) < epsilon;
}

/**
 * Normalize angle to 0-360 range
 */
export function normalizeAngle(angle) {
  angle = angle % 360;
  if (angle < 0) angle += 360;
  return angle;
}

/**
 * Shortest angle difference
 */
export function angleDifference(a, b) {
  let diff = normalizeAngle(b) - normalizeAngle(a);
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

/**
 * Convert polar to cartesian
 */
export function polarToCartesian(cx, cy, radius, angle) {
  return {
    x: cx + radius * Math.cos(degToRad(angle)),
    y: cy + radius * Math.sin(degToRad(angle))
  };
}

/**
 * Convert cartesian to polar
 */
export function cartesianToPolar(x, y, cx = 0, cy = 0) {
  const dx = x - cx;
  const dy = y - cy;
  return {
    radius: Math.sqrt(dx * dx + dy * dy),
    angle: radToDeg(Math.atan2(dy, dx))
  };
}

/**
 * Easing functions
 */
export const Easing = {
  linear: (t) => t,
  
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  easeInElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
  },
  easeOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
  },
  
  easeOutBounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  }
};

/**
 * Generate unique ID
 */
export function generateId() {
  return crypto.randomUUID();
}

/**
 * Hash string to number
 */
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Generate random number in range
 */
export function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Generate random integer in range
 */
export function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}