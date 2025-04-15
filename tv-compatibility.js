/**
 * TV and Cross-Browser Compatibility Helper
 * Enhances video playback and navigation for TV devices and ensures
 * cross-browser compatibility without requiring special settings.
 */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setupTVCompatibility();
});

function setupTVCompatibility() {
    // Detect TV/Set-top box devices
    const isTV = detectTVDevice();
    
    // Apply optimizations for TV environments
    if (isTV) {
        applyTVOptimizations();
    }
    
    // Apply cross-browser compatibility fixes
    applyCrossBrowserFixes();
    
    // Setup keyboard navigation for TVs and remote controls
    setupKeyboardNavigation();
    
    console.log('TV compatibility module initialized');
}

function detectTVDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Check common TV and set-top box identifiers (expanded list)
    const tvPatterns = [
        'smart-tv', 'smarttv', 'googletv', 'appletv', 'hbbtv', 'roku', 
        'viera', 'netcast', 'nettv', 'webos', 'tizen', 'android tv', 
        'vidaa', 'playstation', 'xbox', 'television', 'tv_', 'philips', 
        'panasonic', 'samsung', 'lg tv', 'sony', 'sharp', 'opera tv'
    ];
    
    // Check for TV user agents
    const isTVUserAgent = tvPatterns.some(pattern => userAgent.includes(pattern));
    
    // Check screen dimensions (TVs typically have large screens)
    const hasLargeScreen = window.screen.width >= 1280 && window.screen.height >= 720;
    
    // Check for typical TV input device
    const hasTVInput = 'ontouchstart' in window === false && 
                      ('maxTouchPoints' in navigator) && 
                      navigator.maxTouchPoints === 0;
    
    // Additional checks for common TV platforms
    const hasTVPlatform = typeof window.tizen !== 'undefined' || 
                          typeof window.webOS !== 'undefined' ||
                          typeof window.PalmSystem !== 'undefined';
    
    const isTV = isTVUserAgent || hasTVPlatform || (hasLargeScreen && hasTVInput);
    
    if (isTV) {
        // Apply TV class immediately
        document.documentElement.classList.add('tv-mode');
    }
    
    return isTV;
}

function applyTVOptimizations() {
    // Increase size of UI elements for TV viewing distance
    document.documentElement.classList.add('tv-mode');
    
    // Optimize video player for TV (no popups needed)
    const videoPlayer = document.getElementById('video-player');
    if (videoPlayer) {
        // Increase buffer size for better TV playback
        if (window.Hls && window.hls) {
            window.hls.config.maxBufferLength = 60;
            window.hls.config.maxMaxBufferLength = 90;
        }
        
        // Enable custom fullscreen that doesn't require popups
        videoPlayer.addEventListener('dblclick', function() {
            if (window.fullscreenUtils && window.fullscreenUtils.toggle) {
                window.fullscreenUtils.toggle(videoPlayer);
            }
        });
        
        // Apply TV-specific styling
        videoPlayer.classList.add('tv-optimized');
    }
    
    // Ensure menu items are properly focusable with remote
    document.querySelectorAll('.lista-reproduccion li').forEach(item => {
        item.setAttribute('tabindex', '0');
    });
}

function applyCrossBrowserFixes() {
    // Fix for older browsers that don't fully support Promises
    if (typeof window.Promise === 'undefined') {
        // Load a polyfill dynamically
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/promise-polyfill@8/dist/polyfill.min.js';
        document.head.appendChild(script);
    }
    
    // Fix for browsers without native HLS support
    const videoPlayer = document.getElementById('video-player');
    if (videoPlayer && !videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        // Ensure HLS.js is available
        if (typeof Hls === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
            document.head.appendChild(script);
        }
    }
    
    // Fix for browsers without requestFullscreen
    if (videoPlayer && !videoPlayer.requestFullscreen) {
        videoPlayer.requestFullscreen = videoPlayer.mozRequestFullScreen || 
                                        videoPlayer.webkitRequestFullscreen || 
                                        videoPlayer.msRequestFullscreen;
    }
    
    // Fix for browsers without exitFullscreen
    if (!document.exitFullscreen) {
        document.exitFullscreen = document.mozCancelFullScreen || 
                                 document.webkitExitFullscreen || 
                                 document.msExitFullscreen;
    }
}

function setupKeyboardNavigation() {
    // Enable keyboard navigation for TV remotes and keyboard-only users
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const elements = document.querySelectorAll(focusableElements);
    
    // Set initial focus for TV navigation
    if (elements.length > 0 && !document.activeElement) {
        const firstElement = elements[0];
        setTimeout(() => firstElement.focus(), 100);
    }
    
    // Handle arrow key navigation for TV remotes
    document.addEventListener('keydown', function(e) {
        const videoPlayer = document.getElementById('video-player');
        
        switch (e.key) {
            case 'ArrowUp':
                navigateFocus('up');
                break;
            case 'ArrowDown':
                navigateFocus('down');
                break;
            case 'ArrowLeft':
                if (document.activeElement === videoPlayer) {
                    // Rewind video
                    videoPlayer.currentTime -= 10;
                } else {
                    navigateFocus('left');
                }
                break;
            case 'ArrowRight':
                if (document.activeElement === videoPlayer) {
                    // Fast forward video
                    videoPlayer.currentTime += 10;
                } else {
                    navigateFocus('right');
                }
                break;
            case 'Enter':
                // Simulate click for TV remote "OK" button
                if (document.activeElement && document.activeElement !== document.body) {
                    document.activeElement.click();
                }
                break;
        }
    });
}

function navigateFocus(direction) {
    const focusableElements = Array.from(document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
    if (!focusableElements.length) return;
    
    const currentElement = document.activeElement;
    if (!currentElement || currentElement === document.body) {
        focusableElements[0].focus();
        return;
    }
    
    const currentRect = currentElement.getBoundingClientRect();
    let closestElement = null;
    let closestDistance = Infinity;
    
    focusableElements.forEach(element => {
        if (element === currentElement) return;
        
        const elementRect = element.getBoundingClientRect();
        let isInDirection = false;
        let distance = 0;
        
        switch (direction) {
            case 'up':
                isInDirection = elementRect.bottom < currentRect.top;
                distance = currentRect.top - elementRect.bottom;
                break;
            case 'down':
                isInDirection = elementRect.top > currentRect.bottom;
                distance = elementRect.top - currentRect.bottom;
                break;
            case 'left':
                isInDirection = elementRect.right < currentRect.left;
                distance = currentRect.left - elementRect.right;
                break;
            case 'right':
                isInDirection = elementRect.left > currentRect.right;
                distance = elementRect.left - currentRect.right;
                break;
        }
        
        // Calculate horizontal/vertical alignment to prioritize elements directly in line
        const horizontalOverlap = Math.min(currentRect.right, elementRect.right) - Math.max(currentRect.left, elementRect.left);
        const verticalOverlap = Math.min(currentRect.bottom, elementRect.bottom) - Math.max(currentRect.top, elementRect.top);
        
        // Adjust distance based on alignment
        if (isInDirection) {
            if ((direction === 'up' || direction === 'down') && horizontalOverlap > 0) {
                distance = distance * 0.5; // Prioritize elements in the same vertical line
            } else if ((direction === 'left' || direction === 'right') && verticalOverlap > 0) {
                distance = distance * 0.5; // Prioritize elements in the same horizontal line
            }
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestElement = element;
            }
        }
    });
    
    if (closestElement) {
        closestElement.focus();
    } else if (direction === 'up' || direction === 'down') {
        // If no element found in vertical navigation, try tabbing
        if (direction === 'down') {
            // Try to move forward in tab order
            const currentIndex = focusableElements.indexOf(currentElement);
            const nextElement = focusableElements[currentIndex + 1] || focusableElements[0];
            nextElement.focus();
        } else {
            // Try to move backward in tab order
            const currentIndex = focusableElements.indexOf(currentElement);
            const prevElement = focusableElements[currentIndex - 1] || focusableElements[focusableElements.length - 1];
            prevElement.focus();
        }
    }
}

// Export functions for global use
window.tvCompat = {
    detectTVDevice: detectTVDevice
};