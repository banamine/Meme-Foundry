/**
 * Meme Foundry - WebGL Renderer (Stub)
 * Placeholder for future WebGL rendering support
 */

import { Logger } from '@/utils/logger.js';

class WebGLRenderer {
  constructor() {
    this.logger = new Logger('WebGLRenderer');
    this.supported = false;
    this.gl = null;
  }

  async initialize(canvas) {
    this.logger.info('WebGL renderer not yet implemented');
    return false;
  }

  isSupported() {
    return false;
  }

  render(scene) {
    this.logger.warn('WebGL rendering not available');
    return false;
  }

  destroy() {
    this.gl = null;
  }
}

export { WebGLRenderer };