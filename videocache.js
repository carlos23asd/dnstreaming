// Video Cache System for HLS Streaming
// This script manages caching of video segments and bandwidth optimization

class VideoCache {
    constructor() {
        this.cache = {};
        this.cacheSize = 0;
        this.maxCacheSize = 25 * 1024 * 1024; // 25MB maximum cache size
        this.enabled = this.isStorageAvailable();
        
        // Initialize IndexedDB if available
        this.initIndexedDB();
        console.log('Video cache system initialized');
    }
    
    isStorageAvailable() {
        try {
            return 'indexedDB' in window && window.indexedDB !== null;
        } catch (e) {
            console.warn('Video caching disabled: IndexedDB not available');
            return false;
        }
    }
    
    async initIndexedDB() {
        if (!this.enabled) return;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('VideoCache', 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('segments')) {
                    db.createObjectStore('segments', { keyPath: 'url' });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB initialized for video caching');
                this.loadCacheInfo();
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('IndexedDB initialization error:', event.target.error);
                this.enabled = false;
                reject(event.target.error);
            };
        });
    }
    
    async loadCacheInfo() {
        if (!this.enabled || !this.db) return;
        
        return new Promise((resolve) => {
            const transaction = this.db.transaction(['segments'], 'readonly');
            const store = transaction.objectStore('segments');
            const countRequest = store.count();
            
            countRequest.onsuccess = () => {
                console.log(`Cache contains ${countRequest.result} segments`);
                resolve();
            };
        });
    }
    
    async getSegment(url) {
        if (!this.enabled || !this.db) return null;
        
        return new Promise((resolve) => {
            const transaction = this.db.transaction(['segments'], 'readonly');
            const store = transaction.objectStore('segments');
            const request = store.get(url);
            
            request.onsuccess = (event) => {
                if (event.target.result) {
                    console.log(`Cache hit: ${url}`);
                    resolve(event.target.result.data);
                } else {
                    resolve(null);
                }
            };
            
            request.onerror = () => {
                console.warn(`Cache error retrieving: ${url}`);
                resolve(null);
            };
        });
    }
    
    async storeSegment(url, data) {
        if (!this.enabled || !this.db || !data) return;
        
        // Skip storing if data is too large - lower threshold to save memory
        if (data.byteLength > 1 * 1024 * 1024) return;
        
        try {
            const transaction = this.db.transaction(['segments'], 'readwrite');
            const store = transaction.objectStore('segments');
            
            // Clean cache if it's getting too large
            this.maintainCacheSize();
            
            store.put({
                url: url,
                data: data,
                timestamp: Date.now()
            });
            
            transaction.oncomplete = () => {
                this.cacheSize += data.byteLength;
            };
        } catch (e) {
            console.error('Error storing segment:', e);
        }
    }
    
    async maintainCacheSize() {
        if (!this.enabled || !this.db) return;
        
        // Reduced cache size to minimize memory usage
        if (this.cacheSize > this.maxCacheSize * 0.8) {
            const transaction = this.db.transaction(['segments'], 'readwrite');
            const store = transaction.objectStore('segments');
            const request = store.openCursor();
            
            let deletedSize = 0;
            const targetDeleteSize = this.cacheSize - (this.maxCacheSize * 0.5);
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && deletedSize < targetDeleteSize) {
                    const segment = cursor.value;
                    store.delete(segment.url);
                    deletedSize += segment.data.byteLength || 0;
                    cursor.continue();
                }
            };
            
            transaction.oncomplete = () => {
                this.cacheSize -= deletedSize;
                console.log(`Cache cleanup: removed ${(deletedSize/1024/1024).toFixed(2)}MB`);
            };
        }
    }
    
    async clearCache() {
        if (!this.enabled || !this.db) return;
        
        const transaction = this.db.transaction(['segments'], 'readwrite');
        const store = transaction.objectStore('segments');
        store.clear();
        
        transaction.oncomplete = () => {
            this.cacheSize = 0;
            console.log('Cache cleared');
        };
    }
    
    // Set up HLS.js with the cache
    setupHlsWithCache(hls) {
        if (!this.enabled) return;
        
        // Override the HLS loader to use our cache
        const videoCache = this;
        const originalLoaderProto = hls.config.loader.prototype;
        
        class CachedLoader {
            constructor(config) {
                this.original = new originalLoaderProto.constructor(config);
                this.stats = this.original.stats;
                this.context = this.original.context;
            }
            
            destroy() {
                this.original.destroy();
            }
            
            abort() {
                this.original.abort();
            }
            
            load(context, config, callbacks) {
                const url = context.url;
                
                // Only cache ts segments
                if (url.includes('.ts') || url.includes('segment')) {
                    videoCache.getSegment(url).then(cachedData => {
                        if (cachedData) {
                            // Use cached data
                            const stats = { 
                                loaded: cachedData.byteLength,
                                total: cachedData.byteLength,
                                trequest: performance.now(),
                                tfirst: performance.now(),
                                tload: performance.now(),
                                cached: true
                            };
                            
                            callbacks.onSuccess({
                                data: cachedData,
                                stats: stats
                            }, stats, context);
                        } else {
                            // Load from network and cache the result
                            const originalOnSuccess = callbacks.onSuccess;
                            callbacks.onSuccess = (response, stats, context) => {
                                if (response && response.data) {
                                    videoCache.storeSegment(url, response.data);
                                }
                                originalOnSuccess(response, stats, context);
                            };
                            
                            this.original.load(context, config, callbacks);
                        }
                    });
                } else {
                    // Bypass cache for non-segment files
                    this.original.load(context, config, callbacks);
                }
            }
        }
        
        // Apply the cached loader to HLS
        hls.config.loader = CachedLoader;
        console.log('HLS.js configured with cache system');
    }
}

// Enhanced HLS Config for higher bandwidth usage and quality
function getEnhancedHlsConfig() {
    return {
        maxBufferLength: 20,          // Reduced buffer length to save memory
        maxMaxBufferLength: 30,       // Reduced maximum buffer size
        maxBufferSize: 8 * 1024 * 1024, // 8MB maximum buffer size (reduced from 15MB)
        maxBufferHole: 0.5,           
        lowLatencyMode: false,        // Disabled to reduce processing
        backBufferLength: 10,         // Reduced back buffer length
        enableWorker: true,           
        startLevel: -1,               
        initialLiveManifestSize: 1,   
        // More efficient bandwidth factors for memory optimization
        abrEwmaDefaultEstimate: 2000000, // Lower bandwidth estimate (2mbps)
        abrBandWidthFactor: 0.75,     // More conservative bandwidth usage
        abrBandWidthUpFactor: 0.7,   
        abrMaxWithRealBitrate: true,  
        liveSyncDurationCount: 2,     // Reduced live sync window
        testBandwidth: false,         // Disabled to save resources
        progressive: true,            
        lowMemoryMode: true,          // Enable low memory mode
        // Shorter timeouts to avoid hanging resources
        fragLoadingTimeOut: 15000,    // 15 seconds timeout
        manifestLoadingTimeOut: 8000, // 8 seconds timeout
        levelLoadingTimeOut: 8000     // 8 seconds timeout
    };
}

// Global video cache instance
const videoCache = new VideoCache();

// Replace the existing hls initialization in index2.html with our enhanced version
document.addEventListener('DOMContentLoaded', function() {
    const originalInitHls = listaReproduccion.addEventListener;
    
    listaReproduccion.addEventListener = function(type, listener, options) {
        if (type === 'click' && listener.toString().includes('hls = new Hls')) {
            // Replace with our enhanced version
            const enhancedListener = function(e) {
                if (e.target.tagName === 'LI') {
                    e.preventDefault();
                    const urlHls = e.target.getAttribute('data-url-hls');

                    if (urlHls) {
                        if (canalSeleccionado) {
                            canalSeleccionado.classList.remove('seleccionado');
                        }

                        e.target.classList.add('seleccionado');
                        canalSeleccionado = e.target;

                        if (hls) {
                            hls.destroy();
                        }

                        streamStatus.className = 'stream-status waiting';
                        streamStatus.textContent = 'Conectando...';

                        // Use enhanced config
                        hls = new Hls(getEnhancedHlsConfig());
                        // Set up the cache with HLS.js
                        videoCache.setupHlsWithCache(hls);
                        
                        hls.loadSource(urlHls);
                        hls.attachMedia(videoPlayer);

                        // Add quality level selection for higher bandwidth
                        hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
                            const availableLevels = hls.levels;
                            // Target around 3Mbps quality if available
                            const targetBandwidth = 3000000; // 3 Mbps
                            let bestLevel = availableLevels.length - 1; // Default to highest
                            
                            // Find highest quality that doesn't exceed 3Mbps too much
                            for (let i = availableLevels.length - 1; i >= 0; i--) {
                                if (availableLevels[i].bitrate <= targetBandwidth * 1.2) {
                                    bestLevel = i;
                                    break;
                                }
                            }
                            
                            hls.currentLevel = bestLevel; // Force initial quality level
                            console.log(`Selected quality level: ${bestLevel} (${(availableLevels[bestLevel]?.bitrate/1000000).toFixed(2)}Mbps)`);
                        });

                        hls.on(Hls.Events.MANIFEST_LOADED, () => {
                            streamStatus.className = 'stream-status live';
                            streamStatus.textContent = 'EN VIVO';
                            videoPlayer.play();
                        });

                        hls.on(Hls.Events.ERROR, (event, data) => {
                            if (data.fatal) {
                                streamStatus.className = 'stream-status error';
                                streamStatus.textContent = 'Error: Canal no disponible';
                                console.error('Error de stream:', data.type, data.details);
                            }
                        });
                    }
                }
            };
            
            return originalInitHls.call(this, type, enhancedListener, options);
        }
        
        return originalInitHls.call(this, type, listener, options);
    };
});