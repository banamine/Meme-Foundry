/**
 * Meme Foundry - Filename Generator
 * Generates intelligent filenames for exports
 */

class FilenameGenerator {
  constructor() {
    // Default patterns
    this.patterns = {
      default: '{name}-{date}-{time}',
      image: '{name}-{platform}-{dimensions}-{date}',
      video: '{name}-{platform}-{duration}s-{date}',
      thumbnail: 'thumb-{name}-{date}',
      batch: '{name}-batch-{index}-{date}',
      social: '{platform}-{type}-{name}-{date}'
    };
    
    // Replacement sanitization
    this.sanitizeOptions = {
      maxLength: 200,
      replacement: '-',
      lowercase: true,
      removeAccents: true
    };
  }

  /**
   * Generate filename for export
   */
  generate(config, pattern = null) {
    const projectName = config.projectName || 'untitled';
    const format = config.format || 'png';
    const platform = config.platform || config.preset || 'custom';
    const extension = this.getExtension(format);
    
    // Get pattern
    const patternKey = this.getPatternKey(config);
    const patternString = pattern || this.patterns[patternKey] || this.patterns.default;
    
    // Build replacements
    const replacements = this.buildReplacements(config, projectName, platform);
    
    // Apply pattern
    let filename = this.applyPattern(patternString, replacements);
    
    // Sanitize
    filename = this.sanitize(filename);
    
    // Add extension
    filename += extension;
    
    return filename;
  }

  /**
   * Get pattern key based on config
   */
  getPatternKey(config) {
    if (config.format === 'html') return 'batch';
    if (config.options?.thumbnail) return 'thumbnail';
    if (['mp4', 'webm'].includes(config.format)) return 'video';
    if (config.preset) return 'social';
    if (['png', 'jpeg', 'webp'].includes(config.format)) return 'image';
    return 'default';
  }

  /**
   * Build replacement values
   */
  buildReplacements(config, projectName, platform) {
    const now = new Date();
    
    return {
      name: projectName,
      project: projectName,
      platform: platform,
      preset: config.preset || 'custom',
      type: config.options?.type || 'post',
      format: config.format,
      date: this.formatDate(now, 'YYYY-MM-DD'),
      time: this.formatDate(now, 'HHmmss'),
      datetime: this.formatDate(now, 'YYYY-MM-DD-HHmmss'),
      timestamp: String(now.getTime()),
      dimensions: this.getDimensionsString(config),
      width: config.options?.width || config.width || '1080',
      height: config.options?.height || config.height || '1080',
      quality: String(Math.round((config.options?.quality || 0.9) * 100)),
      duration: String(config.options?.duration || 0),
      fps: String(config.options?.fps || 30),
      index: String(config.index || 1),
      count: String(config.count || 1),
      random: this.generateRandomString(4),
      version: 'v1'
    };
  }

  /**
   * Apply pattern with replacements
   */
  applyPattern(pattern, replacements) {
    return pattern.replace(/\{(\w+)\}/g, (match, key) => {
      return replacements[key] !== undefined ? replacements[key] : match;
    });
  }

  /**
   * Get file extension
   */
  getExtension(format) {
    const extensions = {
      png: '.png',
      jpeg: '.jpg',
      jpg: '.jpg',
      webp: '.webp',
      gif: '.gif',
      mp4: '.mp4',
      webm: '.webm',
      html: '.html',
      json: '.json',
      svg: '.svg',
      pdf: '.pdf'
    };
    
    return extensions[format] || `.${format}`;
  }

  /**
   * Get dimensions string
   */
  getDimensionsString(config) {
    const width = config.options?.width || config.width || 1080;
    const height = config.options?.height || config.height || 1080;
    return `${width}x${height}`;
  }

  /**
   * Sanitize filename
   */
  sanitize(filename) {
    let sanitized = filename;
    
    // Remove accents
    if (this.sanitizeOptions.removeAccents) {
      sanitized = this.removeAccents(sanitized);
    }
    
    // Replace invalid characters
    sanitized = sanitized
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Remove invalid chars
      .replace(/\s+/g, this.sanitizeOptions.replacement) // Replace spaces
      .replace(/-+/g, '-') // Collapse multiple dashes
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
    
    // Convert to lowercase
    if (this.sanitizeOptions.lowercase) {
      sanitized = sanitized.toLowerCase();
    }
    
    // Truncate
    if (sanitized.length > this.sanitizeOptions.maxLength) {
      const ext = sanitized.split('.').pop();
      const namePart = sanitized.slice(0, this.sanitizeOptions.maxLength - ext.length - 1);
      sanitized = `${namePart}.${ext}`;
    }
    
    return sanitized || 'untitled';
  }

  /**
   * Remove accents from string
   */
  removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Format date
   */
  formatDate(date, format) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * Generate random string
   */
  generateRandomString(length = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Set custom pattern
   */
  setPattern(key, pattern) {
    this.patterns[key] = pattern;
  }

  /**
   * Get available patterns
   */
  getPatterns() {
    return { ...this.patterns };
  }

  /**
   * Preview filename
   */
  preview(config, pattern = null) {
    return this.generate(config, pattern);
  }

  /**
   * Generate batch filenames
   */
  generateBatch(configs, pattern = null) {
    return configs.map((config, index) => {
      return this.generate({
        ...config,
        index: index + 1,
        count: configs.length
      }, pattern || this.patterns.batch);
    });
  }

  /**
   * Generate unique filename (checks for conflicts)
   */
  generateUnique(config, existingFiles = []) {
    let filename = this.generate(config);
    let counter = 1;
    
    while (existingFiles.includes(filename)) {
      const configWithCounter = {
        ...config,
        index: counter
      };
      filename = this.generate(configWithCounter, '{name}-{index}');
      counter++;
    }
    
    return filename;
  }

  /**
   * Parse filename back to config
   */
  parseFilename(filename) {
    const parts = filename.split('.');
    const extension = parts.pop();
    const nameWithoutExt = parts.join('.');
    
    const segments = nameWithoutExt.split('-');
    
    return {
      filename,
      name: segments[0] || '',
      extension: `.${extension}`,
      segments
    };
  }

  /**
   * Update sanitize options
   */
  setSanitizeOptions(options) {
    this.sanitizeOptions = { ...this.sanitizeOptions, ...options };
  }
}

export { FilenameGenerator };