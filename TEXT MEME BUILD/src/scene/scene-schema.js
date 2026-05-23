/**
 * Meme Foundry - Scene Schema Definition
 * Complete schema for the scene graph system with validation rules
 */

export const SceneSchema = {
  version: '1.0.0',
  
  // Scene root
  scene: {
    type: 'object',
    required: ['id', 'version', 'layers', 'metadata'],
    properties: {
      id: {
        type: 'string',
        pattern: '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$',
        description: 'UUID v4'
      },
      version: {
        type: 'string',
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Semantic version'
      },
      name: {
        type: 'string',
        maxLength: 256,
        default: 'Untitled Scene'
      },
      canvas: {
        type: 'object',
        required: ['width', 'height'],
        properties: {
          width: {
            type: 'number',
            minimum: 320,
            maximum: 3840,
            multipleOf: 1
          },
          height: {
            type: 'number',
            minimum: 320,
            maximum: 2160,
            multipleOf: 1
          },
          backgroundColor: {
            type: 'string',
            pattern: '^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{8}|rgba?\\(.*\\)|transparent)$',
            default: '#FFFFFF'
          },
          pixelRatio: {
            type: 'number',
            minimum: 1,
            maximum: 4
          }
        }
      },
      layers: {
        type: 'array',
        maxItems: 100,
        items: {
          type: 'object',
          required: ['id', 'type', 'name', 'visible', 'locked', 'transform'],
          properties: {
            id: {
              type: 'string',
              pattern: '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
            },
            type: {
              type: 'string',
              enum: ['image', 'text', 'video', 'audio', 'shape', 'group', 'effect']
            },
            name: {
              type: 'string',
              maxLength: 128,
              default: 'Layer'
            },
            visible: {
              type: 'boolean',
              default: true
            },
            locked: {
              type: 'boolean',
              default: false
            },
            opacity: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              default: 1
            },
            blendMode: {
              type: 'string',
              enum: [
                'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
                'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
                'exclusion', 'hue', 'saturation', 'color', 'luminosity'
              ],
              default: 'normal'
            },
            transform: {
              type: 'object',
              required: ['x', 'y', 'width', 'height', 'rotation', 'scaleX', 'scaleY'],
              properties: {
                x: { type: 'number', default: 0 },
                y: { type: 'number', default: 0 },
                width: { type: 'number', minimum: 1 },
                height: { type: 'number', minimum: 1 },
                rotation: {
                  type: 'number',
                  minimum: 0,
                  maximum: 360,
                  default: 0
                },
                scaleX: {
                  type: 'number',
                  minimum: 0.01,
                  maximum: 10,
                  default: 1
                },
                scaleY: {
                  type: 'number',
                  minimum: 0.01,
                  maximum: 10,
                  default: 1
                },
                anchorX: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  default: 0.5
                },
                anchorY: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  default: 0.5
                },
                flipH: { type: 'boolean', default: false },
                flipV: { type: 'boolean', default: false }
              }
            },
            masks: {
              type: 'array',
              maxItems: 5,
              items: {
                type: 'object',
                required: ['type', 'enabled'],
                properties: {
                  type: {
                    type: 'string',
                    enum: ['rectangle', 'ellipse', 'polygon', 'alpha', 'luminance']
                  },
                  enabled: { type: 'boolean', default: true },
                  inverted: { type: 'boolean', default: false },
                  feather: {
                    type: 'number',
                    minimum: 0,
                    maximum: 100,
                    default: 0
                  },
                  path: { type: 'string' },
                  points: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['x', 'y'],
                      properties: {
                        x: { type: 'number' },
                        y: { type: 'number' }
                      }
                    }
                  }
                }
              }
            },
            effects: {
              type: 'array',
              maxItems: 10,
              items: {
                type: 'object',
                required: ['type', 'enabled'],
                properties: {
                  type: {
                    type: 'string',
                    enum: [
                      'drop-shadow', 'inner-shadow', 'glow', 'inner-glow',
                      'bevel', 'blur', 'sharpen', 'noise', 'color-overlay',
                      'gradient-overlay', 'stroke', 'pixelate', 'vignette'
                    ]
                  },
                  enabled: { type: 'boolean', default: true },
                  settings: { type: 'object' }
                }
              }
            },
            // Layer type-specific properties
            image: {
              type: 'object',
              properties: {
                src: { type: 'string' },
                assetId: { type: 'string' },
                fit: {
                  type: 'string',
                  enum: ['cover', 'contain', 'fill', 'none', 'scale-down'],
                  default: 'cover'
                },
                position: {
                  type: 'object',
                  properties: {
                    x: { type: 'number', minimum: 0, maximum: 100, default: 50 },
                    y: { type: 'number', minimum: 0, maximum: 100, default: 50 }
                  }
                },
                filters: {
                  type: 'object',
                  properties: {
                    brightness: { type: 'number', minimum: 0, maximum: 200, default: 100 },
                    contrast: { type: 'number', minimum: 0, maximum: 200, default: 100 },
                    saturation: { type: 'number', minimum: 0, maximum: 200, default: 100 },
                    hue: { type: 'number', minimum: -180, maximum: 180, default: 0 },
                    blur: { type: 'number', minimum: 0, maximum: 20, default: 0 },
                    sepia: { type: 'number', minimum: 0, maximum: 100, default: 0 }
                  }
                }
              }
            },
            text: {
              type: 'object',
              properties: {
                content: { type: 'string', maxLength: 5000 },
                fontFamily: {
                  type: 'string',
                  default: 'Impact, sans-serif'
                },
                fontSize: {
                  type: 'number',
                  minimum: 8,
                  maximum: 500,
                  default: 48
                },
                fontWeight: {
                  type: ['string', 'number'],
                  enum: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
                  default: 'normal'
                },
                fontStyle: {
                  type: 'string',
                  enum: ['normal', 'italic', 'oblique'],
                  default: 'normal'
                },
                textAlign: {
                  type: 'string',
                  enum: ['left', 'center', 'right', 'justify'],
                  default: 'center'
                },
                verticalAlign: {
                  type: 'string',
                  enum: ['top', 'middle', 'bottom'],
                  default: 'middle'
                },
                color: {
                  type: 'string',
                  pattern: '^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{8}|rgba?\\(.*\\))$',
                  default: '#FFFFFF'
                },
                backgroundColor: {
                  type: 'string',
                  pattern: '^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{8}|rgba?\\(.*\\)|transparent)$',
                  default: 'transparent'
                },
                strokeColor: {
                  type: 'string',
                  pattern: '^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{8}|rgba?\\(.*\\)|transparent)$',
                  default: '#000000'
                },
                strokeWidth: {
                  type: 'number',
                  minimum: 0,
                  maximum: 50,
                  default: 2
                },
                lineHeight: {
                  type: 'number',
                  minimum: 0.5,
                  maximum: 3,
                  default: 1.2
                },
                letterSpacing: {
                  type: 'number',
                  minimum: -5,
                  maximum: 20,
                  default: 0
                },
                wordWrap: {
                  type: 'boolean',
                  default: true
                },
                maxWidth: {
                  type: 'number',
                  minimum: 0
                },
                adaptiveScaling: {
                  type: 'boolean',
                  default: true
                },
                minFontSize: {
                  type: 'number',
                  minimum: 6,
                  maximum: 500,
                  default: 12
                },
                shadows: {
                  type: 'array',
                  maxItems: 5,
                  items: {
                    type: 'object',
                    properties: {
                      color: { type: 'string', default: '#000000' },
                      blur: { type: 'number', minimum: 0, maximum: 50, default: 0 },
                      offsetX: { type: 'number', default: 0 },
                      offsetY: { type: 'number', default: 0 }
                    }
                  }
                }
              }
            },
            video: {
              type: 'object',
              properties: {
                src: { type: 'string' },
                assetId: { type: 'string' },
                startTime: { type: 'number', minimum: 0, default: 0 },
                endTime: { type: 'number', minimum: 0 },
                volume: { type: 'number', minimum: 0, maximum: 1, default: 1 },
                muted: { type: 'boolean', default: false },
                loop: { type: 'boolean', default: false },
                playbackRate: { type: 'number', minimum: 0.25, maximum: 4, default: 1 },
                fit: {
                  type: 'string',
                  enum: ['cover', 'contain', 'fill', 'none'],
                  default: 'cover'
                }
              }
            },
            audio: {
              type: 'object',
              properties: {
                src: { type: 'string' },
                assetId: { type: 'string' },
                startTime: { type: 'number', minimum: 0, default: 0 },
                endTime: { type: 'number', minimum: 0 },
                volume: { type: 'number', minimum: 0, maximum: 1, default: 1 },
                muted: { type: 'boolean', default: false },
                loop: { type: 'boolean', default: false },
                waveform: { type: 'array', items: { type: 'number' } }
              }
            },
            shape: {
              type: 'object',
              properties: {
                shapeType: {
                  type: 'string',
                  enum: ['rectangle', 'ellipse', 'triangle', 'polygon', 'star', 'line', 'arrow'],
                  default: 'rectangle'
                },
                fill: {
                  type: 'string',
                  pattern: '^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{8}|rgba?\\(.*\\)|transparent|gradient)$'
                },
                stroke: {
                  type: 'string',
                  pattern: '^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{8}|rgba?\\(.*\\)|transparent)$'
                },
                strokeWidth: { type: 'number', minimum: 0, maximum: 100, default: 1 },
                borderRadius: { type: 'number', minimum: 0, maximum: 500, default: 0 },
                sides: { type: 'number', minimum: 3, maximum: 12, default: 5 },
                points: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['x', 'y'],
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' }
                    }
                  }
                },
                gradient: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['linear', 'radial', 'conic'],
                      default: 'linear'
                    },
                    angle: { type: 'number', minimum: 0, maximum: 360, default: 0 },
                    stops: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['offset', 'color'],
                        properties: {
                          offset: { type: 'number', minimum: 0, maximum: 1 },
                          color: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            },
            group: {
              type: 'object',
              properties: {
                children: {
                  type: 'array',
                  items: { $ref: '#/scene/layers/items' }
                },
                collapsed: { type: 'boolean', default: false }
              }
            },
            // Timeline/animation
            timeline: {
              type: 'object',
              properties: {
                startTime: { type: 'number', minimum: 0, default: 0 },
                duration: { type: 'number', minimum: 0, default: 0 },
                keyframes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['time', 'properties'],
                    properties: {
                      time: { type: 'number', minimum: 0 },
                      easing: {
                        type: 'string',
                        enum: ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'step'],
                        default: 'linear'
                      },
                      properties: {
                        type: 'object',
                        properties: {
                          x: { type: 'number' },
                          y: { type: 'number' },
                          scaleX: { type: 'number' },
                          scaleY: { type: 'number' },
                          rotation: { type: 'number' },
                          opacity: { type: 'number' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      metadata: {
        type: 'object',
        properties: {
          created: { type: 'string', format: 'date-time' },
          modified: { type: 'string', format: 'date-time' },
          author: { type: 'string' },
          description: { type: 'string', maxLength: 1000 },
          tags: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 20
          },
          platform: {
            type: 'string',
            enum: ['instagram', 'facebook', 'twitter', 'youtube', 'tiktok', 'custom']
          },
          exportPreset: { type: 'string' },
          version: { type: 'integer', minimum: 1 }
        }
      }
    }
  },

  // Layer type definitions for reference
  layerTypes: {
    image: {
      icon: 'image',
      creatable: true,
      multiple: true,
      acceptsAsset: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    },
    text: {
      icon: 'text',
      creatable: true,
      multiple: true,
      defaultContent: 'Enter text here'
    },
    video: {
      icon: 'video',
      creatable: true,
      multiple: true,
      acceptsAsset: ['video/mp4', 'video/webm']
    },
    audio: {
      icon: 'audio',
      creatable: true,
      multiple: true,
      acceptsAsset: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac']
    },
    shape: {
      icon: 'shape',
      creatable: true,
      multiple: true,
      defaultShape: 'rectangle'
    },
    group: {
      icon: 'folder',
      creatable: true,
      multiple: true,
      acceptsChildren: true
    },
    effect: {
      icon: 'effect',
      creatable: true,
      multiple: true,
      affectsAllLayers: true
    }
  },

  // Platform presets
  platforms: {
    instagram: {
      story: { width: 1080, height: 1920, ratio: '9:16' },
      post: { width: 1080, height: 1080, ratio: '1:1' },
      landscape: { width: 1080, height: 566, ratio: '1.91:1' }
    },
    facebook: {
      post: { width: 1200, height: 630, ratio: '1.91:1' },
      cover: { width: 820, height: 312, ratio: '2.63:1' },
      story: { width: 1080, height: 1920, ratio: '9:16' }
    },
    twitter: {
      post: { width: 1200, height: 675, ratio: '16:9' },
      header: { width: 1500, height: 500, ratio: '3:1' }
    },
    youtube: {
      thumbnail: { width: 1280, height: 720, ratio: '16:9' },
      shorts: { width: 1080, height: 1920, ratio: '9:16' }
    },
    tiktok: {
      video: { width: 1080, height: 1920, ratio: '9:16' }
    }
  }
};

/**
 * Get default layer template by type
 */
export function getDefaultLayer(type = 'text') {
  const baseLayer = {
    id: crypto.randomUUID(),
    type,
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} Layer`,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    transform: {
      x: 0,
      y: 0,
      width: 400,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
      flipH: false,
      flipV: false
    },
    masks: [],
    effects: [],
    timeline: {
      startTime: 0,
      duration: 0,
      keyframes: []
    }
  };

  // Type-specific defaults
  const typeDefaults = {
    image: {
      image: {
        src: '',
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
      transform: { ...baseLayer.transform, width: 400, height: 400 }
    },
    text: {
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
        shadows: [
          { color: '#000000', blur: 0, offsetX: 2, offsetY: 2 }
        ]
      }
    },
    video: {
      video: {
        src: '',
        startTime: 0,
        volume: 1,
        muted: true,
        loop: false,
        playbackRate: 1,
        fit: 'cover'
      },
      transform: { ...baseLayer.transform, width: 400, height: 400 }
    },
    shape: {
      shape: {
        shapeType: 'rectangle',
        fill: '#3498db',
        stroke: '#2c3e50',
        strokeWidth: 2,
        borderRadius: 0,
        sides: 5
      },
      transform: { ...baseLayer.transform, width: 200, height: 200 }
    },
    group: {
      group: {
        children: [],
        collapsed: false
      }
    }
  };

  return {
    ...baseLayer,
    ...(typeDefaults[type] || {}),
    id: crypto.randomUUID()
  };
}

/**
 * Get platform preset dimensions
 */
export function getPlatformPreset(platform, type = 'post') {
  const platformData = SceneSchema.platforms[platform];
  if (!platformData) return null;
  
  return platformData[type] || Object.values(platformData)[0];
}