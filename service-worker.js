/**
 * Service Worker for CyberOps: Syndicate PWA
 * Handles offline functionality, caching, and background sync
 */

const CACHE_NAME = 'cyberops-v1.0.0';
const RUNTIME_CACHE = 'cyberops-runtime';

// Core files that must be cached for offline play
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/cyberops-game.css',
  '/manifest.json',

  // Core JavaScript modules
  '/js/game-core.js',
  '/js/game-init.js',
  '/js/game-loop.js',
  '/js/game-rendering.js',
  '/js/game-events.js',
  '/js/game-screens.js',
  '/js/game-hub.js',
  '/js/game-flow.js',
  '/js/game-keyboard.js',
  '/js/game-audio.js',
  '/js/game-utils.js',

  // Services
  '/js/services/game-services.js',
  '/js/services/formula-service.js',
  '/js/services/equipment-service.js',
  '/js/services/rpg-service.js',

  // Engine
  '/js/engine/campaign-interface.js',
  '/js/engine/content-loader.js',
  '/js/engine/engine-integration.js',

  // Campaign files
  '/campaigns/main/campaign-content.js',
  '/campaigns/main/campaign-config.js',

  // Icons (essential sizes)
  '/assets/logo-192.png',
  '/assets/logo-512.png'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching core assets');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting(); // Activate immediately
      })
      .catch(err => {
        console.error('[Service Worker] Installation failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            return cacheName.startsWith('cyberops-') && cacheName !== CACHE_NAME;
          })
          .map(cacheName => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('[Service Worker] Activation complete');
      return self.clients.claim(); // Take control immediately
    })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Return cached version
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache dynamically loaded content (like mission files)
            if (shouldCache(url.pathname)) {
              caches.open(RUNTIME_CACHE)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          })
          .catch(() => {
            // Offline fallback for HTML pages
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Helper function to determine if a resource should be cached
function shouldCache(pathname) {
  // Cache JavaScript files
  if (pathname.endsWith('.js')) return true;

  // Cache CSS files
  if (pathname.endsWith('.css')) return true;

  // Cache image assets
  if (pathname.includes('/assets/')) return true;

  // Cache campaign files
  if (pathname.includes('/campaigns/')) return true;

  // Cache music files (but with size limit)
  if (pathname.includes('/music/') && pathname.endsWith('.mp3')) {
    return true; // Could add size check here
  }

  return false;
}

// Background sync for save games
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-saves') {
    event.waitUntil(syncSaveGames());
  }
});

async function syncSaveGames() {
  // Get saves from IndexedDB
  const saves = await getSavesToSync();

  if (saves && saves.length > 0) {
    // Try to sync with server
    try {
      const response = await fetch('/api/sync-saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saves })
      });

      if (response.ok) {
        console.log('[Service Worker] Save games synced');
        await clearSyncedSaves();
      }
    } catch (err) {
      console.log('[Service Worker] Sync failed, will retry later');
    }
  }
}

// Placeholder functions for save sync (implement with IndexedDB)
async function getSavesToSync() {
  // Implementation would read from IndexedDB
  return [];
}

async function clearSyncedSaves() {
  // Implementation would clear synced flags in IndexedDB
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_MISSION') {
    // Cache a specific mission's assets
    const missionId = event.data.missionId;
    cacheMissionAssets(missionId);
  }
});

async function cacheMissionAssets(missionId) {
  const cache = await caches.open(RUNTIME_CACHE);
  const assets = [
    `/campaigns/main/act${missionId.slice(5, 6)}/${missionId}.js`,
    `/music/missions/${missionId}/ambient.mp3`,
    `/music/missions/${missionId}/combat.mp3`
  ];

  try {
    await cache.addAll(assets.filter(asset => {
      // Only cache assets that exist
      return fetch(asset, { method: 'HEAD' })
        .then(response => response.ok)
        .catch(() => false);
    }));
    console.log(`[Service Worker] Cached assets for mission ${missionId}`);
  } catch (err) {
    console.error(`[Service Worker] Failed to cache mission ${missionId}:`, err);
  }
}