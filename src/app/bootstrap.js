// In phaseFinalize(), update the service worker registration:

async phaseFinalize() {
  this.logger.info('Phase 5: Finalization');
  
  // Remove loading screen
  this.hideLoadingScreen();
  
  // Register service worker with correct scope
  if ('serviceWorker' in navigator) {
    try {
      // Use relative path - the service worker will use its own directory as scope
      const registration = await navigator.serviceWorker.register('./sw.js', {
        scope: './'
      });
      this.logger.info('Service Worker registered:', registration.scope);
    } catch (error) {
      this.logger.warn('Service Worker registration failed:', error);
    }
  }
  
  // ... rest of the method
}
