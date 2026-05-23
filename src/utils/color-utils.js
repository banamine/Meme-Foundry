/**
 * Meme Foundry - Color Utilities
 * Color conversion, manipulation, and palette generation
 */

/**
 * Parse hex color to RGB
 */
export function hexToRgb(hex) {
  let h = hex.replace('#', '');
  
  // Handle shorthand
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('');
  }
  
  // Handle hex with alpha
  if (h.length === 8) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: parseInt(h.slice(6, 8), 16) / 255
    };
  }
  
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: 1
  };
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = Math.round(clamp(n, 0, 255)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * Convert hex to HSL
 */
export function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

/**
 * Convert HSL to hex
 */
export function hslToHex(h, s, l) {
  const rgb = hslToRgb(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/**
 * Get relative luminance (for contrast calculations)
 */
export function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  
  const srgb = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/**
 * Calculate contrast ratio between two colors
 */
export function contrastRatio(color1, color2) {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Lighten color by percentage
 */
export function lighten(hex, amount = 10) {
  const hsl = hexToHsl(hex);
  hsl.l = Math.min(100, hsl.l + amount);
  return hslToHex(hsl.h, hsl.s, hsl.l);
}

/**
 * Darken color by percentage
 */
export function darken(hex, amount = 10) {
  const hsl = hexToHsl(hex);
  hsl.l = Math.max(0, hsl.l - amount);
  return hslToHex(hsl.h, hsl.s, hsl.l);
}

/**
 * Saturate color by percentage
 */
export function saturate(hex, amount = 10) {
  const hsl = hexToHsl(hex);
  hsl.s = Math.min(100, hsl.s + amount);
  return hslToHex(hsl.h, hsl.s, hsl.l);
}

/**
 * Desaturate color by percentage
 */
export function desaturate(hex, amount = 10) {
  const hsl = hexToHsl(hex);
  hsl.s = Math.max(0, hsl.s - amount);
  return hslToHex(hsl.h, hsl.s, hsl.l);
}

/**
 * Adjust alpha of color
 */
export function alpha(hex, alpha) {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`;
}

/**
 * Mix two colors
 */
export function mix(hex1, hex2, ratio = 0.5) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  
  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio);
  
  return rgbToHex(r, g, b);
}

/**
 * Invert color
 */
export function invert(hex) {
  const rgb = hexToRgb(hex);
  return rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
}

/**
 * Get complementary color
 */
export function complementary(hex) {
  const hsl = hexToHsl(hex);
  hsl.h = (hsl.h + 180) % 360;
  return hslToHex(hsl.h, hsl.s, hsl.l);
}

/**
 * Generate analogous colors
 */
export function analogous(hex, count = 5, angle = 30) {
  const hsl = hexToHsl(hex);
  const colors = [];
  
  for (let i = -Math.floor(count / 2); i <= Math.floor(count / 2); i++) {
    const h = (hsl.h + i * angle + 360) % 360;
    colors.push(hslToHex(h, hsl.s, hsl.l));
  }
  
  return colors;
}

/**
 * Generate triadic colors
 */
export function triadic(hex) {
  const hsl = hexToHsl(hex);
  return [
    hex,
    hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l)
  ];
}

/**
 * Generate monochromatic palette
 */
export function monochromatic(hex, count = 5) {
  const hsl = hexToHsl(hex);
  const colors = [];
  
  for (let i = 0; i < count; i++) {
    const l = Math.min(100, Math.max(0, hsl.l + (i - 2) * 15));
    colors.push(hslToHex(hsl.h, hsl.s, l));
  }
  
  return colors;
}

/**
 * Generate gradient stops
 */
export function gradientStops(startColor, endColor, steps = 10) {
  const stops = [];
  
  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    stops.push({
      offset: ratio,
      color: mix(startColor, endColor, ratio)
    });
  }
  
  return stops;
}

/**
 * Check if color is light
 */
export function isLight(hex, threshold = 0.5) {
  return getLuminance(hex) > threshold;
}

/**
 * Check if color is dark
 */
export function isDark(hex, threshold = 0.5) {
  return !isLight(hex, threshold);
}

/**
 * Get text color for background (black or white)
 */
export function textColorForBackground(bgColor) {
  return isLight(bgColor) ? '#000000' : '#FFFFFF';
}

/**
 * Parse any color string to hex
 */
export function parseToHex(color) {
  if (!color) return '#000000';
  
  // Already hex
  if (color.startsWith('#')) {
    return color;
  }
  
  // RGB/RGBA
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return rgbToHex(
      parseInt(rgbMatch[1]),
      parseInt(rgbMatch[2]),
      parseInt(rgbMatch[3])
    );
  }
  
  // Named colors
  const named = {
    black: '#000000', white: '#FFFFFF', red: '#FF0000', green: '#008000',
    blue: '#0000FF', yellow: '#FFFF00', orange: '#FFA500', purple: '#800080',
    pink: '#FFC0CB', gray: '#808080', transparent: 'transparent'
  };
  
  return named[color.toLowerCase()] || '#000000';
}

/**
 * Format color for output
 */
export function formatColor(hex, format = 'hex') {
  switch (format) {
    case 'hex':
      return hex;
    case 'rgb':
      const rgb = hexToRgb(hex);
      return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    case 'rgba':
      const rgba = hexToRgb(hex);
      return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
    case 'hsl':
      const hsl = hexToHsl(hex);
      return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    default:
      return hex;
  }
}

/**
 * Validate color string
 */
export function isValidColor(color) {
  if (!color) return false;
  
  // Hex
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color)) {
    return true;
  }
  
  // RGB/RGBA
  if (/^rgba?\(\d+,\s*\d+,\s*\d+(?:,\s*[\d.]+)?\)$/.test(color)) {
    return true;
  }
  
  // HSL/HSLA
  if (/^hsla?\(\d+,\s*\d+%,\s*\d+%(?:,\s*[\d.]+)?\)$/.test(color)) {
    return true;
  }
  
  return false;
}

// Import clamp for internal use
import { clamp } from './math.js';