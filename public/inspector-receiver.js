/**
 * Inspector Receiver Script
 * This script should be loaded in iframes to receive and execute inspector injection
 */

(function() {
  'use strict';
  
  // Only run once
  if (window.__CURIO_INSPECTOR_RECEIVER_LOADED__) {
    return;
  }
  window.__CURIO_INSPECTOR_RECEIVER_LOADED__ = true;

  console.log('[Inspector Receiver] Loaded and listening for injection messages');

  // Listen for injection messages from parent
  window.addEventListener('message', function(event) {
    // Don't process messages from same window
    if (event.source === window) {
      return;
    }

    const { type, script } = event.data;

    if (type === 'CURIO_INJECT_INSPECTOR') {
      console.log('[Inspector Receiver] Received injection request');
      
      try {
        // Check if already injected
        if (window.__CURIO_INSPECTOR_INJECTED__) {
          console.log('[Inspector Receiver] Inspector already injected');
          return;
        }

        // Create and execute script
        const scriptElement = document.createElement('script');
        scriptElement.textContent = script;
        scriptElement.setAttribute('data-curio-inspector', 'true');
        
        // Inject into head
        document.head.appendChild(scriptElement);
        
        console.log('[Inspector Receiver] Inspector script injected successfully');
        
        // Notify parent of successful injection
        event.source.postMessage({
          type: 'CURIO_INJECTION_SUCCESS',
          timestamp: Date.now()
        }, '*');
        
      } catch (error) {
        console.error('[Inspector Receiver] Failed to inject script:', error);
        
        // Notify parent of failed injection
        event.source.postMessage({
          type: 'CURIO_INJECTION_ERROR',
          error: error.message,
          timestamp: Date.now()
        }, '*');
      }
    }
  });

  // Auto-inject receiver into any same-origin iframes that load after this
  function injectIntoChildFrames() {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        if (iframe.contentDocument && !iframe.contentWindow.__CURIO_INSPECTOR_RECEIVER_LOADED__) {
          const script = iframe.contentDocument.createElement('script');
          script.src = '/inspector-receiver.js';
          iframe.contentDocument.head.appendChild(script);
        }
      } catch (error) {
        // Cross-origin iframe, skip
      }
    });
  }

  // Watch for new iframes
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && node.tagName === 'IFRAME') {
            setTimeout(injectIntoChildFrames, 100);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Initial check for existing iframes
  setTimeout(injectIntoChildFrames, 100);
})();