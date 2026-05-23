/**
 * Meme Foundry - Scene Validator
 * Validates scene graph integrity, schema compliance, and data consistency
 */

import { Logger } from '@/utils/logger.js';
import { SceneSchema } from './scene-schema.js';

class SceneValidator {
  constructor() {
    this.logger = new Logger('SceneValidator');
    
    // Validation rules
    this.rules = {
      strict: true,      // Strict schema validation
      checkReferences: true,  // Check asset references
      checkBounds: true,      // Check layer bounds
      checkDuplicates: true,  // Check duplicate IDs
      maxErrors: 50           // Maximum errors before stopping
    };
    
    // Common validation patterns
    this.patterns = {
      id: /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
      hexColor: /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/,
      semver: /^\d+\.\d+\.\d+$/
    };
  }

  /**
   * Validate complete scene
   */
  validate(scene) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      stats: {
        layers: 0,
        groups: 0,
        textLayers: 0,
        imageLayers: 0,
        videoLayers: 0,
        audioLayers: 0,
        shapeLayers: 0,
        effectLayers: 0
      }
    };

    try {
      // Validate scene root
      this.validateSceneRoot(scene, result);
      
      // Validate canvas
      if (scene.canvas) {
        this.validateCanvas(scene.canvas, result);
      }
      
      // Validate layers
      if (scene.layers) {
        this.validateLayers(scene.layers, scene.canvas, result);
      }
      
      // Validate metadata
      if (scene.metadata) {
        this.validateMetadata(scene.metadata, result);
      }
      
      // Check for duplicate IDs
      if (this.rules.checkDuplicates) {
        this.checkDuplicateIds(scene, result);
      }
      
      // Set final validity
      result.valid = result.errors.length === 0;
      
    } catch (error) {
      result.valid = false;
      result.errors.push({
        path: 'scene',
        message: `Validation error: ${error.message}`
      });
    }

    return result;
  }

  /**
   * Validate scene root object
   */
  validateSceneRoot(scene, result) {
    if (!scene || typeof scene !== 'object') {
      result.errors.push({
        path: 'scene',
        message: 'Scene must be an object'
      });
      return;
    }

    // Check required fields
    const requiredFields = ['id', 'version', 'layers'];
    requiredFields.forEach(field => {
      if (!scene[field]) {
        result.errors.push({
          path: `scene.${field}`,
          message: `Missing required field: ${field}`
        });
      }
    });

    // Validate ID
    if (scene.id && !this.patterns.id.test(scene.id)) {
      result.errors.push({
        path: 'scene.id',
        message: 'Invalid scene ID format (must be UUID v4)'
      });
    }

    // Validate version
    if (scene.version && !this.patterns.semver.test(scene.version)) {
      result.warnings.push({
        path: 'scene.version',
        message: 'Scene version should follow semver format'
      });
    }

    // Validate name
    if (scene.name && scene.name.length > 256) {
      result.errors.push({
        path: 'scene.name',
        message: 'Scene name must be 256 characters or less'
      });
    }
  }

  /**
   * Validate canvas configuration
   */
  validateCanvas(canvas, result) {
    if (!canvas || typeof canvas !== 'object') {
      result.errors.push({
        path: 'canvas',
        message: 'Canvas must be an object'
      });
      return;
    }

    // Check required fields
    if (!canvas.width || !canvas.height) {
      result.errors.push({
        path: 'canvas',
        message: 'Canvas must have width and height'
      });
      return;
    }

    // Validate dimensions
    if (canvas.width < 320 || canvas.width > 3840) {
      result.errors.push({
        path: 'canvas.width',
        message: `Canvas width must be between 320 and 3840, got ${canvas.width}`
      });
    }

    if (canvas.height < 320 || canvas.height > 2160) {
      result.errors.push({
        path: 'canvas.height',
        message: `Canvas height must be between 320 and 2160, got ${canvas.height}`
      });
    }

    // Validate dimensions are integers
    if (!Number.isInteger(canvas.width) || !Number.isInteger(canvas.height)) {
      result.warnings.push({
        path: 'canvas',
        message: 'Canvas dimensions should be integers'
      });
    }

    // Validate background color
    if (canvas.backgroundColor && !this.isValidColor(canvas.backgroundColor)) {
      result.warnings.push({
        path: 'canvas.backgroundColor',
        message: `Invalid background color: ${canvas.backgroundColor}`
      });
    }
  }

  /**
   * Validate layers array
   */
  validateLayers(layers, canvas, result) {
    if (!Array.isArray(layers)) {
      result.errors.push({
        path: 'layers',
        message: 'Layers must be an array'
      });
      return;
    }

    // Check layer count
    if (layers.length > 100) {
      result.errors.push({
        path: 'layers',
        message: `Too many layers: ${layers.length} (max 100)`
      });
    }

    // Validate each layer
    layers.forEach((layer, index) => {
      if (result.errors.length >= this.rules.maxErrors) return;
      
      this.validateLayer(layer, index, canvas, result);
    });
  }

  /**
   * Validate individual layer
   */
  validateLayer(layer, index, canvas, result) {
    const path = `layers[${index}]`;

    if (!layer || typeof layer !== 'object') {
      result.errors.push({
        path,
        message: 'Layer must be an object'
      });
      return;
    }

    // Check required fields
    const requiredFields = ['id', 'type', 'name', 'visible', 'locked', 'transform'];
    requiredFields.forEach(field => {
      if (layer[field] === undefined) {
        result.errors.push({
          path: `${path}.${field}`,
          message: `Missing required field: ${field}`
        });
      }
    });

    // Validate ID
    if (layer.id && !this.patterns.id.test(layer.id)) {
      result.errors.push({
        path: `${path}.id`,
        message: 'Invalid layer ID format (must be UUID v4)'
      });
    }

    // Validate type
    const validTypes = ['image', 'text', 'video', 'audio', 'shape', 'group', 'effect'];
    if (layer.type && !validTypes.includes(layer.type)) {
      result.errors.push({
        path: `${path}.type`,
        message: `Invalid layer type: ${layer.type}. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Update stats
    if (layer.type) {
      result.stats.layers++;
      const statKey = `${layer.type}Layers`;
      if (result.stats[statKey] !== undefined) {
        result.stats[statKey]++;
      }
    }

    // Validate name
    if (layer.name && layer.name.length > 128) {
      result.warnings.push({
        path: `${path}.name`,
        message: 'Layer name should be 128 characters or less'
      });
    }

    // Validate visible and locked are booleans
    if (layer.visible !== undefined && typeof layer.visible !== 'boolean') {
      result.errors.push({
        path: `${path}.visible`,
        message: 'Visible must be a boolean'
      });
    }

    if (layer.locked !== undefined && typeof layer.locked !== 'boolean') {
      result.errors.push({
        path: `${path}.locked`,
        message: 'Locked must be a boolean'
      });
    }

    // Validate opacity
    if (layer.opacity !== undefined) {
      if (typeof layer.opacity !== 'number' || layer.opacity < 0 || layer.opacity > 1) {
        result.errors.push({
          path: `${path}.opacity`,
          message: 'Opacity must be a number between 0 and 1'
        });
      }
    }

    // Validate blend mode
    if (layer.blendMode && !SceneSchema.scene.properties.layers.items.properties.blendMode.enum.includes(layer.blendMode)) {
      result.warnings.push({
        path: `${path}.blendMode`,
        message: `Unknown blend mode: ${layer.blendMode}`
      });
    }

    // Validate transform
    if (layer.transform) {
      this.validateTransform(layer.transform, `${path}.transform`, canvas, result);
    }

    // Validate type-specific properties
    this.validateLayerType(layer, path, canvas, result);

    // Validate masks
    if (layer.masks && Array.isArray(layer.masks)) {
      layer.masks.forEach((mask, maskIndex) => {
        this.validateMask(mask, `${path}.masks[${maskIndex}]`, result);
      });
    }

    // Validate effects
    if (layer.effects && Array.isArray(layer.effects)) {
      layer.effects.forEach((effect, effectIndex) => {
        this.validateEffect(effect, `${path}.effects[${effectIndex}]`, result);
      });
    }

    // Validate timeline
    if (layer.timeline) {
      this.validateTimeline(layer.timeline, `${path}.timeline`, result);
    }

    // Recursively validate group children
    if (layer.type === 'group' && layer.group?.children) {
      this.validateLayers(layer.group.children, canvas, result);
    }
  }

  /**
   * Validate layer transform
   */
  validateTransform(transform, path, canvas, result) {
    if (!transform || typeof transform !== 'object') {
      result.errors.push({ path, message: 'Transform must be an object' });
      return;
    }

    // Check required fields
    ['x', 'y', 'width', 'height'].forEach(field => {
      if (transform[field] === undefined) {
        result.errors.push({
          path: `${path}.${field}`,
          message: `Missing required transform field: ${field}`
        });
      }
    });

    // Validate numeric values
    if (transform.width !== undefined && (typeof transform.width !== 'number' || transform.width < 1)) {
      result.errors.push({
        path: `${path}.width`,
        message: 'Width must be a positive number'
      });
    }

    if (transform.height !== undefined && (typeof transform.height !== 'number' || transform.height < 1)) {
      result.errors.push({
        path: `${path}.height`,
        message: 'Height must be a positive number'
      });
    }

    // Validate rotation
    if (transform.rotation !== undefined) {
      if (typeof transform.rotation !== 'number') {
        result.errors.push({
          path: `${path}.rotation`,
          message: 'Rotation must be a number'
        });
      }
    }

    // Validate scale
    ['scaleX', 'scaleY'].forEach(field => {
      if (transform[field] !== undefined) {
        if (typeof transform[field] !== 'number' || transform[field] < 0.01 || transform[field] > 10) {
          result.errors.push({
            path: `${path}.${field}`,
            message: `${field} must be between 0.01 and 10`
          });
        }
      }
    });

    // Check bounds if canvas provided
    if (canvas && this.rules.checkBounds) {
      this.checkLayerBounds(transform, canvas, path, result);
    }
  }

  /**
   * Check layer is within canvas bounds (warning only)
   */
  checkLayerBounds(transform, canvas, path, result) {
    const { x, y, width, height } = transform;
    
    // Warn if layer is completely outside canvas
    if (x + width < 0 || x > canvas.width || y + height < 0 || y > canvas.height) {
      result.warnings.push({
        path,
        message: 'Layer is completely outside canvas bounds'
      });
    }
    
    // Warn if layer is partially outside
    if (x < 0 || y < 0 || x + width > canvas.width || y + height > canvas.height) {
      result.warnings.push({
        path,
        message: 'Layer extends beyond canvas bounds'
      });
    }
    
    // Warn if layer is very large
    if (width > canvas.width * 3 || height > canvas.height * 3) {
      result.warnings.push({
        path,
        message: 'Layer is significantly larger than canvas'
      });
    }
  }

  /**
   * Validate layer type-specific properties
   */
  validateLayerType(layer, path, canvas, result) {
    switch (layer.type) {
      case 'image':
        if (layer.image) {
          this.validateImageLayer(layer.image, `${path}.image`, result);
        }
        break;
        
      case 'text':
        if (layer.text) {
          this.validateTextLayer(layer.text, `${path}.text`, result);
        }
        break;
        
      case 'video':
        if (layer.video) {
          this.validateVideoLayer(layer.video, `${path}.video`, result);
        }
        break;
        
      case 'audio':
        if (layer.audio) {
          this.validateAudioLayer(layer.audio, `${path}.audio`, result);
        }
        break;
        
      case 'shape':
        if (layer.shape) {
          this.validateShapeLayer(layer.shape, `${path}.shape`, result);
        }
        break;
    }
  }

  /**
   * Validate image layer properties
   */
  validateImageLayer(image, path, result) {
    if (image.src !== undefined && typeof image.src !== 'string') {
      result.errors.push({ path: `${path}.src`, message: 'Image src must be a string' });
    }

    const validFits = ['cover', 'contain', 'fill', 'none', 'scale-down'];
    if (image.fit && !validFits.includes(image.fit)) {
      result.warnings.push({ path: `${path}.fit`, message: `Unknown fit mode: ${image.fit}` });
    }

    if (image.filters) {
      this.validateImageFilters(image.filters, `${path}.filters`, result);
    }
  }

  /**
   * Validate text layer properties
   */
  validateTextLayer(text, path, result) {
    if (text.content !== undefined && typeof text.content !== 'string') {
      result.errors.push({ path: `${path}.content`, message: 'Text content must be a string' });
    }

    if (text.content && text.content.length > 5000) {
      result.errors.push({ path: `${path}.content`, message: 'Text content exceeds 5000 characters' });
    }

    if (text.fontSize !== undefined) {
      if (typeof text.fontSize !== 'number' || text.fontSize < 8 || text.fontSize > 500) {
        result.errors.push({ path: `${path}.fontSize`, message: 'Font size must be between 8 and 500' });
      }
    }

    const validAlign = ['left', 'center', 'right', 'justify'];
    if (text.textAlign && !validAlign.includes(text.textAlign)) {
      result.warnings.push({ path: `${path}.textAlign`, message: `Unknown text alignment: ${text.textAlign}` });
    }

    if (text.color && !this.isValidColor(text.color)) {
      result.warnings.push({ path: `${path}.color`, message: `Invalid text color: ${text.color}` });
    }

    if (text.shadows && Array.isArray(text.shadows)) {
      text.shadows.forEach((shadow, i) => {
        this.validateShadow(shadow, `${path}.shadows[${i}]`, result);
      });
    }
  }

  /**
   * Validate video layer properties
   */
  validateVideoLayer(video, path, result) {
    if (video.volume !== undefined) {
      if (typeof video.volume !== 'number' || video.volume < 0 || video.volume > 1) {
        result.errors.push({ path: `${path}.volume`, message: 'Volume must be between 0 and 1' });
      }
    }

    if (video.playbackRate !== undefined) {
      if (typeof video.playbackRate !== 'number' || video.playbackRate < 0.25 || video.playbackRate > 4) {
        result.errors.push({ path: `${path}.playbackRate`, message: 'Playback rate must be between 0.25 and 4' });
      }
    }
  }

  /**
   * Validate audio layer properties
   */
  validateAudioLayer(audio, path, result) {
    if (audio.volume !== undefined) {
      if (typeof audio.volume !== 'number' || audio.volume < 0 || audio.volume > 1) {
        result.errors.push({ path: `${path}.volume`, message: 'Volume must be between 0 and 1' });
      }
    }
  }

  /**
   * Validate shape layer properties
   */
  validateShapeLayer(shape, path, result) {
    const validShapes = ['rectangle', 'ellipse', 'triangle', 'polygon', 'star', 'line', 'arrow'];
    if (shape.shapeType && !validShapes.includes(shape.shapeType)) {
      result.errors.push({ path: `${path}.shapeType`, message: `Unknown shape type: ${shape.shapeType}` });
    }

    if (shape.fill && !this.isValidColor(shape.fill) && shape.fill !== 'transparent' && shape.fill !== 'gradient') {
      result.warnings.push({ path: `${path}.fill`, message: `Invalid fill color: ${shape.fill}` });
    }

    if (shape.sides !== undefined) {
      if (typeof shape.sides !== 'number' || shape.sides < 3 || shape.sides > 12) {
        result.errors.push({ path: `${path}.sides`, message: 'Sides must be between 3 and 12' });
      }
    }
  }

  /**
   * Validate image filters
   */
  validateImageFilters(filters, path, result) {
    const filterFields = ['brightness', 'contrast', 'saturation', 'hue', 'blur', 'sepia'];
    
    filterFields.forEach(field => {
      if (filters[field] !== undefined && typeof filters[field] !== 'number') {
        result.errors.push({ path: `${path}.${field}`, message: `${field} must be a number` });
      }
    });
  }

  /**
   * Validate text shadow
   */
  validateShadow(shadow, path, result) {
    if (shadow.color && !this.isValidColor(shadow.color)) {
      result.warnings.push({ path: `${path}.color`, message: `Invalid shadow color: ${shadow.color}` });
    }
  }

  /**
   * Validate mask
   */
  validateMask(mask, path, result) {
    const validTypes = ['rectangle', 'ellipse', 'polygon', 'alpha', 'luminance'];
    if (mask.type && !validTypes.includes(mask.type)) {
      result.errors.push({ path: `${path}.type`, message: `Unknown mask type: ${mask.type}` });
    }
  }

  /**
   * Validate effect
   */
  validateEffect(effect, path, result) {
    const validTypes = SceneSchema.scene.properties.layers.items.properties.effects.items.properties.type.enum;
    if (effect.type && !validTypes.includes(effect.type)) {
      result.errors.push({ path: `${path}.type`, message: `Unknown effect type: ${effect.type}` });
    }

    if (effect.enabled !== undefined && typeof effect.enabled !== 'boolean') {
      result.errors.push({ path: `${path}.enabled`, message: 'Enabled must be a boolean' });
    }
  }

  /**
   * Validate timeline
   */
  validateTimeline(timeline, path, result) {
    if (timeline.startTime !== undefined && typeof timeline.startTime !== 'number') {
      result.errors.push({ path: `${path}.startTime`, message: 'Start time must be a number' });
    }

    if (timeline.duration !== undefined && typeof timeline.duration !== 'number') {
      result.errors.push({ path: `${path}.duration`, message: 'Duration must be a number' });
    }

    if (timeline.keyframes && Array.isArray(timeline.keyframes)) {
      timeline.keyframes.forEach((kf, i) => {
        this.validateKeyframe(kf, `${path}.keyframes[${i}]`, result);
      });
    }
  }

  /**
   * Validate keyframe
   */
  validateKeyframe(keyframe, path, result) {
    if (keyframe.time === undefined || typeof keyframe.time !== 'number') {
      result.errors.push({ path: `${path}.time`, message: 'Keyframe time is required and must be a number' });
    }

    const validEasing = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'step'];
    if (keyframe.easing && !validEasing.includes(keyframe.easing)) {
      result.warnings.push({ path: `${path}.easing`, message: `Unknown easing: ${keyframe.easing}` });
    }

    if (!keyframe.properties || typeof keyframe.properties !== 'object') {
      result.errors.push({ path: `${path}.properties`, message: 'Keyframe must have properties object' });
    }
  }

  /**
   * Validate metadata
   */
  validateMetadata(metadata, path, result) {
    if (metadata.created && isNaN(Date.parse(metadata.created))) {
      result.warnings.push({ path: `${path}.created`, message: 'Invalid created date' });
    }

    if (metadata.modified && isNaN(Date.parse(metadata.modified))) {
      result.warnings.push({ path: `${path}.modified`, message: 'Invalid modified date' });
    }

    if (metadata.description && metadata.description.length > 1000) {
      result.warnings.push({ path: `${path}.description`, message: 'Description should be 1000 characters or less' });
    }
  }

  /**
   * Check for duplicate IDs
   */
  checkDuplicateIds(scene, result) {
    const ids = new Set();
    
    const checkLayerIds = (layers) => {
      layers.forEach(layer => {
        if (layer.id) {
          if (ids.has(layer.id)) {
            result.errors.push({
              path: 'layers',
              message: `Duplicate layer ID found: ${layer.id}`
            });
          }
          ids.add(layer.id);
        }
        
        if (layer.type === 'group' && layer.group?.children) {
          checkLayerIds(layer.group.children);
        }
      });
    };
    
    if (scene.layers) {
      checkLayerIds(scene.layers);
    }
  }

  /**
   * Check if string is a valid color
   */
  isValidColor(color) {
    if (!color || typeof color !== 'string') return false;
    
    // Hex colors
    if (this.patterns.hexColor.test(color)) return true;
    
    // RGB/RGBA
    if (/^rgba?\(/.test(color)) return true;
    
    // HSL/HSLA
    if (/^hsla?\(/.test(color)) return true;
    
    // Named colors
    const namedColors = ['transparent', 'black', 'white', 'red', 'green', 'blue', 
                         'yellow', 'orange', 'purple', 'pink', 'gray', 'grey'];
    if (namedColors.includes(color.toLowerCase())) return true;
    
    return false;
  }

  /**
   * Quick validate (basic checks only)
   */
  quickValidate(scene) {
    if (!scene || typeof scene !== 'object') return false;
    if (!scene.id) return false;
    if (!Array.isArray(scene.layers)) return false;
    if (!scene.canvas || !scene.canvas.width || !scene.canvas.height) return false;
    return true;
  }

  /**
   * Get validation summary
   */
  getSummary(validationResult) {
    return {
      valid: validationResult.valid,
      errorCount: validationResult.errors.length,
      warningCount: validationResult.warnings.length,
      stats: validationResult.stats,
      hasErrors: validationResult.errors.length > 0,
      hasWarnings: validationResult.warnings.length > 0
    };
  }
}

export { SceneValidator };