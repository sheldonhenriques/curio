/**
 * Simple Inspector Receiver
 * Add this script to pages that need inspector injection via postMessage
 */

(function() {
    'use strict';
    
    console.log('[INSPECTOR RECEIVER] Loaded');
    
    // Listen for injection messages
    window.addEventListener('message', function(event) {
        console.log('[INSPECTOR RECEIVER] Message received:', event.data);
        
        if (event.data.type === 'INJECT_SIMPLE_INSPECTOR') {
            console.log('[INSPECTOR RECEIVER] Executing injection...');
            
            try {
                // Execute the inspector script
                eval(event.data.script);
                console.log('[INSPECTOR RECEIVER] Script executed successfully');
            } catch (error) {
                console.error('[INSPECTOR RECEIVER] Script execution failed:', error);
                event.source.postMessage({
                    type: 'INJECTION_ERROR',
                    error: error.message
                }, '*');
            }
        }
    });
    
    // Notify parent that receiver is ready
    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'RECEIVER_READY',
            timestamp: Date.now()
        }, '*');
    }
})();