/**
 * Inspector Debug Script
 * Run this in the browser console to test the inspector functionality
 */

(function() {
    'use strict';

    const DEBUG_PREFIX = '[INSPECTOR DEBUG]';
    
    function log(...args) {
        console.log(DEBUG_PREFIX, ...args);
    }

    function error(...args) {
        console.error(DEBUG_PREFIX, ...args);
    }

    function testInspectorFlow() {
        log('Starting comprehensive inspector test...');

        // Test 1: Check if we're in the correct environment
        log('=== Environment Check ===');
        log('Current URL:', window.location.href);
        log('Is iframe:', window !== window.parent);
        log('Has iframe ref:', !!document.querySelector('iframe'));

        // Test 2: Find and test the WebServer node
        const webserverIframe = document.querySelector('iframe[title="Website preview"]');
        if (!webserverIframe) {
            error('WebServer iframe not found! Make sure you have a WebServer node active.');
            return;
        }

        log('=== WebServer iframe found ===');
        log('Iframe src:', webserverIframe.src);
        log('Iframe sandbox:', webserverIframe.sandbox);

        // Test 3: Check if inspector button is active
        const inspectorButton = document.querySelector('[data-testid="inspector-toggle"], button[aria-label*="inspector"], button[title*="inspector"]');
        if (!inspectorButton) {
            error('Inspector toggle button not found!');
            return;
        }

        log('=== Inspector button found ===');
        log('Button text:', inspectorButton.textContent);
        log('Button classes:', inspectorButton.className);

        // Test 4: Simulate inspector activation
        log('=== Simulating inspector activation ===');
        
        // Click the inspector button if not already active
        if (!inspectorButton.classList.contains('active') && !inspectorButton.textContent.includes('Disable')) {
            log('Clicking inspector button...');
            inspectorButton.click();
        }

        // Wait and check if iframe src changed to proxy
        setTimeout(() => {
            log('=== Post-activation check ===');
            log('New iframe src:', webserverIframe.src);
            
            if (webserverIframe.src.includes('inspector-proxy.html')) {
                log('✓ Iframe switched to proxy mode');
                
                // Test injection
                setTimeout(() => {
                    testInjection(webserverIframe);
                }, 2000);
            } else {
                error('✗ Iframe did not switch to proxy mode');
                log('Expected: URL containing "inspector-proxy.html"');
                log('Actual:', webserverIframe.src);
            }
        }, 1000);
    }

    function testInjection(iframe) {
        log('=== Testing injection ===');

        let injectionMessageSent = false;
        let injectionResponse = false;

        // Listen for injection responses
        const messageHandler = (event) => {
            if (event.source === iframe.contentWindow) {
                log('Received message from iframe:', event.data);
                
                if (event.data.type === 'CURIO_INJECTION_SUCCESS') {
                    log('✓ Injection successful!');
                    injectionResponse = true;
                    testInspectorFunctionality(iframe);
                } else if (event.data.type === 'CURIO_INJECTION_ERROR') {
                    error('✗ Injection failed:', event.data.error);
                    injectionResponse = true;
                }
            }
        };

        window.addEventListener('message', messageHandler);

        // Send injection message
        const inspectorScript = `
            (function() {
                console.log('[TEST INSPECTOR] Script injected successfully');
                window.__TEST_INSPECTOR_INJECTED__ = true;
                
                // Simple test inspector
                window.__TEST_INSPECTOR__ = {
                    enable: function() {
                        console.log('[TEST INSPECTOR] Enabled');
                        document.body.style.cursor = 'crosshair';
                        document.addEventListener('click', this.handleClick.bind(this), true);
                    },
                    disable: function() {
                        console.log('[TEST INSPECTOR] Disabled');
                        document.body.style.cursor = '';
                        document.removeEventListener('click', this.handleClick.bind(this), true);
                    },
                    handleClick: function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[TEST INSPECTOR] Element clicked:', e.target);
                        e.target.style.outline = '2px solid red';
                    }
                };
                
                return true;
            })();
        `;

        try {
            iframe.contentWindow.postMessage({
                type: 'CURIO_INJECT_INSPECTOR',
                script: inspectorScript,
                timestamp: Date.now()
            }, '*');
            
            injectionMessageSent = true;
            log('Injection message sent');
        } catch (err) {
            error('Failed to send injection message:', err);
        }

        // Timeout check
        setTimeout(() => {
            window.removeEventListener('message', messageHandler);
            
            if (!injectionMessageSent) {
                error('✗ Could not send injection message');
            } else if (!injectionResponse) {
                error('✗ No response to injection message (timeout)');
                log('This could mean:');
                log('1. The proxy iframe is not handling messages');
                log('2. The target URL is blocking the injection');
                log('3. There is a CORS or security issue');
            }
        }, 5000);
    }

    function testInspectorFunctionality(iframe) {
        log('=== Testing inspector functionality ===');

        setTimeout(() => {
            try {
                // Test if inspector is available
                iframe.contentWindow.postMessage({
                    type: 'TEST_INSPECTOR_CHECK',
                    timestamp: Date.now()
                }, '*');

                // Enable test inspector
                iframe.contentWindow.postMessage({
                    type: 'TEST_INSPECTOR_ENABLE',
                    timestamp: Date.now()
                }, '*');

                log('✓ Inspector functionality test messages sent');
                log('Now try clicking elements in the iframe to test selection');

            } catch (err) {
                error('Failed to test inspector functionality:', err);
            }
        }, 1000);
    }

    function testProxyDirectly() {
        log('=== Testing proxy directly ===');
        
        // Create a test iframe with proxy
        const testIframe = document.createElement('iframe');
        testIframe.style.width = '400px';
        testIframe.style.height = '300px';
        testIframe.style.border = '2px solid blue';
        testIframe.style.position = 'fixed';
        testIframe.style.top = '10px';
        testIframe.style.left = '10px';
        testIframe.style.zIndex = '10000';
        testIframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals';
        
        // Use our test page
        const testUrl = '/test-inspector.html';
        testIframe.src = `/inspector-proxy.html?url=${encodeURIComponent(testUrl)}`;
        
        document.body.appendChild(testIframe);
        
        log('Test iframe created and loaded with proxy');
        
        // Test injection after load
        testIframe.onload = () => {
            log('Test iframe loaded, testing injection...');
            testInjection(testIframe);
        };

        // Clean up after 30 seconds
        setTimeout(() => {
            document.body.removeChild(testIframe);
            log('Test iframe removed');
        }, 30000);
    }

    // Expose test functions globally
    window.debugInspector = {
        testFlow: testInspectorFlow,
        testProxy: testProxyDirectly,
        log: log,
        error: error
    };

    log('Inspector debug script loaded!');
    log('Available functions:');
    log('- debugInspector.testFlow() - Test full inspector flow');
    log('- debugInspector.testProxy() - Test proxy directly');
    
    // Auto-run basic test
    testInspectorFlow();

})();