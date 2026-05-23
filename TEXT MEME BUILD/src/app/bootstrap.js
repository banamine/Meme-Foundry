/**
 * Meme Foundry - Application Bootstrap
 * Initializes the entire application, manages lifecycle, and coordinates all subsystems
 */
// Add these imports:
import { SceneManager } from '@/scene/scene-manager.js';
import { CanvasRenderer } from '@/renderer/canvas-renderer.js';
import { ExportManager } from '@/export/export-manager.js';
import { TimelineManager } from '@/scene/timeline-manager.js';
import { AppState } from './state.js';
import { AppConfig } from './config.js';
import { AppConstants } from './constants.js';
import { Router } from './router.js';
import { Logger } from '@/utils/logger.js';
import { BrowserSupport } from '@/utils/browser-support.js';
import { PerformanceMonitor } from '@/utils/performance-monitor.js';
import { initializeStorage } from '@/storage/indexeddb.js';
import { initializeWorkers } from '@/workers/worker-bridge.js';
import { initializeFonts } from '@/text/font-loader.js';

class ApplicationBootstrap {
  constructor() {
    this.state = null;
    this.config = null;
    this.logger = new Logger('Bootstrap');
    this.perfMonitor = new PerformanceMonitor();
    this.initialized = false;
  }

  /**
   * Initialize the entire application
   */
  async initialize() {
    const initStart = performance.now();
    
    try {
      this.logger.info('🚀 Starting Meme Foundry initialization...');
      
      // Phase 1: Environment checks
      await this.phaseEnvironment();
      
      // Phase 2: Core systems
      await this.phaseCore();
      
      // Phase 3: Services
      await this.phaseServices();
      
      // Phase 4: UI initialization
      await this.phaseUI();
      
      // Phase 5: Final setup
      await this.phaseFinalize();
      
      this.initialized = true;
      
      const initTime = (performance.now() - initStart).toFixed(2);
      this.logger.info(`✅ Meme Foundry initialized in ${initTime}ms`);
      this.perfMonitor.mark('app-initialized');
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize application:', error);
      this.showFatalError(error);
      throw error;
    }
  }

  /**
   * Phase 1: Check browser environment
   */
  async phaseEnvironment() {
    this.logger.info('Phase 1: Environment check');
    
    const support = new BrowserSupport();
    const results = await support.checkAll();
    
    if (!results.isSupported) {
      const missing = results.features
        .filter(f => !f.supported)
        .map(f => f.name);
      
      throw new Error(`Browser missing required features: ${missing.join(', ')}`);
    }
    
    // Log warnings for optional features
    results.features
      .filter(f => f.optional && !f.supported)
      .forEach(f => this.logger.warn(`Optional feature missing: ${f.name}`));
    
    // Set up global error handlers
    this.setupErrorHandlers();
    
    // Store support info
    this.config = new AppConfig({
      browserSupport: results,
      isOffline: !navigator.onLine
    });
  }

  /**
   * Phase 2: Initialize core systems
   */
  async phaseCore() {
    this.logger.info('Phase 2: Core systems');
    
    // Initialize application state
    this.state = new AppState();
    await this.state.initialize();
    
    // Set up constants
    AppConstants.initialize(this.config);
    
    // Initialize storage system
    const storage = await initializeStorage();
    this.state.setStorage(storage);
    
    // Check for crash recovery
    await this.checkCrashRecovery();
    
    this.perfMonitor.mark('core-initialized');
  }

  /**
   * Phase 3: Initialize services
   */
  async phaseServices() {
    this.logger.info('Phase 3: Services');
    
    // Initialize web workers
    const workerBridge = await initializeWorkers();
    this.state.setWorkerBridge(workerBridge);
    
    // Initialize font loading
    const fontManager = await initializeFonts();
    this.state.setFontManager(fontManager);
    
    this.perfMonitor.mark('services-initialized');
  }

  /**
   * Phase 4: Initialize UI
   */
  async phaseUI() {
    this.logger.info('Phase 4: UI initialization');
    
    // Import UI components dynamically
    const { EditorUI } = await import('@/editor/editor-ui.js');
    const ui = new EditorUI(this.state);
    
    // Initialize router
    const router = new Router(this.state);
    
    // Set up UI
    await ui.initialize();
    this.state.setUI(ui);
    this.state.setRouter(router);
    
    this.perfMonitor.mark('ui-initialized');
  }

  /**
   * Phase 5: Finalize initialization
   */
  async phaseFinalize() {
    this.logger.info('Phase 5: Finalization');
    
    // Remove loading screen
    this.hideLoadingScreen();
    
    // Register service worker for offline support
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        this.logger.info('Service Worker registered:', registration.scope);
      } catch (error) {
        this.logger.warn('Service Worker registration failed:', error);
      }
    }
    
    // Set up autosave
    this.setupAutosave();
    
    // Start performance monitoring
    this.perfMonitor.startMonitoring();
    
    // Announce ready state to screen readers
    this.announceReady();
    
    // Dispatch ready event
    window.dispatchEvent(new CustomEvent('meme-foundry-ready', {
      detail: { timestamp: Date.now() }
    }));
  }

  /**
   * Set up global error handlers
   */
  setupErrorHandlers() {
    window.addEventListener('error', (event) => {
      this.logger.error('Global error:', event.error);
      this.perfMonitor.logError('global', event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.logger.error('Unhandled promise rejection:', event.reason);
      this.perfMonitor.logError('promise', event.reason);
    });
    
    // Handle visibility changes for performance
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.perfMonitor.pauseMonitoring();
      } else {
        this.perfMonitor.resumeMonitoring();
      }
    });
  }

  /**
   * Check for crash recovery data
   */
  async checkCrashRecovery() {
    try {
      const recovery = this.state.getStorage().getRecoveryManager();
      const recovered = await recovery.checkForRecovery();
      
      if (recovered) {
        this.logger.info('Recovery data found');
        this.state.setRecoveryData(recovered);
      }
    } catch (error) {
      this.logger.warn('Recovery check failed:', error);
    }
  }

  /**
   * Set up autosave system
   */
  setupAutosave() {
    const AUTOSAVE_INTERVAL = AppConstants.get('AUTOSAVE_INTERVAL', 30000); // 30 seconds
    
    setInterval(async () => {
      if (this.state.hasUnsavedChanges()) {
        try {
          await this.state.saveProject();
          this.logger.debug('Project autosaved');
        } catch (error) {
          this.logger.error('Autosave failed:', error);
        }
      }
    }, AUTOSAVE_INTERVAL);
    
    // Save before unload
    window.addEventListener('beforeunload', async (event) => {
      if (this.state.hasUnsavedChanges()) {
        try {
          await this.state.saveProject();
        } catch (error) {
          this.logger.error('Final save failed:', error);
        }
      }
    });
  }

  /**
   * Hide loading screen with animation
   */
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const app = document.getElementById('app');
    
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      setTimeout(() => {
        loadingScreen.remove();
      }, 500);
    }
    
    if (app) {
      app.classList.add('loaded');
    }
  }

  /**
   * Announce ready state for accessibility
   */
  announceReady() {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = 'Meme Foundry is ready. You can start creating.';
    document.body.appendChild(announcement);
    
    setTimeout(() => announcement.remove(), 1000);
  }

  /**
   * Show fatal error screen
   */
  showFatalError(error) {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.innerHTML = `
        <div style="text-align: center; padding: 20px; max-width: 600px;">
          <h2 style="color: #e94560; margin-bottom: 15px;">Failed to Initialize</h2>
          <p style="color: #a0a0b0; margin-bottom: 15px;">Meme Foundry encountered a fatal error during startup:</p>
          <pre style="background: #16213e; padding: 15px; border-radius: 8px; color: #e94560; text-align: left; overflow: auto; max-height: 200px;">${error.message}</pre>
          <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #e94560; color: white; border: none; border-radius: 6px; cursor: pointer;">
            Retry
          </button>
        </div>
      `;
    }
  }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    const app = new ApplicationBootstrap();
    await app.initialize();
    
    // Expose for debugging in development
    if (import.meta.env.DEV) {
      window.__MEME_FOUNDRY__ = app;
    }
  });
} else {
  // DOM already loaded
  (async () => {
    const app = new ApplicationBootstrap();
    await app.initialize();
    
    if (import.meta.env.DEV) {
      window.__MEME_FOUNDRY__ = app;
    }
  })();
}

export { ApplicationBootstrap };
