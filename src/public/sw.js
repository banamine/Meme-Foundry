// In sw.js, update the CACHE_NAME and scope-related paths:

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `meme-foundry-${CACHE_VERSION}`;

// PRECACHE_ASSETS should use relative paths
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './social-preview.png'
];

// ... rest of the service worker code remains the same
// The scope will automatically be set to the directory the sw.js is served from
