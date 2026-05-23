/**
 * Meme Foundry - Platform Presets
 * Social media platform configurations and specifications
 */

const PlatformPresets = {
  // Instagram
  instagram: {
    name: 'Instagram',
    icon: '📷',
    color: '#E4405F',
    types: {
      post: {
        name: 'Post (Square)',
        width: 1080,
        height: 1080,
        ratio: '1:1',
        maxFileSize: 30 * 1024 * 1024, // 30MB
        formats: ['jpeg', 'png', 'webp'],
        recommendedFormat: 'jpeg',
        recommendedQuality: 0.92,
        safeAreas: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        },
        thumbnailSafeAreas: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        },
        textZones: [
          { x: 0, y: 0, width: 1080, height: 1080 }
        ],
        captionMaxLength: 2200,
        hashtagLimit: 30,
        metadata: {
          aspectRatio: '1:1',
          minWidth: 320,
          maxWidth: 1080,
          supportsCarousel: true,
          maxCarouselItems: 10
        }
      },
      story: {
        name: 'Story (Vertical)',
        width: 1080,
        height: 1920,
        ratio: '9:16',
        maxFileSize: 30 * 1024 * 1024,
        formats: ['jpeg', 'png', 'webm', 'mp4'],
        recommendedFormat: 'jpeg',
        recommendedQuality: 0.9,
        safeAreas: {
          top: 130,    // Profile, time, battery
          bottom: 110, // Reply bar
          left: 20,
          right: 20
        },
        thumbnailSafeAreas: {
          top: 80,
          bottom: 80,
          left: 0,
          right: 0
        },
        textZones: [
          { x: 40, y: 160, width: 1000, height: 500 },
          { x: 40, y: 1320, width: 1000, height: 400 }
        ],
        maxDuration: 15, // seconds (stories)
        metadata: {
          aspectRatio: '9:16',
          maxVideoDuration: 60,
          preferredFps: 30,
          supportsLinks: true
        }
      },
      reel: {
        name: 'Reel',
        width: 1080,
        height: 1920,
        ratio: '9:16',
        maxFileSize: 100 * 1024 * 1024,
        formats: ['mp4', 'webm'],
        recommendedFormat: 'mp4',
        recommendedQuality: 0.95,
        safeAreas: {
          top: 160,    // Username, settings, music
          bottom: 220, // Caption, likes, comments
          left: 40,
          right: 40
        },
        textZones: [
          { x: 60, y: 180, width: 960, height: 300 },
          { x: 60, y: 1300, width: 960, height: 500 }
        ],
        maxDuration: 90,
        metadata: {
          aspectRatio: '9:16',
          minDuration: 3,
          maxDuration: 90,
          preferredFps: 30,
          audioRequired: false,
          trendingAudioSupport: true
        }
      },
      landscape: {
        name: 'Landscape',
        width: 1080,
        height: 566,
        ratio: '1.91:1',
        maxFileSize: 30 * 1024 * 1024,
        formats: ['jpeg', 'png'],
        recommendedFormat: 'jpeg',
        recommendedQuality: 0.92,
        safeAreas: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        },
        textZones: [
          { x: 0, y: 0, width: 1080, height: 566 }
        ]
      }
    }
  },

  // Facebook
  facebook: {
    name: 'Facebook',
    icon: '📘',
    color: '#1877F2',
    types: {
      post: {
        name: 'Post (Link Preview)',
        width: 1200,
        height: 630,
        ratio: '1.91:1',
        maxFileSize: 30 * 1024 * 1024,
        formats: ['jpeg', 'png', 'webp', 'gif'],
        recommendedFormat: 'jpeg',
        recommendedQuality: 0.9,
        safeAreas: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        },
        textZones: [
          { x: 0, y: 0, width: 1200, height: 630 }
        ],
        metadata: {
          ogTitleMaxLength: 60,
          ogDescriptionMaxLength: 200
        }
      },
      cover: {
        name: 'Cover Photo',
        width: 820,
        height: 312,
        ratio: '2.63:1',
        maxFileSize: 10 * 1024 * 1024,
        formats: ['jpeg', 'png'],
        recommendedFormat: 'jpeg',
        recommendedQuality: 0.9,
        safeAreas: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        },
        // Profile picture overlaps left side on mobile
        overlapZones: [
          { x: 0, y: 130, width: 150, height: 150 } // Profile pic area
        ]
      },
      story: {
        name: 'Story',
        width: 1080,
        height: 1920,
        ratio: '9:16',
        maxFileSize: 30 * 1024 * 1024,
        formats: ['jpeg', 'png', 'mp4'],
        recommendedFormat: 'jpeg',
        safeAreas: {
          top: 120,
          bottom: 100,
          left: 20,
          right: 20
        },
        maxDuration: 20,
        textZones: [
          { x: 40, y: 150, width: 1000, height: 450 },
          { x: 40, y: 1350, width: 1000, height: 400 }
        ]
      }
    }
  },

  // Twitter/X
  twitter: {
    name: 'Twitter / X',
    icon: '𝕏',
    color: '#1DA1F2',
    types: {
      post: {
        name: 'Post Image',
        width: 1200,
        height: 675,
        ratio: '16:9',
        maxFileSize: 5 * 1024 * 1024, // 5MB
        formats: ['jpeg', 'png', 'webp', 'gif'],
        recommendedFormat: 'jpeg',
        recommendedQuality: 0.85,
        safeAreas: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        },
        textZones: [
          { x: 0, y: 0, width: 1200, height: 675 }
        ],
        metadata: {
          maxImagesPerTweet: 4,
          cardType: 'summary_large_image'
        }
      },
      header: {
        name: 'Header / Banner',
        width: 1500,
        height: 500,
        ratio: '3:1',
        maxFileSize: 10 * 1024 * 1024,
        formats: ['jpeg', 'png'],
        recommendedFormat: 'jpeg',
        recommendedQuality: 0.9,
        safeAreas: {
          top: 0,
          bottom: 0,
          left: 60,   // Profile pic area
          right: 0
        },
        // Profile picture centered at bottom
        profilePicZone: {
          x: 690,
          y: 350,
          width: 120,
          height: 120
        }
      }
    }
  },

  // YouTube
  youtube: {
    name: 'YouTube',
    icon: '▶️',
    color: '#FF0000',
    types: {
      thumbnail: {
        name: 'Thumbnail',
        width: 1280,
        height: 720,
        ratio: '16:9',
        maxFileSize: 2 * 1024 * 1024, // 2MB
        formats: ['jpeg', 'png', 'webp'],
        recommendedFormat: 'jpeg',
        recommendedQuality: 0.95,
        safeAreas: {
          top: 0,
          bottom: 80,  // Title bar
          left: 0,
          right: 0
        },
        // Bottom-right has duration overlay
        durationOverlay: {
          x: 1170,
          y: 650,
          width: 100,
          height: 50
        },
        textZones: [
          { x: 40, y: 20, width: 1200, height: 600 }
        ],
        metadata: {
          maxFileSize: 2 * 1024 * 1024,
          customThumbnailRequired: true
        }
      },
      shorts: {
        name: 'Shorts',
        width: 1080,
        height: 1920,
        ratio: '9:16',
        maxFileSize: 100 * 1024 * 1024,
        formats: ['mp4', 'webm'],
        recommendedFormat: 'mp4',
        safeAreas: {
          top: 120,
          bottom: 180, // Channel info area
          left: 20,
          right: 20
        },
        maxDuration: 60,
        textZones: [
          { x: 40, y: 150, width: 1000, height: 400 },
          { x: 40, y: 1300, width: 1000, height: 500 }
        ]
      }
    }
  },

  // TikTok
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    color: '#000000',
    types: {
      video: {
        name: 'Video',
        width: 1080,
        height: 1920,
        ratio: '9:16',
        maxFileSize: 287 * 1024 * 1024, // 287MB (iOS)
        formats: ['mp4', 'webm'],
        recommendedFormat: 'mp4',
        recommendedQuality: 0.95,
        safeAreas: {
          top: 180,    // Username, following, live, search
          bottom: 230, // Caption, sounds, likes, comments, shares
          left: 50,
          right: 60    // Right sidebar (like, comment, share buttons)
        },
        textZones: [
          { x: 70, y: 200, width: 940, height: 400 },
          { x: 70, y: 1200, width: 880, height: 500 }
        ],
        maxDuration: 600, // 10 minutes for some accounts
        metadata: {
          minDuration: 3,
          maxDuration: 600,
          preferredFps: 30,
          maxBitrate: '25M',
          audioBitrate: '128k'
        }
      }
    }
  },

  // LinkedIn
  linkedin: {
    name: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    types: {
      post: {
        name: 'Post',
        width: 1200,
        height: 627,
        ratio: '1.91:1',
        maxFileSize: 10 * 1024 * 1024,
        formats: ['jpeg', 'png'],
        recommendedFormat: 'jpeg',
        recommendedQuality: 0.9,
        safeAreas: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        }
      },
      banner: {
        name: 'Banner',
        width: 1584,
        height: 396,
        ratio: '4:1',
        maxFileSize: 8 * 1024 * 1024,
        formats: ['jpeg', 'png'],
        safeAreas: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        }
      }
    }
  },

  // Pinterest
  pinterest: {
    name: 'Pinterest',
    icon: '📌',
    color: '#E60023',
    types: {
      pin: {
        name: 'Pin',
        width: 1000,
        height: 1500,
        ratio: '2:3',
        maxFileSize: 20 * 1024 * 1024,
        formats: ['jpeg', 'png', 'webp'],
        recommendedFormat: 'jpeg',
        recommendedQuality: 0.9,
        safeAreas: {
          top: 0,
          bottom: 60,  // Save button overlay
          left: 0,
          right: 0
        },
        textZones: [
          { x: 0, y: 0, width: 1000, height: 1350 }
        ],
        metadata: {
          maxDescriptionLength: 500,
          richPinSupport: true
        }
      }
    }
  }
};

/**
 * Get platform preset by name and type
 */
function getPlatformPreset(platform, type = 'post') {
  const platformData = PlatformPresets[platform];
  if (!platformData) return null;
  
  return platformData.types[type] || 
         platformData.types[Object.keys(platformData.types)[0]];
}

/**
 * Get all platform presets
 */
function getAllPlatforms() {
  return Object.entries(PlatformPresets).map(([key, data]) => ({
    id: key,
    name: data.name,
    icon: data.icon,
    color: data.color,
    types: Object.keys(data.types).map(typeKey => ({
      id: typeKey,
      ...data.types[typeKey]
    }))
  }));
}

/**
 * Get preset dimensions
 */
function getPresetDimensions(platform, type = 'post') {
  const preset = getPlatformPreset(platform, type);
  if (!preset) return { width: 1080, height: 1080 };
  
  return {
    width: preset.width,
    height: preset.height,
    ratio: preset.ratio
  };
}

/**
 * Find closest platform preset for given dimensions
 */
function findClosestPreset(width, height) {
  const targetRatio = width / height;
  let closest = null;
  let minDifference = Infinity;
  
  for (const [platform, data] of Object.entries(PlatformPresets)) {
    for (const [type, preset] of Object.entries(data.types)) {
      const presetRatio = preset.width / preset.height;
      const difference = Math.abs(presetRatio - targetRatio);
      
      if (difference < minDifference) {
        minDifference = difference;
        closest = {
          platform,
          type,
          name: `${data.name} ${preset.name}`,
          preset
        };
      }
    }
  }
  
  return closest;
}

export { 
  PlatformPresets, 
  getPlatformPreset, 
  getAllPlatforms, 
  getPresetDimensions,
  findClosestPreset 
};