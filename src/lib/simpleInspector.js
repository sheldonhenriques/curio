/**
 * Simple Inspector Implementation
 * A working version that bypasses complex proxy systems
 */

export const SIMPLE_INSPECTOR_SCRIPT = `
(function() {
    'use strict';
    
    console.log('[SIMPLE INSPECTOR] Loading...');
    
    // Prevent multiple injections
    if (window.__SIMPLE_INSPECTOR_LOADED__) {
        console.log('[SIMPLE INSPECTOR] Already loaded');
        return;
    }
    window.__SIMPLE_INSPECTOR_LOADED__ = true;
    
    let isEnabled = false;
    let selectedElement = null;
    let overlay = null;
    
    // Create overlay for highlighting
    function createOverlay() {
        overlay = document.createElement('div');
        overlay.style.cssText = \`
            position: fixed !important;
            pointer-events: none !important;
            z-index: 999999 !important;
            border: 2px solid #ff0000 !important;
            background: rgba(255, 0, 0, 0.1) !important;
            display: none !important;
            box-sizing: border-box !important;
        \`;
        document.body.appendChild(overlay);
    }
    
    // Highlight element
    function highlightElement(element) {
        if (!overlay || !element) return;
        
        const rect = element.getBoundingClientRect();
        overlay.style.cssText += \`
            display: block !important;
            left: \${rect.left + window.scrollX}px !important;
            top: \${rect.top + window.scrollY}px !important;
            width: \${rect.width}px !important;
            height: \${rect.height}px !important;
        \`;
    }
    
    // Clear highlight
    function clearHighlight() {
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    // Handle mouse move
    function handleMouseMove(e) {
        if (!isEnabled) return;
        e.stopPropagation();
        highlightElement(e.target);
    }
    
    // Handle click
    function handleClick(e) {
        if (!isEnabled) return;
        e.preventDefault();
        e.stopPropagation();
        
        selectedElement = e.target;
        console.log('[SIMPLE INSPECTOR] Element selected:', selectedElement);
        
        // Add red outline to selected element
        if (selectedElement) {
            // Remove previous selection
            document.querySelectorAll('.simple-inspector-selected').forEach(el => {
                el.classList.remove('simple-inspector-selected');
            });
            
            selectedElement.classList.add('simple-inspector-selected');
            
            // Send selection data to parent
            window.parent.postMessage({
                type: 'ELEMENT_SELECTED',
                data: {
                    tagName: selectedElement.tagName,
                    className: selectedElement.className,
                    id: selectedElement.id,
                    textContent: selectedElement.textContent?.substring(0, 100)
                }
            }, '*');
        }
    }
    
    // Enable inspector
    function enable() {
        if (isEnabled) return;
        
        isEnabled = true;
        document.body.style.cursor = 'crosshair';
        document.addEventListener('mousemove', handleMouseMove, true);
        document.addEventListener('click', handleClick, true);
        
        console.log('[SIMPLE INSPECTOR] Enabled');
    }
    
    // Disable inspector
    function disable() {
        if (!isEnabled) return;
        
        isEnabled = false;
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleMouseMove, true);
        document.removeEventListener('click', handleClick, true);
        clearHighlight();
        
        console.log('[SIMPLE INSPECTOR] Disabled');
    }
    
    // Listen for messages from parent
    window.addEventListener('message', (event) => {
        console.log('[SIMPLE INSPECTOR] Received message:', event.data);
        
        if (event.data.type === 'INJECT_SIMPLE_INSPECTOR') {
            console.log('[SIMPLE INSPECTOR] Injection message received, but already loaded');
            // Send success response since we're already loaded
            window.parent.postMessage({
                type: 'INSPECTOR_READY',
                timestamp: Date.now()
            }, '*');
        } else if (event.data.type === 'ENABLE_INSPECTOR') {
            enable();
        } else if (event.data.type === 'DISABLE_INSPECTOR') {
            disable();
        }
    });
    
    // Add CSS for selected elements
    const style = document.createElement('style');
    style.textContent = \`
        .simple-inspector-selected {
            outline: 3px solid #ff0000 !important;
            outline-offset: 1px !important;
        }
    \`;
    document.head.appendChild(style);
    
    // Create overlay
    createOverlay();
    
    // Expose global interface
    window.__SIMPLE_INSPECTOR__ = {
        enable,
        disable,
        isEnabled: () => isEnabled,
        getSelected: () => selectedElement
    };
    
    // Notify parent that inspector is ready
    window.parent.postMessage({
        type: 'INSPECTOR_READY',
        timestamp: Date.now()
    }, '*');
    
    console.log('[SIMPLE INSPECTOR] Ready');
})();
`;

/**
 * Inject simple inspector into iframe
 */
export function injectSimpleInspector(iframe) {
    if (!iframe?.contentWindow) {
        console.error('[SIMPLE INSPECTOR] Invalid iframe');
        return false;
    }
    
    console.log('[SIMPLE INSPECTOR] Starting injection process...');
    
    try {
        // Try direct injection first (same-origin)
        if (iframe.contentDocument) {
            console.log('[SIMPLE INSPECTOR] Using direct injection');
            const script = document.createElement('script');
            script.textContent = SIMPLE_INSPECTOR_SCRIPT;
            script.setAttribute('data-simple-inspector', 'true');
            iframe.contentDocument.head.appendChild(script);
            console.log('[SIMPLE INSPECTOR] Direct injection completed');
            return true;
        }
    } catch (error) {
        console.log('[SIMPLE INSPECTOR] Direct injection failed:', error.message);
    }
    
    // Fallback to postMessage injection with enhanced target handling
    try {
        console.log('[SIMPLE INSPECTOR] Attempting postMessage injection');
        
        // Try multiple times with different timing
        const attemptInjection = (attempt = 1) => {
            if (attempt > 3) {
                console.error('[SIMPLE INSPECTOR] Max injection attempts reached');
                return;
            }
            
            try {
                iframe.contentWindow.postMessage({
                    type: 'INJECT_SIMPLE_INSPECTOR',
                    script: SIMPLE_INSPECTOR_SCRIPT,
                    timestamp: Date.now(),
                    attempt: attempt
                }, '*');
                console.log(`[SIMPLE INSPECTOR] Injection message sent (attempt ${attempt})`);
            } catch (err) {
                console.error(`[SIMPLE INSPECTOR] Injection attempt ${attempt} failed:`, err);
                setTimeout(() => attemptInjection(attempt + 1), 1000);
            }
        };
        
        attemptInjection();
        return true;
    } catch (error) {
        console.error('[SIMPLE INSPECTOR] PostMessage setup failed:', error);
        return false;
    }
}

/**
 * Enable simple inspector
 */
export function enableSimpleInspector(iframe) {
    if (!iframe?.contentWindow) return false;
    
    try {
        iframe.contentWindow.postMessage({
            type: 'ENABLE_INSPECTOR',
            timestamp: Date.now()
        }, '*');
        return true;
    } catch (error) {
        console.error('[SIMPLE INSPECTOR] Enable failed:', error);
        return false;
    }
}

/**
 * Disable simple inspector
 */
export function disableSimpleInspector(iframe) {
    if (!iframe?.contentWindow) return false;
    
    try {
        iframe.contentWindow.postMessage({
            type: 'DISABLE_INSPECTOR',
            timestamp: Date.now()
        }, '*');
        return true;
    } catch (error) {
        console.error('[SIMPLE INSPECTOR] Disable failed:', error);
        return false;
    }
}