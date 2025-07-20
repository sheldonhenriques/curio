# Inspector Test Guide

## The Issue
The inspector feature shows "initializing" but doesn't work. Here's a step-by-step debugging guide.

## Step 1: Basic Setup Test
1. Start the dev server: `npm run dev`
2. Open http://localhost:3000
3. Create or open a project with a WebServer node
4. Make sure the WebServer node has a running sandbox with a preview URL

## Step 2: Test Files Created
I've created these test files for you:

### `/test-inspector.html` 
- Simple test page with debug logging
- Shows all messages received
- Tests inspector injection

### `/simple-test.html`
- Minimal test page for basic injection testing

### `/debug-inspector.js`
- Comprehensive debug script to run in browser console

## Step 3: Manual Debug Process

### Test 1: Check if inspector button works
1. Open a WebServer node
2. Click the Eye icon (inspector button) in the header
3. Check if:
   - Button changes to EyeOff icon
   - Iframe src changes from `sandbox-url` to `/inspector-proxy.html?url=...`
   - Browser console shows any errors

### Test 2: Test proxy injection directly
1. Open a new browser tab
2. Go to: `http://localhost:3000/inspector-proxy.html?url=http://localhost:3000/simple-test.html`
3. Open browser console
4. Run this code:
```javascript
// Test manual injection
const injectionMessage = {
    type: 'CURIO_INJECT_INSPECTOR',
    script: 'console.log("TEST INJECTION WORKS"); window.__TEST_INJECTED__ = true;',
    timestamp: Date.now()
};

window.frames[0].postMessage(injectionMessage, '*');
```
5. Check if you see "TEST INJECTION WORKS" in console

### Test 3: Use the debug script
1. In the main Curio app, open browser console
2. Copy and paste the content of `/debug-inspector.js`
3. Run: `debugInspector.testFlow()`
4. Follow the console output to see where it fails

## Step 4: Common Issues & Fixes

### Issue: "Initializing" forever
**Likely cause**: Inspector script injection fails
**Check**: 
- Browser console for errors
- Network tab for failed requests
- CORS issues

### Issue: Button doesn't change iframe src
**Likely cause**: State management or prop passing issue
**Check**: 
- React DevTools for component state
- Console for any React errors

### Issue: Iframe loads but injection fails
**Likely cause**: Proxy HTML file issues or script execution blocked
**Check**:
- Can you access `/inspector-proxy.html` directly?
- Are there any CSP (Content Security Policy) errors?
- Check the iframe's console (right-click iframe → Inspect → Console)

### Issue: Injection works but selection doesn't
**Likely cause**: Event handling or CSS selector issues
**Check**:
- Inspector overlay elements are created
- Mouse events are properly captured
- No CSS conflicts

## Step 5: Quick Fixes to Try

### Fix 1: Simplify the inspector script
Replace the complex inspector script with this minimal version:

```javascript
// In src/lib/inspectorScript.js, replace INSPECTOR_SCRIPT with:
export const INSPECTOR_SCRIPT = `
console.log('Simple inspector loaded');
window.__SIMPLE_INSPECTOR__ = {
    enable: () => {
        console.log('Inspector enabled');
        document.body.style.cursor = 'crosshair';
        document.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Element clicked:', e.target);
            e.target.style.outline = '2px solid red';
        }, true);
    }
};
window.parent.postMessage({type: 'INSPECTOR_READY'}, '*');
`;
```

### Fix 2: Test direct iframe injection
Skip the proxy and inject directly:

```javascript
// In WebserverPreview.js, replace the proxy logic with:
const handleLoad = useCallback(() => {
    if (isInspectorActive && iframeRef.current) {
        try {
            const script = document.createElement('script');
            script.textContent = INSPECTOR_SCRIPT;
            iframeRef.current.contentDocument.head.appendChild(script);
        } catch (error) {
            console.log('Direct injection failed (CORS):', error);
        }
    }
}, [isInspectorActive]);
```

## Expected Working Flow
1. Click inspector button → `isInspectorActive` becomes `true`
2. Iframe src changes to proxy URL
3. Proxy loads target page in inner iframe
4. Injection message sent to proxy
5. Proxy executes script and responds with success
6. Inspector enables and element selection works

## Debug Commands
Run these in browser console:

```javascript
// Check if inspector is active
console.log('Inspector active:', document.querySelector('iframe[src*="inspector-proxy"]') !== null);

// Check iframe state
const iframe = document.querySelector('iframe[title="Website preview"]');
console.log('Iframe src:', iframe?.src);

// Test manual message sending
iframe?.contentWindow?.postMessage({type: 'test'}, '*');
```

The key is to trace exactly where in this flow the process breaks down.