/**
 * Meme Foundry - Service Worker
 * Offline support, caching strategies, and background sync
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `meme-foundry-${CACHE_VERSION}`;

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/social-preview.png'
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first, fallback to network
  CACHE_FIRST: 'cache-first',
  // Network first, fallback to cache
  NETWORK_FIRST: 'network-first',
  // Cache only (static assets)
  CACHE_ONLY: 'cache-only',
  // Network only (API calls)
  NETWORK_ONLY: 'network-only',
  // Stale while revalidate
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Route matching patterns
const ROUTE_PATTERNS = [
  {
    pattern: /\.(?:js|css|woff2?|ttf|eot)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: `${CACHE_NAME}-static`
  },
  {
    pattern: /\.(?:png|jpg|jpeg|gif|webp|svg|ico)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: `${CACHE_NAME}-images`
  },
  {
    pattern: /\.(?:mp4|webm|mp3|wav|ogg)$/,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cacheName: `${CACHE_NAME}-media`,
    maxEntries: 20,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  {
    pattern: /\/api\//,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cacheName: `${CACHE_NAME}-api`
  },
  {
    pattern: /\/fonts\.googleapis\.com/,
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    cacheName: `${CACHE_NAME}-fonts`
  }
];

// ============================================
// Install Event
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    (async () => {
      // Open cache
      const cache = await caches.open(CACHE_NAME);
      
      // Precache static assets
      console.log('[SW] Precaching assets...');
      await cache.addAll(PRECACHE_ASSETS);
      
      // Force activation
      await self.skipWaiting();
      
      console.log('[SW] Installed successfully');
    })()
  );
});

// ============================================
// Activate Event
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    (async () => {
      // Get all cache names
      const cacheNames = await caches.keys();
      
      // Delete old caches
      const deletePromises = cacheNames
        .filter(name => name.startsWith('meme-foundry-') && name !== CACHE_NAME)
        .map(name => {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        });
      
      await Promise.all(deletePromises);
      
      // Claim all clients
      await self.clients.claim();
      
      console.log('[SW] Activated');
    })()
  );
});

// ============================================
// Fetch Event
// ============================================
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  event.respondWith(handleFetch(event));
});

/**
 * Handle fetch with appropriate caching strategy
 */
async function handleFetch(event) {
  const request = event.request;
  const url = new URL(request.url);
  
  // Find matching route pattern
  const route = ROUTE_PATTERNS.find(r => r.pattern.test(url.pathname));
  const strategy = route?.strategy || CACHE_STRATEGIES.NETWORK_FIRST;
  
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request, route);
      
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request, route);
      
    case CACHE_STRATEGIES.CACHE_ONLY:
      return cacheOnly(request, route);
      
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return networkOnly(request);
      
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, route);
      
    default:
      return networkFirst(request, route);
  }
}

/**
 * Cache first strategy
 * Check cache first, fallback to network
 */
async function cacheFirst(request, route) {
  const cache = await caches.open(route.cacheName || CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache valid responses
    if (networkResponse.ok && request.method === 'GET') {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return cache.match('/index.html');
    }
    
    throw error;
  }
}

/**
 * Network first strategy
 * Try network first, fallback to cache
 */
async function networkFirst(request, route) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache valid responses
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(route.cacheName || CACHE_NAME);
      cache.put(request, networkResponse.clone());
      
      // Limit cache entries if configured
      if (route.maxEntries) {
        limitCacheEntries(cache, route.maxEntries);
      }
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cache = await caches.open(route.cacheName || CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback
    if (request.mode === 'navigate') {
      return cache.match('/index.html');
    }
    
    throw error;
  }
}

/**
 * Cache only strategy
 */
async function cacheOnly(request, route) {
  const cache = await caches.open(route.cacheName || CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  return new Response('Not found in cache', { status: 404 });
}

/**
 * Network only strategy
 */
async function networkOnly(request) {
  return fetch(request);
}

/**
 * Stale while revalidate strategy
 * Return cached version immediately, update cache in background
 */
async function staleWhileRevalidate(request, route) {
  const cache = await caches.open(route.cacheName || CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Update cache in background
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Silently fail
  });
  
  // Return cached immediately or wait for network
  return cachedResponse || fetchPromise;
}

/**
 * Limit cache entries
 */
async function limitCacheEntries(cache, maxEntries) {
  const keys = await cache.keys();
  
  if (keys.length > maxEntries) {
    // Delete oldest entries
    const deleteCount = keys.length - maxEntries;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// ============================================
// Message Events
// ============================================
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'skip-waiting':
      self.skipWaiting();
      break;
      
    case 'clear-cache':
      event.waitUntil(clearAllCaches());
      break;
      
    case 'get-cache-stats':
      event.waitUntil(
        getCacheStats().then(stats => {
          event.ports[0]?.postMessage(stats);
        })
      );
      break;
      
    case 'precache':
      event.waitUntil(
        precacheUrls(data.urls)
      );
      break;
      
    case 'update':
      event.waitUntil(
        self.registration.update()
      );
      break;
  }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  const memeFoundryCaches = cacheNames.filter(name => 
    name.startsWith('meme-foundry-')
  );
  
  await Promise.all(
    memeFoundryCaches.map(name => caches.delete(name))
  );
  
  console.log('[SW] All caches cleared');
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};
  
  for (const name of cacheNames) {
    if (name.startsWith('meme-foundry-')) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      stats[name] = {
        entries: keys.length,
        urls: keys.map(k => k.url)
      };
    }
  }
  
  return stats;
}

/**
 * Precache specific URLs
 */
async function precacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(urls);
  console.log('[SW] Precached URLs:', urls.length);
}

// ============================================
// Background Sync
// ============================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'save-project') {
    event.waitUntil(syncProject());
  }
});

/**
 * Sync project data when back online
 */
async function syncProject() {
  try {
    const clients = await self.clients.matchAll({ type: 'window' });
    
    clients.forEach(client => {
      client.postMessage({
        type: 'background-sync',
        action: 'save-project'
      });
    });
    
    console.log('[SW] Background sync completed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// ============================================
// Push Notifications (optional)
// ============================================
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const options = {
    body: data.body || 'Your project has been updated',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Meme Foundry',
      options
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});