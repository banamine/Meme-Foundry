/**
 * Meme Foundry - Browser Support Detection
 * Comprehensive browser feature detection and compatibility reporting
 */

class BrowserSupport {
  constructor() {
    this.features = [];
    this.results = null;
  }

  /**
   * Check all browser features
   */
  async checkAll() {
    const checks = [
      this.checkCanvas(),
      this.checkOffscreenCanvas(),
      this.checkWebGL(),
      this.checkWebWorkers(),
      this.checkIndexedDB(),
      this.checkServiceWorker(),
      this.checkWebAssembly(),
      this.checkSharedArrayBuffer(),
      this.checkAudioAPI(),
      this.checkMediaRecorder(),
      this.checkFontFace(),
      this.checkFileAPI(),
      this.checkBlobAPI(),
      this.checkURLAPI(),
      this.checkPromise(),
      this.checkFetch(),
      this.checkLocalStorage(),
      this.checkCSSGrid(),
      this.checkCSSVariables(),
      this.checkCSSFilters(),
      this.checkIntersectionObserver(),
      this.checkResizeObserver(),
      this.checkMutationObserver(),
      this.checkPerformanceAPI(),
      this.checkFullscreenAPI(),
      this.checkClipboardAPI()
    ];

    this.results = await Promise.all(checks);
    
    return {
      isSupported: this.results.every(f => !f.required || f.supported),
      features: this.results,
      browser: this.detectBrowser(),
      os: this.detectOS(),
      device: this.detectDevice()
    };
  }

  /**
   * Check Canvas 2D support
   */
  checkCanvas() {
    const supported = !!window.CanvasRenderingContext2D;
    return {
      name: 'Canvas 2D',
      supported,
      required: true,
      optional: false,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: supported ? null : 'Please use a modern browser'
    };
  }

  /**
   * Check OffscreenCanvas support
   */
  checkOffscreenCanvas() {
    const supported = typeof OffscreenCanvas !== 'undefined';
    return {
      name: 'OffscreenCanvas',
      supported,
      required: false,
      optional: true,
      details: supported ? 'Supported' : 'Performance may be degraded',
      recommendation: null
    };
  }

  /**
   * Check WebGL support
   */
  checkWebGL() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const supported = !!gl;
    
    return {
      name: 'WebGL',
      supported,
      required: false,
      optional: true,
      details: supported ? `WebGL ${gl instanceof WebGL2RenderingContext ? '2.0' : '1.0'}` : 'Not supported',
      recommendation: null
    };
  }

  /**
   * Check Web Workers support
   */
  checkWebWorkers() {
    const supported = typeof Worker !== 'undefined';
    return {
      name: 'Web Workers',
      supported,
      required: true,
      optional: false,
      details: supported ? `Supported (${navigator.hardwareConcurrency || '?'} cores)` : 'Not supported',
      recommendation: supported ? null : 'Workers are required for background processing'
    };
  }

  /**
   * Check IndexedDB support
   */
  checkIndexedDB() {
    const supported = !!window.indexedDB;
    return {
      name: 'IndexedDB',
      supported,
      required: true,
      optional: false,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: supported ? null : 'IndexedDB is required for project storage'
    };
  }

  /**
   * Check Service Worker support
   */
  checkServiceWorker() {
    const supported = 'serviceWorker' in navigator;
    return {
      name: 'Service Worker',
      supported,
      required: false,
      optional: true,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: null
    };
  }

  /**
   * Check WebAssembly support
   */
  checkWebAssembly() {
    const supported = typeof WebAssembly !== 'undefined';
    return {
      name: 'WebAssembly',
      supported,
      required: false,
      optional: true,
      details: supported ? 'Supported' : 'Not supported (FFmpeg unavailable)',
      recommendation: supported ? null : 'WebAssembly is needed for video export'
    };
  }

  /**
   * Check SharedArrayBuffer support
   */
  checkSharedArrayBuffer() {
    const supported = typeof SharedArrayBuffer !== 'undefined';
    const crossOriginIsolated = window.crossOriginIsolated || false;
    
    return {
      name: 'SharedArrayBuffer',
      supported: supported && crossOriginIsolated,
      required: false,
      optional: true,
      details: supported 
        ? (crossOriginIsolated ? 'Supported (cross-origin isolated)' : 'Available but not cross-origin isolated')
        : 'Not supported',
      recommendation: crossOriginIsolated ? null : 'Cross-origin isolation required for optimal performance'
    };
  }

  /**
   * Check Web Audio API support
   */
  checkAudioAPI() {
    const supported = !!(window.AudioContext || window.webkitAudioContext);
    return {
      name: 'Web Audio API',
      supported,
      required: false,
      optional: true,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: null
    };
  }

  /**
   * Check MediaRecorder support
   */
  checkMediaRecorder() {
    const supported = typeof MediaRecorder !== 'undefined';
    return {
      name: 'MediaRecorder',
      supported,
      required: false,
      optional: true,
      details: supported ? 'Supported' : 'Not supported (video export fallback unavailable)',
      recommendation: null
    };
  }

  /**
   * Check FontFace API support
   */
  checkFontFace() {
    const supported = typeof FontFace !== 'undefined';
    return {
      name: 'FontFace API',
      supported,
      required: true,
      optional: false,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: supported ? null : 'FontFace API is required for text rendering'
    };
  }

  /**
   * Check File API support
   */
  checkFileAPI() {
    const supported = !!(window.File && window.FileReader && window.FileList);
    return {
      name: 'File API',
      supported,
      required: true,
      optional: false,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: supported ? null : 'File API is required for media upload'
    };
  }

  /**
   * Check Blob API support
   */
  checkBlobAPI() {
    const supported = typeof Blob !== 'undefined';
    return {
      name: 'Blob API',
      supported,
      required: true,
      optional: false,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: null
    };
  }

  /**
   * Check URL API support
   */
  checkURLAPI() {
    const supported = !!(window.URL && window.URL.createObjectURL);
    return {
      name: 'URL API',
      supported,
      required: true,
      optional: false,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: null
    };
  }

  /**
   * Check Promise support
   */
  checkPromise() {
    const supported = typeof Promise !== 'undefined';
    return {
      name: 'Promise',
      supported,
      required: true,
      optional: false,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: null
    };
  }

  /**
   * Check Fetch API support
   */
  checkFetch() {
    const supported = typeof fetch !== 'undefined';
    return {
      name: 'Fetch API',
      supported,
      required: false,
      optional: true,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: null
    };
  }

  /**
   * Check localStorage support
   */
  checkLocalStorage() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return {
        name: 'localStorage',
        supported: true,
        required: true,
        optional: false,
        details: 'Supported',
        recommendation: null
      };
    } catch {
      return {
        name: 'localStorage',
        supported: false,
        required: true,
        optional: false,
        details: 'Not available (may be full or disabled)',
        recommendation: 'Clear browser storage or enable localStorage'
      };
    }
  }

  /**
   * Check CSS Grid support
   */
  checkCSSGrid() {
    const supported = window.CSS && CSS.supports('display', 'grid');
    return {
      name: 'CSS Grid',
      supported,
      required: false,
      optional: true,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: null
    };
  }

  /**
   * Check CSS Variables support
   */
  checkCSSVariables() {
    const supported = window.CSS && CSS.supports('--test', '0');
    return {
      name: 'CSS Variables',
      supported,
      required: true,
      optional: false,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: null
    };
  }

  /**
   * Check CSS Filters support
   */
  checkCSSFilters() {
    const supported = window.CSS && CSS.supports('filter', 'blur(1px)');
    return {
      name: 'CSS Filters',
      supported,
      required: false,
      optional: true,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: null
    };
  }

  /**
   * Check IntersectionObserver support
   */
  checkIntersectionObserver() {
    const supported = typeof IntersectionObserver !== 'undefined';
    return {
      name: 'IntersectionObserver',
      supported,
      required: false,
      optional: true,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: null
    };
  }

  /**
   * Check ResizeObserver support
   */
  checkResizeObserver() {
    const supported = typeof ResizeObserver !== 'undefined';
    return {
      name: 'ResizeObserver',
      supported,
      required: false,
      optional: true,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: null
    };
  }

  /**
   * Check MutationObserver support
   */
  checkMutationObserver() {
    const supported = typeof MutationObserver !== 'undefined';
    return {
      name: 'MutationObserver',
      supported,
      required: false,
      optional: true,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: null
    };
  }

  /**
   * Check Performance API support
   */
  checkPerformanceAPI() {
    const supported = !!(window.performance && window.performance.now);
    return {
      name: 'Performance API',
      supported,
      required: false,
      optional: true,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: null
    };
  }

  /**
   * Check Fullscreen API support
   */
  checkFullscreenAPI() {
    const supported = !!(
      document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled
    );
    return {
      name: 'Fullscreen API',
      supported,
      required: false,
      optional: true,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: null
    };
  }

  /**
   * Check Clipboard API support
   */
  checkClipboardAPI() {
    const supported = !!(navigator.clipboard && navigator.clipboard.writeText);
    return {
      name: 'Clipboard API',
      supported,
      required: false,
      optional: true,
      details: supported ? 'Supported' : 'Not supported',
      recommendation: null
    };
  }

  /**
   * Detect browser
   */
  detectBrowser() {
    const ua = navigator.userAgent;
    
    if (ua.includes('Firefox')) return { name: 'Firefox', vendor: 'Mozilla' };
    if (ua.includes('Edg')) return { name: 'Edge', vendor: 'Microsoft' };
    if (ua.includes('Chrome')) return { name: 'Chrome', vendor: 'Google' };
    if (ua.includes('Safari')) return { name: 'Safari', vendor: 'Apple' };
    if (ua.includes('Opera')) return { name: 'Opera', vendor: 'Opera' };
    
    return { name: 'Unknown', vendor: 'Unknown' };
  }

  /**
   * Detect operating system
   */
  detectOS() {
    const ua = navigator.userAgent;
    
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    
    return 'Unknown';
  }

  /**
   * Detect device type
   */
  detectDevice() {
    const ua = navigator.userAgent;
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    const isTablet = /iPad|Android(?!.*Mobi)/i.test(ua);
    
    if (isTablet) return 'tablet';
    if (isMobile) return 'mobile';
    return 'desktop';
  }

  /**
   * Get formatted support report
   */
  getReport() {
    if (!this.results) return null;
    
    const required = this.results.filter(f => f.required);
    const optional = this.results.filter(f => f.optional);
    const missing = required.filter(f => !f.supported);
    const warnings = optional.filter(f => !f.supported && f.recommendation);
    
    return {
      browser: this.detectBrowser(),
      os: this.detectOS(),
      device: this.detectDevice(),
      requiredFeatures: {
        total: required.length,
        supported: required.filter(f => f.supported).length,
        missing: missing.map(f => ({ name: f.name, recommendation: f.recommendation }))
      },
      optionalFeatures: {
        total: optional.length,
        supported: optional.filter(f => f.supported).length,
        missing: warnings.map(f => ({ name: f.name, recommendation: f.recommendation }))
      },
      isFullySupported: missing.length === 0,
      warnings: warnings.map(f => f.recommendation)
    };
  }
}

export { BrowserSupport };