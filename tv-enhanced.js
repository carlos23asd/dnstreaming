/**
 * Enhanced TV Compatibility Module
 * Extends tv-compatibility.js with more advanced TV navigation and accessibility features
 */

document.addEventListener('DOMContentLoaded', function() {
    // Detect if we're on a login page or content page
    const isLoginPage = document.getElementById('login-container') !== null;
    
    enhanceTvCompatibility(isLoginPage);
});

function enhanceTvCompatibility(isLoginPage) {
    // Detect TV devices with more reliable methods
    const isTV = detectTVDevice();
    
    if (isTV) {
        console.log('TV device detected, applying optimizations');
        document.documentElement.classList.add('tv-mode');
        applyTvSpecificEnhancements(isLoginPage);
    }
    
    // Set up enhanced keyboard navigation for all devices
    setupEnhancedKeyboardNavigation(isLoginPage);
}

function detectTVDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Expanded TV detection patterns
    const tvPatterns = [
        'smart-tv', 'smarttv', 'googletv', 'appletv', 'hbbtv', 'roku', 
        'viera', 'netcast', 'nettv', 'webos', 'tizen', 'android tv', 
        'vidaa', 'playstation', 'xbox', 'network tv', 'philips', 'sharp',
        'lge netcast', 'hisense', 'vizio', 'panasonic', 'sony tv', 'lg tv',
        'samsung', 'opera tv', 'smart-viera', 'bravia', 'aquos'
    ];
    
    // Check for TV user agents
    const isTVUserAgent = tvPatterns.some(pattern => userAgent.includes(pattern));
    
    // Screen dimension check - TVs typically have large screens and specific aspect ratios
    const hasLargeScreen = window.screen.width >= 1280 && window.screen.height >= 720;
    
    // Check typical TV input characteristics
    const hasTVInput = 'ontouchstart' in window === false && 
                      navigator.maxTouchPoints === 0;
    
    // Check for specific TV features
    const hasTVFeatures = typeof window.tizen !== 'undefined' || 
                         typeof window.webOS !== 'undefined' ||
                         typeof window.oipfObjectFactory !== 'undefined';
    
    return isTVUserAgent || hasTVFeatures || (hasLargeScreen && hasTVInput);
}

function applyTvSpecificEnhancements(isLoginPage) {
    // Create larger hit areas for all interactive elements
    document.querySelectorAll('button, input, a, [tabindex]').forEach(el => {
        el.classList.add('tv-interactive');
    });
    
    // Apply specific enhancements based on the page type
    if (isLoginPage) {
        enhanceLoginPage();
    } else {
        enhanceContentPage();
    }
    
    // Add TV-specific CSS
    addTvStyles();
}

function enhanceLoginPage() {
    // Add sequential tabindex for better TV navigation
    const focusableElements = document.querySelectorAll('input, button');
    focusableElements.forEach((el, index) => {
        el.setAttribute('tabindex', index + 1);
    });
    
    // Set initial focus to email field
    const emailField = document.getElementById('email');
    if (emailField) {
        setTimeout(() => emailField.focus(), 500);
    }
}

function enhanceContentPage() {
    // Focus first channel on page load
    const firstChannel = document.querySelector('.lista-reproduccion li');
    if (firstChannel) {
        setTimeout(() => firstChannel.focus(), 500);
    }
    
    // Add enhanced visual focus indicators
    document.querySelectorAll('.lista-reproduccion li').forEach(item => {
        item.addEventListener('focus', () => {
            item.classList.add('focus-visible');
        });
        
        item.addEventListener('blur', () => {
            item.classList.remove('focus-visible');
        });
    });
}

function setupEnhancedKeyboardNavigation(isLoginPage) {
    // Handle keyboard events
    document.addEventListener('keydown', function(e) {
        const videoPlayer = document.getElementById('video-player');
        const currentElement = document.activeElement;
        
        // Ensure empty focus doesn't target body
        if (currentElement === document.body) {
            const firstFocusable = document.querySelector('button, input, a, [tabindex]');
            if (firstFocusable) firstFocusable.focus();
            return;
        }
        
        // Different navigation based on page type
        if (isLoginPage) {
            handleLoginPageNavigation(e, currentElement);
        } else {
            handleContentPageNavigation(e, currentElement, videoPlayer);
        }
    });
}

function handleLoginPageNavigation(e, currentElement) {
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            navigateVertically(currentElement, 'next');
            break;
        case 'ArrowUp':
            e.preventDefault();
            navigateVertically(currentElement, 'prev');
            break;
        case 'Enter':
            if (currentElement.tagName === 'INPUT') {
                // Move to next field or submit on Enter
                const inputs = Array.from(document.querySelectorAll('input'));
                const currentIndex = inputs.indexOf(currentElement);
                
                if (currentIndex < inputs.length - 1) {
                    inputs[currentIndex + 1].focus();
                } else {
                    document.getElementById('login-button')?.click();
                }
            }
            break;
    }
}

function handleContentPageNavigation(e, currentElement, videoPlayer) {
    switch (e.key) {
        case 'ArrowUp':
            if (currentElement.closest('.lista-reproduccion')) {
                e.preventDefault();
                navigateFocusInList('prev');
            }
            break;
        case 'ArrowDown':
            if (currentElement.closest('.lista-reproduccion')) {
                e.preventDefault();
                navigateFocusInList('next');
            }
            break;
        case 'ArrowLeft':
            if (videoPlayer && document.activeElement === videoPlayer) {
                // Rewind video
                videoPlayer.currentTime -= 10;
            }
            break;
        case 'ArrowRight':
            if (videoPlayer && document.activeElement === videoPlayer) {
                // Fast forward video
                videoPlayer.currentTime += 10;
            }
            break;
    }
}

function navigateVertically(currentElement, direction) {
    const focusableElements = Array.from(document.querySelectorAll('input, button'));
    const currentIndex = focusableElements.indexOf(currentElement);
    
    if (direction === 'next' && currentIndex < focusableElements.length - 1) {
        focusableElements[currentIndex + 1].focus();
    } else if (direction === 'prev' && currentIndex > 0) {
        focusableElements[currentIndex - 1].focus();
    }
}

function navigateFocusInList(direction) {
    const listItems = Array.from(document.querySelectorAll('.lista-reproduccion li'));
    const currentItem = document.activeElement;
    const currentIndex = listItems.indexOf(currentItem);
    
    if (direction === 'next' && currentIndex < listItems.length - 1) {
        listItems[currentIndex + 1].focus();
    } else if (direction === 'prev' && currentIndex > 0) {
        listItems[currentIndex - 1].focus();
    }
}

function addTvStyles() {
    // Add TV-specific styles that enhance visibility and focus states
    const style = document.createElement('style');
    style.textContent = `
        .tv-mode button, .tv-mode input, .tv-mode li {
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .tv-mode .tv-interactive:focus {
            transform: scale(1.05);
            box-shadow: 0 0 0 4px rgba(52, 152, 219, 0.7);
            z-index: 10;
        }
        
        .tv-mode .lista-reproduccion li:focus {
            background: linear-gradient(135deg, #3498db, #2c3e50);
            color: white;
            transform: scale(1.08);
            box-shadow: 0 5px 15px rgba(52, 152, 219, 0.5);
        }
        
        .tv-mode #login-button:focus, 
        .tv-mode .fullscreen-btn:focus {
            transform: scale(1.1);
            box-shadow: 0 0 0 4px rgba(52, 152, 219, 0.7);
        }
        
        .tv-mode .focus-visible {
            outline: 4px solid #3498db;
            outline-offset: 2px;
        }
    `;
    
    document.head.appendChild(style);
}

// Make functions available globally
window.tvEnhanced = {
    detectTVDevice,
    navigateFocusInList
};