/**
 * Universal Fullscreen Utilities
 * Provides cross-platform fullscreen functionality for TV, mobile, and desktop devices
 */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setupFullscreenSupport();
});

function setupFullscreenSupport() {
    // Add fullscreen change event listeners
    document.addEventListener('fullscreenchange', fullscreenChangeHandler);
    document.addEventListener('webkitfullscreenchange', fullscreenChangeHandler);
    document.addEventListener('mozfullscreenchange', fullscreenChangeHandler);
    document.addEventListener('MSFullscreenChange', fullscreenChangeHandler);
    
    // Check if running on a TV and apply special handling
    const isTV = typeof window.tvCompat !== 'undefined' && window.tvCompat.detectTVDevice ? 
                window.tvCompat.detectTVDevice() : false;
    
    if (isTV) {
        applyTVFullscreenOptimizations();
    }
    
    console.log('Universal fullscreen utilities initialized');
}

function fullscreenChangeHandler() {
    const isFullscreen = !!document.fullscreenElement || 
                        !!document.webkitFullscreenElement || 
                        !!document.mozFullScreenElement || 
                        !!document.msFullscreenElement;
    
    // Update fullscreen button text if it exists
    const fullscreenBtn = document.querySelector('.fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.innerHTML = isFullscreen ? 
            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 14h6m0 0v6m0-6l-7 7m17-11h-6m0 0V4m0 6l7-7"/>
            </svg> Salir Pantalla Completa` : 
            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg> Pantalla Completa`;
    }
    
    // Add fullscreen-active class to body when in fullscreen
    document.body.classList.toggle('fullscreen-active', isFullscreen);
}

function applyTVFullscreenOptimizations() {
    // Add special handling for TV remote control navigation in fullscreen
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
            // Exit fullscreen on Escape key for TV remotes
            exitFullscreen();
        }
    });
}

function toggleFullscreen(element) {
    if (!element) {
        // If no element provided, default to video player
        element = document.getElementById('video-player');
        if (!element) return;
    }
    
    if (isFullscreen()) {
        exitFullscreen();
    } else {
        requestFullscreen(element);
    }
}

function isFullscreen() {
    return !!(document.fullscreenElement || 
              document.webkitFullscreenElement || 
              document.mozFullScreenElement || 
              document.msFullscreenElement);
}

function requestFullscreen(element) {
    // Try standard method first
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } 
    // iOS Safari and older WebKit browsers
    else if (element.webkitEnterFullscreen) { 
        element.webkitEnterFullscreen();
    }
    // iOS Safari video specific method
    else if (element.webkitSupportsFullscreen && element.webkitEnterFullscreen) {
        element.webkitEnterFullscreen();
    }
    // Alternative WebKit method
    else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
    // Mozilla
    else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    }
    // Microsoft
    else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
    // Samsung Tizen TV specific
    else if (typeof window.tizen !== 'undefined' && window.tizen.avplay) {
        try {
            window.tizen.avplay.setDisplayRect(0, 0, window.screen.width, window.screen.height);
        } catch (e) {
            console.warn('Tizen TV fullscreen failed', e);
        }
    }
    // LG WebOS TV specific
    else if (typeof window.webOS !== 'undefined' && window.webOS.platformBack) {
        try {
            // Special LG WebOS handling (if available)
            const videoElem = document.getElementById('video-player');
            if (videoElem) {
                videoElem.style.position = 'fixed';
                videoElem.style.top = '0';
                videoElem.style.left = '0';
                videoElem.style.width = '100vw';
                videoElem.style.height = '100vh';
                videoElem.style.zIndex = '9999';
            }
        } catch (e) {
            console.warn('WebOS TV fullscreen failed', e);
        }
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    } else {
        // Fallback for devices without standard methods
        const videoElem = document.getElementById('video-player');
        if (videoElem) {
            videoElem.style.position = '';
            videoElem.style.top = '';
            videoElem.style.left = '';
            videoElem.style.width = '';
            videoElem.style.height = '';
            videoElem.style.zIndex = '';
        }
    }
}

// Export fullscreen functions globally
window.fullscreenUtils = {
    toggle: toggleFullscreen,
    request: requestFullscreen,
    exit: exitFullscreen,
    isFullscreen: isFullscreen
};