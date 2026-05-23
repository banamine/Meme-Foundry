/**
 * Meme Foundry - HTML Bundle Export
 * Creates standalone HTML packages with embedded media
 */

import { Logger } from '@/utils/logger.js';

class HtmlBundleExport {
  constructor(sceneManager) {
    this.logger = new Logger('HtmlBundleExport');
    this.sceneManager = sceneManager;
  }

  /**
   * Export scene as standalone HTML bundle
   */
  async export(options = {}) {
    const {
      inlineAssets = true,
      responsive = true,
      includeAudio = true,
      autoplay = false,
      loop = false,
      title = 'Meme Foundry Export',
      minify = true
    } = options;

    try {
      const scene = this.sceneManager.scene;
      
      // Collect all assets
      const assets = await this.collectAssets(scene, inlineAssets);
      
      // Generate HTML
      const html = this.generateHtml(scene, assets, {
        responsive,
        includeAudio,
        autoplay,
        loop,
        title,
        minify
      });
      
      // Create blob
      const blob = new Blob([html], { type: 'text/html' });
      
      return {
        blob,
        format: 'text/html',
        size: blob.size,
        assets: assets.length
      };
      
    } catch (error) {
      this.logger.error('HTML bundle export failed:', error);
      throw new Error(`HTML bundle export failed: ${error.message}`);
    }
  }

  /**
   * Collect all assets from scene
   */
  async collectAssets(scene, inlineAssets) {
    const assets = [];
    
    for (const layer of scene.layers) {
      const asset = await this.getLayerAsset(layer, inlineAssets);
      if (asset) {
        assets.push(asset);
      }
      
      // Handle group children
      if (layer.type === 'group' && layer.group?.children) {
        for (const child of layer.group.children) {
          const childAsset = await this.getLayerAsset(child, inlineAssets);
          if (childAsset) {
            assets.push(childAsset);
          }
        }
      }
    }
    
    return assets;
  }

  /**
   * Get asset data for layer
   */
  async getLayerAsset(layer, inlineAssets) {
    const asset = {
      layerId: layer.id,
      layerName: layer.name,
      type: layer.type
    };

    switch (layer.type) {
      case 'image':
        if (layer.image?.src) {
          asset.src = layer.image.src;
          asset.assetType = 'image';
          if (inlineAssets && !layer.image.src.startsWith('data:')) {
            asset.dataUrl = await this.convertToDataUrl(layer.image.src);
          }
        }
        break;

      case 'video':
        if (layer.video?.src) {
          asset.src = layer.video.src;
          asset.assetType = 'video';
          if (inlineAssets && !layer.video.src.startsWith('data:')) {
            asset.dataUrl = await this.convertToDataUrl(layer.video.src);
          }
        }
        break;

      case 'audio':
        if (layer.audio?.src) {
          asset.src = layer.audio.src;
          asset.assetType = 'audio';
          if (inlineAssets && !layer.audio.src.startsWith('data:')) {
            asset.dataUrl = await this.convertToDataUrl(layer.audio.src);
          }
        }
        break;
    }

    return asset.src ? asset : null;
  }

  /**
   * Convert URL to data URL
   */
  async convertToDataUrl(url) {
    try {
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        return url;
      }

      const response = await fetch(url);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      this.logger.warn(`Failed to convert URL to data URL: ${url}`, error);
      return url;
    }
  }

  /**
   * Generate complete HTML document
   */
  generateHtml(scene, assets, options) {
    const {
      responsive,
      includeAudio,
      autoplay,
      loop,
      title,
      minify
    } = options;

    const { width, height, backgroundColor } = scene.canvas;

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      background: #1a1a2e;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    
    .meme-container {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      background: ${backgroundColor};
      overflow: hidden;
    }
    
    ${responsive ? `
    @media (max-width: ${width}px) {
      .meme-container {
        width: 100vw;
        height: ${(height / width) * 100}vw;
      }
    }
    ` : ''}
    
    .layer {
      position: absolute;
      transform-origin: center;
    }
    
    .layer.hidden {
      display: none;
    }
    
    .layer.image img,
    .layer.video video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .layer.text {
      display: flex;
      align-items: center;
      justify-content: center;
      word-wrap: break-word;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="meme-container" id="meme">`;

    // Add layers
    scene.layers.forEach(layer => {
      html += this.generateLayerHtml(layer, assets);
    });

    html += `
  </div>`;

    // Add audio player if needed
    if (includeAudio) {
      const audioLayers = scene.layers.filter(l => l.type === 'audio');
      if (audioLayers.length > 0) {
        html += this.generateAudioPlayer(audioLayers, assets, { autoplay, loop });
      }
    }

    // Add scripts
    html += `
  <script>
    // Video autoplay handler
    document.addEventListener('DOMContentLoaded', () => {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        ${autoplay ? 'video.play().catch(() => {});' : ''}
        ${loop ? 'video.loop = true;' : ''}
      });
    });
  </script>
</body>
</html>`;

    return minify ? this.minifyHtml(html) : html;
  }

  /**
   * Generate HTML for a single layer
   */
  generateLayerHtml(layer, assets) {
    const { id, type, visible, transform, opacity } = layer;
    
    if (!visible || opacity <= 0) return '';
    
    const styles = this.generateLayerStyles(layer);
    const layerHtml = this.generateLayerContent(layer, assets);
    
    return `
    <div class="layer ${type}${!visible ? ' hidden' : ''}" 
         id="layer-${id}"
         style="${styles}">
      ${layerHtml}
    </div>`;
  }

  /**
   * Generate CSS styles for layer
   */
  generateLayerStyles(layer) {
    const { transform } = layer;
    const styles = [];
    
    if (transform) {
      styles.push(`left: ${transform.x}px`);
      styles.push(`top: ${transform.y}px`);
      styles.push(`width: ${transform.width}px`);
      styles.push(`height: ${transform.height}px`);
      styles.push(`transform: rotate(${transform.rotation || 0}deg) scale(${transform.scaleX || 1}, ${transform.scaleY || 1})`);
      styles.push(`opacity: ${layer.opacity || 1}`);
    }
    
    return styles.join('; ');
  }

  /**
   * Generate HTML content for layer
   */
  generateLayerContent(layer, assets) {
    switch (layer.type) {
      case 'image':
        return this.generateImageContent(layer, assets);
        
      case 'text':
        return this.generateTextContent(layer);
        
      case 'video':
        return this.generateVideoContent(layer, assets);
        
      case 'shape':
        return this.generateShapeContent(layer);
        
      case 'group':
        return this.generateGroupContent(layer, assets);
        
      default:
        return '';
    }
  }

  /**
   * Generate image content
   */
  generateImageContent(layer, assets) {
    const asset = assets.find(a => a.layerId === layer.id);
    const src = asset?.dataUrl || asset?.src || layer.image?.src || '';
    const alt = layer.name || 'Image';
    
    return `<img src="${src}" alt="${this.escapeHtml(alt)}" loading="lazy">`;
  }

  /**
   * Generate text content
   */
  generateTextContent(layer) {
    const text = layer.text;
    if (!text) return '';
    
    const styles = [];
    
    styles.push(`font-family: ${text.fontFamily || 'Impact, sans-serif'}`);
    styles.push(`font-size: ${text.fontSize || 48}px`);
    styles.push(`font-weight: ${text.fontWeight || 'normal'}`);
    styles.push(`font-style: ${text.fontStyle || 'normal'}`);
    styles.push(`text-align: ${text.textAlign || 'center'}`);
    styles.push(`color: ${text.color || '#FFFFFF'}`);
    styles.push(`line-height: ${text.lineHeight || 1.2}`);
    styles.push(`letter-spacing: ${text.letterSpacing || 0}px`);
    
    if (text.backgroundColor && text.backgroundColor !== 'transparent') {
      styles.push(`background-color: ${text.backgroundColor}`);
    }
    
    // Text shadows
    if (text.shadows?.length > 0) {
      const shadowStrings = text.shadows.map(s => 
        `${s.offsetX || 0}px ${s.offsetY || 0}px ${s.blur || 0}px ${s.color || '#000000'}`
      );
      styles.push(`text-shadow: ${shadowStrings.join(', ')}`);
    }
    
    // Stroke effect (using text-shadow trick)
    if (text.strokeWidth > 0) {
      const strokeShadows = this.generateStrokeShadows(text.strokeWidth, text.strokeColor);
      styles.push(`text-shadow: ${strokeShadows}`);
    }
    
    return `<div class="text-content" style="${styles.join('; ')}">${this.escapeHtml(text.content)}</div>`;
  }

  /**
   * Generate video content
   */
  generateVideoContent(layer, assets) {
    const asset = assets.find(a => a.layerId === layer.id);
    const src = asset?.dataUrl || asset?.src || layer.video?.src || '';
    const { muted = true, loop = false } = layer.video || {};
    
    return `<video src="${src}" ${muted ? 'muted' : ''} ${loop ? 'loop' : ''} playsinline></video>`;
  }

  /**
   * Generate shape content
   */
  generateShapeContent(layer) {
    const shape = layer.shape;
    if (!shape) return '';
    
    const styles = [];
    
    if (shape.fill && shape.fill !== 'transparent') {
      styles.push(`background: ${shape.fill}`);
    }
    
    if (shape.stroke && shape.stroke !== 'transparent') {
      styles.push(`border: ${shape.strokeWidth || 1}px solid ${shape.stroke}`);
    }
    
    if (shape.borderRadius) {
      styles.push(`border-radius: ${shape.borderRadius}px`);
    }
    
    if (shape.shapeType === 'ellipse') {
      styles.push('border-radius: 50%');
    }
    
    return `<div style="${styles.join('; ')}; width: 100%; height: 100%;"></div>`;
  }

  /**
   * Generate group content
   */
  generateGroupContent(group, assets) {
    if (!group.group?.children) return '';
    
    return group.group.children
      .map(child => this.generateLayerHtml(child, assets))
      .join('\n');
  }

  /**
   * Generate audio player
   */
  generateAudioPlayer(audioLayers, assets, options) {
    const { autoplay, loop } = options;
    
    return `
  <div class="audio-player" style="position: fixed; bottom: 20px; right: 20px; z-index: 1000;">
    ${audioLayers.map(layer => {
      const asset = assets.find(a => a.layerId === layer.id);
      const src = asset?.dataUrl || asset?.src || layer.audio?.src || '';
      return `<audio src="${src}" ${autoplay ? 'autoplay' : ''} ${loop ? 'loop' : ''} controls></audio>`;
    }).join('\n')}
  </div>`;
  }

  /**
   * Generate CSS text-stroke effect using text shadows
   */
  generateStrokeShadows(width, color) {
    const shadows = [];
    const steps = Math.ceil(width / 2);
    
    for (let x = -steps; x <= steps; x++) {
      for (let y = -steps; y <= steps; y++) {
        shadows.push(`${x}px ${y}px 0 ${color}`);
      }
    }
    
    return shadows.join(', ');
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Minify HTML
   */
  minifyHtml(html) {
    return html
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .replace(/<!--.*?-->/g, '')
      .trim();
  }
}

export { HtmlBundleExport };