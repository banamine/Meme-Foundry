/**
 * Meme Foundry - Layer Factory
 * Creates and configures layers with intelligent defaults
 */

import { Logger } from '@/utils/logger.js';
import { SceneSchema, getDefaultLayer } from './scene-schema.js';

class LayerFactory {
  constructor() {
    this.logger = new Logger('LayerFactory');
    
    // Layer type definitions
    this.layerTypes = {
      image: {
        icon: '🖼',
        name: 'Image',
        createDefault: () => this.createImageLayer(),
        acceptsAsset: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
      },
      text: {
        icon: '📝',
        name: 'Text',
        createDefault: () => this.createTextLayer(),
        defaultContent: 'Enter text here'
      },
      video: {
        icon: '🎬',
        name: 'Video',
        createDefault: () => this.createVideoLayer(),
        acceptsAsset: ['video/mp4', 'video/webm']
      },
      audio: {
        icon: '🔊',
        name: 'Audio',
        createDefault: () => this.createAudioLayer(),
        acceptsAsset: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac']
      },
      shape: {
        icon: '⬜',
        name: 'Shape',
        createDefault: () => this.createShapeLayer()
      },
      group: {
        icon: '📁',
        name: 'Group',
        createDefault: () => this.createGroupLayer(),
        acceptsChildren: true
      },
      effect: {
        icon: '✨',
        name: 'Effect',
        createDefault: () => this.createEffectLayer()
      }
    };
    
    // Default canvas dimensions
    this.defaultCanvas = {
      width: 1080,
      height: 1080
    };
    
    // Counter for auto-naming
    this.layerCounters = {};
  }

  /**
   * Create layer of specified type
   */
  create(type, properties = {}, canvasDimensions = null) {
    const layerType = this.layerTypes[type];
    
    if (!layerType) {
      throw new Error(`Unknown layer type: ${type}`);
    }
    
    // Get base layer from schema
    const baseLayer = getDefaultLayer(type);
    
    // Get type-specific defaults
    const typeLayer = layerType.createDefault();
    
    // Merge: base < type defaults < properties
    const layer = this.deepMerge(
      this.deepMerge(baseLayer, typeLayer),
      properties
    );
    
    // Ensure unique ID
    if (!layer.id) {
      layer.id = crypto.randomUUID();
    }
    
    // Auto-name if not provided
    if (!layer.name || layer.name === `${type.charAt(0).toUpperCase() + type.slice(1)} Layer`) {
      layer.name = this.generateLayerName(type);
    }
    
    // Adjust to canvas if dimensions provided
    if (canvasDimensions) {
      this.adjustToCanvas(layer, canvasDimensions);
    }
    
    return layer;
  }

  /**
   * Create image layer
   */
  createImageLayer() {
    return {
      type: 'image',
      image: {
        src: '',
        assetId: null,
        fit: 'cover',
        position: { x: 50, y: 50 },
        filters: {
          brightness: 100,
          contrast: 100,
          saturation: 100,
          hue: 0,
          blur: 0,
          sepia: 0
        }
      },
      transform: {
        x: 0,
        y: 0,
        width: 400,
        height: 400,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        anchorX: 0.5,
        anchorY: 0.5,
        flipH: false,
        flipV: false
      }
    };
  }

  /**
   * Create text layer
   */
  createTextLayer() {
    return {
      type: 'text',
      text: {
        content: 'Enter text',
        fontFamily: 'Impact, sans-serif',
        fontSize: 48,
        fontWeight: 'bold',
        fontStyle: 'normal',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: '#FFFFFF',
        backgroundColor: 'transparent',
        strokeColor: '#000000',
        strokeWidth: 2,
        lineHeight: 1.2,
        letterSpacing: 0,
        wordWrap: true,
        adaptiveScaling: true,
        minFontSize: 12,
        maxWidth: null,
        shadows: [
          {
            color: '#000000',
            blur: 0,
            offsetX: 2,
            offsetY: 2
          }
        ]
      },
      transform: {
        x: 0,
        y: 0,
        width: 600,
        height: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        anchorX: 0.5,
        anchorY: 0.5,
        flipH: false,
        flipV: false
      }
    };
  }

  /**
   * Create text layer with meme presets
   */
  createMemeTextLayer(preset = 'top') {
    const canvas = this.defaultCanvas;
    const textLayer = this.createTextLayer();
    
    switch (preset) {
      case 'top':
        textLayer.name = 'Top Text';
        textLayer.transform.y = 20;
        textLayer.transform.x = 0;
        textLayer.transform.width = canvas.width;
        textLayer.transform.height = 100;
        textLayer.text.content = 'TOP TEXT';
        textLayer.text.fontSize = 72;
        break;
        
      case 'bottom':
        textLayer.name = 'Bottom Text';
        textLayer.transform.y = canvas.height - 120;
        textLayer.transform.x = 0;
        textLayer.transform.width = canvas.width;
        textLayer.transform.height = 100;
        textLayer.text.content = 'BOTTOM TEXT';
        textLayer.text.fontSize = 72;
        break;
        
      case 'middle':
        textLayer.name = 'Middle Text';
        textLayer.transform.y = canvas.height / 2 - 50;
        textLayer.transform.x = 0;
        textLayer.transform.width = canvas.width;
        textLayer.transform.height = 100;
        textLayer.text.content = 'MIDDLE TEXT';
        textLayer.text.fontSize = 64;
        break;
        
      case 'caption':
        textLayer.name = 'Caption';
        textLayer.transform.y = canvas.height - 60;
        textLayer.transform.x = 0;
        textLayer.transform.width = canvas.width - 40;
        textLayer.transform.height = 40;
        textLayer.text.content = 'Caption text';
        textLayer.text.fontSize = 24;
        textLayer.text.fontWeight = 'normal';
        textLayer.text.strokeWidth = 1;
        break;
        
      case 'watermark':
        textLayer.name = 'Watermark';
        textLayer.transform.y = canvas.height - 40;
        textLayer.transform.x = canvas.width - 200;
        textLayer.transform.width = 200;
        textLayer.transform.height = 30;
        textLayer.text.content = '@username';
        textLayer.text.fontSize = 18;
        textLayer.text.fontWeight = 'normal';
        textLayer.text.color = 'rgba(255, 255, 255, 0.7)';
        textLayer.text.strokeWidth = 0;
        textLayer.text.shadows = [];
        break;
    }
    
    return textLayer;
  }

  /**
   * Create video layer
   */
  createVideoLayer() {
    return {
      type: 'video',
      video: {
        src: '',
        assetId: null,
        startTime: 0,
        endTime: null,
        volume: 1,
        muted: true,
        loop: false,
        playbackRate: 1,
        fit: 'cover'
      },
      transform: {
        x: 0,
        y: 0,
        width: 400,
        height: 400,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        anchorX: 0.5,
        anchorY: 0.5,
        flipH: false,
        flipV: false
      }
    };
  }

  /**
   * Create audio layer
   */
  createAudioLayer() {
    return {
      type: 'audio',
      audio: {
        src: '',
        assetId: null,
        startTime: 0,
        endTime: null,
        volume: 1,
        muted: false,
        loop: false,
        waveform: null
      },
      transform: {
        x: 0,
        y: 0,
        width: 400,
        height: 60,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        anchorX: 0.5,
        anchorY: 0.5,
        flipH: false,
        flipV: false
      }
    };
  }

  /**
   * Create shape layer
   */
  createShapeLayer(shapeType = 'rectangle') {
    const shapes = {
      rectangle: {
        shapeType: 'rectangle',
        fill: '#3498db',
        stroke: '#2980b9',
        strokeWidth: 2,
        borderRadius: 0
      },
      ellipse: {
        shapeType: 'ellipse',
        fill: '#e74c3c',
        stroke: '#c0392b',
        strokeWidth: 2
      },
      triangle: {
        shapeType: 'triangle',
        fill: '#2ecc71',
        stroke: '#27ae60',
        strokeWidth: 2
      },
      star: {
        shapeType: 'star',
        fill: '#f39c12',
        stroke: '#e67e22',
        strokeWidth: 2,
        sides: 5
      },
      line: {
        shapeType: 'line',
        fill: 'transparent',
        stroke: '#95a5a6',
        strokeWidth: 3
      },
      arrow: {
        shapeType: 'arrow',
        fill: 'transparent',
        stroke: '#95a5a6',
        strokeWidth: 3
      }
    };
    
    return {
      type: 'shape',
      name: `${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)} Shape`,
      shape: shapes[shapeType] || shapes.rectangle,
      transform: {
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        anchorX: 0.5,
        anchorY: 0.5,
        flipH: false,
        flipV: false
      }
    };
  }

  /**
   * Create group layer
   */
  createGroupLayer(children = []) {
    return {
      type: 'group',
      name: 'Group',
      group: {
        children,
        collapsed: false
      },
      transform: this.calculateGroupBounds(children)
    };
  }

  /**
   * Create effect layer
   */
  createEffectLayer(effectType = 'drop-shadow') {
    const effects = {
      'drop-shadow': {
        type: 'drop-shadow',
        enabled: true,
        settings: {
          color: '#000000',
          opacity: 0.5,
          angle: 135,
          distance: 5,
          blur: 5,
          spread: 0
        }
      },
      'glow': {
        type: 'glow',
        enabled: true,
        settings: {
          color: '#FFFFFF',
          opacity: 0.75,
          blur: 10,
          spread: 0,
          quality: 1
        }
      },
      'blur': {
        type: 'blur',
        enabled: true,
        settings: {
          amount: 5
        }
      },
      'vignette': {
        type: 'vignette',
        enabled: true,
        settings: {
          color: '#000000',
          amount: 0.5,
          feather: 0.5
        }
      },
      'color-overlay': {
        type: 'color-overlay',
        enabled: true,
        settings: {
          color: '#000000',
          opacity: 0.5,
          blendMode: 'normal'
        }
      }
    };
    
    return {
      type: 'effect',
      name: `${effectType.replace('-', ' ')} Effect`,
      effects: [effects[effectType] || effects['drop-shadow']]
    };
  }

  /**
   * Create layer from asset
   */
  createFromAsset(asset) {
    switch (asset.type) {
      case 'image':
        return this.create('image', {
          name: asset.file?.name || 'Image',
          image: {
            src: asset.url,
            assetId: asset.id
          },
          transform: {
            width: asset.width,
            height: asset.height
          }
        });
        
      case 'video':
        return this.create('video', {
          name: asset.file?.name || 'Video',
          video: {
            src: asset.url,
            assetId: asset.id
          },
          transform: {
            width: asset.width,
            height: asset.height
          }
        });
        
      case 'audio':
        return this.create('audio', {
          name: asset.file?.name || 'Audio',
          audio: {
            src: asset.url,
            assetId: asset.id
          }
        });
        
      default:
        throw new Error(`Unknown asset type: ${asset.type}`);
    }
  }

  /**
   * Create layer from template
   */
  createFromTemplate(template, canvasDimensions = null) {
    const layer = JSON.parse(JSON.stringify(template));
    layer.id = crypto.randomUUID();
    
    if (canvasDimensions) {
      this.adjustToCanvas(layer, canvasDimensions);
    }
    
    return layer;
  }

  /**
   * Duplicate layer with new ID
   */
  duplicate(layer) {
    const duplicate = JSON.parse(JSON.stringify(layer));
    duplicate.id = crypto.randomUUID();
    duplicate.name = `${layer.name} Copy`;
    
    return duplicate;
  }

  /**
   * Generate layer name
   */
  generateLayerName(type) {
    if (!this.layerCounters[type]) {
      this.layerCounters[type] = 0;
    }
    
    this.layerCounters[type]++;
    const typeName = this.layerTypes[type]?.name || type;
    
    return `${typeName} ${this.layerCounters[type]}`;
  }

  /**
   * Adjust layer to canvas dimensions
   */
  adjustToCanvas(layer, canvas) {
    const { width: cw, height: ch } = canvas;
    
    // Center layer on canvas
    if (layer.transform) {
      layer.transform.x = (cw - layer.transform.width) / 2;
      layer.transform.y = (ch - layer.transform.height) / 2;
    }
    
    return layer;
  }

  /**
   * Calculate bounds for group
   */
  calculateGroupBounds(children) {
    if (!children || children.length === 0) {
      return {
        x: 0, y: 0,
        width: 200, height: 200,
        rotation: 0,
        scaleX: 1, scaleY: 1,
        anchorX: 0.5, anchorY: 0.5,
        flipH: false, flipV: false
      };
    }
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    children.forEach(child => {
      const t = child.transform || {};
      minX = Math.min(minX, t.x || 0);
      minY = Math.min(minY, t.y || 0);
      maxX = Math.max(maxX, (t.x || 0) + (t.width || 100));
      maxY = Math.max(maxY, (t.y || 0) + (t.height || 100));
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      rotation: 0,
      scaleX: 1, scaleY: 1,
      anchorX: 0.5, anchorY: 0.5,
      flipH: false, flipV: false
    };
  }

  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Get available layer types
   */
  getLayerTypes() {
    return Object.entries(this.layerTypes).map(([type, config]) => ({
      type,
      icon: config.icon,
      name: config.name,
      acceptsAsset: config.acceptsAsset || null,
      acceptsChildren: config.acceptsChildren || false
    }));
  }

  /**
   * Get layer type icon
   */
  getLayerIcon(type) {
    return this.layerTypes[type]?.icon || '❓';
  }

  /**
   * Reset counters
   */
  resetCounters() {
    this.layerCounters = {};
  }

  /**
   * Set default canvas dimensions
   */
  setDefaultCanvas(width, height) {
    this.defaultCanvas = { width, height };
  }
}

export { LayerFactory };